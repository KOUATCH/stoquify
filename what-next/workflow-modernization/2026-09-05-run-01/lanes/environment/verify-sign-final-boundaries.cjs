const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { Prisma } = require('@prisma/client');
const service = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const files = ['services/reconciliation/payment-reconciliation-certification.service.ts', 'services/reconciliation/payment-reconciliation-evidence.service.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'services/reconciliation/reconciliation-retained-signature.ts', 'services/accounting/periods.service.ts', 'services/modules/module-entitlement.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), sourceBefore: hashes(), cases: [] };
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.sign'];
const command = x => { const now = new Date(); return { organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id, expectedSourceVersionHash: x.review.expectedSourceVersionHash, expectedEvidenceRevision: x.review.expectedEvidenceRevision, control: { actorPermissions: permissions, now, lastAuthAt: now } }; };
const periodFor = x => db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.org.id, startDate: { lte: new Date() }, endDate: { gte: new Date() } } });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function counts(x) {
  return { run: (await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } })).status,
    audits: await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'PAYMENT_RECONCILIATION_RUN_SIGN' } }),
    events: await db.businessEvent.count({ where: { organizationId: x.org.id, eventType: 'payment.reconciliation.signed' } }),
    journals: await db.journalEntry.count({ where: { organizationId: x.org.id } }) };
}
async function waitForLock(pid) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const rows = await db.$queryRaw(Prisma.sql`SELECT "wait_event_type", "wait_event" FROM pg_stat_activity WHERE pid = ${pid}`);
    if (rows[0]?.wait_event_type === 'Lock') return rows[0];
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Expected owned period lock wait was not observed');
}
async function main() {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  for (const kind of ['provider-suspended', 'provider-revised', 'settlement-approval-withdrawn', 'period-closed']) {
    const x = await fixture('sign-final-' + kind + '-' + stamp), input = command(x), row = { kind, organizationId: x.org.id, runId: x.run.runId }; report.cases.push(row);
    if (kind === 'provider-suspended') await db.providerAccount.update({ where: { id: x.provider.id }, data: { status: 'SUSPENDED' } });
    if (kind === 'provider-revised') await db.providerAccount.update({ where: { id: x.provider.id }, data: { displayName: 'Owned revised provider' } });
    if (kind === 'settlement-approval-withdrawn') await db.settlementAccount.updateMany({ where: { organizationId: x.org.id, providerAccountId: x.provider.id }, data: { effectiveTo: new Date(Date.now() - 60000) } });
    if (kind === 'period-closed') await db.accountingPeriod.update({ where: { id: (await periodFor(x)).id }, data: { status: 'CLOSED' } });
    await assert.rejects(() => service.signReconciliationRun(input), error => { row.error = { code: error.code, message: f.safe(error) }; return ['BUSINESS_RULE_VIOLATION', 'CONFLICT'].includes(error.code); });
    row.effects = await counts(x); assert.deepEqual(row.effects, { run: 'READY_FOR_SIGNOFF', audits: 0, events: 0, journals: 0 }); row.passed = true; console.log(JSON.stringify({kind:row.kind,passed:true}));
  }
  // Close commits after the run snapshot but before signing acquires its shared period lock.
  {
    const x = await fixture('sign-final-close-first-' + stamp), period = await periodFor(x), held = deferred(), release = deferred(), original = db.$transaction.bind(db);
    const row = { kind: 'close-commits-after-run-read-before-sign-period-lock', organizationId: x.org.id, runId: x.run.runId }; report.cases.push(row);
    let intercepted = false, signing; const timer = setTimeout(() => release.resolve(), 12000);
    try {
      db.$transaction = (callback, options) => original(tx => callback(new Proxy(tx, { get(client, key) {
        if (key !== 'reconciliationRun') return Reflect.get(client, key);
        return new Proxy(tx.reconciliationRun, { get(model, method) {
          if (method !== 'findFirst') return Reflect.get(model, method);
          return async args => { const value = await model.findFirst(args); if (!intercepted && args.include?.providerAccount) { intercepted = true; held.resolve(); await release.promise; } return value; };
        } });
      } })), options);
      signing = service.signReconciliationRun(command(x)).then(value => ({ value }), error => ({ error: { code: error.code, message: f.safe(error) } }));
      await Promise.race([held.promise, new Promise((_, reject) => { const timeout = setTimeout(() => reject(new Error('Verifier barrier was not reached')), 15000); timeout.unref(); })]); await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED' } }); release.resolve(); row.result = await signing;
      assert.ok(row.result.error, 'Stale period snapshot must not sign'); row.effects = await counts(x);
      assert.deepEqual(row.effects, { run: 'READY_FOR_SIGNOFF', audits: 0, events: 0, journals: 0 }); row.passed = true; console.log(JSON.stringify({kind:row.kind,passed:true}));
    } finally { clearTimeout(timer); release.resolve(); await signing; db.$transaction = original; }
  }
  // A sign transaction holding the shared period lock finishes before a later close writer.
  {
    const x = await fixture('sign-final-sign-first-' + stamp), period = await periodFor(x), held = deferred(), release = deferred(), entered = deferred(), original = db.$transaction.bind(db);
    const row = { kind: 'sign-period-lock-before-close-writer', organizationId: x.org.id, runId: x.run.runId }; report.cases.push(row);
    let intercepted = false, signing, closing; const timer = setTimeout(() => release.resolve(), 12000);
    try {
      db.$transaction = (callback, options) => original(tx => callback(new Proxy(tx, { get(client, key) {
        if (key !== '$queryRaw') return Reflect.get(client, key);
        return async (...args) => { const value = await tx.$queryRaw(...args); const sql = (Array.isArray(args[0]) ? args[0] : args[0]?.strings || []).join(' '); if (!intercepted && sql.includes('accounting_periods') && sql.includes('FOR SHARE')) { intercepted = true; held.resolve(); await release.promise; } return value; };
      } })), options);
      signing = service.signReconciliationRun(command(x)); await Promise.race([held.promise, new Promise((_, reject) => { const timeout = setTimeout(() => reject(new Error('Verifier barrier was not reached')), 15000); timeout.unref(); })]);
      closing = original(async tx => { const [{ pid }] = await tx.$queryRaw(Prisma.sql`SELECT pg_backend_pid() AS pid`); entered.resolve(pid); await tx.accountingPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED' } }); });
      row.observedLock = await waitForLock(await entered.promise); release.resolve(); row.signature = await signing; await closing;
      row.effects = await counts(x); assert.deepEqual(row.effects, { run: 'SIGNED', audits: 1, events: 1, journals: 0 });
      db.$transaction = original;
      row.replay = await service.signReconciliationRun(command(x)); assert.equal(row.replay.certificateHash, row.signature.certificateHash); assert.equal(row.replay.replayed, true);
      assert.deepEqual(await counts(x), row.effects); row.passed = true; console.log(JSON.stringify({kind:row.kind,passed:true}));
    } finally { clearTimeout(timer); release.resolve(); await signing?.catch(() => {}); await closing?.catch(() => {}); db.$transaction = original; }
  }
  report.passed = true;
}
main().catch(error => { report.passed = false; report.error = f.safe(error); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'sign-final-boundaries-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable, cases: report.cases.length })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
