'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MIN_SIGNIN_GAP_MS, retryAfterSeconds, createSignInCadence } = require('./signin-cadence.cjs');
function fixture() {
  let clock = 100000;
  const waits = [], events = [];
  const cadence = createSignInCadence({ now: () => clock, sleep: async ms => { waits.push(ms); clock += ms; }, record: event => events.push(event) });
  return { cadence, waits, events, now: () => clock, advance: ms => { clock += ms; } };
}
test('serializes mixed UI and API submissions from the previous completion', async () => {
  const f = fixture(), starts = [];
  const submit = async () => { starts.push(f.now()); f.advance(1700); return { status: 200 }; };
  const ui = f.cadence.run({ actor: 'ui', channel: 'ui-en' }, submit);
  const api = f.cadence.run({ actor: 'foreign', channel: 'api' }, submit);
  await Promise.all([ui, api]);
  assert.equal(starts[1] - (starts[0] + 1700), MIN_SIGNIN_GAP_MS);
  assert.deepEqual(f.waits, [MIN_SIGNIN_GAP_MS]);
});
test('waits only the remaining gap after other work', async () => {
  const f = fixture();
  await f.cadence.run({ actor: 'ui', channel: 'api' }, async () => ({ status: 200 }));
  f.advance(3000);
  await f.cadence.run({ actor: 'ui', channel: 'ui-fr' }, async () => ({ status: 200 }));
  assert.deepEqual(f.waits, [7250]);
});
test('allows exactly one 429 retry after a full quiet window', async () => {
  const f = fixture(); let calls = 0;
  const result = await f.cadence.run({ actor: 'ui', channel: 'api' }, async () => ++calls === 1 ? { status: 429, retryAfter: '10' } : { status: 200 });
  assert.equal(calls, 2); assert.equal(result.status, 200);
  assert.deepEqual(f.waits, [MIN_SIGNIN_GAP_MS]);
  assert.equal(f.events[0].retryAfterSeconds, 10); assert.equal(f.events[0].retryPlanned, true);
});
test('a second 429 is returned as failure without further retry', async () => {
  const f = fixture(); let calls = 0;
  const result = await f.cadence.run({ actor: 'ui', channel: 'api' }, async () => { calls++; return { status: 429, retryAfter: '1' }; });
  assert.equal(calls, 2); assert.equal(result.status, 429); assert.equal(f.events[1].retryPlanned, false);
});
for (const status of [400, 401, 403, 500, 502]) test('does not retry status ' + status, async () => {
  const f = fixture(); let calls = 0;
  const result = await f.cadence.run({ actor: 'ui', channel: 'api' }, async () => { calls++; return { status }; });
  assert.equal(calls, 1); assert.equal(result.status, status); assert.deepEqual(f.waits, []);
});
test('requires the exact bounded X-Retry-After value before retrying', async () => {
  for (const header of [undefined, '', '-1', '11', 'Infinity', '1.5', ' 1', '01', '100000', 'Thu, 01 Jan 1970 00:00:00 GMT']) {
    const f = fixture(); let calls = 0;
    await assert.rejects(f.cadence.run({ actor: 'ui', channel: 'api' }, async () => { calls++; return { status: 429, retryAfter: header }; }));
    assert.equal(calls, 1); assert.equal(f.events[0].retryPlanned, false);
  }
  assert.equal(retryAfterSeconds('0'), 0); assert.equal(retryAfterSeconds('10'), 10);
});
test('failed submission still preserves pacing for the next actor', async () => {
  const f = fixture();
  await assert.rejects(f.cadence.run({ actor: 'ui', channel: 'api' }, async () => { f.advance(2000); throw new Error('transport failure'); }));
  await f.cadence.run({ actor: 'foreign', channel: 'api' }, async () => ({ status: 200 }));
  assert.deepEqual(f.waits, [MIN_SIGNIN_GAP_MS]);
});
