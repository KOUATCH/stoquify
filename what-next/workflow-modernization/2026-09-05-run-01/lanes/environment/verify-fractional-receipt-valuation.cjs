// NEW bounded evidence driver. Run only after coordinated source freeze: --run.
// Reuses the exact localhost/connected-identity/owned-fixture guard; no seeds or migrations.
if (require.main === module && process.argv[2] !== '--run') {
  console.log('Prepared only. Explicit --run and coordinated source freeze are required.');
} else {
  const h = require('./verify-operational-receipt-recognition.cjs');
  const { f, db } = h, { fs, path, crypto, assert } = f;
  const { Prisma } = require('@prisma/client');
  const fromRoot = file => require(path.join(f.root, file));
  const returns = fromRoot('services/purchasing/purchase-return-credit.service.ts');
  const { readPurchaseReturnAccountingEvidence } = fromRoot('services/purchasing/receipt-return-recognition.ts');
  const preparation = fromRoot('services/purchasing/invoice-preparation.service.ts');
  const { readSupplierPaymentBalances } = fromRoot('services/purchasing/supplier-payment-balance.ts');
  const rules = fromRoot('services/accounting/posting-rules.service.ts');
  const periods = fromRoot('services/accounting/periods.service.ts');
  const { rebuildInventoryProjection } = fromRoot('services/inventory/inventory-projection-rebuild.service.ts');
  const { reconcileInventoryClass3 } = fromRoot('services/inventory/inventory-reconciliation.service.ts');
  const run = crypto.randomUUID();
  const caseIds = ['period-timezones', 'three-returns', 'non-tail', 'interleaving', 'zero-return-recovery', 'credit-variance', 'zero-credit', 'concurrent', 'zero-net-claim', 'zero-credit-periods', 'original-zero', 'tax-residual'];
  const selectedCase = require.main === module && process.argv[3] === '--case' ? process.argv[4] : null;
  if (require.main === module) {
    assert.ok(process.argv.length === 3 || process.argv.length === 5 && process.argv[3] === '--case', 'Use --run or --run --case <case-id>');
    assert.ok(selectedCase === null || caseIds.includes(selectedCase), 'Unknown case ID');
  }
  const scenarioCount = selectedCase ? 1 : caseIds.length;
  const zeroCreditMigration = 'prisma/migrations/20260930231500_supplier_credit_zero_value_evidence/migration.sql';
  const sourceFiles = [
    'services/inventory/receipt-cost-allocation.ts', 'services/inventory/inventory-stock-event.service.ts',
    'services/inventory/inventory-projection-rebuild.service.ts', 'services/inventory/inventory-reconciliation.service.ts',
    'services/purchasing/receipt-return-recognition.ts', 'services/purchasing/purchase-return-credit.service.ts',
    'services/purchasing/supplier-payment-balance.ts', 'services/purchasing/supplier-credit-allocation.ts',
    'services/purchasing/purchase-return-credit.schemas.ts', 'services/purchasing/purchase-correction-ledger.service.ts',
    'services/purchasing/invoice-receipt-recognition.ts', 'services/purchasing/ap-control.service.ts',
    'services/purchase-order/receipt-ledger-recovery-contracts.ts', 'services/purchase-order/receipt-ledger-recovery.service.ts',
    'services/accounting/default-posting-rules.ts', 'services/accounting/posting-rules.service.ts',
    'services/accounting/periods.service.ts',
    'services/accounting/posting.service.ts', 'services/events/business-event.service.ts',
    'scripts/disposable-fixture-guard.js', 'prisma/schema.prisma', zeroCreditMigration,
    'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/registration-local.cjs',
    'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/statement-recipient-fixtures.cjs',
    'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/supplier-ack-fixtures.cjs',
    'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-fractional-receipt-valuation.cjs',
  ];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(sourceFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')])) });
  const report = { run, at: new Date().toISOString(), checks: [], selection: { mode: selectedCase ? 'single-case' : 'all', requestedCase: selectedCase, availableCount: caseIds.length, selectedCount: scenarioCount, skippedCaseIds: selectedCase ? caseIds.filter(id => id !== selectedCase) : [] }, scope: 'Only new owned synthetic organizations in the existing exact localhost database. Actual receiving, independent invoice approval, returns, credits and recovery services; explicit synthetic sessions/rules are not professional approval. No migration, seeds, external messages, live payments, production or certification.' };
  const amount = value => new Prisma.Decimal(value);
  const scoped = organizationId => ({ organizationId });
  const count = (x, model, extra = {}) => db[model].count({ where: { ...scoped(x.organizationId), ...extra } });
  async function assertZeroCreditMigration() {
    const sql = fs.readFileSync(path.join(f.root, zeroCreditMigration));
    const sha256 = crypto.createHash('sha256').update(sql).digest('hex');
    assert.equal(sha256, '4e56dc79850e0937c8671500da573373f8d0aff8a4f45cf1527255684d464eec', 'Reviewed zero-credit migration source must be present and unchanged');
    return f.local.withClient(f.target, async client => {
      await f.local.assertOwned(client);
      const expected = {
        supplier_credit_nonnegative_amounts: ['supplier_credit_notes', 'CHECKsubtotal>=0ANDtaxAmount>=0ANDtotal>=0ANDsubtotal+taxAmount=total'],
        supplier_credit_line_nonnegative_amounts: ['supplier_credit_note_lines', 'CHECKunitCost>=0ANDtaxRate>=0ANDtaxAmount>=0ANDlineTotal>=0'],
        supplier_credit_line_positive_quantity: ['supplier_credit_note_lines', 'CHECKquantity>0'],
      };
      const { rows } = await client.query('SELECT c.conname, c.convalidated, t.relname, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=current_schema() AND c.conname=ANY($1::text[]) ORDER BY c.conname', [Object.keys(expected)]);
      assert.equal(rows.length, 3, 'Existing owned database requires the separately applied reviewed zero-credit migration');
      for (const row of rows) {
        const normalized = row.definition.replace(/::numeric/g, '').replace(/[\s"()]/g, '');
        assert.equal(row.relname, expected[row.conname][0]); assert.equal(row.convalidated, true);
        assert.equal(normalized, expected[row.conname][1], 'Zero-credit migration must be applied by the owner before this driver; no DDL is performed here');
      }
      return { file: zeroCreditMigration, sha256, appliedConstraintDefinitions: rows };
    });
  }
  async function stable() {
    const outside = { organizationId: { notIn: h.organizations } };
    return f.hash({ common: await h.stable(), added: await Promise.all([
      db.inventoryLevel.findMany({ where: { item: outside }, orderBy: { id: 'asc' } }),
      ...['purchaseReturnLine', 'supplierCreditNote', 'supplierCreditNoteLine', 'purchaseOrder', 'accountingPeriod', 'fiscalYear'].map(model => db[model].findMany({ where: outside, orderBy: { id: 'asc' } })),
      db.purchaseOrderLine.findMany({ where: { purchaseOrder: outside }, orderBy: { id: 'asc' } }),
    ]) });
  }
  async function effects(x) {
    return f.hash({ common: await h.effects(x), added: await Promise.all([
      db.inventoryLevel.findMany({ where: { item: scoped(x.organizationId) }, orderBy: { id: 'asc' } }),
      ...['purchaseReturn', 'purchaseReturnLine', 'supplierCreditNote', 'supplierCreditNoteLine', 'supplier', 'businessEvent'].map(model => db[model].findMany({ where: scoped(x.organizationId), orderBy: { id: 'asc' } })),
    ]) });
  }
  async function fixture(name) {
    assert.match(name, /^[a-z-]{1,24}$/);
    const label = 'frac-' + name;
    const predictedOrganizationId = 'workflow_supplier_ack_en_receipt-handoff-' + '0'.repeat(36) + '-operational-' + '0'.repeat(36) + '-' + label;
    assert.ok(predictedOrganizationId.length <= 191, 'Owned fixture ID must fit before insertion');
    const x = await h.fixture(label, { currency: 'USD' });
    assert.ok(x.organizationId.length <= 191); assert.ok(x.orderNumber.length <= 191);
    assert.ok(h.organizations.includes(x.organizationId));
    const order = await db.purchaseOrder.findUniqueOrThrow({ where: { id: x.purchaseOrderId }, include: { lines: true } });
    assert.equal(order.organizationId, x.organizationId); assert.equal(order.lines.length, 1);
    x.itemId = order.lines[0].itemId; x.locationId = order.locationId;
    await db.item.update({ where: { id: x.itemId }, data: { costPrice: '0.01' } });
    await db.purchaseOrderLine.update({ where: { id: x.lineId }, data: { orderedQuantity: '1.000', unitCost: '0.01', lineTotal: '0.01' } });
    await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { subtotal: '0.01', total: '0.01' } });
    return x;
  }
  function returnCommand(x, receipt, quantity) {
    return { organizationId: x.organizationId, purchaseOrderId: x.purchaseOrderId, goodsReceiptId: receipt.id, postedById: x.actorId,
      idempotencyKey: crypto.randomUUID(), reason: 'Owned fractional remaining-pool verification', lines: [{ sourceGoodsReceiptLineId: receipt.lines[0].id, quantity: String(quantity) }] };
  }
  async function returnGoods(x, receipt, quantity, expectedCost) {
    const command = returnCommand(x, receipt, quantity), result = await returns.postPurchaseReturn(command, db);
    const movement = await db.inventoryTransaction.findFirstOrThrow({ where: { organizationId: x.organizationId, referenceId: result.purchaseReturn.id, type: 'PURCHASE_RETURN' } });
    assert.equal(movement.quantity.toFixed(3), amount(quantity).negated().toFixed(3));
    assert.equal(movement.totalCost.toFixed(2), expectedCost);
    return { command, result, movement };
  }
  async function reverseReturn(x, returned, expectedCost) {
    const command = { organizationId: x.organizationId, purchaseReturnId: returned.result.purchaseReturn.id, postedById: x.actorId, idempotencyKey: crypto.randomUUID(), reason: 'Owned exact fractional return reversal' };
    const result = await returns.reversePurchaseReturn(command, db);
    const movement = await db.inventoryTransaction.findFirstOrThrow({ where: { organizationId: x.organizationId, referenceId: result.purchaseReturn.id, type: 'PURCHASE_RETURN_REVERSAL' } });
    assert.equal(movement.totalCost.toFixed(2), expectedCost);
    assert.equal(movement.reversalOfTransactionId, returned.movement.id);
    return { command, result, movement };
  }
  async function inspectStock(x, quantity, value, ledger = true) {
    const level = await db.inventoryLevel.findUniqueOrThrow({ where: { itemId_locationId: { itemId: x.itemId, locationId: x.locationId } } });
    assert.equal(level.quantityOnHand.toFixed(3), quantity); assert.equal(level.quantityAvailable.toFixed(3), quantity);
    assert.equal(level.totalValue.toFixed(2), value);
    const projection = await rebuildInventoryProjection({ organizationId: x.organizationId }, db);
    assert.equal(projection.driftCount, 0); assert.deepEqual(projection.drifts, []);
    const projected = projection.projections.find(row => row.itemId === x.itemId && row.locationId === x.locationId);
    assert.ok(projected); assert.equal(projected.quantityOnHand, quantity); assert.equal(projected.totalValue, value);
    const tieout = await reconcileInventoryClass3({ organizationId: x.organizationId, currency: x.currency }, db);
    if (ledger) { assert.equal(tieout.status, 'PASSED', JSON.stringify(tieout.failures)); assert.equal(tieout.inventoryValue, value); assert.equal(tieout.ledgerClass3Value, value); assert.equal(tieout.driftAmount, '0.00'); }
    return { quantity, value, projectionHash: projection.projectionHash, tieout };
  }
  async function expectBalances(x, expected) {
    const actual = await h.balances(x);
    for (const [key, value] of Object.entries(expected)) assert.equal(actual[key], value, key);
    return actual;
  }
  async function creditRule(x) {
    await rules.createPostingRule(x.organizationId, { code: 'OWNED-FRACTIONAL-VERIFIED-CREDIT', nameEn: 'Owned verified return cost and credit rounding', sourceType: 'SUPPLIER_CREDIT_NOTE', postingPurpose: 'SUPPLIER_CREDIT_NOTE', priority: 1,
      lines: [
        { lineNumber: 1, side: 'DEBIT', mappingKey: 'ACCOUNTS_PAYABLE', amountSource: 'GROSS_AMOUNT' },
        { lineNumber: 2, side: 'CREDIT', mappingKey: 'SUPPLIER_RETURN_CLAIM', amountSource: 'COST_AMOUNT' },
        { lineNumber: 3, side: 'CREDIT', mappingKey: 'INPUT_VAT', amountSource: 'TAX_AMOUNT' },
        { lineNumber: 4, side: 'CREDIT', mappingKey: 'INVENTORY_VARIANCE', amountSource: 'VARIANCE_AMOUNT', condition: { receiptCreditRecognition: 'VERIFIED', receiptCreditVarianceDirection: 'CREDIT' } },
        { lineNumber: 5, side: 'DEBIT', mappingKey: 'INVENTORY_VARIANCE', amountSource: 'VARIANCE_AMOUNT', condition: { receiptCreditRecognition: 'VERIFIED', receiptCreditVarianceDirection: 'DEBIT' } },
      ] }, x.actorId);
  }
  function creditCommand(x, invoice, returned, label) {
    return { organizationId: x.organizationId, purchaseReturnId: returned.result.purchaseReturn.id, supplierInvoiceId: invoice.id, postedById: x.actorId,
      idempotencyKey: crypto.randomUUID(), creditNoteNumber: 'OWNED-FRAC-' + label + '-' + crypto.randomUUID(), creditDate: new Date(),
      documentHash: crypto.createHash('sha256').update(run + label).digest('hex'), reason: 'Owned fractional source-backed supplier credit',
      lines: [{ sourcePurchaseReturnLineId: returned.result.purchaseReturn.lines[0].id, sourceSupplierInvoiceLineId: invoice.lines[0].id }] };
  }
  function reverseCreditCommand(x, credit, label, creditDate = new Date()) {
    return { organizationId: x.organizationId, supplierCreditNoteId: credit.id, postedById: x.actorId,
      idempotencyKey: crypto.randomUUID(), creditNoteNumber: 'OWNED-FRAC-REV-' + crypto.randomUUID(), creditDate,
      documentHash: crypto.createHash('sha256').update(run + label).digest('hex'), reason: 'Owned exact source-backed credit reversal' };
  }
  async function payableState(x, invoiceId) {
    const retainedInvoice = await db.supplierInvoice.findUniqueOrThrow({ where: { id: invoiceId }, select: {
      id: true, organizationId: true, supplierId: true, currency: true, subtotal: true, taxAmount: true, total: true, amountPaid: true, status: true,
    } });
    const outstanding = await readSupplierPaymentBalances(db, x.organizationId, [retainedInvoice], x.currency);
    return f.hash({ invoice: retainedInvoice, outstanding: outstanding.get(invoiceId).toFixed(2),
      supplier: await db.supplier.findUniqueOrThrow({ where: { id: x.supplierId }, select: { id: true, currentBalance: true } }),
      ledger: await db.supplierLedgerEntry.findMany({ where: scoped(x.organizationId), orderBy: { id: 'asc' } }),
      apLines: await db.journalEntryLine.findMany({ where: { organizationId: x.organizationId, account: { mappingKey: 'ACCOUNTS_PAYABLE' } }, orderBy: { id: 'asc' } }),
    });
  }
  async function journalLines(x, journalEntryId) {
    const entry = await db.journalEntry.findFirstOrThrow({ where: { id: journalEntryId, organizationId: x.organizationId }, include: { lines: { include: { account: { select: { mappingKey: true } } } } } });
    assert.equal(entry.status, 'POSTED'); assert.ok(entry.postedAt);
    return entry.lines.map(line => {
      assert.equal(line.currency, x.currency);
      return { key: line.account.mappingKey, debit: line.debit.toFixed(2), credit: line.credit.toFixed(2) };
    }).sort((a, b) => a.key.localeCompare(b.key));
  }
  async function periodRejection(x, command, submit, expectedMessage) {
    const before = await effects(x);
    await assert.rejects(() => submit(command, db), error => {
      assert.match(error.message, expectedMessage); return true;
    });
    assert.equal(await effects(x), before, 'Rejected period must leave no stock, accounting, supplier or command effects');
  }
  async function invoice(x, receipt, quantity, label) {
    const prepared = await h.prepare(x, receipt, quantity, label + '-' + run);
    await h.approve(x, prepared.invoiceId);
    return db.supplierInvoice.findUniqueOrThrow({ where: { id: prepared.invoiceId }, include: { lines: true } });
  }
  async function check(caseId, name, work) {
    assert.ok(caseIds.includes(caseId));
    if (selectedCase && selectedCase !== caseId) return;
    const started = Date.now();
    try { const result = await work(); report.checks.push({ caseId, name, status: 'passed', elapsedMs: Date.now() - started, ...result }); }
    catch (error) { report.checks.push({ caseId, name, status: 'failed', elapsedMs: Date.now() - started, error: f.safe(error), stack: f.safe(error.stack || error) }); process.exitCode = 1; }
    console.log(JSON.stringify(report.checks.at(-1)));
  }
  async function main() {
    report.migrationPrerequisite = await assertZeroCreditMigration();
    report.sourcesBefore = sources(); report.originalBefore = await stable();
    await check('period-timezones', 'UTC and Europe/Paris sessions select the same retained period through ORM and locked transactional lookup', async () => {
      const x = await fixture('period-timezones'), instant = new Date('2026-09-30T23:33:26.124Z');
      const shape = period => ({ id: period.id, status: period.status, startDate: period.startDate.toISOString(), endDate: period.endDate.toISOString() });
      const rootPeriod = shape(await periods.getOpenPeriodForDate(x.organizationId, instant, db));
      assert.equal(rootPeriod.status, 'OPEN'); assert.equal(rootPeriod.startDate, '2026-09-01T00:00:00.000Z');
      const selections = [];
      for (const timezone of ['UTC', 'Europe/Paris']) {
        selections.push(await db.$transaction(async tx => {
          // Session-local setting expires with this transaction. No retained
          // period dates or statuses are changed to make the assertion pass.
          await tx.$queryRaw`SELECT set_config('TimeZone', ${timezone}, true)`;
          const [settings] = await tx.$queryRaw`SELECT current_setting('TimeZone') AS timezone`;
          assert.equal(settings.timezone, timezone);
          const orm = shape(await tx.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, startDate: { lte: instant }, endDate: { gte: instant } }, orderBy: { startDate: 'desc' } }));
          const locked = shape(await periods.getOpenPeriodForDate(x.organizationId, instant, tx));
          assert.deepEqual(orm, rootPeriod); assert.deepEqual(locked, rootPeriod);
          return { timezone, orm, locked };
        }));
      }
      return { organizationId: x.organizationId, instant: instant.toISOString(), rootPeriod, selections };
    });
    await check('three-returns', 'Three fractional returns exhaust the retained cent without stock, value or GRNI residue', async () => {
      const x = await fixture('three-returns'), { receipt } = await h.receive(x, 1), returned = [];
      for (const [quantity, cost, remainingQuantity, remainingValue] of [['0.3', '0.00', '0.700', '0.01'], ['0.3', '0.00', '0.400', '0.01'], ['0.4', '0.01', '0.000', '0.00']]) {
        const step = await returnGoods(x, receipt, quantity, cost); returned.push(step.result.purchaseReturn.id); await inspectStock(x, remainingQuantity, remainingValue);
      }
      const balances = await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00', SUPPLIER_RETURN_CLAIM: '0.00' });
      assert.equal(await count(x, 'inventoryTransaction'), 4);
      return { organizationId: x.organizationId, receiptId: receipt.id, returned, balances, stock: await inspectStock(x, '0.000', '0.00') };
    });
    await check('non-tail', 'Non-tail exact reversal releases its own zero allocation and permits zero-value final quantity', async () => {
      const x = await fixture('non-tail'), { receipt } = await h.receive(x, 1);
      const first = await returnGoods(x, receipt, '0.4', '0.00'), second = await returnGoods(x, receipt, '0.4', '0.01');
      const reversed = await reverseReturn(x, first, '0.00'), replayBefore = await effects(x);
      await returns.reversePurchaseReturn(reversed.command, db); assert.equal(await effects(x), replayBefore);
      const last = await returnGoods(x, receipt, '0.6', '0.00');
      const balances = await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00' });
      return { organizationId: x.organizationId, returns: [first.result.purchaseReturn.id, second.result.purchaseReturn.id, last.result.purchaseReturn.id], reversalId: reversed.result.purchaseReturn.id, balances, stock: await inspectStock(x, '0.000', '0.00') };
    });
    await check('interleaving', 'Interleaved uninvoiced return and invoice preserve separate commercial and receipt-cost amounts', async () => {
      const x = await fixture('interleaving'), { receipt } = await h.receive(x, 1);
      await returnGoods(x, receipt, '0.5', '0.01');
      const postedInvoice = await invoice(x, receipt, '0.5', 'interleaved'); assert.equal(postedInvoice.total.toFixed(2), '0.01');
      const returned = await returnGoods(x, receipt, '0.5', '0.00');
      const balances = await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-0.01', SUPPLIER_RETURN_CLAIM: '0.00', INVENTORY_VARIANCE: '0.01' });
      return { organizationId: x.organizationId, invoiceId: postedInvoice.id, returnId: returned.result.purchaseReturn.id, balances, stock: await inspectStock(x, '0.000', '0.00') };
    });
    await check('zero-return-recovery', 'Blocked receipt with zero-valued returns recovers original-date accounting without stock replay', async () => {
      const x = await fixture('zero-return-recovery'); await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: false } });
      const { receipt } = await h.receive(x, 1, 'review_required');
      const first = await returnGoods(x, receipt, '0.3', '0.00'), second = await returnGoods(x, receipt, '0.3', '0.00');
      const originals = f.hash(await db.purchaseReturn.findMany({ where: scoped(x.organizationId), include: { lines: true }, orderBy: { id: 'asc' } }));
      await db.postingRule.update({ where: { id: x.receiptRule.id }, data: { isActive: true } });
      const input = { orderId: x.purchaseOrderId, receiptId: receipt.id }, preview = await h.recovery.previewReceiptLedgerRecovery(input, x.scope);
      assert.deepEqual(preview.blockers, []);
      const command = { ...input, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, recovered = await h.recovery.confirmReceiptLedgerRecovery(command, x.scope);
      assert.equal(recovered.ledgerStatus, 'POSTED');
      assert.equal(recovered.returnOutcomes.length, 2);
      for (const outcome of recovered.returnOutcomes) {
        assert.equal(outcome.ledgerStatus, 'NOT_REQUIRED'); assert.equal(outcome.postingBatchId, null); assert.equal(outcome.journalEntryId, null); assert.equal(outcome.accountingSourceLinkId, null);
        const originalReturn = [first.result.purchaseReturn, second.result.purchaseReturn].find(row => row.id === outcome.returnId);
        assert.ok(originalReturn); assert.equal(outcome.effectiveAt, originalReturn.occurredAt.toISOString());
      }
      assert.equal(f.hash(await db.purchaseReturn.findMany({ where: scoped(x.organizationId), include: { lines: true }, orderBy: { id: 'asc' } })), originals);
      const receiptJournal = await db.journalEntry.findUniqueOrThrow({ where: { id: recovered.journalEntryId } });
      assert.equal(receiptJournal.entryDate.toISOString(), receipt.inventoryPostedAt.toISOString());
      assert.equal(await count(x, 'inventoryTransaction'), 3);
      const before = await effects(x); await h.recovery.confirmReceiptLedgerRecovery(command, x.scope); assert.equal(await effects(x), before);
      await inspectStock(x, '0.400', '0.01'); await returnGoods(x, receipt, '0.4', '0.01');
      return { organizationId: x.organizationId, zeroReturnIds: [first.result.purchaseReturn.id, second.result.purchaseReturn.id], recovery: recovered, balances: await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00' }), stock: await inspectStock(x, '0.000', '0.00') };
    });
    await check('credit-variance', 'Commercial credit clears rounding variance without inventing a claim, and reverses exactly', async () => {
      const x = await fixture('credit-variance'); await creditRule(x);
      const { receipt } = await h.receive(x, 1); await returnGoods(x, receipt, '0.5', '0.01');
      const postedInvoice = await invoice(x, receipt, '0.5', 'credit-variance'), returned = await returnGoods(x, receipt, '0.5', '0.00');
      const command = creditCommand(x, postedInvoice, returned, 'variance'), credited = await returns.postSupplierCreditNote(command, db);
      assert.equal(credited.supplierCreditNote.total.toFixed(2), '0.01'); assert.ok(credited.supplierCreditNote.journalEntryId);
      await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '0.00', SUPPLIER_RETURN_CLAIM: '0.00', INVENTORY_VARIANCE: '0.00' });
      const before = await effects(x); await returns.postSupplierCreditNote(command, db); assert.equal(await effects(x), before);
      const reverseCommand = { organizationId: x.organizationId, supplierCreditNoteId: credited.supplierCreditNote.id, postedById: x.actorId, idempotencyKey: crypto.randomUUID(), creditNoteNumber: 'OWNED-FRAC-REV-' + crypto.randomUUID(), creditDate: new Date(), documentHash: crypto.createHash('sha256').update(run + 'reverse').digest('hex'), reason: 'Owned exact credit rounding reversal' };
      const reversed = await returns.reverseSupplierCreditNote(reverseCommand, db);
      const afterReverse = await effects(x); await returns.reverseSupplierCreditNote(reverseCommand, db); assert.equal(await effects(x), afterReverse);
      const balances = await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-0.01', SUPPLIER_RETURN_CLAIM: '0.00', INVENTORY_VARIANCE: '0.01' });
      return { organizationId: x.organizationId, creditId: credited.supplierCreditNote.id, reversalId: reversed.supplierCreditNote.id, balances, stock: await inspectStock(x, '0.000', '0.00') };
    });
    await check('zero-credit', 'A verified zero-credit record retains quantity, then the final credit clears the cent once', async () => {
      const x = await fixture('zero-credit'); await creditRule(x);
      const { receipt } = await h.receive(x, 1), postedInvoice = await invoice(x, receipt, '1', 'zero-credit');
      const first = await returnGoods(x, receipt, '0.3', '0.00'), command = creditCommand(x, postedInvoice, first, 'zero');
      const journalsBefore = await count(x, 'journalEntry'), zero = await returns.postSupplierCreditNote(command, db);
      assert.equal(zero.ledgerStatus, 'NOT_REQUIRED'); assert.equal(zero.supplierCreditNote.total.toFixed(2), '0.00'); assert.equal(zero.supplierCreditNote.journalEntryId, null);
      assert.equal(zero.supplierCreditNote.ledgerPostingBatchId, null);
      assert.equal(await count(x, 'journalEntry'), journalsBefore); assert.equal(zero.supplierCreditNote.lines[0].quantity.toFixed(3), '0.300');
      const before = await effects(x); await returns.postSupplierCreditNote(command, db); assert.equal(await effects(x), before);
      const finalReturn = await returnGoods(x, receipt, '0.7', '0.01'), finalCredit = await returns.postSupplierCreditNote(creditCommand(x, postedInvoice, finalReturn, 'cent'), db);
      assert.equal(finalCredit.supplierCreditNote.total.toFixed(2), '0.01');
      return { organizationId: x.organizationId, zeroCreditId: zero.supplierCreditNote.id, finalCreditId: finalCredit.supplierCreditNote.id, balances: await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '0.00', SUPPLIER_RETURN_CLAIM: '0.00', INVENTORY_VARIANCE: '0.00' }), stock: await inspectStock(x, '0.000', '0.00') };
    });
    await check('concurrent', 'Concurrent distinct fractional returns and exact retries cannot double-consume the remaining pool', async () => {
      const x = await fixture('concurrent'), { receipt } = await h.receive(x, 1), commands = [returnCommand(x, receipt, '0.3'), returnCommand(x, receipt, '0.3')];
      const attempted = await Promise.allSettled(commands.map(command => returns.postPurchaseReturn(command, db)));
      assert.ok(attempted.some(result => result.status === 'fulfilled'));
      const resolved = [];
      for (const command of commands) resolved.push(await returns.postPurchaseReturn(command, db));
      assert.notEqual(resolved[0].purchaseReturn.id, resolved[1].purchaseReturn.id);
      assert.equal(await count(x, 'purchaseReturn'), 2); assert.equal(await count(x, 'inventoryTransaction'), 3);
      const before = await effects(x); for (const command of commands) await returns.postPurchaseReturn(command, db); assert.equal(await effects(x), before);
      await returnGoods(x, receipt, '0.4', '0.01');
      return { organizationId: x.organizationId, attempts: attempted.map(result => result.status === 'fulfilled' ? { status: result.status, returnId: result.value.purchaseReturn.id } : { status: result.status, error: f.safe(result.reason) }), balances: await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00' }), stock: await inspectStock(x, '0.000', '0.00') };
    });
    await check('zero-net-claim', 'A zero-total credit with a retained cent claim posts only claim and variance, then reverses exactly', async () => {
      const x = await fixture('zero-net-claim'); await creditRule(x);
      const { receipt } = await h.receive(x, 1), postedInvoice = await invoice(x, receipt, '1', 'zero-net-claim');
      await returnGoods(x, receipt, '0.3', '0.00'); await returnGoods(x, receipt, '0.3', '0.00');
      const last = await returnGoods(x, receipt, '0.4', '0.01');
      // Credit this last physical return first: its frozen claim is .01, but the
      // untouched commercial pool rounds .4 / 1 * .01 to zero. All proof comes
      // from the actual receipt, invoice and return services above.
      const beforePayable = await payableState(x, postedInvoice.id), journalsBefore = await count(x, 'journalEntry');
      const command = creditCommand(x, postedInvoice, last, 'zero-net-claim'), credited = await returns.postSupplierCreditNote(command, db);
      for (const field of ['subtotal', 'taxAmount', 'total']) assert.equal(credited.supplierCreditNote[field].toFixed(2), '0.00');
      assert.equal(credited.ledgerStatus, 'POSTED'); assert.ok(credited.supplierCreditNote.journalEntryId);
      assert.equal(await count(x, 'journalEntry'), journalsBefore + 1);
      const creditLines = await journalLines(x, credited.supplierCreditNote.journalEntryId);
      assert.deepEqual(creditLines, [
        { key: 'INVENTORY_VARIANCE', debit: '0.01', credit: '0.00' },
        { key: 'SUPPLIER_RETURN_CLAIM', debit: '0.00', credit: '0.01' },
      ]);
      assert.equal(await payableState(x, postedInvoice.id), beforePayable);
      await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-0.01', SUPPLIER_RETURN_CLAIM: '0.00', INVENTORY_VARIANCE: '0.01' });
      const replayBefore = await effects(x), replay = await returns.postSupplierCreditNote(command, db);
      assert.equal(replay.replayed, true); assert.equal(replay.supplierCreditNote.id, credited.supplierCreditNote.id); assert.equal(await effects(x), replayBefore);
      const reverseCommand = reverseCreditCommand(x, credited.supplierCreditNote, 'zero-net-claim-reverse'), reversed = await returns.reverseSupplierCreditNote(reverseCommand, db);
      assert.equal(reversed.ledgerStatus, 'POSTED'); assert.equal(reversed.supplierCreditNote.total.toFixed(2), '0.00');
      assert.equal(reversed.supplierCreditNote.reversalOfSupplierCreditNoteId, credited.supplierCreditNote.id);
      const reversalLines = await journalLines(x, reversed.supplierCreditNote.journalEntryId);
      assert.deepEqual(reversalLines, creditLines.map(line => ({ key: line.key, debit: line.credit, credit: line.debit })));
      assert.equal(await count(x, 'journalEntry'), journalsBefore + 2); assert.equal(await payableState(x, postedInvoice.id), beforePayable);
      const afterReverse = await effects(x), reverseReplay = await returns.reverseSupplierCreditNote(reverseCommand, db);
      assert.equal(reverseReplay.replayed, true); assert.equal(reverseReplay.supplierCreditNote.id, reversed.supplierCreditNote.id); assert.equal(await effects(x), afterReverse);
      return { organizationId: x.organizationId, creditId: credited.supplierCreditNote.id, reversalId: reversed.supplierCreditNote.id, creditLines, reversalLines,
        balances: await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-0.01', SUPPLIER_RETURN_CLAIM: '0.01', INVENTORY_VARIANCE: '0.00' }), stock: await inspectStock(x, '0.000', '0.00') };
    });
    await check('zero-credit-periods', 'New zero credit and reversal reject closed or missing periods while exact completed retries remain inert', async () => {
      const x = await fixture('zero-credit-periods'); await creditRule(x);
      const { receipt } = await h.receive(x, 1), postedInvoice = await invoice(x, receipt, '1', 'zero-periods');
      const returned = await returnGoods(x, receipt, '0.3', '0.00'), command = creditCommand(x, postedInvoice, returned, 'periods');
      const period = await db.accountingPeriod.findFirstOrThrow({ where: { organizationId: x.organizationId, startDate: { lte: command.creditDate }, endDate: { gte: command.creditDate } } });
      const absentDate = new Date('2027-01-15T12:00:00.000Z');
      assert.equal(await db.accountingPeriod.count({ where: { organizationId: x.organizationId, startDate: { lte: absentDate }, endDate: { gte: absentDate } } }), 0);
      assert.equal(period.status, 'OPEN');
      const beforePayable = await payableState(x, postedInvoice.id), journalsBefore = await count(x, 'journalEntry');
      try {
        await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED' } });
        await periodRejection(x, command, returns.postSupplierCreditNote, /Accounting period .* is not open/);
        await periodRejection(x, { ...command, creditDate: absentDate }, returns.postSupplierCreditNote, /Accounting period was not found/);
        await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'OPEN' } });
        const zero = await returns.postSupplierCreditNote(command, db);
        assert.equal(zero.ledgerStatus, 'NOT_REQUIRED'); assert.equal(zero.supplierCreditNote.total.toFixed(2), '0.00');
        assert.equal(zero.supplierCreditNote.journalEntryId, null); assert.equal(zero.supplierCreditNote.ledgerPostingBatchId, null);
        const reverseCommand = reverseCreditCommand(x, zero.supplierCreditNote, 'zero-periods-reverse');
        await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED' } });
        const beforeReplay = await effects(x), replay = await returns.postSupplierCreditNote(command, db);
        assert.equal(replay.replayed, true); assert.equal(replay.supplierCreditNote.id, zero.supplierCreditNote.id); assert.equal(await effects(x), beforeReplay);
        await periodRejection(x, reverseCommand, returns.reverseSupplierCreditNote, /Accounting period .* is not open/);
        await periodRejection(x, { ...reverseCommand, creditDate: absentDate }, returns.reverseSupplierCreditNote, /Accounting period was not found/);
        await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'OPEN' } });
        const reversed = await returns.reverseSupplierCreditNote(reverseCommand, db);
        assert.equal(reversed.ledgerStatus, 'NOT_REQUIRED'); assert.equal(reversed.supplierCreditNote.total.toFixed(2), '0.00');
        assert.equal(reversed.supplierCreditNote.journalEntryId, null); assert.equal(reversed.supplierCreditNote.ledgerPostingBatchId, null);
        await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED' } });
        const afterReverse = await effects(x), reverseReplay = await returns.reverseSupplierCreditNote(reverseCommand, db);
        assert.equal(reverseReplay.replayed, true); assert.equal(reverseReplay.supplierCreditNote.id, reversed.supplierCreditNote.id); assert.equal(await effects(x), afterReverse);
        assert.equal(await count(x, 'journalEntry'), journalsBefore); assert.equal(await payableState(x, postedInvoice.id), beforePayable);
        return { organizationId: x.organizationId, periodId: period.id, absentDate: absentDate.toISOString(), zeroCreditId: zero.supplierCreditNote.id,
          reversalId: reversed.supplierCreditNote.id, rejectedCommands: 4, exactClosedPeriodReplays: 2, stock: await inspectStock(x, '0.700', '0.01') };
      } finally { await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'OPEN' } }); }
    });
    await check('original-zero', 'An originally zero-value receipt supports real returns, exact reversal and full reallocation without journals', async () => {
      const x = await fixture('original-zero');
      await db.item.update({ where: { id: x.itemId }, data: { costPrice: '0.00' } });
      await db.purchaseOrderLine.update({ where: { id: x.lineId }, data: { unitCost: '0.00', lineTotal: '0.00' } });
      await db.purchaseOrder.update({ where: { id: x.purchaseOrderId }, data: { subtotal: '0.00', total: '0.00' } });
      const { receipt } = await h.receive(x, 1, 'not_required');
      const source = await db.$transaction(tx => h.sourceService.readReceiptRecognitionSource(tx, x.organizationId, receipt.id));
      assert.ok(source); assert.equal(source.inventoryValue.toFixed(2), '0.00');
      const evidence = await db.$transaction(tx => h.sourceService.readReceiptRecognitionEvidence(tx, source));
      assert.equal(evidence.stockVerified, true); assert.equal(evidence.accountingStatus, 'NOT_REQUIRED'); assert.equal(evidence.batchId, null); assert.equal(evidence.journalId, null);
      await inspectStock(x, '1.000', '0.00');
      const returned = await returnGoods(x, receipt, '0.4', '0.00');
      assert.equal(returned.result.ledgerStatus, 'NOT_REQUIRED'); await inspectStock(x, '0.600', '0.00');
      const reversed = await reverseReturn(x, returned, '0.00');
      // reversePurchaseReturn returns the immutable row and replay flag only.
      // Verify its durable recognition through the actual source reader instead
      // of expecting an unexposed response field.
      const reversalEvidence = await db.$transaction(tx => readPurchaseReturnAccountingEvidence(tx, reversed.result.purchaseReturn));
      assert.equal(reversalEvidence.accountingComplete, true); assert.equal(reversalEvidence.journalEntryId, null);
      assert.equal(reversed.result.purchaseReturn.journalEntryId, null); assert.equal(reversed.result.purchaseReturn.ledgerPostingBatchId, null);
      assert.equal(reversalEvidence.recognition.version, 2); assert.equal(reversalEvidence.recognition.status, 'VERIFIED');
      assert.equal(reversalEvidence.recognition.direction, 'REVERSAL'); assert.equal(reversalEvidence.recognition.returnId, reversed.result.purchaseReturn.id);
      assert.equal(reversalEvidence.recognition.reversalOfReturnId, returned.result.purchaseReturn.id);
      assert.equal(reversalEvidence.recognition.receiptJournalId, null); assert.equal(reversalEvidence.recognition.receiptBatchId, null);
      for (const line of reversalEvidence.recognition.lines) for (const field of ['inventoryAmount', 'supplierClaimAmount', 'grniAmount']) assert.equal(line[field], '0.00');
      const reversalEvent = await db.businessEvent.findFirstOrThrow({ where: { organizationId: x.organizationId, sourceType: 'PURCHASE_RETURN', sourceId: reversed.result.purchaseReturn.id, eventType: 'purchase.return.recognition_allocated' } });
      assert.equal(reversalEvent.status, 'APPLIED'); assert.ok(reversalEvent.processedAt); assert.equal(reversalEvent.postingBatchId, null);
      await inspectStock(x, '1.000', '0.00');
      const beforeReverseReplay = await effects(x); await returns.reversePurchaseReturn(reversed.command, db); assert.equal(await effects(x), beforeReverseReplay);
      const exhausted = await returnGoods(x, receipt, '1', '0.00'); assert.equal(exhausted.result.ledgerStatus, 'NOT_REQUIRED');
      const beforeReplay = await effects(x); await returns.postPurchaseReturn(exhausted.command, db); assert.equal(await effects(x), beforeReplay);
      for (const model of ['journalEntry', 'ledgerPostingBatch', 'accountingSourceLink', 'supplierLedgerEntry']) assert.equal(await count(x, model), 0, model);
      assert.equal(await count(x, 'inventoryTransaction'), 4);
      return { organizationId: x.organizationId, receiptId: receipt.id, returnIds: [returned.result.purchaseReturn.id, exhausted.result.purchaseReturn.id], reversalId: reversed.result.purchaseReturn.id, reversalRecognitionEventId: reversalEvent.id, reversalEvidence,
        balances: await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '0.00', SUPPLIER_RETURN_CLAIM: '0.00' }), stock: await inspectStock(x, '0.000', '0.00') };
    });
    await check('tax-residual', 'Commercial net and tax residuals exhaust once through real invoice preparation and reverse exactly', async () => {
      const x = await fixture('tax-residual'); await creditRule(x);
      const { receipt } = await h.receive(x, 1);
      // 100% is an explicit synthetic arithmetic boundary, not an approved tax
      // rate. The actual preparation/independent approval services own all facts.
      const draft = { supplierId: x.supplierId, invoiceNumber: 'OWNED-FRAC-TAX-' + run, invoiceDate: new Date().toISOString().slice(0, 10), currency: x.currency,
        documentReference: 'https://example.invalid/owned/fractional-tax/' + run, documentSha256: crypto.createHash('sha256').update(run + 'tax-invoice').digest('hex'),
        lines: [{ goodsReceiptLineId: receipt.lines[0].id, description: 'Owned one-cent tax residual verification', quantity: '1', unitCost: '0.01', taxRate: '100' }] };
      const preview = await preparation.previewInvoicePreparation(draft, x.makerScope);
      assert.equal(preview.subtotal, '0.01'); assert.equal(preview.tax, '0.01'); assert.equal(preview.total, '0.02'); assert.equal(preview.variance, '0.00');
      const prepared = await preparation.confirmInvoicePreparation({ draft, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, x.makerScope);
      await h.approve(x, prepared.invoiceId);
      const postedInvoice = await db.supplierInvoice.findUniqueOrThrow({ where: { id: prepared.invoiceId }, include: { lines: true } });
      assert.equal(postedInvoice.total.toFixed(2), '0.02'); assert.equal(postedInvoice.taxAmount.toFixed(2), '0.01');
      const firstReturn = await returnGoods(x, receipt, '0.3', '0.00'), journalsBeforeZero = await count(x, 'journalEntry');
      const zeroCommand = creditCommand(x, postedInvoice, firstReturn, 'tax-zero'), zero = await returns.postSupplierCreditNote(zeroCommand, db);
      assert.equal(zero.ledgerStatus, 'NOT_REQUIRED');
      for (const field of ['subtotal', 'taxAmount', 'total']) assert.equal(zero.supplierCreditNote[field].toFixed(2), '0.00');
      assert.equal(zero.supplierCreditNote.journalEntryId, null); assert.equal(await count(x, 'journalEntry'), journalsBeforeZero);
      const lastReturn = await returnGoods(x, receipt, '0.7', '0.01'), command = creditCommand(x, postedInvoice, lastReturn, 'tax-residual');
      const credited = await returns.postSupplierCreditNote(command, db);
      assert.equal(credited.ledgerStatus, 'POSTED'); assert.equal(credited.supplierCreditNote.subtotal.toFixed(2), '0.01');
      assert.equal(credited.supplierCreditNote.taxAmount.toFixed(2), '0.01'); assert.equal(credited.supplierCreditNote.total.toFixed(2), '0.02');
      assert.equal(credited.supplierCreditNote.lines[0].quantity.toFixed(3), '0.700'); assert.equal(credited.supplierCreditNote.lines[0].taxAmount.toFixed(2), '0.01');
      const creditLines = await journalLines(x, credited.supplierCreditNote.journalEntryId);
      assert.deepEqual(creditLines, [
        { key: 'ACCOUNTS_PAYABLE', debit: '0.02', credit: '0.00' },
        { key: 'INPUT_VAT', debit: '0.00', credit: '0.01' },
        { key: 'SUPPLIER_RETURN_CLAIM', debit: '0.00', credit: '0.01' },
      ]);
      const cleared = await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '0.00', INPUT_VAT: '0.00', SUPPLIER_RETURN_CLAIM: '0.00', INVENTORY_VARIANCE: '0.00' });
      assert.equal((await readSupplierPaymentBalances(db, x.organizationId, [postedInvoice], x.currency)).get(postedInvoice.id).toFixed(2), '0.00');
      const beforeReplay = await effects(x); await returns.postSupplierCreditNote(command, db); await returns.postSupplierCreditNote(zeroCommand, db); assert.equal(await effects(x), beforeReplay);
      const reverseCommand = reverseCreditCommand(x, credited.supplierCreditNote, 'tax-reverse'), reversed = await returns.reverseSupplierCreditNote(reverseCommand, db);
      assert.equal(reversed.ledgerStatus, 'POSTED'); assert.equal(reversed.supplierCreditNote.taxAmount.toFixed(2), '0.01'); assert.equal(reversed.supplierCreditNote.total.toFixed(2), '0.02');
      const reversalLines = await journalLines(x, reversed.supplierCreditNote.journalEntryId);
      assert.deepEqual(reversalLines, creditLines.map(line => ({ key: line.key, debit: line.credit, credit: line.debit })));
      const afterReverse = await effects(x); await returns.reverseSupplierCreditNote(reverseCommand, db); assert.equal(await effects(x), afterReverse);
      assert.equal((await readSupplierPaymentBalances(db, x.organizationId, [postedInvoice], x.currency)).get(postedInvoice.id).toFixed(2), '0.02');
      assert.equal((await db.supplierInvoice.findUniqueOrThrow({ where: { id: postedInvoice.id } })).amountPaid.toFixed(2), '0.00');
      return { organizationId: x.organizationId, invoiceId: postedInvoice.id, zeroCreditId: zero.supplierCreditNote.id, creditId: credited.supplierCreditNote.id,
        reversalId: reversed.supplierCreditNote.id, creditLines, reversalLines, cleared, balances: await expectBalances(x, { INVENTORY: '0.00', GRNI: '0.00', ACCOUNTS_PAYABLE: '-0.02', INPUT_VAT: '0.01', SUPPLIER_RETURN_CLAIM: '0.01', INVENTORY_VARIANCE: '0.00' }), stock: await inspectStock(x, '0.000', '0.00') };
    });
    for (const organizationId of h.organizations) assert.equal(await db.payment.count({ where: { organizationId } }), 0);
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); process.exitCode = 1; }
    finally {
      try {
        report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter);
        report.originalAfter = await stable(); report.originalUnchanged = report.originalBefore === report.originalAfter;
      } catch (error) { report.finalizationError = f.safe(error); }
      report.passed = !report.error && !report.finalizationError && report.checks.length === scenarioCount && report.checks.every(check => check.status === 'passed') && report.sourceStable && report.originalUnchanged;
      report.selection.executedCount = report.checks.length;
      report.selection.passedCount = report.checks.filter(check => check.status === 'passed').length;
      report.selection.failedCount = report.checks.filter(check => check.status === 'failed').length;
      report.fixtureOrganizations = [...h.organizations];
      const file = path.join(__dirname, 'fractional-receipt-valuation-' + run + '.json'); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ file, passed: report.passed, sourceStable: report.sourceStable, originalUnchanged: report.originalUnchanged }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  if (require.main === module) runMain();
  module.exports = { fixture, sources, stable, effects, inspectStock, creditRule, creditCommand };
}
