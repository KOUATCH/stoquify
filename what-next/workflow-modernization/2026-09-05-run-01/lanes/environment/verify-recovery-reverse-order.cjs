// Real PostgreSQL transactions. Barriers control scheduling only; no service
// query, return value, isolation level, or financial rule is replaced.
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
const control = (x, actorId = x.other.id) => { const now = new Date(); return { organizationId: x.org.id, actorId, actorPermissions: permissions, now, lastAuthAt: now }; };
const command = (x, revision) => ({ runId: x.run.runId, expectedRevision: revision, reason: 'Owned reverse transaction ordering review', idempotencyKey: crypto.randomUUID() });
const snapshot = async x => f.hash(await Promise.all(['reconciliationRun', 'matchRecord', 'paymentException', 'suspenseItem', 'paymentReconciliationInboxItem', 'ledgerAuditEvent', 'journalEntry', 'businessEvent'].map(model => db[model].findMany({ where: { organizationId: x.org.id }, orderBy: { id: 'asc' } }))));

async function exercise(kind) {
  const x = await fixture('reverse-order-' + kind);
  const ready = await preparation.previewReconciliationPreparation({ runId: x.run.runId }, control(x, x.maker.id));
  assert.equal(ready.canPrepare, true);
  const prepareInput = command(x, ready.revision);
  const context = new AsyncLocalStorage(), original = db.$transaction.bind(db), gates = [];
  db.$transaction = (callback, options) => {
    const gate = context.getStore();
    if (!gate) return original(callback, options);
    return original(tx => callback(new Proxy(tx, { get(client, key) {
      if (key === 'reconciliationRun') return new Proxy(client.reconciliationRun, { get(model, method) {
        if (method !== 'findFirst') return Reflect.get(model, method);
        return async args => {
          const value = await model.findFirst(args);
          if (!gate.intercepted && args.include?.providerAccount) { gate.intercepted = true; gate.enter(); await gate.hold; }
          return value;
        };
      } });
      return Reflect.get(client, key);
    } })), options);
  };
  function start(operation) {
    const gate = { intercepted: false };
    gate.hold = new Promise(resolve => { gate.release = resolve; });
    gate.entered = new Promise(resolve => { gate.enter = resolve; });
    gate.timer = setTimeout(() => { gate.timedOut = true; gate.enter(); gate.release(); }, 12000);
    gate.result = context.run(gate, operation).then(value => ({ value }), error => ({ error: f.safe(error), name: error.name }));
    gates.push(gate); return gate;
  }
  async function entered(gate) { await gate.entered; assert.equal(gate.timedOut, undefined); assert.equal(gate.intercepted, true); }
  try {
    const earlier = start(() => kind === 'signing'
      ? certification.signReconciliationRun({ organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id, expectedSourceVersionHash: x.review.expectedSourceVersionHash, expectedEvidenceRevision: x.review.expectedEvidenceRevision, control: control(x, x.signer.id) })
      : preparation.prepareReconciliationRun(prepareInput, control(x, x.maker.id)));
    await entered(earlier);
    // This source arrives after the earlier repeatable transaction snapshot.
    await add(x);
    const preview = await recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control(x));
    const input = command(x, preview.revision);
    const later = start(() => recovery.incorporateAdditionalReconciliationSources(input, control(x)));
    await entered(later);
    earlier.release();
    const winner = await earlier.result;
    assert.ok(winner.value, 'The earlier ' + kind + ' transaction must actually commit: ' + JSON.stringify(winner));
    const committed = await snapshot(x);
    later.release();
    const loser = await later.result;
    assert.ok(loser.error, 'Recovery based on the old run must not overwrite the committed ' + kind);
    assert.equal(await snapshot(x), committed);
    assert.equal(await db.matchRecord.count({ where: { organizationId: x.org.id } }), 1);
    assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_ADDITIONAL_SOURCES' } }), 0);
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
    if (kind === 'signing') {
      await assert.rejects(() => recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control(x)), /unsigned run/);
      assert.equal(await db.businessEvent.count({ where: { organizationId: x.org.id, eventType: 'payment.reconciliation.signed' } }), 1);
    } else {
      const fresh = await recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control(x));
      await recovery.incorporateAdditionalReconciliationSources(command(x, fresh.revision), control(x));
      assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } })).status, 'NEEDS_REVIEW');
      assert.equal(await db.matchRecord.count({ where: { organizationId: x.org.id } }), 2);
    }
    report.cases.push({ kind, committedBeforeRecovery: true, loser, loserHasNoEffects: true, freshRecovery: kind === 'preparation', retainedSignedEvidenceNotReopened: kind === 'signing' });
    console.log(JSON.stringify({ kind, passed: true }));
  } finally {
    for (const gate of gates) { gate.release(); clearTimeout(gate.timer); }
    await Promise.all(gates.map(gate => gate.result)); db.$transaction = original;
  }
}
async function main() { await helper.withClient(f.target, helper.assertOwned); for (const kind of ['signing', 'preparation']) await exercise(kind); report.passed = true; }
main().catch(error => { report.passed = false; report.error = f.safe(error); report.stack = String(error.stack).split('\n').slice(0, 5); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'recovery-reverse-order-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
