const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert, helper } = f;
const recovery = require(path.join(f.root, 'services/reconciliation/reconciliation-additional-sources.service.ts'));
const preparation = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const certification = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const { importProviderStatement } = require(path.join(f.root, 'services/payments/statement-import.service.ts'));
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.sign', 'payments.reconciliation.certificate.export', 'accounting.journal.read'];
const files = ['services/reconciliation/reconciliation-additional-sources.service.ts', 'services/reconciliation/payment-reconciliation-run.service.ts', 'services/reconciliation/payment-reconciliation-certification.service.ts', 'services/reconciliation/payment-reconciliation-evidence.service.ts', 'services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'services/payments/statement-import.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), sourceBefore: hashes(), checks: [] };
const control = (x, actorId = x.other.id) => { const now = new Date(); return { organizationId: x.org.id, actorId, actorPermissions: permissions, now, lastAuthAt: now }; };
async function addStatement(x) {
  const now = new Date(), reference = crypto.randomUUID();
  await db.paymentTransaction.create({ data: { organizationId: x.org.id, providerAccountId: x.provider.id, amount: '25.00', currencyCode: 'XAF', direction: 'INBOUND', state: 'CONFIRMED', occurredAt: now, confirmedAt: now, providerTransactionId: reference, providerReference: reference, sourceType: 'SYNTHETIC_WORKFLOW_VERIFICATION' } });
  const imported = await importProviderStatement({ organizationId: x.org.id, providerAccountId: x.provider.id, adapter: x.adapter, importedById: x.maker.id, fileName: 'owned-additional-statement.json', rawContent: JSON.stringify([{ providerTransactionId: reference, providerReference: reference, direction: 'CREDIT', amount: '25.00', currencyCode: 'XAF', occurredAt: now.toISOString() }]) });
  assert.equal(imported.status, 'IMPORTED'); return imported;
}
async function reviewedCommand(x) {
  const preview = await recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control(x));
  assert.deepEqual(preview.counts, { payments: 1, providerEvents: 0, statementLines: 1 });
  return { runId: x.run.runId, expectedRevision: preview.revision, reason: 'Review the additional imported statement evidence', idempotencyKey: crypto.randomUUID() };
}
const snapshot = async x => f.hash(await Promise.all(['reconciliationRun', 'matchRecord', 'paymentException', 'suspenseItem', 'paymentReconciliationInboxItem', 'ledgerAuditEvent', 'journalEntry', 'businessEvent'].map(model => db[model].findMany({ where: { organizationId: x.org.id }, orderBy: { id: 'asc' } }))));
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  if (!process.argv.includes('--drift-only')) {
    const x = await fixture('statement-recovery'), initial = await db.matchRecord.findMany({ where: { organizationId: x.org.id } });
    const imported = await addStatement(x), command = await reviewedCommand(x);
    await recovery.incorporateAdditionalReconciliationSources(command, control(x));
    const run = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } });
    assert.equal(run.status, 'NEEDS_REVIEW'); assert.equal(run.matchedAmount.toFixed(2), '125.25');
    assert.deepEqual(await db.matchRecord.findMany({ where: { id: { in: initial.map(row => row.id) } } }), initial);
    const line = await db.statementLine.findFirstOrThrow({ where: { statementFileId: imported.statementFileId } });
    assert.equal(await db.matchRecord.count({ where: { organizationId: x.org.id, statementLineId: line.id, status: 'AUTO_MATCHED' } }), 1);
    const prepare = await preparation.previewReconciliationPreparation({ runId: run.id }, control(x, x.maker.id)); assert.equal(prepare.canPrepare, true, JSON.stringify(prepare));
    await preparation.prepareReconciliationRun({ runId: run.id, expectedRevision: prepare.revision, reason: 'Reviewed retained event and imported statement', idempotencyKey: crypto.randomUUID() }, control(x, x.maker.id));
    const sign = await certification.previewReconciliationSignOff({ organizationId: x.org.id, runId: run.id, actorId: x.signer.id, actorPermissions: permissions }); assert.equal(sign.canSign, true);
    const signed = await certification.signReconciliationRun({ organizationId: x.org.id, runId: run.id, signedById: x.signer.id, expectedSourceVersionHash: sign.expectedSourceVersionHash, expectedEvidenceRevision: sign.expectedEvidenceRevision, control: control(x, x.signer.id) });
    const exported = await certification.exportReconciliationCertificate({ organizationId: x.org.id, runId: run.id, exportedById: x.signer.id, expectedCertificateHash: signed.certificateHash, idempotencyKey: crypto.randomUUID(), control: control(x, x.signer.id) });
    assert.equal(exported.certificateHash, signed.certificateHash); assert.equal(crypto.createHash('sha256').update(exported.content).digest('hex'), exported.sha256);
    assert.equal((await recovery.incorporateAdditionalReconciliationSources(command, control(x))).currentStatus, 'SIGNED');
    assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
    report.checks.push('Real statement import, exact added match with original retained, fresh preparation, independent signature, certificate export and old-request replay preserve signed state without journals.');
    console.log(JSON.stringify({ statementLifecycle: true }));
  }
  const x = await fixture('statement-file-immutable'), imported = await addStatement(x), command = await reviewedCommand(x);
  const sourceBefore = await db.statementFile.findUniqueOrThrow({ where: { id: imported.statementFileId } }), before = await snapshot(x);
  await assert.rejects(() => db.statementFile.update({ where: { id: imported.statementFileId }, data: { fileHash: crypto.createHash('sha256').update('Owned changed file evidence ' + stamp).digest('hex') } }), /Cannot modify immutable payment reconciliation evidence/);
  assert.deepEqual(await db.statementFile.findUniqueOrThrow({ where: { id: imported.statementFileId } }), sourceBefore);
  assert.equal(await snapshot(x), before);
  assert.equal((await recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control(x))).revision, command.expectedRevision);
  await recovery.incorporateAdditionalReconciliationSources(command, control(x));
  assert.equal(await db.matchRecord.count({ where: { organizationId: x.org.id } }), 2);
  assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
  report.checks.push('Database rejects parent statement-file hash mutation without changing source or reconciliation records; the unchanged reviewed revision remains valid and incorporates exactly one additional match.');
  report.passed = true;
}
module.exports = { addStatement };
if (require.main === module) main().catch(error => { report.passed = false; report.error = f.safe(error); report.stack = String(error.stack).split('\n').slice(0, 5); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'recovery-statement-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
