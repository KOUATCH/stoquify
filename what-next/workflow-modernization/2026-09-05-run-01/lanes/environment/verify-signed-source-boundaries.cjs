const { fixture } = require('./verify-signoff-request-order.cjs');
const { add } = require('./verify-additional-sources.cjs');
const { addStatement } = require('./verify-recovery-statement.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert, helper } = f;
const recovery = require(path.join(f.root, 'services/reconciliation/reconciliation-additional-sources.service.ts'));
const preparation = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const certification = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const files = ['services/accounting/close-assurance-pack.service.ts','services/reconciliation/payment-reconciliation-notifications.ts','services/reconciliation/reconciliation-additional-sources.service.ts', 'services/reconciliation/reconciliation-retained-signature.ts', 'services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'services/reconciliation/payment-reconciliation-certification.service.ts'];
const hashes = () => Object.fromEntries(files.filter(file => fs.existsSync(path.join(f.root, file))).map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const baseline = process.argv.includes('--baseline'), stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), baseline, sourcesBefore: hashes(), cases: [] };
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.sign', 'payments.reconciliation.certificate.export', 'accounting.journal.read'];
const control = (x, actor = x.other.id) => { const now = new Date(); return { organizationId: x.org.id, actorId: actor, actorPermissions: permissions, now, lastAuthAt: now }; };
const snapshot = async x => f.hash(await Promise.all(['closeRun', 'closeEvidenceItem', 'reconciliationRun', 'matchRecord', 'paymentException', 'suspenseItem', 'paymentReconciliationInboxItem', 'ledgerAuditEvent', 'journalEntry', 'businessEvent'].map(model => db[model].findMany({ where: { organizationId: x.org.id }, orderBy: { id: 'asc' } }))));
async function exercise(kind) {
  const x = await fixture('signed-arrival-' + kind), originalMatches = await db.matchRecord.findMany({ where: { organizationId: x.org.id } });
  const signed = await certification.signReconciliationRun({ organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id, expectedSourceVersionHash: x.review.expectedSourceVersionHash, expectedEvidenceRevision: x.review.expectedEvidenceRevision, control: control(x, x.signer.id) });
  if (kind === 'statement') await addStatement(x); else await add(x);
  const signedRun = await db.reconciliationRun.findUniqueOrThrow({where:{id:x.run.runId}});
  // Seed only an owned synthetic certified-state boundary, never a real certification.
  const close = await db.closeRun.create({data:{organizationId:x.org.id,periodId:signedRun.accountingPeriodId,status:'CERTIFIED',runById:x.maker.id,metadata:{synthetic:true,noLiveAuthority:true}}});
  const before = await snapshot(x);
  if (baseline) {
    await assert.rejects(() => recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control(x)), /unsigned run/);
    assert.equal(await snapshot(x), before); report.cases.push({ kind, organizationId: x.org.id, runId: x.run.runId, reproduced: 'Signed run cannot incorporate a genuine late source', noEffects: true }); return;
  }
  await db.reconciliationRun.update({where:{id:x.run.runId},data:{certificateHash:'f'.repeat(64)}});
  const tampered = await snapshot(x);
  await assert.rejects(()=>recovery.previewAdditionalReconciliationSources({runId:x.run.runId},control(x)),/retained reconciliation signature/);
  assert.equal(await snapshot(x),tampered);
  await db.reconciliationRun.update({where:{id:x.run.runId},data:{certificateHash:signed.certificateHash,updatedAt:signedRun.updatedAt}});
  const stalePreview=await recovery.previewAdditionalReconciliationSources({runId:x.run.runId},control(x));
  await db.providerAccount.update({where:{id:x.provider.id},data:{displayName:'Changed owned provider review'}});
  const providerChanged=await snapshot(x);
  await assert.rejects(()=>recovery.incorporateAdditionalReconciliationSources({runId:x.run.runId,expectedRevision:stalePreview.revision,reason:'Review changed provider before reopening',idempotencyKey:crypto.randomUUID()},control(x)),/sources changed/);
  assert.equal(await snapshot(x),providerChanged);
  await db.providerAccount.update({where:{id:x.provider.id},data:{displayName:x.provider.displayName,updatedAt:x.provider.updatedAt}});
  const preview = await recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control(x));
  assert.equal(preview.signedCertificate.hash, signed.certificateHash); assert.equal(preview.canIncorporate, true);
  assert.deepEqual(preview.counts, { payments: 1, providerEvents: kind === 'event' ? 1 : 0, statementLines: kind === 'statement' ? 1 : 0 });
  const command = { runId: x.run.runId, expectedRevision: preview.revision, reason: 'Incorporate later evidence and retain the original signed certificate', idempotencyKey: crypto.randomUUID() };
  for (const bad of [{ ...control(x), actorPermissions: [] }, { ...control(x), lastAuthAt: new Date(0) }, { ...control(x), organizationId: crypto.randomUUID() }]) await assert.rejects(() => recovery.incorporateAdditionalReconciliationSources(command, bad));
  await assert.rejects(() => recovery.incorporateAdditionalReconciliationSources({ ...command, expectedRevision: 'sha256:' + '0'.repeat(64) }, control(x)), /sources changed/);
  assert.equal(await snapshot(x), before);
  const originalTransaction = db.$transaction.bind(db);
  db.$transaction = (callback, options) => originalTransaction(tx => callback(new Proxy(tx, { get(client, key) {
    if (key !== 'ledgerAuditEvent') return Reflect.get(client, key);
    return new Proxy(client.ledgerAuditEvent, { get(model, method) { return method === 'create' ? async args => { if (args.data.action === 'RECONCILIATION_ADDITIONAL_SOURCES') throw new Error('Controlled signed-recovery audit failure'); return model.create(args); } : Reflect.get(model, method); } });
  } })), options);
  try { await assert.rejects(() => recovery.incorporateAdditionalReconciliationSources(command, control(x)), /Controlled signed-recovery audit failure/); }
  finally { db.$transaction = originalTransaction; }
  assert.equal(await snapshot(x), before);
  const races = await Promise.allSettled([recovery.incorporateAdditionalReconciliationSources(command, control(x)), recovery.incorporateAdditionalReconciliationSources(command, control(x))]);
  assert.ok(races.some(row => row.status === 'fulfilled'), JSON.stringify(races.map(row => row.status === 'rejected' ? f.safe(row.reason) : row.value)));
  const result = await recovery.incorporateAdditionalReconciliationSources(command, control(x)); assert.equal(result.replayed, true);
  const retained = await db.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { id: result.receiptId } });
  assert.equal(retained.payloadSummary.beforeRun.certificateHash, signed.certificateHash);
  assert.equal(certification.certificatePayloadHash(retained.payloadSummary.beforeRun.certificatePayload), signed.certificateHash);
  const run = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } }); assert.equal(run.status, 'NEEDS_REVIEW'); assert.equal(run.signedAt, null); assert.equal(run.certificateHash, null);
  assert.equal(run.totalInternalAmount.toFixed(2), '125.25'); assert.equal(run.totalExternalAmount.toFixed(2), '125.25'); assert.equal(run.matchedAmount.toFixed(2), '125.25');
  assert.deepEqual(await db.matchRecord.findMany({ where: { id: { in: originalMatches.map(row => row.id) } } }), originalMatches);
  assert.equal(await db.matchRecord.count({ where: { organizationId: x.org.id } }), 2); assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
  const invalidated=await db.closeRun.findUniqueOrThrow({where:{id:close.id}});
  assert.equal(invalidated.status,'BLOCKED');assert.equal(invalidated.metadata.staleState.sourceCode,'PAYMENT_RECONCILIATION_SOURCE_REPAIRED');assert.equal(invalidated.metadata.staleState.previousEvidenceHash,signed.certificateHash);
  assert.equal(await db.paymentReconciliationInboxItem.count({where:{organizationId:x.org.id,idempotencyKey:'payment-reconciliation.run.reopened:'+result.receiptId}}),1);
  const history = await preparation.readReconciliationPreparation({ kind: 'history', runId: x.run.runId }, control(x)); assert.equal(history.records[0].retainedCertificateHash, signed.certificateHash);
  const ready = await preparation.previewReconciliationPreparation({ runId: x.run.runId }, control(x, x.maker.id)); assert.equal(ready.canPrepare, true);
  await preparation.prepareReconciliationRun({ runId: x.run.runId, expectedRevision: ready.revision, reason: 'Review both original and later sources before new signature', idempotencyKey: crypto.randomUUID() }, control(x, x.maker.id));
  const self = await certification.previewReconciliationSignOff({ organizationId: x.org.id, runId: x.run.runId, actorId: x.other.id, actorPermissions: permissions }); assert.equal(self.canSign, false);
  const review = await certification.previewReconciliationSignOff({ organizationId: x.org.id, runId: x.run.runId, actorId: x.signer.id, actorPermissions: permissions }); assert.equal(review.canSign, true);
  const resigned = await certification.signReconciliationRun({ organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id, expectedSourceVersionHash: review.expectedSourceVersionHash, expectedEvidenceRevision: review.expectedEvidenceRevision, control: control(x, x.signer.id) }); assert.notEqual(resigned.certificateHash, signed.certificateHash);
  const exported = await certification.exportReconciliationCertificate({ organizationId: x.org.id, runId: x.run.runId, exportedById: x.signer.id, expectedCertificateHash: resigned.certificateHash, idempotencyKey: crypto.randomUUID(), control: control(x, x.signer.id) }); assert.equal(exported.certificateHash, resigned.certificateHash);
  assert.equal((await recovery.incorporateAdditionalReconciliationSources(command, control(x))).currentStatus, 'SIGNED');
  assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } })).certificateHash, resigned.certificateHash);
  assert.equal((await recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control(x))).canIncorporate, false);
  report.cases.push({ kind, organizationId: x.org.id, runId: x.run.runId, passed: true, retainedCertificateHash: signed.certificateHash, newCertificateHash: resigned.certificateHash, denialsRollbackConcurrencyRetry: true, originalMatchesUnchanged: true, noFinancialPosting: true, independentPrepareSignExport: true, corruptCertificateRefused: true, actualProviderDriftRefused: true, syntheticCertifiedCloseInvalidated: true, oneReopeningInboxObservation: true });
  console.log(JSON.stringify({ kind, passed: true }));
}
(async () => { await helper.withClient(f.target, helper.assertOwned); for (const kind of ['event', 'statement']) await exercise(kind); report.passed = true; })()
.catch(error => { report.passed = false; report.error = f.safe(error); report.stack = String(error.stack).split('\n').slice(0, 6); process.exitCode = 1; }).finally(async () => {
  report.sourcesAfter = hashes(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  const output = path.join(__dirname, 'signed-source-boundaries-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, baseline, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
