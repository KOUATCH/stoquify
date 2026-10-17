import { Prisma } from "@prisma/client"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { readInvoiceReceiptRecognition, resolveInvoiceReceiptRecognition, type InvoiceReceiptRecognition, type InvoiceReceiptRecognitionInput } from "../invoice-receipt-recognition"
import { readReceiptRecognitionEvidence, readReceiptRecognitionSource } from "@/services/purchase-order/receipt-recognition-source"
import { readReceiptReturnAllocations } from "../receipt-return-recognition"

jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/purchase-order/receipt-recognition-source", () => ({ readReceiptRecognitionSource: jest.fn(), readReceiptRecognitionEvidence: jest.fn() }))
jest.mock("../receipt-return-recognition", () => ({ readReceiptReturnAllocations: jest.fn() }))
beforeEach(() => {
  ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue(null)
  ;(readReceiptRecognitionEvidence as jest.Mock).mockReset()
  ;(readReceiptReturnAllocations as jest.Mock).mockResolvedValue({ lines: new Map(), evidenceHash: hashBusinessPayload([]) })
})

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
it("does not let a marked failed receipt fall back to legacy invoice recognition", async () => {
  const f = fixture(); legacy(f)
  ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue({ manifest: { supplierId: "supplier", currency: "XAF", lines: [{ receiptLineId: "line", stockTracked: true }] } })
  ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "BLOCKED" })
  await expect(resolveInvoiceReceiptRecognition(f.tx, f.input)).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
function marked(f: ReturnType<typeof fixture>) {
  ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue({ sourceHash: "c".repeat(64), inventoryValue: f.line.lineTotal, manifest: { supplierId: "supplier", currency: "XAF", lines: [{ receiptLineId: "line", stockTracked: true, quantity: f.line.receivedQuantity.toFixed(3), value: f.line.lineTotal.toFixed(2) }] } })
  ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "POSTED", batchId: "batch", journalId: "journal", evidenceHash: "a".repeat(64) })
}
it("uses the shared marked receipt proof and retains non-stock invoice amounts", async () => {
  const f = fixture(); marked(f)
  f.input.lines.push({ goodsReceiptLineId: null, quantity: "1", unitCost: "5" }); f.input.subtotal = "30"; f.input.total = "30"
  const result = await resolveInvoiceReceiptRecognition(f.tx, f.input)
  expect(result.amounts.sourceAmount.toString()).toBe("5")
  expect(result.amounts.costAmount.toString()).toBe("25")
  expect(result.recognition?.allocations[0].receiptEvidenceHash).toBe("a".repeat(64))
  expect(result.recognition?.returnAllocationHash).toMatch(/^[a-f0-9]{64}$/)
})
it("caps invoice allocation at the verified unreleased quantity and GRNI value after a return", async () => {
  const f = fixture(); marked(f)
  ;(readReceiptReturnAllocations as jest.Mock).mockResolvedValue({ lines: new Map([["line", { uninvoicedQuantity: d(3), grniAmount: d("7.50") }]]), evidenceHash: "b".repeat(64) })
  await expect(resolveInvoiceReceiptRecognition(f.tx, { ...f.input, subtotal: "20", total: "20", lines: [{ goodsReceiptLineId: "line", quantity: "8", unitCost: "2.50" }] })).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
  const result = await resolveInvoiceReceiptRecognition(f.tx, { ...f.input, subtotal: "17.50", total: "17.50", lines: [{ goodsReceiptLineId: "line", quantity: "7", unitCost: "2.50" }] })
  expect(result.amounts.costAmount.toFixed(2)).toBe("17.50")
  expect(result.amounts.sourceAmount.toFixed(2)).toBe("0.00")
})
it("allocates the remaining master pool after a fractional return consumed the original cent", async () => {
  const f = fixture("1", ".01"); marked(f)
  ;(readReceiptReturnAllocations as jest.Mock).mockResolvedValue({ lines: new Map([["line", { uninvoicedQuantity: d(".5"), grniAmount: d(".01") }]]), evidenceHash: "b".repeat(64) })
  const result = await resolveInvoiceReceiptRecognition(f.tx, partial(f.input, "invoice", ".5"))
  expect(result.recognition).toMatchObject({ version: 2, allocations: [{ receiptCost: "0.00", invoiceNet: "0.01", costAllocation: { sourceQuantity: "1.000", sourceValue: "0.01", consumedQuantity: "0.500", consumedValue: "0.01", allocatedValue: "0.00" } }] })
  expect(result.amounts.varianceAmount?.toFixed(2)).toBe("0.01")
})
it("freezes prior v2 invoice cost while allocating the final fractional residual", async () => {
  const f = fixture("1", ".01"); marked(f)
  const firstInput = partial(f.input, "first", ".3"), first = await resolveInvoiceReceiptRecognition(f.tx, firstInput)
  previous(f, firstInput, first.recognition!)
  const next = await resolveInvoiceReceiptRecognition(f.tx, partial(f.input, "next", ".7"))
  expect(first.recognition?.allocations[0].receiptCost).toBe("0.00")
  expect(next.recognition?.allocations[0]).toMatchObject({ receiptCost: "0.01", costAllocation: { consumedQuantity: "0.300", consumedValue: "0.00", allocatedValue: "0.01" } })
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

function nonStock(f: ReturnType<typeof fixture>, pure = false) {
  const service = { ...f.line, id: "service-line", itemId: "service", purchaseOrderLineId: "service-po-line", receivedQuantity: d(1), unitCost: d(5), lineTotal: d(5) }
  const lines = pure ? [service] : [f.line, service]
  f.receipt.lines = lines
  f.mock.goodsReceiptLine.findMany.mockResolvedValue(lines.map(line => ({ ...line, goodsReceipt: f.receipt, purchaseOrderLine: { purchaseOrderId: "order", itemId: line.itemId } })))
  f.input.lines = lines.map(line => ({ goodsReceiptLineId: line.id, quantity: line.receivedQuantity, unitCost: line.unitCost }))
  f.input.subtotal = f.input.total = lines.reduce((sum, line) => sum.plus(line.lineTotal), d(0))
  const source = { sourceHash: "c".repeat(64), inventoryValue: pure ? d(0) : f.line.lineTotal, manifest: { supplierId: "supplier", currency: "XAF", lines: lines.map(line => ({ receiptLineId: line.id, stockTracked: line.id !== "service-line", quantity: line.receivedQuantity.toFixed(3), value: line.lineTotal.toFixed(2) })) } }
  ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue(source)
  ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: pure ? "NOT_REQUIRED" : "POSTED", batchId: pure ? null : "batch", journalId: pure ? null : "journal", evidenceHash: "a".repeat(64) })
  return source
}
function zeroReceipt(f: ReturnType<typeof fixture>) {
  marked(f)
  ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "NOT_REQUIRED", batchId: null, journalId: null, evidenceHash: "a".repeat(64) })
}
it("retains an originally zero stock receipt as v3 evidence without fictitious journals", async () => {
  const f = fixture("1", "0"); zeroReceipt(f)
  const result = await resolveInvoiceReceiptRecognition(f.tx, partial(f.input, "invoice", "1", "1"))
  expect(result.recognition).toMatchObject({ version: 3, residualSources: [], allocations: [{ receiptCost: "0.00", accountingStatus: "NOT_REQUIRED", receiptBatchId: null, receiptJournalId: null, costAllocation: { sourceValue: "0.00", allocatedValue: "0.00" } }] })
  expect(result.amounts).toMatchObject({ sourceAmount: d(0), costAmount: d(0), varianceAmount: d(1) })
  expect(result.conditionContext).toMatchObject({ receiptRecognition: "ACCRUAL", receiptVarianceDirection: "DEBIT" })
  expect(result.conditionContext).not.toHaveProperty("receiptResidualTreatment")
  expect(readInvoiceReceiptRecognition(result.recognition, partial(f.input, "invoice", "1", "1"))).toEqual(result.recognition)
})
it("retains exact zero allocations across partial invoices and frozen recovery", async () => {
  const f = fixture("1", "0"); zeroReceipt(f)
  const firstInput = partial(f.input, "first", ".4", "1"), first = await resolveInvoiceReceiptRecognition(f.tx, firstInput)
  previous(f, firstInput, first.recognition!)
  const final = await resolveInvoiceReceiptRecognition(f.tx, partial(f.input, "final", ".6", "1"))
  expect(final.recognition?.allocations[0]).toMatchObject({ priorQuantity: "0.400", priorCost: "0.00", receiptCost: "0.00" })
  expect(await resolveInvoiceReceiptRecognition(f.tx, { ...firstInput, retainedRecognition: first.recognition })).toEqual(first)
})
it.each([false, true])("retains all fresh non-stock invoice sources (pure=%s)", async pure => {
  const f = fixture(); nonStock(f, pure)
  const result = await resolveInvoiceReceiptRecognition(f.tx, f.input)
  expect(result.recognition).toMatchObject({ version: 3, residualSources: [{ receiptLineId: "service-line", receiptId: "receipt", quantity: "1.000", invoiceNet: "5.00", sourceHash: "c".repeat(64), evidenceHash: "a".repeat(64) }] })
  expect(result.recognition?.allocations).toHaveLength(pure ? 0 : 1)
  expect(result.amounts.sourceAmount).toEqual(d(5))
  expect(result.amounts.costAmount).toEqual(d(pure ? 0 : 25))
  expect(result.conditionContext).toMatchObject({ receiptRecognition: "ACCRUAL", receiptResidualTreatment: "NON_STOCK" })
  expect(await resolveInvoiceReceiptRecognition(f.tx, { ...f.input, retainedRecognition: result.recognition })).toEqual(result)
})
it("groups repeated non-stock lines using the same retained line-level net rounding", async () => {
  const f = fixture(); nonStock(f, true)
  f.input.lines = [{ goodsReceiptLineId: "service-line", quantity: ".3", unitCost: ".01" }, { goodsReceiptLineId: "service-line", quantity: ".7", unitCost: ".01" }]
  f.input.subtotal = f.input.total = ".01"
  const result = await resolveInvoiceReceiptRecognition(f.tx, f.input)
  expect(result.recognition?.residualSources).toMatchObject([{ quantity: "1.000", invoiceNet: "0.01" }])
  expect(readInvoiceReceiptRecognition(result.recognition, f.input)).toEqual(result.recognition)
})
it("refuses to combine fresh non-stock amounts with unclassified residuals", async () => {
  const f = fixture(); nonStock(f)
  f.input.lines.push({ goodsReceiptLineId: null, quantity: 1, unitCost: 5 }); f.input.subtotal = f.input.total = 35
  await expect(resolveInvoiceReceiptRecognition(f.tx, f.input)).rejects.toThrow("unverified legacy")
})
it("does not silently upgrade an earlier mixed v2 proof during recovery", async () => {
  const f = fixture(); nonStock(f)
  const result = await resolveInvoiceReceiptRecognition(f.tx, f.input)
  const old = { ...result.recognition!, version: 2 as const, allocations: result.recognition!.allocations.map(({ accountingStatus: _status, ...allocation }) => allocation) }
  delete old.residualSources
  await expect(resolveInvoiceReceiptRecognition(f.tx, { ...f.input, retainedRecognition: old })).rejects.toThrow("different receipt treatment")
})
it.each(["missing", "duplicate", "extra", "quantity", "net", "invoice", "foreign tenant", "source hash", "evidence hash", "receipt id"])('rejects retained non-stock %s corruption', async corruption => {
  const f = fixture(); nonStock(f)
  const result = await resolveInvoiceReceiptRecognition(f.tx, f.input), proof = JSON.parse(JSON.stringify(result.recognition)) as InvoiceReceiptRecognition
  const residual = proof.residualSources![0]
  if (corruption === "missing") proof.residualSources = []
  if (corruption === "duplicate") proof.residualSources!.push({ ...residual })
  if (corruption === "extra") proof.residualSources!.push({ ...residual, receiptLineId: "unrelated" })
  if (corruption === "quantity") residual.quantity = "0.500"
  if (corruption === "net") residual.invoiceNet = "4.00"
  if (corruption === "invoice") proof.invoiceId = "another"
  if (corruption === "foreign tenant") proof.organizationId = "foreign"
  if (corruption === "source hash") residual.sourceHash = "d".repeat(64)
  if (corruption === "evidence hash") residual.evidenceHash = "d".repeat(64)
  if (corruption === "receipt id") residual.receiptId = "another"
  await expect(resolveInvoiceReceiptRecognition(f.tx, { ...f.input, retainedRecognition: proof })).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
it.each(["source", "accounting", "classification"])('rejects a changed live non-stock %s after review', async change => {
  const f = fixture(), source = nonStock(f), result = await resolveInvoiceReceiptRecognition(f.tx, f.input)
  if (change === "source") source.sourceHash = "d".repeat(64)
  if (change === "classification") source.manifest.lines[1].stockTracked = true
  if (change === "accounting") (readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "POSTED", batchId: "batch", journalId: "journal", evidenceHash: "d".repeat(64) })
  await expect(resolveInvoiceReceiptRecognition(f.tx, { ...f.input, retainedRecognition: result.recognition })).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
it.each(["batch", "journal", "cost", "status"])('rejects a fabricated zero-receipt %s in retained v3 evidence', async change => {
  const f = fixture("1", "0"); zeroReceipt(f)
  const input = partial(f.input, "invoice", "1", "1"), result = await resolveInvoiceReceiptRecognition(f.tx, input)
  const proof = JSON.parse(JSON.stringify(result.recognition)) as InvoiceReceiptRecognition, allocation = proof.allocations[0]
  if (change === "batch") allocation.receiptBatchId = "invented"
  if (change === "journal") allocation.receiptJournalId = "invented"
  if (change === "cost") allocation.receiptCost = "1.00"
  if (change === "status") allocation.accountingStatus = "POSTED"
  await expect(resolveInvoiceReceiptRecognition(f.tx, { ...input, retainedRecognition: proof })).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
