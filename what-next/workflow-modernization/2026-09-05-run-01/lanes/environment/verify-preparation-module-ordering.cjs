const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { Prisma } = require('@prisma/client');
const service = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const files = ['services/reconciliation/reconciliation-run-preparation.service.ts', 'services/modules/module-entitlement.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), sourceBefore: hashes(), cases: [] };
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'accounting.journal.read'];
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function managed(label) {
  const x = await fixture('module-order-' + label + '-' + stamp), modules = getModuleCatalog().map(m => m.slug);
  await db.tenantModuleConfiguration.create({ data: { organizationId: x.org.id, manifestHash: 'owned-module-order', selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.org.id, moduleSlug, status: 'active', source: 'requested_modules' })) }); x.prepareReview = await service.previewReconciliationPreparation({ runId: x.run.runId }, control(x)); assert.equal(x.prepareReview.canPrepare, true); return x;
}
const control = x => { const now = new Date(); return { organizationId: x.org.id, actorId: x.maker.id, actorPermissions: permissions, now, lastAuthAt: now }; };
const command = x => ({ runId: x.run.runId, expectedRevision: x.prepareReview.revision, reason: 'Owned module ordering preparation', idempotencyKey: x.prepareKey ??= crypto.randomUUID() });
async function withdrawal(tx, x) {
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "organizations" WHERE "id" = ${x.org.id} FOR UPDATE`);
  await tx.tenantModuleGrant.update({ where: { organizationId_moduleSlug: { organizationId: x.org.id, moduleSlug: 'payment_reconciliation' } }, data: { status: 'read_only' } });
  await tx.tenantModuleConfiguration.update({ where: { organizationId: x.org.id }, data: { revision: { increment: 1 } } });
}
async function waitForLock(pid) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const rows = await db.$queryRaw(Prisma.sql`SELECT "wait_event_type", "wait_event" FROM pg_stat_activity WHERE pid = ${pid}`);
    if (rows[0]?.wait_event_type === 'Lock') return rows[0];
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Owned backend did not enter the expected lock wait');
}
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  {
    const x = await managed('withdrawal-first'), locked = deferred(), release = deferred(), entered = deferred(), original = db.$transaction.bind(db);
    const row = { order: 'withdrawal holds authority lock before signing', organizationId: x.org.id, runId: x.run.runId }; report.cases.push(row);
    const timer = setTimeout(() => release.resolve(), 12000);
    const revoke = original(async tx => { await withdrawal(tx, x); locked.resolve(); await release.promise; });
    let sign;
    try {
      await locked.promise;
      db.$transaction = async (callback, options) => {
        try { return await original(async tx => { const [{ pid }] = await tx.$queryRaw(Prisma.sql`SELECT pg_backend_pid() AS pid`); entered.resolve(pid); return callback(tx); }, options); }
        catch (error) { (row.transactionErrors ??= []).push({ code: error.code, sqlState: error.meta?.code }); throw error; }
      };
      sign = service.prepareReconciliationRun(command(x), control(x)).then(value => ({ value }), error => ({ error: { code: error.code, message: f.safe(error) } }));
      row.observedLock = await waitForLock(await entered.promise); release.resolve(); await revoke; row.sign = await sign;
      assert.ok(['FORBIDDEN', 'CONFLICT'].includes(row.sign.error?.code), 'Withdrawal must prevent preparation');
      db.$transaction = original; await assert.rejects(() => service.prepareReconciliationRun(command(x), control(x)), e => e.code === 'FORBIDDEN');
      assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } })).status, 'READY_FOR_SIGNOFF');
      assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_RUN_PREPARE' } }), 0); row.noPreparation = true;
    } finally { clearTimeout(timer); release.resolve(); await revoke.catch(() => {}); await sign; db.$transaction = original; }
  }
  {
    const x = await managed('sign-first'), held = deferred(), release = deferred(), started = deferred(), original = db.$transaction.bind(db);
    const row = { order: 'signing holds authority lock before withdrawal', organizationId: x.org.id, runId: x.run.runId }; report.cases.push(row);
    const timer = setTimeout(() => release.resolve(), 12000);
    let sign, revoke;
    try {
      db.$transaction = async (callback, options) => original(async tx => callback(new Proxy(tx, { get(client, key) {
        if (key !== 'reconciliationRun') return Reflect.get(client, key);
        return new Proxy(tx.reconciliationRun, { get(model, method) {
          if (method !== 'findFirst') return Reflect.get(model, method);
          return async args => { const value = await model.findFirst(args); if (args.include?.providerAccount) { held.resolve(); await release.promise; } return value; };
        } });
      } })), options);
      sign = service.prepareReconciliationRun(command(x), control(x)); await held.promise;
      revoke = original(async tx => { const [{ pid }] = await tx.$queryRaw(Prisma.sql`SELECT pg_backend_pid() AS pid`); started.resolve(pid); await withdrawal(tx, x); });
      row.observedLock = await waitForLock(await started.promise); release.resolve(); row.signed = await sign; await revoke;
      assert.equal(row.signed.currentStatus, 'READY_FOR_SIGNOFF'); assert.equal((await db.tenantModuleGrant.findUniqueOrThrow({ where: { organizationId_moduleSlug: { organizationId: x.org.id, moduleSlug: 'payment_reconciliation' } } })).status, 'read_only');
      db.$transaction = original;
      await assert.rejects(() => service.prepareReconciliationRun(command(x), control(x)), e => e.code === 'FORBIDDEN');
      assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_RUN_PREPARE' } }), 1);
      assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0); row.onePreWithdrawalPreparationAndSubsequentDenial = true;
    } finally { clearTimeout(timer); release.resolve(); await sign?.catch(() => {}); await revoke?.catch(() => {}); db.$transaction = original; }
  }
  report.passed = true;
}
main().catch(error => { report.passed = false; report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'preparation-module-ordering-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, error: report.error, cases: report.cases.length })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
