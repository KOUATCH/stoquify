const { AsyncLocalStorage } = require('node:async_hooks');
const { fixture } = require('./verify-signoff-request-order.cjs');
const { add } = require('./verify-additional-sources.cjs');
const f = require('./statement-recipient-fixtures.cjs');
const { db, fs, path, crypto, assert, helper } = f;
const recovery = require(path.join(f.root, 'services/reconciliation/reconciliation-additional-sources.service.ts'));
const preparation = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const certification = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.sign', 'accounting.journal.read'];
const files = ['services/reconciliation/reconciliation-additional-sources.service.ts', 'services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'services/reconciliation/payment-reconciliation-certification.service.ts', 'services/reconciliation/payment-reconciliation-evidence.service.ts', 'services/reconciliation/payment-reconciliation-run.service.ts', 'services/accounting/periods.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { at: new Date().toISOString(), sourceBefore: hashes(), cases: [] }, stamp = crypto.randomUUID();
const control = (x, actor = x.other.id) => { const now = new Date(); return { organizationId: x.org.id, actorId: actor, actorPermissions: permissions, now, lastAuthAt: now }; };
const command = (x, revision) => ({ runId: x.run.runId, expectedRevision: revision, reason: 'Owned concurrent recovery evidence review', idempotencyKey: crypto.randomUUID() });
const periodFor = x => db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.org.id, startDate: { lte: new Date() }, endDate: { gte: new Date() } } });
const preview = x => recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control(x));
const sign = x => { const now = new Date(); return certification.signReconciliationRun({ organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id, expectedSourceVersionHash: x.review.expectedSourceVersionHash, expectedEvidenceRevision: x.review.expectedEvidenceRevision, control: { actorPermissions: permissions, now, lastAuthAt: now } }); };
const snapshot = async x => f.hash(await Promise.all(['reconciliationRun', 'matchRecord', 'paymentException', 'suspenseItem', 'paymentReconciliationInboxItem', 'ledgerAuditEvent', 'journalEntry', 'businessEvent'].map(model => db[model].findMany({ where: { organizationId: x.org.id }, orderBy: { id: 'asc' } }))));
async function assertRecoveryOnly(x) {
  const run = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } });
  assert.equal(run.status, 'NEEDS_REVIEW'); assert.equal(run.certificateHash, null); assert.equal(run.matchedAmount.toFixed(2), '125.25');
  assert.equal(await db.matchRecord.count({ where: { organizationId: x.org.id } }), 2);
  assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_ADDITIONAL_SOURCES' } }), 1);
  assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: { in: ['RECONCILIATION_RUN_PREPARE', 'PAYMENT_RECONCILIATION_RUN_SIGN'] } } }), 0);
  assert.equal(await db.businessEvent.count({ where: { organizationId: x.org.id, eventType: 'payment.reconciliation.signed' } }), 0);
  assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
}
// Pause a selected real transaction after its run read, or immediately before
// acquiring the period lock. Other fixture/service transactions keep running.
async function pausedTransaction(stage, operation, whilePaused) {
  const context = new AsyncLocalStorage(), original = db.$transaction.bind(db);
  let release, entered, intercepted = false;
  const gate = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { entered = resolve; });
  const timer = setTimeout(() => { entered(); release(); }, 12000);
  db.$transaction = (callback, options) => {
    if (!context.getStore()) return original(callback, options);
    return original(tx => callback(new Proxy(tx, { get(client, key) {
      if (stage === 'period' && key === '$queryRaw') return async (...args) => {
        if (!intercepted) { intercepted = true; entered(); await gate; }
        return client.$queryRaw(...args);
      };
      if (stage === 'run' && key === 'reconciliationRun') return new Proxy(client.reconciliationRun, { get(model, method) {
        if (method !== 'findFirst') return Reflect.get(model, method);
        return async args => { const value = await model.findFirst(args); if (!intercepted && args.include?.providerAccount) { intercepted = true; entered(); await gate; } return value; };
      } });
      return Reflect.get(client, key);
    } })), options);
  };
  const pending = context.run(true, () => operation()).then(value => ({ value }), error => ({ error: f.safe(error), name: error.name }));
  try { await started; assert.equal(intercepted, true, 'The intended real-transaction barrier must be reached'); await whilePaused(); release(); return await pending; }
  finally { release(); await pending; clearTimeout(timer); db.$transaction = original; }
}
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  for (const kind of (process.argv.includes('--remaining') ? ['period-closed'] : ['provider-suspended', 'provider-revision', 'period-closed'])) {
    const x = await fixture(kind); await add(x); const reviewed = await preview(x), input = command(x, reviewed.revision);
    if (kind === 'provider-suspended') await db.providerAccount.update({ where: { id: x.provider.id }, data: { status: 'SUSPENDED' } });
    if (kind === 'provider-revision') await db.providerAccount.update({ where: { id: x.provider.id }, data: { displayName: 'Owned changed reviewed provider' } });
    if (kind === 'period-closed') { const period = await periodFor(x); await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED' } }); }
    const before = await snapshot(x);
    await assert.rejects(() => recovery.incorporateAdditionalReconciliationSources(input, control(x)), kind === 'provider-revision' ? /sources changed/ : /active|closed|open/i);
    assert.equal(await snapshot(x), before);
    report.cases.push({ kind, deniedWithoutEffects: true }); console.log(JSON.stringify({ kind, passed: true }));
  }
  {
    const x = await fixture('period-lock-order'); await add(x); const input = command(x, (await preview(x)).revision);
    const period = await periodFor(x), before = await snapshot(x);
    const result = await pausedTransaction('period', () => recovery.incorporateAdditionalReconciliationSources(input, control(x)), async () => {
      await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED' } });
    });
    assert.ok(result.error, 'Recovery must not commit from a pre-close snapshot'); assert.equal(await snapshot(x), before);
    report.cases.push({ kind: 'period-closes-before-lock-after-run-read', result, deniedWithoutEffects: true }); console.log(JSON.stringify({ kind: 'period-lock-order', passed: true }));
  }
  for (const kind of ['signing', 'preparation']) {
    const x = await fixture('recovery-wins-' + kind);
    const ready = await preparation.previewReconciliationPreparation({ runId: x.run.runId }, control(x, x.maker.id)); assert.equal(ready.canPrepare, true);
    const input = command(x, ready.revision);
    const result = await pausedTransaction('run', () => kind === 'signing' ? sign(x) : preparation.prepareReconciliationRun(input, control(x, x.maker.id)), async () => {
      await add(x); await recovery.incorporateAdditionalReconciliationSources(command(x, (await preview(x)).revision), control(x));
    });
    assert.ok(result.error, 'An older ' + kind + ' transaction must not overwrite committed recovery'); await assertRecoveryOnly(x);
    const fresh = await preparation.previewReconciliationPreparation({ runId: x.run.runId }, control(x, x.maker.id)); assert.equal(fresh.canPrepare, true);
    report.cases.push({ kind: 'recovery-commits-before-earlier-' + kind, result, freshReviewAvailable: true, noStaleOrFinancialEffects: true }); console.log(JSON.stringify({ kind, passed: true }));
  }
  report.passed = true;
}
main().catch(error => { report.passed = false; report.error = f.safe(error); report.stack = String(error.stack).split('\n').slice(0, 5); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'recovery-races-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
