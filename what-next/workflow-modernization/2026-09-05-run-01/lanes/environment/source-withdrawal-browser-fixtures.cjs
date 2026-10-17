const f = require('./corroborating-browser-fixtures.cjs'), { db, path, crypto, assert } = f;
const closure = require(path.join(f.root, 'services/reconciliation/payment-exception-closure.service.ts'));
const preparation = require(path.join(f.root, 'services/reconciliation/reconciliation-run-preparation.service.ts'));
const certification = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.sign', 'payments.reconciliation.exception.resolve', 'accounting.journal.read'];
async function fixture(label, organizations) {
  const x = await f.fixture(label, organizations);
  const approver = await db.user.create({ data: { organizationId: x.organizationId, name: 'Owned earlier source approver', email: crypto.randomUUID() + '@example.invalid', isActive: true } });
  const control = actorId => { const now = new Date(); return { organizationId: x.organizationId, actorId, actorPermissions: permissions, now, lastAuthAt: now }; };
  const preview = await closure.previewExceptionClosure({ exceptionId: x.exceptionId }, control(x.makerId));
  const proposed = await closure.proposeExceptionClosure({ exceptionId: x.exceptionId, expectedRevision: preview.revision, reason: 'Original corroborating source interpretation', idempotencyKey: crypto.randomUUID() }, control(x.makerId));
  await closure.decideExceptionClosure({ exceptionId: x.exceptionId, proposalId: proposed.proposalId, expectedRevision: preview.revision, decision: 'APPROVE', reason: 'Independent original source interpretation' }, control(approver.id));
  const ready = await preparation.previewReconciliationPreparation({ runId: x.runId }, control(x.makerId)); assert.equal(ready.canPrepare, true);
  await preparation.prepareReconciliationRun({ runId: x.runId, expectedRevision: ready.revision, reason: 'Prepare original approved investigation', idempotencyKey: crypto.randomUUID() }, control(x.makerId));
  const sign = await certification.previewReconciliationSignOff({ organizationId: x.organizationId, runId: x.runId, actorId: approver.id, actorPermissions: permissions }); assert.equal(sign.canSign, true);
  const signed = await certification.signReconciliationRun({ organizationId: x.organizationId, runId: x.runId, signedById: approver.id, expectedSourceVersionHash: sign.expectedSourceVersionHash, expectedEvidenceRevision: sign.expectedEvidenceRevision, control: control(approver.id) });
  return { ...x, priorCertificateHash: signed.certificateHash };
}
module.exports = { ...f, fixture };
