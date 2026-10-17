const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert, helper } = f;
const recovery = require(path.join(f.root, 'services/reconciliation/reconciliation-additional-sources.service.ts'));
const preparation = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const closure = require(path.join(f.root, 'services/reconciliation/payment-exception-closure.service.ts'));
const { importProviderStatement } = require(path.join(f.root, 'services/payments/statement-import.service.ts'));
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.exception.resolve', 'accounting.journal.read'];
const files = ['services/reconciliation/reconciliation-additional-sources.service.ts', 'services/reconciliation/payment-reconciliation-run.service.ts', 'services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/payment-exception-closure.service.ts', 'services/reconciliation/payment-exception-closure-evidence.service.ts', 'services/payments/statement-import.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), sourceBefore: hashes() };
const control = x => { const now = new Date(); return { organizationId: x.org.id, actorId: x.other.id, actorPermissions: permissions, now, lastAuthAt: now }; };
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const x = await fixture('retained-statement-investigation');
  const payment = await db.paymentTransaction.findFirstOrThrow({ where: { organizationId: x.org.id } });
  const original = await db.matchRecord.findMany({ where: { organizationId: x.org.id } });
  // Actual later statement evidence corroborates the payment already matched to
  // its callback: same provider, transaction ID, reference, amount and currency.
  const imported = await importProviderStatement({ organizationId: x.org.id, providerAccountId: x.provider.id, adapter: x.adapter, importedById: x.maker.id,
    fileName: 'owned-retained-payment-statement.json', rawContent: JSON.stringify([{ providerTransactionId: payment.providerTransactionId,
      providerReference: payment.providerReference, direction: 'CREDIT', amount: payment.amount.toFixed(2), currencyCode: payment.currencyCode,
      occurredAt: payment.occurredAt.toISOString() }]) });
  assert.equal(imported.status, 'IMPORTED');
  const preview = await recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control(x));
  assert.deepEqual(preview.counts, { payments: 0, providerEvents: 0, statementLines: 1 });
  await recovery.incorporateAdditionalReconciliationSources({ runId: x.run.runId, expectedRevision: preview.revision,
    reason: 'Review later statement evidence for the existing allocation', idempotencyKey: stamp }, control(x));
  assert.deepEqual(await db.matchRecord.findMany({ where: { organizationId: x.org.id } }), original);
  const exception = await db.paymentException.findFirstOrThrow({ where: { organizationId: x.org.id } });
  assert.equal(exception.type, 'MANUAL_REVIEW_REQUIRED'); assert.equal(exception.evidence.rule, 'ADDITIONAL_EVIDENCE_FOR_RETAINED_SOURCE');
  assert.ok(exception.statementLineId); assert.ok(exception.suspenseItemId);
  const cases = await closure.listExceptionClosureCases({ view: 'OPEN' }, control(x));
  assert.equal(cases.items.find(row => row.id === exception.id).closurePath, 'INVESTIGATION_REQUIRED');
  await assert.rejects(() => closure.previewExceptionClosure({ exceptionId: exception.id }, control(x)), /source or security investigation/);
  const ready = await preparation.previewReconciliationPreparation({ runId: x.run.runId }, control(x));
  assert.equal(ready.canPrepare, false);
  assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
  assert.equal(await db.paymentTransaction.count({ where: { organizationId: x.org.id } }), 1);
  report.fixture = { organizationId: x.org.id, runId: x.run.runId, statementFileId: imported.statementFileId, exceptionId: exception.id };
  report.safetyChecksPassed = true;
  report.engineeringGapConfirmed = 'A genuine later statement matching an already allocated payment is routed to investigation; no implemented nonfinancial investigation decision can currently admit it to sign-off. Financial clearing correctly refuses this exception type.';
  report.preparation = ready;
  report.passed = true;
}
main().catch(error => { report.passed = false; report.error = f.safe(error); report.stack = String(error.stack).split('\n').slice(0, 5); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'retained-statement-investigation-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable, engineeringGapConfirmed: report.engineeringGapConfirmed }));
  await db.$disconnect(); process.exit(process.exitCode || 0);
});
