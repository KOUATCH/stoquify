// Pure transport decoding only. Importing the guarded harness does not start an
// application, connect to PostgreSQL, read private configuration or prepare files.
const test = require('node:test');
const assert = require('node:assert/strict');
const { actionResult } = require('./runtime-http.cjs');

const response = body => ({ status: 200, headers: { 'content-type': 'text/x-component' }, body });
const success = { success: true, data: { id: 'synthetic-comment' }, error: null, status: 200 };
const denial = { success: false, data: null, error: 'Fresh authentication required', status: 403, code: 'FRESH_AUTH_REQUIRED' };

test('decodes the successful action result referenced by Flight root.a', () => {
  assert.deepEqual(actionResult(response(`0:{"a":"$@2","f":[]}\n2:${JSON.stringify(success)}\n`)), success);
});

test('decodes a structured denial independently of its HTTP 200 transport', () => {
  assert.deepEqual(actionResult(response(`0:{"a":"$@b","f":[]}\nb:${JSON.stringify(denial)}\n`)), denial);
});

test('ignores an unreferenced success decoy and returns the linked denial', () => {
  assert.deepEqual(actionResult(response(`1:${JSON.stringify(success)}\n0:{"a":"$@b","f":[]}\nb:${JSON.stringify(denial)}\n`)), denial);
});

test('ignores an unreferenced error frame when the linked action succeeded', () => {
  assert.deepEqual(actionResult(response(`1:E{"digest":"unreferenced-error"}\n0:{"a":"$@2","f":[]}\n2:${JSON.stringify(success)}\n`)), success);
});

for (const [name, body] of [
  ['missing root frame', `2:${JSON.stringify(success)}\n`],
  ['missing referenced frame', `0:{"a":"$@b","f":[]}\n2:${JSON.stringify(success)}\n`],
  ['linked error frame', `0:{"a":"$@b","f":[]}\nb:E{"digest":"selected-error"}\n2:${JSON.stringify(success)}\n`],
  ['root without an action result reference', `0:{"f":[]}\n2:${JSON.stringify(success)}\n`],
  ['linked frame without a structured outcome', '0:{"a":"$@b","f":[]}\nb:{"data":null}\n'],
]) {
  test(`rejects ${name} instead of selecting another row`, () => {
    assert.throws(() => actionResult(response(body)));
  });
}

test('rejects a transport failure even when its body resembles an action result', () => {
  const answer = response(`0:{"a":"$@2"}\n2:${JSON.stringify(success)}\n`);
  assert.throws(() => actionResult({ ...answer, status: 404 }));
  assert.throws(() => actionResult({ ...answer, headers: { 'content-type': 'text/html' } }));
  assert.throws(() => actionResult({ ...answer, headers: { ...answer.headers, 'x-nextjs-action-not-found': '1' } }));
});
