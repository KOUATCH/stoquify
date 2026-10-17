const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { PaymentExceptionType } = require('@prisma/client');
const service = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const files = ['services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/payment-reconciliation-evidence.service.ts', 'services/reconciliation/payment-exception-closure-evidence.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), sourceBefore: hashes(), cases: [], scope: 'Synthetic legacy-style final-status records without current retained independent decision evidence. No claims about actual customer legacy populations.' };
(async () => {
  await f.helper.withClient(f.target, f.helper.assertOwned);
  const x = await fixture('legacy-prepare-' + stamp), control = () => { const now = new Date(); return { organizationId: x.org.id, actorId: x.maker.id, actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.run', 'accounting.journal.read'], now, lastAuthAt: now }; };
  const before = await service.previewReconciliationPreparation({ runId: x.run.runId }, control()); assert.equal(before.canPrepare, true);
  const retained = await db.paymentException.create({ data: { organizationId: x.org.id, reconciliationRunId: x.run.runId, providerAccountId: x.provider.id, type: 'OTHER', status: 'RESOLVED', resolvedAt: new Date(), resolutionNotes: 'Owned legacy-style final label without decision proof' } });
  report.organizationId = x.org.id; report.runId = x.run.runId;
  for (const type of Object.values(PaymentExceptionType)) for (const status of ['RESOLVED', 'DISMISSED']) {
    await db.paymentException.update({ where: { id: retained.id }, data: { type, status } });
    const preview = await service.previewReconciliationPreparation({ runId: x.run.runId }, control());
    assert.equal(preview.canPrepare, false); assert.equal(preview.blocker, 'SOURCE_EVIDENCE_REVIEW_REQUIRED'); assert.equal(preview.revision, null);
    await assert.rejects(() => service.prepareReconciliationRun({ runId: x.run.runId, expectedRevision: before.revision, reason: 'Owned old revision with legacy final status', idempotencyKey: crypto.randomUUID() }, control()), error => ['CONFLICT', 'REVIEW_REQUIRED'].includes(error.code));
    report.cases.push({ type, status, blocker: preview.blocker, noPreparation: true });
  }
  assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId: x.org.id, idempotencyKey: { startsWith: 'reconciliation-run-preparation:' } } }), 0);
  assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'RECONCILIATION_RUN_PREPARE' } }), 0);
  assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
  report.passed = true;
})().catch(error => { report.passed = false; report.error = { code: error.code, message: f.safe(error) }; process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'preparation-legacy-evidence-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, error: report.error, cases: report.cases.length })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
