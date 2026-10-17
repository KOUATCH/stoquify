const { fixture: initialFixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, path, crypto, assert } = f;
const recovery = require(path.join(f.root, 'services/reconciliation/reconciliation-additional-sources.service.ts'));
const { importProviderStatement } = require(path.join(f.root, 'services/payments/statement-import.service.ts'));
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.exception.resolve', 'accounting.journal.read'];
function context(x) { const now = new Date(); return { organizationId: x.organizationId, actorId: x.makerId, actorPermissions: permissions, now, lastAuthAt: now }; }
async function fixture(label, organizations) {
  const x = await initialFixture(label); organizations.push(x.org.id);
  const payment = await db.paymentTransaction.findFirstOrThrow({ where: { organizationId: x.org.id } });
  const imported = await importProviderStatement({ organizationId: x.org.id, providerAccountId: x.provider.id, adapter: x.adapter, importedById: x.maker.id,
    fileName: 'owned-corroborating-browser-statement.json', rawContent: JSON.stringify([{ providerTransactionId: payment.providerTransactionId,
      providerReference: payment.providerReference, direction: 'CREDIT', amount: payment.amount.toFixed(2), currencyCode: payment.currencyCode, occurredAt: payment.occurredAt.toISOString() }]) });
  assert.equal(imported.status, 'IMPORTED');
  const control = context({ organizationId: x.org.id, makerId: x.other.id });
  const preview = await recovery.previewAdditionalReconciliationSources({ runId: x.run.runId }, control);
  await recovery.incorporateAdditionalReconciliationSources({ runId: x.run.runId, expectedRevision: preview.revision,
    reason: 'Imported later corroborating source for independent investigation', idempotencyKey: crypto.randomUUID() }, control);
  const exception = await db.paymentException.findFirstOrThrow({ where: { organizationId: x.org.id } });
  const matches = await db.matchRecord.findMany({ where: { organizationId: x.org.id } });
  return { organizationId: x.org.id, makerId: x.maker.id, exceptionId: exception.id, runId: x.run.runId, originalMatches: matches };
}
module.exports = { ...f, base: 'http://127.0.0.1:3110', local: f.helper, context, fixture };
