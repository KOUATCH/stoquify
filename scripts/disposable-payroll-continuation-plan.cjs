'use strict';

// Pure planning/orchestration only: no filesystem, environment, application or DB imports.
const { createHash } = require('node:crypto');
const DATABASE = 'stoquify_replay_dataset_20261028_01';
const ORGANIZATIONS = ['synth12_douala', 'synth12_yaounde', 'synth12_bafoussam'];
const CUTOFF = '2026-10-28';

function buildPlan() {
  const slots = [];
  for (let index = 0; index < 12; index++) {
    const start = new Date(Date.UTC(2025, 10 + index, 1));
    const end = new Date(Date.UTC(2025, 11 + index, 0));
    const month = start.toISOString().slice(0, 7);
    for (const organizationId of ORGANIZATIONS) {
      const pending = month === '2026-10';
      slots.push({
        ordinal: slots.length + 1, organizationId, month,
        periodStart: start.toISOString(), periodEnd: end.toISOString(), payDate: end.toISOString(),
        frequency: 'MONTHLY', countryCode: 'CM',
        scope: pending ? 'CURRENT_PERIOD_PENDING' : 'HISTORICAL_PERIOD_GATE',
        observationCutoff: pending ? CUTOFF : end.toISOString().slice(0, 10),
        missingObservationDates: pending ? ['2026-10-29', '2026-10-30', '2026-10-31'] : [],
        scopeReason: pending
          ? 'Retained synthetic observations stop on October 28. Preserve October 31 pay date and do not create/certify/calculate this incomplete period.'
          : 'Attempt the existing period service at the intended pay date; admission and source readiness remain separate gates.',
        commandKey: `${organizationId}:payroll-continuation:v1:${month}:period-gate`,
      });
    }
  }
  return {
    schemaVersion: 1, database: DATABASE, evidenceClass: 'PLAN_NOT_EXECUTION',
    baseline: { referenceDate: CUTOFF, historyStart: '2025-11-01', historyEnd: CUTOFF, timezone: 'Africa/Douala' },
    executionScope: 'PERIOD_CREATION_GATES_ONLY',
    counts: { organizationMonths: slots.length, historicalPeriodGates: 33, octoberPending: 3 },
    unavailablePrerequisites: [
      'Authentically reviewed, effective-dated 2025/2026 rules and production admission',
      'Signed calculation contract and independently calculated fixtures',
      'ENG-07 service-level acceptance and supported certified inputs',
    ],
    deferredLifecycle: [
      'Resolve current employee/contract/compensation/payment-destination input readiness',
      'Certify complete retained attendance through the HRIS service and freeze snapshots',
      'Calculate chronologically with authoritative YTD/correction history and stable idempotency',
      'Reconcile register and obtain independent approval through the normal services',
      'Produce payslip/posting/declaration/synthetic-payment/close evidence through their normal services',
      'Replay the admitted lifecycle and compare retained business state',
    ],
    lifecycleImplemented: false,
    lifecycleBoundary: 'Only period gates execute. No attendance import/certification, calculation, approval, payment, declaration or statutory acceptance is performed by this runner.',
    slots,
  };
}

const planHash = plan => createHash('sha256').update(JSON.stringify(plan)).digest('hex');

function parseArgs(args) {
  if (!args.length) return { mode: 'plan', database: DATABASE };
  if (args.length === 1 && args[0] === DATABASE) return { mode: 'plan', database: DATABASE };
  if (args.length === 2 && ['plan', 'execute'].includes(args[0]) && args[1] === DATABASE) {
    return { mode: args[0], database: DATABASE };
  }
  throw new Error(`Usage: node scripts/run-disposable-payroll-continuation.cjs [plan|execute ${DATABASE}]`);
}

function assertTarget(target, manifest, schemaSha256) {
  if (!['postgres:', 'postgresql:'].includes(target.protocol) ||
      !['localhost', '127.0.0.1', '[::1]', '::1'].includes(target.hostname.toLowerCase()) ||
      decodeURIComponent(target.pathname.slice(1)) !== DATABASE || target.searchParams.get('schema') !== 'public') {
    throw new Error('Exact owned local public-schema disposable target required');
  }
  if (manifest.status !== 'schema-verified' || manifest.schemaSha256 !== schemaSha256 ||
      manifest.target.database !== DATABASE || manifest.target.schema !== 'public' ||
      manifest.target.host.toLowerCase() !== target.hostname.toLowerCase() ||
      String(manifest.target.port || '5432') !== (target.port || '5432') ||
      manifest.referenceDate !== CUTOFF || manifest.historyStart !== '2025-11-01' || manifest.historyEnd !== CUTOFF) {
    throw new Error('Retained manifest identity, schema digest or frozen baseline differs');
  }
}

function sanitize(value) {
  return String(value ?? '').replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/\b(password|sessionToken|token|secret)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');
}

async function visitPlan(plan, gate, onResult = async () => {}) {
  if (planHash(plan) !== planHash(buildPlan())) throw new Error('Continuation plan differs from the reviewed deterministic scope');
  const results = [];
  for (const slot of plan.slots) {
    const outcome = slot.scope === 'CURRENT_PERIOD_PENDING'
      ? { status: 'CURRENT_PERIOD_PENDING', periodGateAttempted: false, reason: slot.scopeReason }
      : await gate(slot);
    const row = { ...slot, ...outcome, payrollLifecycleCompleted: false };
    results.push(row);
    await onResult(row, results);
  }
  return results;
}

function summarize(results) {
  return {
    plannedOrganizationMonths: 36, recordedOrganizationMonths: results.length,
    periodGateAttempts: results.filter(row => row.periodGateAttempted).length,
    periodsCreated: results.filter(row => row.status === 'PERIOD_CREATED_DOWNSTREAM_BLOCKED').length,
    existingPeriodsReused: results.filter(row => row.status === 'PERIOD_REUSED_DOWNSTREAM_BLOCKED').length,
    blockedPeriodGates: results.filter(row => row.status === 'BLOCKED_PERIOD_GATE').length,
    unexpectedFailures: results.filter(row => row.status === 'FAILED_UNEXPECTED').length,
    octoberPending: results.filter(row => row.status === 'CURRENT_PERIOD_PENDING').length,
    completedPayrollLifecycles: 0,
  };
}

module.exports = { DATABASE, ORGANIZATIONS, CUTOFF, buildPlan, planHash, parseArgs, assertTarget, sanitize, visitPlan, summarize };
