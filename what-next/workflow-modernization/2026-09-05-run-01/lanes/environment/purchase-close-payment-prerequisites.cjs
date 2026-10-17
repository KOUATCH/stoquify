"use strict";
// Inert helper: real source services on the caller's newly owned fixture only.
const p = require('./purchase-close-recovery-fixtures.cjs'), { db, f, root, organizations, Prisma } = p, { fs, path, crypto, assert } = f;
const requests = require(path.join(root, 'services/purchasing/payment-request.service.ts')), execution = require(path.join(root, 'services/purchasing/payment-release.service.ts')), handoff = require(path.join(root, 'services/purchasing/payment-reconciliation-service.ts'));
const { readCurrentPaymentReconciliationEvidenceInTx } = require(path.join(root, 'services/purchasing/payment-reconciliation-evidence.ts'));
const { hashPassword } = require(path.join(root, 'lib/password.ts')), { stepUpSessionWithPassword } = require(path.join(root, 'services/security/step-up-auth.service.ts'));
const files = [__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file))];
const sources = () => Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), p.sha(fs.readFileSync(file))]));
const evidenceModels = ['supplierBankAccount', 'paymentTransaction', 'paymentException', 'matchRecord', 'suspenseItem'];
const scopeOf = ({ actorId, organizationId, sessionId, sessionToken }) => ({ actorId, organizationId, sessionId, sessionToken });
async function evidenceRows(x) { const result = {}; for (const model of evidenceModels) result[model] = await db[model].findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }); return result; }
async function outside() { const result = {}; for (const model of evidenceModels) { const rows = await db[model].findMany({ where: { organizationId: { notIn: organizations } }, orderBy: { id: 'asc' } }); result[model] = { count: rows.length, hash: f.hash(rows) }; } return f.hash(result); }
function document(x, kind, contents) {
  const file = path.join(__dirname, 'owned-purchase-close-' + kind + '-' + crypto.randomUUID() + '.json');
  fs.writeFileSync(file, JSON.stringify({ syntheticOnly: true, externalPayment: false, organizationId: x.organizationId, ...contents }, null, 2) + '\n', { flag: 'wx' });
  return { file, uri: 'https://example.invalid/owned-purchase-close/' + path.basename(file), hash: p.sha(fs.readFileSync(file)) };
}
async function establishActors(x) {
  await p.guard(); assert.ok(organizations.includes(x.organizationId));
  await db.role.create({ data: { organizationId: x.organizationId, code: 'PC_REQUEST', nameEn: 'Owned payment request', permissions: ['purchasing.ap.payment.request'], users: { connect: { id: x.actorId } } } });
  await db.role.create({ data: { organizationId: x.organizationId, code: 'PC_APPROVE', nameEn: 'Owned independent payment approval', permissions: ['purchasing.ap.payment.approve'], users: { connect: { id: x.checkerId } } } });
  const scopes = [];
  for (const [label, permissions] of [['recorder', ['purchasing.ap.payment.release']], ['proposer', ['payments.reconciliation.read', 'accounting.journal.read', 'payments.reconciliation.exception.resolve', 'payments.reconciliation.sign']], ['reviewer', ['payments.reconciliation.read', 'accounting.journal.read', 'payments.reconciliation.exception.resolve', 'payments.reconciliation.sign']]]) {
    const password = 'Owned-purchase-' + crypto.randomUUID() + '!', hashed = await hashPassword(password), token = crypto.randomBytes(32).toString('hex');
    const user = await db.user.create({ data: { organizationId: x.organizationId, name: 'Synthetic payment ' + label, email: crypto.randomUUID() + '@example.invalid', isActive: true, isVerified: true, emailVerified: true, password: hashed } });
    await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: hashed } });
    await db.role.create({ data: { organizationId: x.organizationId, code: 'PC_' + label.toUpperCase(), nameEn: 'Synthetic payment ' + label, permissions, users: { connect: { id: user.id } } } });
    const session = await db.session.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3600000) } });
    const renew = async () => { const result = await stepUpSessionWithPassword({ userId: user.id, organizationId: x.organizationId, sessionId: session.id, sessionToken: token, password }); assert.equal(result.status, 'verified'); };
    await renew(); scopes.push({ actorId: user.id, organizationId: x.organizationId, sessionId: session.id, sessionToken: token, renew });
  }
  const bank = await db.supplierBankAccount.create({ data: { organizationId: x.organizationId, supplierId: x.supplierId, status: 'APPROVED', bankName: 'Owned synthetic prerequisite; no external account', accountNumberMasked: '****0000', approvedById: x.checkerId, approvedAt: new Date() } });
  assert.equal(new Set([x.actorId, x.checkerId, ...scopes.map(row => row.actorId)]).size, 5);
  return { bankId: bank.id, recorder: scopes[0], proposer: scopes[1], reviewer: scopes[2] };
}
async function settlePayable(x, label) {
  assert.ok(organizations.includes(x.organizationId), 'Only the newly owned fixture may be settled'); const amount = new Prisma.Decimal(await p.payable(x));
  assert.ok(amount.gte(0)); if (amount.isZero()) return { required: false, payable: '0' };
  if (!x.paymentAuthority) x.paymentAuthority = await establishActors(x); const a = x.paymentAuthority;
  const beforeInvoice = await db.supplierInvoice.findUniqueOrThrow({ where: { id: x.invoiceId } }), beforeStock = f.hash({ levels: await db.inventoryLevel.findMany({ where: { item: { organizationId: x.organizationId } }, orderBy: { id: 'asc' } }), movements: await db.inventoryTransaction.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }) });
  const requestDoc = document(x, 'request', { label, invoiceId: x.invoiceId, amount: amount.toString(), currency: x.currency });
  const draft = { supplierId: x.supplierId, bankAccountId: a.bankId, method: 'CASH', paymentDate: new Date().toISOString().slice(0, 10), documentReference: requestDoc.uri, documentSha256: requestDoc.hash, allocations: [{ supplierInvoiceId: x.invoiceId, amount: amount.toFixed(2) }] };
  const preview = await requests.previewPaymentRequest(draft, x.makerScope); assert.equal(preview.total, amount.toFixed(2));
  const submitted = await requests.submitPaymentRequest({ draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope), approval = await requests.reviewPaymentRequestApproval(submitted.paymentRequestId, x.scope);
  assert.equal((await requests.confirmPaymentRequestApproval({ paymentRequestId: submitted.paymentRequestId, expectedRevision: approval.revision, idempotencyKey: crypto.randomUUID() }, x.scope)).status, 'APPROVED');
  const executedAt = new Date().toISOString(), executionReference = 'OWNED-PC/' + crypto.randomUUID(), executionDoc = document(x, 'execution', { paymentId: submitted.paymentRequestId, amount: amount.toString(), currency: x.currency, executedAt, executionReference });
  await a.recorder.renew(); const releaseDraft = { paymentRequestId: submitted.paymentRequestId, executionReference, executedAt, evidenceUri: executionDoc.uri, evidenceSha256: executionDoc.hash }, release = await execution.previewPaymentRelease(releaseDraft, scopeOf(a.recorder));
  const releaseCommand = { draft: releaseDraft, expectedRevision: release.revision, idempotencyKey: crypto.randomUUID() }, paid = await execution.confirmPaymentRelease(releaseCommand, scopeOf(a.recorder)); assert.equal(paid.ledgerStatus, 'POSTED'); assert.equal(await p.payable(x), '0');
  const invoice = await db.supplierInvoice.findUniqueOrThrow({ where: { id: x.invoiceId } }); assert.equal(invoice.amountPaid.toString(), beforeInvoice.amountPaid.plus(amount).toString()); assert.equal(invoice.status, 'PAID');
  const acknowledgedAt = new Date().toISOString(), voucherReference = 'OWNED-PC-RECEIPT/' + crypto.randomUUID(), voucher = document(x, 'acknowledgment', { paymentId: submitted.paymentRequestId, amount: amount.toString(), currency: x.currency, voucherReference, acknowledgedAt, acknowledgment: 'RECIPIENT_ACKNOWLEDGED' }); assert.notEqual(voucher.hash, executionDoc.hash);
  const evidenceDraft = { paymentRequestId: submitted.paymentRequestId, evidence: { kind: 'CASH_VOUCHER', voucherReference, evidenceUri: voucher.uri, evidenceSha256: voucher.hash, recipientName: 'Synthetic retained supplier recipient', acknowledgedAt, purpose: 'Owned local recipient acknowledgment review only, not external settlement or professional approval.', acknowledgment: 'RECIPIENT_ACKNOWLEDGED' } };
  await a.proposer.renew(); const evidencePreview = await handoff.previewPaymentReconciliation(evidenceDraft, scopeOf(a.proposer)), proposed = await handoff.proposePaymentReconciliation({ draft: evidenceDraft, expectedRevision: evidencePreview.revision, idempotencyKey: crypto.randomUUID() }, scopeOf(a.proposer));
  await a.reviewer.renew(); const decisionPreview = await handoff.reviewPaymentReconciliation(submitted.paymentRequestId, scopeOf(a.reviewer)); assert.equal(decisionPreview.canDecide, true);
  const decision = await handoff.decidePaymentReconciliation({ paymentRequestId: submitted.paymentRequestId, proposalId: proposed.proposalId, decision: 'APPROVE', reason: 'Independent review of the separate retained synthetic payment acknowledgment.', expectedRevision: decisionPreview.revision, idempotencyKey: crypto.randomUUID() }, scopeOf(a.reviewer)); assert.equal(decision.status, 'CASH_REVIEWED'); assert.equal(decision.evidenceCurrent, true);
  const proof = await db.$transaction(tx => readCurrentPaymentReconciliationEvidenceInTx(tx, x.organizationId, submitted.paymentRequestId)); assert.equal(proof.decisionId, decision.receiptId);
  const transaction = await db.paymentTransaction.findUniqueOrThrow({ where: { id: paid.paymentTransactionId } }); assert.equal(transaction.state, 'CONFIRMED'); assert.equal(transaction.providerAccountId, null);
  const originalException = await db.paymentException.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceType: 'SUPPLIER_PAYMENT', sourceId: submitted.paymentRequestId } }); assert.equal(originalException.status, 'RESOLVED'); assert.equal(originalException.suspenseItemId, null);
  assert.equal(f.hash({ levels: await db.inventoryLevel.findMany({ where: { item: { organizationId: x.organizationId } }, orderBy: { id: 'asc' } }), movements: await db.inventoryTransaction.findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } }) }), beforeStock);
  const retained = f.hash({ economic: await p.rows(x, p.economicModels), evidence: await evidenceRows(x) }); const replay = await execution.confirmPaymentRelease(releaseCommand, scopeOf(a.recorder)); assert.equal(replay.replayed, true); assert.equal(f.hash({ economic: await p.rows(x, p.economicModels), evidence: await evidenceRows(x) }), retained);
  return { required: true, amount: amount.toString(), currency: x.currency, payableAfter: '0', paymentId: submitted.paymentRequestId, transactionId: transaction.id, originalExceptionId: originalException.id, reviewDecisionId: decision.receiptId, distinctActors: [x.actorId, x.checkerId, a.recorder.actorId, a.proposer.actorId, a.reviewer.actorId], warnings: release.warnings, documents: [requestDoc, executionDoc, voucher], executionReplayNoEffects: true, stockUnchanged: true };
}
module.exports = { settlePayable, sources, outside, evidenceRows };
