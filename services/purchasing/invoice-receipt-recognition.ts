import { Prisma } from "@prisma/client"
import { z } from "zod"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { hasVerifiedReceiptPosting, receiptPostingEvidenceSelect } from "@/services/purchase-order/purchase-receipt-accounting-evidence"
import { readReceiptRecognitionEvidence, readReceiptRecognitionSource, type ReceiptRecognitionSource } from "@/services/purchase-order/receipt-recognition-source"
import { readReceiptReturnAllocations } from "./receipt-return-recognition"
import { allocateReceiptCost, receiptCostAllocationSchema } from "@/services/inventory/receipt-cost-allocation"

const money = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value).toDecimalPlaces(2)
const quantity = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value).toDecimalPlaces(3)
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const review = (detail: string) => new BusinessRuleError(`${detail} Review receipt and invoice accounting evidence before posting.`, "INVOICE_EVIDENCE_REQUIRED")
const decimalString = z.string().regex(/^\d+(?:\.\d+)?$/)
const allocationSchema = z.object({
  receiptLineId: z.string().min(1), receiptId: z.string().min(1), quantity: decimalString,
  invoiceNet: decimalString, receiptCost: decimalString, priorQuantity: decimalString, priorCost: decimalString,
  receiptBatchId: z.string().min(1).nullable(), receiptJournalId: z.string().min(1).nullable(), receiptEvidenceHash: z.string().regex(/^[a-f0-9]{64}$/),
  accountingStatus: z.enum(["POSTED", "NOT_REQUIRED"]).optional(),
  costAllocation: receiptCostAllocationSchema.optional(),
}).strict()
const residualSourceSchema = z.object({
  receiptLineId: z.string().min(1), receiptId: z.string().min(1), quantity: decimalString, invoiceNet: decimalString,
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/), evidenceHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()
const recognitionSchema = z.object({
  version: z.union([z.literal(1), z.literal(2), z.literal(3)]), organizationId: z.string().min(1), supplierId: z.string().min(1), invoiceId: z.string().min(1),
  currency: z.string().min(1), invoiceSourceHash: z.string().regex(/^[a-f0-9]{64}$/), allocations: z.array(allocationSchema),
  residualSources: z.array(residualSourceSchema).optional(),
  returnAllocationHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict().superRefine((proof, ctx) => {
  const valid = proof.version === 3
    ? !!proof.residualSources && proof.allocations.length + proof.residualSources.length > 0 && proof.allocations.every(allocation =>
      allocation.accountingStatus === "POSTED" ? !!allocation.receiptBatchId && !!allocation.receiptJournalId :
        allocation.accountingStatus === "NOT_REQUIRED" && allocation.receiptBatchId === null && allocation.receiptJournalId === null && money(allocation.receiptCost).eq(0) && !!allocation.costAllocation && money(allocation.costAllocation.sourceValue).eq(0))
    : proof.allocations.length > 0 && proof.residualSources === undefined && proof.allocations.every(allocation => allocation.accountingStatus === undefined && !!allocation.receiptBatchId && !!allocation.receiptJournalId)
  if (!valid) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Receipt recognition version and accounting evidence disagree." })
})
export type InvoiceReceiptRecognition = z.infer<typeof recognitionSchema>
export type InvoiceReceiptRecognitionInput = {
  organizationId: string; supplierId: string; invoiceId: string; currency: string
  subtotal: Prisma.Decimal.Value; total: Prisma.Decimal.Value; taxAmount: Prisma.Decimal.Value
  lines: Array<{ goodsReceiptLineId: string | null; quantity: Prisma.Decimal.Value; unitCost: Prisma.Decimal.Value }>
  // Presence of this property means recovery, including an absent legacy proof.
  retainedRecognition?: unknown
}
export type InvoiceReceiptRecognitionResult = {
  amounts: { sourceAmount: Prisma.Decimal; netAmount: Prisma.Decimal; grossAmount: Prisma.Decimal; taxAmount: Prisma.Decimal; costAmount: Prisma.Decimal; varianceAmount?: Prisma.Decimal }
  conditionContext?: Record<string, unknown>
  recognition?: InvoiceReceiptRecognition
}

function sourceHash(input: InvoiceReceiptRecognitionInput) {
  return hashBusinessPayload({ organizationId: input.organizationId, supplierId: input.supplierId, invoiceId: input.invoiceId, currency: input.currency,
    subtotal: money(input.subtotal).toFixed(2), total: money(input.total).toFixed(2), taxAmount: money(input.taxAmount).toFixed(2),
    lines: input.lines.map(line => ({ receiptLineId: line.goodsReceiptLineId, quantity: quantity(line.quantity).toFixed(3), unitCost: money(line.unitCost).toFixed(2) }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  })
}
export function readInvoiceReceiptRecognition(value: unknown, input: InvoiceReceiptRecognitionInput) {
  const parsed = recognitionSchema.safeParse(value)
  if (!parsed.success) throw review("Receipt allocation evidence is missing or invalid.")
  const proof = parsed.data
  if (proof.organizationId !== input.organizationId || proof.supplierId !== input.supplierId || proof.invoiceId !== input.invoiceId || proof.currency !== input.currency || proof.invoiceSourceHash !== sourceHash(input) || new Set(proof.allocations.map(a => a.receiptLineId)).size !== proof.allocations.length) throw review("Receipt allocation evidence does not match the invoice.")
  for (const allocation of proof.allocations) {
    const lines = input.lines.filter(line => line.goodsReceiptLineId === allocation.receiptLineId)
    const allocatedQuantity = lines.reduce((sum, line) => sum.plus(quantity(line.quantity)), new Prisma.Decimal(0))
    const allocatedNet = lines.reduce((sum, line) => sum.plus(money(quantity(line.quantity).times(money(line.unitCost)))), new Prisma.Decimal(0))
    if (!lines.length || !allocatedQuantity.eq(allocation.quantity) || !allocatedNet.eq(allocation.invoiceNet)) throw review("Receipt allocation does not cover its exact invoice lines.")
    if (allocation.costAllocation && (proof.version === 1 || allocation.costAllocation.quantity !== quantity(allocation.quantity).toFixed(3) || allocation.costAllocation.allocatedValue !== money(allocation.receiptCost).toFixed(2))) throw review("Receipt allocation policy does not match its retained cost.")
  }
  if (proof.version === 3) {
    const covered = [...proof.allocations, ...proof.residualSources!]
    const ids = new Set(covered.map(line => line.receiptLineId))
    if (ids.size !== covered.length || input.lines.some(line => !line.goodsReceiptLineId || !ids.has(line.goodsReceiptLineId))) throw review("Retained receipt treatment does not cover the complete invoice.")
    for (const residual of proof.residualSources!) {
      const lines = input.lines.filter(line => line.goodsReceiptLineId === residual.receiptLineId)
      const q = lines.reduce((sum, line) => sum.plus(quantity(line.quantity)), new Prisma.Decimal(0))
      const net = lines.reduce((sum, line) => sum.plus(money(quantity(line.quantity).times(money(line.unitCost)))), new Prisma.Decimal(0))
      if (!lines.length || q.lte(0) || !q.eq(residual.quantity) || !net.eq(residual.invoiceNet)) throw review("Retained non-stock treatment does not match its invoice lines.")
    }
  }
  return proof
}
const stockLineSchema = z.object({ itemId: z.string(), locationId: z.string(), quantity: z.string(), unitCost: z.string(), movementType: z.literal("PURCHASE_RECEIPT"), referenceType: z.literal("GOODS_RECEIPT"), referenceId: z.string(), batchNumber: z.string().nullable(), serialNumbers: z.array(z.string()), expiryDate: z.string().nullable() })
function stockSignatures(lines: z.infer<typeof stockLineSchema>[]) {
  return lines.map(line => hashBusinessPayload({ ...line, quantity: quantity(line.quantity).toString(), unitCost: money(line.unitCost).toString(), serialNumbers: [...line.serialNumbers].sort() })).sort()
}
const postingSelect = {
  ...receiptPostingEvidenceSelect,
  journalEntries: { orderBy: { id: "asc" as const }, select: { ...receiptPostingEvidenceSelect.journalEntries.select,
    lines: { orderBy: { lineNumber: "asc" as const }, select: { ...receiptPostingEvidenceSelect.journalEntries.select.lines.select, id: true, accountId: true, lineNumber: true } },
  } },
} satisfies Prisma.LedgerPostingBatchSelect

/** The caller owns approval and liability effects. This resolver only reads and
 * locks source evidence. Legacy requests retain their original posting hash. */
export async function resolveInvoiceReceiptRecognition(tx: Prisma.TransactionClient, input: InvoiceReceiptRecognitionInput): Promise<InvoiceReceiptRecognitionResult> {
  const subtotal = money(input.subtotal), total = money(input.total), taxAmount = money(input.taxAmount)
  const legacy: InvoiceReceiptRecognitionResult = { amounts: { sourceAmount: total, netAmount: subtotal, grossAmount: total, taxAmount, costAmount: subtotal } }
  const recovering = Object.prototype.hasOwnProperty.call(input, "retainedRecognition")
  const ids = [...new Set(input.lines.flatMap(line => line.goodsReceiptLineId ? [line.goodsReceiptLineId] : []))].sort()
  if (!ids.length) {
    if (input.retainedRecognition != null) throw review("Retained receipt allocation has no invoice receipt source.")
    return legacy
  }
  // Same supplier-first ordering as invoice preparation, approval and recovery.
  await tx.$queryRaw`SELECT id FROM suppliers WHERE id = ${input.supplierId} AND "organizationId" = ${input.organizationId} FOR UPDATE`
  await tx.$queryRaw(Prisma.sql`SELECT r.id FROM goods_receipt_lines l JOIN goods_receipts r ON r.id = l."goodsReceiptId" WHERE l.id IN (${Prisma.join(ids)}) AND r."organizationId" = ${input.organizationId} ORDER BY r.id, l.id FOR SHARE OF r, l`)
  const sources = await tx.goodsReceiptLine.findMany({ where: { id: { in: ids }, goodsReceipt: { organizationId: input.organizationId } }, include: {
    goodsReceipt: { include: { lines: { orderBy: { id: "asc" } }, purchaseOrder: { select: { organizationId: true, supplierId: true, deletedAt: true } } } },
    purchaseOrderLine: { select: { purchaseOrderId: true, itemId: true } },
  }, orderBy: { id: "asc" } })
  if (sources.length !== ids.length || sources.some(line => line.goodsReceipt.deletedAt || line.goodsReceipt.purchaseOrder.organizationId !== input.organizationId || line.goodsReceipt.purchaseOrder.supplierId !== input.supplierId || line.goodsReceipt.purchaseOrder.deletedAt || line.purchaseOrderLine.purchaseOrderId !== line.goodsReceipt.purchaseOrderId || line.purchaseOrderLine.itemId !== line.itemId)) throw review("Invoice receipt sources are missing or outside this supplier and organization.")
  const receipts = [...new Map(sources.map(line => [line.goodsReceiptId, line.goodsReceipt])).values()]
  const receiptIds = receipts.map(receipt => receipt.id)
  await tx.$queryRaw(Prisma.sql`SELECT id FROM ledger_posting_batches WHERE "organizationId" = ${input.organizationId} AND "sourceType" = 'GOODS_RECEIPT' AND "sourceId" IN (${Prisma.join(receiptIds)}) ORDER BY id FOR SHARE`)
  await tx.$queryRaw(Prisma.sql`SELECT id FROM journal_entries WHERE "organizationId" = ${input.organizationId} AND "sourceType" = 'GOODS_RECEIPT' AND "sourceId" IN (${Prisma.join(receiptIds)}) ORDER BY id FOR SHARE`)
  const batches = await tx.ledgerPostingBatch.findMany({ where: { organizationId: input.organizationId, sourceType: "GOODS_RECEIPT", sourceId: { in: receiptIds } }, select: postingSelect, orderBy: { id: "asc" } })
  const journals = await tx.journalEntry.findMany({ where: { organizationId: input.organizationId, sourceType: "GOODS_RECEIPT", sourceId: { in: receiptIds } }, select: { id: true, sourceId: true, postingBatchId: true }, orderBy: { id: "asc" } })
  const links = await tx.accountingSourceLink.findMany({ where: { organizationId: input.organizationId, sourceType: "GOODS_RECEIPT", sourceId: { in: receiptIds } }, select: { id: true, sourceId: true, postingBatchId: true, journalEntryId: true }, orderBy: { id: "asc" } })
  const recognized = new Map<string, { batchId: string | null; journalId: string | null; evidenceHash: string; accountingStatus: "POSTED" | "NOT_REQUIRED" }>()
  const markedSources = new Map<string, ReceiptRecognitionSource>()
  for (const receipt of receipts) {
    const source = await readReceiptRecognitionSource(tx, input.organizationId, receipt.id)
    if (source) {
      markedSources.set(receipt.id, source)
      if (source.manifest.supplierId !== input.supplierId || source.manifest.currency !== input.currency) throw review("Receipt recognition currency or supplier does not match this invoice.")
      const evidence = await readReceiptRecognitionEvidence(tx, source)
      if (!evidence.stockVerified || !evidence.evidenceHash || (evidence.accountingStatus !== "POSTED" && evidence.accountingStatus !== "NOT_REQUIRED") ||
        (evidence.accountingStatus === "POSTED" ? !evidence.batchId || !evidence.journalId : !source.inventoryValue.eq(0) || evidence.batchId !== null || evidence.journalId !== null)) throw review(`Receipt ${receipt.receiptNumber} requires its original inventory recognition before invoicing.`)
      recognized.set(receipt.id, { batchId: evidence.batchId, journalId: evidence.journalId, evidenceHash: evidence.evidenceHash, accountingStatus: evidence.accountingStatus })
      continue
    }
    const ledger = batches.filter(batch => batch.sourceId === receipt.id), entries = journals.filter(entry => entry.sourceId === receipt.id), sourceLinks = links.filter(link => link.sourceId === receipt.id)
    if (!ledger.length && !entries.length && !sourceLinks.length) continue
    if (ledger.length === 1 && ledger[0].postingPurpose === "GOODS_RECEIPT" && ledger[0].status === "FAILED" && !ledger[0].postedAt && !ledger[0].reversedAt && !ledger[0].journalEntries.length && !ledger[0].sourceLinks.length && !entries.length && !sourceLinks.length) continue
    if (ledger.length !== 1 || entries.length !== 1 || sourceLinks.length !== 1 || entries[0].postingBatchId !== ledger[0].id || sourceLinks[0].postingBatchId !== ledger[0].id || sourceLinks[0].journalEntryId !== entries[0].id || !["RECEIVED", "COMPLETED"].includes(receipt.status) || !receipt.inventoryPostedAt) throw review(`Receipt ${receipt.receiptNumber} has incomplete, reversed or ambiguous accounting effects.`)
    const events = await tx.businessEvent.findMany({ where: { organizationId: input.organizationId, sourceType: "GOODS_RECEIPT", sourceId: receipt.id, eventType: "purchase.goods_receipt.stock_posted" }, orderBy: { id: "asc" } })
    const movements = await tx.inventoryTransaction.findMany({ where: { organizationId: input.organizationId, referenceType: "GOODS_RECEIPT", referenceId: receipt.id }, select: { itemId: true, locationId: true, quantity: true, unitCost: true, type: true, referenceId: true, batchNumber: true, serialNumbers: true, expiryDate: true } })
    let stockVerified = false
    try {
      const expected = stockSignatures(receipt.lines.map(line => ({ itemId: line.itemId, locationId: receipt.locationId, quantity: line.receivedQuantity.toString(), unitCost: line.unitCost.toString(), movementType: "PURCHASE_RECEIPT", referenceType: "GOODS_RECEIPT", referenceId: receipt.id, batchNumber: line.batchNumber, serialNumbers: line.serialNumbers, expiryDate: line.expiryDate?.toISOString() ?? null })))
      const actual = stockSignatures(movements.map(m => stockLineSchema.parse({ ...m, quantity: m.quantity.toString(), unitCost: m.unitCost.toString(), movementType: m.type, referenceType: "GOODS_RECEIPT", expiryDate: m.expiryDate?.toISOString() ?? null })))
      const recorded = stockSignatures(events.flatMap(event => {
        const payload = record(event.payload)
        if (event.eventSource !== "INTERNAL" || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.payloadHash !== hashBusinessPayload(event.payload) || payload.sourceId !== receipt.id || payload.sourceType !== "GOODS_RECEIPT" || payload.eventType !== "purchase.goods_receipt.stock_posted" || !event.documentHash || payload.documentHash !== event.documentHash) throw review("Stock event evidence changed.")
        return z.array(stockLineSchema).parse(payload.lines)
      }))
      stockVerified = expected.length > 0 && hashBusinessPayload(expected) === hashBusinessPayload(actual) && hashBusinessPayload(expected) === hashBusinessPayload(recorded)
    } catch { stockVerified = false }
    const value = receipt.lines.reduce((sum, line) => sum.plus(money(line.receivedQuantity.times(line.unitCost))), new Prisma.Decimal(0))
    if (!stockVerified || !hasVerifiedReceiptPosting({ organizationId: input.organizationId, receiptId: receipt.id, receiptNumber: receipt.receiptNumber, receiptDate: receipt.receiptDate, documentHashes: events.flatMap(event => event.documentHash ? [event.documentHash] : []), currency: input.currency, value, batches: ledger })) throw review(`Receipt ${receipt.receiptNumber} does not have verified stock and inventory recognition.`)
    const journal = ledger[0].journalEntries[0]
    const grniCredit = journal.lines.filter(line => line.account.mappingKey === "GRNI").reduce((sum, line) => sum.plus(line.credit).minus(line.debit), new Prisma.Decimal(0))
    if (!grniCredit.eq(value) || journal.lines.some(line => line.account.mappingKey !== "INVENTORY" && line.account.mappingKey !== "GRNI" && (line.debit.gt(0) || line.credit.gt(0))) || journal.lines.some(line => line.account.mappingKey === "GRNI" && line.debit.gt(0))) throw review(`Receipt ${receipt.receiptNumber} does not identify the complete goods-received accrual.`)
    const evidenceHash = hashBusinessPayload(JSON.parse(JSON.stringify({ receipt: { id: receipt.id, receiptNumber: receipt.receiptNumber, receiptDate: receipt.receiptDate, locationId: receipt.locationId, lines: receipt.lines }, batch: ledger[0], events: events.map(event => ({ id: event.id, payloadHash: event.payloadHash, documentHash: event.documentHash })), movementSignatures: stockSignatures(movements.map(m => stockLineSchema.parse({ ...m, quantity: m.quantity.toString(), unitCost: m.unitCost.toString(), movementType: m.type, referenceType: "GOODS_RECEIPT", expiryDate: m.expiryDate?.toISOString() ?? null }))) })))
    recognized.set(receipt.id, { batchId: ledger[0].id, journalId: journal.id, evidenceHash, accountingStatus: "POSTED" })
  }
  if (!recognized.size) {
    if (input.retainedRecognition != null) throw review("Previously recognized receipt accounting is no longer verified.")
    return legacy
  }
  const invoiceNet = input.lines.reduce((sum, line) => sum.plus(money(quantity(line.quantity).times(money(line.unitCost)))), new Prisma.Decimal(0))
  if (input.lines.some(line => quantity(line.quantity).lte(0) || money(line.unitCost).lt(0)) || !invoiceNet.eq(subtotal) || taxAmount.lt(0) || !subtotal.plus(taxAmount).eq(total)) throw review("Invoice quantities or totals do not match the receipt allocation source.")
  const isRecognizedLine = (receiptId: string, lineId: string) => recognized.has(receiptId) && (!markedSources.has(receiptId) || markedSources.get(receiptId)!.manifest.lines.some(line => line.receiptLineId === lineId && line.stockTracked))
  const recognizedLines = sources.filter(line => isRecognizedLine(line.goodsReceiptId, line.id)), recognizedIds = recognizedLines.map(line => line.id)
  const nonStockLines = sources.filter(line => markedSources.get(line.goodsReceiptId)?.manifest.lines.some(original => original.receiptLineId === line.id && !original.stockTracked))
  const requiresSourceTreatment = nonStockLines.length > 0 || recognizedLines.some(line => recognized.get(line.goodsReceiptId)!.accountingStatus === "NOT_REQUIRED")
  const classifiedIds = new Set([...recognizedIds, ...nonStockLines.map(line => line.id)])
  if (requiresSourceTreatment && input.lines.some(line => !line.goodsReceiptLineId || !classifiedIds.has(line.goodsReceiptLineId))) throw review("Separate non-stock or zero-value receipt treatment from unverified legacy invoice amounts.")
  if (!recognizedLines.length && !nonStockLines.length) {
    if (input.retainedRecognition != null) throw review("The retained recognized inventory allocation is unavailable.")
    return legacy
  }
  const legacyRecognizedIds = recognizedLines.filter(line => !markedSources.has(line.goodsReceiptId)).map(line => line.id)
  const returned = legacyRecognizedIds.length ? await tx.purchaseReturnLine.findFirst({ where: { organizationId: input.organizationId, sourceGoodsReceiptLineId: { in: legacyRecognizedIds } }, select: { id: true } }) : null
  if (returned) throw review("A receipt return or its reversal requires a source-owned accrual allocation review.")
  const returnedAllocations = new Map<string, Awaited<ReturnType<typeof readReceiptReturnAllocations>>>()
  for (const [receiptId, source] of markedSources) if (recognized.has(receiptId)) returnedAllocations.set(receiptId, await readReceiptReturnAllocations(tx, source))
  const grouped = new Map<string, { quantity: Prisma.Decimal; net: Prisma.Decimal }>()
  for (const line of input.lines) {
    if (!line.goodsReceiptLineId) continue
    const current = grouped.get(line.goodsReceiptLineId) ?? { quantity: new Prisma.Decimal(0), net: new Prisma.Decimal(0) }
    grouped.set(line.goodsReceiptLineId, { quantity: current.quantity.plus(quantity(line.quantity)), net: current.net.plus(money(quantity(line.quantity).times(money(line.unitCost)))) })
  }
  const retained = recovering ? readInvoiceReceiptRecognition(input.retainedRecognition, input) : null
  if (retained && (retained.version === 3) !== requiresSourceTreatment) throw review("The retained invoice uses a different receipt treatment. Its accounting requires source review rather than automatic conversion.")
  if (retained && (retained.allocations.length !== recognizedLines.length || retained.allocations.some(a => !recognizedIds.includes(a.receiptLineId)))) throw review("The retained receipt recognition set changed.")
  const residualSources = nonStockLines.map(line => {
    const source = markedSources.get(line.goodsReceiptId)!, evidence = recognized.get(line.goodsReceiptId)!, requested = grouped.get(line.id)!
    if (!requested || requested.quantity.lte(0) || requested.quantity.gt(line.receivedQuantity)) throw review("Non-stock invoice quantity exceeds its accepted receipt source.")
    return { receiptLineId: line.id, receiptId: line.goodsReceiptId, quantity: requested.quantity.toFixed(3), invoiceNet: money(requested.net).toFixed(2), sourceHash: source.sourceHash, evidenceHash: evidence.evidenceHash }
  }).sort((a, b) => a.receiptLineId.localeCompare(b.receiptLineId))
  if (retained?.version === 3 && hashBusinessPayload(retained.residualSources) !== hashBusinessPayload(residualSources)) throw review("The retained non-stock receipt source or accounting evidence changed.")
  // A whole-receipt journal also covers receipt lines absent from this invoice.
  // Detect incompatible legacy recognition on any of those lines before cutover.
  const recognizedReceiptLineIds = receipts.flatMap(receipt => receipt.lines.filter(line => isRecognizedLine(receipt.id, line.id)).map(line => line.id))
  const previous = retained ? [] : await tx.supplierInvoice.findMany({ where: { organizationId: input.organizationId, supplierId: input.supplierId, id: { not: input.invoiceId }, lines: { some: { goodsReceiptLineId: { in: recognizedReceiptLineIds } } }, OR: [{ status: { in: ["POSTED", "PAYMENT_PENDING", "PAID"] } }, { approvedById: { not: null } }, { postedAt: { not: null } }, { ledgerPostingBatchId: { not: null } }] }, include: { lines: true }, orderBy: { id: "asc" } })
  const priorAllocations: InvoiceReceiptRecognition["allocations"] = []
  for (const invoice of previous) {
    if (invoice.deletedAt || invoice.currency !== input.currency || !["POSTED", "PAYMENT_PENDING", "PAID"].includes(invoice.status) || !invoice.createdById || !invoice.approvedById || invoice.createdById === invoice.approvedById || !invoice.postedAt || !invoice.postedBusinessEventId) throw review("An earlier invoice has unresolved approval or reversal effects.")
    const proof = readInvoiceReceiptRecognition(record(invoice.metadata).receiptRecognition, { ...input, invoiceId: invoice.id, subtotal: invoice.subtotal, total: invoice.total, taxAmount: invoice.taxAmount, currency: invoice.currency, lines: invoice.lines })
    for (const receiptLineId of recognizedReceiptLineIds) {
      const invoiceLines = invoice.lines.filter(line => line.goodsReceiptLineId === receiptLineId)
      if (!invoiceLines.length) continue
      const allocated = proof.allocations.find(a => a.receiptLineId === receiptLineId)
      const priorQuantity = invoiceLines.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0))
      const priorNet = invoiceLines.reduce((sum, line) => sum.plus(money(line.quantity.times(line.unitCost))), new Prisma.Decimal(0))
      if (!allocated || !quantity(allocated.quantity).eq(priorQuantity) || !money(allocated.invoiceNet).eq(priorNet)) throw review("An earlier invoice is missing its complete receipt allocation.")
    }
    const event = await tx.businessEvent.findFirst({ where: { id: invoice.postedBusinessEventId, organizationId: input.organizationId } })
    if (!event || event.eventType !== "purchase.supplier_invoice.posted" || event.eventSource !== "INTERNAL" || event.schemaVersion !== 1 || event.status !== "APPLIED" || !event.processedAt || event.sourceType !== "SUPPLIER_INVOICE" || event.sourceId !== invoice.id || event.actorId !== invoice.approvedById || event.occurredAt.getTime() !== invoice.postedAt.getTime() || event.postingBatchId !== invoice.ledgerPostingBatchId || event.payloadHash !== hashBusinessPayload(event.payload) || record(event.payload).receiptRecognitionHash !== hashBusinessPayload(proof)) throw review("An earlier receipt allocation has no verified approval evidence.")
    const reversed = await tx.journalEntry.findFirst({ where: { organizationId: input.organizationId, sourceType: "SUPPLIER_INVOICE", sourceId: invoice.id, OR: [{ status: "REVERSED" }, { reversedAt: { not: null } }, { reversedByEntries: { some: {} } }] }, select: { id: true } })
    if (reversed) throw review("An earlier invoice journal was reversed without a verified receipt allocation release.")
    priorAllocations.push(...proof.allocations.filter(a => recognizedIds.includes(a.receiptLineId)))
  }
  const allocations: InvoiceReceiptRecognition["allocations"] = []
  for (const line of recognizedLines) {
    const proof = recognized.get(line.goodsReceiptId)!, requested = grouped.get(line.id)!
    let priorQuantity = new Prisma.Decimal(0), priorCost = new Prisma.Decimal(0)
    const previousForLine = priorAllocations.filter(a => a.receiptLineId === line.id).sort((a, b) => new Prisma.Decimal(a.priorQuantity).cmp(b.priorQuantity))
    for (const previous of previousForLine) {
      if (previous.receiptId !== line.goodsReceiptId || previous.receiptBatchId !== proof.batchId || previous.receiptJournalId !== proof.journalId || previous.receiptEvidenceHash !== proof.evidenceHash || previous.accountingStatus !== undefined && previous.accountingStatus !== proof.accountingStatus || !quantity(previous.priorQuantity).eq(priorQuantity) || !money(previous.priorCost).eq(priorCost) || quantity(previous.quantity).lte(0) || (!markedSources.has(line.goodsReceiptId) && !money(previous.receiptCost).eq(money(priorQuantity.plus(previous.quantity).times(line.unitCost)).minus(priorCost)))) throw review("Earlier receipt allocations overlap or disagree with receipt recognition.")
      priorQuantity = priorQuantity.plus(previous.quantity); priorCost = priorCost.plus(previous.receiptCost)
      const original = markedSources.get(line.goodsReceiptId)?.manifest.lines.find(value => value.receiptLineId === line.id)
      if (previous.costAllocation && (!original || previous.costAllocation.sourceQuantity !== original.quantity || previous.costAllocation.sourceValue !== original.value)) throw review("Earlier allocation has a different receipt quantity or value.")
    }
    const frozen = retained?.allocations.find(a => a.receiptLineId === line.id)
    if (frozen) { priorQuantity = quantity(frozen.priorQuantity); priorCost = money(frozen.priorCost) }
    const returned = returnedAllocations.get(line.goodsReceiptId)?.lines.get(line.id), marked = markedSources.get(line.goodsReceiptId)
    const remainingQuantity = line.receivedQuantity.minus(returned?.uninvoicedQuantity ?? 0), remainingValue = line.lineTotal.minus(returned?.grniAmount ?? 0)
    if (requested.quantity.lte(0) || priorQuantity.plus(requested.quantity).gt(remainingQuantity) || (!marked && !priorCost.eq(money(priorQuantity.times(line.unitCost)))) || priorCost.lt(0) || priorCost.gt(remainingValue)) throw review("Invoice allocation exceeds the recognized receipt quantity or cost.")
    const original = marked?.manifest.lines.find(value => value.receiptLineId === line.id)
    const costAllocation = frozen?.costAllocation ?? (marked && !retained ? allocateReceiptCost({ sourceQuantity: original!.quantity, sourceValue: original!.value, consumedQuantity: priorQuantity.plus(returned?.uninvoicedQuantity ?? 0), consumedValue: priorCost.plus(returned?.grniAmount ?? 0), quantity: requested.quantity }) : undefined)
    const receiptCost = costAllocation ? money(costAllocation.allocatedValue) : marked && priorQuantity.plus(requested.quantity).eq(remainingQuantity) ? remainingValue.minus(priorCost) : money(priorQuantity.plus(requested.quantity).times(line.unitCost)).minus(priorCost)
    if (costAllocation && (!original || costAllocation.sourceQuantity !== original.quantity || costAllocation.sourceValue !== original.value || costAllocation.quantity !== requested.quantity.toFixed(3))) throw review("Retained receipt cost policy no longer matches its source.")
    if (receiptCost.lt(0) || priorCost.plus(receiptCost).gt(remainingValue)) throw review("Invoice cost exceeds the unallocated receipt accrual.")
    const allocation = { receiptLineId: line.id, receiptId: line.goodsReceiptId, quantity: requested.quantity.toFixed(3), invoiceNet: money(requested.net).toFixed(2), receiptCost: receiptCost.toFixed(2), priorQuantity: priorQuantity.toFixed(3), priorCost: priorCost.toFixed(2), receiptBatchId: proof.batchId, receiptJournalId: proof.journalId, receiptEvidenceHash: proof.evidenceHash, ...(requiresSourceTreatment ? { accountingStatus: proof.accountingStatus } : {}), ...(costAllocation ? { costAllocation } : {}) }
    if (frozen && hashBusinessPayload(frozen) !== hashBusinessPayload(allocation)) throw review("Retained receipt allocation no longer matches source and accounting evidence.")
    allocations.push(allocation)
  }
  const recognition: InvoiceReceiptRecognition = retained ?? { version: requiresSourceTreatment ? 3 : allocations.some(a => a.costAllocation) ? 2 : 1, organizationId: input.organizationId, supplierId: input.supplierId, invoiceId: input.invoiceId, currency: input.currency, invoiceSourceHash: sourceHash(input), allocations, ...(requiresSourceTreatment ? { residualSources } : {}), ...(returnedAllocations.size ? { returnAllocationHash: hashBusinessPayload([...returnedAllocations].map(([receiptId, value]) => ({ receiptId, evidenceHash: value.evidenceHash })).sort((a, b) => a.receiptId.localeCompare(b.receiptId))) } : {}) }
  const recognizedNet = allocations.reduce((sum, a) => sum.plus(a.invoiceNet), new Prisma.Decimal(0)), recognizedCost = allocations.reduce((sum, a) => sum.plus(a.receiptCost), new Prisma.Decimal(0)), variance = recognizedNet.minus(recognizedCost)
  if (recognizedNet.gt(subtotal)) throw review("Recognized invoice lines exceed the invoice subtotal.")
  return { amounts: { sourceAmount: subtotal.minus(recognizedNet), netAmount: subtotal, grossAmount: total, taxAmount, costAmount: recognizedCost, varianceAmount: variance.abs() }, conditionContext: { receiptRecognition: "ACCRUAL", receiptVarianceDirection: variance.gt(0) ? "DEBIT" : variance.lt(0) ? "CREDIT" : "NONE", receiptRecognitionHash: hashBusinessPayload(recognition), ...(nonStockLines.length ? { receiptResidualTreatment: "NON_STOCK" } : {}) }, recognition }
}
