// Isolated owned-database evidence only. No migration, live payment or message.
const h = require('./verify-invoice-receipt-handoff.cjs');
const { f, db, organizations } = h;
const { fs, path, crypto, assert } = f;
const { Prisma } = require('@prisma/client');
const rootModule = file => require(path.join(f.root, file));
const preparation = rootModule('services/purchasing/invoice-preparation.service.ts');
const correction = rootModule('services/purchasing/invoice-correction.service.ts');
const approval = rootModule('services/purchasing/invoice-approval.service.ts');
const returns = rootModule('services/purchasing/purchase-return-credit.service.ts');
const stock = rootModule('services/inventory/inventory-stock-event.service.ts');
const run = crypto.randomUUID();
const files = [
  'services/purchasing/receipt-invoice-capacity.ts',
  'services/purchasing/ap-control.service.ts',
  'services/purchasing/invoice-preparation.service.ts',
  'services/purchasing/invoice-correction.service.ts',
  'services/purchasing/invoice-approval.service.ts',
  'services/purchasing/invoice-receipt-recognition.ts',
  'services/purchasing/purchase-return-credit.service.ts',
  'services/purchasing/purchase-correction-ledger.service.ts',
  'services/inventory/inventory-stock-event.service.ts',
  'services/accounting/default-posting-rules.ts',
  'services/accounting/posting.service.ts',
  'services/events/business-event.service.ts',
  'services/events/business-event-anomaly.service.ts',
  'prisma/schema.prisma',
  'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-invoice-receipt-handoff.cjs',
  'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-receipt-invoice-capacity.cjs',
];
const sources = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const tables = ['goodsReceipt', 'goodsReceiptLine', 'supplierInvoice', 'supplierInvoiceLine', 'supplierInvoiceMatchException', 'threeWayMatch', 'supplierLedgerEntry', 'supplierPayment', 'supplierPaymentAllocation', 'purchaseReturn', 'purchaseReturnLine', 'supplierCreditNote', 'supplierCreditNoteLine', 'inventoryTransaction', 'inventoryLevel', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'businessEvent', 'businessEventAudit', 'businessEventAnomaly', 'businessEventOutbox', 'auditLog', 'ledgerAuditEvent', 'supplier', 'documentSequence', 'payment'];
async function snapshot(scope, models = tables) {
  return f.hash(await Promise.all(models.map(model => db[model].findMany({
    where: model === 'goodsReceiptLine' ? { goodsReceipt: scope } : model === 'inventoryLevel' ? { item: scope } : scope,
    orderBy: { id: 'asc' },
  }))));
}
const outside = () => snapshot({ organizationId: { notIn: organizations } });
const state = x => snapshot({ organizationId: x.organizationId });
const economicState = x => snapshot({ organizationId: x.organizationId }, tables.filter(model => !['businessEventAudit', 'businessEventAnomaly'].includes(model)));
const decimalEqual = (actual, expected) => assert.equal(new Prisma.Decimal(actual).toFixed(3), new Prisma.Decimal(expected).toFixed(3));
const report = {
  run, at: new Date().toISOString(), sourcesBefore: sources(), checks: [],
  scope: 'Owned localhost PostgreSQL; real receiving, return/reversal, invoice preparation/correction/independent approval services. Trusted fixture sessions and synthetic accounting setup. Return accounting remains setup-blocked. Receipt recognition is used only in one explicitly labelled canonical-kernel fixture, never claimed as production receipt posting. No migrations, real payments or external messages.',
  productionReceiptProducerImplemented: false,
};
async function fixture(name, received = 10) {
  const x = await h.fixture('capacity-' + name);
  await db.session.update({ where: { id: x.makerScope.sessionId }, data: { assuranceOrganizationId: x.organizationId, assuranceVerifiedAt: new Date(), assuranceLevel: 1, assuranceMethod: 'password' } });
  const receipt = await h.receive(x, received);
  return { x, receipt };
}
function draft(x, receipt, quantity, name) {
  return {
    supplierId: x.supplierId, invoiceNumber: 'OWNED-CAP-' + name + '-' + run.slice(0, 8),
    invoiceDate: new Date().toISOString().slice(0, 10), currency: 'XAF',
    documentReference: 'https://example.invalid/owned/capacity/' + run + '/' + name,
    documentSha256: crypto.createHash('sha256').update(run + name).digest('hex'),
    lines: [{ goodsReceiptLineId: receipt.lines[0].id, description: 'Owned received goods capacity', quantity: String(quantity), unitCost: '2500.00', taxRate: '0' }],
  };
}
async function prepare(x, receipt, quantity, name) {
  const d = draft(x, receipt, quantity, name);
  const preview = await preparation.previewInvoicePreparation(d, x.makerScope);
  return preparation.confirmInvoicePreparation({ draft: d, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope);
}
async function available(x, receipt, expected) {
  const result = await preparation.loadInvoicePreparationSources({ supplierId: x.supplierId }, x.makerScope);
  const row = result.receipts.find(row => row.id === receipt.lines[0].id);
  assert.ok(row, 'Actual preparation source list must retain the receipt');
  decimalEqual(row.available, expected);
  return row.available;
}
async function denyUnchanged(x, work, pattern) {
  const before = await state(x);
  await assert.rejects(work, pattern);
  assert.equal(await state(x), before, 'Denied operation must not change supplier, invoice, stock, audit, ledger, event or sequence state');
}
function returnCommand(x, receipt, quantity) {
  return { organizationId: x.organizationId, purchaseOrderId: x.purchaseOrderId, goodsReceiptId: receipt.id, postedById: x.actorId, idempotencyKey: crypto.randomUUID(), reason: 'Owned capacity verification return', occurredAt: new Date(), lines: [{ sourceGoodsReceiptLineId: receipt.lines[0].id, quantity: String(quantity) }] };
}
async function postReturn(x, receipt, quantity) {
  const result = await returns.postPurchaseReturn(returnCommand(x, receipt, quantity));
  assert.equal(result.replayed, false);
  assert.equal(result.purchaseReturn.journalEntryId, null, 'No return rule installed: do not invent posted accounting');
  const batch = await db.ledgerPostingBatch.findUniqueOrThrow({ where: { id: result.purchaseReturn.ledgerPostingBatchId } });
  assert.equal(batch.status, 'FAILED');
  const line = result.purchaseReturn.lines[0];
  const movement = await db.inventoryTransaction.findUniqueOrThrow({ where: { id: line.inventoryTransactionId } });
  decimalEqual(movement.quantity, new Prisma.Decimal(quantity).negated());
  assert.equal(movement.type, 'PURCHASE_RETURN');
  return result.purchaseReturn;
}
async function approve(x, invoiceId) {
  const result = await approval.confirmInvoiceApproval(await h.approveCommand(x, invoiceId), x.scope);
  assert.equal(result.ledgerStatus, 'POSTED');
  return result;
}
async function noPayment(x) {
  assert.equal(await db.payment.count({ where: { organizationId: x.organizationId } }), 0);
  assert.equal(await db.supplierPayment.count({ where: { organizationId: x.organizationId } }), 0);
}
async function check(name, work) {
  const started = Date.now();
  try { report.checks.push({ name, status: 'passed', ...await work(), elapsedMs: Date.now() - started }); }
  catch (error) { report.checks.push({ name, status: 'failed', error: f.safe(error), elapsedMs: Date.now() - started }); }
}
async function main() {
  await f.local.withClient(f.target, f.local.assertOwned);
  report.originalBefore = await outside();
  await check('Uninvoiced returns reduce actual source availability and prevent overbilling with no denied effects', async () => {
    const { x, receipt } = await fixture('uninvoiced');
    const returned = await postReturn(x, receipt, 3);
    decimalEqual(returned.lines[0].invoicedQuantity, 0); decimalEqual(returned.lines[0].uninvoicedQuantity, 3);
    await available(x, receipt, 7);
    await denyUnchanged(x, () => preparation.previewInvoicePreparation(draft(x, receipt, 8, 'too-many'), x.makerScope), /exceeds received and uninvoiced/);
    const invoice = await prepare(x, receipt, 7, 'seven');
    await available(x, receipt, 0);
    const self = await correction.loadInvoiceCorrectionSource({ invoiceId: invoice.invoiceId }, x.makerScope);
    decimalEqual(self.receipts.find(row => row.id === receipt.lines[0].id).available, 7);
    await denyUnchanged(x, () => correction.loadInvoiceCorrectionSource({ invoiceId: invoice.invoiceId }, x.scope), /maker|original/i);
    await noPayment(x);
    assert.equal(await db.supplierLedgerEntry.count({ where: { organizationId: x.organizationId } }), 0);
    return { organizationId: x.organizationId, invoiceId: invoice.invoiceId, netReturnedUninvoiced: '3.000', correctionCapacityExcludingOwnReservation: '7.000', returnAccounting: 'FAILED_SETUP_BLOCKER' };
  });
  await check('A prepared invoice invalidated by a later return is denied then actually corrected and independently approved', async () => {
    const { x, receipt } = await fixture('later-return');
    const prepared = await prepare(x, receipt, 8, 'original-eight');
    const oldCommand = await h.approveCommand(x, prepared.invoiceId);
    await postReturn(x, receipt, 3);
    await denyUnchanged(x, () => approval.confirmInvoiceApproval(oldCommand, x.scope), /changed|source|conditions/i);
    const preview = await approval.previewInvoiceApproval({ invoiceId: prepared.invoiceId }, x.scope);
    assert.ok(preview.blockers.includes('SOURCE_REVIEW'));
    await denyUnchanged(x, () => approval.confirmInvoiceApproval({ invoiceId: prepared.invoiceId, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.scope), /source|conditions/i);
    const loaded = await correction.loadInvoiceCorrectionSource({ invoiceId: prepared.invoiceId }, x.makerScope);
    decimalEqual(loaded.receipts.find(row => row.id === receipt.lines[0].id).available, 7);
    const nextPreparation = { ...loaded.preparation, dueDate: undefined, lines: loaded.preparation.lines.map(row => ({ ...row, quantity: '7' })), documentSha256: crypto.createHash('sha256').update(run + 'corrected-seven').digest('hex') };
    const correctionDraft = { invoiceId: prepared.invoiceId, reason: 'Supplier document corrected for three returned uninvoiced goods', preparation: nextPreparation };
    const reviewed = await correction.previewInvoiceCorrection(correctionDraft, x.makerScope);
    const command = { draft: correctionDraft, expectedRevision: reviewed.revision, idempotencyKey: crypto.randomUUID() };
    const corrected = await correction.confirmInvoiceCorrection(command, x.makerScope);
    assert.equal(corrected.preparationStatus, 'MATCHED'); assert.equal(corrected.total, '17500.00');
    const beforeRetry = await state(x); assert.equal((await correction.confirmInvoiceCorrection(command, x.makerScope)).replayed, true); assert.equal(await state(x), beforeRetry);
    await approve(x, prepared.invoiceId);
    await h.expectBalances(x, '17500.00', '0.00', '-17500.00');
    assert.equal(await db.supplierLedgerEntry.count({ where: { organizationId: x.organizationId } }), 1);
    await noPayment(x);
    return { organizationId: x.organizationId, invoiceId: prepared.invoiceId, totalAfterCorrection: corrected.total, liabilities: 1, balances: await h.balances(x), returnAccounting: 'FAILED_SETUP_BLOCKER' };
  });
  await check('A changed return quantity invalidates a previously reviewed preparation even when its invoice still fits', async () => {
    const { x, receipt } = await fixture('stale-preparation');
    const d = draft(x, receipt, 6, 'stale-six');
    const preview = await preparation.previewInvoicePreparation(d, x.makerScope);
    await postReturn(x, receipt, 3);
    await denyUnchanged(x, () => preparation.confirmInvoicePreparation({ draft: d, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope), /changed|preview/i);
    assert.equal(await db.supplierInvoice.count({ where: { organizationId: x.organizationId } }), 0);
    await available(x, receipt, 7);
    return { organizationId: x.organizationId, staleRejectedWithoutInvoice: true };
  });
  await check('An invoiced return does not subtract already-reserved quantity twice', async () => {
    const { x, receipt } = await fixture('invoiced-return');
    const first = await prepare(x, receipt, 6, 'posted-six'); await approve(x, first.invoiceId);
    const returned = await postReturn(x, receipt, 4);
    decimalEqual(returned.lines[0].invoicedQuantity, 4); decimalEqual(returned.lines[0].uninvoicedQuantity, 0);
    await available(x, receipt, 4);
    const remaining = await prepare(x, receipt, 4, 'remaining-four');
    await available(x, receipt, 0);
    await h.expectBalances(x, '15000.00', '0.00', '-15000.00'); await noPayment(x);
    return { organizationId: x.organizationId, invoiceIds: [first.invoiceId, remaining.invoiceId], capacityAfterInvoicedReturn: '4.000', balances: await h.balances(x), returnAccounting: 'FAILED_SETUP_BLOCKER' };
  });
  await check('A mixed return subtracts only its uninvoiced portion', async () => {
    const { x, receipt } = await fixture('mixed-return');
    const first = await prepare(x, receipt, 6, 'mixed-posted-six'); await approve(x, first.invoiceId);
    const returned = await postReturn(x, receipt, 8);
    decimalEqual(returned.lines[0].invoicedQuantity, 6); decimalEqual(returned.lines[0].uninvoicedQuantity, 2);
    await available(x, receipt, 2);
    await denyUnchanged(x, () => preparation.previewInvoicePreparation(draft(x, receipt, 3, 'mixed-too-many'), x.makerScope), /exceeds received and uninvoiced/);
    const last = await prepare(x, receipt, 2, 'mixed-last-two');
    await available(x, receipt, 0);
    return { organizationId: x.organizationId, invoiceIds: [first.invoiceId, last.invoiceId], invoicedReturn: '6.000', uninvoicedReturn: '2.000' };
  });
  await check('An exact full return reversal and its replay restore capacity once before another partial return', async () => {
    const { x, receipt } = await fixture('reversed-return');
    const original = await postReturn(x, receipt, 3); await available(x, receipt, 7);
    const command = { organizationId: x.organizationId, purchaseReturnId: original.id, postedById: x.actorId, idempotencyKey: crypto.randomUUID(), reason: 'Owned reversal restores returned goods', occurredAt: new Date() };
    const reversal = await returns.reversePurchaseReturn(command);
    assert.equal(reversal.replayed, false); assert.equal(reversal.purchaseReturn.reversalOfPurchaseReturnId, original.id);
    assert.equal(reversal.purchaseReturn.journalEntryId, null);
    assert.equal((await db.ledgerPostingBatch.findUniqueOrThrow({ where: { id: original.ledgerPostingBatchId } })).status, 'REVERSED');
    await available(x, receipt, 10);
    const beforeReplay = await state(x); assert.equal((await returns.reversePurchaseReturn(command)).replayed, true); assert.equal(await state(x), beforeReplay);
    await postReturn(x, receipt, 2); await available(x, receipt, 8);
    const movements = await db.inventoryTransaction.findMany({ where: { organizationId: x.organizationId } });
    decimalEqual(movements.reduce((sum, row) => sum.plus(row.quantity), new Prisma.Decimal(0)), 8);
    return { organizationId: x.organizationId, originalReturnId: original.id, reversalId: reversal.purchaseReturn.id, capacity: '8.000', stockQuantity: '8.000', journalCount: await db.journalEntry.count({ where: { organizationId: x.organizationId } }) };
  });
  await check('Fractional returns and repeated invoice lines reserve exact remaining receipt capacity', async () => {
    const { x, receipt } = await fixture('fractional', 0.3);
    await postReturn(x, receipt, '0.100'); await available(x, receipt, '0.200');
    const bad = draft(x, receipt, '0.101', 'fraction-too-many'); bad.lines.push({ ...bad.lines[0], quantity: '0.100' });
    await denyUnchanged(x, () => preparation.previewInvoicePreparation(bad, x.makerScope), /exceeds received and uninvoiced/);
    const good = draft(x, receipt, '0.100', 'fraction-exact'); good.lines.push({ ...good.lines[0] });
    const preview = await preparation.previewInvoicePreparation(good, x.makerScope);
    const result = await preparation.confirmInvoicePreparation({ draft: good, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope);
    await available(x, receipt, 0); assert.equal(result.total, '500.00');
    return { organizationId: x.organizationId, invoiceId: result.invoiceId, total: result.total, reserved: '0.200', returned: '0.100' };
  });
  await check('Concurrent return and preparation never let an invoice exceed post-return approval capacity', async () => {
    const { x, receipt } = await fixture('concurrent');
    const d = draft(x, receipt, 8, 'race-eight'), preview = await preparation.previewInvoicePreparation(d, x.makerScope);
    const results = await Promise.allSettled([
      preparation.confirmInvoicePreparation({ draft: d, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope),
      postReturn(x, receipt, 3),
    ]);
    assert.equal(results[1].status, 'fulfilled', 'The actual return must finish');
    if (results[0].status === 'fulfilled') {
      const invoiceId = results[0].value.invoiceId, review = await approval.previewInvoiceApproval({ invoiceId }, x.scope);
      assert.ok(review.blockers.includes('SOURCE_REVIEW'));
      await denyUnchanged(x, () => approval.confirmInvoiceApproval({ invoiceId, expectedRevision: review.revision, idempotencyKey: crypto.randomUUID() }, x.scope), /source|conditions/i);
    } else assert.match(String(results[0].reason.message), /changed|exceeds received and uninvoiced|concurrent|deadlock|write conflict/i);
    assert.equal(await db.supplierLedgerEntry.count({ where: { organizationId: x.organizationId } }), 0);
    assert.equal(await db.supplierInvoice.count({ where: { organizationId: x.organizationId, status: 'POSTED' } }), 0);
    await noPayment(x);
    return { organizationId: x.organizationId, preparation: results[0].status, approvalBlocked: true, returnCommitted: true };
  });
  await check('A recognized receipt with a return retains the separate accounting review requirement', async () => {
    const { x, receipt } = await fixture('recognized-restriction');
    await h.recognizeReceipt(x, receipt);
    await postReturn(x, receipt, 3); await available(x, receipt, 7);
    const prepared = await prepare(x, receipt, 7, 'recognized-seven');
    const preview = await approval.previewInvoiceApproval({ invoiceId: prepared.invoiceId }, x.scope);
    assert.ok(preview.blockers.includes('SOURCE_REVIEW'));
    await denyUnchanged(x, () => approval.confirmInvoiceApproval({ invoiceId: prepared.invoiceId, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.scope), /source|conditions/i);
    await h.expectBalances(x, '25000.00', '-25000.00', '0.00'); await noPayment(x);
    assert.equal(await db.supplierLedgerEntry.count({ where: { organizationId: x.organizationId } }), 0);
    return { organizationId: x.organizationId, invoiceId: prepared.invoiceId, recognizedReceiptIsKernelFixture: true, accountingBlockerPreserved: true, balances: await h.balances(x) };
  });
  await check('A posted receipt stock replay preserves accounting while altered and novel stock commands are rejected', async () => {
    const { x, receipt } = await fixture('posted-stock-replay');
    const recognized = await h.recognizeReceipt(x, receipt);
    const event = await db.businessEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceType: 'GOODS_RECEIPT', sourceId: receipt.id, eventType: 'purchase.goods_receipt.stock_posted', status: 'APPLIED' } });
    const input = {
      organizationId: event.organizationId, receiptId: event.sourceId, receiptNumber: event.payload.metadata.receiptNumber,
      receivedById: event.actorId, occurredAt: event.occurredAt, idempotencyKey: event.idempotencyKey,
      lines: event.payload.lines.map(line => ({ itemId: line.itemId, locationId: line.locationId, quantity: line.quantity, unitCost: line.unitCost, batchNumber: line.batchNumber, serialNumbers: line.serialNumbers, expiryDate: line.expiryDate ? new Date(line.expiryDate) : null })),
    };
    const before = await state(x);
    const replay = await stock.postGoodsReceiptStock(input);
    assert.equal(replay.replayed, true); assert.equal(replay.eventId, event.id); assert.equal(replay.documentHash, event.documentHash); assert.equal(replay.postingBatchId, recognized.ledgerBatch.id);
    assert.equal(await state(x), before, 'Exact stock replay must preserve posted batch metadata, journal/source links, stock, events, outbox and audits');
    const beforeMismatch = await economicState(x);
    const auditBefore = await db.businessEventAudit.count({ where: { organizationId: x.organizationId, businessEventId: event.id, action: 'IDEMPOTENCY_CONFLICT' } });
    await assert.rejects(() => stock.postGoodsReceiptStock({ ...input, lines: input.lines.map((line, index) => index ? line : { ...line, quantity: new Prisma.Decimal(line.quantity).plus(1).toString() }) }), error => error.code === 'IDEMPOTENCY_CONFLICT');
    assert.equal(await economicState(x), beforeMismatch, 'Mismatched retry may record conflict evidence but must preserve all economic effects');
    assert.equal(await db.businessEventAudit.count({ where: { organizationId: x.organizationId, businessEventId: event.id, action: 'IDEMPOTENCY_CONFLICT' } }), auditBefore + 1);
    assert.equal(await db.businessEventAnomaly.count({ where: { organizationId: x.organizationId, businessEventId: event.id, anomalyType: 'IDEMPOTENCY_PAYLOAD_CONFLICT' } }), 1);
    await denyUnchanged(x, () => stock.postGoodsReceiptStock({ ...input, idempotencyKey: 'owned-novel-receipt-line:' + crypto.randomUUID() }), /finalized receipt or stock posting/);
    const afterBatch = await db.ledgerPostingBatch.findUniqueOrThrow({ where: { id: recognized.ledgerBatch.id } });
    assert.equal(afterBatch.status, 'POSTED');
    await h.expectBalances(x, '25000.00', '-25000.00', '0.00'); await noPayment(x);
    return { organizationId: x.organizationId, receiptId: receipt.id, postingBatchId: afterBatch.id, exactReplayUnchanged: true, mismatchRejectedWithConflictEvidence: true, novelStockEventRejected: true, receiptRecognitionIsKernelFixture: true, balances: await h.balances(x) };
  });
  report.passed = report.checks.length === 10 && report.checks.every(row => row.status === 'passed');
}
main().catch(error => { report.error = f.safe(error); report.passed = false; }).finally(async () => {
  try { report.originalAfter = await outside(); report.originalUnchanged = report.originalBefore === report.originalAfter; }
  catch (error) { report.snapshotError = f.safe(error); report.originalUnchanged = false; }
  report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
  await db.$disconnect();
  const file = 'receipt-invoice-capacity-' + run + '.json';
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ file, passed: report.passed, checks: report.checks, error: report.error, snapshotError: report.snapshotError, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged }));
  process.exitCode = !report.passed || !report.sourceStable || !report.originalUnchanged ? 1 : 0;
});
