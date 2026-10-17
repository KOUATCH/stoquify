"use strict";

// Inert on import and without --run. This verifies a blocked handoff, not recovery.
async function main() {
  const p = require('./purchase-close-recovery-fixtures.cjs');
  const { db, f, root, helper, organizations, Prisma } = p, { fs, path, crypto, assert } = f;
  const load = name => require(path.join(root, name));
  const requests = load('services/purchasing/payment-request.service.ts');
  const execution = load('services/purchasing/payment-release.service.ts');
  const { getAccountantPortalData } = load('services/accounting/data-trust.service.ts');
  const { getCloseReadinessSnapshot } = load('services/snapshots/close-readiness-snapshot.service.ts');
  const { getCashCommandData } = load('services/cash-command/cash-command.service.ts');
  const { getProofTrail } = load('services/evidence/proof-trail.service.ts');
  const { loadExceptionClosureSourceInTx } = load('services/reconciliation/payment-exception-closure-evidence.service.ts');
  const run = crypto.randomUUID(), sha = p.sha;
  const extraModels = ['supplierBankAccount', 'supplierBankChangeRequest', 'paymentTransaction', 'paymentException', 'suspenseItem', 'matchRecord', 'providerAccount', 'providerEvent', 'statementFile', 'statementLine', 'reconciliationRun', 'paymentReconciliationInboxItem'];
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
  const report = { run, at: new Date().toISOString(), checks: [],
    scope: 'Actual local supplier payment request, independent approval and third-actor execution recording; truthful blocked payment-to-Close handoff on the exact owned loopback registration database.',
    limitations: [
      'This is an adverse-boundary verification. Passing it does not satisfy the four purchase Close recovery criteria, which remain unfulfilled in their retained runtime receipts.',
      'The organization, users, sessions, granted roles, master data, approved destination and document bytes are explicitly synthetic local prerequisites, not customer authority, external settlement or professional approval.',
      'CASH is a synthetic execution record only. No money, bank/provider request, external delivery or network call is authorized or exercised.',
      'No provider association, confirmed/settled status, suspense link, reconciliation decision or Close readiness is fabricated. Existing validators remain effective.',
      'The actual original exception closure source reader is exercised. Automatic/manual provider-match exclusion is grounded in bound source predicates; no fabricated provider/statement is created to simulate a match.',
      'No product edits, migration, seed, reset, deployment, historical fixture modification or all-period helper change.',
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
    const file = path.join(__dirname, 'owned-purchase-payment-' + kind + '-' + run + '.json');
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
    assert.equal(new Set([x.actorId, x.checkerId, recorder.id]).size, 3);
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
    const review = await execution.previewPaymentRelease(releaseDraft, authority.scope); assert.deepEqual(review.warnings, []);
    const command = { draft: releaseDraft, expectedRevision: review.revision, idempotencyKey: crypto.randomUUID() };
    const result = await execution.confirmPaymentRelease(command, authority.scope); assert.equal(result.ledgerStatus, 'POSTED'); assert.equal(result.replayed, false);
    const after = await economic(x), payment = after.retained.supplierPayment.find(row => row.id === submitted.paymentRequestId);
    assert.ok(payment); assert.equal(payment.status, 'RELEASED'); assert.equal(payment.requestedById, x.actorId); assert.equal(payment.approvedById, x.checkerId); assert.equal(payment.releasedById, authority.recorderId); assert.equal(payment.amount.toString(), amount.toString());
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
    return { paymentId: payment.id, transactionId: transaction.id, exceptionId: exception.id, documents: [requestEvidence, executionEvidence], result,
      actors: { requesterId: x.actorId, approverId: x.checkerId, recorderId: authority.recorderId }, payableBefore: amount.toFixed(2), payableAfter: '0.00', invoiceStatus: invoice.status, amountPaidBefore: beforeInvoice.amountPaid.toString(), amountPaidAfter: invoice.amountPaid.toString(), supplierBalanceBefore: beforeSupplier.currentBalance.toString(), supplierBalanceAfter: supplier.currentBalance.toString(), journalId: entry.id, postingBatchId: batch.id, sourceLinkId: link.id, supplierLedgerId: ledger.id, balancedApCashPayment: true, retainedSourcesStockAndPriorFinanceUnchanged: true, replayNoEffects: true,
      handoff: { transactionState: transaction.state, providerAccountId: transaction.providerAccountId, exceptionStatus: exception.status, exceptionType: exception.type, suspenseItemId: exception.suspenseItemId, reconciliationRunId: exception.reconciliationRunId } };
  }
  async function observeBoundary(x, payment) {
    const beforeRead = f.hash(await economic(x)), portal = await getAccountantPortalData({ organizationId: x.organizationId, periodId: x.periodId }, db, new Date());
    assert.equal(portal.blockers.some(row => row.gate === 'purchasing.ap.open-items'), false, 'Actual payment closes the supplier invoice obligation');
    assert.ok(portal.blockers.some(row => row.gate === 'payments.reconciliation.exceptions')); assert.notEqual(portal.certificate.level, 'T4'); assert.equal(f.hash(await economic(x)), beforeRead);
    const assessed = await p.assessment(x, 'payment-handoff-boundary', false), runRow = await db.closeRun.findUniqueOrThrow({ where: { id: assessed.closeRunId } });
    const period = await db.accountingPeriod.findUniqueOrThrow({ where: { id: x.periodId } }), input = { organizationId: x.organizationId, periodStart: period.startDate, periodEnd: period.endDate, now: new Date() };
    const beforeQueries = f.hash(await economic(x));
    const snapshot = await getCloseReadinessSnapshot(input), dashboard = await p.close.getCloseAssuranceDashboard(x.organizationId, x.periodId), proof = await getProofTrail({ organizationId: x.organizationId, subjectType: 'close.run', subjectId: assessed.closeRunId }, db);
    const cash = await getCashCommandData({ ...input, actorId: x.certifierId, actorPermissions: ['dashboard.read', 'accounting.close.read'], actorRoleCodes: ['administrator'] }), trust = cash.trustSignals.find(row => row.id === 'close_readiness');
    assert.ok(trust); assert.equal(dashboard.run.id, assessed.closeRunId); assert.equal(cash.proofSubjects.find(row => row.available && row.subjectType === 'close.run')?.subjectId, assessed.closeRunId);
    assert.equal(dashboard.controls.certificationAvailable, false); assert.notEqual(runRow.status, 'CERTIFIED'); assert.notEqual(runRow.metadata?.trustLevel, 'T4');
    for (const grade of [snapshot.evidenceGrade, dashboard.currentProof.grade, proof.evidenceGrade, trust.evidenceGrade]) assert.notEqual(grade, 'certified');
    assert.ok(snapshot.blockers.length > 0 && dashboard.currentProof.blockers.length > 0 && trust.blockers.length > 0); assert.equal(f.hash(await economic(x)), beforeQueries);
    const beforeClosure = f.hash(await effects(x)); let closureError;
    try { await db.$transaction(tx => loadExceptionClosureSourceInTx(tx, x.organizationId, payment.exceptionId)); } catch (error) { closureError = p.safeError(error); }
    assert.ok(closureError); assert.equal(closureError.code, 'CONFLICT'); assert.match(closureError.message, /original suspense link/i); assert.equal(f.hash(await effects(x)), beforeClosure);
    const beforeCertification = await effects(x), at = new Date(); let denial;
    try { await p.pack.exportClosePack(x.organizationId, { closeRunId: assessed.closeRunId, mode: 'CERTIFIED', correlationId: 'owned-unresolved-payment-' + run }, { actorId: x.certifierId, actorPermissions: ['accounting.close.certify'], lastAuthAt: at, now: at }); } catch (error) { denial = p.safeError(error); }
    assert.ok(denial, 'Unresolved source conditions must deny real certification'); assert.match(denial.message, /Certified close pack is blocked:/);
    const after = await effects(x); assert.deepEqual(after.retained.closePackExport, beforeCertification.retained.closePackExport, 'Denied certification creates no export');
    assert.equal(f.hash(await economic(x)), beforeQueries, 'Certification denial cannot alter payment, source or reconciliation evidence');
    for (const model of ['closeEvidenceItem', 'closeChecklistItem', 'closeAssuranceFinding']) assert.deepEqual(after.retained[model], beforeCertification.retained[model]);
    assert.deepEqual(after.extra.paymentTransaction, beforeCertification.extra.paymentTransaction); assert.deepEqual(after.extra.paymentException, beforeCertification.extra.paymentException);
    return { runId: assessed.closeRunId, runStatus: runRow.status, runTrustLevel: runRow.metadata?.trustLevel, portal: { trustLevel: portal.certificate.level, blockers: portal.blockers.map(row => ({ id: row.id, gate: row.gate, severity: row.severity })) },
      close: { snapshotGrade: snapshot.evidenceGrade, dashboardGrade: dashboard.currentProof.grade, proofGrade: proof.evidenceGrade, certificationAvailable: dashboard.controls.certificationAvailable, blockers: snapshot.blockers.map(row => ({ id: row.id, gate: row.gate, severity: row.severity })) },
      cash: { currentRunId: assessed.closeRunId, grade: trust.evidenceGrade, tone: trust.tone, blockers: trust.blockers.map(row => ({ id: row.id, gate: row.gate, severity: row.severity })) }, closureError, certificationDenial: denial, noCertifiedExportCreated: true, retainedPaymentAndSourceEvidenceUnchanged: true };
  }
  async function check(name, work) {
    const entry = { name, status: 'running' }; report.checks.push(entry);
    try { entry.result = await work(); entry.status = 'passed'; } catch (error) { entry.status = 'failed'; entry.error = p.safeError(error); throw error; }
    console.log(JSON.stringify({ name, status: entry.status })); return entry.result;
  }
  try {
    await p.guard(); report.identity = { database: helper.database, host: f.target.hostname, owned: true };
    report.sourcesBefore = sources(); report.outsideBefore = await outside();
    const x = await p.fixture('pay-boundary-' + run.slice(0, 8)); report.organizationId = x.organizationId;
    const initial = await getAccountantPortalData({ organizationId: x.organizationId, periodId: x.periodId }, db, new Date());
    assert.ok(initial.blockers.some(row => row.gate === 'purchasing.ap.open-items')); report.initial = { payable: await p.payable(x), portalTrust: initial.certificate.level, blockers: initial.blockers.map(row => ({ id: row.id, gate: row.gate, severity: row.severity })) };
    const authority = await actors(x);
    const payment = await check('Actual independently approved CASH recording settles only the exact payable and creates truthful pending reconciliation evidence', () => pay(x, authority));
    await check('Actual Close, portal and Cash retain the unresolved handoff and certification is denied', () => observeBoundary(x, payment));
  } catch (error) { report.error = p.safeError(error); }
  finally {
    try { report.sourcesAfter = sources(); report.sourceStable = !!report.sourcesBefore && f.hash(report.sourcesBefore) === f.hash(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = !!report.outsideBefore && report.outsideBefore.hash === report.outsideAfter.hash; } catch (error) { report.finalizationError = p.safeError(error); }
    try { await db.$disconnect(); } catch (error) { report.disconnectError = p.safeError(error); }
    report.passed = report.checks.length === 2 && report.checks.every(row => row.status === 'passed') && report.sourceStable && report.outsideUnchanged && !report.error && !report.finalizationError && !report.disconnectError;
    report.positiveRecoveryEstablished = false;
    const file = path.join(__dirname, 'purchase-payment-close-boundary-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ file, passed: report.passed, positiveRecoveryEstablished: false, checks: report.checks.map(row => ({ name: row.name, status: row.status })), sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged }));
  }
  return report;
}
module.exports = { main };
if (require.main === module) {
  if (process.argv[2] !== '--run') console.log('Prepared adverse-boundary verifier only. --run requires coordinator release.');
  else main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(String(error?.message || error).replace(/postgres(?:ql)?:\/\/\S+/gi, '[database URL redacted]')); process.exit(1); });
}
