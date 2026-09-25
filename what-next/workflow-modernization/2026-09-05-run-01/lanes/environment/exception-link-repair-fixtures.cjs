const f = require('./invoice-approval-fixtures.cjs'), { db, path, crypto } = f;
const { runPaymentReconciliation } = require(path.join(f.root, 'services/reconciliation/payment-reconciliation-run.service.ts'));
async function fixture(name, organizations, count = 1, { externalMismatch = false } = {}) {
  const x = await f.fixture('link-repair-' + name, organizations), now = new Date();
  await db.organization.update({ where: { id: x.organizationId }, data: { requestedModules: ['purchasing', 'finance', 'accounting', 'payment_reconciliation'] } });
  const bank = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'LINK-512', nameEn: 'Owned bank mapping', type: 'ASSET', normalBalance: 'DEBIT' } });
  const account = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'LINK-471', nameEn: 'Owned suspense mapping', type: 'ASSET', normalBalance: 'DEBIT' } });
  const rail = await db.paymentRail.create({ data: { organizationId: x.organizationId, code: 'LINK', name: 'Owned synthetic rail', type: 'MOBILE_MONEY' } });
  const provider = await db.providerAccount.create({ data: { organizationId: x.organizationId, paymentRailId: rail.id, providerCode: 'OWNED', displayName: 'Owned source repair', status: 'ACTIVE', externalAccountHash: crypto.randomUUID(), currencyCode: 'XAF', settlementLedgerAccountId: bank.id, suspenseLedgerAccountId: account.id } });
  await db.settlementAccount.create({ data: { organizationId: x.organizationId, providerAccountId: provider.id, ledgerAccountId: bank.id, approvalStatus: 'APPROVED', effectiveFrom: new Date(0), metadata: { synthetic: true, notAnApproval: true } } });
  for (let i = 0; i < count; i++) await db.paymentTransaction.create({ data: { organizationId: x.organizationId, providerAccountId: provider.id, amount: String(100 + i) + '.25', currencyCode: 'XAF', direction: 'INBOUND', state: 'CONFIRMED', occurredAt: now, confirmedAt: now, providerReference: 'owned-missing-' + name + '-' + i, sourceType: 'OWNED_SYNTHETIC_PRECONDITION', metadata: { synthetic: true } } });
  // Optional synthetic external precondition exists BEFORE the real run; this does not test provider authentication.
  if (externalMismatch) for (let i = 0; i < count; i++) {
    const rawPayload = { synthetic: true, purpose: 'Owned initial amount mismatch; not provider authentication evidence', amount: String(99 + i) + '.25' };
    await db.providerEvent.create({ data: { organizationId: x.organizationId, providerAccountId: provider.id, providerEventId: crypto.randomUUID(),
      providerReference: 'owned-missing-' + name + '-' + i, eventType: 'OWNED_SYNTHETIC', status: 'VERIFIED', direction: 'INBOUND',
      amount: rawPayload.amount, currencyCode: 'XAF', occurredAt: now, receivedAt: now, signatureValid: true,
      rawPayload, rawPayloadHash: crypto.createHash('sha256').update(JSON.stringify(rawPayload)).digest('hex') } });
  }
  const run = await runPaymentReconciliation({ organizationId: x.organizationId, providerAccountId: provider.id, businessDate: now, runById: x.actorId, correlationId: 'owned-repair-' + name });
  const exceptions = await db.paymentException.findMany({ where: { organizationId: x.organizationId, reconciliationRunId: run.runId }, include: { suspenseItem: true }, orderBy: { id: 'asc' } });
  // Reproduce the old producer defect only in newly owned synthetic rows.
  await db.paymentException.updateMany({ where: { organizationId: x.organizationId, reconciliationRunId: run.runId }, data: { suspenseItemId: null } });
  return { ...x, runId: run.runId, provider, exceptions, control: { organizationId: x.organizationId, actorId: x.actorId, actorPermissions: ['payments.reconciliation.read', 'payments.reconciliation.run'], lastAuthAt: new Date() } };
}
module.exports = { ...f, fixture };
