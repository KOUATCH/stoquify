const f = require('./exception-link-repair-fixtures.cjs'), { db, path, crypto } = f;
const link = require(path.join(f.root, 'services/reconciliation/payment-exception-link.service.ts'));
const workflow = require(path.join(f.root, 'services/reconciliation/payment-suspense-workflow.service.ts'));
const evidence = require(path.join(f.root, 'services/reconciliation/payment-suspense-evidence.ts'));
const resolution = require(path.join(f.root, 'services/reconciliation/payment-suspense-resolution.service.ts'));
const financialEvidence = require(path.join(f.root, 'services/reconciliation/payment-suspense-resolution-evidence.service.ts'));
const journals = require(path.join(f.root, 'services/accounting/journals.service.ts')), posting = require(path.join(f.root, 'services/accounting/posting.service.ts'));
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.exception.resolve', 'payments.reconciliation.suspense.propose', 'payments.reconciliation.suspense.post', 'accounting.journal.read', 'accounting.journal.create', 'accounting.journal.post', 'accounting.journal.reverse'];
const context = (x, actorId = x.actorId) => { const now = new Date(); return { organizationId: x.organizationId, actorId, actorPermissions: permissions, now, lastAuthAt: now }; };
async function fixture(name, organizations, options = {}) {
  const x = await f.fixture('closure-' + name, organizations, 1, options), itemId = x.exceptions[0].suspenseItem.id;
  // Retain the real original producer pair, repair the intentionally reproduced old defect, then use real posting/clearing services.
  const preview = await link.readReconciliationExceptionLink({ suspenseItemId: itemId }, context(x));
  await link.repairReconciliationExceptionLink({ suspenseItemId: itemId, expectedRevision: preview.revision, reason: 'Restore owned original pair before lifecycle verification', idempotencyKey: crypto.randomUUID() }, context(x));
  await db.organizationAccountingSettings.upsert({ where: { organizationId: x.organizationId }, create: { organizationId: x.organizationId, baseCurrency: 'XAF' }, update: { baseCurrency: 'XAF' } });
  const accountId = x.provider.suspenseLedgerAccountId;
  const counterpart = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'OWNED-CC', nameEn: 'Owned original counterpart', type: 'LIABILITY', normalBalance: 'CREDIT' } });
  const journal = await db.journal.create({ data: { organizationId: x.organizationId, code: 'OWNED-CL', nameEn: 'Owned closure verification', type: 'ADJUSTMENT', isDefault: true } });
  await db.postingRule.create({ data: { organizationId: x.organizationId, code: 'OWNED-CL', nameEn: 'Synthetic verification rule; no statutory approval', sourceType: 'PAYMENT_SUSPENSE', postingPurpose: 'SUSPENSE_RECLASSIFICATION', lines: { create: [
    { organizationId: x.organizationId, lineNumber: 1, side: 'DEBIT', accountId, amountSource: 'SOURCE_AMOUNT' },
    { organizationId: x.organizationId, lineNumber: 2, side: 'CREDIT', accountId: counterpart.id, amountSource: 'SOURCE_AMOUNT' },
  ] } } });
  const item = await db.suspenseItem.findUniqueOrThrow({ where: { id: itemId }, include: { providerAccount: true, reconciliationRun: true } }), control = context(x);
  const proposed = await workflow.proposeSuspenseReclassification({ organizationId: x.organizationId, suspenseItemId: item.id, proposedById: x.actorId, targetType: item.type,
    reason: 'Owned source posting review', suspenseLedgerAccountId: accountId, expectedEvidenceRevision: evidence.suspenseEvidenceRevision(item, control.now), idempotencyKey: crypto.randomUUID(), control });
  await workflow.approveSuspensePosting({ organizationId: x.organizationId, suspenseItemId: item.id, approvedById: x.checkerId, expectedEvidenceRevision: proposed.evidenceRevision, control: context(x, x.checkerId) });
  const destination = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'OWNED-CD', nameEn: 'Owned reviewed destination', type: 'LIABILITY', normalBalance: 'CREDIT' } });
  const clearing = await journals.createManualJournalEntry(x.organizationId, { journalId: journal.id, entryDate: new Date(), reference: 'Owned verified closure source ' + name, memo: 'Owned clearing before independent exception review', lines: [
    { accountId, debit: '0', credit: item.amount.toFixed(2), currency: 'XAF' }, { accountId: destination.id, debit: item.amount.toFixed(2), credit: '0', currency: 'XAF' },
  ] }, x.actorId);
  await posting.postJournalEntry(x.organizationId, clearing.id, x.checkerId, context(x, x.checkerId));
  const draft = { suspenseItemId: item.id, clearingJournalId: clearing.id, outcome: 'RESOLVED', reason: 'Owned independently reviewed financial treatment' };
  const financialPreview = await financialEvidence.previewSuspenseResolution(draft, context(x));
  const financialProposal = await resolution.proposeSuspenseResolution({ ...draft, expectedRevision: financialPreview.revision, idempotencyKey: crypto.randomUUID() }, context(x));
  const financialReview = await resolution.reviewSuspenseResolution(item.id, financialProposal.proposalId, context(x, x.checkerId));
  await resolution.decideSuspenseResolution({ suspenseItemId: item.id, proposalId: financialProposal.proposalId, expectedRevision: financialReview.revision, decision: 'APPROVE', reason: 'Owned independent treatment decision before exception review' }, context(x, x.checkerId));
  return { ...x, itemId: item.id, exceptionId: x.exceptions[0].id, clearingId: clearing.id };
}
module.exports = { ...f, fixture, context, permissions };
