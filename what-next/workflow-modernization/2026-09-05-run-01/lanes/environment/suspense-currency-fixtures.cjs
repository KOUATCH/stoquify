const f = require('./invoice-approval-fixtures.cjs');
const { db, path, crypto } = f;
const workflow = require(path.join(f.root, 'services/reconciliation/payment-suspense-workflow.service.ts'));
const evidence = require(path.join(f.root, 'services/reconciliation/payment-suspense-evidence.ts'));
const now = new Date(), permissions = ['payments.reconciliation.read', 'payments.reconciliation.suspense.propose', 'payments.reconciliation.suspense.post', 'accounting.journal.reverse'];
async function fixture(name, organizations, { sourceCurrency = 'XAF', baseCurrency = 'XAF', missingSettings = false } = {}) {
  const x = await f.fixture(name, organizations);
  if (!missingSettings) await db.organizationAccountingSettings.upsert({ where: { organizationId: x.organizationId }, create: { organizationId: x.organizationId, baseCurrency }, update: { baseCurrency } });
  else await db.organizationAccountingSettings.deleteMany({ where: { organizationId: x.organizationId } });
  x.account = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'OWNED-471', nameEn: 'Synthetic suspense', type: 'ASSET', normalBalance: 'DEBIT' } });
  x.counter = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'OWNED-585', nameEn: 'Synthetic counterpart', type: 'LIABILITY', normalBalance: 'CREDIT' } });
  await db.journal.create({ data: { organizationId: x.organizationId, code: 'OWNED-SP', nameEn: 'Synthetic suspense', type: 'ADJUSTMENT', isDefault: true } });
  await db.postingRule.create({ data: { organizationId: x.organizationId, code: 'OWNED-SP', nameEn: 'Synthetic verification rule; no statutory approval', sourceType: 'PAYMENT_SUSPENSE', postingPurpose: 'SUSPENSE_RECLASSIFICATION', lines: { create: [
    { organizationId: x.organizationId, lineNumber: 1, side: 'DEBIT', accountId: x.account.id, amountSource: 'SOURCE_AMOUNT' },
    { organizationId: x.organizationId, lineNumber: 2, side: 'CREDIT', accountId: x.counter.id, amountSource: 'SOURCE_AMOUNT' },
  ] } } });
  x.item = await db.suspenseItem.create({ data: { organizationId: x.organizationId, suspenseLedgerAccountId: x.account.id, type: 'UNKNOWN_CREDIT', status: 'OPEN', amount: '100.25', currencyCode: sourceCurrency } });
  const item = await db.suspenseItem.findUniqueOrThrow({ where: { id: x.item.id }, include: { providerAccount: true, reconciliationRun: true } });
  x.proposal = await workflow.proposeSuspenseReclassification({ organizationId: x.organizationId, suspenseItemId: item.id, proposedById: x.actorId, targetType: 'UNKNOWN_CREDIT', reason: 'Owned currency verification proposal', suspenseLedgerAccountId: x.account.id, expectedEvidenceRevision: evidence.suspenseEvidenceRevision(item, now), idempotencyKey: crypto.randomUUID(), control: { actorPermissions: permissions, now, lastAuthAt: now } });
  x.command = { organizationId: x.organizationId, suspenseItemId: item.id, approvedById: x.checkerId, expectedEvidenceRevision: x.proposal.evidenceRevision, control: { actorPermissions: permissions, now, lastAuthAt: now } };
  return x;
}
module.exports = { ...f, workflow, evidence, now, permissions, fixture };
