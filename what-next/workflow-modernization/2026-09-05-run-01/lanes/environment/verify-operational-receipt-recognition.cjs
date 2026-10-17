// Owned local fixtures only. Receipt journals must come from real receiving or
// explicit authorized recovery; this driver never manufactures receipt journals.
const h = require('./verify-invoice-receipt-handoff.cjs');
const { f, db } = h, { fs, path, crypto, assert } = f;
const { Prisma } = require('@prisma/client');
const fromRoot = file => require(path.join(f.root, file));
const receiving = fromRoot('services/purchase-order/purchase-receiving-workbench.service.ts');
const preparation = fromRoot('services/purchasing/invoice-preparation.service.ts');
const approval = fromRoot('services/purchasing/invoice-approval.service.ts');
const returns = fromRoot('services/purchasing/purchase-return-credit.service.ts');
const recovery = fromRoot('services/purchase-order/receipt-ledger-recovery.service.ts');
const sourceService = fromRoot('services/purchase-order/receipt-recognition-source.ts');
const rules = fromRoot('services/accounting/posting-rules.service.ts');
const { DEFAULT_AP_POSTING_RULES } = fromRoot('services/accounting/default-posting-rules.ts');
const run = crypto.randomUUID();
const files = [
  'services/purchase-order/purchase-order.service.ts', 'services/purchase-order/purchase-receiving-workbench.service.ts',
  'services/purchase-order/purchase-receipt-accounting-evidence.ts', 'services/purchase-order/receipt-recognition-source.ts',
  'services/purchase-order/receipt-recognition.service.ts', 'services/purchase-order/receipt-ledger-recovery.service.ts',
  'services/purchasing/receipt-return-recognition.ts', 'services/purchasing/purchase-return-credit.service.ts',
  'services/purchasing/purchase-correction-ledger.service.ts', 'services/purchasing/invoice-receipt-recognition.ts',
  'services/purchasing/receipt-invoice-capacity.ts', 'services/accounting/close-assurance-pack.service.ts',
  'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-operational-receipt-recognition.cjs',
];
function sources() { return { ...h.sources(), ...Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')])) }; }
const report = { run, at: new Date().toISOString(), checks: [], scope: 'Owned localhost PostgreSQL, actual authenticated receiving/preparation/approval/recovery services and actual source-bound returns. Synthetic accounts, rules and fixture sessions are not professional approval. No fabricated receipt journals, real payments, messages, migrations or production certification.' };
async function stable() {
  return f.hash({ common: await h.stable(), returns: await db.purchaseReturn.findMany({ where: { organizationId: { notIn: h.organizations } }, include: { lines: true }, orderBy: { id: 'asc' } }) });
}
async function fixture(name, options = {}) {
  const x = await h.fixture('operational-' + run + '-' + name, options);
  x.currency = options.currency || 'USD';
  await db.organization.update({ where: { id: x.organizationId }, data: { currency: x.currency } });
  await db.role.update({ where: { id: x.checkerRoleId }, data: { permissions: ['purchases.orders.read', 'purchasing.ap.invoice.post'] } });
  await db.chartOfAccount.create({ data: { organizationId: x.organizationId, mappingKey: 'SUPPLIER_RETURN_CLAIM', code: '409', type: 'ASSET', normalBalance: 'DEBIT', nameEn: 'Owned synthetic supplier return claim', syscohadaClass: '4', syscohadaReference: 'Synthetic test, not statutory approval' } });
  const template = DEFAULT_AP_POSTING_RULES.find(rule => rule.sourceType === 'PURCHASE_RETURN'); assert.ok(template);
  await rules.createPostingRule(x.organizationId, template, x.actorId);
  x.receiptRule = await db.postingRule.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceType: 'GOODS_RECEIPT', postingPurpose: 'GOODS_RECEIPT' } });
  return x;
}
async function receive(x, quantity = 10, expected = 'posted') {
  const draft = { kind: 'receive', orderId: x.purchaseOrderId, inspectionOutcome: 'PASSED', inspectionReason: 'Owned actual inventory recognition', items: [{ lineId: x.lineId, receivedQuantity: quantity }] };
  const preview = await receiving.previewPurchaseReceiving(draft, x.makerScope);
  const command = { draft: preview.draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() };
  const result = await receiving.confirmPurchaseReceiving(command, x.makerScope);
  assert.equal(result.stockStatus, 'recorded'); assert.equal(result.accountingStatus, expected);
  const receipt = await db.goodsReceipt.findUniqueOrThrow({ where: { id: result.goodsReceiptId }, include: { lines: true } });
  return { receipt, result, command };
}
async function prepare(x, receipt, quantity, name = crypto.randomUUID()) {
  const draft = { supplierId: x.supplierId, invoiceNumber: 'OWNED-OP-' + name, invoiceDate: new Date().toISOString().slice(0, 10), currency: x.currency,
    documentReference: 'https://example.invalid/owned/receipt-recognition/' + run + '/' + name,
    documentSha256: crypto.createHash('sha256').update(run + name).digest('hex'),
    lines: [{ goodsReceiptLineId: receipt.lines[0].id, description: 'Owned received stock', quantity: String(quantity), unitCost: receipt.lines[0].unitCost.toString(), taxRate: '0' }] };
  const preview = await preparation.previewInvoicePreparation(draft, x.makerScope);
  return preparation.confirmInvoicePreparation({ draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope);
}
async function approve(x, invoiceId) {
  const preview = await approval.previewInvoiceApproval({ invoiceId }, x.scope);
  assert.deepEqual(preview.blockers, []);
  return approval.confirmInvoiceApproval({ invoiceId, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.scope);
}
async function returnGoods(x, receipt, quantity) {
  return returns.postPurchaseReturn({ organizationId: x.organizationId, purchaseOrderId: x.purchaseOrderId, goodsReceiptId: receipt.id,
    postedById: x.actorId, idempotencyKey: crypto.randomUUID(), reason: 'Owned return against actual receipt recognition',
    lines: [{ sourceGoodsReceiptLineId: receipt.lines[0].id, quantity: String(quantity) }] }, db);
}
async function balances(x) {
  // Both original and reversing entries remain economic evidence. Excluding the
  // original REVERSED journal would count the reversal twice.
  const rows = await db.journalEntryLine.findMany({ where: { organizationId: x.organizationId, journalEntry: { status: { in: ['POSTED', 'REVERSED'] }, postedAt: { not: null } } }, include: { account: { select: { mappingKey: true } } } });
  const totals = Object.fromEntries(['INVENTORY', 'GRNI', 'ACCOUNTS_PAYABLE', 'SUPPLIER_RETURN_CLAIM', 'INVENTORY_VARIANCE'].map(key => [key, new Prisma.Decimal(0)]));
  for (const line of rows) { assert.equal(line.currency, x.currency); const key = line.account.mappingKey; totals[key] = (totals[key] || new Prisma.Decimal(0)).plus(line.debit).minus(line.credit); }
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value.toFixed(2)]));
}
async function count(x, model, extra = {}) { return db[model].count({ where: { organizationId: x.organizationId, ...extra } }); }
async function check(name, work) { const start = Date.now(); try { const data = await work(); report.checks.push({ name, status: 'passed', elapsedMs: Date.now() - start, ...data }); } catch (error) { report.checks.push({ name, status: 'failed', elapsedMs: Date.now() - start, error: f.safe(error), stack: f.safe(error.stack || error) }); process.exitCode = 1; } console.log(JSON.stringify(report.checks.at(-1))); }
async function main() {
  await f.local.withClient(f.target, f.local.assertOwned);
  report.sourcesBefore = sources(); report.originalBefore = await stable();
  await check('Actual receipt posts once in tenant currency, partial invoices consume accrual once', async () => {
    const x = await fixture('partial'), { receipt, result, command } = await receive(x);
    assert.equal(await count(x, 'journalEntry'), 1); assert.equal(await count(x, 'inventoryTransaction'), 1);
    const original = await h.effects(x);
    await receiving.confirmPurchaseReceiving(command, x.makerScope); assert.equal(await h.effects(x), original);
    const source = await db.$transaction(tx => sourceService.readReceiptRecognitionSource(tx, x.organizationId, receipt.id));
    assert.equal(source.manifest.currency, 'USD'); assert.equal(source.manifest.effectiveAt, receipt.inventoryPostedAt.toISOString());
    for (const quantity of [6, 4]) { const prepared = await prepare(x, receipt, quantity); await approve(x, prepared.invoiceId); }
    assert.deepEqual(await balances(x), { INVENTORY: '25000.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-25000.00', SUPPLIER_RETURN_CLAIM: '0.00', INVENTORY_VARIANCE: '0.00' });
    assert.equal(await count(x, 'journalEntry'), 3); assert.equal(await count(x, 'inventoryTransaction'), 1); assert.equal(await count(x, 'supplierLedgerEntry'), 2);
    return { organizationId: x.organizationId, receiptId: receipt.id, result, balances: await balances(x) };
  });
  await check('Uninvoiced return releases actual GRNI; remaining invoice consumes only seven', async () => {
    const x = await fixture('uninvoiced-return'), { receipt } = await receive(x);
    const returned = await returnGoods(x, receipt, 3); assert.ok(returned.purchaseReturn.journalEntryId);
    const prepared = await prepare(x, receipt, 7); await approve(x, prepared.invoiceId);
    assert.deepEqual(await balances(x), { INVENTORY: '17500.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-17500.00', SUPPLIER_RETURN_CLAIM: '0.00', INVENTORY_VARIANCE: '0.00' });
    assert.equal(await count(x, 'inventoryTransaction'), 2);
    return { organizationId: x.organizationId, receiptId: receipt.id, returnId: returned.purchaseReturn.id, balances: await balances(x) };
  });
  await check('Mixed invoiced and uninvoiced return separates claim from remaining accrual', async () => {
    const x = await fixture('mixed-return'), { receipt } = await receive(x);
    await approve(x, (await prepare(x, receipt, 6)).invoiceId);
    const returned = await returnGoods(x, receipt, 8); assert.ok(returned.purchaseReturn.journalEntryId);
    assert.equal(returned.purchaseReturn.lines[0].invoicedQuantity.toString(), '6'); assert.equal(returned.purchaseReturn.lines[0].uninvoicedQuantity.toString(), '2');
    await approve(x, (await prepare(x, receipt, 2)).invoiceId);
    assert.deepEqual(await balances(x), { INVENTORY: '5000.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-20000.00', SUPPLIER_RETURN_CLAIM: '15000.00', INVENTORY_VARIANCE: '0.00' });
    return { organizationId: x.organizationId, returnId: returned.purchaseReturn.id, balances: await balances(x) };
  });
  await check('Exact return reversal restores source allocation once without replacing receipt journal', async () => {
    const x = await fixture('reversal'), { receipt } = await receive(x), returned = await returnGoods(x, receipt, 3);
    const command = { organizationId: x.organizationId, purchaseReturnId: returned.purchaseReturn.id, postedById: x.actorId, idempotencyKey: crypto.randomUUID(), reason: 'Owned exact return reversal' };
    const reversed = await returns.reversePurchaseReturn(command, db), before = await h.effects(x);
    await returns.reversePurchaseReturn(command, db); assert.equal(await h.effects(x), before);
    await approve(x, (await prepare(x, receipt, 10)).invoiceId);
    assert.deepEqual(await balances(x), { INVENTORY: '25000.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-25000.00', SUPPLIER_RETURN_CLAIM: '0.00', INVENTORY_VARIANCE: '0.00' });
    assert.equal(await count(x, 'journalEntry', { sourceType: 'GOODS_RECEIPT' }), 1);
    return { organizationId: x.organizationId, returnId: returned.purchaseReturn.id, reversalId: reversed.purchaseReturn.id, balances: await balances(x) };
  });
  await check('Missing receipt rule prevents invoice fallback; authorized recovery posts only accounting', async () => {
    const x = await fixture('recovery'); await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: false } });
    const { receipt } = await receive(x, 10, 'review_required'), prepared = await prepare(x, receipt, 10), before = await h.effects(x);
    await assert.rejects(() => approve(x, prepared.invoiceId)); assert.equal(await h.effects(x), before);
    await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: true } });
    const input = { orderId: x.purchaseOrderId, receiptId: receipt.id }, preview = await recovery.previewReceiptLedgerRecovery(input, x.scope);
    assert.deepEqual(preview.blockers, []);
    const command = { ...input, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() };
    const posted = await recovery.confirmReceiptLedgerRecovery(command, x.scope); assert.equal(posted.ledgerStatus, 'POSTED');
    const replayBefore = await h.effects(x), replay = await recovery.confirmReceiptLedgerRecovery(command, x.scope);
    assert.equal(replay.journalEntryId, posted.journalEntryId); assert.equal(await h.effects(x), replayBefore); assert.equal(await count(x, 'inventoryTransaction'), 1);
    await approve(x, prepared.invoiceId); assert.equal((await balances(x)).GRNI, '0.00');
    return { organizationId: x.organizationId, receiptId: receipt.id, journalEntryId: posted.journalEntryId, stockMovementCount: 1 };
  });
  await check('Recovery rejects stale rule, missing authority and cross-tenant receipt without effects', async () => {
    const x = await fixture('recovery-boundaries'); await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: false } });
    const { receipt } = await receive(x, 10, 'review_required');
    await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: true } });
    const input = { orderId: x.purchaseOrderId, receiptId: receipt.id }, preview = await recovery.previewReceiptLedgerRecovery(input, x.scope);
    await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { priority: x.receiptRule.priority + 1 } });
    const before = await h.effects(x);
    await assert.rejects(() => recovery.confirmReceiptLedgerRecovery({ ...input, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.scope));
    assert.equal(await h.effects(x), before);
    const other = await fixture('other-tenant');
    await assert.rejects(() => recovery.previewReceiptLedgerRecovery(input, other.scope)); assert.equal(await h.effects(x), before);
    await db.role.update({ where: { id: x.checkerRoleId }, data: { permissions: ['purchases.orders.read'] } });
    await assert.rejects(() => recovery.previewReceiptLedgerRecovery(input, x.scope)); assert.equal(await h.effects(x), before);
    await db.role.update({ where: { id: x.checkerRoleId }, data: { permissions: ['purchases.orders.read', 'purchasing.ap.invoice.post'] } });
    await db.session.update({ where: { id: x.scope.sessionId }, data: { assuranceVerifiedAt: null } });
    const fresh = await recovery.previewReceiptLedgerRecovery(input, x.scope); assert.equal(fresh.requiresFreshAuth, true);
    await assert.rejects(() => recovery.confirmReceiptLedgerRecovery({ ...input, expectedRevision: fresh.revision, idempotencyKey: crypto.randomUUID() }, x.scope)); assert.equal(await h.effects(x), before);
    return { organizationId: x.organizationId, receiptId: receipt.id, staleAuthorityTenantAndFreshAuthDenied: true };
  });
  await check('Concurrent exact receipt recovery converges on one journal and no new stock', async () => {
    const x = await fixture('recovery-concurrent'); await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: false } });
    const { receipt } = await receive(x, 10, 'review_required'); await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: true } });
    const input = { orderId: x.purchaseOrderId, receiptId: receipt.id }, preview = await recovery.previewReceiptLedgerRecovery(input, x.scope);
    const command = { ...input, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() };
    const attempts = await Promise.allSettled([recovery.confirmReceiptLedgerRecovery(command, x.scope), recovery.confirmReceiptLedgerRecovery(command, x.scope)]);
    assert.ok(attempts.some(result => result.status === 'fulfilled'));
    const retried = await recovery.confirmReceiptLedgerRecovery(command, x.scope); assert.equal(retried.ledgerStatus, 'POSTED');
    assert.equal(await count(x, 'journalEntry', { sourceType: 'GOODS_RECEIPT' }), 1); assert.equal(await count(x, 'inventoryTransaction'), 1);
    return { organizationId: x.organizationId, receiptId: receipt.id, attempts: attempts.map(result => result.status === 'fulfilled' ? { status: result.status, journalEntryId: result.value.journalEntryId } : { status: result.status, error: f.safe(result.reason) }), retryJournalEntryId: retried.journalEntryId };
  });
  await check('Blocked receipt and physical return recover atomically, preserve history and consume seven', async () => {
    const x = await fixture('receipt-return-recovery'); await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: false } });
    const { receipt } = await receive(x, 10, 'review_required'), returned = await returnGoods(x, receipt, 3);
    assert.equal(returned.purchaseReturn.journalEntryId, null); assert.equal(await count(x, 'journalEntry'), 0);
    const returnHash = f.hash(returned.purchaseReturn);
    await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: true } });
    const input = { orderId: x.purchaseOrderId, receiptId: receipt.id }, preview = await recovery.previewReceiptLedgerRecovery(input, x.scope);
    assert.deepEqual(preview.blockers, []); assert.equal(preview.returns.length, 1);
    const command = { ...input, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() };
    const posted = await recovery.confirmReceiptLedgerRecovery(command, x.scope); assert.equal(posted.ledgerStatus, 'POSTED'); assert.equal(posted.returnOutcomes.length, 1);
    const originalReturn = await db.purchaseReturn.findUniqueOrThrow({ where: { id: returned.purchaseReturn.id }, include: { lines: true } });
    assert.equal(f.hash(originalReturn), returnHash); assert.equal(originalReturn.journalEntryId, null);
    assert.equal(await count(x, 'businessEvent', { eventType: 'purchase.return.accounting_resolved' }), 1);
    const before = await h.effects(x); await recovery.confirmReceiptLedgerRecovery(command, x.scope); assert.equal(await h.effects(x), before);
    assert.equal(await count(x, 'inventoryTransaction'), 2); assert.equal(await count(x, 'journalEntry'), 2);
    await approve(x, (await prepare(x, receipt, 7)).invoiceId);
    assert.deepEqual(await balances(x), { INVENTORY: '17500.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-17500.00', SUPPLIER_RETURN_CLAIM: '0.00', INVENTORY_VARIANCE: '0.00' });
    return { organizationId: x.organizationId, receiptId: receipt.id, returnId: originalReturn.id, receiptJournal: posted.journalEntryId, returnJournal: posted.returnOutcomes[0].journalEntryId, immutableReturnPreserved: true };
  });
  await check('Return rule failure rolls original receipt recovery back without partial journal', async () => {
    const x = await fixture('atomic-return-failure'); await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: false } });
    const { receipt } = await receive(x, 10, 'review_required'); await returnGoods(x, receipt, 3);
    await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: true } });
    const rule = await db.postingRule.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceType: 'PURCHASE_RETURN' }, include: { lines: true } });
    const grni = rule.lines.find(line => line.mappingKey === 'GRNI'); assert.ok(grni);
    await db.postingRuleLine.update({ where: { id: grni.id }, data: { mappingKey: 'ACCOUNTS_PAYABLE' } });
    const input = { orderId: x.purchaseOrderId, receiptId: receipt.id }, preview = await recovery.previewReceiptLedgerRecovery(input, x.scope), before = await h.effects(x);
    await assert.rejects(() => recovery.confirmReceiptLedgerRecovery({ ...input, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.scope));
    assert.equal(await h.effects(x), before); assert.equal(await count(x, 'journalEntry'), 0); assert.equal(await count(x, 'inventoryTransaction'), 2);
    return { organizationId: x.organizationId, receiptId: receipt.id, partialReceiptPostingPrevented: true };
  });
  await check('Closed original period blocks recovery without moving its effective date', async () => {
    const x = await fixture('closed-period'); await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: false } });
    const { receipt } = await receive(x, 10, 'review_required'); await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: true } });
    const period = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, startDate: { lte: receipt.inventoryPostedAt }, endDate: { gte: receipt.inventoryPostedAt } } });
    await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED' } });
    const input = { orderId: x.purchaseOrderId, receiptId: receipt.id }, preview = await recovery.previewReceiptLedgerRecovery(input, x.scope), before = await h.effects(x);
    assert.ok(preview.blockers.includes('PERIOD_UNAVAILABLE')); assert.equal(preview.effectiveAt, receipt.inventoryPostedAt.toISOString());
    await assert.rejects(() => recovery.confirmReceiptLedgerRecovery({ ...input, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.scope)); assert.equal(await h.effects(x), before);
    return { organizationId: x.organizationId, receiptId: receipt.id, effectiveAt: preview.effectiveAt, originalPeriodClosed: true };
  });
  await check('Held stock has no accrual until independently accepted at its acceptance date', async () => {
    const x = await fixture('held-acceptance');
    await db.role.update({ where: { id: x.checkerRoleId }, data: { permissions: ['purchases.orders.read', 'purchases.orders.receive', 'purchasing.ap.invoice.post'] } });
    const draft = { kind: 'receive', orderId: x.purchaseOrderId, inspectionOutcome: 'INCOMPLETE', inspectionReason: 'Owned inspection awaiting independent acceptance', items: [{ lineId: x.lineId, receivedQuantity: 10 }] };
    const heldPreview = await receiving.previewPurchaseReceiving(draft, x.makerScope);
    const held = await receiving.confirmPurchaseReceiving({ draft, expectedRevision: heldPreview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope);
    assert.equal(held.disposition, 'HELD'); assert.equal(await count(x, 'inventoryTransaction'), 0); assert.equal(await count(x, 'journalEntry'), 0);
    const resolve = { kind: 'resolve', orderId: x.purchaseOrderId, goodsReceiptId: held.goodsReceiptId, decision: 'ACCEPT', reason: 'Owned independent inspection acceptance' };
    const preview = await receiving.previewPurchaseReceiving(resolve, x.scope);
    const accepted = await receiving.confirmPurchaseReceiving({ draft: resolve, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.scope);
    assert.equal(accepted.accountingStatus, 'posted');
    const source = await db.$transaction(tx => sourceService.readReceiptRecognitionSource(tx, x.organizationId, held.goodsReceiptId));
    const journal = await db.journalEntry.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceType: 'GOODS_RECEIPT' } });
    assert.equal(source.manifest.acceptance.kind, 'resolution'); assert.equal(source.manifest.acceptance.actorId, x.checkerId);
    assert.equal(source.manifest.effectiveAt, source.manifest.acceptance.at); assert.equal(journal.entryDate.toISOString(), source.manifest.effectiveAt);
    return { organizationId: x.organizationId, receiptId: held.goodsReceiptId, acceptanceDate: source.manifest.effectiveAt, journalId: journal.id };
  });
  await check('Zero-value stock remains recorded without an accounting blocker or journal', async () => {
    const x = await fixture('zero-value');
    await db.purchaseOrderLine.update({ where: { id: x.lineId }, data: { unitCost: '0', lineTotal: '0' } });
    await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { subtotal: '0', total: '0' } });
    const { receipt, result } = await receive(x, 10, 'not_required');
    assert.equal(await count(x, 'journalEntry'), 0); assert.equal(await count(x, 'inventoryTransaction'), 1);
    assert.equal(await count(x, 'ledgerPostingBatch', { status: 'FAILED' }), 0);
    return { organizationId: x.organizationId, receiptId: receipt.id, accountingStatus: result.accountingStatus };
  });
  await check('Non-stock receipt has no stock accrual and its invoice retains source-based posting', async () => {
    const x = await fixture('non-stock'), line = await db.purchaseOrderLine.findUniqueOrThrow({ where: { id: x.lineId } });
    await db.item.update({ where: { id: line.itemId }, data: { trackInventory: false } });
    const draft = { kind: 'receive', orderId: x.purchaseOrderId, inspectionOutcome: 'PASSED', inspectionReason: 'Owned non-stock receipt', items: [{ lineId: x.lineId, receivedQuantity: 10 }] };
    const preview = await receiving.previewPurchaseReceiving(draft, x.makerScope);
    const result = await receiving.confirmPurchaseReceiving({ draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope);
    assert.equal(result.accountingStatus, 'not_required'); assert.equal(result.stockStatus, 'unavailable');
    assert.equal(await count(x, 'journalEntry'), 0); assert.equal(await count(x, 'inventoryTransaction'), 0);
    const receipt = await db.goodsReceipt.findUniqueOrThrow({ where: { id: result.goodsReceiptId }, include: { lines: true } });
    const source = await db.$transaction(tx => sourceService.readReceiptRecognitionSource(tx, x.organizationId, receipt.id)); assert.equal(source.inventoryValue.toString(), '0');
    await approve(x, (await prepare(x, receipt, 10)).invoiceId);
    assert.equal(await count(x, 'journalEntry'), 1); assert.equal((await balances(x)).GRNI, '0.00');
    return { organizationId: x.organizationId, receiptId: receipt.id, receiptAccrualRequired: false, invoiceJournalCount: 1, scopeNote: 'Existing invoice mapping retained; this does not certify a statutory expense policy.' };
  });
  await check('Supplier credit waits for actual return claim, then clears recovered claim once', async () => {
    const x = await fixture('return-credit'), { receipt } = await receive(x);
    const prepared = await prepare(x, receipt, 10); await approve(x, prepared.invoiceId);
    const invoice = await db.supplierInvoice.findUniqueOrThrow({ where: { id: prepared.invoiceId }, include: { lines: true } });
    const returnRule = await db.postingRule.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceType: 'PURCHASE_RETURN' } });
    await db.postingRule.update({ where: { id: returnRule.id }, data: { isActive: false } });
    const returned = await returnGoods(x, receipt, 3); assert.equal(returned.purchaseReturn.journalEntryId, null);
    const credit = { organizationId: x.organizationId, purchaseReturnId: returned.purchaseReturn.id, supplierInvoiceId: invoice.id,
      postedById: x.actorId, idempotencyKey: crypto.randomUUID(), creditNoteNumber: 'OWNED-CREDIT-' + run,
      creditDate: new Date(), documentHash: crypto.createHash('sha256').update(run + 'credit').digest('hex'), reason: 'Owned actual supplier credit after source claim recovery',
      lines: [{ sourcePurchaseReturnLineId: returned.purchaseReturn.lines[0].id, sourceSupplierInvoiceLineId: invoice.lines[0].id }] };
    const before = await h.effects(x);
    await assert.rejects(() => returns.postSupplierCreditNote(credit, db)); assert.equal(await h.effects(x), before);
    assert.equal(await count(x, 'supplierCreditNote'), 0);
    await db.postingRule.update({ where: { id: returnRule.id }, data: { isActive: true } });
    const input = { orderId: x.purchaseOrderId, receiptId: receipt.id }, preview = await recovery.previewReceiptLedgerRecovery(input, x.scope);
    assert.deepEqual(preview.blockers, []); assert.equal(preview.returns.length, 1);
    const recovered = await recovery.confirmReceiptLedgerRecovery({ ...input, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.scope);
    assert.equal(recovered.returnOutcomes.length, 1); assert.equal(await count(x, 'journalEntry', { sourceType: 'GOODS_RECEIPT' }), 1);
    const template = DEFAULT_AP_POSTING_RULES.find(rule => rule.sourceType === 'SUPPLIER_CREDIT_NOTE'); assert.ok(template);
    await rules.createPostingRule(x.organizationId, template, x.actorId);
    const posted = await returns.postSupplierCreditNote(credit, db); assert.ok(posted.supplierCreditNote.journalEntryId);
    const beforeReplay = await h.effects(x); await returns.postSupplierCreditNote(credit, db); assert.equal(await h.effects(x), beforeReplay);
    assert.deepEqual(await balances(x), { INVENTORY: '17500.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-17500.00', SUPPLIER_RETURN_CLAIM: '0.00', INVENTORY_VARIANCE: '0.00' });
    return { organizationId: x.organizationId, receiptId: receipt.id, returnId: returned.purchaseReturn.id, creditId: posted.supplierCreditNote.id, nonexistentClaimDenied: true, balances: await balances(x) };
  });
  for (const organizationId of h.organizations) assert.equal(await db.payment.count({ where: { organizationId } }), 0);
}
async function runMain() {
  try { await main(); } catch (error) { report.error = f.safe(error); process.exitCode = 1; }
  finally {
    report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
    report.originalAfter = await stable(); report.originalUnchanged = report.originalBefore === report.originalAfter;
    report.passed = !report.error && report.checks.length > 0 && report.checks.every(check => check.status === 'passed') && report.sourceStable && report.originalUnchanged;
    report.fixtureOrganizations = h.organizations;
    const file = path.join(__dirname, 'operational-receipt-recognition-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ file, passed: report.passed, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged }));
    await db.$disconnect(); if (!report.passed) process.exitCode = 1;
  }
}
if (require.main === module) runMain();
module.exports = { ...h, fixture, receive, prepare, approve, returnGoods, balances, sources, stable, recovery, receiving, sourceService };
