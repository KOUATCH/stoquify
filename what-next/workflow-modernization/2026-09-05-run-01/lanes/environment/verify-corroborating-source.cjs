const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert, helper } = f;
const recovery = require(path.join(f.root, 'services/reconciliation/reconciliation-additional-sources.service.ts'));
const preparation = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const certification = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const closure = require(path.join(f.root, 'services/reconciliation/payment-exception-closure.service.ts'));
const proof = require(path.join(f.root, 'services/reconciliation/payment-exception-closure-evidence.service.ts'));
const { importProviderStatement } = require(path.join(f.root, 'services/payments/statement-import.service.ts'));
const { captureProviderEvent } = require(path.join(f.root, 'services/payments/provider-event.service.ts'));
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.sign', 'payments.reconciliation.certificate.export', 'payments.reconciliation.exception.resolve', 'accounting.journal.read'];
const files = ['services/reconciliation/payment-corroborating-source-evidence.ts', 'services/reconciliation/payment-exception-closure.service.ts', 'services/reconciliation/payment-exception-closure-evidence.service.ts', 'services/reconciliation/payment-reconciliation-evidence.service.ts', 'services/reconciliation/reconciliation-additional-sources.service.ts', 'services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/payment-reconciliation-certification.service.ts'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const stamp = crypto.randomUUID(), report = { at: new Date().toISOString(), sourceBefore: hashes(), cases: [] };
const control = (x, actorId) => { const now = new Date(); return { organizationId: x.org.id, actorId, actorPermissions: permissions, now, lastAuthAt: now }; };
const snapshot = async x => f.hash(await Promise.all(['reconciliationRun', 'matchRecord', 'paymentException', 'suspenseItem', 'paymentReconciliationInboxItem', 'ledgerAuditEvent', 'journalEntry', 'businessEvent'].map(model => db[model].findMany({ where: { organizationId: x.org.id }, orderBy: { id: 'asc' } }))));
async function exercise(kind) {
  const x = await fixture('corroboration-' + kind);
  const payment = await db.paymentTransaction.findFirstOrThrow({ where: { organizationId: x.org.id } });
  const original = await db.matchRecord.findMany({ where: { organizationId: x.org.id } });
  if (kind === 'statement') {
    const imported = await importProviderStatement({ organizationId: x.org.id, providerAccountId: x.provider.id, adapter: x.adapter, importedById: x.maker.id,
      fileName: 'owned-corroborating-statement.json', rawContent: JSON.stringify([{ providerTransactionId: payment.providerTransactionId,
        providerReference: payment.providerReference, direction: 'CREDIT', amount: payment.amount.toFixed(2), currencyCode: payment.currencyCode,
        occurredAt: payment.occurredAt.toISOString() }]) });
    assert.equal(imported.status, 'IMPORTED');
  } else {
    const now = new Date(), rawBody = JSON.stringify({ eventId: 'late-' + stamp, transactionId: payment.providerTransactionId, reference: payment.providerReference,
      eventType: 'PAYMENT_CONFIRMED', direction: payment.direction, amount: payment.amount.toFixed(2), currency: payment.currencyCode, occurredAt: payment.occurredAt.toISOString() });
    const secret = crypto.randomBytes(32).toString('hex'), timestamp = String(now.getTime()), signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${x.adapter.canonicalPayload(rawBody)}`).digest('hex');
    await captureProviderEvent({ organizationId: x.org.id, providerAccountId: x.provider.id, adapter: x.adapter, rawBody, headers: { 'x-provider-timestamp': timestamp, 'x-provider-signature': signature }, secret, now, receivedAt: now });
  }
  const preview = await recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control(x, x.other.id));
  await recovery.incorporateAdditionalReconciliationSources({ runId: x.run.runId, expectedRevision: preview.revision,
    reason: 'Incorporate late corroborating evidence for investigation', idempotencyKey: crypto.randomUUID() }, control(x, x.other.id));
  const exception = await db.paymentException.findFirstOrThrow({ where: { organizationId: x.org.id } });
  assert.equal(exception.type, 'MANUAL_REVIEW_REQUIRED');
  assert.equal((await closure.listExceptionClosureCases({}, control(x, x.maker.id))).items[0].closurePath, 'SOURCE_REVIEW');
  const reviewed = await closure.previewExceptionClosure({ exceptionId: exception.id }, control(x, x.maker.id));
  assert.equal(reviewed.financialDecisionId, null); assert.equal(reviewed.sourceReview.matchId, original[0].id);
  const proposal = { exceptionId: exception.id, expectedRevision: reviewed.revision, reason: 'The late source corroborates the retained allocation', idempotencyKey: crypto.randomUUID() };
  const before = await snapshot(x);
  for (const bad of [{ ...control(x, x.maker.id), actorPermissions: [] }, { ...control(x, x.maker.id), lastAuthAt: new Date(0) }, { ...control(x, x.maker.id), organizationId: crypto.randomUUID() }])
    await assert.rejects(() => closure.proposeExceptionClosure(proposal, bad));
  assert.equal(await snapshot(x), before);
  const proposed = await closure.proposeExceptionClosure(proposal, control(x, x.maker.id));
  assert.equal((await closure.proposeExceptionClosure(proposal, control(x, x.maker.id))).replayed, true);
  const decision = { exceptionId: exception.id, proposalId: proposed.proposalId, expectedRevision: reviewed.revision, decision: 'APPROVE', reason: 'Independent source identity and full allocation verified' };
  await assert.rejects(() => closure.decideExceptionClosure(decision, control(x, x.maker.id)), /Another authorized/);
  await assert.rejects(() => closure.decideExceptionClosure(decision, control(x, x.other.id)), /independent reviewer/);
  await assert.rejects(() => closure.decideExceptionClosure({ ...decision, expectedRevision: 'sha256:' + '0'.repeat(64) }, control(x, x.signer.id)), /changed/);
  if (kind === 'statement') {
    const stable = await snapshot(x), originalTransaction = db.$transaction.bind(db);
    db.$transaction = (callback, options) => originalTransaction(tx => callback(new Proxy(tx, { get(client, key) {
      if (key !== 'ledgerAuditEvent') return Reflect.get(client, key);
      return new Proxy(client.ledgerAuditEvent, { get(model, method) { return method === 'create' ? async args => { if (args.data.action === 'EXCEPTION_CLOSURE_APPROVE') throw new Error('Controlled approval audit failure'); return model.create(args); } : Reflect.get(model, method); } });
    } })), options);
    try { await assert.rejects(() => closure.decideExceptionClosure(decision, control(x, x.signer.id)), /Controlled approval audit failure/); }
    finally { db.$transaction = originalTransaction; }
    assert.equal(await snapshot(x), stable);
  }
  const races = await Promise.allSettled([closure.decideExceptionClosure(decision, control(x, x.signer.id)), closure.decideExceptionClosure(decision, control(x, x.signer.id))]);
  assert.ok(races.some(row => row.status === 'fulfilled'), JSON.stringify(races.map(row => row.status === 'rejected' ? f.safe(row.reason) : row.value)));
  const decided = await closure.decideExceptionClosure(decision, control(x, x.signer.id)); assert.equal(decided.replayed, true);
  assert.equal(await db.ledgerAuditEvent.count({ where: { organizationId: x.org.id, action: 'EXCEPTION_CLOSURE_APPROVE' } }), 1);
  assert.equal((await db.suspenseItem.findUniqueOrThrow({ where: { id: exception.suspenseItemId } })).status, 'RESOLVED');
  const retained = await proof.exceptionClosureManifestEvidenceInTx(db, x.org.id, { id: exception.id, status: 'RESOLVED' });
  assert.equal(retained.sourceReview.matchId, original[0].id); assert.equal(retained.financialDecisionId, null);
  const prepare = await preparation.previewReconciliationPreparation({ runId: x.run.runId }, control(x, x.maker.id));
  assert.equal(prepare.canPrepare, true, JSON.stringify(prepare));
  await preparation.prepareReconciliationRun({ runId: x.run.runId, expectedRevision: prepare.revision, reason: 'Reviewed independent corroborating-source decision', idempotencyKey: crypto.randomUUID() }, control(x, x.maker.id));
  const sign = await certification.previewReconciliationSignOff({ organizationId: x.org.id, runId: x.run.runId, actorId: x.signer.id, actorPermissions: permissions });
  assert.equal(sign.canSign, true, JSON.stringify(sign));
  const signed = await certification.signReconciliationRun({ organizationId: x.org.id, runId: x.run.runId, signedById: x.signer.id, expectedSourceVersionHash: sign.expectedSourceVersionHash, expectedEvidenceRevision: sign.expectedEvidenceRevision, control: control(x, x.signer.id) });
  const exported = await certification.exportReconciliationCertificate({ organizationId: x.org.id, runId: x.run.runId, exportedById: x.signer.id, expectedCertificateHash: signed.certificateHash, idempotencyKey: crypto.randomUUID(), control: control(x, x.signer.id) });
  assert.equal(exported.certificateHash, signed.certificateHash);
  assert.equal((await closure.decideExceptionClosure(decision, control(x, x.signer.id))).replayed, true);
  assert.equal((await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.run.runId } })).status, 'SIGNED');
  assert.deepEqual(await db.matchRecord.findMany({ where: { organizationId: x.org.id } }), original);
  assert.equal(await db.paymentTransaction.count({ where: { organizationId: x.org.id } }), 1);
  assert.equal(await db.journalEntry.count({ where: { organizationId: x.org.id } }), 0);
  assert.equal((await closure.readExceptionClosureHistory({ exceptionId: exception.id }, control(x, x.signer.id))).total, 2);
  report.cases.push({ kind, organizationId: x.org.id, runId: x.run.runId, passed: true, noFinancialOrAllocationEffects: true, independentDecisionRequired: true, concurrentExactRetry: true, freshPrepareSignExport: true });
  console.log(JSON.stringify({ kind, passed: true }));
}
async function main() { await helper.withClient(f.target, helper.assertOwned); for (const kind of ['statement', 'event']) await exercise(kind); report.passed = true; }
main().catch(error => { report.passed = false; report.error = f.safe(error); report.stack = String(error.stack).split('\n').slice(0, 5); process.exitCode = 1; }).finally(async () => {
  report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  const output = path.join(__dirname, 'corroborating-source-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
