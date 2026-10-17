import { Prisma, type BusinessEvent } from "@prisma/client"
import { z } from "zod"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { readReceiptRecognitionEvidence, readReceiptRecognitionSource, type ReceiptRecognitionSource } from "@/services/purchase-order/receipt-recognition-source"
import { allocateReceiptCost, receiptCostAllocationSchema } from "@/services/inventory/receipt-cost-allocation"
import { readInvoiceReceiptRecognition } from "./invoice-receipt-recognition"

const money = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value).toDecimalPlaces(2)
const quantity = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value).toDecimalPlaces(3)
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const review = () => new BusinessRuleError("Receipt return recognition or allocation evidence requires accounting review.", "INVOICE_EVIDENCE_REQUIRED")
const receiptAccountingVerified = (source: ReceiptRecognitionSource, evidence: Awaited<ReturnType<typeof readReceiptRecognitionEvidence>>) => evidence.stockVerified && !!evidence.evidenceHash && (evidence.accountingStatus === "POSTED" && !!evidence.batchId && !!evidence.journalId || evidence.accountingStatus === "NOT_REQUIRED" && source.inventoryValue.eq(0) && evidence.batchId === null && evidence.journalId === null)
const id = z.string().min(1), amount = z.string().regex(/^\d+\.\d{2}$/), qty = z.string().regex(/^\d+\.\d{3}$/), hash = z.string().regex(/^[a-f0-9]{64}$/)
const lineSchema = z.object({ receiptLineId: id, purchaseOrderLineId: id, itemId: id, quantity: qty, invoicedQuantity: qty, uninvoicedQuantity: qty, unitCost: amount, inventoryAmount: amount, supplierClaimAmount: amount, grniAmount: amount,
  claimAllocation: receiptCostAllocationSchema.nullable().optional(), grniAllocation: receiptCostAllocationSchema.nullable().optional(),
}).strict()
const lineValuesSchema = lineSchema.omit({ claimAllocation: true, grniAllocation: true }).strip()
export const receiptReturnRecognitionSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]), organizationId: id, supplierId: id, receiptId: id, returnId: id,
  direction: z.enum(["CORRECTION", "REVERSAL"]), reversalOfReturnId: id.nullable(), currency: z.string().regex(/^[A-Z]{3}$/),
  status: z.enum(["VERIFIED", "REVIEW_REQUIRED"]), sourceHash: hash.nullable(), receiptEvidenceHash: hash.nullable(),
  receiptBatchId: id.nullable(), receiptJournalId: id.nullable(), priorReturnEvidenceHash: hash.nullable(),
  invoiceProofs: z.array(z.object({ invoiceId: id, sourceHash: hash, recognitionHash: hash.nullable() }).strict()),
  lines: z.array(lineSchema).min(1),
}).strict()
export type ReceiptReturnRecognition = z.infer<typeof receiptReturnRecognitionSchema>
export type ReceiptReturnRecognitionV2 = ReceiptReturnRecognition & { version: 2 }
export type ReceiptReturnPlan = {
  sourceGoodsReceiptLineId: string; sourcePurchaseOrderLineId: string; itemId: string
  quantity: Prisma.Decimal; invoicedQuantity: Prisma.Decimal; uninvoicedQuantity: Prisma.Decimal; unitCost: Prisma.Decimal
  inventoryAmount: Prisma.Decimal; supplierClaimAmount: Prisma.Decimal; grniAmount: Prisma.Decimal
}
export type ReceiptReturnTotals = { quantity: Prisma.Decimal; invoicedQuantity: Prisma.Decimal; uninvoicedQuantity: Prisma.Decimal; inventoryAmount: Prisma.Decimal; supplierClaimAmount: Prisma.Decimal; grniAmount: Prisma.Decimal }
const fields = ["quantity", "invoicedQuantity", "uninvoicedQuantity", "inventoryAmount", "supplierClaimAmount", "grniAmount"] as const
const zero = (): ReceiptReturnTotals => ({ quantity: new Prisma.Decimal(0), invoicedQuantity: new Prisma.Decimal(0), uninvoicedQuantity: new Prisma.Decimal(0), inventoryAmount: new Prisma.Decimal(0), supplierClaimAmount: new Prisma.Decimal(0), grniAmount: new Prisma.Decimal(0) })
const eventType = "purchase.return.recognition_allocated"
const resolutionEventType = "purchase.return.accounting_resolved"
type Return = Prisma.PurchaseReturnGetPayload<{ include: { lines: true } }>
function lineProof(line: ReceiptReturnPlan): z.infer<typeof lineSchema> {
  return { receiptLineId: line.sourceGoodsReceiptLineId, purchaseOrderLineId: line.sourcePurchaseOrderLineId, itemId: line.itemId,
    quantity: line.quantity.toFixed(3), invoicedQuantity: line.invoicedQuantity.toFixed(3), uninvoicedQuantity: line.uninvoicedQuantity.toFixed(3), unitCost: line.unitCost.toFixed(2),
    inventoryAmount: line.inventoryAmount.toFixed(2), supplierClaimAmount: line.supplierClaimAmount.toFixed(2), grniAmount: line.grniAmount.toFixed(2) }
}
const proofLines = (lines: ReceiptReturnPlan[]) => lines.map(lineProof).sort((a, b) => a.receiptLineId.localeCompare(b.receiptLineId))
function returnSourceHash(value: Return) {
  return hashBusinessPayload({ id: value.id, organizationId: value.organizationId, supplierId: value.supplierId, purchaseOrderId: value.purchaseOrderId, goodsReceiptId: value.goodsReceiptId,
    direction: value.direction, reversalOfPurchaseReturnId: value.reversalOfPurchaseReturnId, payloadHash: value.payloadHash, documentHash: value.documentHash, evidenceHash: value.evidenceHash,
    inventoryBusinessEventId: value.inventoryBusinessEventId, ledgerPostingBatchId: value.ledgerPostingBatchId, journalEntryId: value.journalEntryId, postedById: value.postedById, occurredAt: value.occurredAt.toISOString(),
    lines: value.lines.map(line => ({ ...lineProof(line), inventoryTransactionId: line.inventoryTransactionId, evidenceHash: line.evidenceHash })).sort((a, b) => a.receiptLineId.localeCompare(b.receiptLineId)) })
}
function effectiveProof(row: Return, events: BusinessEvent[]) {
  const originals = events.filter(event => event.sourceId === row.id && event.eventType === eventType), event = originals[0]
  if (originals.length !== 1 || !event || event.eventSource !== "INTERNAL" || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.actorId !== row.postedById || event.occurredAt.getTime() !== row.occurredAt.getTime() || event.postingBatchId !== row.ledgerPostingBatchId || event.documentHash !== row.documentHash || event.payloadHash !== hashBusinessPayload(event.payload) || record(event.payload).returnSourceHash !== returnSourceHash(row)) throw review()
  const parsed = receiptReturnRecognitionSchema.safeParse(record(event.payload).recognition)
  if (!parsed.success) throw review()
  const resolutions = events.filter(value => value.sourceId === row.id && value.eventType === resolutionEventType)
  if (!resolutions.length) return { recognition: parsed.data, journalEntryId: row.journalEntryId, originalRecognitionHash: hashBusinessPayload(parsed.data), accountingComplete: !!row.journalEntryId || parsed.data.version === 2 && parsed.data.status === "VERIFIED" && parsed.data.lines.every(line => money(line.inventoryAmount).eq(0)) }
  const resolved = resolutions[0], payload = record(resolved.payload), verified = receiptReturnRecognitionSchema.safeParse(payload.recognition)
  const noValue = verified.success && verified.data.version === 2 && verified.data.lines.every(line => money(line.inventoryAmount).eq(0))
  const noJournal = payload.ledgerStatus === "NOT_REQUIRED" && payload.journalEntryId === null && noValue
  if (resolutions.length !== 1 || row.direction !== "CORRECTION" || row.journalEntryId || !verified.success || verified.data.status !== "VERIFIED" || !resolved.actorId || resolved.eventSource !== "INTERNAL" || resolved.schemaVersion !== 1 || resolved.status !== "APPLIED" || !resolved.processedAt || resolved.occurredAt.getTime() !== row.occurredAt.getTime() || resolved.postingBatchId !== row.ledgerPostingBatchId || resolved.documentHash !== row.documentHash || resolved.payloadHash !== hashBusinessPayload(resolved.payload) || payload.returnSourceHash !== returnSourceHash(row) || payload.originalRecognitionHash !== hashBusinessPayload(parsed.data) || (!noJournal && (typeof payload.journalEntryId !== "string" || !payload.journalEntryId || payload.ledgerStatus != null && payload.ledgerStatus !== "POSTED")) || hashBusinessPayload(verified.data.lines) !== hashBusinessPayload(parsed.data.lines)) throw review()
  return { recognition: verified.data, journalEntryId: noJournal ? null : payload.journalEntryId as string, originalRecognitionHash: hashBusinessPayload(parsed.data), accountingComplete: true }
}
function verifyAmounts(lines: ReceiptReturnRecognition["lines"], version: 1 | 2 = 1) {
  if (new Set(lines.map(line => line.receiptLineId)).size !== lines.length) throw review()
  for (const line of lines) {
    if (quantity(line.quantity).lte(0) || !quantity(line.quantity).eq(quantity(line.invoicedQuantity).plus(line.uninvoicedQuantity)) ||
      !money(line.inventoryAmount).eq(money(line.supplierClaimAmount).plus(line.grniAmount))) throw review()
    if (version === 1) {
      if (line.claimAllocation !== undefined || line.grniAllocation !== undefined || !money(line.inventoryAmount).eq(money(quantity(line.quantity).times(line.unitCost))) || !money(line.supplierClaimAmount).eq(money(quantity(line.invoicedQuantity).times(line.unitCost)))) throw review()
    } else {
      for (const [requested, value, allocation] of [[line.invoicedQuantity, line.supplierClaimAmount, line.claimAllocation], [line.uninvoicedQuantity, line.grniAmount, line.grniAllocation]] as const) {
        if (quantity(requested).eq(0)) { if (allocation !== null || !money(value).eq(0)) throw review() }
        else if (!allocation || !receiptCostAllocationSchema.safeParse(allocation).success || allocation.quantity !== requested || allocation.allocatedValue !== value) throw review()
      }
    }
  }
}
function expectedEffects(lines: ReceiptReturnRecognition["lines"]) {
  return new Map([
    ["INVENTORY", { debit: new Prisma.Decimal(0), credit: lines.reduce((sum, line) => sum.plus(line.inventoryAmount), new Prisma.Decimal(0)) }],
    ["SUPPLIER_RETURN_CLAIM", { debit: lines.reduce((sum, line) => sum.plus(line.supplierClaimAmount), new Prisma.Decimal(0)), credit: new Prisma.Decimal(0) }],
    ["GRNI", { debit: lines.reduce((sum, line) => sum.plus(line.grniAmount), new Prisma.Decimal(0)), credit: new Prisma.Decimal(0) }],
  ])
}

/** Reads allocated return costs, including genuine pending posting, independently
 * of current receipt visibility. Caller serializes supplier then receipt. */
async function readReturnEvidence(tx: Prisma.TransactionClient, source: ReceiptRecognitionSource, allowPendingRecognition = false, excludeReturnId?: string, physicalOnly = false) {
  const { manifest } = source
  const rows = await tx.purchaseReturn.findMany({ where: { organizationId: manifest.organizationId, goodsReceiptId: manifest.receiptId }, include: { lines: true }, orderBy: { id: "asc" } })
  const lines = new Map<string, ReceiptReturnTotals>()
  if (!rows.length) return { lines, evidenceHash: hashBusinessPayload([]) }
  const receiptEvidence = allowPendingRecognition ? null : await readReceiptRecognitionEvidence(tx, source)
  const ids = rows.map(row => row.id)
  const events = await tx.businessEvent.findMany({ where: { organizationId: manifest.organizationId, sourceType: "PURCHASE_RETURN", sourceId: { in: ids }, eventType: { in: [eventType, resolutionEventType] } }, orderBy: { id: "asc" } })
  const stocks = await tx.businessEvent.findMany({ where: { organizationId: manifest.organizationId, id: { in: rows.map(row => row.inventoryBusinessEventId) } } })
  const movements = await tx.inventoryTransaction.findMany({ where: { organizationId: manifest.organizationId, id: { in: rows.flatMap(row => row.lines.map(line => line.inventoryTransactionId)) } } })
  const batches = await tx.ledgerPostingBatch.findMany({ where: { organizationId: manifest.organizationId, sourceType: "PURCHASE_RETURN", sourceId: { in: ids } }, include: { journalEntries: { orderBy: { id: "asc" }, include: { lines: { orderBy: { id: "asc" }, include: { account: true } }, reversedByEntries: { orderBy: { id: "asc" }, select: { id: true } } } }, sourceLinks: { orderBy: { id: "asc" } } }, orderBy: { id: "asc" } })
  const proofs = new Map<string, ReceiptReturnRecognition>()
  const journalIds = new Map<string, string | null>()
  for (const row of rows) {
    const effective = effectiveProof(row, events), proof = effective.recognition
    journalIds.set(row.id, effective.journalEntryId)
    verifyAmounts(proof.lines, proof.version)
    if (proof.organizationId !== manifest.organizationId || proof.supplierId !== manifest.supplierId || proof.receiptId !== manifest.receiptId || proof.returnId !== row.id || proof.currency !== manifest.currency || proof.direction !== row.direction || proof.reversalOfReturnId !== row.reversalOfPurchaseReturnId || hashBusinessPayload(proof.lines.map(line => lineValuesSchema.parse(line))) !== hashBusinessPayload(proofLines(row.lines)) || row.purchaseOrderId !== manifest.purchaseOrderId || row.supplierId !== manifest.supplierId || row.occurredAt.getTime() < new Date(manifest.effectiveAt).getTime()) throw review()
    for (const line of proof.lines) {
      const original = manifest.lines.find(value => value.receiptLineId === line.receiptLineId)
      if (!original || !original.stockTracked || original.itemId !== line.itemId || original.purchaseOrderLineId !== line.purchaseOrderLineId || original.unitCost !== line.unitCost) throw review()
      if (proof.version === 2 && line.grniAllocation && (line.grniAllocation.sourceQuantity !== original.quantity || line.grniAllocation.sourceValue !== original.value)) throw review()
    }
    const stock = stocks.find(event => event.id === row.inventoryBusinessEventId), payload = record(stock?.payload)
    if (!stock || stock.eventSource !== "INTERNAL" || stock.schemaVersion !== 1 || stock.status !== "APPLIED" || !stock.processedAt || stock.sourceType !== "PURCHASE_RETURN" || stock.sourceId !== row.id || stock.actorId !== row.postedById || stock.occurredAt.getTime() !== row.occurredAt.getTime() || stock.postingBatchId !== row.ledgerPostingBatchId || stock.documentHash !== row.documentHash || stock.payloadHash !== hashBusinessPayload(stock.payload) || !Array.isArray(payload.lines) || payload.lines.length !== row.lines.length) throw review()
    const reversal = row.direction === "REVERSAL"
    if (stock.eventType !== (reversal ? "purchase.return.stock_reversed" : "purchase.return.stock_posted")) throw review()
    const signatures: string[] = []
    for (const line of row.lines) {
      const movement = movements.find(value => value.id === line.inventoryTransactionId)
      const signed = reversal ? line.quantity : line.quantity.negated()
      if (!movement || movement.itemId !== line.itemId || movement.locationId !== manifest.locationId || movement.referenceType !== "RETURN" || movement.referenceId !== row.id || movement.type !== (reversal ? "PURCHASE_RETURN_REVERSAL" : "PURCHASE_RETURN") || movement.effectiveAt.getTime() !== row.occurredAt.getTime() || movement.timeProvenance !== "EXPLICIT_SOURCE_TIME" || !movement.quantity.eq(signed) || !movement.unitCost?.eq(line.unitCost) || !movement.totalCost?.eq(line.inventoryAmount)) throw review()
      if (reversal) {
        const original = rows.find(value => value.id === row.reversalOfPurchaseReturnId)?.lines.find(value => value.sourceGoodsReceiptLineId === line.sourceGoodsReceiptLineId)
        if (!original || movement.reversalOfTransactionId !== original.inventoryTransactionId) throw review()
      } else if (movement.reversalOfTransactionId) throw review()
      signatures.push(hashBusinessPayload({ itemId: movement.itemId, locationId: movement.locationId, quantity: signed.toFixed(3), unitCost: line.unitCost.toFixed(2), reversalOfTransactionId: movement.reversalOfTransactionId,
        ...(proof.version === 2 ? { receiptValuation: { version: 2, sourceGoodsReceiptLineId: line.sourceGoodsReceiptLineId, allocatedValue: line.inventoryAmount.toFixed(2), recognitionHash: effective.originalRecognitionHash } } : {}) }))
    }
    if (proof.version === 2 && payload.valuationMethod !== "RECEIPT_REMAINING_POOL_V2") throw review()
    const stockSignatures = payload.lines.map(value => { const line = record(value); return hashBusinessPayload({ itemId: line.itemId, locationId: line.locationId, quantity: quantity(String(line.quantity)).toFixed(3), unitCost: money(String(line.unitCost)).toFixed(2), reversalOfTransactionId: line.reversalOfTransactionId ?? null, ...(proof.version === 2 ? { receiptValuation: line.receiptValuation ?? null } : {}) }) })
    if (hashBusinessPayload(signatures.sort()) !== hashBusinessPayload(stockSignatures.sort())) throw review()
    proofs.set(row.id, proof)
  }
  for (const row of rows) {
    const proof = proofs.get(row.id)!, reversing = rows.filter(value => value.reversalOfPurchaseReturnId === row.id)
    if (reversing.length > 1) throw review()
    if (row.direction === "REVERSAL") {
      const original = rows.find(value => value.id === row.reversalOfPurchaseReturnId), originalProof = original && proofs.get(original.id)
      if (!original || !originalProof || original.direction !== "CORRECTION" || original.reversalOfPurchaseReturnId || row.occurredAt < original.occurredAt || hashBusinessPayload(originalProof.lines) !== hashBusinessPayload(proof.lines) || originalProof.status !== proof.status || originalProof.sourceHash !== proof.sourceHash || originalProof.receiptEvidenceHash !== proof.receiptEvidenceHash) throw review()
    } else if (row.reversalOfPurchaseReturnId) throw review()
    const batchRows = batches.filter(batch => batch.sourceId === row.id), batch = batchRows[0]
    const noValue = proof.version === 2 && proof.lines.every(line => money(line.inventoryAmount).eq(0))
    if (!physicalOnly) {
    if (row.ledgerPostingBatchId == null) {
      if (batchRows.length || row.journalEntryId || journalIds.get(row.id)) throw review()
      if (!noValue) {
        if (row.direction !== "REVERSAL") throw review()
        const original = rows.find(value => value.id === row.reversalOfPurchaseReturnId)
        if (!original || journalIds.get(original.id)) throw review()
      }
    } else {
      const batchMetadata = record(batch?.metadata)
      const retainedProof = batchMetadata.receiptReturnRecognition ?? record(batchMetadata.details).receiptReturnRecognition
      if (batchRows.length !== 1 || !batch || batch.id !== row.ledgerPostingBatchId || batch.postingPurpose !== "PURCHASE_RETURN" || retainedProof == null || hashBusinessPayload(retainedProof) !== hashBusinessPayload(proof)) throw review()
      if (journalIds.get(row.id)) {
        const journal = batch.journalEntries[0], link = batch.sourceLinks[0], reversedOriginal = row.direction === "CORRECTION" && reversing.length === 1
        if (batch.journalEntries.length !== 1 || batch.sourceLinks.length !== 1 || !journal || !link || journal.id !== journalIds.get(row.id) || journal.organizationId !== manifest.organizationId || journal.sourceId !== row.id || journal.sourceType !== "PURCHASE_RETURN" || journal.postingPurpose !== "PURCHASE_RETURN" || journal.postingBatchId !== batch.id || journal.currency !== manifest.currency || journal.entryDate.getTime() !== row.occurredAt.getTime() || !journal.postedAt || link.journalEntryId !== journal.id || link.postingBatchId !== batch.id || link.sourceId !== row.id || link.sourceType !== "PURCHASE_RETURN" || !batch.postedAt || batch.status !== (reversedOriginal ? "REVERSED" : "POSTED") || journal.status !== (reversedOriginal ? "REVERSED" : "POSTED")) throw review()
        if (reversedOriginal ? !journal.reversedAt || journal.reversedByEntries.length !== 1 : !!journal.reversedAt || journal.reversedByEntries.length > 0) throw review()
        if (row.direction === "REVERSAL") {
          const original = rows.find(value => value.id === row.reversalOfPurchaseReturnId)!
          if (journal.reversalOfEntryId !== journalIds.get(original.id)) throw review()
        } else if (journal.reversalOfEntryId) throw review()
        const expected = expectedEffects(proof.lines), totals = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>()
        for (const line of journal.lines) {
          const key = line.account.mappingKey ?? "", value = totals.get(key) ?? { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) }
          if (line.organizationId !== manifest.organizationId || line.account.organizationId !== manifest.organizationId || line.currency !== manifest.currency || line.debit.lt(0) || line.credit.lt(0) || line.debit.gt(0) && line.credit.gt(0) || !expected.has(key) && (line.debit.gt(0) || line.credit.gt(0))) throw review()
          value.debit = value.debit.plus(line.debit); value.credit = value.credit.plus(line.credit); totals.set(key, value)
        }
        for (const [key, target] of expected) { const actual = totals.get(key) ?? { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) }; if (!actual.debit.eq(row.direction === "REVERSAL" ? target.credit : target.debit) || !actual.credit.eq(row.direction === "REVERSAL" ? target.debit : target.credit)) throw review() }
      } else if (batch.journalEntries.length || batch.sourceLinks.length || batch.postedAt || (reversing.length ? batch.status !== "REVERSED" || !batch.reversedAt : batch.status !== "FAILED" || !!batch.reversedAt)) throw review()
    }
    }
    if (proof.status !== "VERIFIED" && !reversing.length && row.direction !== "REVERSAL" && !allowPendingRecognition) throw review()
    if (proof.status === "VERIFIED" && proof.sourceHash !== source.sourceHash) throw review()
    if (proof.status === "VERIFIED" && receiptEvidence && (!receiptAccountingVerified(source, receiptEvidence) || proof.receiptBatchId !== receiptEvidence.batchId || proof.receiptJournalId !== receiptEvidence.journalId || proof.receiptEvidenceHash !== receiptEvidence.evidenceHash)) throw review()
    if (allowPendingRecognition && proof.sourceHash !== source.sourceHash) throw review()
    if (row.id !== excludeReturnId) for (const line of row.lines) { const value = lines.get(line.sourceGoodsReceiptLineId) ?? zero(), sign = row.direction === "REVERSAL" ? -1 : 1; for (const field of fields) value[field] = value[field].plus(line[field].times(sign)); lines.set(line.sourceGoodsReceiptLineId, value) }
  }
  for (const [id, value] of lines) { const original = manifest.lines.find(line => line.receiptLineId === id); if (!original || fields.some(field => value[field].lt(0)) || value.quantity.gt(original.quantity) || value.inventoryAmount.gt(original.value)) throw review() }
  return { lines, evidenceHash: hashBusinessPayload({ events: events.map(event => ({ id: event.id, payloadHash: event.payloadHash })).sort((a, b) => a.id.localeCompare(b.id)), batches: JSON.parse(JSON.stringify(batches)) }) }
}

export async function readReceiptReturnAllocations(tx: Prisma.TransactionClient, source: ReceiptRecognitionSource) {
  return readReturnEvidence(tx, source)
}

/** Physical returns cannot manufacture or erase the original receipt recognition.
 * Recovery may validate their retained source/stock without claiming their pending
 * accounting is posted. Invoice release still uses the strict reader above. */
export async function validateReceiptReturnStockForRecognition(tx: Prisma.TransactionClient, source: ReceiptRecognitionSource) {
  await readReturnEvidence(tx, source, true)
}

export async function listReceiptReturnRecoverySources(tx: Prisma.TransactionClient, source: ReceiptRecognitionSource) {
  const evidence = await readReturnEvidence(tx, source, true)
  const rows = await tx.purchaseReturn.findMany({ where: { organizationId: source.manifest.organizationId, goodsReceiptId: source.manifest.receiptId, direction: "CORRECTION", reversedByPurchaseReturn: null }, include: { lines: true }, orderBy: { id: "asc" } })
  const pending = []
  for (const row of rows) {
    const effective = await readPurchaseReturnAccountingEvidence(tx, row)
    if (effective.accountingComplete) continue
    pending.push({ returnId: row.id, sourceDate: row.occurredAt, sourceHash: hashBusinessPayload({ returnSourceHash: returnSourceHash(row), evidenceHash: evidence.evidenceHash }), currency: source.manifest.currency, accountingRequired: row.lines.some(line => line.inventoryAmount.gt(0)),
      inventoryAmount: row.lines.reduce((sum, line) => sum.plus(line.inventoryAmount), new Prisma.Decimal(0)).toFixed(2), supplierClaimAmount: row.lines.reduce((sum, line) => sum.plus(line.supplierClaimAmount), new Prisma.Decimal(0)).toFixed(2), grniAmount: row.lines.reduce((sum, line) => sum.plus(line.grniAmount), new Prisma.Decimal(0)).toFixed(2) })
  }
  return pending
}

function invoiceSourceHash(invoice: Prisma.SupplierInvoiceGetPayload<{ include: { lines: true } }>) {
  return hashBusinessPayload({ organizationId: invoice.organizationId, supplierId: invoice.supplierId, invoiceId: invoice.id, currency: invoice.currency, subtotal: invoice.subtotal.toFixed(2), total: invoice.total.toFixed(2), taxAmount: invoice.taxAmount.toFixed(2),
    lines: invoice.lines.map(line => ({ receiptLineId: line.goodsReceiptLineId, quantity: line.quantity.toFixed(3), unitCost: line.unitCost.toFixed(2) })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) })
}

/** Resolves the actual inventory funding of the return. A source-review result
 * allows its stock obligation to be recorded, but never invents a GRNI debit. */
export async function resolveReceiptReturnRecognition(tx: Prisma.TransactionClient, input: { organizationId: string; supplierId: string; receiptId: string; returnId: string; currency: string; plans: ReceiptReturnPlan[]; recovering?: boolean }) {
  const proof: ReceiptReturnRecognition = { version: 1, organizationId: input.organizationId, supplierId: input.supplierId, receiptId: input.receiptId, returnId: input.returnId, direction: "CORRECTION", reversalOfReturnId: null, currency: input.currency, status: "REVIEW_REQUIRED", sourceHash: null, receiptEvidenceHash: null, receiptBatchId: null, receiptJournalId: null, priorReturnEvidenceHash: null, invoiceProofs: [], lines: proofLines(input.plans) }
  let blocker: { code: string; message: string } | undefined
  try {
    const source = await readReceiptRecognitionSource(tx, input.organizationId, input.receiptId)
    let recognized = false
    let frozen: ReceiptReturnRecognition | null = null
    if (input.recovering) {
      const retained = await tx.purchaseReturn.findFirst({ where: { id: input.returnId, organizationId: input.organizationId }, include: { lines: true } })
      if (!retained) throw review()
      frozen = (await readPurchaseReturnAccountingEvidence(tx, retained)).recognition
    }
    if (source) {
      proof.sourceHash = source.sourceHash
      if (source.manifest.currency !== input.currency || source.manifest.supplierId !== input.supplierId) throw review()
      const receipt = await readReceiptRecognitionEvidence(tx, source)
      if (!receipt.stockVerified) throw review()
      recognized = receiptAccountingVerified(source, receipt)
      proof.receiptEvidenceHash = receipt.evidenceHash; proof.receiptBatchId = receipt.batchId; proof.receiptJournalId = receipt.journalId
    }
    const prior = source ? await readReturnEvidence(tx, source, true, input.recovering ? input.returnId : undefined) : null
    proof.priorReturnEvidenceHash = prior?.evidenceHash ?? null
    if (!source && input.plans.some(line => line.uninvoicedQuantity.gt(0))) throw review()
    const invoiceIds = input.plans.map(line => line.sourceGoodsReceiptLineId)
    const invoices = await tx.supplierInvoice.findMany({ where: { organizationId: input.organizationId, supplierId: input.supplierId, lines: { some: { goodsReceiptLineId: { in: invoiceIds } } }, OR: [{ status: { in: ["POSTED", "PAYMENT_PENDING", "PAID"] } }, { approvedById: { not: null } }, { postedAt: { not: null } }, { ledgerPostingBatchId: { not: null } }] }, include: { lines: true }, orderBy: { id: "asc" } })
    const invoiceTotals = new Map<string, { quantity: Prisma.Decimal; cost: Prisma.Decimal }>()
    const invoiceChains = new Map<string, Array<{ quantity: Prisma.Decimal; cost: Prisma.Decimal; priorQuantity: Prisma.Decimal; priorCost: Prisma.Decimal }>>()
    for (const invoice of invoices) {
      if (invoice.deletedAt || invoice.currency !== input.currency || !["POSTED", "PAYMENT_PENDING", "PAID"].includes(invoice.status) || !invoice.createdById || !invoice.approvedById || invoice.createdById === invoice.approvedById || !invoice.postedAt || !invoice.postedBusinessEventId || !invoice.ledgerPostingBatchId) throw review()
      const event = await tx.businessEvent.findFirst({ where: { id: invoice.postedBusinessEventId, organizationId: input.organizationId } })
      const recognition = record(record(invoice.metadata).receiptRecognition), allocations = recognition.allocations
      const sourceHash = invoiceSourceHash(invoice), recognitionHash = source ? hashBusinessPayload(recognition) : null
      if (!event || event.eventType !== "purchase.supplier_invoice.posted" || event.eventSource !== "INTERNAL" || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.sourceType !== "SUPPLIER_INVOICE" || event.sourceId !== invoice.id || event.actorId !== invoice.approvedById || event.postingBatchId !== invoice.ledgerPostingBatchId || event.occurredAt.getTime() !== invoice.postedAt.getTime() || event.payloadHash !== hashBusinessPayload(event.payload)) throw review()
      if (source && (![1, 2, 3].includes(Number(recognition.version)) || recognition.organizationId !== input.organizationId || recognition.supplierId !== input.supplierId || recognition.invoiceId !== invoice.id || recognition.currency !== input.currency || recognition.invoiceSourceHash !== sourceHash || !Array.isArray(allocations) || record(event.payload).receiptRecognitionHash !== recognitionHash)) throw review()
      if (source && recognition.version === 3) readInvoiceReceiptRecognition(recognition, { organizationId: input.organizationId, supplierId: input.supplierId, invoiceId: invoice.id, currency: input.currency, subtotal: invoice.subtotal, total: invoice.total, taxAmount: invoice.taxAmount, lines: invoice.lines })
      const batches = await tx.ledgerPostingBatch.findMany({ where: { organizationId: input.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id }, include: { journalEntries: { include: { lines: { include: { account: true } }, reversedByEntries: { select: { id: true } } } }, sourceLinks: true } })
      const batch = batches[0], journal = batch?.journalEntries[0], link = batch?.sourceLinks[0]
      if (batches.length !== 1 || !batch || batch.id !== invoice.ledgerPostingBatchId || batch.reversedAt || batch.status === "REVERSED" || batch.journalEntries.some(entry => entry.status !== "POSTED" || !!entry.reversedAt || entry.reversedByEntries.length > 0)) throw review()
      if (source) {
        if (batch.status === "FAILED" ? !!batch.postedAt || batch.journalEntries.length > 0 || batch.sourceLinks.length > 0 : batch.status !== "POSTED" || !journal || batch.journalEntries.length !== 1 || batch.sourceLinks.length !== 1) throw review()
      } else {
        if (Object.keys(recognition).length || record(event.payload).receiptRecognitionHash || batch.status !== "POSTED" || !journal || batch.journalEntries.length !== 1 || batch.sourceLinks.length !== 1 || journal.currency !== input.currency || journal.sourceId !== invoice.id || journal.sourceType !== "SUPPLIER_INVOICE" || journal.postingBatchId !== batch.id || !journal.postedAt) throw review()
        const inventory = journal.lines.filter(line => line.account.mappingKey === "INVENTORY")
        if (inventory.some(line => line.credit.gt(0)) || !inventory.reduce((sum, line) => sum.plus(line.debit), new Prisma.Decimal(0)).eq(invoice.subtotal)) throw review()
      }
      if (journal && (!batch.postedAt || journal.organizationId !== input.organizationId || journal.currency !== input.currency || journal.sourceId !== invoice.id || journal.sourceType !== "SUPPLIER_INVOICE" || journal.postingBatchId !== batch.id || !journal.postedAt || !link || link.organizationId !== input.organizationId || link.sourceType !== "SUPPLIER_INVOICE" || link.sourceId !== invoice.id || link.postingBatchId !== batch.id || link.journalEntryId !== journal.id || journal.lines.some(line => line.organizationId !== input.organizationId || line.account.organizationId !== input.organizationId || line.currency !== input.currency || line.debit.lt(0) || line.credit.lt(0)))) throw review()
      proof.invoiceProofs.push({ invoiceId: invoice.id, sourceHash, recognitionHash })
      for (const receiptLineId of invoiceIds) {
        const lines = invoice.lines.filter(line => line.goodsReceiptLineId === receiptLineId)
        if (!lines.length) continue
        const q = lines.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0)), value = invoiceTotals.get(receiptLineId) ?? { quantity: new Prisma.Decimal(0), cost: new Prisma.Decimal(0) }
        let cost = lines.reduce((sum, line) => sum.plus(money(line.quantity.times(line.unitCost))), new Prisma.Decimal(0))
        if (source) {
          const matches = (allocations as unknown[]).map(record).filter(a => a.receiptLineId === receiptLineId), allocation = matches[0]
          if (matches.length !== 1 || !allocation || allocation.receiptId !== input.receiptId || allocation.receiptBatchId !== proof.receiptBatchId || allocation.receiptJournalId !== proof.receiptJournalId || allocation.receiptEvidenceHash !== proof.receiptEvidenceHash || typeof allocation.quantity !== "string" || typeof allocation.receiptCost !== "string" || typeof allocation.invoiceNet !== "string" || !/^\d+(?:\.\d+)?$/.test(allocation.quantity) || !/^\d+(?:\.\d+)?$/.test(allocation.receiptCost) || !/^\d+(?:\.\d+)?$/.test(allocation.invoiceNet) || !money(allocation.invoiceNet).eq(cost) || !quantity(allocation.quantity).eq(q)) throw review()
          if (recognition.version === 3 && allocation.accountingStatus !== (proof.receiptBatchId === null && proof.receiptJournalId === null && source.inventoryValue.eq(0) ? "NOT_REQUIRED" : "POSTED")) throw review()
          cost = money(allocation.receiptCost)
          if (allocation.costAllocation != null) {
            const policy = receiptCostAllocationSchema.safeParse(allocation.costAllocation), original = source.manifest.lines.find(line => line.receiptLineId === receiptLineId)
            if (![2, 3].includes(Number(recognition.version)) || !policy.success || !original || policy.data.sourceQuantity !== original.quantity || policy.data.sourceValue !== original.value || policy.data.quantity !== q.toFixed(3) || policy.data.allocatedValue !== cost.toFixed(2)) throw review()
          }
          if (typeof allocation.priorQuantity !== "string" || typeof allocation.priorCost !== "string" || !/^\d+(?:\.\d+)?$/.test(allocation.priorQuantity) || !/^\d+(?:\.\d+)?$/.test(allocation.priorCost)) throw review()
          const chain = invoiceChains.get(receiptLineId) ?? []
          chain.push({ quantity: q, cost, priorQuantity: quantity(allocation.priorQuantity), priorCost: money(allocation.priorCost) }); invoiceChains.set(receiptLineId, chain)
        } else if (lines.some(line => !line.unitCost.eq(input.plans.find(plan => plan.sourceGoodsReceiptLineId === receiptLineId)!.unitCost))) throw review()
        value.quantity = value.quantity.plus(q); value.cost = value.cost.plus(cost); invoiceTotals.set(receiptLineId, value)
      }
    }
    for (const chain of invoiceChains.values()) {
      let q = new Prisma.Decimal(0), cost = new Prisma.Decimal(0)
      for (const allocation of chain.sort((a, b) => a.priorQuantity.cmp(b.priorQuantity))) {
        if (allocation.quantity.lte(0) || !allocation.priorQuantity.eq(q) || !allocation.priorCost.eq(cost)) throw review()
        q = q.plus(allocation.quantity); cost = cost.plus(allocation.cost)
      }
    }
    if (source && (!frozen || frozen.version === 2)) {
      proof.version = 2
      proof.lines = input.plans.map(plan => {
        const used = invoiceTotals.get(plan.sourceGoodsReceiptLineId) ?? { quantity: new Prisma.Decimal(0), cost: new Prisma.Decimal(0) }, returned = prior?.lines.get(plan.sourceGoodsReceiptLineId) ?? zero()
        const original = source.manifest.lines.find(line => line.receiptLineId === plan.sourceGoodsReceiptLineId)
        if (!original || !original.stockTracked || original.unitCost !== plan.unitCost.toFixed(2)) throw review()
        const retained = frozen?.lines.find(line => line.receiptLineId === plan.sourceGoodsReceiptLineId)
        if (retained && (retained.quantity !== plan.quantity.toFixed(3) || retained.invoicedQuantity !== plan.invoicedQuantity.toFixed(3) || retained.uninvoicedQuantity !== plan.uninvoicedQuantity.toFixed(3))) throw review()
        const claimAllocation = retained ? retained.claimAllocation : plan.invoicedQuantity.gt(0) ? allocateReceiptCost({ sourceQuantity: used.quantity, sourceValue: used.cost, consumedQuantity: returned.invoicedQuantity, consumedValue: returned.supplierClaimAmount, quantity: plan.invoicedQuantity }) : null
        const grniAllocation = retained ? retained.grniAllocation : plan.uninvoicedQuantity.gt(0) ? allocateReceiptCost({ sourceQuantity: original.quantity, sourceValue: original.value, consumedQuantity: used.quantity.plus(returned.uninvoicedQuantity), consumedValue: used.cost.plus(returned.grniAmount), quantity: plan.uninvoicedQuantity }) : null
        const claim = money(claimAllocation?.allocatedValue ?? 0), grni = money(grniAllocation?.allocatedValue ?? 0)
        return { ...lineProof(plan), inventoryAmount: claim.plus(grni).toFixed(2), supplierClaimAmount: claim.toFixed(2), grniAmount: grni.toFixed(2), claimAllocation, grniAllocation }
      })
    }
    verifyAmounts(proof.lines, proof.version)
    for (const originalPlan of input.plans) {
      const allocated = proof.lines.find(line => line.receiptLineId === originalPlan.sourceGoodsReceiptLineId)!
      const plan = { ...originalPlan, inventoryAmount: money(allocated.inventoryAmount), supplierClaimAmount: money(allocated.supplierClaimAmount), grniAmount: money(allocated.grniAmount) }
      const used = invoiceTotals.get(plan.sourceGoodsReceiptLineId) ?? { quantity: new Prisma.Decimal(0), cost: new Prisma.Decimal(0) }, returned = prior?.lines.get(plan.sourceGoodsReceiptLineId) ?? zero()
      if (returned.invoicedQuantity.plus(plan.invoicedQuantity).gt(used.quantity) || returned.supplierClaimAmount.plus(plan.supplierClaimAmount).gt(used.cost)) throw review()
      if (source) {
        const original = source.manifest.lines.find(line => line.receiptLineId === plan.sourceGoodsReceiptLineId)
        if (!original || !original.stockTracked || original.itemId !== plan.itemId || original.purchaseOrderLineId !== plan.sourcePurchaseOrderLineId || original.unitCost !== plan.unitCost.toFixed(2) || used.quantity.plus(returned.uninvoicedQuantity).plus(plan.uninvoicedQuantity).gt(original.quantity) || used.cost.plus(returned.grniAmount).plus(plan.grniAmount).gt(original.value) || returned.inventoryAmount.plus(plan.inventoryAmount).gt(original.value)) throw review()
      } else {
        // Legacy fully invoiced returns require the actual invoice journal. Prior
        // legacy returns are counted at their retained costs, never reclassified.
        const old = await tx.purchaseReturnLine.findMany({ where: { organizationId: input.organizationId, sourceGoodsReceiptLineId: plan.sourceGoodsReceiptLineId }, include: { purchaseReturn: { select: { direction: true } } } })
        const priorClaim = old.reduce((sum, line) => sum.plus(line.supplierClaimAmount.times(line.purchaseReturn.direction === "REVERSAL" ? -1 : 1)), new Prisma.Decimal(0))
        if (priorClaim.lt(0) || priorClaim.plus(plan.supplierClaimAmount).gt(used.cost)) throw review()
      }
    }
    if (source && !recognized) throw review()
    proof.status = "VERIFIED"
  } catch (error) {
    if (!(error instanceof BusinessRuleError)) throw error
    blocker = { code: "PURCHASE_RETURN_SOURCE_REVIEW", message: "Returned stock was recorded. Verify original receipt recognition, invoice allocations and prior returns before posting its accounting." }
  }
  if (proof.version === 1 && !input.plans.some(line => line.inventoryAmount.gt(0))) blocker = { code: "PURCHASE_RETURN_ZERO_VALUE_REVIEW", message: "Legacy zero-value return allocation requires source review." }
  const allocatedPlans = input.plans.map(plan => { const line = proof.lines.find(value => value.receiptLineId === plan.sourceGoodsReceiptLineId)!; return { ...plan, inventoryAmount: money(line.inventoryAmount), supplierClaimAmount: money(line.supplierClaimAmount), grniAmount: money(line.grniAmount) } })
  return { recognition: proof, recognitionHash: hashBusinessPayload(proof), sourceReviewBlocker: blocker, allocatedPlans }
}

export async function recordReceiptReturnRecognition(tx: Prisma.TransactionClient, value: Return, recognition: ReceiptReturnRecognition) {
  const result = await recordBusinessEventInTx(tx, { organizationId: value.organizationId, eventType, eventSource: "INTERNAL", schemaVersion: 1, sourceType: "PURCHASE_RETURN", sourceId: value.id,
    idempotencyKey: `purchase-return-recognition:${value.id}`, actorId: value.postedById, occurredAt: value.occurredAt, postingBatchId: value.ledgerPostingBatchId ?? undefined,
    documentHash: value.documentHash, payload: { recognition, returnSourceHash: returnSourceHash(value) } })
  if (!result.created) throw review()
  await markBusinessEventAppliedInTx(tx, value.organizationId, result.event.id)
}

export async function retainReturnReversalRecognition(tx: Prisma.TransactionClient, original: Return, reversalId: string) {
  const events = await tx.businessEvent.findMany({ where: { organizationId: original.organizationId, sourceType: "PURCHASE_RETURN", sourceId: original.id, eventType: { in: [eventType, resolutionEventType] } } })
  if (!events.length) return null // Historical reversals remain exact and explicitly lack new allocation evidence.
  const effective = effectiveProof(original, events)
  if (effective.recognition.returnId !== original.id || effective.recognition.direction !== "CORRECTION") throw review()
  return { ...effective.recognition, returnId: reversalId, direction: "REVERSAL" as const, reversalOfReturnId: original.id }
}

export async function readPurchaseReturnAccountingEvidence(tx: Prisma.TransactionClient, original: Return) {
  const events = await tx.businessEvent.findMany({ where: { organizationId: original.organizationId, sourceType: "PURCHASE_RETURN", sourceId: original.id, eventType: { in: [eventType, resolutionEventType] } } })
  if (!events.length) return { recognition: null, journalEntryId: original.journalEntryId, originalRecognitionHash: null, accountingComplete: !!original.journalEntryId }
  return effectiveProof(original, events)
}

/** A supplier credit consumes the claim created by a verified return journal.
 * Supplier commercial acceptance cannot create a missing inventory/claim entry. */
export async function assertPurchaseReturnClaimFunding(tx: Prisma.TransactionClient, original: Return, input: { currency: string; sourceDate: Date; claims: Array<{ returnLineId: string; quantity: Prisma.Decimal; amount: Prisma.Decimal }> }) {
  const effective = await readPurchaseReturnAccountingEvidence(tx, original)
  if (!effective.recognition || effective.recognition.status !== "VERIFIED" || !effective.accountingComplete) throw new BusinessRuleError("Recover and verify the original return accounting before posting its supplier credit.", "INVOICE_EVIDENCE_REQUIRED")
  const source = await readReceiptRecognitionSource(tx, original.organizationId, original.goodsReceiptId)
  if (!source) throw new BusinessRuleError("Legacy return claim funding requires accounting source review before supplier credit posting.", "INVOICE_EVIDENCE_REQUIRED")
  const receipt = await readReceiptRecognitionEvidence(tx, source), proof = effective.recognition
  if (source.manifest.currency !== input.currency || proof.currency !== input.currency || source.manifest.supplierId !== original.supplierId || proof.sourceHash !== source.sourceHash || !receiptAccountingVerified(source, receipt) || proof.receiptBatchId !== receipt.batchId || proof.receiptJournalId !== receipt.journalId || proof.receiptEvidenceHash !== receipt.evidenceHash || input.sourceDate < original.occurredAt) throw review()
  await readReturnEvidence(tx, source, true)
  const eligible = original.lines.filter(line => line.invoicedQuantity.gt(0))
  if (new Set(input.claims.map(claim => claim.returnLineId)).size !== eligible.length || input.claims.length !== eligible.length) throw review()
  for (const claim of input.claims) {
    const line = eligible.find(value => value.id === claim.returnLineId)
    if (!line || !claim.quantity.eq(line.invoicedQuantity) || !claim.amount.eq(line.supplierClaimAmount) || claim.amount.lt(0)) throw review()
    if (!effective.journalEntryId && claim.amount.gt(0)) throw review()
  }
  return { journalEntryId: effective.journalEntryId, recognitionHash: hashBusinessPayload(proof) }
}

export async function recordReceiptReturnResolution(tx: Prisma.TransactionClient, value: Return, recognition: ReceiptReturnRecognition, journalEntryId: string | null, actorId: string) {
  const original = await readPurchaseReturnAccountingEvidence(tx, value)
  if (!original.recognition || original.journalEntryId || !original.originalRecognitionHash) throw review()
  const result = await recordBusinessEventInTx(tx, { organizationId: value.organizationId, eventType: resolutionEventType, eventSource: "INTERNAL", schemaVersion: 1, sourceType: "PURCHASE_RETURN", sourceId: value.id,
    idempotencyKey: `purchase-return-resolution:${value.id}`, actorId, occurredAt: value.occurredAt, postingBatchId: value.ledgerPostingBatchId ?? undefined, documentHash: value.documentHash,
    payload: { recognition, returnSourceHash: returnSourceHash(value), originalRecognitionHash: original.originalRecognitionHash, journalEntryId, ledgerStatus: journalEntryId ? "POSTED" : "NOT_REQUIRED" } })
  if (!result.created) throw review()
  await markBusinessEventAppliedInTx(tx, value.organizationId, result.event.id)
}

/** The stock gateway accepts explicit values only through this source-owned
 * validator, under the same supplier/receipt locks as invoice allocation. */
export async function validateReceiptReturnStockAllocationInTx(tx: Prisma.TransactionClient, input: {
  organizationId: string; goodsReceiptId: string; purchaseReturnId: string; direction: "CORRECTION" | "REVERSAL"; occurredAt: Date;
  recognition: ReceiptReturnRecognition; lines: Array<{ itemId: string; locationId: string; quantity: Prisma.Decimal.Value; unitCost: Prisma.Decimal.Value; sourceGoodsReceiptLineId?: string; allocatedValue?: Prisma.Decimal.Value; sourceInventoryTransactionId?: string | null }>
}) {
  await tx.$queryRaw`SELECT s.id FROM suppliers s JOIN purchase_orders p ON p."supplierId" = s.id JOIN goods_receipts r ON r."purchaseOrderId" = p.id WHERE r.id = ${input.goodsReceiptId} AND r."organizationId" = ${input.organizationId} AND p."organizationId" = ${input.organizationId} AND s."organizationId" = ${input.organizationId} FOR UPDATE OF s`
  await tx.$queryRaw`SELECT id FROM goods_receipts WHERE id = ${input.goodsReceiptId} AND "organizationId" = ${input.organizationId} FOR UPDATE`
  const parsed = receiptReturnRecognitionSchema.safeParse(input.recognition)
  if (!parsed.success || parsed.data.version !== 2) throw review()
  const proof = parsed.data, source = await readReceiptRecognitionSource(tx, input.organizationId, input.goodsReceiptId)
  if (!source || proof.organizationId !== input.organizationId || proof.receiptId !== input.goodsReceiptId || proof.returnId !== input.purchaseReturnId || proof.direction !== input.direction || proof.sourceHash !== source.sourceHash || proof.supplierId !== source.manifest.supplierId || proof.currency !== source.manifest.currency || input.occurredAt.getTime() < new Date(source.manifest.effectiveAt).getTime()) throw review()
  verifyAmounts(proof.lines, 2)
  if (input.lines.length !== proof.lines.length || new Set(input.lines.map(line => line.sourceGoodsReceiptLineId)).size !== proof.lines.length) throw review()
  const values = new Map<string, string>()
  for (const line of input.lines) {
    const frozen = proof.lines.find(value => value.receiptLineId === line.sourceGoodsReceiptLineId)
    if (!frozen || line.itemId !== frozen.itemId || line.locationId !== source.manifest.locationId || !quantity(line.quantity).eq(frozen.quantity) || !money(line.unitCost).eq(frozen.unitCost) || line.allocatedValue == null || !money(line.allocatedValue).eq(frozen.inventoryAmount)) throw review()
    values.set(frozen.receiptLineId, frozen.inventoryAmount)
  }
  const existing = await tx.purchaseReturn.findFirst({ where: { id: input.purchaseReturnId, organizationId: input.organizationId }, include: { lines: true } })
  if (existing) {
    const retained = await readPurchaseReturnAccountingEvidence(tx, existing)
    if (retained.originalRecognitionHash !== hashBusinessPayload(proof) || existing.occurredAt.getTime() !== input.occurredAt.getTime()) throw review()
    await readReturnEvidence(tx, source, true, undefined, true)
    return values
  }
  if (input.direction === "REVERSAL") {
    const original = await tx.purchaseReturn.findFirst({ where: { id: proof.reversalOfReturnId ?? "", organizationId: input.organizationId, goodsReceiptId: input.goodsReceiptId }, include: { lines: true, reversedByPurchaseReturn: { select: { id: true } } } })
    if (!original || original.direction !== "CORRECTION" || original.reversedByPurchaseReturn || input.occurredAt < original.occurredAt || hashBusinessPayload(await retainReturnReversalRecognition(tx, original, input.purchaseReturnId)) !== hashBusinessPayload(proof)) throw review()
    await readReturnEvidence(tx, source, true, undefined, true)
    for (const line of input.lines) if (line.sourceInventoryTransactionId !== original.lines.find(value => value.sourceGoodsReceiptLineId === line.sourceGoodsReceiptLineId)?.inventoryTransactionId) throw review()
  } else {
    if (proof.reversalOfReturnId || input.lines.some(line => line.sourceInventoryTransactionId)) throw review()
    const plans = proof.lines.map(line => ({ sourceGoodsReceiptLineId: line.receiptLineId, sourcePurchaseOrderLineId: line.purchaseOrderLineId, itemId: line.itemId, quantity: quantity(line.quantity), invoicedQuantity: quantity(line.invoicedQuantity), uninvoicedQuantity: quantity(line.uninvoicedQuantity), unitCost: money(line.unitCost), inventoryAmount: money(line.inventoryAmount), supplierClaimAmount: money(line.supplierClaimAmount), grniAmount: money(line.grniAmount) }))
    const resolved = await resolveReceiptReturnRecognition(tx, { organizationId: input.organizationId, supplierId: source.manifest.supplierId, receiptId: input.goodsReceiptId, returnId: input.purchaseReturnId, currency: source.manifest.currency, plans })
    if (hashBusinessPayload(resolved.recognition) !== hashBusinessPayload(proof)) throw review()
  }
  return values
}

/** Rebuild consumes the immutable physical allocation, including explicit zero,
 * independently of whether later accounting setup is still operational. */
export async function readReceiptReturnStockValuations(tx: Prisma.TransactionClient, input: { organizationId: string; returnIds: string[] }) {
  const values = new Map<string, string>()
  if (!input.returnIds.length) return values
  const rows = await tx.purchaseReturn.findMany({ where: { organizationId: input.organizationId, id: { in: input.returnIds } }, include: { lines: true } })
  const stockEvents = await tx.businessEvent.findMany({ where: { organizationId: input.organizationId, sourceType: "PURCHASE_RETURN", sourceId: { in: input.returnIds }, eventType: { in: ["purchase.return.stock_posted", "purchase.return.stock_reversed"] } } })
  for (const event of stockEvents) {
    const payload = record(event.payload)
    const marked = payload.valuationMethod === "RECEIPT_REMAINING_POOL_V2" || Array.isArray(payload.lines) && payload.lines.some(line => record(line).receiptValuation != null)
    if (marked && !rows.some(row => row.id === event.sourceId)) throw review()
  }
  for (const receiptId of [...new Set(rows.map(row => row.goodsReceiptId))]) {
    const relevant = rows.filter(row => row.goodsReceiptId === receiptId)
    const marked = []
    for (const row of relevant) {
      const evidence = await readPurchaseReturnAccountingEvidence(tx, row)
      if (evidence.recognition?.version === 2) marked.push(row)
      else if (stockEvents.some(event => event.sourceId === row.id && (record(event.payload).valuationMethod === "RECEIPT_REMAINING_POOL_V2" || Array.isArray(record(event.payload).lines) && (record(event.payload).lines as unknown[]).some(line => record(line).receiptValuation != null)))) throw review()
    }
    if (!marked.length) continue
    const source = await readReceiptRecognitionSource(tx, input.organizationId, receiptId)
    if (!source) throw review()
    await readReturnEvidence(tx, source, true, undefined, true)
    for (const row of marked) for (const line of row.lines) values.set(line.inventoryTransactionId, line.inventoryAmount.toFixed(2))
  }
  return values
}
