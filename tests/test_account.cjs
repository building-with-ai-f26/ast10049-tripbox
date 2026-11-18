'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('docs/prototype/index.html', 'utf8');
assert.equal((html.match(/id="tripbox-auth-status"/g) || []).length, 1, 'account status must have a unique ID');
assert.equal((html.match(/id="account-status"/g) || []).length, 1, 'Instagram status must retain its own ID');
const elements = Object.fromEntries(['account-signin', 'account-signout', 'tripbox-auth-status'].map(id => [id, { hidden: false, disabled: false, textContent: '', addEventListener(event, fn) { this[event] = fn; } }]));
let authListener, signedOut = false, oauth = false;
const client = {auth: {
  onAuthStateChange(fn) { authListener = fn; },
  async getSession() { return {data: {session: null}, error: null}; },
  async signInWithOAuth(options) { oauth = options.provider === 'google' && options.options?.redirectTo === 'https://building-with-ai-f26.github.io/ast10049-tripbox/prototype/'; return {error: null}; },
  async signOut() { signedOut = true; return {error: null}; }
}};
const events = [];
const window = {isSecureContext: true, supabase: {createClient: () => client}, dispatchEvent: event => events.push(event)};
class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }
class Event { constructor(type) { this.type = type; } }
vm.runInNewContext(fs.readFileSync('docs/prototype/account.js','utf8'), {window, CustomEvent, Event, document: {getElementById: id => elements[id]}});
(async () => {
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(elements['account-signin'].disabled, false);
  assert.equal(elements['account-signout'].hidden, true);
  await elements['account-signin'].click(); assert.equal(oauth, true);
  authListener('SIGNED_IN', {user: {id: 'fake'}});
  assert.equal(events.at(-1).detail.user.id, 'fake');
  assert.equal(elements['account-signin'].hidden, true);
  assert.equal(elements['account-signout'].hidden, false);
  await elements['account-signout'].click(); assert.equal(signedOut, true);
  assert.equal(elements['account-signout'].hidden, true);
  console.log('Account UI: sign-in, session and sign-out states passed with mocked authentication.');
})().catch(error => { console.error(error); process.exitCode = 1; });

