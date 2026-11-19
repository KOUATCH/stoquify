// Read-only final reconciliation, restricted to the named disposable database.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const fixture = JSON.parse(fs.readFileSync('.codex-tmp/workflow-closure-private.json', 'utf8'));
const url = new URL(fixture.url);
if (process.env.NODE_ENV === 'production' || url.hostname !== 'localhost' || url.pathname !== '/stoquify_pos_audit_20261026_d30f') throw Error('Wrong disposable target');
const evidence = JSON.parse(fs.readFileSync(path.join(__dirname, 'lifecycle-reconciliation.json'), 'utf8'));
const { organizationId, periodId } = evidence[0];
const db = new PrismaClient({ datasources: { db: { url: fixture.url } } });
(async () => {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const environment = await tx.$queryRawUnsafe('SELECT current_database() AS database, version() AS version');
    const migrations = await tx.$queryRawUnsafe('SELECT count(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
    const faults = await tx.$queryRawUnsafe("SELECT proname FROM pg_proc WHERE proname LIKE 'close_lifecycle_%'");
    const period = await tx.accountingPeriod.findUniqueOrThrow({ where: { id: periodId }, select: { id: true, status: true, controlVersion: true } });
    const seals = await tx.periodControlEvent.findMany({ where: { organizationId }, orderBy: { version: 'asc' }, select: { id: true, operation: true, version: true, approval: true } });
    const exports = await tx.closePackExport.findMany({ where: { organizationId }, select: { id: true, closeRunId: true, contentHash: true, isCertified: true, metadata: true } });
    const journals = await tx.journalEntry.findMany({ where: { organizationId }, include: { lines: { include: { account: { select: { code: true, mappingKey: true } } } } } });
    const stock = await tx.inventoryLevel.findMany({ where: { item: { organizationId } }, select: { quantityOnHand: true, totalValue: true } });
    const counts = { returns: await tx.purchaseReturn.count({ where: { organizationId } }), supplierPayments: await tx.supplierPayment.count({ where: { organizationId } }), paymentTransactions: await tx.paymentTransaction.count({ where: { organizationId } }) };
    return { at: new Date().toISOString(), environment, migrations, organizationId, period, faults, seals, exports, journals: journals.map(j => ({ id: j.id, status: j.status, lines: j.lines.map(l => ({ account: l.account, debit: l.debit, credit: l.credit })) })), stock, counts };
  }, { isolationLevel: 'RepeatableRead', timeout: 30000 });
  assert.equal(result.faults.length, 0);
  assert.equal(result.period.status, 'CLOSED');
  assert.equal(result.period.controlVersion, 3);
  assert.deepEqual(result.seals.map(s => s.operation), ['CLOSE', 'REOPEN', 'CLOSE']);
  assert.equal(result.exports.filter(e => e.isCertified).length, 2);
  assert.deepEqual(result.counts, { returns: 1, supplierPayments: 1, paymentTransactions: 1 });
  assert.equal(result.journals.length, 4);
  fs.writeFileSync(path.join(__dirname, 'database-readback.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ status: 'PASS', database: result.environment[0].database, migrations: result.migrations[0].count, period: result.period, residualFaultFunctions: result.faults.length, counts: result.counts }));
})().catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted URL]')); process.exitCode = 1; }).finally(() => db.$disconnect());
