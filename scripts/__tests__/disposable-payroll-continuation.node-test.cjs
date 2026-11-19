'use strict';
// Pure planning/guard/orchestration fixtures; no DB, environment-file reads or app imports.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DATABASE, ORGANIZATIONS, buildPlan, planHash, parseArgs, assertTarget, sanitize, visitPlan, summarize } = require('../disposable-payroll-continuation-plan.cjs');

test('plans all 36 unique slots in month-first chronological order with fixed baseline', () => {
  const plan = buildPlan();
  assert.equal(plan.slots.length, 36);
  assert.equal(new Set(plan.slots.map(row => row.commandKey)).size, 36);
  assert.deepEqual(plan.slots.slice(0, 3).map(row => row.organizationId), ORGANIZATIONS);
  assert.equal(plan.slots[0].month, '2025-11');
  assert.equal(plan.slots.at(-1).month, '2026-10');
  assert.equal(plan.slots[6].payDate, '2026-01-31T00:00:00.000Z');
  assert.equal(plan.slots[9].payDate, '2026-02-28T00:00:00.000Z');
  assert.equal(plan.baseline.historyEnd, '2026-10-28');
  assert.equal(planHash(buildPlan()), planHash(plan));
});

test('October retains 31st pay date and three missing days without a period gate', async () => {
  const calls = [];
  const results = await visitPlan(buildPlan(), async row => {
    calls.push(row.month);
    return { status: 'BLOCKED_PERIOD_GATE', periodGateAttempted: true };
  });
  assert.equal(calls.length, 33);
  assert.equal(calls.includes('2026-10'), false);
  for (const row of results.slice(-3)) {
    assert.equal(row.payDate, '2026-10-31T00:00:00.000Z');
    assert.equal(row.observationCutoff, '2026-10-28');
    assert.deepEqual(row.missingObservationDates, ['2026-10-29', '2026-10-30', '2026-10-31']);
    assert.equal(row.status, 'CURRENT_PERIOD_PENDING');
    assert.equal(row.periodGateAttempted, false);
    assert.equal(row.payrollLifecycleCompleted, false);
  }
  assert.equal(summarize(results).blockedPeriodGates, 33);
  assert.equal(summarize(results).octoberPending, 3);
  assert.equal(summarize(results).completedPayrollLifecycles, 0);
});

test('gate visits are awaited serially and progress preserves every blocker', async () => {
  let active = 0;
  const progress = [];
  await visitPlan(buildPlan(), async row => {
    assert.equal(active++, 0);
    await Promise.resolve();
    active--;
    return { status: 'BLOCKED_PERIOD_GATE', periodGateAttempted: true, error: { code: 'PACK_EFFECTIVE_DATE_MISSING', message: row.month } };
  }, async (row, results) => { progress.push({ count: results.length, row }); });
  assert.deepEqual(progress.map(row => row.count), Array.from({ length: 36 }, (_, i) => i + 1));
  assert.equal(progress[0].row.error.message, '2025-11');
});

test('created, replayed, blocked and unexpected outcomes remain distinct and never claim lifecycle completion', async () => {
  const states = ['PERIOD_CREATED_DOWNSTREAM_BLOCKED', 'PERIOD_REUSED_DOWNSTREAM_BLOCKED', 'FAILED_UNEXPECTED'];
  const results = await visitPlan(buildPlan(), async row => ({
    status: states[row.ordinal - 1] || 'BLOCKED_PERIOD_GATE', periodGateAttempted: true, payrollLifecycleCompleted: true,
  }));
  const summary = summarize(results);
  assert.equal(summary.periodsCreated, 1);
  assert.equal(summary.existingPeriodsReused, 1);
  assert.equal(summary.unexpectedFailures, 1);
  assert.equal(summary.blockedPeriodGates, 30);
  assert.ok(results.every(row => row.payrollLifecycleCompleted === false));
});

test('altered plan cannot broaden October scope or rewrite dates', async () => {
  const plan = buildPlan();
  plan.slots.at(-1).scope = 'HISTORICAL_PERIOD_GATE';
  let calls = 0;
  await assert.rejects(visitPlan(plan, async () => { calls++; }), /differs/);
  assert.equal(calls, 0);
});

test('CLI defaults to plan and execute requires the exact database', () => {
  assert.deepEqual(parseArgs([]), { mode: 'plan', database: DATABASE });
  assert.deepEqual(parseArgs([DATABASE]), { mode: 'plan', database: DATABASE });
  assert.deepEqual(parseArgs(['execute', DATABASE]), { mode: 'execute', database: DATABASE });
  for (const args of [['execute'], ['execute', 'postgres'], ['seed', DATABASE], ['execute', DATABASE, '--force']]) assert.throws(() => parseArgs(args));
});

test('target guard rejects remote/schema/database/baseline/digest drift', () => {
  const manifest = { status: 'schema-verified', schemaSha256: 'a'.repeat(64), referenceDate: '2026-10-28', historyStart: '2025-11-01', historyEnd: '2026-10-28', target: { database: DATABASE, host: 'localhost', port: '5432', schema: 'public' } };
  const target = new URL(`postgresql://fixture:fixture@localhost:5432/${DATABASE}?schema=public`);
  assert.doesNotThrow(() => assertTarget(target, manifest, 'a'.repeat(64)));
  for (const uri of [`postgresql://remote.invalid/${DATABASE}?schema=public`, 'postgresql://localhost/postgres?schema=public', `postgresql://localhost/${DATABASE}?schema=other`]) assert.throws(() => assertTarget(new URL(uri), manifest, 'a'.repeat(64)));
  assert.throws(() => assertTarget(target, { ...manifest, historyEnd: '2026-10-31' }, 'a'.repeat(64)));
  assert.throws(() => assertTarget(target, manifest, 'b'.repeat(64)));
});

test('errors omit connection URLs and token/password values', () => {
  const safe = sanitize('failed postgresql://someone:private@localhost/db password=private token:private sessionToken=private');
  assert.equal(safe.includes('someone'), false);
  assert.equal(safe.includes('private'), false);
  assert.match(safe, /REDACTED_DATABASE_URL/);
});
