'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const listeners = {};
const context = {URL, window: {location: {href: 'https://example.com/prototype/'}}, document: {
  createElement: () => ({}), head: {append() {}},
  addEventListener: (event, callback) => { listeners[event] = callback; }
}};
vm.runInNewContext(fs.readFileSync('docs/analytics.js', 'utf8'), context);
const init = context.window.posthog._i[0];
assert.equal(init[1].session_recording.maskAllInputs, true);
assert.equal(init[1].session_recording.maskTextSelector, '*');
assert.match(init[1].session_recording.blockSelector, /ph-no-capture/);
const captured = [];
// The SDK replaces the loading array. The click listener must use the live SDK.
context.window.posthog = {capture: name => captured.push(name)};
listeners.click({target: {closest: () => ({})}});
assert.deepEqual(captured, ['clicked_try_product']);
listeners.click({target: {closest: () => null}});
assert.equal(captured.length, 1);
for (const suffix of ['?code=secret', '?error=access_denied', '#access_token=secret', '#error_description=denied']) {
  const callbackContext = {URL, window: {location: {href: 'https://example.com/prototype/' + suffix}}, document: {}};
  vm.runInNewContext(fs.readFileSync('docs/analytics.js', 'utf8'), callbackContext);
  assert.equal(callbackContext.window.posthog, undefined, 'OAuth callback URLs must not reach analytics');
}
console.log('Analytics SDK replacement and masking checks passed.');
