"use strict";

// Inert on import and without --run. New owned cash attestation lifecycle only.
async function main() {
  const p = require('./purchase-close-recovery-fixtures.cjs');
  const { db, f, root, helper, organizations, Prisma } = p, { fs, path, crypto, assert } = f;
  const load = name => require(path.join(root, name));
  const requests = load('services/purchasing/payment-request.service.ts');
  const execution = load('services/purchasing/payment-release.service.ts');
  const { resolveAPCountryPackStatus } = load('services/purchasing/ap-control.service.ts');
  const { getAccountantPortalData } = load('services/accounting/data-trust.service.ts');
  const { getCloseReadinessSnapshot } = load('services/snapshots/close-readiness-snapshot.service.ts');
  const { getCashCommandData } = load('services/cash-command/cash-command.service.ts');
  const { getProofTrail } = load('services/evidence/proof-trail.service.ts');
  const { loadExceptionClosureSourceInTx } = load('services/reconciliation/payment-exception-closure-evidence.service.ts');
  const handoff = load('services/purchasing/payment-reconciliation-service.ts');
  const evidence = load('services/purchasing/payment-reconciliation-evidence.ts');
  const closeReview = load('services/accounting/close-assurance.service.ts');
  const replacements = load('services/accounting/close-evidence-replacement.service.ts');
  const { readSupplierPaymentReconciliationProofsInTx } = load('services/purchasing/payment-reconciliation-proof-summary.ts');
  const { exceptionClosureManifestEvidenceInTx } = load('services/reconciliation/payment-exception-closure-evidence.service.ts');
  const run = crypto.randomUUID(), sha = p.sha;
  const extraModels = ['accountantComment', 'supplierBankAccount', 'supplierBankChangeRequest', 'paymentTransaction', 'paymentException', 'suspenseItem', 'matchRecord', 'providerAccount', 'providerEvent', 'statementFile', 'statementLine', 'reconciliationRun', 'paymentReconciliationInboxItem'];
  const priorFiles = ['purchase-close-recovery-fixtures.cjs', 'purchase-close-recovery-runtime.cjs',
    'purchase-close-recovery-runtime-d9b0c686-29f0-4392-8c4e-d2bdfbef5797.json',
    'purchase-close-recovery-runtime-f2ca2ccf-4308-47ef-8610-594456b1606d.json'];
  const sourceFiles = [...new Set([__filename, ...priorFiles.map(name => path.join(__dirname, name)),
    path.join(root, 'services/reconciliation/payment-reconciliation-run.service.ts'),
    path.join(root, 'services/reconciliation/payment-reconciliation-manual-match.service.ts'),
    path.join(root, 'services/reconciliation/manual-match-evidence.ts'),
    ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep)
      && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep)
      && /\.(?:ts|js|cjs)$/.test(file))])].sort();
  const sources = () => ({ ...p.sources(), ...Object.fromEntries(sourceFiles.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), checks: [], scope: 'Owned PostgreSQL actual supplier CASH request, approval, recording, separate proposal and independent internal receipt review; current Close/Cash, tamper refusal, withdrawal and recovery.',
    limitations: [
      'Five distinct payment workflow actors and all identities, sessions, authority, organization, accounting master data, approved destination and voucher bytes are synthetic local prerequisites.',
      'The inherited PO is directly inserted APPROVED as a synthetic prerequisite; actual receiving, invoice approval, payment request, independent approval and recording services are exercised.',
      'Cash review authenticates the internal reviewer claim only. URI/hash are not server-fetched and do not authenticate a payee signature or external settlement.',
      'Actual COUNTRY_TREATMENT_REVIEW and withholding NOT_CONFIGURED are retained; this is not expert country approval.',
      'Bank admission/matching/signoff/finalization, duplicate cross-payment voucher races, publication races, browser behavior and the original four purchase reversal/Close recovery criteria remain unverified by this driver.',
      'No product mutation, deployment, migration, provider request, real payment or rejected manual posting scope change.'
    ] };
  async function extras(where) {
    const result = {}; for (const model of extraModels) result[model] = await db[model].findMany({ where, orderBy: { id: 'asc' } }); return result;
  }
  async function outside() {
    const base = await p.outside(), extra = {};
    for (const [model, rows] of Object.entries(await extras({ organizationId: { notIn: organizations } }))) extra[model] = { count: rows.length, hash: f.hash(rows) };
    return { base, extra, hash: f.hash({ base, extra }) };
  }
  async function effects(x) { return { retained: await p.rows(x), extra: await extras({ organizationId: x.organizationId }) }; }
  async function economic(x) { return { retained: await p.rows(x, p.economicModels), extra: await extras({ organizationId: x.organizationId }) }; }
  const omit = (row, keys) => Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));
  const additions = (before, after) => after.filter(row => !before.some(old => old.id === row.id));
  function saveDocument(kind, data) {
    const file = path.join(__dirname, 'owned-handoff-payment-' + kind + '-' + run + '.json');
    const bytes = JSON.stringify({ syntheticLocalVerificationOnly: true, noExternalPayment: true, ...data }, null, 2) + '\n';
    fs.writeFileSync(file, bytes, { flag: 'wx' }); const hash = sha(fs.readFileSync(file));
    return { file, hash, uri: 'https://example.invalid/owned-local-purchase-payment/' + path.basename(file) };
  }
  async function actors(x) {
    await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_PAYMENT_REQUEST', nameEn: 'Synthetic local request permission', permissions: ['purchasing.ap.payment.request'], users: { connect: { id: x.actorId } } } });
    await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_PAYMENT_APPROVE', nameEn: 'Synthetic independent payment approval', permissions: ['purchasing.ap.payment.approve'], users: { connect: { id: x.checkerId } } } });
    const recorder = await db.user.create({ data: { organizationId: x.organizationId, name: 'Synthetic separate payment recorder', email: crypto.randomUUID() + '@example.invalid', isActive: true, isVerified: true, emailVerified: true } });
    await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_PAYMENT_RECORDER', nameEn: 'Synthetic independent execution recorder', permissions: ['purchasing.ap.payment.release'], users: { connect: { id: recorder.id } } } });
    const session = await db.session.create({ data: { userId: recorder.id, token: crypto.randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 3600000), assuranceOrganizationId: x.organizationId, assuranceVerifiedAt: new Date(), assuranceLevel: 1, assuranceMethod: 'password' } });
    const bank = await db.supplierBankAccount.create({ data: { organizationId: x.organizationId, supplierId: x.supplierId, status: 'APPROVED', bankName: 'Synthetic local destination; no external account', accountNumberMasked: '****0000', approvedById: x.checkerId, approvedAt: new Date() } });
    const reviewers = [];
    for (const label of ['proposer', 'checker']) {
      const user = await db.user.create({ data: { organizationId: x.organizationId, name: 'Synthetic separate cash evidence ' + label, email: crypto.randomUUID() + '@example.invalid', isActive: true, isVerified: true, emailVerified: true } });
      const session = await db.session.create({ data: { userId: user.id, token: crypto.randomBytes(32).toString('hex'), expiresAt: new Date(Date.now()+3600000), assuranceOrganizationId: x.organizationId, assuranceVerifiedAt: new Date(), assuranceLevel: 1, assuranceMethod: 'password' } });
      reviewers.push({ actorId: user.id, organizationId: x.organizationId, sessionId: session.id, sessionToken: session.token });
    }
    await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_HANDOFF_REVIEW', nameEn: 'Synthetic current evidence review permission', permissions: ['payments.reconciliation.read','accounting.journal.read','payments.reconciliation.exception.resolve','payments.reconciliation.sign'], users: { connect: [x.actorId, x.checkerId, recorder.id, ...reviewers.map(value=>value.actorId)].map(id=>({id})) } } });
    x.evidenceProposer = reviewers[0]; x.evidenceChecker = reviewers[1];
    await db.role.create({ data: { organizationId: x.organizationId, code: 'OWNED_CLOSE_REPLACEMENT_REVIEW', nameEn: 'Synthetic independent missing evidence reviewer', permissions: ['accounting.close.accountant.review'], users: { connect: { id: x.certifierId } } } });
    const closeSession = await db.session.create({ data: { userId: x.certifierId, token: crypto.randomBytes(32).toString('hex'), expiresAt: new Date(Date.now()+3600000), assuranceOrganizationId: x.organizationId, assuranceVerifiedAt: new Date(), assuranceLevel: 1, assuranceMethod: 'password' } });
    x.closeReviewScope = { actorId: x.certifierId, organizationId: x.organizationId, sessionId: closeSession.id, sessionToken: closeSession.token };
    assert.equal(new Set([x.actorId, x.checkerId, recorder.id, ...reviewers.map(value=>value.actorId)]).size, 5);
    return { bankId: bank.id, recorderId: recorder.id, scope: { organizationId: x.organizationId, actorId: recorder.id, sessionId: session.id, sessionToken: session.token } };
  }
  async function pay(x, authority) {
    const amount = new Prisma.Decimal(await p.payable(x)); assert.ok(amount.gt(0));
    const before = await economic(x), beforeInvoice = before.retained.supplierInvoice.find(row => row.id === x.invoiceId), beforeSupplier = before.retained.supplier.find(row => row.id === x.supplierId);
    const requestEvidence = saveDocument('request', { organizationId: x.organizationId, supplierInvoiceId: x.invoiceId, requesterId: x.actorId, amount: amount.toFixed(2), currency: x.currency, method: 'CASH' });
    const draft = { supplierId: x.supplierId, bankAccountId: authority.bankId, method: 'CASH', paymentDate: new Date().toISOString().slice(0, 10), documentReference: requestEvidence.uri, documentSha256: requestEvidence.hash, allocations: [{ supplierInvoiceId: x.invoiceId, amount: amount.toFixed(2) }] };
    const preview = await requests.previewPaymentRequest(draft, x.makerScope); assert.equal(preview.total, amount.toFixed(2));
    const submitted = await requests.submitPaymentRequest({ draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope);
    assert.equal(submitted.status, 'DRAFT');
    const approval = await requests.reviewPaymentRequestApproval(submitted.paymentRequestId, x.scope);
    const approved = await requests.confirmPaymentRequestApproval({ paymentRequestId: submitted.paymentRequestId, expectedRevision: approval.revision, idempotencyKey: crypto.randomUUID() }, x.scope); assert.equal(approved.status, 'APPROVED');
    const executedAt = new Date().toISOString(), executionReference = 'OWNED-CASH/' + crypto.randomUUID();
    const executionEvidence = saveDocument('execution', { organizationId: x.organizationId, paymentRequestId: submitted.paymentRequestId, recorderId: authority.recorderId, executedAt, executionReference, amount: amount.toFixed(2), currency: x.currency });
    const releaseDraft = { paymentRequestId: submitted.paymentRequestId, executionReference, executedAt, evidenceUri: executionEvidence.uri, evidenceSha256: executionEvidence.hash };
    const review = await execution.previewPaymentRelease(releaseDraft, authority.scope);
    const countryTreatment = await db.$transaction(tx => resolveAPCountryPackStatus(tx, { organizationId: x.organizationId, documentDate: new Date(draft.paymentDate + 'T00:00:00Z'), taxAmount: new Prisma.Decimal(0), purpose: 'SUPPLIER_PAYMENT' }));
    report.paymentPreview = { warnings: [...review.warnings], effect: review.effect, reviewedRevision: review.revision, countryTreatment };
    assert.deepEqual(review.warnings, ['COUNTRY_TREATMENT_REVIEW']); assert.equal(countryTreatment.countryPackStatus, 'RESOLVED'); assert.equal(countryTreatment.withholdingTreatmentStatus, 'NOT_CONFIGURED'); assert.equal(countryTreatment.operatorActionRequired, false);
    const command = { draft: releaseDraft, expectedRevision: review.revision, idempotencyKey: crypto.randomUUID() };
    const result = await execution.confirmPaymentRelease(command, authority.scope); assert.equal(result.ledgerStatus, 'POSTED'); assert.equal(result.replayed, false);
    const after = await economic(x), payment = after.retained.supplierPayment.find(row => row.id === submitted.paymentRequestId);
    assert.ok(payment); assert.equal(payment.status, 'RELEASED'); assert.equal(payment.requestedById, x.actorId); assert.equal(payment.approvedById, x.checkerId); assert.equal(payment.releasedById, authority.recorderId); assert.equal(payment.amount.toString(), amount.toString());
    assert.equal(payment.metadata?.countryPackStatus, countryTreatment.countryPackStatus); assert.equal(payment.metadata?.withholdingTreatmentStatus, 'NOT_CONFIGURED'); assert.equal(payment.metadata?.operatorActionRequired, false);
    const invoice = after.retained.supplierInvoice.find(row => row.id === x.invoiceId), supplier = after.retained.supplier.find(row => row.id === x.supplierId);
    assert.equal(invoice.status, 'PAID'); assert.equal(invoice.amountPaid.toString(), beforeInvoice.amountPaid.plus(amount).toString()); assert.equal(await p.payable(x), '0'); assert.equal(supplier.currentBalance.toString(), beforeSupplier.currentBalance.minus(amount).toString());
    for (const model of p.economicModels) for (const old of before.retained[model]) {
      const current = after.retained[model].find(row => row.id === old.id); assert.ok(current, 'Retained source missing: ' + model);
      const allowed = model === 'supplierInvoice' && old.id === x.invoiceId ? ['status', 'amountPaid', 'updatedAt'] : model === 'supplier' && old.id === x.supplierId ? ['currentBalance', 'updatedAt'] : [];
      assert.deepEqual(omit(current, allowed), omit(old, allowed), 'Unexpected retained source change: ' + model);
    }
    const growth = { supplierPayment: 1, supplierPaymentAllocation: 1, supplierLedgerEntry: 1, journalEntry: 1, journalEntryLine: 2, ledgerPostingBatch: 1, accountingSourceLink: 1 };
    for (const model of p.economicModels) assert.equal(after.retained[model].length - before.retained[model].length, growth[model] || 0, model);
    const entries = additions(before.retained.journalEntry, after.retained.journalEntry), entry = entries[0];
    assert.equal(entry.sourceType, 'SUPPLIER_PAYMENT'); assert.equal(entry.sourceId, payment.id); assert.equal(entry.status, 'POSTED'); assert.equal(entry.postedById, authority.recorderId); assert.equal(entry.postingBatchId, result.postingBatchId);
    const batch = additions(before.retained.ledgerPostingBatch, after.retained.ledgerPostingBatch)[0], link = additions(before.retained.accountingSourceLink, after.retained.accountingSourceLink)[0];
    assert.equal(batch.id, result.postingBatchId); assert.equal(batch.status, 'POSTED'); assert.equal(batch.sourceId, payment.id); assert.equal(batch.sourceType, 'SUPPLIER_PAYMENT'); assert.equal(link.journalEntryId, entry.id); assert.equal(link.postingBatchId, batch.id); assert.equal(link.sourceId, payment.id); assert.equal(link.sourceType, 'SUPPLIER_PAYMENT');
    const lines = additions(before.retained.journalEntryLine, after.retained.journalEntryLine), chart = await db.chartOfAccount.findMany({ where: { organizationId: x.organizationId, id: { in: lines.map(row => row.accountId) } } });
    const debit = lines.find(row => chart.find(account => account.id === row.accountId)?.mappingKey === 'ACCOUNTS_PAYABLE'), credit = lines.find(row => chart.find(account => account.id === row.accountId)?.mappingKey === 'CASH_ON_HAND');
    assert.ok(debit && credit); assert.equal(debit.debit.toString(), amount.toString()); assert.equal(debit.credit.toString(), '0'); assert.equal(credit.credit.toString(), amount.toString()); assert.equal(credit.debit.toString(), '0');
    for (const line of lines) { assert.equal(line.journalEntryId, entry.id); assert.equal(line.currency, x.currency); assert.equal(line.exchangeRate.toString(), '1'); assert.equal(line.baseDebit.toString(), line.debit.toString()); assert.equal(line.baseCredit.toString(), line.credit.toString()); }
    const ledger = additions(before.retained.supplierLedgerEntry, after.retained.supplierLedgerEntry)[0]; assert.equal(ledger.type, 'PAYMENT'); assert.equal(ledger.referenceType, 'SUPPLIER_PAYMENT'); assert.equal(ledger.referenceId, payment.id); assert.equal(ledger.credit.toString(), amount.toString()); assert.equal(ledger.debit.toString(), '0'); assert.equal(ledger.balanceAfter.toString(), supplier.currentBalance.toString());
    const allocation = additions(before.retained.supplierPaymentAllocation, after.retained.supplierPaymentAllocation)[0]; assert.equal(allocation.supplierInvoiceId, x.invoiceId); assert.equal(allocation.supplierPaymentId, payment.id); assert.equal(allocation.amount.toString(), amount.toString());
    for (const model of extraModels) {
      for (const old of before.extra[model]) assert.deepEqual(after.extra[model].find(row => row.id === old.id), old, 'Retained payment evidence changed: ' + model);
      assert.equal(after.extra[model].length - before.extra[model].length, ['paymentTransaction', 'paymentException'].includes(model) ? 1 : 0, model);
    }
    const transaction = additions(before.extra.paymentTransaction, after.extra.paymentTransaction)[0], exception = additions(before.extra.paymentException, after.extra.paymentException)[0];
    assert.equal(transaction.id, result.paymentTransactionId); assert.equal(transaction.sourceType, 'SUPPLIER_PAYMENT'); assert.equal(transaction.sourceId, payment.id); assert.equal(transaction.direction, 'OUTBOUND'); assert.equal(transaction.amount.toString(), amount.toString()); assert.equal(transaction.currencyCode, x.currency); assert.equal(transaction.ledgerPostingBatchId, batch.id); assert.equal(transaction.state, 'PENDING'); assert.equal(transaction.providerAccountId, null); assert.equal(transaction.providerAuthorityEventId, null); assert.equal(transaction.confirmedAt, null); assert.equal(transaction.settledAt, null);
    assert.equal(exception.paymentTransactionId, transaction.id); assert.equal(exception.type, 'MISSING_STATEMENT_LINE'); assert.equal(exception.status, 'OPEN'); assert.equal(exception.sourceType, 'SUPPLIER_PAYMENT'); assert.equal(exception.sourceId, payment.id); for (const key of ['providerAccountId', 'reconciliationRunId', 'suspenseItemId']) assert.equal(exception[key], null);
    const replayBefore = f.hash(await effects(x)), replay = await execution.confirmPaymentRelease(command, authority.scope); assert.equal(replay.replayed, true); assert.equal(replay.paymentTransactionId, transaction.id); assert.equal(f.hash(await effects(x)), replayBefore, 'Exact execution replay must not duplicate economic/evidence effects');
    return { paymentId: payment.id, transactionId: transaction.id, exceptionId: exception.id, documents: [requestEvidence, executionEvidence], result, reviewedWarnings: [...review.warnings], countryTreatment, retainedCountryTreatment: { countryPackStatus: payment.metadata.countryPackStatus, withholdingTreatmentStatus: payment.metadata.withholdingTreatmentStatus, operatorActionRequired: payment.metadata.operatorActionRequired },
      actors: { requesterId: x.actorId, approverId: x.checkerId, recorderId: authority.recorderId }, payableBefore: amount.toFixed(2), payableAfter: '0.00', invoiceStatus: invoice.status, amountPaidBefore: beforeInvoice.amountPaid.toString(), amountPaidAfter: invoice.amountPaid.toString(), supplierBalanceBefore: beforeSupplier.currentBalance.toString(), supplierBalanceAfter: supplier.currentBalance.toString(), journalId: entry.id, postingBatchId: batch.id, sourceLinkId: link.id, supplierLedgerId: ledger.id, balancedApCashPayment: true, retainedSourcesStockAndPriorFinanceUnchanged: true, replayNoEffects: true,
      handoff: { transactionState: transaction.state, providerAccountId: transaction.providerAccountId, exceptionStatus: exception.status, exceptionType: exception.type, suspenseItemId: exception.suspenseItemId, reconciliationRunId: exception.reconciliationRunId } };
  }
  const financialHash = async x => f.hash(await p.rows(x, p.economicModels));
  const originalException = (x, payment) => db.paymentException.findFirstOrThrow({ where: { id: payment.exceptionId, organizationId: x.organizationId } });
  async function fresh(scope) {
    // Synthetic authenticated fixture assurance, never a production auth bypass.
    await db.session.update({ where: { id: scope.sessionId, userId: scope.actorId }, data: { assuranceVerifiedAt: new Date() } });
  }
  async function deniedNoEffects(x, work, codes) {
    const before = f.hash(await effects(x)); let refusal;
    try { await work(); } catch (error) { refusal = p.safeError(error); }
    assert.ok(refusal, 'Actual service must refuse this command');
    assert.ok(codes.includes(refusal.code), JSON.stringify(refusal));
    assert.equal(f.hash(await effects(x)), before, 'Refusal must preserve the complete observed source/evidence state');
    return refusal;
  }
  function voucher(x, payment) {
    const acknowledgedAt = new Date().toISOString(), voucherReference = 'OWNED-RECEIPT/' + crypto.randomUUID();
    const document = saveDocument('recipient-voucher', { organizationId: x.organizationId, paymentRequestId: payment.paymentId,
      supplierId: x.supplierId, amount: payment.payableBefore, currency: x.currency, executionReference: payment.result.executionReference,
      recipientName: 'Synthetic supplier recipient acknowledgment', acknowledgedAt, voucherReference, acknowledgment: 'RECIPIENT_ACKNOWLEDGED' });
    assert.notEqual(document.hash, payment.documents[1].hash, 'Separate retained acknowledgment artifact');
    return { document, draft: { paymentRequestId: payment.paymentId, evidence: { kind: 'CASH_VOUCHER', voucherReference,
      evidenceUri: document.uri, evidenceSha256: document.hash, recipientName: 'Synthetic supplier recipient acknowledgment', acknowledgedAt,
      purpose: 'Synthetic owned payment recipient acknowledgment; internal review only, no external identity certification.', acknowledgment: 'RECIPIENT_ACKNOWLEDGED' } } };
  }
  async function propose(x, draft) {
    await fresh(x.evidenceProposer);
    const preview = await handoff.previewPaymentReconciliation(draft, x.evidenceProposer);
    const command = { draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() };
    const result = await handoff.proposePaymentReconciliation(command, x.evidenceProposer);
    assert.equal(result.status, 'PROPOSED'); assert.equal(result.replayed, false); assert.ok(result.proposalId);
    const before = f.hash(await effects(x)), replay = await handoff.proposePaymentReconciliation(command, x.evidenceProposer);
    assert.equal(replay.replayed, true); assert.equal(replay.proposalId, result.proposalId); assert.equal(f.hash(await effects(x)), before);
    return { result, command };
  }
  async function approve(x, payment, proposed) {
    await fresh(x.evidenceChecker);
    const reviewed = await handoff.reviewPaymentReconciliation(payment.paymentId, x.evidenceChecker);
    assert.equal(reviewed.canDecide, true);
    const command = { paymentRequestId: payment.paymentId, proposalId: proposed.result.proposalId, decision: 'APPROVE',
      reason: 'Independent synthetic review of exact recipient acknowledgment and recorded payment.', expectedRevision: reviewed.revision, idempotencyKey: crypto.randomUUID() };
    const result = await handoff.decidePaymentReconciliation(command, x.evidenceChecker);
    assert.equal(result.status, 'CASH_REVIEWED'); assert.equal(result.evidenceCurrent, true); assert.equal(result.replayed, false);
    const receipt = await db.businessEvent.findFirstOrThrow({ where: { id: result.receiptId, organizationId: x.organizationId } });
    assert.equal(receipt.actorId, x.evidenceChecker.actorId); assert.equal(receipt.sourceType, 'SUPPLIER_PAYMENT'); assert.equal(receipt.sourceId, payment.paymentId);
    const exception = await originalException(x, payment), transaction = await db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transactionId } });
    assert.equal(exception.status, 'RESOLVED'); assert.equal(exception.sourceType, 'SUPPLIER_PAYMENT'); assert.equal(exception.sourceId, payment.paymentId);
    for (const key of ['providerAccountId', 'reconciliationRunId', 'suspenseItemId']) assert.equal(exception[key], null);
    assert.equal(transaction.state, 'CONFIRMED'); assert.equal(transaction.providerAccountId, null); assert.equal(transaction.providerAuthorityEventId, null);
    assert.equal(transaction.metadata.paymentReconciliationReceiptId, result.receiptId);
    const proof = await db.$transaction(tx => evidence.readCurrentPaymentReconciliationEvidenceInTx(tx, x.organizationId, payment.paymentId));
    assert.ok(proof); assert.equal(proof.decisionId, result.receiptId); assert.equal(proof.proposalId, proposed.result.proposalId); assert.equal(proof.kind, 'CASH_VOUCHER');
    const closure = await db.$transaction(tx => exceptionClosureManifestEvidenceInTx(tx, x.organizationId, { id: payment.exceptionId, status: 'RESOLVED' }));
    assert.equal(closure.supplierPaymentReview.decisionId, result.receiptId);
    const before = f.hash(await effects(x)), replay = await handoff.decidePaymentReconciliation(command, x.evidenceChecker);
    assert.equal(replay.replayed, true); assert.equal(replay.receiptId, result.receiptId); assert.equal(f.hash(await effects(x)), before);
    return { result, proof, command, receiptHash: receipt.payloadHash };
  }
  async function recoverHistoricalEvidence(x, adverseRunId) {
    const missing = await db.closeEvidenceItem.findMany({ where: { organizationId: x.organizationId, closeRunId: adverseRunId, available: false }, orderBy: { id: 'asc' } });
    assert.equal(missing.length, 1);
    assert.equal(missing[0].evidenceType, 'DATA_TRUST_CERTIFICATE');
    const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { organizationId: x.organizationId, closeRunId: adverseRunId, status: 'OPEN', title: 'Data-trust evidence unavailable' } });
    const period = await db.accountingPeriod.findUniqueOrThrow({ where: { id: x.periodId } });
    const beforeSnapshot = await getCloseReadinessSnapshot({ organizationId: x.organizationId, periodStart: period.startDate, periodEnd: period.endDate, now: new Date() });
    assert.equal(beforeSnapshot.evidenceGrade, 'blocked');
    assert.ok(beforeSnapshot.blockers.some(row => row.id === 'close-evidence-unavailable'));
    const before = { grade: beforeSnapshot.evidenceGrade, blockers: beforeSnapshot.blockers.map(row => row.id), metrics: beforeSnapshot.metrics };
    const request = await closeReview.requestMissingCloseEvidence(x.organizationId, { findingId: finding.id, requestedFromId: x.evidenceProposer.actorId, requestText: 'Review the renewed supplier receipt and current Data Trust collection while retaining the earlier missing evidence.', dueAt: new Date(Date.now()+86400000), correlationId: 'handoff-missing-request-' + run }, { actorId: x.certifierId });
    const response = await closeReview.respondToMissingCloseEvidence(x.organizationId, { requestId: request.id, responseText: 'The invalid receipt was withdrawn and independently reviewed again; the fresh assessment contains the current source-bound Data Trust evidence.', correlationId: 'handoff-missing-response-' + run }, { actorId: x.evidenceProposer.actorId });
    const preview = await db.$transaction(tx => replacements.getCloseEvidenceReplacementInTx(tx, x.organizationId, finding.id), { isolationLevel: 'RepeatableRead' });
    assert.equal(preview.status, 'AVAILABLE');
    await fresh(x.closeReviewScope);
    const input = { requestId: request.id, responseId: response.id, resolutionNotes: 'Independent synthetic reviewer verified the replacement Data Trust collection and renewed supplier receipt; original missing evidence remains retained.', replacement: preview.selection, correlationId: 'handoff-missing-accept-' + run };
    const control = { actorId: x.certifierId, actorPermissions: ['accounting.close.accountant.review'], freshAuth: { actorId: x.certifierId, organizationId: x.organizationId, lastAuthAt: new Date() }, session: { id: x.closeReviewScope.sessionId, token: x.closeReviewScope.sessionToken } };
    assert.notEqual(control.actorId, x.evidenceProposer.actorId);
    const accepted = await closeReview.acceptMissingCloseEvidenceResponse(x.organizationId, input, control);
    assert.equal((await db.closeAssuranceFinding.findUniqueOrThrow({ where: { id: finding.id } })).status, 'RESOLVED');
    assert.deepEqual(await db.closeEvidenceItem.findMany({ where: { organizationId: x.organizationId, closeRunId: adverseRunId, available: false }, orderBy: { id: 'asc' } }), missing);
    const state = f.hash(await effects(x));
    const replay = await closeReview.acceptMissingCloseEvidenceResponse(x.organizationId, input, control);
    assert.equal(replay.id, accepted.id); assert.equal(f.hash(await effects(x)), state);
    const verified = await db.$transaction(tx => replacements.getVerifiedCloseEvidenceReplacementsInTx(tx, x.organizationId));
    assert.ok(verified.evidenceIds.includes(missing[0].id));
    return { findingId: finding.id, requestId: request.id, responseId: response.id, acceptanceId: accepted.id, selection: preview.selection, missingEvidenceId: missing[0].id, originalMissingEvidenceUnchanged: true, replayNoEffects: true, before };
  }
  async function certifyCurrent(x, payment, decision, label, adverseRunId) {
    const before = await financialHash(x);
    const portal = await getAccountantPortalData({ organizationId: x.organizationId, periodId: x.periodId }, db, new Date());
    assert.equal(portal.certificate.level, 'T4');
    assert.equal(portal.supplierPaymentReconciliationProofs.find(row => row.paymentRequestId === payment.paymentId)?.decisionId, decision.result.receiptId);
    const assessed = await p.assessment(x, label), artifact = await p.certify(assessed, label), history = await p.retained(assessed);
    const internal = history.closeEvidenceItem.find(row => row.sourceType === 'SupplierCashReceiptReview' && row.sourceId === decision.result.receiptId);
    assert.ok(internal); assert.equal(internal.sourceHash, decision.receiptHash); assert.equal(internal.available, true);
    const historicalRecovery = adverseRunId ? await recoverHistoricalEvidence(assessed, adverseRunId) : null;
    const cash = await p.observe(assessed, 'certified');
    assert.equal(await financialHash(x), before);
    return { assessed, artifact, history, result: { closeRunId: assessed.closeRunId, exportId: artifact.exportId, contentHash: artifact.contentHash, evidenceId: internal.id, evidenceHash: internal.sourceHash, historicalRecovery, cash } };
  }
  async function check(name, work) {
    const entry = { name, status: 'running' }; report.checks.push(entry);
    try { entry.result = await work(); entry.status = 'passed'; } catch (error) { entry.status = 'failed'; entry.error = p.safeError(error); throw error; }
    console.log(JSON.stringify({ name, status: entry.status })); return entry.result;
  }
  try {
    await p.guard(); report.identity = { database: helper.database, host: f.target.hostname, owned: true };
    report.sourcesBefore = sources(); report.outsideBefore = await outside();
    const x = await p.fixture('handoff-' + run.slice(0, 8)); report.organizationId = x.organizationId;
    const authority = await actors(x);
    report.workflowActors = { requester: x.actorId, paymentApprover: x.checkerId, recorder: authority.recorderId, evidenceProposer: x.evidenceProposer.actorId, evidenceChecker: x.evidenceChecker.actorId };
    const payment = await check('Real request, independent approval and third-actor CASH recording preserve source and settle exactly one payable', () => pay(x, authority));
    const baseline = await financialHash(x); report.financialBaseline = baseline;
    const retainedVoucher = voucher(x, payment); report.recipientVoucher = retainedVoucher.document;
    let accepted, certified, adverseRunId;
    await check('Separate voucher proposal rejects self-review and produces verified original-exception completion with exact replay', async () => {
      const copied = { ...retainedVoucher.draft, evidence: { ...retainedVoucher.draft.evidence, evidenceSha256: payment.documents[1].hash } };
      const copiedExecution = await deniedNoEffects(x, () => handoff.previewPaymentReconciliation(copied, x.evidenceProposer), ['REVIEW_REQUIRED', 'BUSINESS_RULE_VIOLATION']);
      const proposed = await propose(x, retainedVoucher.draft), denials = [];
      for (const scope of [x.makerScope, x.scope, authority.scope, x.evidenceProposer]) {
        await fresh(scope);
        const review = await handoff.reviewPaymentReconciliation(payment.paymentId, scope);
        assert.equal(review.canDecide, false);
        denials.push(await deniedNoEffects(x, () => handoff.decidePaymentReconciliation({ paymentRequestId: payment.paymentId, proposalId: proposed.result.proposalId,
          decision: 'APPROVE', reason: 'Denied synthetic self-review probe', expectedRevision: review.revision, idempotencyKey: crypto.randomUUID() }, scope), ['SOD_VIOLATION']));
      }
      accepted = await approve(x, payment, proposed); assert.equal(await financialHash(x), baseline);
      assert.equal(await db.providerAccount.count({ where: { organizationId: x.organizationId } }), 0);
      assert.equal(await db.suspenseItem.count({ where: { organizationId: x.organizationId } }), 0);
      return { proposalId: proposed.result.proposalId, decisionId: accepted.result.receiptId, proof: accepted.proof, copiedExecution, denials,
        originalExceptionId: payment.exceptionId, unchangedFinancialHash: baseline, noArtificialProviderOrSuspense: true };
    });
    await check('Actual fresh Close assessment, certified export and Cash evidence consume the reviewed cash receipt', async () => {
      certified = await certifyCurrent(x, payment, accepted, 'cash-reviewed-' + run); return certified.result;
    });
    await check('Owned retained-pointer tamper fails proof and Data Trust; actual assessment and certified export fail closed', async () => {
      const transaction = await db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transactionId } });
      assert.equal(transaction.metadata.paymentReconciliationReceiptId, accepted.result.receiptId);
      await db.paymentTransaction.update({ where: { id: transaction.id, organizationId: x.organizationId }, data: { metadata: { ...transaction.metadata, paymentReconciliationReceiptId: 'owned-injected-invalid-pointer-' + run } } });
      // Deliberate owned fixture corruption, not a product write or approval.
      const canonicalRefusal = await deniedNoEffects(x, () => db.$transaction(tx => evidence.readCurrentPaymentReconciliationEvidenceInTx(tx, x.organizationId, payment.paymentId)), ['REVIEW_REQUIRED', 'BUSINESS_RULE_VIOLATION']);
      const summaryRefusal = await deniedNoEffects(x, () => db.$transaction(tx => readSupplierPaymentReconciliationProofsInTx(tx, x.organizationId)), ['REVIEW_REQUIRED', 'BUSINESS_RULE_VIOLATION', 'CONFLICT']);
      const portalRefusal = await deniedNoEffects(x, () => getAccountantPortalData({ organizationId: x.organizationId, periodId: x.periodId }, db, new Date()), ['REVIEW_REQUIRED', 'BUSINESS_RULE_VIOLATION', 'CONFLICT']);
      const current = await handoff.reviewPaymentReconciliation(payment.paymentId, x.evidenceChecker);
      assert.equal(current.status, 'CASH_REVIEWED'); assert.equal(current.evidenceCurrent, false); assert.equal(current.evidenceIssue, 'REVIEW_REQUIRED'); assert.equal(current.canReopen, true);
      const adverse = await p.assessment(x, 'cash-tamper-' + run, false), row = await db.closeRun.findUniqueOrThrow({ where: { id: adverse.closeRunId } });
      adverseRunId = adverse.closeRunId;
      assert.equal(row.status, 'BLOCKED'); const cash = await p.observe(adverse, 'blocked');
      const exportBefore = await db.closePackExport.count({ where: { organizationId: x.organizationId } }), at = new Date(); let certificationRefusal;
      try { await p.pack.exportClosePack(x.organizationId, { closeRunId: adverse.closeRunId, mode: 'CERTIFIED', correlationId: 'owned-tamper-refusal-' + run }, { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: at, now: at }); }
      catch (error) { certificationRefusal = p.safeError(error); }
      assert.ok(certificationRefusal); assert.equal(await db.closePackExport.count({ where: { organizationId: x.organizationId } }), exportBefore);
      assert.equal(await financialHash(x), baseline);
      return { tamper: 'Owned paymentTransaction receipt pointer only', canonicalRefusal, summaryRefusal, portalRefusal, certificationRefusal, cash, noEconomicChange: true };
    });
    await check('Withdrawal from invalid proof reopens the same obligation; renewed independent review restores Close with original export retained', async () => {
      await fresh(x.evidenceChecker);
      const current = await handoff.reviewPaymentReconciliation(payment.paymentId, x.evidenceChecker);
      const command = { paymentRequestId: payment.paymentId, reason: 'Withdraw invalid pointer and retain original financial and decision history.', expectedRevision: current.revision, idempotencyKey: crypto.randomUUID() };
      const reopened = await handoff.reopenPaymentReconciliation(command, x.evidenceChecker); assert.equal(reopened.status, 'REOPENED'); assert.equal(reopened.replayed, false);
      const exception = await originalException(x, payment); assert.equal(exception.status, 'OPEN'); assert.equal(exception.sourceId, payment.paymentId);
      assert.equal(await db.$transaction(tx => evidence.readCurrentPaymentReconciliationEvidenceInTx(tx, x.organizationId, payment.paymentId)), null);
      const state = f.hash(await effects(x)), replay = await handoff.reopenPaymentReconciliation(command, x.evidenceChecker); assert.equal(replay.replayed, true); assert.equal(f.hash(await effects(x)), state);
      const priorHistory = await p.unchangedHistory(certified.assessed, certified.history, certified.artifact, true);
      const portal = await getAccountantPortalData({ organizationId: x.organizationId, periodId: x.periodId }, db, new Date());
      assert.ok(portal.blockers.some(row => row.gate === 'payments.reconciliation.exceptions')); assert.notEqual(portal.certificate.level, 'T4');
      const proposal = await propose(x, retainedVoucher.draft), renewed = await approve(x, payment, proposal);
      assert.notEqual(renewed.result.receiptId, accepted.result.receiptId);
      const historical = await db.businessEvent.findFirstOrThrow({ where: { id: accepted.result.receiptId, organizationId: x.organizationId } }); assert.equal(historical.payloadHash, accepted.receiptHash);
      const restored = await certifyCurrent(x, payment, renewed, 'cash-renewed-' + run, adverseRunId);
      await p.unchangedHistory(certified.assessed, certified.history, certified.artifact, true);
      assert.equal(await financialHash(x), baseline);
      return { withdrawalReceiptId: reopened.receiptId, originalExceptionId: exception.id, priorHistory, renewedDecisionId: renewed.result.receiptId, recovery: restored.result, unchangedFinancialHash: baseline };
    });
    report.financialAfter = await financialHash(x); report.noHandoffFinancialEffects = report.financialAfter === baseline;
  } catch (error) { report.error = p.safeError(error); }
  finally {
    try { report.sourcesAfter = sources(); report.sourceStable = !!report.sourcesBefore && f.hash(report.sourcesBefore) === f.hash(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = !!report.outsideBefore && report.outsideBefore.hash === report.outsideAfter.hash; } catch (error) { report.finalizationError = p.safeError(error); }
    try { await db.$disconnect(); } catch (error) { report.disconnectError = p.safeError(error); }
    report.passed = report.checks.length === 5 && report.checks.every(row => row.status === 'passed') && report.sourceStable && report.outsideUnchanged && report.noHandoffFinancialEffects && !report.error && !report.finalizationError && !report.disconnectError;
    report.bankAndOriginalPurchaseRecoveryEstablished = false;
    const file = path.join(__dirname, 'payment-handoff-runtime-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks.map(row => ({ name: row.name, status: row.status })), sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged }));
  }
  return report;
}
module.exports = { main };
if (require.main === module) {
  if (process.argv[2] !== '--run') console.log('Prepared cash evidence lifecycle verifier only. --run requires coordinator release.');
  else main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(String(error?.message || error).replace(/postgres(?:ql)?:\/\/\S+/gi, '[database URL redacted]')); process.exit(1); });
}
