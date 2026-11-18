'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('docs/prototype/app.js', 'utf8');
const savePart = source.slice(source.indexOf('function persistLibrary()'), source.indexOf("$('more-references').addEventListener"));
const loadPart = source.slice(source.indexOf('let libraryUserId;'), source.indexOf('loadReferenceLibrary(window.TripboxAccount?.session || null);'));
const handlers = {};
const elements = new Proxy({}, {get(target, id) {
  return target[id] ||= { disabled: false, hidden: false, textContent: '', addEventListener(type, fn) { handlers[id + ':' + type] = fn; } };
}});
let activeUser = 'a', pendingA;
const accounts = {
  a: { revision: 1, payload: { version: 1, photos: [{ id: 'a-photo', name: 'A', features: {color: [1, 2, 3]}, data: 'data:image/jpeg;base64,YQ==' }] } },
  b: { revision: 0, payload: null }
};
const AccountLibrary = {
  async load(_client, session) {
    if (session.user.id === 'slow') return new Promise(resolve => { pendingA = resolve; });
    return accounts[session.user.id];
  },
  async save(_client, session, revision, payload) {
    assert.equal(session.user.id, activeUser);
    assert.equal(accounts[activeUser].revision, revision);
    accounts[activeUser] = { revision: revision + 1, payload };
    return revision + 1;
  }
};
class Reader {
  readAsDataURL(blob) { blob.arrayBuffer().then(bytes => { this.result = 'data:image/jpeg;base64,' + Buffer.from(bytes).toString('base64'); this.onload(); }); }
}
const sandbox = { $, console, Blob, URL, fetch, setTimeout, FileReader: Reader, AccountLibrary,
  ReferenceStore: { async load() { return null; } },
  window: { TripboxAccount: { client: {} }, addEventListener() {} }
};
function $(id) { return elements[id]; }
vm.createContext(sandbox);
vm.runInContext(`const referenceLibrary = [], styleExamples = [];
let removedReferences = [], libraryQueue = Promise.resolve(), libraryReady = false;
let librarySession = null, libraryRevision = 0, libraryGeneration = 0, librarySyncFailed = false, examplesBusy = false;
const importedInstagramPaths = new Set(), instagramReferences = new Set(), instagramFiles = new Map();
function renderReferences() {}
` + savePart + loadPart + `
globalThis.bridge = { loadReferenceLibrary, persistLibrary,
  references: () => referenceLibrary.map(x => x.id), ready: () => libraryReady };
`, sandbox);
(async () => {
  const { bridge } = sandbox;
  await bridge.loadReferenceLibrary({ user: { id: 'a' } });
  assert.deepEqual(Array.from(bridge.references()), ['a-photo']);
  elements['people-priority'].value = 'balanced';
  elements.colors.value = 'soft';
  await bridge.persistLibrary();
  assert.equal(accounts.a.revision, 2);
  assert.equal(accounts.a.payload.preferences.people, 'balanced');
  assert.equal(accounts.a.payload.preferences.colors, 'soft');
  activeUser = 'b';
  await bridge.loadReferenceLibrary({ user: { id: 'b' } });
  assert.deepEqual(Array.from(bridge.references()), [], 'switching accounts clears the previous user’s references');
  assert.equal(elements['people-priority'].value, 'people', 'switching accounts clears the previous user’s preferences');
  const delayed = bridge.loadReferenceLibrary({ user: { id: 'slow' } });
  await bridge.loadReferenceLibrary({ user: { id: 'b' } });
  pendingA(accounts.a);
  await delayed;
  assert.deepEqual(Array.from(bridge.references()), [], 'a stale load cannot display another user’s references');
  await bridge.loadReferenceLibrary(null);
  assert.equal(bridge.ready(), true);
  assert.deepEqual(Array.from(bridge.references()), []);
  console.log('Account switch and stale-load checks passed (mocked services).');
})().catch(error => { console.error(error); process.exitCode = 1; });
