'use strict';
// Pure scheduling only. No browser, app, database or HTTP imports.
const assert = require('node:assert/strict');
const MIN_SIGNIN_GAP_MS = 10250;
function retryAfterSeconds(value) {
  assert(typeof value === 'string' && /^(?:0|[1-9][0-9]?)$/.test(value), '429 requires a bounded X-Retry-After header');
  const seconds = Number(value);
  assert(Number.isFinite(seconds) && seconds >= 0 && seconds <= 10, '429 X-Retry-After exceeds the reviewed ten-second window');
  return seconds;
}
function createSignInCadence({ now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), record = () => {} } = {}) {
  let lastCompletedAt = null;
  let queue = Promise.resolve();
  function run(metadata, submit) {
    assert(/^[a-zA-Z0-9_-]+$/.test(metadata.actor));
    assert(/^[a-zA-Z0-9_-]+$/.test(metadata.channel));
    const task = queue.then(async () => {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const waitMs = lastCompletedAt === null ? 0 : Math.max(0, MIN_SIGNIN_GAP_MS - (now() - lastCompletedAt));
        if (waitMs) await sleep(waitMs);
        const startedAt = now();
        assert(lastCompletedAt === null || startedAt - lastCompletedAt >= MIN_SIGNIN_GAP_MS, 'Sign-in pacing elapsed too early');
        let response;
        try { response = await submit(attempt); }
        finally { lastCompletedAt = now(); }
        assert(response && Number.isInteger(response.status), 'Sign-in status metadata required');
        const event = { ...metadata, attempt, startedAt, completedAt: lastCompletedAt, waitMs, status: response.status, retryAfter: response.retryAfter ?? null, retryPlanned: false };
        if (response.status === 429 && attempt === 1) {
          try { event.retryAfterSeconds = retryAfterSeconds(response.retryAfter); event.retryPlanned = true; }
          finally { record(event); }
          continue;
        }
        record(event);
        return response;
      }
      throw new Error('Sign-in attempt bound exhausted');
    });
    queue = task.catch(() => {});
    return task;
  }
  return { run };
}
module.exports = { MIN_SIGNIN_GAP_MS, retryAfterSeconds, createSignInCadence };
