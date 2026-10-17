"use strict";
const p = require('./purchase-close-recovery-fixtures.cjs'), payments = require('./purchase-close-payment-prerequisites.cjs');
const { f, db, root, organizations } = p, { fs, path, crypto, assert } = f;
const certification = require(path.join(root, 'services/reconciliation/payment-reconciliation-certification.service.ts'));
const reconciliation = require(path.join(root, 'services/reconciliation/payment-reconciliation-run.service.ts'));
const { captureProviderEvent } = require(path.join(root, 'services/payments/provider-event.service.ts'));
const { MobileMoneyHmacAdapter } = require(path.join(root, 'services/payments/adapters/mobile-money-hmac.adapter.ts'));
const permissions = ['payments.reconciliation.read', 'payments.reconciliation.run', 'payments.reconciliation.sign'];
const extraModels = ['paymentRail', 'providerAccount', 'settlementAccount', 'paymentTransaction', 'providerEvent', 'reconciliationRun', 'matchRecord', 'paymentException', 'suspenseItem'];
const files = [__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file))];
const sources = () => ({ ...p.sources(), ...payments.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), p.sha(fs.readFileSync(file))])) });
async function extraRows(org) { const result = {}; for (const model of extraModels) result[model] = await db[model].findMany({ where: { organizationId: org }, orderBy: { id: 'asc' } }); return result; }
async function outside() { return { core: await p.outside(), extra: f.hash(await extraRows({ notIn: organizations })), payment: await payments.outside() }; }
async function fixture(label) {
  const x = await p.fixture('sg-' + label, false); await payments.settlePayable(x, 'sign-prerequisite');
  const existingBank = await db.chartOfAccount.findFirst({ where: { organizationId: x.organizationId, mappingKey: 'BANK' } });
  const bank = existingBank ?? await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'OWNED-SIGN-BANK', nameEn: 'Synthetic sign settlement', type: 'ASSET', normalBalance: 'DEBIT' } });
  const suspense = await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: 'OWNED-SIGN-SUSPENSE', nameEn: 'Synthetic sign suspense', type: 'ASSET', normalBalance: 'DEBIT' } });
  const rail = await db.paymentRail.create({ data: { organizationId: x.organizationId, type: 'MOBILE_MONEY', code: 'OWNED-SIGN', name: 'Synthetic sign rail' } });
  const adapter = new MobileMoneyHmacAdapter('OWNED-SIGN'), reference = crypto.randomUUID(), now = new Date();
  const provider = await db.providerAccount.create({ data: { organizationId: x.organizationId, paymentRailId: rail.id, providerCode: adapter.providerCode, displayName: 'Synthetic sign publication', externalAccountHash: f.hash(reference), status: 'ACTIVE', currencyCode: 'XAF', settlementLedgerAccountId: bank.id, suspenseLedgerAccountId: suspense.id } });
  await db.settlementAccount.create({ data: { organizationId: x.organizationId, providerAccountId: provider.id, ledgerAccountId: bank.id, approvalStatus: 'APPROVED', requestedById: x.actorId, approvedById: x.certifierId, approvedAt: now, effectiveFrom: new Date('2026-01-01'), metadata: { synthetic: true, noLiveAuthority: true } } });
  await db.paymentTransaction.create({ data: { organizationId: x.organizationId, providerAccountId: provider.id, amount: '100.25', currencyCode: 'XAF', direction: 'INBOUND', state: 'CONFIRMED', occurredAt: now, confirmedAt: now, providerTransactionId: reference, providerReference: reference, sourceType: 'SYNTHETIC_WORKFLOW_VERIFICATION' } });
  const rawBody = JSON.stringify({ eventId: 'event-' + reference, transactionId: reference, reference, eventType: 'PAYMENT_CONFIRMED', direction: 'INBOUND', amount: '100.25', currency: 'XAF', occurredAt: now.toISOString() });
  const secret = crypto.randomBytes(32).toString('hex'), timestamp = String(now.getTime()), signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest('hex');
  await captureProviderEvent({ organizationId: x.organizationId, providerAccountId: provider.id, adapter, rawBody, headers: { 'x-provider-timestamp': timestamp, 'x-provider-signature': signature }, secret, now, receivedAt: now });
  const run = await reconciliation.runPaymentReconciliation({ organizationId: x.organizationId, providerAccountId: provider.id, businessDate: now, runById: x.actorId });
  assert.equal(run.status, 'READY_FOR_SIGNOFF'); assert.equal(run.matchCount, 1);
  await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_SIGNER', nameEn: 'Synthetic independent signer', permissions, users: { connect: { id: x.certifierId } } } });
  const review = await certification.previewReconciliationSignOff({ organizationId: x.organizationId, runId: run.runId, actorId: x.certifierId, actorPermissions: permissions }); assert.equal(review.canSign, true);
  return { ...x, reconciliationRunId: run.runId, review };
}
function command(x) { const now = new Date(); return { organizationId: x.organizationId, runId: x.reconciliationRunId, signedById: x.certifierId, expectedSourceVersionHash: x.review.expectedSourceVersionHash, expectedEvidenceRevision: x.review.expectedEvidenceRevision, control: { actorPermissions: permissions, now, lastAuthAt: now } }; }
module.exports = { p, f, db, root, organizations, certification, fixture, command, sources, extraRows, outside };
