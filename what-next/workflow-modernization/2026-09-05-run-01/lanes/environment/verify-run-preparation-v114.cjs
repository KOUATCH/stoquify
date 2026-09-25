const f = require('./exception-closure-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const preparation = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const closure = require(path.join(f.root, 'services/reconciliation/payment-exception-closure.service.ts'));
const certification = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const recovery = require(path.join(f.root, 'services/reconciliation/payment-suspense-resolution-recovery.service.ts'));
const run = crypto.randomUUID().slice(0, 12), organizations = [];
const files = ['services/reconciliation/reconciliation-run-preparation.service.ts', 'services/reconciliation/reconciliation-run-preparation-evidence.ts', 'services/reconciliation/reconciliation-run-preparation.contracts.ts', 'services/reconciliation/payment-reconciliation-certification.service.ts', 'actions/payments/reconciliation-preparation.actions.ts', 'services/reconciliation/payment-reconciliation-evidence.service.ts', 'services/reconciliation/payment-exception-closure.service.ts', 'services/reconciliation/payment-suspense-resolution-recovery.service.ts'];
const sources = () => Object.fromEntries(files.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, p))).digest('hex')]));
const tables = ['reconciliationRun', 'paymentException', 'suspenseItem', 'paymentReconciliationInboxItem', 'ledgerAuditEvent', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch'];
const snapshot = async where => f.hash(await Promise.all(tables.map(n => db[n].findMany({ where, orderBy: { id: 'asc' } }))));
const finance = async org => f.hash(await Promise.all(['journalEntry', 'journalEntryLine', 'ledgerPostingBatch'].map(n => db[n].findMany({ where: { organizationId: org }, orderBy: { id: 'asc' } }))));
const report = { at: new Date().toISOString(), run, sourcesBefore: sources(), checks: [], scope: 'Owned PostgreSQL, real original mismatch run, posting, clearing, exception closure, preparation, signing and source recovery. Synthetic provider precondition; no provider authentication, browser-session or professional approval claim.' };
async function close(x) {
  const p = await closure.previewExceptionClosure({ exceptionId: x.exceptionId }, f.context(x));
  const proposed = await closure.proposeExceptionClosure({ exceptionId: x.exceptionId, reason: 'Reviewed original mismatch and retained financial treatment', expectedRevision: p.revision, idempotencyKey: crypto.randomUUID() }, f.context(x));
  await closure.decideExceptionClosure({ exceptionId: x.exceptionId, proposalId: proposed.proposalId, expectedRevision: p.revision, decision: 'APPROVE', reason: 'Independent review of source mismatch and treatment' }, f.context(x, x.checkerId));
}
async function command(x) { const p = await preparation.previewReconciliationPreparation({ runId: x.runId }, f.context(x)); assert.equal(p.canPrepare, true, JSON.stringify(p)); return { runId: x.runId, reason: 'Reviewed source, setup and independently closed obligations', expectedRevision: p.revision, idempotencyKey: crypto.randomUUID() }; }
async function sign(x, actorId = x.checkerId) {
  const current = await db.$transaction(tx => certification.loadRunForCertification(tx, x.organizationId, x.runId));
  const c = f.context(x, actorId);
  return certification.signReconciliationRun({ organizationId: x.organizationId, runId: x.runId, signedById: actorId, expectedSourceVersionHash: certification.sourceVersionHashForRun(current), control: { ...c, actorPermissions: [...c.actorPermissions, 'payments.reconciliation.sign'] } });
}
(async () => {
  await f.local.withClient(f.target, f.local.assertOwned);
  report.originalBefore = await snapshot({ organizationId: { notIn: organizations } });
  const x = await f.fixture(run, organizations, { externalMismatch: true }); report.fixture = { organizationId: x.organizationId, runId: x.runId };
  assert.equal(x.exceptions[0].type, 'AMOUNT_MISMATCH');
  assert.equal((await preparation.previewReconciliationPreparation({ runId: x.runId }, f.context(x))).blocker, 'OPEN_EXCEPTIONS');
  await close(x);
  const beforeFinance = await finance(x.organizationId), input = await command(x);
  for (const c of [{ ...f.context(x), actorId: 'foreign' }, { ...f.context(x), organizationId: 'foreign' }, { ...f.context(x), actorPermissions: [] }, { ...f.context(x), lastAuthAt: new Date(0) }])
    await assert.rejects(() => preparation.prepareReconciliationRun(input, c));
  const originalTransaction = db.$transaction.bind(db), beforeFailure = await snapshot({ organizationId: x.organizationId });
  db.$transaction = (work, options) => originalTransaction(tx => work(new Proxy(tx, { get(target, property) {
    if (property === 'ledgerAuditEvent') return new Proxy(target.ledgerAuditEvent, { get(model, method) {
      if (method === 'create') return args => { if (args.data.action === 'RECONCILIATION_RUN_PREPARE') throw new Error('OWNED_PREPARATION_AUDIT_FAILURE'); return model.create(args); };
      return model[method];
    } }); return target[property];
  } })), options);
  try { await assert.rejects(() => preparation.prepareReconciliationRun(input, f.context(x)), /OWNED_PREPARATION_AUDIT_FAILURE/); } finally { db.$transaction = originalTransaction; }
  assert.equal(beforeFailure, await snapshot({ organizationId: x.organizationId })); report.checks.push('Actual unresolved obligation blocked; tenant/actor/permission/freshness denial and late-audit rollback leave no transition.');
  const results = await Promise.allSettled([preparation.prepareReconciliationRun(input, f.context(x)), preparation.prepareReconciliationRun(input, f.context(x))]);
  assert.ok(results.some(r => r.status === 'fulfilled')); for (const r of results) if (r.status === 'rejected') assert.equal(r.reason.code, 'CONFLICT');
  const prepared = await preparation.prepareReconciliationRun(input, f.context(x)); assert.equal(prepared.replayed, true);
  assert.equal(await db.paymentReconciliationInboxItem.count({ where: { organizationId: x.organizationId, idempotencyKey: 'reconciliation-run-preparation:' + input.idempotencyKey } }), 1);
  assert.equal(beforeFinance, await finance(x.organizationId)); report.checks.push('Concurrent preparation and exact retry retain one receipt and leave financial records unchanged.');
  await assert.rejects(() => sign(x, x.actorId));
  const provider = await db.providerAccount.findUniqueOrThrow({ where: { id: x.provider.id } });
  await db.providerAccount.update({ where: { id: provider.id }, data: { displayName: provider.displayName + ' revised' } });
  await assert.rejects(() => sign(x), /changed after preparation/);
  await preparation.prepareReconciliationRun(await command(x), f.context(x));
  const signed = await sign(x); assert.equal(signed.outcome, 'SIGNED');
  const exportControl = f.context(x, x.checkerId);
  const exported = await certification.exportReconciliationCertificate({ organizationId: x.organizationId, runId: x.runId, exportedById: x.checkerId,
    expectedCertificateHash: signed.certificateHash, idempotencyKey: crypto.randomUUID(), control: { ...exportControl, actorPermissions: [...exportControl.actorPermissions, 'payments.reconciliation.certificate.export'] } });
  assert.equal(exported.certificateHash, signed.certificateHash);
  assert.equal(crypto.createHash('sha256').update(exported.content).digest('hex'), exported.sha256);
  assert.equal((await preparation.prepareReconciliationRun(input, f.context(x))).currentStatus, 'SIGNED');
  report.checks.push('Maker refusal, changed setup refusal, explicit re-preparation, actual independent sign and certificate export; old preparation replay does not change signed status.');
  const reviewer = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned recovery reviewer', email: crypto.randomUUID() + '@example.invalid', isActive: true, isVerified: true, emailVerified: true } });
  const draft = { suspenseItemId: x.itemId, reversalDate: new Date().toISOString().slice(0, 10), reason: 'Owned reversal after genuine signed reconciliation' };
  const rp = await recovery.previewSuspenseResolutionRecovery(draft, f.context(x));
  const proposed = await recovery.proposeSuspenseResolutionRecovery({ ...draft, expectedRevision: rp.revision, idempotencyKey: crypto.randomUUID() }, f.context(x));
  const review = await recovery.reviewSuspenseResolutionRecovery(x.itemId, proposed.proposalId, f.context(x, reviewer.id));
  await recovery.decideSuspenseResolutionRecovery({ suspenseItemId: x.itemId, proposalId: proposed.proposalId, expectedRevision: review.revision, decision: 'APPROVE', reason: 'Independent owned source recovery decision' }, f.context(x, reviewer.id));
  const reopened = await db.reconciliationRun.findUniqueOrThrow({ where: { id: x.runId } });
  assert.equal(reopened.status, 'NEEDS_REVIEW'); assert.equal(reopened.certificateHash, null);
  assert.equal((await db.paymentException.findUniqueOrThrow({ where: { id: x.exceptionId } })).status, 'REOPENED');
  assert.equal((await preparation.prepareReconciliationRun(input, f.context(x))).currentStatus, 'NEEDS_REVIEW');
  assert.equal((await preparation.previewReconciliationPreparation({ runId: x.runId }, f.context(x))).canPrepare, false);
  assert.ok(await db.paymentReconciliationInboxItem.findUnique({ where: { id: prepared.receiptId } }));
  report.checks.push('Actual clearing reversal reopens the signed run and exception, invalidates the current certificate, retains preparation history and prevents obsolete replay from restoring readiness.');
  const missing = await f.fixture('missing-' + run, organizations); await close(missing);
  assert.equal((await preparation.previewReconciliationPreparation({ runId: missing.runId }, f.context(missing))).blocker, 'EXTERNAL_EVIDENCE_REQUIRED');
  report.checks.push('Completed financial treatment and exception closure alone do not clear the missing external evidence prerequisite.');
})().catch(error => { report.error = f.safe(error); report.stack = String(error.stack).split('\n').slice(0, 6); }).finally(async () => {
  report.originalUnchanged = report.originalBefore === await snapshot({ organizationId: { notIn: organizations } }); report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  await db.$disconnect(); const file = 'run-preparation-v114-' + run + '.json';
  console.log(JSON.stringify({ file, checks: report.checks, error: report.error, stack: report.stack, originalUnchanged: report.originalUnchanged, sourceStable: report.sourceStable }));
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  process.exit(!report.error && report.checks.length === 5 && report.originalUnchanged && report.sourceStable ? 0 : 1);
});
