const f = require('./supplier-ack-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const service = require(path.join(f.root, 'services/purchase-order/purchase-receiving-workbench.service.ts'));
const file = 'services/purchase-order/purchase-receiving-workbench.service.ts', source = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex');
const stamp = crypto.randomUUID(), defect = process.argv.includes('--expect-defect'), multiline = process.argv.includes('--multi-line'), result = { at: new Date().toISOString(), sourceBefore: { [file]: source() }, expectedDefect: defect, multiline, syntheticNegativeFixture: true };
async function main() {
  await f.local.withClient(f.target, f.local.assertOwned);
  const x = await f.fixture('en', 'receipt-posting-truth-' + stamp, { skipInvite: true });
  await db.role.update({ where: { id: x.roleId }, data: { permissions: ['purchases.orders.read', 'purchases.orders.receive'] } });
  const session = await db.session.findUniqueOrThrow({ where: { id: x.sessionId } });
  const scope = { organizationId: x.organizationId, actorId: x.actorId, sessionId: session.id, sessionToken: session.token };
  await require(path.join(f.root, 'services/accounting/periods.service.ts')).createFiscalYearWithPeriods(x.organizationId, { name: 'Owned receipt 2026', startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2026-12-31T23:59:59.999Z') }, x.actorId);
  const items = [{ lineId: x.lineId, receivedQuantity: 1 }];
  if (multiline) {
    const item = await db.item.create({ data: { organizationId: x.organizationId, sku: 'SECOND', slug: 'second', nameEn: 'Synthetic second item', imageUrls: [], costPrice: '1000' } });
    const line = await db.purchaseOrderLine.create({ data: { purchaseOrderId: x.purchaseOrderId, itemId: item.id, orderedQuantity: '3', unitCost: '1000', lineTotal: '3000' } });
    await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { subtotal: '28000', total: '28000' } });
    items.push({ lineId: line.id, receivedQuantity: 1 });
  }
  const preview = await service.previewPurchaseReceiving({ kind: 'receive', orderId: x.purchaseOrderId, inspectionOutcome: 'PASSED', inspectionReason: 'Synthetic receipt evidence', items }, scope);
  const decision = await service.confirmPurchaseReceiving({ draft: preview.draft, expectedRevision: preview.revision, idempotencyKey: 'owned-receipt-truth-' + stamp }, scope);
  assert.equal(decision.stockStatus, 'recorded'); assert.equal(decision.accountingStatus, 'review_required');
  const batch = await db.ledgerPostingBatch.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceId: decision.goodsReceiptId, sourceType: 'GOODS_RECEIPT' } });
  // Negative fixture only: a status flag without journal evidence must never establish a posting.
  await db.ledgerPostingBatch.update({ where: { id: batch.id }, data: { status: 'POSTED', postedAt: new Date(), errorMessage: null } });
  const before = f.hash(await db.ledgerPostingBatch.findUniqueOrThrow({ where: { id: batch.id } }));
  const start = Date.now(), view = await service.getPurchaseReceivingWorkbench(x.purchaseOrderId, scope), row = view.receipts.find(row => row.id === decision.goodsReceiptId);
  assert.ok(row); assert.equal(row.accountingStatus, defect ? 'posted' : 'unverified');
  assert.equal(f.hash(await db.ledgerPostingBatch.findUniqueOrThrow({ where: { id: batch.id } })), before);
  for (const model of ['journalEntry', 'accountingSourceLink', 'payment']) assert.equal(await db[model].count({ where: { organizationId: x.organizationId } }), 0);
  Object.assign(result, { organizationId: x.organizationId, orderId: x.purchaseOrderId, receiptId: decision.goodsReceiptId, stockStatus: row.stockStatus, accountingStatus: row.accountingStatus, noReadTimeMutation: true, negativeProbeHadNoJournalLinkOrPayment: true, readMs: Date.now() - start });
  if (!defect) {
    // Restore only the deliberately corrupted owned fixture to its actual failed state.
    await db.ledgerPostingBatch.update({ where: { id: batch.id }, data: { status: batch.status, postedAt: batch.postedAt, errorMessage: batch.errorMessage } });
    const { Prisma } = require('@prisma/client'), scopeData = { organizationId: x.organizationId };
    for (const [mappingKey, code, type, normalBalance] of [['INVENTORY', '310', 'ASSET', 'DEBIT'], ['GRNI', '408', 'LIABILITY', 'CREDIT']]) await db.chartOfAccount.create({ data: { ...scopeData, mappingKey, code, type, normalBalance, nameEn: 'Synthetic receipt proof ' + mappingKey, syscohadaClass: code[0], syscohadaReference: 'Synthetic fixture only' } });
    await db.journal.create({ data: { ...scopeData, code: 'INV', nameEn: 'Synthetic receipt proof', type: 'INVENTORY', isDefault: true } });
    await require(path.join(f.root, 'services/accounting/posting-rules.service.ts')).createPostingRule(x.organizationId, { code: 'OWNED-RECEIPT-EVIDENCE', nameEn: 'Synthetic receipt kernel verification only', sourceType: 'GOODS_RECEIPT', postingPurpose: 'GOODS_RECEIPT', lines: [{ lineNumber: 1, mappingKey: 'INVENTORY', side: 'DEBIT', amountSource: 'SOURCE_AMOUNT' }, { lineNumber: 2, mappingKey: 'GRNI', side: 'CREDIT', amountSource: 'SOURCE_AMOUNT' }] }, x.actorId);
    const receipt = await db.goodsReceipt.findUniqueOrThrow({ where: { id: decision.goodsReceiptId }, include: { purchaseOrder: true } });
    const event = await db.businessEvent.findFirstOrThrow({ where: { ...scopeData, sourceId: receipt.id, eventType: 'purchase.goods_receipt.stock_posted' } });
    const value = new Prisma.Decimal(multiline ? 3500 : 2500);
    const input = { ...scopeData, periodId: batch.periodId, sourceType: 'GOODS_RECEIPT', sourceId: receipt.id, sourceNumber: receipt.receiptNumber, sourceDate: receipt.receiptDate, postingPurpose: 'GOODS_RECEIPT', journalType: 'INVENTORY', journalPrefix: 'APINV', actorId: x.actorId, supplierId: receipt.purchaseOrder.supplierId, currency: 'XAF', memo: 'Synthetic receipt kernel proof; not an implemented receipt producer', documentHash: batch.metadata.documentHash, amounts: { sourceAmount: value, netAmount: value, grossAmount: value, taxAmount: new Prisma.Decimal(0) }, blockerCode: 'OWNED_TEST', blockerMessage: 'Synthetic rules missing' };
    const { createAPLedgerPosting } = require(path.join(f.root, 'services/purchasing/ap-control.service.ts'));
    const posted = await db.$transaction(tx => createAPLedgerPosting(tx, input)); assert.equal(posted.ledgerStatus, 'POSTED');
    const positive = (await service.getPurchaseReceivingWorkbench(x.purchaseOrderId, scope)).receipts.find(r => r.id === receipt.id); assert.equal(positive.accountingStatus, 'posted');
    const replay = await db.$transaction(tx => createAPLedgerPosting(tx, input)); assert.equal(replay.journalEntryId, posted.journalEntryId);
    assert.equal(await db.journalEntry.count({ where: scopeData }), 1); assert.equal(await db.accountingSourceLink.count({ where: scopeData }), 1); assert.equal(await db.inventoryTransaction.count({ where: scopeData }), items.length); assert.equal(await db.payment.count({ where: scopeData }), 0);
    result.positiveKernelEvidence = { accountingStatus: positive.accountingStatus, oneJournalAndLink: true, stockMovementCount: items.length, identicalKernelReplay: true, noPayment: true, productionReceiptProducerImplemented: false };
  }
  result.passed = true;
}
main().catch(error => { result.passed = false; result.error = f.safe(error); }).finally(async () => {
  result.sourceAfter = { [file]: source() }; result.sourceStable = JSON.stringify(result.sourceBefore) === JSON.stringify(result.sourceAfter); result.passed = !!result.passed && result.sourceStable;
  const receipt = 'receipt-posting-truth-' + (defect ? 'before-' : 'after-') + stamp + '.json'; fs.writeFileSync(path.join(__dirname, receipt), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ receipt, ...result })); await db.$disconnect(); process.exitCode = result.passed ? 0 : 1;
});
