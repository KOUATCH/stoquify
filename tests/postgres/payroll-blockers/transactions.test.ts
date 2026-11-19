import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { assertPayrollBlockersTestUrl } from '../../../scripts/payroll-blockers-postgres-target.cjs';
import { db } from '@/prisma/db';
import { ApplicationError, BusinessRuleError } from '@/services/_shared/action-errors';
import { hashBusinessPayload } from '@/services/events/business-event.service';
import { calculatePayrollRun, inPayrollTransitionTransaction } from '@/services/payroll/payroll-control.service';

// Deliberately fail, never skip, when invoked without the guarded fresh-target runner.
if (process.env.RUN_PAYROLL_BLOCKERS_POSTGRES !== '1') throw new Error('Use the payroll blockers PostgreSQL runner');
assertPayrollBlockersTestUrl(process.env.DATABASE_URL, process.env.PAYROLL_BLOCKERS_DATABASE);
const observer = new PrismaClient();
const ids = () => `blockers-${randomUUID()}`;
async function organization() {
  const id = ids();
  return db.organization.create({ data: { id, slug: id, name: '0' } });
}
function barrier() {
  let arrivals = 0, release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  return async () => { if (++arrivals === 2) release(); await ready; };
}
async function countAudit(organizationId: string) {
  return observer.auditLog.count({ where: { organizationId, action: 'SYNTHETIC_PAYROLL_TX_PROBE' } });
}
beforeAll(async () => {
  const rows = await db.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
  expect(rows[0].database).toBe(process.env.PAYROLL_BLOCKERS_DATABASE);
});
afterAll(async () => { await Promise.all([db.$disconnect(), observer.$disconnect()]); });

test('real Serializable contention retries from a new snapshot without duplicate audit effects', async () => {
  const org = await organization(), meet = barrier();
  const attempts = [0, 0];
  const values = await Promise.all([0, 1].map(index => inPayrollTransitionTransaction(db, async tx => {
    attempts[index]++;
    const isolation = await tx.$queryRaw<Array<{ transaction_isolation: string }>>`SHOW transaction_isolation`;
    expect(isolation[0].transaction_isolation).toBe('serializable');
    const current = await tx.organization.findUniqueOrThrow({ where: { id: org.id } });
    if (attempts[index] === 1) await meet();
    await tx.auditLog.create({ data: { organizationId: org.id, entityType: 'SyntheticPayrollTransaction', entityId: org.id, action: 'SYNTHETIC_PAYROLL_TX_PROBE', changes: { index } } });
    const value = Number(current.name) + 1;
    await tx.organization.update({ where: { id: org.id }, data: { name: String(value) } });
    return value;
  })));
  expect(values.sort()).toEqual([1, 2]);
  expect(attempts.reduce((a, b) => a + b)).toBe(3);
  expect((await observer.organization.findUniqueOrThrow({ where: { id: org.id } })).name).toBe('2');
  expect(await countAudit(org.id)).toBe(2);
});

test('real unique constraint failure re-enters callback and resolves committed idempotent state', async () => {
  const org = await organization();
  let attempts = 0;
  const result = await inPayrollTransitionTransaction(db, async tx => {
    attempts++;
    if (attempts === 1) {
      await tx.auditLog.create({ data: { organizationId: org.id, entityType: 'SyntheticPayrollTransaction', entityId: org.id, action: 'SYNTHETIC_PAYROLL_TX_PROBE' } });
      return tx.organization.create({ data: { id: ids(), slug: org.slug, name: 'duplicate' } });
    }
    return tx.organization.findUniqueOrThrow({ where: { id: org.id } });
  });
  expect(result.id).toBe(org.id);
  expect(attempts).toBe(2);
  expect(await countAudit(org.id)).toBe(0);
});

test('three real constraint conflicts exhaust the retry budget and roll back all attempts', async () => {
  const org = await organization();
  let attempts = 0;
  await expect(inPayrollTransitionTransaction(db, async tx => {
    attempts++;
    await tx.auditLog.create({ data: { organizationId: org.id, entityType: 'SyntheticPayrollTransaction', entityId: org.id, action: 'SYNTHETIC_PAYROLL_TX_PROBE' } });
    return tx.organization.create({ data: { id: ids(), slug: org.slug, name: 'duplicate' } });
  })).rejects.toMatchObject({ code: 'CONCURRENCY_CONFLICT', status: 409 });
  expect(attempts).toBe(3);
  expect(await countAudit(org.id)).toBe(0);
});

test('domain failure after writes rolls back without retry and preserves its safe error', async () => {
  const org = await organization(), denied = new BusinessRuleError('Synthetic denial');
  let attempts = 0;
  await expect(inPayrollTransitionTransaction(db, async tx => {
    attempts++;
    await tx.organization.update({ where: { id: org.id }, data: { name: 'should roll back' } });
    await tx.auditLog.create({ data: { organizationId: org.id, entityType: 'SyntheticPayrollTransaction', entityId: org.id, action: 'SYNTHETIC_PAYROLL_TX_PROBE' } });
    throw denied;
  })).rejects.toBe(denied);
  expect(attempts).toBe(1);
  expect((await observer.organization.findUniqueOrThrow({ where: { id: org.id } })).name).toBe('0');
  expect(await countAudit(org.id)).toBe(0);
});

test('injected transaction rolls back with its caller and retains caller isolation', async () => {
  const org = await organization();
  await expect(db.$transaction(async outer => {
    await inPayrollTransitionTransaction(outer, async tx => {
      expect(tx).toBe(outer);
      const isolation = await tx.$queryRaw<Array<{ transaction_isolation: string }>>`SHOW transaction_isolation`;
      expect(isolation[0].transaction_isolation).toBe('read committed');
      await tx.organization.update({ where: { id: org.id }, data: { name: 'rollback with caller' } });
    });
    throw new Error('caller rollback');
  })).rejects.toThrow('caller rollback');
  expect((await observer.organization.findUniqueOrThrow({ where: { id: org.id } })).name).toBe('0');
});

test('acknowledgement loss injected after a real commit recovers through an idempotent replay', async () => {
  const org = await organization(), key = ids();
  const work = async (tx: Parameters<Parameters<typeof inPayrollTransitionTransaction>[1]>[0]) => {
    const existing = await tx.businessEvent.findFirst({ where: { organizationId: org.id, idempotencyKey: key } });
    if (existing) return existing;
    return tx.businessEvent.create({ data: { organizationId: org.id, eventType: 'synthetic.payroll.commit', idempotencyKey: key, payloadHash: 'synthetic', payload: {}, occurredAt: new Date() } });
  };
  const lostAck = new Proxy(db, { get(target, property) {
    if (property === '$transaction') return async (...args: any[]) => {
      await (target.$transaction as any)(...args);
      throw new Error('Synthetic response loss after committed transaction');
    };
    return Reflect.get(target, property);
  } });
  await expect(inPayrollTransitionTransaction(lostAck, work)).rejects.toMatchObject({ code: 'INTERNAL_ERROR', expose: false });
  expect(await observer.businessEvent.count({ where: { organizationId: org.id, idempotencyKey: key } })).toBe(1);
  const recovered = await inPayrollTransitionTransaction(db, work);
  expect(recovered.idempotencyKey).toBe(key);
  expect(await observer.businessEvent.count({ where: { organizationId: org.id, idempotencyKey: key } })).toBe(1);
});

test('actual calculation service replays stored runs concurrently and denies changed payload/tenant escape', async () => {
  const org = await organization(), other = await organization(), key = ids();
  const period = await db.payrollPeriod.create({ data: { organizationId: org.id, name: 'Synthetic replay only', countryCode: 'CM', periodStart: new Date('2026-09-01'), periodEnd: new Date('2026-09-30'), payDate: new Date('2026-09-30') } });
  const hash = `sha256:${hashBusinessPayload({ operation: 'calculatePayrollRun', payrollPeriodId: period.id, runType: 'ORDINARY', originalRunId: null, employeeIds: [] })}`;
  const run = await db.payrollRun.create({ data: { organizationId: org.id, payrollPeriodId: period.id, runNumber: ids(), idempotencyKey: key,
    countryCode: 'CM', countryPackVersion: 'synthetic', countryPackSchemaVersion: 'synthetic', countryPackResolutionHash: 'synthetic', countryPackCapabilityStatus: 'EXPERT_REVIEW_REQUIRED',
    ruleSetHash: 'synthetic', calculationHash: 'synthetic', attendanceSnapshotHash: 'synthetic', metadata: { idempotencyPayloadHash: hash } } });
  const request = { organizationId: org.id, payrollPeriodId: period.id, preparedById: 'synthetic-preparer', idempotencyKey: key };
  const results = await Promise.all([calculatePayrollRun(request), calculatePayrollRun(request)]);
  expect(results.map(r => [r.created, r.payrollRun.id])).toEqual([[false, run.id], [false, run.id]]);
  await expect(calculatePayrollRun({ ...request, employeeIds: ['changed-employee'] })).rejects.toBeInstanceOf(ApplicationError);
  await expect(calculatePayrollRun({ ...request, organizationId: other.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  expect(await observer.payrollRun.count({ where: { organizationId: org.id } })).toBe(1);
  expect(await observer.businessEvent.count({ where: { organizationId: org.id } })).toBe(0);
});
