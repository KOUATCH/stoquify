import { Prisma } from "@prisma/client"
import { hashBusinessPayload, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { createReceiptRecognitionSourceInTx, readReceiptRecognitionEvidence, readReceiptRecognitionSource, receiptRecognitionSourceEventKey, receiptRecognitionSourceEventType, type ReceiptRecognitionManifest, type ReceiptRecognitionSource } from "../receipt-recognition-source"

jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/events/business-event.service", () => ({ ...jest.requireActual("@/services/events/business-event.service"), recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn() }))
const d = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value)
const at = new Date("2026-09-30T12:00:00.000Z")
function fixture(options: { stockTracked?: boolean; cost?: string; held?: boolean } = {}) {
  const cost = options.cost ?? "2.50", stockTracked = options.stockTracked ?? true
  const inspection = { id: "inspection", organizationId: "org", goodsReceiptId: "receipt", outcome: options.held ? "FAILED" : "PASSED", inspectedById: "receiver", inspectedAt: options.held ? new Date("2026-08-31T12:00:00.000Z") : at, createdAt: at, reason: null, evidenceNotes: null }
  const resolution = options.held ? { id: "resolution", organizationId: "org", goodsReceiptId: "receipt", inspectionId: "inspection", decision: "ACCEPT", resolvedById: "reviewer", resolvedAt: at, createdAt: at, reason: "Reviewed", idempotencyKey: "resolve", payloadHash: "a".repeat(64) } : null
  const line = { id: "line", goodsReceiptId: "receipt", purchaseOrderLineId: "order-line", itemId: "item", receivedQuantity: d(10), unitCost: d(cost), lineTotal: d(cost).times(10), batchNumber: null, expiryDate: null, serialNumbers: [] as string[], item: { trackInventory: stockTracked }, purchaseOrderLine: { purchaseOrderId: "order", itemId: "item" } }
  const receipt = { id: "receipt", organizationId: "org", receiptNumber: "GR-1", purchaseOrderId: "order", locationId: "location", receiptDate: inspection.inspectedAt, inventoryPostedAt: at, status: "RECEIVED", deletedAt: null, organization: { currency: "XAF" }, purchaseOrder: { organizationId: "org", supplierId: "supplier", deletedAt: null }, inspection, inspectionResolution: resolution, lines: [line] }
  const { createdAt: _inspectionCreated, ...inspectionProof } = inspection
  const { createdAt: _resolutionCreated, ...resolutionProof } = resolution ?? { createdAt: null }
  const manifest: ReceiptRecognitionManifest = { version: 1, organizationId: "org", receiptId: "receipt", receiptNumber: "GR-1", purchaseOrderId: "order", supplierId: "supplier", locationId: "location", currency: "XAF", receiptDate: receipt.receiptDate.toISOString(), effectiveAt: at.toISOString(), acceptance: resolution ? { kind: "resolution", id: resolution.id, actorId: resolution.resolvedById, at: at.toISOString(), sourceHash: hashBusinessPayload({ inspection: inspectionProof, resolution: resolutionProof }) } : { kind: "inspection", id: inspection.id, actorId: inspection.inspectedById, at: at.toISOString(), sourceHash: hashBusinessPayload(inspectionProof) }, lines: [{ receiptLineId: "line", purchaseOrderLineId: "order-line", itemId: "item", quantity: "10.000", unitCost: d(cost).toFixed(2), value: line.lineTotal.toFixed(2), stockTracked, batchNumber: null, expiryDate: null, serialNumbers: [] }] }
  const source: ReceiptRecognitionSource = { manifest, sourceHash: hashBusinessPayload(manifest), eventId: "source-event", inventoryValue: stockTracked ? line.lineTotal : d(0) }
  const event = { id: source.eventId, organizationId: "org", sourceType: "GOODS_RECEIPT", sourceId: "receipt", eventType: receiptRecognitionSourceEventType, eventSource: "INTERNAL", schemaVersion: 1, idempotencyKey: receiptRecognitionSourceEventKey("receipt"), status: "APPLIED", processedAt: at, actorId: manifest.acceptance.actorId, occurredAt: at, payload: manifest, payloadHash: source.sourceHash, documentHash: source.sourceHash }
  const stock = { itemId: "item", locationId: "location", quantity: "10.000", unitCost: d(cost).toFixed(2), movementType: "PURCHASE_RECEIPT", referenceType: "GOODS_RECEIPT", referenceId: "receipt", batchNumber: null, expiryDate: null, serialNumbers: [] }
  const payload = { sourceId: "receipt", sourceType: "GOODS_RECEIPT", eventType: "purchase.goods_receipt.stock_posted", documentHash: source.sourceHash, postingBatchId: null as string | null, lines: [stock] }
  const stockEvent = { ...event, id: "stock-event", eventType: "purchase.goods_receipt.stock_posted", postingBatchId: null as string | null, payload, payloadHash: hashBusinessPayload(payload) }
  const mock = { goodsReceipt: { findFirst: jest.fn().mockResolvedValue(receipt) }, businessEvent: { findMany: jest.fn().mockImplementation(async ({ where }) => where.eventType === receiptRecognitionSourceEventType ? [event] : stockTracked ? [stockEvent] : []) },
    ledgerPostingBatch: { findMany: jest.fn().mockResolvedValue([]) }, journalEntry: { findMany: jest.fn().mockResolvedValue([]) }, accountingSourceLink: { findMany: jest.fn().mockResolvedValue([]) },
    inventoryTransaction: { findMany: jest.fn().mockResolvedValue(stockTracked ? [{ ...stock, type: "PURCHASE_RECEIPT", quantity: d(10), unitCost: d(cost), totalCost: d(cost).times(10), effectiveAt: at, timeProvenance: "EXPLICIT_SOURCE_TIME", reversalOfTransactionId: null }] : []) } }
  return { mock, tx: mock as unknown as Prisma.TransactionClient, receipt, line, source, event, stockEvent }
}
beforeEach(() => jest.clearAllMocks())

it("captures persisted accepted source exactly once and shares its whole receipt hash", async () => {
  const f = fixture(); (recordBusinessEventInTx as jest.Mock).mockResolvedValue({ created: true, event: { id: "source-event" } })
  expect(await createReceiptRecognitionSourceInTx(f.tx, "org", "receipt", "receiver")).toEqual(f.source)
  expect(recordBusinessEventInTx).toHaveBeenCalledWith(f.tx, expect.objectContaining({ payload: f.source.manifest, documentHash: f.source.sourceHash, occurredAt: at }))
  ;(recordBusinessEventInTx as jest.Mock).mockResolvedValue({ created: false, event: { id: "source-event" } })
  await expect(createReceiptRecognitionSourceInTx(f.tx, "org", "receipt", "receiver")).rejects.toMatchObject({ code: "RECEIPT_EVIDENCE_REQUIRED" })
})
it("freezes a mixed whole receipt while valuing only its tracked inventory", async () => {
  const f = fixture(); f.receipt.lines.push({ ...f.line, id: "service-line", purchaseOrderLineId: "service-order-line", itemId: "service", item: { trackInventory: false }, purchaseOrderLine: { purchaseOrderId: "order", itemId: "service" }, unitCost: d(4), lineTotal: d(40) })
  ;(recordBusinessEventInTx as jest.Mock).mockResolvedValue({ created: true, event: { id: "source-event" } })
  const result = await createReceiptRecognitionSourceInTx(f.tx, "org", "receipt", "receiver")
  expect(result.manifest.lines).toHaveLength(2)
  expect(result.inventoryValue.toFixed(2)).toBe("25.00")
  expect(result.manifest.lines.find(line => line.receiptLineId === "service-line")?.stockTracked).toBe(false)
  expect(result.sourceHash).not.toBe(f.source.sourceHash)
})
it("retains acceptance date across a held month boundary and freezes tracking/currency", async () => {
  const f = fixture({ held: true }); f.receipt.organization.currency = "USD"; f.line.item.trackInventory = false
  const source = await readReceiptRecognitionSource(f.tx, "org", "receipt")
  expect(source?.manifest).toMatchObject({ currency: "XAF", receiptDate: "2026-08-31T12:00:00.000Z", effectiveAt: at.toISOString(), acceptance: { kind: "resolution" } })
  expect(source?.manifest.lines[0].stockTracked).toBe(true)
})
it.each(["quantity", "cost", "inspection", "date", "event hash", "event actor", "event state", "supplier", "tenant"])("rejects changed %s evidence", async kind => {
  const f = fixture()
  if (kind === "quantity") f.line.receivedQuantity = d(11)
  if (kind === "cost") f.line.unitCost = d(3)
  if (kind === "inspection") f.receipt.inspection.inspectedById = "other"
  if (kind === "date") f.receipt.inventoryPostedAt = new Date(0)
  if (kind === "event hash") f.event.payloadHash = "f".repeat(64)
  if (kind === "event actor") f.event.actorId = "other"
  if (kind === "event state") f.event.status = "FAILED"
  if (kind === "supplier") f.receipt.purchaseOrder.supplierId = "other"
  if (kind === "tenant") f.receipt.purchaseOrder.organizationId = "other"
  await expect(readReceiptRecognitionSource(f.tx, "org", "receipt")).rejects.toMatchObject({ code: "RECEIPT_EVIDENCE_REQUIRED" })
})
it("returns legacy only when no marker exists, and rejects a missing marked event", async () => {
  const f = fixture(); f.mock.businessEvent.findMany.mockResolvedValue([])
  expect(await readReceiptRecognitionSource(f.tx, "org", "receipt")).toBeNull()
  f.mock.ledgerPostingBatch.findMany.mockResolvedValue([{ metadata: { receiptRecognitionSourceHash: f.source.sourceHash } }])
  await expect(readReceiptRecognitionSource(f.tx, "org", "receipt")).rejects.toThrow()
})
it.each([{ stockTracked: false }, { cost: "0.00" }])("records no financial journal when stock value is zero: %j", async options => {
  const f = fixture(options)
  expect(await readReceiptRecognitionEvidence(f.tx, f.source)).toMatchObject({ stockVerified: true, accountingStatus: "NOT_REQUIRED", batchId: null, journalId: null })
})
it("does not mask failed queries as zero stock or readiness", async () => {
  const f = fixture(); f.mock.inventoryTransaction.findMany.mockRejectedValue(new Error("database unavailable"))
  await expect(readReceiptRecognitionEvidence(f.tx, f.source)).rejects.toThrow("database unavailable")
})
it("rejects stock events using the capture date instead of held acceptance date", async () => {
  const f = fixture({ held: true }); f.stockEvent.occurredAt = f.receipt.receiptDate
  expect(await readReceiptRecognitionEvidence(f.tx, f.source)).toMatchObject({ stockVerified: false, accountingStatus: "UNVERIFIED" })
})
it("distinguishes a genuine pending receipt from a posted flag without effects", async () => {
  const f = fixture(), batch = { id: "batch", postingPurpose: "GOODS_RECEIPT", status: "FAILED", postedAt: null, reversedAt: null, journalEntries: [], sourceLinks: [] }
  f.stockEvent.postingBatchId = "batch"; f.stockEvent.payload.postingBatchId = "batch"; f.stockEvent.payloadHash = hashBusinessPayload(f.stockEvent.payload)
  f.mock.ledgerPostingBatch.findMany.mockResolvedValue([batch])
  expect(await readReceiptRecognitionEvidence(f.tx, f.source)).toMatchObject({ stockVerified: true, accountingStatus: "BLOCKED" })
  batch.status = "POSTED"
  expect(await readReceiptRecognitionEvidence(f.tx, f.source)).toMatchObject({ accountingStatus: "UNVERIFIED" })
})
it("verifies one whole receipt journal and rejects a balanced wrong credit account", async () => {
  const f = fixture(), identity = { organizationId: "org", sourceType: "GOODS_RECEIPT", sourceId: "receipt", postingPurpose: "GOODS_RECEIPT" }
  const entry = { ...identity, id: "entry", postingBatchId: "batch", periodId: "period", status: "POSTED", postedAt: at, reversedAt: null, reversalOfEntryId: null, reversedByEntries: [], entryDate: at, currency: "XAF", lines: [
    { organizationId: "org", debit: d(25), credit: d(0), currency: "XAF", account: { organizationId: "org", mappingKey: "INVENTORY" } },
    { organizationId: "org", debit: d(0), credit: d(25), currency: "XAF", account: { organizationId: "org", mappingKey: "GRNI" } },
  ] }
  const link = { ...identity, postingBatchId: "batch", journalEntryId: "entry", sourceNumber: "GR-1", sourceDate: at, metadata: { documentHash: f.source.sourceHash } }
  f.mock.ledgerPostingBatch.findMany.mockResolvedValue([{ ...identity, id: "batch", periodId: "period", status: "POSTED", postedAt: at, reversedAt: null, journalEntries: [entry], sourceLinks: [link] }])
  f.mock.journalEntry.findMany.mockResolvedValue([{ id: "entry", postingBatchId: "batch" }]); f.mock.accountingSourceLink.findMany.mockResolvedValue([link])
  f.stockEvent.postingBatchId = "batch"; f.stockEvent.payload.postingBatchId = "batch"; f.stockEvent.payloadHash = hashBusinessPayload(f.stockEvent.payload)
  const first = await readReceiptRecognitionEvidence(f.tx, f.source)
  expect(first).toMatchObject({ accountingStatus: "POSTED", stockVerified: true, journalId: "entry", batchId: "batch" })
  entry.lines.reverse()
  expect((await readReceiptRecognitionEvidence(f.tx, f.source)).evidenceHash).toBe(first.evidenceHash)
  entry.lines.find(line => line.credit.gt(0))!.account.mappingKey = "AP"
  expect(await readReceiptRecognitionEvidence(f.tx, f.source)).toMatchObject({ accountingStatus: "UNVERIFIED" })
})
