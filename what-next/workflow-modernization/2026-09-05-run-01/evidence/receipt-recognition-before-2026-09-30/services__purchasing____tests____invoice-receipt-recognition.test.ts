import { Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { resolveInvoiceReceiptRecognition, type InvoiceReceiptRecognition, type InvoiceReceiptRecognitionInput } from "../invoice-receipt-recognition"

jest.mock("@/prisma/db", () => ({ db: {} }))

const d = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n)
const date = new Date("2026-09-30T12:00:00Z")
function fixture(qty = "10", cost = "2.50") {
  const value = d(qty).times(cost).toDecimalPlaces(2)
  const source = { organizationId: "org", sourceType: "GOODS_RECEIPT", sourceId: "receipt" }
  const stock = { itemId: "item", locationId: "location", quantity: qty, unitCost: cost, movementType: "PURCHASE_RECEIPT", referenceType: "GOODS_RECEIPT", referenceId: "receipt", batchNumber: null, serialNumbers: [], expiryDate: null }
  const line = { id: "line", goodsReceiptId: "receipt", itemId: "item", purchaseOrderLineId: "po-line", receivedQuantity: d(qty), unitCost: d(cost), lineTotal: value, batchNumber: null, serialNumbers: [], expiryDate: null }
  const receipt = { id: "receipt", organizationId: "org", purchaseOrderId: "order", purchaseOrder: { organizationId: "org", supplierId: "supplier", deletedAt: null }, locationId: "location", receiptNumber: "GR-1", receiptDate: date, inventoryPostedAt: date, status: "RECEIVED", deletedAt: null, lines: [line] }
  const entry = { ...source, id: "journal", postingPurpose: "GOODS_RECEIPT", postingBatchId: "batch", periodId: "period", status: "POSTED", postedAt: date, reversedAt: null, reversalOfEntryId: null, entryDate: date, currency: "XAF", reversedByEntries: [] as Array<{ id: string }>, lines: [
    { id: "debit", accountId: "inventory", lineNumber: 1, organizationId: "org", debit: value, credit: d(0), currency: "XAF", account: { organizationId: "org", mappingKey: "INVENTORY" } },
    { id: "credit", accountId: "grni", lineNumber: 2, organizationId: "org", debit: d(0), credit: value, currency: "XAF", account: { organizationId: "org", mappingKey: "GRNI" } },
  ] }
  const batch = { ...source, id: "batch", postingPurpose: "GOODS_RECEIPT", status: "POSTED", postedAt: date as Date | null, reversedAt: null, periodId: "period", sourceLinks: [{ ...source, journalEntryId: "journal", sourceNumber: "GR-1", sourceDate: date, metadata: { documentHash: "sha256:receipt" } }], journalEntries: [entry] }
  const payload = { sourceId: "receipt", sourceType: "GOODS_RECEIPT", eventType: "purchase.goods_receipt.stock_posted", documentHash: "sha256:receipt", lines: [stock] }
  const event = { ...source, id: "stock-event", eventSource: "INTERNAL", schemaVersion: 1, eventType: "purchase.goods_receipt.stock_posted", status: "APPLIED", processedAt: date, payload, payloadHash: hashBusinessPayload(payload), documentHash: "sha256:receipt" }
  const mock = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    goodsReceiptLine: { findMany: jest.fn().mockResolvedValue([{ ...line, goodsReceipt: receipt, purchaseOrderLine: { purchaseOrderId: "order", itemId: "item" } }]) },
    ledgerPostingBatch: { findMany: jest.fn().mockResolvedValue([batch]) },
    journalEntry: { findMany: jest.fn().mockResolvedValue([{ id: "journal", sourceId: "receipt", postingBatchId: "batch" }]), findFirst: jest.fn().mockResolvedValue(null) },
    accountingSourceLink: { findMany: jest.fn().mockResolvedValue([{ id: "link", sourceId: "receipt", postingBatchId: "batch", journalEntryId: "journal" }]) },
    businessEvent: { findMany: jest.fn().mockResolvedValue([event]), findFirst: jest.fn().mockResolvedValue(null) },
    inventoryTransaction: { findMany: jest.fn().mockResolvedValue([{ ...stock, quantity: d(qty), unitCost: d(cost), type: "PURCHASE_RECEIPT" }]) },
    purchaseReturnLine: { findFirst: jest.fn().mockResolvedValue(null) },
    supplierInvoice: { findMany: jest.fn().mockResolvedValue([]) },
  }
  const input: InvoiceReceiptRecognitionInput = { organizationId: "org", supplierId: "supplier", invoiceId: "invoice", currency: "XAF", subtotal: value, total: value, taxAmount: 0, lines: [{ goodsReceiptLineId: "line", quantity: qty, unitCost: cost }] }
  return { mock, tx: mock as unknown as Prisma.TransactionClient, input, batch, entry, event, receipt, line }
}

function legacy(f: ReturnType<typeof fixture>) {
  f.mock.ledgerPostingBatch.findMany.mockResolvedValue([])
  f.mock.journalEntry.findMany.mockResolvedValue([])
  f.mock.accountingSourceLink.findMany.mockResolvedValue([])
}
function partial(input: InvoiceReceiptRecognitionInput, invoiceId: string, qty: string, unitCost = "0.01"): InvoiceReceiptRecognitionInput {
  const subtotal = d(qty).times(unitCost).toDecimalPlaces(2)
  return { ...input, invoiceId, subtotal, total: subtotal, lines: [{ goodsReceiptLineId: "line", quantity: qty, unitCost }] }
}
function previous(f: ReturnType<typeof fixture>, input: InvoiceReceiptRecognitionInput, proof: InvoiceReceiptRecognition) {
  const invoice = { ...input, id: input.invoiceId, subtotal: d(input.subtotal), total: d(input.total), taxAmount: d(input.taxAmount), lines: input.lines.map(line => ({ ...line, quantity: d(line.quantity), unitCost: d(line.unitCost) })), deletedAt: null, status: "POSTED", createdById: "maker", approvedById: "approver", postedAt: date, postedBusinessEventId: "approval", ledgerPostingBatchId: "invoice-batch", metadata: { receiptRecognition: proof } }
  const payload = { receiptRecognitionHash: hashBusinessPayload(proof) }
  f.mock.supplierInvoice.findMany.mockResolvedValue([invoice])
  f.mock.businessEvent.findFirst.mockResolvedValue({ id: "approval", organizationId: "org", eventType: "purchase.supplier_invoice.posted", eventSource: "INTERNAL", schemaVersion: 1, status: "APPLIED", processedAt: date, occurredAt: date, postingBatchId: "invoice-batch", sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id, actorId: "approver", payload, payloadHash: hashBusinessPayload(payload) })
  return invoice
}

it("preserves the exact legacy posting amount shape and omits context", async () => {
  const f = fixture(); legacy(f)
  const result = await resolveInvoiceReceiptRecognition(f.tx, f.input)
  expect(result).toEqual({ amounts: { sourceAmount: d(25), netAmount: d(25), grossAmount: d(25), taxAmount: d(0), costAmount: d(25) } })
  expect(f.mock.businessEvent.findMany).not.toHaveBeenCalled()
})
it("keeps a failed receipt without accounting effects on the legacy path", async () => {
  const f = fixture(); legacy(f)
  f.mock.ledgerPostingBatch.findMany.mockResolvedValue([{ ...f.batch, status: "FAILED", postedAt: null, journalEntries: [], sourceLinks: [] }])
  expect((await resolveInvoiceReceiptRecognition(f.tx, f.input)).recognition).toBeUndefined()
})
it("clears recognized accrual without recognizing inventory a second time", async () => {
  const f = fixture(), result = await resolveInvoiceReceiptRecognition(f.tx, f.input)
  expect(result.amounts.sourceAmount.toString()).toBe("0")
  expect(result.amounts.costAmount.toString()).toBe("25")
  expect(result.conditionContext).toMatchObject({ receiptRecognition: "ACCRUAL", receiptVarianceDirection: "NONE", receiptRecognitionHash: hashBusinessPayload(result.recognition) })
})
it.each([["3", "DEBIT", "5"], ["2", "CREDIT", "5"]])("keeps receipt cost and explicitly directs invoice price %s variance", async (cost, direction, variance) => {
  const f = fixture(); f.input = partial(f.input, "invoice", "10", cost)
  const result = await resolveInvoiceReceiptRecognition(f.tx, f.input)
  expect(result.amounts.costAmount.toString()).toBe("25")
  expect(result.amounts.varianceAmount?.toString()).toBe(variance)
  expect(result.conditionContext?.receiptVarianceDirection).toBe(direction)
})
it("handles repeated receipt lines as one quantity reservation while retaining line-level net rounding", async () => {
  const f = fixture(); f.input.lines = [{ goodsReceiptLineId: "line", quantity: 3, unitCost: "2.50" }, { goodsReceiptLineId: "line", quantity: 7, unitCost: "2.50" }]
  const result = await resolveInvoiceReceiptRecognition(f.tx, f.input)
  expect(result.recognition?.allocations).toHaveLength(1)
  expect(result.recognition?.allocations[0].quantity).toBe("10.000")
})
it("allocates rounding cumulatively across approved invoices even when their ledger was blocked", async () => {
  const f = fixture("1", "0.01"), firstInput = partial(f.input, "first", "0.333", "0.02")
  const first = await resolveInvoiceReceiptRecognition(f.tx, firstInput)
  previous(f, firstInput, first.recognition!)
  const second = await resolveInvoiceReceiptRecognition(f.tx, partial(f.input, "second", "0.667", "0.02"))
  expect(first.recognition?.allocations[0].receiptCost).toBe("0.00")
  expect(second.recognition?.allocations[0].receiptCost).toBe("0.01")
  expect(second.recognition?.allocations[0].priorQuantity).toBe("0.333")
})
it("recovery retains reviewed allocation after subsequent invoices reserve more quantity", async () => {
  const f = fixture("1", "0.01"), input = partial(f.input, "first", "0.333")
  const result = await resolveInvoiceReceiptRecognition(f.tx, input)
  f.mock.supplierInvoice.findMany.mockRejectedValue(new Error("Recovery must not reallocate"))
  expect(await resolveInvoiceReceiptRecognition(f.tx, { ...input, retainedRecognition: result.recognition })).toEqual(result)
})
it("rejects legacy invoice recovery after its receipt has gained accounting recognition", async () => {
  const f = fixture()
  await expect(resolveInvoiceReceiptRecognition(f.tx, { ...f.input, retainedRecognition: undefined })).rejects.toThrow("allocation evidence is missing")
})
it("rejects an earlier invoice that used the old inventory debit for a now-recognized receipt", async () => {
  const f = fixture(), result = await resolveInvoiceReceiptRecognition(f.tx, f.input), invoice = previous(f, f.input, result.recognition!)
  invoice.metadata = { receiptRecognition: undefined as unknown as InvoiceReceiptRecognition }
  await expect(resolveInvoiceReceiptRecognition(f.tx, { ...f.input, invoiceId: "next" })).rejects.toThrow("allocation evidence is missing")
})
it("rejects missing approval binding for an earlier reservation", async () => {
  const f = fixture(), result = await resolveInvoiceReceiptRecognition(f.tx, f.input)
  previous(f, f.input, result.recognition!)
  f.mock.businessEvent.findFirst.mockResolvedValue(null)
  await expect(resolveInvoiceReceiptRecognition(f.tx, { ...f.input, invoiceId: "next" })).rejects.toThrow("no verified approval")
})
it("rejects over-allocation instead of posting a negative or duplicate accrual", async () => {
  const f = fixture(); f.input = partial(f.input, "invoice", "11", "2.50")
  await expect(resolveInvoiceReceiptRecognition(f.tx, f.input)).rejects.toThrow("exceeds")
})
const corruptions: Array<[string, (f: ReturnType<typeof fixture>) => void]> = [
  ["foreign supplier", f => { f.receipt.purchaseOrder.supplierId = "other" }],
  ["orphan journal", f => { f.mock.ledgerPostingBatch.findMany.mockResolvedValue([]) }],
  ["ambiguous batch", f => { f.mock.ledgerPostingBatch.findMany.mockResolvedValue([f.batch, f.batch]) }],
  ["reversed receipt", f => { f.entry.reversedByEntries = [{ id: "reversal" }] }],
  ["wrong accrual account", f => { f.entry.lines[1].account.mappingKey = "ACCOUNTS_PAYABLE" }],
  ["tampered stock event", f => { f.event.payloadHash = "changed" }],
  ["missing inventory effects", f => { f.mock.inventoryTransaction.findMany.mockResolvedValue([]) }],
  ["wrong currency", f => { f.entry.currency = "USD" }],
  ["return or reversal needing review", f => { f.mock.purchaseReturnLine.findFirst.mockResolvedValue({ id: "return-line" }) }],
]
it.each(corruptions)("fails closed for %s", async (_name, change) => {
  const f = fixture(); change(f)
  await expect(resolveInvoiceReceiptRecognition(f.tx, f.input)).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
it("rejects frozen proof after source quantity changes", async () => {
  const f = fixture(), result = await resolveInvoiceReceiptRecognition(f.tx, f.input)
  await expect(resolveInvoiceReceiptRecognition(f.tx, { ...partial(f.input, "invoice", "9", "2.50"), retainedRecognition: result.recognition })).rejects.toThrow("does not match")
})
