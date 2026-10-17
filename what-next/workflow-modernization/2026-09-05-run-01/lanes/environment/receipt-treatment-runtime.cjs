// Explicitly released, isolated local verification only. No migrations or seeds.
// Synthetic fixture decisions and chart accounts are not professional approval.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Run --run after the owner releases the current source contract.');
} else {
  const h = require('./verify-operational-receipt-recognition.cjs');
  const fractional = require('./verify-fractional-receipt-valuation.cjs');
  const { f, db } = h, { fs, path, crypto, assert } = f;
  const fromRoot = file => require(path.join(f.root, file));
  const preparation = fromRoot('services/purchasing/invoice-preparation.service.ts');
  const approval = fromRoot('services/purchasing/invoice-approval.service.ts');
  const recovery = fromRoot('services/purchasing/invoice-ledger-recovery.service.ts');
  const exceptions = fromRoot('services/purchasing/invoice-match-exception.service.ts');
  const returns = fromRoot('services/purchasing/purchase-return-credit.service.ts');
  const rules = fromRoot('services/accounting/posting-rules.service.ts');
  const { hashBusinessPayload } = fromRoot('services/events/business-event.service.ts');
  const run = crypto.randomUUID(), cases = ['mixed', 'nonstock', 'zero-stock', 'positive-stock'];
  const selected = process.argv[3] === '--case' ? process.argv[4] : null;
  assert.ok(process.argv.length === 3 || process.argv.length === 5 && process.argv[3] === '--case');
  assert.ok(selected === null || cases.includes(selected));
  const report = { run, at: new Date().toISOString(), checks: [], selection: { selected, available: cases, skipped: selected ? cases.filter(id => id !== selected) : [] },
    scope: 'Existing exact owned localhost database. New synthetic organizations only; real receiving, invoice preparation, independent exception review/approval, recovery, returns and credits. No DDL, migrations, seeds, messages, payment execution or statutory approval.' };
  const files = [
    'services/purchasing/invoice-receipt-recognition.ts', 'services/purchasing/receipt-return-recognition.ts',
    'services/purchasing/ap-control.service.ts', 'services/accounting/default-posting-rules.ts',
    'services/purchasing/invoice-preparation.service.ts', 'services/purchasing/invoice-source-evidence.ts',
    'services/purchasing/invoice-preparation-evidence.ts', 'services/purchasing/invoice-preparation-authority.ts',
    'services/purchasing/invoice-approval.service.ts', 'services/purchasing/invoice-ledger-recovery.service.ts',
    'services/purchasing/invoice-match-exception.service.ts', 'services/purchasing/invoice-match-exception-authority.ts',
    'services/purchasing/purchase-return-credit.service.ts', 'services/purchasing/supplier-credit-allocation.ts',
    'services/accounting/posting-rules.service.ts', 'services/accounting/periods.service.ts',
    'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/receipt-treatment-runtime.cjs',
  ];
  const sources = () => ({ ...fractional.sources(), ...Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')])) });
  const count = (x, model, extra = {}) => db[model].count({ where: { organizationId: x.organizationId, ...extra } });
  async function stable() {
    const outside = { organizationId: { notIn: h.organizations } };
    return f.hash({ common: await fractional.stable(), extra: await Promise.all([
      db.item.findMany({ where: outside, orderBy: { id: 'asc' } }),
      db.supplierInvoiceMatchException.findMany({ where: outside, orderBy: { id: 'asc' } }),
    ]) });
  }
  async function fixture(name, stockCost, nonstock = false, locale = 'en') {
    const x = await h.fixture('treatment-' + name, { currency: 'USD', locale });
    const line = await db.purchaseOrderLine.findUniqueOrThrow({ where: { id: x.lineId } });
    const order = await db.purchaseOrder.findUniqueOrThrow({ where: { id: x.purchaseOrderId } });
    x.itemId = line.itemId; x.locationId = order.locationId;
    await db.item.update({ where: { id: x.itemId }, data: { trackInventory: !nonstock, costPrice: stockCost } });
    await db.purchaseOrderLine.update({ where: { id: x.lineId }, data: { orderedQuantity: '1.000', unitCost: stockCost, lineTotal: stockCost } });
    await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { subtotal: stockCost, total: stockCost } });
    return x;
  }
  async function addNonstock(x, cost) {
    const item = await db.item.create({ data: { organizationId: x.organizationId, slug: 'owned-nonstock-' + run, sku: 'OWNED-NONSTOCK-' + run,
      nameEn: 'Owned non-stock service arithmetic fixture', imageUrls: [], trackInventory: false, costPrice: cost, sellingPrice: cost } });
    const line = await db.purchaseOrderLine.create({ data: { purchaseOrderId: x.purchaseOrderId, itemId: item.id, orderedQuantity: '1.000', unitCost: cost, lineTotal: cost } });
    await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { subtotal: '30.00', total: '30.00' } });
    x.nonstockItemId = item.id; x.nonstockLineId = line.id;
    return line;
  }
  async function receive(x, lineIds, expectedStock, expectedAccounting) {
    const draft = { kind: 'receive', orderId: x.purchaseOrderId, inspectionOutcome: 'PASSED', inspectionReason: 'Owned stock versus non-stock treatment verification',
      items: lineIds.map(lineId => ({ lineId, receivedQuantity: 1 })) };
    const preview = await h.receiving.previewPurchaseReceiving(draft, x.makerScope);
    const command = { draft: preview.draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() };
    const result = await h.receiving.confirmPurchaseReceiving(command, x.makerScope);
    assert.equal(result.stockStatus, expectedStock); assert.equal(result.accountingStatus, expectedAccounting);
    const receipt = await db.goodsReceipt.findUniqueOrThrow({ where: { id: result.goodsReceiptId }, include: { lines: { orderBy: { id: 'asc' } } } });
    const before = await fractional.effects(x); await h.receiving.confirmPurchaseReceiving(command, x.makerScope); assert.equal(await fractional.effects(x), before);
    return receipt;
  }
  async function prepare(x, receipt, overrideCost) {
    const draft = { supplierId: x.supplierId, invoiceNumber: 'OWNED-TREATMENT-' + crypto.randomUUID(), invoiceDate: new Date().toISOString().slice(0, 10), currency: x.currency,
      documentReference: 'https://example.invalid/owned/receipt-treatment/' + run, documentSha256: crypto.createHash('sha256').update(run + x.organizationId).digest('hex'),
      lines: receipt.lines.map(line => ({ goodsReceiptLineId: line.id, description: 'Owned source-specific invoice treatment', quantity: '1', unitCost: overrideCost ?? line.unitCost.toFixed(2), taxRate: '0' })) };
    const preview = await preparation.previewInvoicePreparation(draft, x.makerScope);
    const result = await preparation.confirmInvoicePreparation({ draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope);
    return result.invoiceId;
  }
  async function approve(x, invoiceId) {
    const preview = await approval.previewInvoiceApproval({ invoiceId }, x.scope); assert.deepEqual(preview.blockers, []);
    const command = { invoiceId, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() };
    const result = await approval.confirmInvoiceApproval(command, x.scope);
    const before = await fractional.effects(x); const replay = await approval.confirmInvoiceApproval(command, x.scope);
    assert.equal(replay.replayed, true); assert.equal(await fractional.effects(x), before);
    return result;
  }
  async function nonstockAccount(x) {
    return db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: '621', mappingKey: 'OWNED_NON_STOCK_TREATMENT', type: 'EXPENSE', normalBalance: 'DEBIT',
      nameEn: 'Owned deliberately selected non-stock expense', syscohadaClass: '6', syscohadaReference: 'Synthetic arithmetic fixture only; no statutory treatment approval' } });
  }
  async function recipe(x, mode) {
    await db.postingRule.updateMany({ where: { organizationId: x.organizationId, sourceType: 'SUPPLIER_INVOICE' }, data: { isActive: false } });
    return rules.createPostingRule(x.organizationId, { code: 'OWNED-TREATMENT-' + mode.toUpperCase(), nameEn: 'Owned explicit non-stock treatment ' + mode,
      sourceType: 'SUPPLIER_INVOICE', postingPurpose: 'SUPPLIER_INVOICE', priority: 1, lines: [
        { lineNumber: 1, side: 'DEBIT', mappingKey: mode === 'control' ? 'INVENTORY' : mode === 'receivables' ? 'ACCOUNTS_RECEIVABLE' : 'OWNED_NON_STOCK_TREATMENT', amountSource: 'SOURCE_AMOUNT',
          ...(mode === 'implicit' ? {} : { condition: { receiptResidualTreatment: 'NON_STOCK' } }) },
        { lineNumber: 2, side: 'DEBIT', mappingKey: 'GRNI', amountSource: 'COST_AMOUNT', condition: { receiptRecognition: 'ACCRUAL' } },
        { lineNumber: 3, side: 'DEBIT', mappingKey: 'INPUT_VAT', amountSource: 'TAX_AMOUNT' },
        { lineNumber: 4, side: 'CREDIT', mappingKey: 'ACCOUNTS_PAYABLE', amountSource: 'GROSS_AMOUNT' },
        { lineNumber: 5, side: 'DEBIT', mappingKey: 'INVENTORY_VARIANCE', amountSource: 'VARIANCE_AMOUNT', condition: { receiptVarianceDirection: 'DEBIT' } },
        { lineNumber: 6, side: 'CREDIT', mappingKey: 'INVENTORY_VARIANCE', amountSource: 'VARIANCE_AMOUNT', condition: { receiptVarianceDirection: 'CREDIT' } },
      ] }, x.actorId);
  }
  async function recover(x, invoiceId) {
    const preview = await recovery.previewInvoiceLedgerRecovery({ invoiceId }, x.scope); assert.deepEqual(preview.blockers, []);
    const command = { invoiceId, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() };
    return { command, result: await recovery.confirmInvoiceLedgerRecovery(command, x.scope) };
  }
  async function proof(x, invoiceId, version, allocations, residualSources) {
    const invoice = await db.supplierInvoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { lines: true } });
    assert.equal(invoice.organizationId, x.organizationId);
    const recognition = invoice.metadata.receiptRecognition;
    assert.equal(recognition.version, version); assert.equal(recognition.allocations.length, allocations);
    if (version === 3) assert.equal(recognition.residualSources.length, residualSources); else assert.equal(recognition.residualSources, undefined);
    const event = await db.businessEvent.findUniqueOrThrow({ where: { id: invoice.postedBusinessEventId } });
    assert.equal(event.payloadHash, hashBusinessPayload(event.payload)); assert.equal(event.payload.receiptRecognitionHash, hashBusinessPayload(recognition));
    assert.equal(event.actorId, x.checkerId); assert.notEqual(invoice.createdById, event.actorId);
    return { invoice, recognition, approvalHash: f.hash(event) };
  }
  async function expectedBalances(x, expected) {
    const balances = await h.balances(x);
    for (const [key, value] of Object.entries(expected)) assert.equal(balances[key] ?? '0.00', value, key);
    return balances;
  }
  async function journalLines(x, id) {
    const journal = await db.journalEntry.findFirstOrThrow({ where: { id, organizationId: x.organizationId }, include: { lines: { include: { account: true } } } });
    assert.ok(journal.postedAt); assert.ok(['POSTED', 'REVERSED'].includes(journal.status));
    return journal.lines.map(line => ({ key: line.account.mappingKey, debit: line.debit.toFixed(2), credit: line.credit.toFixed(2) })).sort((a, b) => a.key.localeCompare(b.key));
  }
  async function check(id, work) {
    if (selected && selected !== id) return;
    const started = Date.now();
    try { report.checks.push({ id, status: 'passed', ...await work(), elapsedMs: Date.now() - started }); }
    catch (error) { report.checks.push({ id, status: 'failed', error: f.safe(error), stack: f.safe(error.stack || error), elapsedMs: Date.now() - started }); }
    console.log(JSON.stringify(report.checks.at(-1)));
  }
  async function main() {
    await f.local.withClient(f.target, f.local.assertOwned);
    report.sourcesBefore = sources(); report.originalBefore = await stable();
    await check('mixed', async () => {
      const x = await fixture('mixed', '25.00'); await addNonstock(x, '5.00'); const expense = await nonstockAccount(x);
      await db.chartOfAccount.create({ data: { organizationId: x.organizationId, code: '411', mappingKey: 'ACCOUNTS_RECEIVABLE', type: 'ASSET', normalBalance: 'DEBIT', isControlAccount: false,
        nameEn: 'Owned receivables mapping cannot absorb non-stock expense', syscohadaClass: '4', syscohadaReference: 'Synthetic forbidden-account verification only' } });
      const receipt = await receive(x, [x.lineId, x.nonstockLineId], 'recorded', 'posted');
      const invoiceId = await prepare(x, receipt), blocked = await approve(x, invoiceId);
      assert.equal(blocked.ledgerStatus, 'BLOCKED_PENDING_RULES'); assert.equal(blocked.blockerCode, 'AP_NON_STOCK_TREATMENT_REVIEW');
      const initial = await proof(x, invoiceId, 3, 1, 1);
      assert.equal(initial.recognition.residualSources[0].invoiceNet, '5.00');
      assert.equal(await count(x, 'journalEntry'), 1); assert.equal(await count(x, 'supplierLedgerEntry'), 1);
      const invalidResults = [];
      for (const mode of ['implicit', 'control', 'receivables', 'foreign-currency']) {
        if (mode === 'foreign-currency') await db.chartOfAccount.update({ where: { id: expense.id }, data: { currency: 'EUR' } });
        await recipe(x, mode); const attempt = await recover(x, invoiceId);
        assert.equal(attempt.result.ledgerStatus, 'BLOCKED_PENDING_RULES'); assert.equal(attempt.result.blockerCode, 'AP_NON_STOCK_TREATMENT_REVIEW');
        assert.equal(await count(x, 'journalEntry'), 1); assert.equal(await count(x, 'supplierLedgerEntry'), 1);
        invalidResults.push({ mode, blockerCode: attempt.result.blockerCode, postingBatchId: attempt.result.postingBatchId, ...(mode === 'foreign-currency' ? { invoiceCurrency: 'USD', accountCurrency: 'EUR' } : {}) });
      }
      await db.chartOfAccount.update({ where: { id: expense.id }, data: { currency: null } });
      const configured = await recipe(x, 'explicit');
      const stale = await recovery.previewInvoiceLedgerRecovery({ invoiceId }, x.scope); assert.deepEqual(stale.blockers, []);
      await db.postingRule.update({ where: { id: configured.id }, data: { priority: configured.priority + 1 } });
      const beforeStale = await fractional.effects(x);
      await assert.rejects(() => recovery.confirmInvoiceLedgerRecovery({ invoiceId, expectedRevision: stale.revision, idempotencyKey: crypto.randomUUID() }, x.scope), /changed|preview/i);
      assert.equal(await fractional.effects(x), beforeStale);
      const recovered = await recover(x, invoiceId); assert.equal(recovered.result.ledgerStatus, 'POSTED');
      const before = await fractional.effects(x); assert.equal((await recovery.confirmInvoiceLedgerRecovery(recovered.command, x.scope)).replayed, true); assert.equal(await fractional.effects(x), before);
      assert.equal((await proof(x, invoiceId, 3, 1, 1)).approvalHash, initial.approvalHash);
      assert.equal(await count(x, 'journalEntry'), 2); assert.equal(await count(x, 'supplierLedgerEntry'), 1); assert.equal(await count(x, 'inventoryTransaction'), 1);
      assert.equal(await db.inventoryLevel.count({ where: { itemId: x.nonstockItemId } }), 0);
      return { organizationId: x.organizationId, receiptId: receipt.id, invoiceId, initialBlocker: blocked.blockerCode, invalidResults, staleDenied: true, exactRetry: true, retainedApprovalUnchanged: true,
        balances: await expectedBalances(x, { INVENTORY: '25.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-30.00', OWNED_NON_STOCK_TREATMENT: '5.00', INVENTORY_VARIANCE: '0.00' }), stock: await fractional.inspectStock(x, '1.000', '25.00'), journal: await journalLines(x, recovered.result.journalEntryId) };
    });
    await check('nonstock', async () => {
      const x = await fixture('nonstock', '5.00', true); await nonstockAccount(x);
      await db.postingRule.update({ where: { id: x.invoiceRuleId }, data: { isActive: false } });
      const receipt = await receive(x, [x.lineId], 'unavailable', 'not_required'), invoiceId = await prepare(x, receipt), blocked = await approve(x, invoiceId);
      assert.equal(blocked.ledgerStatus, 'BLOCKED_PENDING_RULES'); assert.equal(blocked.blockerCode, 'AP_POSTING_RULE_REVIEW');
      const initial = await proof(x, invoiceId, 3, 0, 1);
      assert.equal(await count(x, 'journalEntry'), 0); assert.equal(await count(x, 'inventoryTransaction'), 0);
      await recipe(x, 'explicit'); const recovered = await recover(x, invoiceId); assert.equal(recovered.result.ledgerStatus, 'POSTED');
      const before = await fractional.effects(x); await recovery.confirmInvoiceLedgerRecovery(recovered.command, x.scope); assert.equal(await fractional.effects(x), before);
      assert.equal((await proof(x, invoiceId, 3, 0, 1)).approvalHash, initial.approvalHash);
      assert.equal(await count(x, 'journalEntry'), 1); assert.equal(await count(x, 'supplierLedgerEntry'), 1); assert.equal(await count(x, 'inventoryTransaction'), 0);
      assert.equal(await db.inventoryLevel.count({ where: { itemId: x.itemId } }), 0);
      return { organizationId: x.organizationId, receiptId: receipt.id, invoiceId, initialBlocker: blocked.blockerCode, retainedApprovalUnchanged: true,
        balances: await expectedBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-5.00', OWNED_NON_STOCK_TREATMENT: '5.00', INVENTORY_VARIANCE: '0.00' }), journal: await journalLines(x, recovered.result.journalEntryId) };
    });
    await check('zero-stock', async () => {
      const x = await fixture('zero-stock', '0.00'); await fractional.creditRule(x);
      const receipt = await receive(x, [x.lineId], 'recorded', 'not_required'), invoiceId = await prepare(x, receipt, '5.00');
      await db.role.update({ where: { id: x.checkerRoleId }, data: { permissions: ['purchases.orders.read', 'purchasing.ap.invoice.post', 'purchasing.ap.match.review'] } });
      const request = { kind: 'request', invoiceId, reason: 'Owned five-dollar source price exception', evidenceReference: 'https://example.invalid/owned/receipt-treatment/' + run, expiresAt: new Date(Date.now() + 3600000).toISOString() };
      const requestPreview = await exceptions.previewInvoiceMatchException(request, x.makerScope); assert.deepEqual(requestPreview.blockers, []);
      const requested = await exceptions.confirmInvoiceMatchException({ draft: request, expectedRevision: requestPreview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope);
      const review = { kind: 'review', invoiceId, exceptionId: requested.exceptionId, decision: 'APPROVE', decisionReason: 'Owned independent synthetic price difference acceptance' };
      const reviewPreview = await exceptions.previewInvoiceMatchException(review, x.scope); assert.deepEqual(reviewPreview.blockers, []);
      await exceptions.confirmInvoiceMatchException({ draft: review, expectedRevision: reviewPreview.revision, idempotencyKey: crypto.randomUUID() }, x.scope);
      const posted = await approve(x, invoiceId); assert.equal(posted.ledgerStatus, 'POSTED');
      const retained = await proof(x, invoiceId, 3, 1, 0), allocation = retained.recognition.allocations[0];
      assert.equal(allocation.accountingStatus, 'NOT_REQUIRED'); assert.equal(allocation.receiptBatchId, null); assert.equal(allocation.receiptJournalId, null); assert.equal(allocation.receiptCost, '0.00'); assert.equal(allocation.invoiceNet, '5.00');
      await expectedBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-5.00', INVENTORY_VARIANCE: '5.00' });
      const command = { organizationId: x.organizationId, purchaseOrderId: x.purchaseOrderId, goodsReceiptId: receipt.id, postedById: x.actorId, idempotencyKey: crypto.randomUUID(), reason: 'Owned zero-cost stock return after positive invoice', lines: [{ sourceGoodsReceiptLineId: receipt.lines[0].id, quantity: '1' }] };
      const returned = await returns.postPurchaseReturn(command, db); assert.equal(returned.ledgerStatus, 'NOT_REQUIRED');
      assert.equal(returned.purchaseReturn.lines[0].invoicedQuantity.toFixed(3), '1.000');
      const movement = await db.inventoryTransaction.findFirstOrThrow({ where: { organizationId: x.organizationId, type: 'PURCHASE_RETURN', referenceId: returned.purchaseReturn.id } }); assert.equal(movement.totalCost.toFixed(2), '0.00');
      const creditCommand = fractional.creditCommand(x, retained.invoice, { result: returned }, 'positive-after-zero');
      const credited = await returns.postSupplierCreditNote(creditCommand, db); assert.equal(credited.ledgerStatus, 'POSTED'); assert.equal(credited.supplierCreditNote.total.toFixed(2), '5.00');
      const lines = await journalLines(x, credited.supplierCreditNote.journalEntryId);
      assert.deepEqual(lines, [{ key: 'ACCOUNTS_PAYABLE', debit: '5.00', credit: '0.00' }, { key: 'INVENTORY_VARIANCE', debit: '0.00', credit: '5.00' }]);
      const cleared = await expectedBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '0.00', INVENTORY_VARIANCE: '0.00', SUPPLIER_RETURN_CLAIM: '0.00' });
      const reverseCommand = { organizationId: x.organizationId, supplierCreditNoteId: credited.supplierCreditNote.id, postedById: x.actorId, idempotencyKey: crypto.randomUUID(), creditNoteNumber: 'OWNED-TREATMENT-REVERSE-' + run, creditDate: new Date(), documentHash: crypto.createHash('sha256').update(run + 'reverse').digest('hex'), reason: 'Owned exact positive credit reversal' };
      const reversed = await returns.reverseSupplierCreditNote(reverseCommand, db); assert.equal(reversed.ledgerStatus, 'POSTED');
      assert.deepEqual(await journalLines(x, reversed.supplierCreditNote.journalEntryId), lines.map(line => ({ key: line.key, debit: line.credit, credit: line.debit })));
      const before = await fractional.effects(x); await returns.postPurchaseReturn(command, db); await returns.postSupplierCreditNote(creditCommand, db); await returns.reverseSupplierCreditNote(reverseCommand, db); assert.equal(await fractional.effects(x), before);
      return { organizationId: x.organizationId, receiptId: receipt.id, invoiceId, exceptionId: requested.exceptionId, returnId: returned.purchaseReturn.id, creditId: credited.supplierCreditNote.id, reversalId: reversed.supplierCreditNote.id,
        zeroStockRecognition: allocation, creditLines: lines, cleared, balances: await expectedBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-5.00', INVENTORY_VARIANCE: '5.00', SUPPLIER_RETURN_CLAIM: '0.00' }), stock: await fractional.inspectStock(x, '0.000', '0.00') };
    });
    await check('positive-stock', async () => {
      const x = await fixture('positive', '25.00'), receipt = await receive(x, [x.lineId], 'recorded', 'posted');
      const invoiceId = await prepare(x, receipt), posted = await approve(x, invoiceId); assert.equal(posted.ledgerStatus, 'POSTED');
      const retained = await proof(x, invoiceId, 2, 1, 0); assert.equal(retained.recognition.allocations[0].accountingStatus, undefined);
      return { organizationId: x.organizationId, receiptId: receipt.id, invoiceId, recognitionVersion: 2,
        balances: await expectedBalances(x, { INVENTORY: '25.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-25.00', INVENTORY_VARIANCE: '0.00' }), stock: await fractional.inspectStock(x, '1.000', '25.00') };
    });
    for (const organizationId of h.organizations) assert.equal(await db.payment.count({ where: { organizationId } }), 0);
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); report.stack = f.safe(error.stack || error); }
    finally {
      try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.originalAfter = await stable(); report.originalUnchanged = report.originalBefore === report.originalAfter; }
      catch (error) { report.finalizationError = f.safe(error); }
      report.fixtureOrganizations = [...h.organizations];
      report.passed = !report.error && !report.finalizationError && report.checks.length === (selected ? 1 : cases.length) && report.checks.every(check => check.status === 'passed') && report.sourceStable && report.originalUnchanged;
      const file = path.join(__dirname, 'receipt-treatment-runtime-' + run + '.json');
      fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  module.exports = { h, f, db, sources, stable, fixture, receive, prepare, approve, nonstockAccount, recipe, proof, expectedBalances };
  if (require.main === module) runMain();
}
