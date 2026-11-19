/** Explicit period-gate continuation of the owned dataset. Never an automatic reseed. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { db } from './db';
import { signIn } from './disposable-business-workflows';
import { createPayrollPeriod } from '../services/payroll/payroll-control.service';
import { BusinessRuleError } from '../services/_shared/action-errors';
import { RegulatoryPackError } from '../services/regulatory/country-packs/validation';

const { DATABASE, ORGANIZATIONS, buildPlan, planHash, assertTarget, sanitize, visitPlan, summarize } = require('../scripts/disposable-payroll-continuation-plan.cjs');
const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'docs/engineering/database/disposable-dataset-2026-10-28');
const DEST = path.join(ROOT, 'docs/database-seed/payroll-continuation-2026-11-02');
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
type Slot = { organizationId: string; month: string; periodStart: string; periodEnd: string; payDate: string; commandKey: string };
type Row = Record<string, any>;
type Credential = { organizationId: string; userId: string; role: string; email: string; password: string };

function errorEvidence(error: unknown) {
  const candidate = error as { name?: unknown; code?: unknown; message?: unknown };
  return { name: sanitize(candidate?.name || 'Error'), code: sanitize(candidate?.code || 'UNCLASSIFIED_ERROR'), message: sanitize(candidate?.message || 'Unknown failure') };
}

async function captureState() {
  const where = { organizationId: { in: ORGANIZATIONS as string[] } };
  const [periods, runs, attendanceEntries, attendanceSnapshots] = await Promise.all([
    db.payrollPeriod.findMany({ where, orderBy: { id: 'asc' } }),
    db.payrollRun.findMany({ where, orderBy: { id: 'asc' } }),
    db.hrisTimeEntry.count({ where }),
    db.payrollAttendanceSnapshot.count({ where }),
  ]);
  return {
    periods: periods.map(period => ({ id: period.id, organizationId: period.organizationId, status: period.status, sha256: hash(period) })),
    payrollRunCount: runs.length, payrollRunsSha256: hash(runs), attendanceEntries, attendanceSnapshots,
  };
}

function assertPeriodMatches(period: { name: string; payDate: Date; countryCode: string; frequency: string }, slot: Slot) {
  if (period.name !== slot.month || period.payDate.toISOString() !== slot.payDate || period.countryCode !== 'CM' || period.frequency !== 'MONTHLY') {
    throw new Error('Retained period differs from planned name/pay date/country/frequency; it was not changed');
  }
}

export async function executePayrollContinuation() {
  const plan = buildPlan();
  const expectedHash = planHash(plan);
  if (process.argv[2] !== '--execute' || process.argv[3] !== DATABASE || process.argv.length !== 4 ||
      process.env.NODE_ENV !== 'test' || process.env.STOQUIFY_PAYROLL_CONTINUATION_PLAN_HASH !== expectedHash) {
    throw new Error('Use the explicit guarded payroll continuation launcher after inspecting its plan');
  }
  const resultPath = path.resolve(process.env.STOQUIFY_PAYROLL_CONTINUATION_RESULT || '');
  if (path.dirname(resultPath) !== DEST || !/^payroll-continuation-[0-9TZ.-]+\.json$/.test(path.basename(resultPath))) {
    throw new Error('Owned continuation result path required');
  }
  const manifest = JSON.parse(readFileSync(path.join(SOURCE, 'manifest.json'), 'utf8'));
  const schemaHash = createHash('sha256').update(readFileSync(path.join(ROOT, 'prisma/schema.prisma'))).digest('hex');
  for (const key of ['DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL', 'AQSTOQFLOW_FRESH_REPLAY_DATABASE_URL']) {
    assertTarget(new URL(process.env[key] || ''), manifest, schemaHash);
  }
  const identity = (await db.$queryRaw<Array<{ database: string; schema: string }>>`SELECT current_database() AS database, current_schema() AS schema`)[0];
  if (identity.database !== DATABASE || identity.schema !== 'public') throw new Error('Connected target identity mismatch');
  const savedPlan = JSON.parse(readFileSync(path.join(DEST, 'payroll-continuation-plan.json'), 'utf8'));
  if (savedPlan.planHash !== expectedHash || planHash(savedPlan.plan) !== expectedHash) throw new Error('Saved plan changed before execution');
  const credentials: Credential[] = JSON.parse(readFileSync(path.join(ROOT, '.seed-artifacts/disposable-dataset-2026-10-28/credentials.json'), 'utf8'));
  const report: Row = {
    generatedAt: new Date().toISOString(), database: DATABASE, schemaSha256: schemaHash, planHash: expectedHash,
    evidenceClass: 'REAL_SERVICE_PERIOD_GATES_ONLY', status: 'IN_PROGRESS',
    cutoff: plan.baseline, executionScope: plan.executionScope, lifecycleBoundary: plan.lifecycleBoundary,
    statutoryReviewClaimed: false, payrollLifecycleCompleted: false, results: [], unexpectedIssues: [],
  };
  const save = () => {
    report.summary = summarize(report.results);
    writeFileSync(resultPath, JSON.stringify(report, null, 2) + '\n');
  };
  report.before = await captureState();
  save();
  const actors = new Map<string, Awaited<ReturnType<typeof signIn>>>();
  try {
    for (const organizationId of ORGANIZATIONS as string[]) {
      const matching = credentials.filter(row => row.organizationId === organizationId && row.role === 'payroll_administrator');
      if (matching.length !== 1) throw new Error(`Exactly one retained synthetic payroll administrator required for ${organizationId}`);
      const actor = await signIn(matching[0]);
      if (actor.organizationId !== organizationId || actor.actorId !== matching[0].userId) throw new Error('Authenticated fixture identity differs');
      actors.set(organizationId, actor);
    }
    await visitPlan(plan, async (slot: Slot) => {
      let periodGateAttempted = false;
      try {
        const existing = await db.payrollPeriod.findFirst({ where: {
          organizationId: slot.organizationId, periodStart: new Date(slot.periodStart), periodEnd: new Date(slot.periodEnd),
        } });
        if (existing) assertPeriodMatches(existing, slot);
        periodGateAttempted = true;
        const result = await createPayrollPeriod({
          organizationId: slot.organizationId, name: slot.month, frequency: 'MONTHLY',
          periodStart: new Date(slot.periodStart), periodEnd: new Date(slot.periodEnd), payDate: new Date(slot.payDate), countryCode: 'CM',
          actorId: actors.get(slot.organizationId)!.actorId,
          metadata: { classification: 'SYNTHETIC_DISPOSABLE_PERIOD_GATE', planHash: expectedHash, commandKey: slot.commandKey, statutoryApprovalClaimed: false },
        });
        assertPeriodMatches(result.payrollPeriod, slot);
        return {
          status: result.created ? 'PERIOD_CREATED_DOWNSTREAM_BLOCKED' : 'PERIOD_REUSED_DOWNSTREAM_BLOCKED',
          periodGateAttempted, periodId: result.payrollPeriod.id, retainedPeriodStatus: result.payrollPeriod.status,
          countryPackVersion: result.payrollPeriod.countryPackVersion,
          periodReplayMeaning: result.created ? 'Normal service created a period; no payroll run was produced.' : 'Normal service reused the retained period; this short-circuit is not a fresh statutory/admission review.',
          downstreamBlockers: plan.unavailablePrerequisites,
        };
      } catch (error) {
        const expected = periodGateAttempted && (error instanceof BusinessRuleError || error instanceof RegulatoryPackError);
        const evidence = errorEvidence(error);
        if (!expected) report.unexpectedIssues.push({ organizationId: slot.organizationId, month: slot.month, ...evidence });
        return { status: expected ? 'BLOCKED_PERIOD_GATE' : 'FAILED_UNEXPECTED', periodGateAttempted,
          blockedAt: 'services/payroll/payroll-control.service.ts#createPayrollPeriod', error: evidence };
      }
    }, async (_row: Row, results: Row[]) => { report.results = results; save(); });
  } catch (error) {
    report.unexpectedIssues.push(errorEvidence(error));
  } finally {
    report.after = await captureState();
    const retained = new Map(report.after.periods.map((row: Row) => [row.id, row.sha256]));
    report.invariants = {
      existingPeriodsUnchanged: report.before.periods.every((row: Row) => retained.get(row.id) === row.sha256),
      payrollRunsUnchanged: report.before.payrollRunsSha256 === report.after.payrollRunsSha256,
      attendanceEntryCountUnchanged: report.before.attendanceEntries === report.after.attendanceEntries,
      attendanceSnapshotCountUnchanged: report.before.attendanceSnapshots === report.after.attendanceSnapshots,
      newPeriodCountMatchesServiceResults: report.after.periods.length - report.before.periods.length === summarize(report.results).periodsCreated,
    };
    if (Object.values(report.invariants).some(value => value !== true)) report.unexpectedIssues.push({ message: 'Retained-state invariant failed; inspect before/after evidence' });
    report.finishedAt = new Date().toISOString();
    report.status = report.unexpectedIssues.length ? 'FAILED_UNEXPECTED' : 'BLOCKED_PREREQUISITES_OCTOBER_PENDING';
    save();
  }
  console.log(JSON.stringify({ status: report.status, summary: report.summary, invariants: report.invariants }));
  return report.unexpectedIssues.length ? 1 : 2;
}

if (require.main === module) executePayrollContinuation().then(code => { process.exitCode = code; })
  .catch(error => { console.error(sanitize(error instanceof Error ? error.message : 'Continuation failed')); process.exitCode = 1; })
  .finally(async () => {
    try {
      await db.$disconnect();
    } catch (error) {
      console.error(sanitize(error instanceof Error ? error.message : 'DB disconnect failed'));
      process.exitCode = 1;
    } finally {
      // Application imports own background health timers. This is a dedicated
      // child process; retained evidence is synchronous and cleanup runs first.
      process.exit(process.exitCode || 0);
    }
  });
