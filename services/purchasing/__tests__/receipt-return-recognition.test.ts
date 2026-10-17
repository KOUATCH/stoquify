import { Prisma } from "@prisma/client"
import { hashBusinessPayload, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { readReceiptRecognitionEvidence, readReceiptRecognitionSource, type ReceiptRecognitionSource } from "@/services/purchase-order/receipt-recognition-source"
import { assertPurchaseReturnClaimFunding, listReceiptReturnRecoverySources, readPurchaseReturnAccountingEvidence, readReceiptReturnAllocations, readReceiptReturnStockValuations, recordReceiptReturnRecognition, recordReceiptReturnResolution, resolveReceiptReturnRecognition, retainReturnReversalRecognition, validateReceiptReturnStockForRecognition, validateReceiptReturnStockAllocationInTx, type ReceiptReturnRecognition } from "../receipt-return-recognition"
import { allocateReceiptCost } from "@/services/inventory/receipt-cost-allocation"

jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/purchase-order/receipt-recognition-source", () => ({ readReceiptRecognitionSource: jest.fn(), readReceiptRecognitionEvidence: jest.fn() }))
jest.mock("@/services/events/business-event.service", () => ({ ...jest.requireActual("@/services/events/business-event.service"), recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn() }))

const d = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n)
const date = new Date("2026-09-30T12:00:00Z"), h = "a".repeat(64), receiptHash = "b".repeat(64)
function fixture() {
  const source: ReceiptRecognitionSource = { eventId: "accepted", sourceHash: h, inventoryValue: d(25), manifest: { version: 1, organizationId: "org", receiptId: "receipt", receiptNumber: "GR-1", purchaseOrderId: "order", supplierId: "supplier", locationId: "location", currency: "EUR", receiptDate: date.toISOString(), effectiveAt: date.toISOString(), acceptance: { kind: "inspection", id: "inspection", actorId: "inspector", at: date.toISOString(), sourceHash: h }, lines: [{ receiptLineId: "line", purchaseOrderLineId: "po-line", itemId: "item", quantity: "10.000", unitCost: "2.50", value: "25.00", stockTracked: true, batchNumber: null, expiryDate: null, serialNumbers: [] }] } }
  const plan = { sourceGoodsReceiptLineId: "line", sourcePurchaseOrderLineId: "po-line", itemId: "item", quantity: d(3), invoicedQuantity: d(0), uninvoicedQuantity: d(3), unitCost: d("2.50"), inventoryAmount: d("7.50"), supplierClaimAmount: d(0), grniAmount: d("7.50") }
  const input = { organizationId: "org", supplierId: "supplier", receiptId: "receipt", returnId: "return", currency: "EUR", plans: [plan] }
  const mock = { $queryRaw: jest.fn().mockResolvedValue([]), purchaseReturn: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) }, supplierInvoice: { findMany: jest.fn().mockResolvedValue([]) }, purchaseReturnLine: { findMany: jest.fn().mockResolvedValue([]) }, businessEvent: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() }, inventoryTransaction: { findMany: jest.fn().mockResolvedValue([]) }, ledgerPostingBatch: { findMany: jest.fn().mockResolvedValue([]) } }
  ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue(source)
  ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "POSTED", batchId: "receipt-batch", journalId: "receipt-journal", evidenceHash: receiptHash })
  return { source, plan, input, mock, tx: mock as unknown as Prisma.TransactionClient }
}
type Fixture = ReturnType<typeof fixture>

async function retained(f: Fixture, status: ReceiptReturnRecognition["status"] = "VERIFIED") {
  const result = await resolveReceiptReturnRecognition(f.tx, f.input)
  const proof = { ...result.recognition, status }
  const allocated = result.allocatedPlans[0]
  const zeroValue = allocated.inventoryAmount.eq(0)
  const row = { id: "return", organizationId: "org", supplierId: "supplier", goodsReceiptId: "receipt", purchaseOrderId: "order", direction: "CORRECTION", reversalOfPurchaseReturnId: null, returnNumber: "PR-1", payloadHash: h, documentHash: "sha256:document", evidenceHash: h, inventoryBusinessEventId: "stock", ledgerPostingBatchId: "return-batch" as string | null, journalEntryId: null as string | null, postedById: "actor", occurredAt: date, lines: [{ ...allocated, id: "returned-line", inventoryTransactionId: "movement", evidenceHash: h }] }
  const stockPayload = { valuationMethod: "RECEIPT_REMAINING_POOL_V2", lines: [{ itemId: "item", locationId: "location", quantity: allocated.quantity.negated().toFixed(3), unitCost: allocated.unitCost.toFixed(2), reversalOfTransactionId: null, receiptValuation: { version: 2, sourceGoodsReceiptLineId: "line", allocatedValue: proof.lines[0].inventoryAmount, recognitionHash: hashBusinessPayload(proof) } }] }
  const stock = { id: "stock", organizationId: "org", sourceType: "PURCHASE_RETURN", sourceId: "return", eventType: "purchase.return.stock_posted", eventSource: "INTERNAL", schemaVersion: 1, status: "APPLIED", processedAt: date, actorId: "actor", occurredAt: date, postingBatchId: "return-batch", documentHash: row.documentHash, payload: stockPayload, payloadHash: hashBusinessPayload(stockPayload) }
  const movement = { id: "movement", organizationId: "org", itemId: "item", locationId: "location", referenceType: "RETURN", referenceId: "return", type: "PURCHASE_RETURN", effectiveAt: date, timeProvenance: "EXPLICIT_SOURCE_TIME", quantity: allocated.quantity.negated(), unitCost: allocated.unitCost, totalCost: allocated.inventoryAmount, reversalOfTransactionId: null as string | null }
  const batch = { id: "return-batch", sourceId: "return", postingPurpose: "PURCHASE_RETURN", status: "FAILED", postedAt: null as Date | null, reversedAt: null as Date | null, metadata: { details: { receiptReturnRecognition: proof } }, journalEntries: [] as ReturnType<typeof journal>[], sourceLinks: [] as ReturnType<typeof link>[] }
  if (f.input.returnId !== "return") {
    row.id = f.input.returnId; row.inventoryBusinessEventId = `${row.id}-stock`; row.ledgerPostingBatchId = `${row.id}-batch`; row.lines[0].inventoryTransactionId = `${row.id}-movement`
    stock.id = row.inventoryBusinessEventId; stock.sourceId = row.id; stock.postingBatchId = row.ledgerPostingBatchId
    movement.id = row.lines[0].inventoryTransactionId; movement.referenceId = row.id
    batch.id = row.ledgerPostingBatchId; batch.sourceId = row.id
  }
  if (zeroValue) { row.ledgerPostingBatchId = null; stock.postingBatchId = null as unknown as string }
  ;(recordBusinessEventInTx as jest.Mock).mockResolvedValue({ created: true, event: { id: "allocation" } })
  await recordReceiptReturnRecognition(f.tx, row as unknown as Parameters<typeof recordReceiptReturnRecognition>[1], proof)
  const args = (recordBusinessEventInTx as jest.Mock).mock.calls.at(-1)[1]
  const allocation = { ...args, id: `${row.id}-allocation`, postingBatchId: row.ledgerPostingBatchId, status: "APPLIED", processedAt: date, payloadHash: hashBusinessPayload(args.payload) }
  const events = [allocation]
  f.mock.purchaseReturn.findMany.mockResolvedValue([row])
  f.mock.purchaseReturn.findFirst.mockResolvedValue(row)
  f.mock.businessEvent.findMany.mockImplementation(async args => args.where.eventType ? events : [stock])
  f.mock.inventoryTransaction.findMany.mockResolvedValue([movement])
  f.mock.ledgerPostingBatch.findMany.mockResolvedValue(zeroValue ? [] : [batch])
  return { proof, row, stock, movement, batch, events, allocation }
}
function link(id = "return") { return { id: `${id}-link`, organizationId: "org", sourceType: "PURCHASE_RETURN", sourceId: id, postingBatchId: `${id}-batch`, journalEntryId: `${id}-journal` } }
function journal(id = "return") {
  return { id: `${id}-journal`, organizationId: "org", sourceType: "PURCHASE_RETURN", sourceId: id, postingPurpose: "PURCHASE_RETURN", postingBatchId: `${id}-batch`, currency: "EUR", entryDate: date, postedAt: date, reversedAt: null as Date | null, status: "POSTED", reversalOfEntryId: null as string | null, reversedByEntries: [] as { id: string }[], lines: [
    { organizationId: "org", currency: "EUR", debit: d(0), credit: d("7.50"), account: { organizationId: "org", mappingKey: "INVENTORY" } },
    { organizationId: "org", currency: "EUR", debit: d("7.50"), credit: d(0), account: { organizationId: "org", mappingKey: "GRNI" } },
  ] }
}
function invoice(f: Fixture, q = "6", receiptCost = "15.00") {
  const net = d(q).times("2.50").toDecimalPlaces(2)
  const row = { id: "invoice", organizationId: "org", supplierId: "supplier", currency: "EUR", subtotal: net, total: net, taxAmount: d(0), deletedAt: null, status: "POSTED", createdById: "maker", approvedById: "checker", postedAt: date, postedBusinessEventId: "invoice-posted", ledgerPostingBatchId: "invoice-batch", lines: [{ goodsReceiptLineId: "line", quantity: d(q), unitCost: d("2.50") }], metadata: {} }
  const sourceHash = hashBusinessPayload({ organizationId: "org", supplierId: "supplier", invoiceId: "invoice", currency: "EUR", subtotal: net.toFixed(2), total: net.toFixed(2), taxAmount: "0.00", lines: [{ receiptLineId: "line", quantity: d(q).toFixed(3), unitCost: "2.50" }] })
  const proof = { version: 1, organizationId: "org", supplierId: "supplier", invoiceId: "invoice", currency: "EUR", invoiceSourceHash: sourceHash, allocations: [{ receiptLineId: "line", receiptId: "receipt", quantity: d(q).toFixed(3), invoiceNet: net.toFixed(2), receiptCost, priorQuantity: "0.000", priorCost: "0.00", receiptBatchId: "receipt-batch", receiptJournalId: "receipt-journal", receiptEvidenceHash: receiptHash }] }
  row.metadata = { receiptRecognition: proof }
  const payload = { receiptRecognitionHash: hashBusinessPayload(proof) }
  const event = { eventType: "purchase.supplier_invoice.posted", eventSource: "INTERNAL", schemaVersion: 1, status: "APPLIED", processedAt: date, sourceType: "SUPPLIER_INVOICE", sourceId: "invoice", actorId: "checker", postingBatchId: "invoice-batch", occurredAt: date, payload, payloadHash: hashBusinessPayload(payload) }
  f.mock.supplierInvoice.findMany.mockResolvedValue([row]); f.mock.businessEvent.findFirst.mockResolvedValue(event)
  f.mock.ledgerPostingBatch.findMany.mockResolvedValue([{ id: "invoice-batch", status: "FAILED", reversedAt: null, postedAt: null, journalEntries: [], sourceLinks: [] }])
  return { row, proof, event }
}

beforeEach(() => jest.clearAllMocks())
it("allocates an uninvoiced return against the verified original EUR accrual", async () => {
  const f = fixture(), result = await resolveReceiptReturnRecognition(f.tx, f.input)
  expect(result.sourceReviewBlocker).toBeUndefined()
  expect(result.recognition).toMatchObject({ status: "VERIFIED", currency: "EUR", receiptEvidenceHash: receiptHash, lines: [{ uninvoicedQuantity: "3.000", inventoryAmount: "7.50", grniAmount: "7.50", supplierClaimAmount: "0.00" }] })
})
it("keeps an unproven legacy physical return explicitly outside automatic GRNI release", async () => {
  const f = fixture(); (readReceiptRecognitionSource as jest.Mock).mockResolvedValue(null)
  expect(await resolveReceiptReturnRecognition(f.tx, f.input)).toMatchObject({ recognition: { status: "REVIEW_REQUIRED" }, sourceReviewBlocker: { code: "PURCHASE_RETURN_SOURCE_REVIEW" } })
})
it.each(["BLOCKED", "UNVERIFIED"])("does not debit a %s original accrual", async status => {
  const f = fixture(); (readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: status })
  expect((await resolveReceiptReturnRecognition(f.tx, f.input)).sourceReviewBlocker).toBeDefined()
})
it("propagates a database failure instead of converting it to an accounting decision", async () => {
  const f = fixture(); (readReceiptRecognitionSource as jest.Mock).mockRejectedValue(new Error("database unavailable"))
  await expect(resolveReceiptReturnRecognition(f.tx, f.input)).rejects.toThrow("database unavailable")
})
it("reserves genuine verified failed return accounting and prevents double accrual allocation", async () => {
  const f = fixture(); await retained(f)
  expect((await readReceiptReturnAllocations(f.tx, f.source)).lines.get("line")?.grniAmount.toString()).toBe("7.5")
  const plan = { ...f.plan, quantity: d(8), uninvoicedQuantity: d(8), inventoryAmount: d(20), grniAmount: d(20) }
  expect((await resolveReceiptReturnRecognition(f.tx, { ...f.input, returnId: "next", plans: [plan] })).sourceReviewBlocker).toBeDefined()
})
it("allows receipt recovery to validate pending physical returns while invoice consumption stays blocked", async () => {
  const f = fixture(); await retained(f, "REVIEW_REQUIRED")
  await expect(validateReceiptReturnStockForRecognition(f.tx, f.source)).resolves.toBeUndefined()
  await expect(readReceiptReturnAllocations(f.tx, f.source)).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
  expect(await listReceiptReturnRecoverySources(f.tx, f.source)).toEqual([expect.objectContaining({ returnId: "return", sourceDate: date, currency: "EUR", inventoryAmount: "7.50", grniAmount: "7.50" })])
})
it("turns missing blocked-batch proof into a source-review error without hashing undefined", async () => {
  const f = fixture(), r = await retained(f)
  Object.assign(r.batch, { metadata: { details: null } })
  await expect(readReceiptReturnAllocations(f.tx, f.source)).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
it.each(["stock quantity", "event hash", "foreign location", "stock time", "stock provenance", "unbacked journal", "different original evidence"])("rejects %s evidence", async kind => {
  const f = fixture(), r = await retained(f)
  if (kind === "stock quantity") r.movement.quantity = d(-4)
  if (kind === "event hash") r.allocation.payloadHash = "changed"
  if (kind === "foreign location") r.movement.locationId = "foreign"
  if (kind === "stock time") r.movement.effectiveAt = new Date("2026-09-29T12:00:00Z")
  if (kind === "stock provenance") r.movement.timeProvenance = "LEGACY"
  if (kind === "unbacked journal") r.row.journalEntryId = "unknown"
  if (kind === "different original evidence") (readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "POSTED", batchId: "receipt-batch", journalId: "receipt-journal", evidenceHash: "c".repeat(64) })
  await expect(readReceiptReturnAllocations(f.tx, f.source)).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
it("retains a source-proven zero-value allocation without inventing a journal blocker", async () => {
  const f = fixture(); Object.assign(f.plan, { unitCost: d(0), inventoryAmount: d(0), grniAmount: d(0) }); Object.assign(f.source.manifest.lines[0], { unitCost: "0.00", value: "0.00" })
  f.source.inventoryValue = d(0)
  ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "NOT_REQUIRED", batchId: null, journalId: null, evidenceHash: receiptHash })
  const result = await resolveReceiptReturnRecognition(f.tx, f.input)
  expect(result.sourceReviewBlocker).toBeUndefined()
  expect(result.recognition).toMatchObject({ version: 2, status: "VERIFIED", lines: [{ inventoryAmount: "0.00" }] })
  const r = await retained(f)
  expect((await readReceiptReturnAllocations(f.tx, f.source)).lines.get("line")?.inventoryAmount.toFixed(2)).toBe("0.00")
  expect(await readPurchaseReturnAccountingEvidence(f.tx, r.row as never)).toMatchObject({ accountingComplete: true, journalEntryId: null })
  expect(await retainReturnReversalRecognition(f.tx, r.row as never, "reverse")).toMatchObject({ version: 2, status: "VERIFIED", receiptJournalId: null })
})
it("partitions a mixed return against frozen invoice funding and remaining receipt accrual", async () => {
  const f = fixture(); invoice(f)
  Object.assign(f.plan, { quantity: d(8), invoicedQuantity: d(6), uninvoicedQuantity: d(2), inventoryAmount: d(20), supplierClaimAmount: d(15), grniAmount: d(5) })
  const result = await resolveReceiptReturnRecognition(f.tx, f.input)
  expect(result.sourceReviewBlocker).toBeUndefined()
  expect(result.recognition.lines[0]).toMatchObject({ quantity: "8.000", invoicedQuantity: "6.000", uninvoicedQuantity: "2.000", supplierClaimAmount: "15.00", grniAmount: "5.00" })
})
it("keeps a fully invoiced return from releasing GRNI a second time", async () => {
  const f = fixture(); invoice(f)
  Object.assign(f.plan, { invoicedQuantity: d(3), uninvoicedQuantity: d(0), supplierClaimAmount: d("7.50"), grniAmount: d(0) })
  const result = await resolveReceiptReturnRecognition(f.tx, f.input)
  expect(result.sourceReviewBlocker).toBeUndefined()
  expect(result.recognition.lines[0].grniAmount).toBe("0.00")
})
function v3ZeroInvoice(f: Fixture) {
  Object.assign(f.source.manifest.lines[0], { unitCost: "0.00", value: "0.00" }); f.source.inventoryValue = d(0)
  Object.assign(f.plan, { invoicedQuantity: d(3), uninvoicedQuantity: d(0), unitCost: d(0), inventoryAmount: d(0), supplierClaimAmount: d(0), grniAmount: d(0) })
  ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "NOT_REQUIRED", batchId: null, journalId: null, evidenceHash: receiptHash })
  const prior = invoice(f, "3", "0.00")
  Object.assign(prior.proof, { version: 3, residualSources: [] })
  Object.assign(prior.proof.allocations[0], { receiptBatchId: null, receiptJournalId: null, accountingStatus: "NOT_REQUIRED", costAllocation: allocateReceiptCost({ sourceQuantity: "10", sourceValue: "0", consumedQuantity: "0", consumedValue: "0", quantity: "3" }) })
  prior.event.payload.receiptRecognitionHash = hashBusinessPayload(prior.proof); prior.event.payloadHash = hashBusinessPayload(prior.event.payload)
  return prior
}
it("recognizes an invoiced return from an originally zero receipt using v3 funding", async () => {
  const f = fixture(); v3ZeroInvoice(f)
  const result = await resolveReceiptReturnRecognition(f.tx, f.input)
  expect(result.sourceReviewBlocker).toBeUndefined()
  expect(result.recognition).toMatchObject({ version: 2, status: "VERIFIED", receiptBatchId: null, receiptJournalId: null, lines: [{ inventoryAmount: "0.00", supplierClaimAmount: "0.00", claimAllocation: { sourceQuantity: "3.000", sourceValue: "0.00", allocatedValue: "0.00" } }] })
})
it.each(["journal", "status", "cost", "missing residuals", "uncovered invoice line"])("does not fund a return with v3 %s corruption", async change => {
  const f = fixture(), prior = v3ZeroInvoice(f)
  if (change === "journal") prior.proof.allocations[0].receiptJournalId = "fabricated"
  if (change === "status") Object.assign(prior.proof.allocations[0], { accountingStatus: "POSTED" })
  if (change === "cost") prior.proof.allocations[0].receiptCost = "1.00"
  if (change === "missing residuals") Reflect.deleteProperty(prior.proof, "residualSources")
  if (change === "uncovered invoice line") prior.row.lines.push({ goodsReceiptLineId: "missing", quantity: d(1), unitCost: d(0) })
  prior.event.payload.receiptRecognitionHash = hashBusinessPayload(prior.proof); prior.event.payloadHash = hashBusinessPayload(prior.event.payload)
  expect((await resolveReceiptReturnRecognition(f.tx, f.input)).sourceReviewBlocker).toBeDefined()
})
it("reads the stock allocation of a verified mixed-source v3 invoice without assigning its non-stock amount to the return", async () => {
  const f = fixture(), prior = invoice(f, "3", "7.50")
  Object.assign(f.plan, { invoicedQuantity: d(3), uninvoicedQuantity: d(0), supplierClaimAmount: d("7.50"), grniAmount: d(0) })
  prior.row.lines.push({ goodsReceiptLineId: "service-line", quantity: d(1), unitCost: d(5) })
  prior.row.subtotal = prior.row.total = d("12.50")
  Object.assign(prior.proof, { version: 3, residualSources: [{ receiptLineId: "service-line", receiptId: "service-receipt", quantity: "1.000", invoiceNet: "5.00", sourceHash: h, evidenceHash: receiptHash }] })
  Object.assign(prior.proof.allocations[0], { accountingStatus: "POSTED", costAllocation: allocateReceiptCost({ sourceQuantity: "10", sourceValue: "25", consumedQuantity: "0", consumedValue: "0", quantity: "3" }) })
  prior.proof.invoiceSourceHash = hashBusinessPayload({ organizationId: "org", supplierId: "supplier", invoiceId: "invoice", currency: "EUR", subtotal: "12.50", total: "12.50", taxAmount: "0.00", lines: [{ receiptLineId: "line", quantity: "3.000", unitCost: "2.50" }, { receiptLineId: "service-line", quantity: "1.000", unitCost: "5.00" }] })
  prior.event.payload.receiptRecognitionHash = hashBusinessPayload(prior.proof); prior.event.payloadHash = hashBusinessPayload(prior.event.payload)
  const result = await resolveReceiptReturnRecognition(f.tx, f.input)
  expect(result.sourceReviewBlocker).toBeUndefined()
  expect(result.recognition.lines[0]).toMatchObject({ inventoryAmount: "7.50", supplierClaimAmount: "7.50", grniAmount: "0.00" })
})
it("rejects overlapping invoice allocation chains even if their aggregate is below receipt quantity", async () => {
  const f = fixture(), previous = invoice(f)
  previous.proof.allocations[0].priorQuantity = "1.000"
  previous.event.payload.receiptRecognitionHash = hashBusinessPayload(previous.proof); previous.event.payloadHash = hashBusinessPayload(previous.event.payload)
  expect((await resolveReceiptReturnRecognition(f.tx, f.input)).sourceReviewBlocker).toBeDefined()
})
it("allocates only the remaining recognized inventory after an earlier rounded invoice draw", async () => {
  const f = fixture(); Object.assign(f.source.manifest.lines[0], { quantity: "1.000", unitCost: "0.01", value: "0.01" })
  Object.assign(f.plan, { quantity: d("0.600"), uninvoicedQuantity: d("0.600"), unitCost: d("0.01"), inventoryAmount: d("0.01"), grniAmount: d("0.01") })
  const previous = invoice(f, "0.400", "0.01")
  previous.row.lines[0].unitCost = d("0.01"); previous.row.subtotal = previous.row.total = d(0)
  previous.proof.invoiceSourceHash = hashBusinessPayload({ organizationId: "org", supplierId: "supplier", invoiceId: "invoice", currency: "EUR", subtotal: "0.00", total: "0.00", taxAmount: "0.00", lines: [{ receiptLineId: "line", quantity: "0.400", unitCost: "0.01" }] })
  previous.proof.allocations[0].invoiceNet = "0.00"; previous.event.payload.receiptRecognitionHash = hashBusinessPayload(previous.proof); previous.event.payloadHash = hashBusinessPayload(previous.event.payload)
  const result = await resolveReceiptReturnRecognition(f.tx, f.input)
  expect(result.sourceReviewBlocker).toBeUndefined()
  expect(result.recognition.lines[0].inventoryAmount).toBe("0.00")
})
it("exhausts the exact original cent across sequential fractional returns", async () => {
  const f = fixture(); Object.assign(f.source.manifest.lines[0], { quantity: "1.000", unitCost: "0.01", value: "0.01" })
  const retainedRows: Awaited<ReturnType<typeof retained>>[] = []
  for (const [index, q] of ["0.300", "0.300", "0.400"].entries()) {
    f.input.returnId = `return-${index}`
    const inventoryAmount = d(q).times("0.01").toDecimalPlaces(2)
    Object.assign(f.plan, { quantity: d(q), uninvoicedQuantity: d(q), unitCost: d("0.01"), inventoryAmount, grniAmount: inventoryAmount })
    const result = await resolveReceiptReturnRecognition(f.tx, f.input)
    expect(result.sourceReviewBlocker).toBeUndefined()
    expect(result.recognition.lines[0]).toMatchObject({ inventoryAmount: index === 2 ? "0.01" : "0.00", grniAllocation: { algorithm: "RECEIPT_REMAINING_POOL_V2", consumedQuantity: index === 0 ? "0.000" : index === 1 ? "0.300" : "0.600" } })
    retainedRows.push(await retained(f))
    f.mock.purchaseReturn.findMany.mockResolvedValue(retainedRows.map(r => r.row))
    f.mock.businessEvent.findMany.mockImplementation(async args => args.where.eventType ? retainedRows.flatMap(r => r.events) : retainedRows.map(r => r.stock))
    f.mock.inventoryTransaction.findMany.mockResolvedValue(retainedRows.map(r => r.movement))
    f.mock.ledgerPostingBatch.findMany.mockResolvedValue(retainedRows.filter(r => r.row.ledgerPostingBatchId).map(r => r.batch))
  }
  const totals = (await readReceiptReturnAllocations(f.tx, f.source)).lines.get("line")!
  expect(totals.quantity.toFixed(3)).toBe("1.000")
  expect(totals.grniAmount.toFixed(2)).toBe("0.01")
})

it("validates exact source-bound stock input and rejects a stale explicit value", async () => {
  const f = fixture(), result = await resolveReceiptReturnRecognition(f.tx, f.input)
  const input = { organizationId: "org", goodsReceiptId: "receipt", purchaseReturnId: "return", direction: "CORRECTION" as const, occurredAt: date, recognition: result.recognition, lines: [{ itemId: "item", locationId: "location", quantity: "3", unitCost: "2.50", sourceGoodsReceiptLineId: "line", allocatedValue: "7.50" }] }
  expect((await validateReceiptReturnStockAllocationInTx(f.tx, input)).get("line")).toBe("7.50")
  await expect(validateReceiptReturnStockAllocationInTx(f.tx, { ...input, lines: [{ ...input.lines[0], allocatedValue: "7.49" }] })).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
it("rejects an orphaned v2 stock marker instead of rebuilding with nominal cost", async () => {
  const f = fixture()
  f.mock.businessEvent.findMany.mockResolvedValue([{ sourceId: "missing", payload: { valuationMethod: "RECEIPT_REMAINING_POOL_V2", lines: [] } }])
  await expect(readReceiptReturnStockValuations(f.tx, { organizationId: "org", returnIds: ["missing"] })).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
it("continues reading the exact legacy v1 proof and unmarked stock payload", async () => {
  const f = fixture(), r = await retained(f)
  const original = { ...r.proof, version: 1 as const, lines: r.proof.lines.map(({ claimAllocation: _claim, grniAllocation: _grni, ...line }) => line) }
  await recordReceiptReturnRecognition(f.tx, r.row as never, original)
  const args = (recordBusinessEventInTx as jest.Mock).mock.calls.at(-1)[1]
  Object.assign(r.allocation, args, { payloadHash: hashBusinessPayload(args.payload) })
  const stockPayload = { lines: [{ itemId: "item", locationId: "location", quantity: "-3.000", unitCost: "2.50", reversalOfTransactionId: null }] }
  Object.assign(r.stock, { payload: stockPayload, payloadHash: hashBusinessPayload(stockPayload) })
  r.batch.metadata = { details: { receiptReturnRecognition: original } }
  const originalBytes = JSON.stringify(original)
  expect((await readReceiptReturnAllocations(f.tx, f.source)).lines.get("line")?.grniAmount.toFixed(2)).toBe("7.50")
  expect(JSON.stringify((await readPurchaseReturnAccountingEvidence(f.tx, r.row as never)).recognition)).toBe(originalBytes)
})
it("resolves an immutable originally-unposted return to the actual journal and reverses that proof", async () => {
  const f = fixture(), r = await retained(f, "REVIEW_REQUIRED")
  const resolved = await resolveReceiptReturnRecognition(f.tx, { ...f.input, recovering: true })
  expect(resolved.sourceReviewBlocker).toBeUndefined()
  ;(recordBusinessEventInTx as jest.Mock).mockResolvedValue({ created: true, event: { id: "resolved" } })
  await recordReceiptReturnResolution(f.tx, r.row as unknown as Parameters<typeof recordReceiptReturnResolution>[1], resolved.recognition, "return-journal", "finance-actor")
  const args = (recordBusinessEventInTx as jest.Mock).mock.calls.at(-1)[1]
  r.events.push({ ...args, id: "resolved", status: "APPLIED", processedAt: date, payloadHash: hashBusinessPayload(args.payload) })
  Object.assign(r.batch, { status: "POSTED", postedAt: date, metadata: { receiptReturnRecognition: resolved.recognition }, journalEntries: [journal()], sourceLinks: [link()] })
  expect(r.row.journalEntryId).toBeNull()
  expect((await readPurchaseReturnAccountingEvidence(f.tx, r.row as unknown as Parameters<typeof readPurchaseReturnAccountingEvidence>[1])).journalEntryId).toBe("return-journal")
  expect((await readReceiptReturnAllocations(f.tx, f.source)).lines.get("line")?.grniAmount.toFixed(2)).toBe("7.50")
  expect(await retainReturnReversalRecognition(f.tx, r.row as unknown as Parameters<typeof retainReturnReversalRecognition>[1], "reverse")).toMatchObject({ status: "VERIFIED", direction: "REVERSAL", reversalOfReturnId: "return" })
})
it("nets an exact original and unposted reversal once and rejects a mismatched restoration", async () => {
  const f = fixture(), r = await retained(f, "REVIEW_REQUIRED")
  const reverse = { ...r.row, id: "reverse", direction: "REVERSAL", reversalOfPurchaseReturnId: "return", ledgerPostingBatchId: null, inventoryBusinessEventId: "reverse-stock", lines: [{ ...r.row.lines[0], id: "reverse-line", inventoryTransactionId: "reverse-movement" }] }
  const reverseProof = { ...r.proof, returnId: "reverse", direction: "REVERSAL" as const, reversalOfReturnId: "return" }
  await recordReceiptReturnRecognition(f.tx, reverse as unknown as Parameters<typeof recordReceiptReturnRecognition>[1], reverseProof)
  const args = (recordBusinessEventInTx as jest.Mock).mock.calls.at(-1)[1]
  r.events.push({ ...args, id: "reverse-allocation", postingBatchId: null, status: "APPLIED", processedAt: date, payloadHash: hashBusinessPayload(args.payload) })
  const stockPayload = { valuationMethod: "RECEIPT_REMAINING_POOL_V2", lines: [{ itemId: "item", locationId: "location", quantity: "3.000", unitCost: "2.50", reversalOfTransactionId: "movement", receiptValuation: { version: 2, sourceGoodsReceiptLineId: "line", allocatedValue: "7.50", recognitionHash: hashBusinessPayload(reverseProof) } }] }
  const reversedStock = { ...r.stock, id: "reverse-stock", sourceId: "reverse", eventType: "purchase.return.stock_reversed", postingBatchId: null, payload: stockPayload, payloadHash: hashBusinessPayload(stockPayload) }
  const reversedMovement = { ...r.movement, id: "reverse-movement", referenceId: "reverse", type: "PURCHASE_RETURN_REVERSAL", quantity: d(3), reversalOfTransactionId: "movement" }
  Object.assign(r.batch, { status: "REVERSED", reversedAt: date })
  f.mock.purchaseReturn.findMany.mockResolvedValue([r.row, reverse]); f.mock.businessEvent.findMany.mockImplementation(async args => args.where.eventType ? r.events : [r.stock, reversedStock]); f.mock.inventoryTransaction.findMany.mockResolvedValue([r.movement, reversedMovement])
  const result = await readReceiptReturnAllocations(f.tx, f.source)
  expect(result.lines.get("line")?.quantity.toString()).toBe("0")
  expect(result.lines.get("line")?.grniAmount.toString()).toBe("0")
  reversedMovement.reversalOfTransactionId = "different-movement"
  await expect(readReceiptReturnAllocations(f.tx, f.source)).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
it("denies supplier credit against an unposted return claim without inventing claim funding", async () => {
  const f = fixture(), r = await retained(f)
  await expect(assertPurchaseReturnClaimFunding(f.tx, r.row as unknown as Parameters<typeof assertPurchaseReturnClaimFunding>[1], { currency: "EUR", sourceDate: date, claims: [] })).rejects.toThrow("Recover and verify")
})
it("funds supplier credit from an effective recovered return journal while retaining its original null journal", async () => {
  const f = fixture(); invoice(f)
  Object.assign(f.plan, { invoicedQuantity: d(3), uninvoicedQuantity: d(0), supplierClaimAmount: d("7.50"), grniAmount: d(0) })
  const r = await retained(f, "REVIEW_REQUIRED"), verified = { ...r.proof, status: "VERIFIED" as const }
  await recordReceiptReturnResolution(f.tx, r.row as unknown as Parameters<typeof recordReceiptReturnResolution>[1], verified, "return-journal", "finance")
  const args = (recordBusinessEventInTx as jest.Mock).mock.calls.at(-1)[1]
  r.events.push({ ...args, id: "resolved", status: "APPLIED", processedAt: date, payloadHash: hashBusinessPayload(args.payload) })
  const entry = journal(); entry.lines[1].account.mappingKey = "SUPPLIER_RETURN_CLAIM"
  Object.assign(r.batch, { status: "POSTED", postedAt: date, metadata: { receiptReturnRecognition: verified }, journalEntries: [entry], sourceLinks: [link()] })
  const input = { currency: "EUR", sourceDate: date, claims: [{ returnLineId: "returned-line", quantity: d(3), amount: d("7.50") }] }
  expect(await assertPurchaseReturnClaimFunding(f.tx, r.row as unknown as Parameters<typeof assertPurchaseReturnClaimFunding>[1], input)).toMatchObject({ journalEntryId: "return-journal", recognitionHash: hashBusinessPayload(verified) })
  expect(r.row.journalEntryId).toBeNull()
  await expect(assertPurchaseReturnClaimFunding(f.tx, r.row as unknown as Parameters<typeof assertPurchaseReturnClaimFunding>[1], { ...input, claims: [{ ...input.claims[0], amount: d(8) }] })).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
  await expect(assertPurchaseReturnClaimFunding(f.tx, r.row as unknown as Parameters<typeof assertPurchaseReturnClaimFunding>[1], { ...input, currency: "XAF" })).rejects.toMatchObject({ code: "INVOICE_EVIDENCE_REQUIRED" })
})
