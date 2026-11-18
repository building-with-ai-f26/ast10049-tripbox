'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const node = () => ({ hidden: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } });
const ids = Object.fromEntries(['dashboard','taste','project-options','gallery','groups','drafts-section','card-studio'].map(id => [id, node()]));
const photos = node(), setup = Object.assign(node(), { querySelector: () => photos });
const links = ['#home','#start','#gallery','#drafts-section','#card-studio','#taste'].map(hash => Object.assign(node(), {hash}));
const nav = { querySelectorAll: () => links };
const callbacks = {};
const context = { location: { hash: '' }, window: { addEventListener: (event, fn) => { callbacks[event] = fn; } },
  document: { documentElement: { classList: { add() {} } }, getElementById: id => ids[id],
    querySelector: selector => selector === '.app-nav' ? nav : setup } };
vm.runInNewContext(fs.readFileSync('docs/prototype/workspace.js','utf8'), context);
assert.equal(ids.dashboard.hidden, false);
assert.equal(setup.hidden, true);
context.location.hash = '#start'; callbacks.hashchange();
assert.equal(photos.hidden, false); assert.equal(ids['project-options'].hidden, false);
assert.equal(ids.taste.hidden, true); assert.equal(ids.gallery.hidden, true);
context.location.hash = '#gallery'; callbacks.hashchange();
assert.equal(ids.gallery.hidden, false); assert.equal(ids.groups.hidden, false);
assert.equal(ids['project-options'].hidden, true);
context.location.hash = '#taste'; callbacks.hashchange();
assert.equal(ids.taste.hidden, false); assert.equal(photos.hidden, true);
context.location.hash = '#card-studio'; callbacks.hashchange();
assert.equal(ids['card-studio'].hidden, false);
assert.equal(links[4].attrs['aria-current'], 'page');
console.log('Workspace navigation checks passed.');
