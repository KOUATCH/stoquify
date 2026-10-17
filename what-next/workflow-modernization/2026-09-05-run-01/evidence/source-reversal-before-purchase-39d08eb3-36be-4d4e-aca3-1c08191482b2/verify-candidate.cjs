// Isolated unit verification only. No database client, network, seed or production writes.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), Module = require('node:module'), ts = require('typescript');
const { Prisma } = require('@prisma/client');
const root = process.cwd(), candidateDir = path.join(__dirname, 'candidate');
const report = { scope: 'Isolated candidate code with explicit in-memory dependencies; no database or runtime publication proof.', checks: [] };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const files = ['services/purchasing/purchase-correction-ledger.service.ts', 'services/purchasing/purchase-return-credit.service.ts', 'services/inventory/inventory-stock-event.service.ts', 'services/accounting/close-assurance-pack.service.ts'];
const sources = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
const candidates = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(candidateDir, file.replaceAll('/', '__'))))]));
class BusinessRuleError extends Error {}
class ConflictError extends Error {}
class NotFoundError extends Error {}
const errors = { BusinessRuleError, ConflictError, NotFoundError, IdempotencyConflictError: ConflictError };
const decimal = value => new Prisma.Decimal(value), originalDate = new Date('2026-08-15T12:00:00Z'), reversalDate = new Date('2026-09-15T12:00:00Z');
function load(file, mocks, candidate = true) {
  const location = candidate ? path.join(candidateDir, file.replaceAll('/', '__')) : path.join(root, file);
  const compiled = ts.transpileModule(fs.readFileSync(location, 'utf8'), { fileName: file, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } });
  assert.deepEqual((compiled.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error), [], 'Candidate syntax diagnostics');
  const mod = new Module(location);
  mod.require = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === '@prisma/client' || name === 'crypto' || name === 'zod') return require(name);
    throw Error('Unmocked candidate dependency refused: ' + name);
  };
  mod._compile(compiled.outputText, location);
  return mod.exports;
}
async function check(name, run) {
  try { await run(); report.checks.push({ name, status: 'passed' }); }
  catch (error) { report.checks.push({ name, status: 'failed', error: String(error.stack || error) }); }
}
function ledgerFixture({ posted = false, sourceType = 'PURCHASE_RETURN', batchPeriod = 'period-retained', class3 = false } = {}) {
  const trace = [], reads = [], scope = [], creates = [];
  const original = posted ? { id: 'journal-original', organizationId: 'org', journalId: 'journal', periodId: 'period-original', entryDate: originalDate,
    postingBatchId: 'batch-original', entryNumber: 'ORIGINAL', status: 'POSTED', currency: 'USD', reversedByEntries: [],
    lines: [{ accountId: 'account', account: { syscohadaClass: class3 ? '31' : '40' }, description: 'Original', debit: decimal(12), credit: decimal(0), baseDebit: decimal(14), baseCredit: decimal(0), currency: 'USD', exchangeRate: decimal('1.1667'), supplierId: 'supplier' }] } : null;
  const tx = {
    $queryRaw: async parts => { trace.push('row-lock:' + parts.join('?')); return []; },
    journalEntry: { findFirst: async query => { reads.push(query); return original; }, count: async () => 0,
      create: async args => { trace.push('journal-create'); creates.push(args.data); return { id: 'journal-reversal', ...args.data }; },
      update: async () => { trace.push('original-reversed'); return {}; } },
    ledgerPostingBatch: { findFirst: async () => ({ id: 'batch-original', periodId: batchPeriod, status: posted ? 'POSTED' : 'FAILED', journalEntries: posted ? [{ id: original.id }] : [] }),
      update: async args => { trace.push('batch-update'); return { id: args.where.id, ...args.data }; }, updateMany: async () => { trace.push('unposted-cancel'); return { count: 1 }; } },
    ledgerAuditEvent: { create: async () => { trace.push('audit'); return {}; } },
  };
  const mocks = {
    '@/services/_shared/action-errors': errors,
    '@/services/accounting/journal-close-invalidation.service': { recordOrderedReversedJournalCloseInvalidationsInTx: async (...args) => { trace.push('close-journal'); scope.push(args[2]); } },
    '@/services/accounting/close-assurance-pack.service': { recordCloseCertificationInvalidationsForSourceInTx: async (...args) => { trace.push('close-credit'); scope.push(args[2]); } },
    '@/services/inventory/inventory-close-invalidation.service': { recordInventoryValuationCloseInvalidationInTx: async (...args) => { trace.push('close-inventory'); scope.push(args[1]); } },
    '@/services/accounting/journal-reversal-order.service': { lockJournalReversalClosePeriodsInTx: async (_tx, org, input) => { assert.equal(_tx, tx); assert.equal(org, 'org'); trace.push('prepare-periods'); scope.push(input); return ['period-original', 'period-retained', 'period-reversal', 'period-later']; } },
    '@/services/accounting/periods.service': { getOpenPeriodForDate: async () => { trace.push('open-period'); return { id: 'period-reversal' }; } },
    '@/services/accounting/posting.service': { createLedgerPostingBatch: async () => { trace.push('batch-create'); return { id: 'batch-reversal' }; }, linkAccountingSource: async () => { trace.push('source-link'); return { id: 'link' }; } },
  };
  const service = load(files[0], mocks), input = { organizationId: 'org', sourceType, originalSourceId: 'source-original', originalJournalEntryId: original?.id ?? null,
    originalPostingBatchId: 'batch-original', originalSourceDate: originalDate, reversalDate };
  const command = { ...input, sourceId: 'source-reversal', sourceNumber: 'REVERSAL', sourceDate: reversalDate, supplierId: 'supplier', documentHash: 'sha256:owned', reason: 'Owned unit correction', metadata: {} };
  return { service, mocks, tx, trace, scope, creates, reads, original, input, command };
}
function ownerFixture(kind, noValue = false) {
  const trace = [], observed = {}, original = { id: 'original', organizationId: 'org', direction: 'CORRECTION', occurredAt: originalDate, creditDate: originalDate,
    goodsReceiptId: 'receipt', purchaseOrderId: 'order', supplierId: 'supplier', supplierInvoiceId: 'invoice', currency: 'USD', total: decimal(noValue ? 0 : 12),
    ledgerPostingBatchId: noValue ? null : 'batch-original', journalEntryId: noValue ? null : 'journal-original', supplierCreditNotes: [],
    supplier: { currentBalance: decimal(100) }, lines: [{ id: 'line', quantity: decimal(1), inventoryAmount: decimal(noValue ? 0 : 12), unitCost: decimal(noValue ? 0 : 12) }] };
  const written = name => async args => { trace.push(name); return { id: 'reversal', ...args?.data, lines: args?.data?.lines?.create ?? [] }; };
  const tx = { $queryRaw: async () => { trace.push('source-lock'); return []; },
    purchaseReturn: { findUnique: async () => null, findFirst: async () => original, create: written('return-record') },
    supplierCreditNote: { findUnique: async () => null, findFirst: async () => original, create: written('credit-record') },
    supplierInvoice: { findFirst: async () => ({ id: 'invoice', postedAt: originalDate }) },
    goodsReceipt: { findFirst: async () => ({ locationId: 'location' }) },
    supplier: { findFirst: async () => ({ currentBalance: decimal(100) }), update: written('supplier-balance') },
    supplierLedgerEntry: { create: written('supplier-ledger') }, auditLog: { create: written('audit') },
    ledgerPostingBatch: { count: async () => 0 }, journalEntry: { count: async () => 0 }, accountingSourceLink: { count: async () => 0 },
  };
  const prepared = { transaction: tx, organizationId: 'org', affectedPeriodIds: ['period'], reversalPeriodId: 'period' };
  const posting = { ledgerBatch: { id: 'batch-reversal' }, ledgerStatus: 'POSTED', journalEntryId: 'journal-reversal' };
  const schemas = load('services/purchasing/purchase-return-credit.schemas.ts', {}, false);
  const mocks = {
    '@/prisma/db': { db: { $transaction: async (fn, options) => { observed.options = options; return fn(tx); } } },
    '@/services/_shared/action-errors': errors,
    '@/services/events/business-event.service': { hashBusinessPayload: value => hash(JSON.stringify(value)), recordBusinessEventInTx: async (_tx, args) => { trace.push('event'); return { created: true, event: { id: 'event', ...args } }; }, markBusinessEventAppliedInTx: async () => { trace.push('applied'); } },
    '@/services/inventory/inventory-stock-event.service': { postPurchaseReturnStock: async (_input, _tx, control) => { assert.equal(_tx, tx); observed.stockControl = control; trace.push('stock'); return { eventId: 'stock-event', movementTransactionIds: ['movement'] }; } },
    '@/services/purchase-order/purchase-document-number.service': { PURCHASE_DOCUMENT_TYPE: { PURCHASE_RETURN: 'PURCHASE_RETURN' }, allocatePurchaseDocumentNumber: async () => { trace.push('number-write'); return 'RETURN-1'; } },
    './ap-control.service': {},
    './purchase-correction-ledger.service': { preparePurchaseCorrectionReversalInTx: async (_tx, input) => { assert.equal(_tx, tx); observed.preparation = input; trace.push('prepare'); return prepared; },
      reversePurchaseCorrectionLedgerInTx: async (_tx, input, proof) => { assert.equal(proof, prepared); trace.push('ledger'); return posting; },
      recordPurchaseCorrectionReversalCloseInvalidationsInTx: async (_tx, proof, input) => { assert.equal(proof, prepared); observed.final = input; trace.push('close-final'); } },
    './supplier-payment-balance': { refreshSupplierInvoiceBalanceStatus: async () => { trace.push('invoice-refresh'); } },
    './receipt-return-recognition': { retainReturnReversalRecognition: async () => noValue ? { version: 2 } : null,
      readPurchaseReturnAccountingEvidence: async () => ({ journalEntryId: original.journalEntryId }), recordReceiptReturnRecognition: async () => { trace.push('recognition'); } },
    '@/services/purchase-order/receipt-recognition-source': {}, '@/services/inventory/receipt-cost-allocation': {}, './invoice-receipt-recognition': {},
    './supplier-credit-allocation': { readSupplierCreditAllocationProof: async () => noValue ? { lines: [{ claimAmount: '0', netAllocation: { allocatedValue: '0' }, taxAllocation: { allocatedValue: '0' } }] } : null },
    '@/services/accounting/periods.service': {},
    '@/services/accounting/journal-reversal-order.service': { lockJournalReversalCatalogInTx: async () => { trace.push('catalog'); } },
    './purchase-return-credit.schemas': schemas,
  };
  const service = load(files[1], mocks), input = { organizationId: 'org', postedById: 'actor', idempotencyKey: 'owned-idempotency', reason: 'Owned unit correction', documentHash: 'sha256:owned',
    ...(kind === 'return' ? { purchaseReturnId: 'original', occurredAt: reversalDate } : { supplierCreditNoteId: 'original', creditDate: reversalDate, creditNoteNumber: 'REVERSE' }) };
  return { tx, service, mocks, trace, observed, input, original, call: control => service[kind === 'return' ? 'reversePurchaseReturn' : 'reverseSupplierCreditNote'](input, undefined, control) };
}
function stockFixture() {
  const trace = [], events = [], invalidations = [], movements = [];
  const tx = { item: { findFirst: async () => ({ id: 'item', organizationId: 'org', trackInventory: true, sku: 'OWNED', costPrice: decimal(12) }) },
    location: { findFirst: async () => ({ id: 'location', organizationId: 'org', isActive: true, deletedAt: null, allowNegativeStock: false }) },
    inventoryLevel: { findUnique: async () => ({ id: 'level', version: 1, quantityOnHand: decimal(0), quantityAvailable: decimal(0), quantityReserved: decimal(0), totalValue: decimal(0), averageCost: decimal(0) }),
      updateMany: async () => { trace.push('stock-write'); return { count: 1 }; } },
    inventoryTransaction: { create: async args => { movements.push(args.data); return { id: 'movement', ...args.data }; } }, auditLog: { create: async () => ({}) } };
  const service = load(files[2], {
    '@/prisma/db': { db: { $transaction: async () => { throw Error('Root database connection forbidden'); } } },
    '@/services/_shared/action-errors': errors,
    '@/services/accounting/posting.service': {},
    '@/services/accounting/periods.service': { getOpenPeriodForDate: async () => ({ id: 'period' }) },
    '@/services/events/business-event.service': { hashBusinessPayload: value => hash(JSON.stringify(value)), recordBusinessEventInTx: async (_tx, args) => { events.push(args); return { created: true, event: { id: 'event' } }; }, markBusinessEventAppliedInTx: async () => {} },
    './inventory-close-invalidation.service': { recordInventoryValuationCloseInvalidationInTx: async (_tx, input) => { invalidations.push(input); } },
    '@/services/purchase-order/receipt-recognition-source': {}, '@/services/purchasing/receipt-return-recognition': {},
    './inventory-errors': { ConcurrentStockUpdateError: ConflictError, InsufficientStockError: BusinessRuleError },
  });
  const input = { organizationId: 'org', purchaseReturnId: 'reversal', returnNumber: 'R-1', purchaseOrderId: 'order', goodsReceiptId: 'receipt', direction: 'REVERSAL', occurredAt: reversalDate,
    idempotencyKey: 'owned-return-stock', documentHash: 'sha256:owned', lines: [{ itemId: 'item', locationId: 'location', quantity: 1, unitCost: 12, sourceInventoryTransactionId: 'original-movement' }] };
  return { tx, service, input, trace, events, invalidations, movements };
}
async function main() {
  report.productionBefore = sources(); report.candidatesBefore = candidates();
  await check('Posted return preparation binds complete original, retained batch and cumulative scope before writes', async () => {
    const f = ledgerFixture({ posted: true }); const prepared = await f.service.preparePurchaseCorrectionReversalInTx(f.tx, f.input);
    assert.equal(prepared.transaction, f.tx); assert.equal(f.scope[0].includeLaterPeriods, true);
    assert.deepEqual(f.scope[0].additionalPeriodIds, ['period-retained']); assert.deepEqual(f.scope[0].additionalEvidenceDates, [originalDate]);
    assert.equal(f.creates.length, 0); assert.ok(f.trace.indexOf('open-period') < f.trace.indexOf('prepare-periods'));
    assert.deepEqual(f.reads[0].where, { id: 'journal-original', organizationId: 'org', sourceType: 'PURCHASE_RETURN', sourceId: 'source-original' });
  });
  await check('Exact journal mirror is separate from final invalidation and retains event-family order', async () => {
    const f = ledgerFixture({ posted: true }), prepared = await f.service.preparePurchaseCorrectionReversalInTx(f.tx, f.input);
    const posting = await f.service.reversePurchaseCorrectionLedgerInTx(f.tx, f.command, prepared);
    assert.equal(f.trace.some(item => item.startsWith('close-')), false);
    assert.equal(f.creates[0].lines.create[0].credit.toString(), '12'); assert.equal(f.creates[0].lines.create[0].baseCredit.toString(), '14');
    await f.service.recordPurchaseCorrectionReversalCloseInvalidationsInTx(f.tx, prepared, { sourceId: 'source-reversal', documentHash: 'sha256:owned', posting });
    assert.deepEqual(f.trace.filter(item => item.startsWith('close-')), ['close-journal', 'close-inventory']);
    assert.deepEqual(f.scope.at(-1).affectedPeriodIds, prepared.affectedPeriodIds);
  });
  for (const sourceType of ['PURCHASE_RETURN', 'SUPPLIER_CREDIT_NOTE']) await check(sourceType + ' unposted cancellation preserves null journal and truthful invalidation', async () => {
    const f = ledgerFixture({ sourceType }), prepared = await f.service.preparePurchaseCorrectionReversalInTx(f.tx, f.input);
    assert.equal(f.scope[0].originalPeriodId, null); assert.deepEqual(f.scope[0].additionalPeriodIds, ['period-retained']);
    const posting = await f.service.reversePurchaseCorrectionLedgerInTx(f.tx, f.command, prepared);
    assert.equal(posting, null); assert.equal(f.creates.length, 0);
    await f.service.recordPurchaseCorrectionReversalCloseInvalidationsInTx(f.tx, prepared, { sourceId: 'source-reversal', documentHash: 'sha256:owned', posting });
    assert.equal(f.trace.includes('close-journal'), false);
    if (sourceType === 'SUPPLIER_CREDIT_NOTE') { assert.equal(f.scope.at(-1).sourceCode, 'SUPPLIER_CREDIT_NOTE_REVERSED'); assert.equal(f.scope.at(-1).sourceId, 'source-reversal'); }
  });
  await check('Credit class-3 dependency opts into cumulative periods', async () => {
    for (const class3 of [false, true]) { const f = ledgerFixture({ posted: true, sourceType: 'SUPPLIER_CREDIT_NOTE', class3 }); await f.service.preparePurchaseCorrectionReversalInTx(f.tx, f.input); assert.equal(f.scope[0].includeLaterPeriods, class3); }
  });
  await check('Hidden journal, mismatched batch and closed period refuse before financial writes', async () => {
    const hidden = ledgerFixture(); hidden.tx.journalEntry.findFirst = async () => ({ id: 'hidden' });
    await assert.rejects(hidden.service.preparePurchaseCorrectionReversalInTx(hidden.tx, hidden.input), /journal evidence/); assert.equal(hidden.trace.includes('unposted-cancel'), false);
    const missing = ledgerFixture(); missing.tx.ledgerPostingBatch.findFirst = async () => null;
    await assert.rejects(missing.service.preparePurchaseCorrectionReversalInTx(missing.tx, missing.input), /inconsistent/); assert.equal(missing.trace.includes('unposted-cancel'), false);
    const closed = ledgerFixture(); closed.mocks['@/services/accounting/periods.service'].getOpenPeriodForDate = async () => { throw new BusinessRuleError('Closed period'); };
    await assert.rejects(closed.service.preparePurchaseCorrectionReversalInTx(closed.tx, closed.input), /Closed period/); assert.equal(closed.creates.length, 0);
  });
  await check('Changed tenant/date and a different transaction cannot reuse preparation', async () => {
    const f = ledgerFixture({ posted: true }), prepared = await f.service.preparePurchaseCorrectionReversalInTx(f.tx, f.input);
    await assert.rejects(f.service.reversePurchaseCorrectionLedgerInTx({}, f.command, prepared), /same transaction/);
    await assert.rejects(f.service.reversePurchaseCorrectionLedgerInTx(f.tx, { ...f.command, organizationId: 'foreign' }, prepared), /differs/);
    await assert.rejects(f.service.reversePurchaseCorrectionLedgerInTx(f.tx, { ...f.command, sourceDate: originalDate }, prepared), /differs/);
    assert.equal(f.creates.length, 0);
  });
  for (const kind of ['return', 'credit']) for (const noValue of [false, true]) await check(kind + ' owner ordering, explicit isolation and noValue=' + noValue, async () => {
    const f = ownerFixture(kind, noValue); await f.call({ assertCurrentAuthority: async () => { f.trace.push('authority'); } });
    assert.equal(f.observed.options.isolationLevel, 'ReadCommitted');
    assert.ok(f.trace.indexOf('catalog') < f.trace.indexOf('source-lock'));
    assert.ok(f.trace.indexOf('prepare') < f.trace.indexOf('authority'));
    assert.equal(f.trace.at(-1), 'close-final'); assert.equal(f.trace.includes('ledger'), !noValue);
    if (kind === 'return') { assert.ok(f.trace.indexOf('authority') < f.trace.indexOf('number-write')); assert.ok(f.trace.indexOf('stock') < f.trace.indexOf('close-final')); assert.equal(f.observed.stockControl.transaction, f.tx); assert.equal(f.observed.stockControl.deferCloseInvalidation, true); }
    else { assert.ok(f.trace.indexOf('authority') < f.trace.indexOf('event')); assert.ok(f.trace.indexOf('invoice-refresh') < f.trace.indexOf('close-final')); assert.equal(f.trace.includes('supplier-balance'), !noValue); }
  });
  for (const kind of ['return', 'credit']) await check(kind + ' post-wait authority refusal has no number, ledger, stock, balance or source effects', async () => {
    const f = ownerFixture(kind); await assert.rejects(f.call({ assertCurrentAuthority: async () => { throw Error('Fresh authority denied'); } }), /Fresh authority denied/);
    for (const write of ['number-write', 'ledger', 'stock', 'supplier-balance', 'supplier-ledger', 'return-record', 'credit-record', 'event', 'audit', 'close-final']) assert.equal(f.trace.includes(write), false, write);
  });
  for (const kind of ['return', 'credit']) await check(kind + ' exact retry preserves replay before closed-period preparation', async () => {
    const f = ownerFixture(kind), payload = kind === 'return'
      ? { command: 'REVERSE_PURCHASE_RETURN', organizationId: 'org', purchaseReturnId: 'original', occurredAt: reversalDate.toISOString(), reason: f.input.reason, documentHash: f.input.documentHash }
      : { command: 'REVERSE_SUPPLIER_CREDIT_NOTE', organizationId: 'org', supplierCreditNoteId: 'original', creditNoteNumber: 'REVERSE', creditDate: reversalDate.toISOString(), documentHash: f.input.documentHash, reason: f.input.reason };
    f.tx[kind === 'return' ? 'purchaseReturn' : 'supplierCreditNote'].findUnique = async () => ({ id: 'retained', payloadHash: 'sha256:' + hash(JSON.stringify(payload)) });
    f.mocks['@/services/accounting/journal-reversal-order.service'].lockJournalReversalCatalogInTx = async () => { throw Error('Closed/unsupported test'); };
    assert.equal((await f.call()).replayed, true); assert.deepEqual(f.trace, []);
  });
  await check('Stock same-transaction control defers invalidation without changing event payload or movement values', async () => {
    const legacy = stockFixture(), deferred = stockFixture();
    await legacy.service.postPurchaseReturnStock(legacy.input, legacy.tx);
    await deferred.service.postPurchaseReturnStock(deferred.input, deferred.tx, { transaction: deferred.tx, organizationId: 'org', affectedPeriodIds: ['period', 'later'], deferCloseInvalidation: true });
    assert.equal(legacy.invalidations.length, 1); assert.equal(deferred.invalidations.length, 0);
    assert.deepEqual(deferred.events[0].payload, legacy.events[0].payload);
    assert.equal(deferred.movements[0].quantity.toString(), '1'); assert.equal(deferred.movements[0].totalCost.toString(), '12');
    assert.equal(deferred.movements[0].reversalOfTransactionId, 'original-movement');
  });
  await check('Stock exact scope is forwarded and wrong tenant, transaction or posting period refuses before effects', async () => {
    const f = stockFixture();
    await f.service.postPurchaseReturnStock(f.input, f.tx, { transaction: f.tx, organizationId: 'org', affectedPeriodIds: ['period', 'later'] });
    assert.deepEqual(f.invalidations[0].affectedPeriodIds, ['period', 'later']);
    for (const values of [{ transaction: {} }, { organizationId: 'foreign' }, { affectedPeriodIds: [] }, { affectedPeriodIds: ['other-period'] }]) {
      const denied = stockFixture(); const control = { transaction: denied.tx, organizationId: 'org', affectedPeriodIds: ['period'], ...values };
      await assert.rejects(async () => denied.service.postPurchaseReturnStock(denied.input, denied.tx, control), /evidence scope/);
      assert.equal(denied.events.length, 0); assert.equal(denied.movements.length, 0);
    }
  });
  report.productionAfter = sources(); report.candidatesAfter = candidates();
  report.productionUnchanged = JSON.stringify(report.productionBefore) === JSON.stringify(report.productionAfter);
  report.candidatesStable = JSON.stringify(report.candidatesBefore) === JSON.stringify(report.candidatesAfter);
  report.passed = report.productionUnchanged && report.candidatesStable && report.checks.every(row => row.status === 'passed');
  const output = path.join(__dirname, 'candidate-unit-' + crypto.randomUUID() + '.json');
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output, passed: report.passed, checks: report.checks.length, failed: report.checks.filter(row => row.status !== 'passed'), productionUnchanged: report.productionUnchanged }));
  if (!report.passed) process.exitCode = 1;
}
if (require.main === module && process.argv[2] === '--run') main().catch(error => { console.error(error); process.exitCode = 1; });
else if (require.main === module) console.log('Prepared only. --run performs isolated, dependency-mocked candidate checks without any database connection.');
