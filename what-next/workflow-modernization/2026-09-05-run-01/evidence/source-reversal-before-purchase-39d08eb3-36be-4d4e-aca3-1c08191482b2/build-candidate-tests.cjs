// Review-only copies; never writes application sources or active tests.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const directory = __dirname, candidate = path.join(directory, 'candidate');
const read = file => fs.readFileSync(path.join(directory, file.replaceAll('/', '__')), 'utf8').replaceAll('\r\n', '\n');
const replace = (text, from, to) => { if (text.split(from).length !== 2) throw Error('Expected one candidate test replacement: ' + from); return text.replace(from, to); };
const write = (file, text) => fs.writeFileSync(path.join(candidate, file.replaceAll('/', '__')), text);
let owner = read('services/purchasing/__tests__/purchase-return-credit.service.test.ts');
owner = replace(owner, 'import { reversePurchaseCorrectionLedgerInTx }', 'import { preparePurchaseCorrectionReversalInTx, recordPurchaseCorrectionReversalCloseInvalidationsInTx, reversePurchaseCorrectionLedgerInTx }');
owner = replace(owner, 'import { getOpenPeriodForDate }', 'import { lockJournalReversalCatalogInTx } from "@/services/accounting/journal-reversal-order.service"\nimport { getOpenPeriodForDate }');
owner = replace(owner, 'recordReceiptReturnResolution, resolveReceiptReturnRecognition }', 'recordReceiptReturnResolution, resolveReceiptReturnRecognition, retainReturnReversalRecognition }');
owner = replace(owner, '  reverseSupplierCreditNote,', '  reverseSupplierCreditNote,\n  reversePurchaseReturn,');
owner = replace(owner, 'jest.mock("../purchase-correction-ledger.service", () => ({ reversePurchaseCorrectionLedgerInTx: jest.fn() }))', 'jest.mock("../purchase-correction-ledger.service", () => ({ preparePurchaseCorrectionReversalInTx: jest.fn(), recordPurchaseCorrectionReversalCloseInvalidationsInTx: jest.fn(), reversePurchaseCorrectionLedgerInTx: jest.fn() }))\njest.mock("@/services/accounting/journal-reversal-order.service", () => ({ lockJournalReversalCatalogInTx: jest.fn() }))');
owner = replace(owner, '    ;(getOpenPeriodForDate as jest.Mock).mockResolvedValue({ id: "period" })', `    ;(getOpenPeriodForDate as jest.Mock).mockResolvedValue({ id: "period" })
    ;(lockJournalReversalCatalogInTx as jest.Mock).mockResolvedValue(undefined)
    ;(preparePurchaseCorrectionReversalInTx as jest.Mock).mockImplementation(async (tx, input) => {
      const period = await getOpenPeriodForDate(input.organizationId, input.reversalDate, tx)
      return { transaction: tx, organizationId: input.organizationId, reversalPeriodId: period.id, affectedPeriodIds: [period.id], originalJournalEntryId: input.originalJournalEntryId }
    })
    ;(recordPurchaseCorrectionReversalCloseInvalidationsInTx as jest.Mock).mockResolvedValue(undefined)`);
owner = replace(owner, 'expect(reversePurchaseCorrectionLedgerInTx).toHaveBeenCalledWith(f.tx, expect.objectContaining({ originalJournalEntryId: "journal-1", originalSourceId: second.supplierCreditNote.id }))', 'expect(reversePurchaseCorrectionLedgerInTx).toHaveBeenCalledWith(f.tx, expect.objectContaining({ originalJournalEntryId: "journal-1", originalSourceId: second.supplierCreditNote.id }), expect.objectContaining({ transaction: f.tx, affectedPeriodIds: ["period"] }))');
const tests = `
  function returnReversalFixture(noValue = false) {
    const tx = buildTx(), date = new Date("2026-09-15T12:00:00Z")
    const original = { id: "original-return", direction: "CORRECTION", organizationId: "org-1", occurredAt: new Date("2026-08-15T12:00:00Z"),
      goodsReceiptId: "receipt", purchaseOrderId: "order", supplierId: "supplier", ledgerPostingBatchId: noValue ? null : "original-batch", supplierCreditNotes: [],
      lines: [{ quantity: new Prisma.Decimal(1), inventoryAmount: new Prisma.Decimal(noValue ? 0 : 12), unitCost: new Prisma.Decimal(noValue ? 0 : 12) }] }
    tx.purchaseReturn.findFirst.mockResolvedValue(original); tx.goodsReceipt.findFirst.mockResolvedValue({ locationId: "location" })
    tx.purchaseReturn.create.mockImplementation(async args => ({ id: "reversal", ...args.data, lines: args.data.lines.create }))
    ;(readPurchaseReturnAccountingEvidence as jest.Mock).mockResolvedValue({ journalEntryId: noValue ? null : "original-journal" })
    ;(retainReturnReversalRecognition as jest.Mock).mockResolvedValue(noValue ? { version: 2 } : null)
    ;(reversePurchaseCorrectionLedgerInTx as jest.Mock).mockResolvedValue({ ledgerStatus: "POSTED", ledgerBatch: { id: "reversal-batch" }, journalEntryId: "reversal-journal" })
    mockDb.$transaction.mockImplementation(async work => work(tx))
    return { tx, input: { organizationId: "org-1", purchaseReturnId: original.id, postedById: "actor-1", idempotencyKey: "return-reversal-owned", occurredAt: date, reason: "Correct original return" } }
  }
  it.each([false, true])("prepares return reversal before numbering and defers Close locks beyond stock/source effects, zeroValue=%s", async noValue => {
    const f = returnReversalFixture(noValue), authority = jest.fn().mockResolvedValue(undefined)
    await reversePurchaseReturn(f.input, undefined, { assertCurrentAuthority: authority })
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "ReadCommitted" }))
    expect((lockJournalReversalCatalogInTx as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(f.tx.$queryRaw.mock.invocationCallOrder[0])
    expect((preparePurchaseCorrectionReversalInTx as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(authority.mock.invocationCallOrder[0])
    expect(authority.mock.invocationCallOrder[0]).toBeLessThan(mockAllocateNumber.mock.invocationCallOrder[0])
    expect(mockStock).toHaveBeenCalledWith(expect.any(Object), f.tx, expect.objectContaining({ transaction: f.tx, affectedPeriodIds: ["period"], deferCloseInvalidation: true }))
    expect(f.tx.purchaseReturn.create.mock.invocationCallOrder[0]).toBeLessThan((recordPurchaseCorrectionReversalCloseInvalidationsInTx as jest.Mock).mock.invocationCallOrder[0])
    if (noValue) expect(reversePurchaseCorrectionLedgerInTx).not.toHaveBeenCalled()
  })
  it("denies expired authority after return period waits before numbering, stock, ledger or records", async () => {
    const f = returnReversalFixture(), authority = jest.fn().mockRejectedValue(new Error("Fresh authentication required"))
    await expect(reversePurchaseReturn(f.input, undefined, { assertCurrentAuthority: authority })).rejects.toThrow("Fresh authentication")
    expect(preparePurchaseCorrectionReversalInTx).toHaveBeenCalled()
    for (const write of [mockAllocateNumber, mockStock, reversePurchaseCorrectionLedgerInTx, f.tx.purchaseReturn.create, f.tx.auditLog.create, recordPurchaseCorrectionReversalCloseInvalidationsInTx]) expect(write).not.toHaveBeenCalled()
  })
  it("replays a retained reversal without a new period check or effects", async () => {
    const f = returnReversalFixture(); f.tx.purchaseReturn.findUnique.mockResolvedValue({ id: "retained", payloadHash: "sha256:payload-hash" })
    const result = await reversePurchaseReturn(f.input)
    expect(result.replayed).toBe(true); expect(lockJournalReversalCatalogInTx).not.toHaveBeenCalled(); expect(mockAllocateNumber).not.toHaveBeenCalled()
  })
`;
const last = owner.lastIndexOf('\n})'); if (last < 0) throw Error('Owner describe end missing');
owner = owner.slice(0, last) + tests + owner.slice(last);
write('services/purchasing/__tests__/purchase-return-credit.service.test.ts', owner);
let stock = read('services/inventory/__tests__/inventory-stock-event.service.test.ts');
stock += `
it("defers Close invalidation for a prepared same-transaction reversal without exposing control in the event payload", async () => {
  const tx = { ...mockedDb } as Partial<typeof mockedDb>; delete tx.$transaction
  mockedDb.$queryRaw.mockResolvedValue([{ id: "period-1", organizationId: "org-1", status: "OPEN", startDate: new Date("2026-06-01"), endDate: new Date("2026-07-01") }])
  ;(validateReceiptReturnStockAllocationInTx as jest.Mock).mockResolvedValue(new Map([["receipt-line-1", "0.01"]]))
  await postPurchaseReturnStock(allocatedReturnInput("0.200", "0.01", PurchaseCorrectionDirection.REVERSAL), tx as unknown as Prisma.TransactionClient,
    { transaction: tx as unknown as Prisma.TransactionClient, organizationId: "org-1", affectedPeriodIds: ["period-1", "later-period"], deferCloseInvalidation: true })
  expect(mockedDb.inventoryTransaction.create).toHaveBeenCalled()
  expect(mockedDb.closeRun.findMany).not.toHaveBeenCalled()
  const payload = mockedDb.businessEvent.create.mock.calls[0][0].data.payload
  expect(payload).not.toHaveProperty("closeInvalidationControl"); expect(payload).not.toHaveProperty("affectedPeriodIds")
})
it("refuses a prepared stock context from a different transaction before writes", () => {
  const tx = {} as Prisma.TransactionClient
  expect(() => postPurchaseReturnStock(allocatedReturnInput("0.200", "0.01", PurchaseCorrectionDirection.REVERSAL), tx,
    { transaction: {} as Prisma.TransactionClient, organizationId: "org-1", affectedPeriodIds: ["period-1"], deferCloseInvalidation: true })).toThrow("same transaction")
  expect(mockedDb.inventoryTransaction.create).not.toHaveBeenCalled()
})
`;
stock = stock.replace('direction = PurchaseCorrectionDirection.CORRECTION)', 'direction: PurchaseCorrectionDirection = PurchaseCorrectionDirection.CORRECTION)');
write('services/inventory/__tests__/inventory-stock-event.service.test.ts', stock);
let registry = read('services/accounting/__tests__/close-assurance-pack.service.test.ts');
registry = 'import { CLOSE_CERTIFICATION_INVALIDATION_SOURCES } from "../close-assurance-pack.service"\n' + registry;
registry += `
it("labels no-journal supplier credit reversals with their real source model and event", () => {
  expect(CLOSE_CERTIFICATION_INVALIDATION_SOURCES.SUPPLIER_CREDIT_NOTE_REVERSED).toMatchObject({
    sourceCode: "SUPPLIER_CREDIT_NOTE_REVERSED", sourceModel: "SupplierCreditNote", sourceTable: "supplier_credit_notes", sourceEventName: "purchase.supplier_credit.reversed", domain: "ledger",
  })
})
`;
registry = registry.replaceAll('{ closeRunId: "close-run-1" }, {', '{ closeRunId: "close-run-1", mode: "DRAFT_NOT_CERTIFIED" }, {');
write('services/accounting/__tests__/close-assurance-pack.service.test.ts', registry);
const paths = ['services/purchasing/__tests__/purchase-correction-ledger.service.test.ts', 'services/purchasing/__tests__/purchase-return-credit.service.test.ts', 'services/inventory/__tests__/inventory-stock-event.service.test.ts', 'services/accounting/__tests__/close-assurance-pack.service.test.ts'];
const rows = paths.map(file => ({ path: file, candidate: path.join(candidate, file.replaceAll('/', '__')), sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(candidate, file.replaceAll('/', '__')))).digest('hex') }));
fs.writeFileSync(path.join(candidate, 'test-manifest.json'), JSON.stringify(rows, null, 2) + '\n');
console.log(JSON.stringify({ candidateTests: rows.length, applicationFilesChanged: false }));
