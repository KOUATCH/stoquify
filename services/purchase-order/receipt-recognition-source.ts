import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { hasVerifiedReceiptPosting, receiptPostingEvidenceSelect } from "./purchase-receipt-accounting-evidence"

export const receiptRecognitionSourceEventType = "purchase.goods_receipt.recognition_source"
export const receiptRecognitionSourceEventKey = (receiptId: string) => `goods-receipt-recognition-source:${receiptId}`
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const id = z.string().min(1), hash = z.string().regex(/^[a-f0-9]{64}$/)
const money = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
export const receiptRecognitionManifestSchema = z.object({
  version: z.literal(1), organizationId: id, receiptId: id, receiptNumber: id, purchaseOrderId: id, supplierId: id,
  locationId: id, currency: z.string().regex(/^[A-Z]{3}$/), receiptDate: z.string().datetime(), effectiveAt: z.string().datetime(),
  acceptance: z.object({ kind: z.enum(["inspection", "resolution"]), id, actorId: id, at: z.string().datetime(), sourceHash: hash }).strict(),
  lines: z.array(z.object({
    receiptLineId: id, purchaseOrderLineId: id, itemId: id, quantity: z.string().regex(/^\d+\.\d{3}$/),
    unitCost: z.string().regex(/^\d+\.\d{2}$/), value: z.string().regex(/^\d+\.\d{2}$/), stockTracked: z.boolean(),
    batchNumber: z.string().nullable(), expiryDate: z.string().datetime().nullable(), serialNumbers: z.array(z.string()),
  }).strict()).min(1),
}).strict()
export type ReceiptRecognitionManifest = z.infer<typeof receiptRecognitionManifestSchema>
export type ReceiptRecognitionSource = { manifest: ReceiptRecognitionManifest; eventId: string; sourceHash: string; inventoryValue: Prisma.Decimal }
export type ReceiptRecognitionEvidence = { stockVerified: boolean; accountingStatus: "POSTED" | "BLOCKED" | "NOT_REQUIRED" | "UNVERIFIED"; batchId: string | null; journalId: string | null; evidenceHash: string | null }
export const receiptRecognitionReviewRequired = () => new BusinessRuleError("The receipt acceptance, stock or accounting source evidence requires review.", "RECEIPT_EVIDENCE_REQUIRED")

const sourceInclude = {
  organization: { select: { currency: true } },
  purchaseOrder: { select: { organizationId: true, supplierId: true, deletedAt: true } },
  inspection: true, inspectionResolution: true,
  lines: { orderBy: { id: "asc" as const }, include: { item: { select: { trackInventory: true } }, purchaseOrderLine: { select: { purchaseOrderId: true, itemId: true } } } },
} satisfies Prisma.GoodsReceiptInclude
type Receipt = Prisma.GoodsReceiptGetPayload<{ include: typeof sourceInclude }>

function acceptance(receipt: Receipt): ReceiptRecognitionManifest["acceptance"] {
  const inspection = receipt.inspection, resolution = receipt.inspectionResolution
  if (!inspection || inspection.organizationId !== receipt.organizationId || inspection.goodsReceiptId !== receipt.id) throw receiptRecognitionReviewRequired()
  const inspectionProof = { id: inspection.id, organizationId: inspection.organizationId, goodsReceiptId: inspection.goodsReceiptId, outcome: inspection.outcome, inspectedById: inspection.inspectedById, inspectedAt: inspection.inspectedAt.toISOString(), reason: inspection.reason, evidenceNotes: inspection.evidenceNotes }
  if (inspection.outcome === "PASSED") {
    if (resolution) throw receiptRecognitionReviewRequired()
    return { kind: "inspection", id: inspection.id, actorId: inspection.inspectedById, at: inspection.inspectedAt.toISOString(), sourceHash: hashBusinessPayload(inspectionProof) }
  }
  if (!resolution || resolution.organizationId !== receipt.organizationId || resolution.goodsReceiptId !== receipt.id || resolution.inspectionId !== inspection.id || resolution.decision !== "ACCEPT" || resolution.resolvedById === inspection.inspectedById) throw receiptRecognitionReviewRequired()
  const resolutionProof = { id: resolution.id, organizationId: resolution.organizationId, goodsReceiptId: resolution.goodsReceiptId, inspectionId: resolution.inspectionId, decision: resolution.decision, resolvedById: resolution.resolvedById, resolvedAt: resolution.resolvedAt.toISOString(), reason: resolution.reason, idempotencyKey: resolution.idempotencyKey, payloadHash: resolution.payloadHash }
  return { kind: "resolution", id: resolution.id, actorId: resolution.resolvedById, at: resolution.resolvedAt.toISOString(), sourceHash: hashBusinessPayload({ inspection: inspectionProof, resolution: resolutionProof }) }
}

function manifestFromReceipt(receipt: Receipt, frozen?: ReceiptRecognitionManifest): ReceiptRecognitionManifest {
  if (receipt.deletedAt || receipt.purchaseOrder.deletedAt || receipt.purchaseOrder.organizationId !== receipt.organizationId || !["RECEIVED", "COMPLETED"].includes(receipt.status) || !receipt.inventoryPostedAt) throw receiptRecognitionReviewRequired()
  const accepted = acceptance(receipt)
  if (accepted.at !== receipt.inventoryPostedAt.toISOString()) throw receiptRecognitionReviewRequired()
  const lines = receipt.lines.map(line => {
    if (line.purchaseOrderLine.purchaseOrderId !== receipt.purchaseOrderId || line.purchaseOrderLine.itemId !== line.itemId || line.receivedQuantity.lte(0) || line.unitCost.lt(0) || !money(line.receivedQuantity.times(line.unitCost)).eq(line.lineTotal)) throw receiptRecognitionReviewRequired()
    const retained = frozen?.lines.find(candidate => candidate.receiptLineId === line.id)
    if (frozen && !retained) throw receiptRecognitionReviewRequired()
    return { receiptLineId: line.id, purchaseOrderLineId: line.purchaseOrderLineId, itemId: line.itemId,
      quantity: line.receivedQuantity.toFixed(3), unitCost: line.unitCost.toFixed(2), value: line.lineTotal.toFixed(2),
      stockTracked: retained ? retained.stockTracked : line.item.trackInventory,
      batchNumber: line.batchNumber, expiryDate: line.expiryDate?.toISOString() ?? null, serialNumbers: [...line.serialNumbers].sort() }
  }).sort((a, b) => a.receiptLineId.localeCompare(b.receiptLineId))
  return receiptRecognitionManifestSchema.parse({ version: 1, organizationId: receipt.organizationId, receiptId: receipt.id, receiptNumber: receipt.receiptNumber,
    purchaseOrderId: receipt.purchaseOrderId, supplierId: receipt.purchaseOrder.supplierId, locationId: receipt.locationId,
    currency: frozen?.currency ?? receipt.organization.currency.trim().toUpperCase(), receiptDate: receipt.receiptDate.toISOString(), effectiveAt: receipt.inventoryPostedAt.toISOString(), acceptance: accepted, lines })
}

function result(manifest: ReceiptRecognitionManifest, eventId: string): ReceiptRecognitionSource {
  return { manifest, eventId, sourceHash: hashBusinessPayload(manifest), inventoryValue: manifest.lines.filter(line => line.stockTracked).reduce((total, line) => total.plus(line.value), new Prisma.Decimal(0)) }
}

/** Capture once, in the acceptance transaction before stock effects. This does
 * not upgrade existing receipts; only receive/inspection acceptance calls it. */
export async function createReceiptRecognitionSourceInTx(tx: Prisma.TransactionClient, organizationId: string, receiptId: string, actorId: string): Promise<ReceiptRecognitionSource> {
  const receipt = await tx.goodsReceipt.findFirst({ where: { id: receiptId, organizationId }, include: sourceInclude })
  if (!receipt) throw receiptRecognitionReviewRequired()
  const manifest = manifestFromReceipt(receipt)
  if (manifest.acceptance.actorId !== actorId) throw receiptRecognitionReviewRequired()
  const sourceHash = hashBusinessPayload(manifest)
  const recorded = await recordBusinessEventInTx(tx, { organizationId, eventType: receiptRecognitionSourceEventType, eventSource: "INTERNAL", schemaVersion: 1,
    idempotencyKey: receiptRecognitionSourceEventKey(receiptId), actorId, sourceType: "GOODS_RECEIPT", sourceId: receiptId,
    documentHash: sourceHash, occurredAt: new Date(manifest.effectiveAt), payload: manifest })
  if (!recorded.created) throw receiptRecognitionReviewRequired()
  await markBusinessEventAppliedInTx(tx, organizationId, recorded.event.id)
  return result(manifest, recorded.event.id)
}

/** Null means an unmarked legacy source, never a malformed new source. Frozen
 * tracking/currency comes from retained evidence, not today's mutable item. */
export async function readReceiptRecognitionSource(tx: Prisma.TransactionClient, organizationId: string, receiptId: string): Promise<ReceiptRecognitionSource | null> {
  const events = await tx.businessEvent.findMany({ where: { organizationId, sourceType: "GOODS_RECEIPT", sourceId: receiptId, eventType: receiptRecognitionSourceEventType }, orderBy: { id: "asc" } })
  if (!events.length) {
    const marked = await tx.ledgerPostingBatch.findMany({ where: { organizationId, sourceType: "GOODS_RECEIPT", sourceId: receiptId }, select: { metadata: true } })
    if (marked.some(batch => record(batch.metadata).receiptRecognitionSourceHash != null)) throw receiptRecognitionReviewRequired()
    return null
  }
  if (events.length !== 1) throw receiptRecognitionReviewRequired()
  const event = events[0], parsed = receiptRecognitionManifestSchema.safeParse(event.payload)
  if (!parsed.success) throw receiptRecognitionReviewRequired()
  const manifest = parsed.data, sourceHash = hashBusinessPayload(manifest)
  if (manifest.organizationId !== organizationId || manifest.receiptId !== receiptId || event.eventSource !== "INTERNAL" || event.schemaVersion !== 1 || event.idempotencyKey !== receiptRecognitionSourceEventKey(receiptId) || event.status !== "APPLIED" || !event.processedAt || event.actorId !== manifest.acceptance.actorId || event.occurredAt.toISOString() !== manifest.effectiveAt || event.documentHash !== sourceHash || event.payloadHash !== sourceHash) throw receiptRecognitionReviewRequired()
  const receipt = await tx.goodsReceipt.findFirst({ where: { id: receiptId, organizationId }, include: sourceInclude })
  if (!receipt || hashBusinessPayload(manifestFromReceipt(receipt, manifest)) !== sourceHash) throw receiptRecognitionReviewRequired()
  return result(manifest, event.id)
}

const stockLineSchema = z.object({ itemId: z.string(), locationId: z.string(), quantity: z.string(), unitCost: z.string(), movementType: z.literal("PURCHASE_RECEIPT"), referenceType: z.literal("GOODS_RECEIPT"), referenceId: z.string(), batchNumber: z.string().nullable(), serialNumbers: z.array(z.string()), expiryDate: z.string().nullable() })
const signatures = (lines: z.infer<typeof stockLineSchema>[]) => lines.map(line => hashBusinessPayload({ ...line, quantity: new Prisma.Decimal(line.quantity).toString(), unitCost: money(line.unitCost).toString(), serialNumbers: [...line.serialNumbers].sort() })).sort()

/** Shared read-only corroboration for receiving, recovery, invoices and returns.
 * It does not turn a query failure into an empty or successful outcome. */
export async function readReceiptRecognitionEvidence(tx: Prisma.TransactionClient, source: ReceiptRecognitionSource): Promise<ReceiptRecognitionEvidence> {
  const { manifest, sourceHash } = source, { organizationId, receiptId } = manifest
  const events = await tx.businessEvent.findMany({ where: { organizationId, sourceType: "GOODS_RECEIPT", sourceId: receiptId, eventType: "purchase.goods_receipt.stock_posted" }, orderBy: { id: "asc" } })
  const movements = await tx.inventoryTransaction.findMany({ where: { organizationId, referenceType: "GOODS_RECEIPT", referenceId: receiptId }, select: { itemId: true, locationId: true, quantity: true, unitCost: true, totalCost: true, effectiveAt: true, timeProvenance: true, reversalOfTransactionId: true, type: true, referenceId: true, batchNumber: true, serialNumbers: true, expiryDate: true } })
  const batches = await tx.ledgerPostingBatch.findMany({ where: { organizationId, sourceType: "GOODS_RECEIPT", sourceId: receiptId }, select: receiptPostingEvidenceSelect, orderBy: { id: "asc" } })
  const journals = await tx.journalEntry.findMany({ where: { organizationId, sourceType: "GOODS_RECEIPT", sourceId: receiptId }, select: { id: true, postingBatchId: true } })
  const links = await tx.accountingSourceLink.findMany({ where: { organizationId, sourceType: "GOODS_RECEIPT", sourceId: receiptId }, select: { journalEntryId: true, postingBatchId: true } })
  const base: ReceiptRecognitionEvidence = { stockVerified: false, accountingStatus: "UNVERIFIED", batchId: batches.length === 1 ? batches[0].id : null, journalId: null, evidenceHash: null }
  const expected = signatures(manifest.lines.filter(line => line.stockTracked).map(line => ({ itemId: line.itemId, locationId: manifest.locationId, quantity: line.quantity, unitCost: line.unitCost, movementType: "PURCHASE_RECEIPT", referenceType: "GOODS_RECEIPT", referenceId: receiptId, batchNumber: line.batchNumber, expiryDate: line.expiryDate, serialNumbers: line.serialNumbers })))
  try {
    if (movements.some(m => m.effectiveAt.toISOString() !== manifest.effectiveAt || m.timeProvenance !== "EXPLICIT_SOURCE_TIME" || m.reversalOfTransactionId || !m.totalCost.eq(money(m.quantity.times(m.unitCost))))) return base
    const actual = signatures(movements.map(m => stockLineSchema.parse({ ...m, quantity: m.quantity.toString(), unitCost: m.unitCost.toString(), movementType: m.type, referenceType: "GOODS_RECEIPT", expiryDate: m.expiryDate?.toISOString() ?? null })))
    const recorded = signatures(events.flatMap(event => {
      const payload = record(event.payload)
      if (event.eventSource !== "INTERNAL" || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.actorId !== manifest.acceptance.actorId || event.occurredAt.toISOString() !== manifest.effectiveAt || event.postingBatchId !== base.batchId || payload.postingBatchId !== base.batchId || event.payloadHash !== hashBusinessPayload(event.payload) || event.documentHash !== sourceHash || payload.documentHash !== sourceHash || payload.sourceId !== receiptId || payload.sourceType !== "GOODS_RECEIPT" || payload.eventType !== "purchase.goods_receipt.stock_posted") throw receiptRecognitionReviewRequired()
      return z.array(stockLineSchema).parse(payload.lines)
    }))
    base.stockVerified = hashBusinessPayload(expected) === hashBusinessPayload(actual) && hashBusinessPayload(expected) === hashBusinessPayload(recorded)
  } catch { return base }
  if (!base.stockVerified) return base
  if (source.inventoryValue.eq(0)) {
    if (!batches.length && !journals.length && !links.length) return { ...base, accountingStatus: "NOT_REQUIRED", evidenceHash: hashBusinessPayload({ sourceHash, eventId: source.eventId, stock: expected, accounting: "NOT_REQUIRED" }) }
    return base
  }
  if (batches.length === 1 && batches[0].postingPurpose === "GOODS_RECEIPT" && batches[0].status === "FAILED" && !batches[0].postedAt && !batches[0].reversedAt && !batches[0].journalEntries.length && !batches[0].sourceLinks.length && !journals.length && !links.length) return { ...base, accountingStatus: "BLOCKED" }
  if (journals.length !== 1 || links.length !== 1 || journals[0].postingBatchId !== base.batchId || links[0].postingBatchId !== base.batchId || links[0].journalEntryId !== journals[0].id || !hasVerifiedReceiptPosting({ organizationId, receiptId, receiptNumber: manifest.receiptNumber, receiptDate: new Date(manifest.effectiveAt), documentHashes: [sourceHash], currency: manifest.currency, value: source.inventoryValue, batches, requireGoodsReceivedAccrual: true })) return base
  const journalId = journals[0].id
  const retained = batches[0], entry = retained.journalEntries[0], link = retained.sourceLinks[0]
  // Explicit versioned projection: adding read-model fields or mutable metadata
  // must not invalidate already approved invoice and return allocations.
  const posting = { batchId: retained.id, periodId: retained.periodId, postedAt: retained.postedAt?.toISOString(), journalId: entry.id, journalPostedAt: entry.postedAt?.toISOString(), sourceDate: link.sourceDate?.toISOString(), documentHash: sourceHash,
    lines: entry.lines.map(line => ({ organizationId: line.organizationId, accountOrganizationId: line.account.organizationId, mappingKey: line.account.mappingKey, currency: line.currency, debit: line.debit.toFixed(2), credit: line.credit.toFixed(2) })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) }
  return { ...base, accountingStatus: "POSTED", journalId, evidenceHash: hashBusinessPayload({ version: 1, sourceHash, sourceEventId: source.eventId, posting, stock: expected }) }
}
