'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const listeners = {};
const context = {window: {}, document: {
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
console.log('Analytics SDK replacement and masking checks passed.');
