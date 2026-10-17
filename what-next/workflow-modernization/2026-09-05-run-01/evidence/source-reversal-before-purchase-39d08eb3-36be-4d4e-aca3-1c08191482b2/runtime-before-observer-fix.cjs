// Prepared only until purchase candidates are approved, applied, frozen and the owner releases DB verification.
// No code candidate is loaded into a live transaction by this driver.
if (require.main !== module || process.argv[2] !== '--run') {
  if (require.main === module) console.log('Prepared only. --run requires reviewed application code and the exact owned local database.');
} else {
  const h = require('./verify-operational-receipt-recognition.cjs');
  const fractional = require('./verify-fractional-receipt-valuation.cjs');
  const { f, db } = h, { fs, path, crypto, assert } = f;
  const { Prisma } = require('@prisma/client');
  const load = file => require(path.join(f.root, file));
  const correction = load('services/purchasing/purchase-return-credit.service.ts');
  const ledger = load('services/purchasing/purchase-correction-ledger.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const run = crypto.randomUUID(), sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const models = ['purchaseReturn', 'purchaseReturnLine', 'supplierCreditNote', 'supplierCreditNoteLine', 'supplierInvoice', 'goodsReceipt', 'purchaseOrder', 'supplierLedgerEntry', 'supplier', 'journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'inventoryTransaction', 'businessEvent', 'businessEventAudit', 'businessEventOutbox', 'ledgerAuditEvent', 'auditLog', 'closeRun', 'closeChecklistItem', 'closeEvidenceItem', 'closeAssuranceFinding', 'closePackExport', 'documentSequence', 'payment', 'supplierPayment', 'supplierPaymentAllocation'];
  const report = { run, at: new Date().toISOString(), checks: [], fixtures: [], scope: 'Exact identity-guarded existing local database, synthetic owned organizations, actual AP receipt/invoice/return/credit services. No candidate injection, migration, seed, external delivery, customer payment, fabricated readiness or professional approval.',
    limitations: ['This bounded driver proves actual financial/source compensation, complete acquired period scope, rollback and replay. It does not by itself prove publication race ordering, Cash workspace recovery or retained certified-export freshness.', 'Synthetic service callers exercise existing internal authority; action freshness and permission callbacks are separate focused tests.', 'The inherited supplier-ack fixture directly inserts an APPROVED purchase order with the same maker/approver as a synthetic prerequisite. This is not purchase-order approval evidence. Receiving and independent invoice approval use their actual services.', 'Existing supplier/invoice lock-order inconsistencies and other producer families are outside this runtime proof.'] };
  const files = ['services/purchasing/purchase-correction-ledger.service.ts', 'services/purchasing/purchase-return-credit.service.ts', 'services/inventory/inventory-stock-event.service.ts', 'services/inventory/inventory-close-invalidation.service.ts', 'services/accounting/journal-reversal-order.service.ts', 'services/accounting/journal-close-invalidation.service.ts', 'services/accounting/close-assurance-pack.service.ts', path.relative(f.root, __filename).replaceAll('\\', '/')];
  const sources = () => ({ ...fractional.sources(), ...Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(f.root, file)))])) });
  async function sourceChildren(where) { return {
    goodsReceiptLine: await db.goodsReceiptLine.findMany({ where: { goodsReceipt: where }, orderBy: { id: 'asc' } }),
    supplierInvoiceLine: await db.supplierInvoiceLine.findMany({ where: { supplierInvoice: where }, orderBy: { id: 'asc' } }),
    purchaseOrderLine: await db.purchaseOrderLine.findMany({ where: { purchaseOrder: where }, orderBy: { id: 'asc' } }),
  }; }
  async function rows(x) { return { ...Object.fromEntries(await Promise.all(models.map(async model => [model, await db[model].findMany({ where: { organizationId: x.organizationId }, orderBy: { id: 'asc' } })]))), ...await sourceChildren({ organizationId: x.organizationId }) }; }
  async function state(x) { return f.hash({ rows: await rows(x), levels: await db.inventoryLevel.findMany({ where: { item: { organizationId: x.organizationId } }, orderBy: { id: 'asc' } }) }); }
  async function outside() { const where = { organizationId: { notIn: h.organizations } }; return f.hash({ inherited: await fractional.stable(), rows: await Promise.all(models.map(model => db[model].findMany({ where, orderBy: { id: 'asc' } }))), children: await sourceChildren(where), levels: await db.inventoryLevel.findMany({ where: { item: where }, orderBy: { id: 'asc' } }) }); }
  async function stock(x) { return db.inventoryLevel.findMany({ where: { item: { organizationId: x.organizationId } }, orderBy: { id: 'asc' } }); }
  async function assertRestoredStock(x, original, before) {
    const movements = await db.inventoryTransaction.findMany({ where: { organizationId: x.organizationId, id: { in: original.lines.map(line => line.inventoryTransactionId) } } });
    assert.equal(movements.length, original.lines.length);
    const after = await stock(x); assert.equal(after.length, before.length);
    for (const level of before) {
      const matches = movements.filter(row => row.itemId === level.itemId && row.locationId === level.locationId);
      const quantity = matches.reduce((value, row) => value.plus(row.quantity.abs()), new Prisma.Decimal(0));
      const value = matches.reduce((value, row) => value.plus(row.totalCost.abs()), new Prisma.Decimal(0));
      const current = after.find(row => row.id === level.id); assert.ok(current);
      assert.equal(current.quantityOnHand.toString(), level.quantityOnHand.plus(quantity).toString());
      assert.equal(current.quantityAvailable.toString(), level.quantityAvailable.plus(quantity).toString());
      assert.equal(current.totalValue.toString(), level.totalValue.plus(value).toString());
      for (const key of ['quantityReserved', 'quantityInTransit', 'quantityOnOrder']) assert.equal(current[key].toString(), level[key].toString(), key);
    }
  }
  function retainedRowsUnchanged(before, after, names) { for (const name of names) { const ids = new Set(before[name].map(row => row.id)); assert.deepEqual(after[name].filter(row => ids.has(row.id)), before[name], name); } }
  async function check(name, work) { const start = Date.now(); try { const data = await work(); report.checks.push({ name, status: 'passed', elapsedMs: Date.now() - start, ...data }); } catch (error) { report.checks.push({ name, status: 'failed', elapsedMs: Date.now() - start, error: f.safe(error), stack: f.safe(error.stack || error) }); } console.log(JSON.stringify(report.checks.at(-1))); }
  function returnCommand(x, original) { return { organizationId: x.organizationId, purchaseReturnId: original.id, postedById: x.actorId, idempotencyKey: crypto.randomUUID(), reason: 'Owned exact purchase return correction', occurredAt: new Date() }; }
  function creditCommand(x, original) { return { organizationId: x.organizationId, supplierCreditNoteId: original.id, postedById: x.actorId, idempotencyKey: crypto.randomUUID(), reason: 'Owned exact supplier credit correction', creditNoteNumber: 'OWNED-REV-' + crypto.randomUUID(), creditDate: new Date(), documentHash: sha(run + original.id) }; }
  async function sourceFixture(label, tiny = false, unpostedReturn = false) {
    const x = tiny ? await fractional.fixture('reversal-' + label) : await h.fixture('reversal-' + label);
    await fractional.creditRule(x);
    const quantity = tiny ? 1 : 10, { receipt } = await h.receive(x, quantity);
    const prepared = await h.prepare(x, receipt, quantity); await h.approve(x, prepared.invoiceId);
    const invoice = await db.supplierInvoice.findUniqueOrThrow({ where: { id: prepared.invoiceId }, include: { lines: true } });
    if (unpostedReturn) await db.postingRule.updateMany({ where: { organizationId: x.organizationId, sourceType: 'PURCHASE_RETURN' }, data: { isActive: false } });
    const returned = await h.returnGoods(x, receipt, tiny ? '0.300' : 3);
    const credit = unpostedReturn ? null : await correction.postSupplierCreditNote(fractional.creditCommand(x, invoice, { result: returned }, label), db);
    report.fixtures.push({ label, organizationId: x.organizationId, receiptId: receipt.id, invoiceId: invoice.id, returnId: returned.purchaseReturn.id, creditId: credit?.supplierCreditNote.id ?? null });
    return { x, receipt, invoice, returned: returned.purchaseReturn, credit: credit?.supplierCreditNote ?? null };
  }
  async function scopeFor(x, original, date, isReturn) {
    const journal = original.journalEntryId ? await db.journalEntry.findUniqueOrThrow({ where: { id: original.journalEntryId }, include: { lines: { include: { account: true } } } }) : null;
    const batch = original.ledgerPostingBatchId ? await db.ledgerPostingBatch.findUniqueOrThrow({ where: { id: original.ledgerPostingBatchId } }) : null;
    const originalDate = original.occurredAt ?? original.creditDate, dates = [originalDate, date, ...(journal ? [journal.entryDate] : [])];
    const earliest = new Date(Math.min(...dates.map(value => value.getTime()))), cumulative = isReturn || journal?.lines.some(line => line.account.syscohadaClass?.startsWith('3'));
    const periods = await db.accountingPeriod.findMany({ where: { organizationId: x.organizationId, OR: [{ id: { in: [journal?.periodId, batch?.periodId].filter(Boolean) } }, ...dates.map(value => ({ startDate: { lte: value }, endDate: { gte: value } })), ...(cumulative ? [{ endDate: { gte: earliest } }] : [])] }, orderBy: { id: 'asc' } });
    return periods.map(period => period.id);
  }
  async function observedReverse(x, original, command, isReturn, failAfterSource = false) {
    const expected = await scopeFor(x, original, isReturn ? command.occurredAt : command.creditDate, isReturn), trace = [], locks = [];
    let firstWriteChecked = false;
    const result = await db.$transaction(async tx => {
      const proxy = new Proxy(tx, { get(target, key) {
        if (key === '$queryRaw') return async (...args) => {
          const result = await target.$queryRaw(...args), values = args[0]?.values ?? args.slice(1);
          for (const value of values) if (typeof value === 'string' && value.startsWith('[')) {
            let parts; try { parts = JSON.parse(value); } catch { continue; }
            if (parts[0] === 'accounting-period-catalog') { assert.equal(parts[1], x.organizationId); trace.push('catalog'); }
            if (parts[0] === 'close-assessment-order') { assert.equal(parts[1], x.organizationId); locks.push(parts[2]); trace.push('period:' + parts[2]); }
          }
          return result;
        };
        const delegate = target[key];
        if (!delegate || typeof delegate !== 'object') return typeof delegate === 'function' ? delegate.bind(target) : delegate;
        return new Proxy(delegate, { get(model, method) { const fn = model[method]; if (typeof fn !== 'function') return fn;
          return async (...args) => {
            if (['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'].includes(String(method))) {
              if (!firstWriteChecked) { assert.equal(trace[0], 'catalog'); assert.deepEqual(locks, expected, 'Complete sorted period locks must precede the first actual write'); firstWriteChecked = true; }
              trace.push(String(key) + '.' + String(method));
            }
            const value = await fn.apply(model, args);
            if (failAfterSource && key === (isReturn ? 'purchaseReturn' : 'supplierCreditNote') && method === 'create') throw Error('OWNED_ROLLBACK_AFTER_ACTUAL_SOURCE_WRITE');
            return value;
          };
        } });
      } });
      return correction[isReturn ? 'reversePurchaseReturn' : 'reverseSupplierCreditNote'](command, proxy);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10000, timeout: 45000 });
    assert.equal(firstWriteChecked, true); return { result, expectedPeriodIds: expected, observedPeriodIds: locks, trace };
  }
  async function mirror(x, originalId, reversedId) {
    const read = id => db.journalEntry.findFirstOrThrow({ where: { id, organizationId: x.organizationId }, include: { lines: { orderBy: { lineNumber: 'asc' } } } });
    const original = await read(originalId), reversed = await read(reversedId);
    assert.equal(original.status, 'REVERSED'); assert.equal(reversed.reversalOfEntryId, original.id); assert.equal(reversed.lines.length, original.lines.length);
    original.lines.forEach((line, i) => { const mirror = reversed.lines[i]; assert.equal(mirror.accountId, line.accountId); assert.equal(mirror.debit.toString(), line.credit.toString()); assert.equal(mirror.credit.toString(), line.debit.toString()); assert.equal(mirror.baseDebit.toString(), (line.baseCredit ?? line.credit).toString()); assert.equal(mirror.baseCredit.toString(), (line.baseDebit ?? line.debit).toString()); });
  }
  async function main() {
    assert.equal(typeof ledger.preparePurchaseCorrectionReversalInTx, 'function', 'Reviewed purchase implementation must be applied before this verifier can run');
    await f.local.withClient(f.target, f.local.assertOwned); await assertDisposableDatabaseIdentity(db, f.target.pathname.slice(1));
    report.sourcesBefore = sources(); report.outsideBefore = await outside();
    await check('Actual posted supplier credit and return compensate once with complete pre-write period scope', async () => {
      const { x, invoice, returned, credit } = await sourceFixture('posted'), before = await rows(x), stockBefore = await stock(x), creditOriginal = f.hash(credit), returnOriginal = f.hash(returned);
      assert.ok(credit.journalEntryId); assert.ok(returned.journalEntryId);
      const creditInput = creditCommand(x, credit), creditResult = await observedReverse(x, credit, creditInput, false);
      await mirror(x, credit.journalEntryId, creditResult.result.supplierCreditNote.journalEntryId);
      assert.deepEqual(await stock(x), stockBefore, 'Credit reversal does not move stock');
      const afterCredit = await rows(x), supplierBefore = before.supplier.find(row => row.id === x.supplierId), supplierAfterCredit = afterCredit.supplier.find(row => row.id === x.supplierId);
      assert.equal(supplierAfterCredit.currentBalance.toString(), supplierBefore.currentBalance.plus(credit.total).toString());
      const newSupplierEntries = afterCredit.supplierLedgerEntry.filter(row => !before.supplierLedgerEntry.some(prior => prior.id === row.id)); assert.equal(newSupplierEntries.length, 1);
      assert.equal(newSupplierEntries[0].debit.toString(), credit.total.toString()); assert.equal(newSupplierEntries[0].credit.toString(), '0'); assert.equal(newSupplierEntries[0].balanceAfter.toString(), supplierAfterCredit.currentBalance.toString());
      const returnInput = returnCommand(x, returned), returnResult = await observedReverse(x, returned, returnInput, true);
      await mirror(x, returned.journalEntryId, returnResult.result.purchaseReturn.journalEntryId);
      await assertRestoredStock(x, returned, stockBefore);
      const after = await rows(x); assert.equal(after.journalEntry.length - before.journalEntry.length, 2); assert.equal(after.ledgerPostingBatch.length - before.ledgerPostingBatch.length, 2); assert.equal(after.accountingSourceLink.length - before.accountingSourceLink.length, 2);
      assert.equal(after.inventoryTransaction.length - before.inventoryTransaction.length, returned.lines.length); assert.equal(after.payment.length, before.payment.length);
      assert.equal((await db.supplierInvoice.findUniqueOrThrow({ where: { id: invoice.id } })).amountPaid.toString(), invoice.amountPaid.toString());
      assert.deepEqual(after.supplier, afterCredit.supplier); assert.deepEqual(after.supplierLedgerEntry, afterCredit.supplierLedgerEntry);
      retainedRowsUnchanged(before, after, ['journalEntryLine', 'purchaseReturnLine', 'supplierCreditNoteLine', 'goodsReceipt', 'goodsReceiptLine', 'supplierInvoiceLine', 'purchaseOrder', 'purchaseOrderLine', 'payment', 'supplierPayment', 'supplierPaymentAllocation']);
      assert.equal(f.hash(await db.purchaseReturn.findUniqueOrThrow({ where: { id: returned.id }, include: { lines: true } })), returnOriginal);
      assert.equal(f.hash(await db.supplierCreditNote.findUniqueOrThrow({ where: { id: credit.id }, include: { lines: true } })), creditOriginal);
      const replayBefore = await state(x); assert.equal((await correction.reverseSupplierCreditNote(creditInput, db)).replayed, true); assert.equal((await correction.reversePurchaseReturn(returnInput, db)).replayed, true); assert.equal(await state(x), replayBefore);
      return { organizationId: x.organizationId, creditScope: creditResult.expectedPeriodIds, returnScope: returnResult.expectedPeriodIds, independentExactMirrors: 2, replayNoEffects: true };
    });
    await check('Zero-value fractional credit and stock reversal retain allocations without invented money or journals', async () => {
      const { x, returned, credit } = await sourceFixture('zero', true); assert.equal(returned.journalEntryId, null); assert.equal(credit.journalEntryId, null); assert.equal(credit.total.toFixed(2), '0.00');
      const before = await rows(x), stockBefore = await stock(x); await observedReverse(x, credit, creditCommand(x, credit), false); const restored = await observedReverse(x, returned, returnCommand(x, returned), true); const after = await rows(x);
      await assertRestoredStock(x, returned, stockBefore); assert.deepEqual(after.supplier, before.supplier);
      for (const key of ['journalEntry', 'journalEntryLine', 'ledgerPostingBatch', 'accountingSourceLink', 'supplierLedgerEntry', 'payment']) assert.deepEqual(after[key], before[key], key);
      const movement = await db.inventoryTransaction.findFirstOrThrow({ where: { organizationId: x.organizationId, referenceId: restored.result.purchaseReturn.id } }); assert.equal(movement.quantity.toFixed(3), '0.300'); assert.equal(movement.totalCost.toFixed(2), '0.00');
      return { organizationId: x.organizationId, expectedPeriodIds: restored.expectedPeriodIds, zeroValue: true };
    });
    await check('Unposted original batch is cancelled with stock restoration and no fabricated reversal journal', async () => {
      const { x, invoice, returned } = await sourceFixture('unposted', false, true); assert.equal(returned.journalEntryId, null); assert.ok(returned.ledgerPostingBatchId);
      const before = await rows(x), stockBefore = await stock(x), batch = await db.ledgerPostingBatch.findUniqueOrThrow({ where: { id: returned.ledgerPostingBatchId } }); assert.equal(batch.status, 'FAILED');
      const restored = await observedReverse(x, returned, returnCommand(x, returned), true), after = await rows(x); assert.equal(restored.result.purchaseReturn.journalEntryId, null);
      assert.equal(after.journalEntry.length, before.journalEntry.length); assert.equal(after.ledgerPostingBatch.length, before.ledgerPostingBatch.length); assert.equal(after.accountingSourceLink.length, before.accountingSourceLink.length);
      assert.equal((await db.ledgerPostingBatch.findUniqueOrThrow({ where: { id: batch.id } })).status, 'REVERSED'); assert.ok(restored.expectedPeriodIds.includes(batch.periodId));
      await assertRestoredStock(x, returned, stockBefore); assert.deepEqual(after.supplier, before.supplier); assert.deepEqual(after.supplierLedgerEntry, before.supplierLedgerEntry);
      assert.equal((await db.supplierInvoice.findUniqueOrThrow({ where: { id: invoice.id } })).amountPaid.toString(), invoice.amountPaid.toString());
      retainedRowsUnchanged(before, after, ['journalEntryLine', 'purchaseReturnLine', 'goodsReceipt', 'goodsReceiptLine', 'supplierInvoice', 'supplierInvoiceLine', 'purchaseOrder', 'purchaseOrderLine', 'payment', 'supplierPayment', 'supplierPaymentAllocation']);
      return { organizationId: x.organizationId, retiredBatchId: batch.id, requiredBatchPeriodId: batch.periodId, scope: restored.expectedPeriodIds };
    });
    await check('Failure after actual source insertion rolls back ledger, stock, sequence and evidence; independent retry succeeds', async () => {
      const x = await h.fixture('reversal-rollback'), { receipt } = await h.receive(x), returned = (await h.returnGoods(x, receipt, 3)).purchaseReturn;
      report.fixtures.push({ label: 'rollback', organizationId: x.organizationId, returnId: returned.id });
      const command = returnCommand(x, returned), before = await state(x);
      await assert.rejects(observedReverse(x, returned, command, true, true), /OWNED_ROLLBACK_AFTER_ACTUAL_SOURCE_WRITE/); assert.equal(await state(x), before);
      const retried = await observedReverse(x, returned, command, true); await mirror(x, returned.journalEntryId, retried.result.purchaseReturn.journalEntryId);
      return { organizationId: x.organizationId, rollbackExact: true, independentRetryId: retried.result.purchaseReturn.id };
    });
  }
  async function runMain() {
    try { await main(); } catch (error) { report.error = f.safe(error); report.stack = f.safe(error.stack || error); }
    finally {
      if (report.sourcesBefore && report.outsideBefore) {
        try { report.sourcesAfter = sources(); report.sourceStable = JSON.stringify(report.sourcesBefore) === JSON.stringify(report.sourcesAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore === report.outsideAfter; } catch (error) { report.finalizationError = f.safe(error); }
      }
      report.passed = !report.error && !report.finalizationError && report.checks.length === 4 && report.checks.every(row => row.status === 'passed') && report.sourceStable && report.outsideUnchanged;
      const output = path.join(__dirname, 'purchase-reversal-order-runtime-' + run + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(JSON.stringify({ output, passed: report.passed, checks: report.checks.length, sourceStable: report.sourceStable, outsideUnchanged: report.outsideUnchanged }));
      await db.$disconnect(); if (!report.passed) process.exitCode = 1;
    }
  }
  runMain();
}
