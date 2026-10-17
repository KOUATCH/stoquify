import { randomUUID } from "crypto"
import {
  AccountingSourceType,
  GoodsReceiptStatus,
  LedgerEntryType,
  Prisma,
  PurchaseCorrectionDirection,
  SupplierInvoiceStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { postPurchaseReturnStock } from "@/services/inventory/inventory-stock-event.service"
import {
  allocatePurchaseDocumentNumber,
  PURCHASE_DOCUMENT_TYPE,
} from "@/services/purchase-order/purchase-document-number.service"
import { postPurchaseCorrectionLedgerInTx, type APPostingStatus } from "./ap-control.service"
import { preparePurchaseCorrectionReversalInTx, recordPurchaseCorrectionReversalCloseInvalidationsInTx, reversePurchaseCorrectionLedgerInTx } from "./purchase-correction-ledger.service"
import { refreshSupplierInvoiceBalanceStatus } from "./supplier-payment-balance"
import { assertPurchaseReturnClaimFunding, readPurchaseReturnAccountingEvidence, recordReceiptReturnRecognition, recordReceiptReturnResolution, resolveReceiptReturnRecognition, retainReturnReversalRecognition, validateReceiptReturnStockForRecognition } from "./receipt-return-recognition"
import { readReceiptRecognitionSource } from "@/services/purchase-order/receipt-recognition-source"
import { allocateReceiptCost } from "@/services/inventory/receipt-cost-allocation"
import { creditProofSchema, readSupplierCreditAllocationProof } from "./supplier-credit-allocation"
import { lockJournalReversalCatalogInTx } from "@/services/accounting/journal-reversal-order.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { readInvoiceReceiptRecognition } from "./invoice-receipt-recognition"
import {
  postPurchaseReturnInputSchema,
  postSupplierCreditNoteInputSchema,
  reversePurchaseReturnInputSchema,
  reverseSupplierCreditNoteInputSchema,
  type PostPurchaseReturnInput,
  type PostSupplierCreditNoteInput,
  type ReversePurchaseReturnInput,
  type ReverseSupplierCreditNoteInput,
} from "./purchase-return-credit.schemas"

type DbClient = typeof db | Prisma.TransactionClient
export type PurchaseReturnPostingOutcome = APPostingStatus | { ledgerStatus: "NOT_REQUIRED"; ledgerBatch: null; journalEntryId: null; accountingSourceLinkId: null }
export type SupplierCreditPostingOutcome = PurchaseReturnPostingOutcome
const noValuePosting = (): PurchaseReturnPostingOutcome => ({ ledgerStatus: "NOT_REQUIRED", ledgerBatch: null, journalEntryId: null, accountingSourceLinkId: null })
async function assertNoMonetaryEffects(tx: Prisma.TransactionClient, organizationId: string, sourceType: "PURCHASE_RETURN" | "SUPPLIER_CREDIT_NOTE", sourceId: string) {
  const where = { organizationId, sourceType, sourceId }
  if (await tx.ledgerPostingBatch.count({ where }) || await tx.journalEntry.count({ where }) || await tx.accountingSourceLink.count({ where })) throw new BusinessRuleError("Zero-value correction has unexpected accounting effects.", "INVOICE_EVIDENCE_REQUIRED")
}

function hasTransaction(client: DbClient): client is typeof db {
  return typeof (client as typeof db).$transaction === "function"
}

function inTransaction<T>(client: DbClient, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return hasTransaction(client) ? client.$transaction(work, { maxWait: 10_000, timeout: 20_000 }) : work(client as Prisma.TransactionClient)
}

export type PurchaseCorrectionReversalControl = { assertCurrentAuthority?: () => Promise<void> }

function inReversalTransaction<T>(client: DbClient, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return hasTransaction(client)
    ? client.$transaction(work, { maxWait: 10_000, timeout: 20_000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
    : work(client as Prisma.TransactionClient)
}

function quantity(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(3)
}

function money(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`
}

function normalizeDocumentNumber(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase()
}

function parseDate(value: Date | string | undefined) {
  const parsed = value instanceof Date ? value : value ? new Date(value) : new Date()
  if (Number.isNaN(parsed.getTime())) throw new BusinessRuleError("Correction date is invalid.")
  return parsed
}

function assertDistinct(values: string[], message: string) {
  if (new Set(values).size !== values.length) throw new BusinessRuleError(message)
}

function assertReplay(existing: { payloadHash: string }, payloadHash: string) {
  if (existing.payloadHash !== payloadHash) {
    throw new ConflictError("Idempotency key was already used with a different purchase correction payload.")
  }
}

const objectRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
async function assertApprovedCreditPriceSource(
  tx: Prisma.TransactionClient,
  sourceReturn: Prisma.PurchaseReturnGetPayload<{ include: { lines: true } }>,
  invoice: Prisma.SupplierInvoiceGetPayload<{ include: { lines: true } }>,
) {
  const review = () => new BusinessRuleError("Supplier credit price differs from its receipt. Verify the original invoice approval and the return's retained invoice allocation before crediting that price.", "INVOICE_EVIDENCE_REQUIRED")
  if (!invoice.createdById || !invoice.approvedById || invoice.createdById === invoice.approvedById || !invoice.postedAt || !invoice.postedBusinessEventId || !invoice.ledgerPostingBatchId || invoice.organizationId !== sourceReturn.organizationId || invoice.supplierId !== sourceReturn.supplierId || !invoice.discount.eq(0)) throw review()
  const recognition = readInvoiceReceiptRecognition(objectRecord(invoice.metadata).receiptRecognition, {
    organizationId: sourceReturn.organizationId, supplierId: sourceReturn.supplierId, invoiceId: invoice.id, currency: invoice.currency,
    subtotal: invoice.subtotal, total: invoice.total, taxAmount: invoice.taxAmount, lines: invoice.lines,
  })
  const recognitionHash = hashBusinessPayload(recognition), effective = await readPurchaseReturnAccountingEvidence(tx, sourceReturn)
  const retained = effective.recognition?.invoiceProofs.filter(proof => proof.invoiceId === invoice.id) ?? []
  if (!effective.accountingComplete || effective.recognition?.status !== "VERIFIED" || retained.length !== 1 || retained[0].sourceHash !== recognition.invoiceSourceHash || retained[0].recognitionHash !== recognitionHash) throw review()
  const subtotal = invoice.lines.reduce((sum, line) => sum.plus(money(line.quantity.times(line.unitCost))), new Prisma.Decimal(0))
  const tax = invoice.lines.reduce((sum, line) => sum.plus(line.taxAmount), new Prisma.Decimal(0))
  if (!subtotal.eq(invoice.subtotal) || !tax.eq(invoice.taxAmount) || !subtotal.plus(tax).eq(invoice.total) || invoice.lines.some(line => line.organizationId !== invoice.organizationId || line.supplierInvoiceId !== invoice.id || !money(line.quantity.times(line.unitCost)).plus(line.taxAmount).eq(line.lineTotal))) throw review()
  const approval = await tx.businessEvent.findFirst({ where: { id: invoice.postedBusinessEventId, organizationId: sourceReturn.organizationId } }), payload = objectRecord(approval?.payload)
  const documentHash = invoice.documentHash ?? `sha256:${hashBusinessPayload({ invoiceId: invoice.id, supplierId: invoice.supplierId, invoiceNumber: invoice.invoiceNumber, total: invoice.total.toFixed(2), currency: invoice.currency })}`
  if (!approval || approval.eventType !== "purchase.supplier_invoice.posted" || approval.eventSource !== "INTERNAL" || approval.schemaVersion !== 1 || approval.status !== "APPLIED" || !approval.processedAt || approval.payloadHash !== hashBusinessPayload(approval.payload) || approval.sourceType !== "SUPPLIER_INVOICE" || approval.sourceId !== invoice.id || approval.actorId !== invoice.approvedById || approval.postingBatchId !== invoice.ledgerPostingBatchId || approval.occurredAt.getTime() !== invoice.postedAt.getTime() || approval.documentHash !== documentHash || payload.invoiceId !== invoice.id || payload.supplierId !== invoice.supplierId || payload.invoiceNumber !== invoice.invoiceNumber || payload.total !== invoice.total.toFixed(2) || payload.currency !== invoice.currency || payload.makerId !== invoice.createdById || payload.approverId !== invoice.approvedById || payload.ledgerPostingBatchId !== invoice.ledgerPostingBatchId || payload.receiptRecognitionHash !== recognitionHash || !["MATCHED", "APPROVED_EXCEPTION"].includes(String(payload.matchStatus)) || objectRecord(approval.metadata).makerCheckerVerified !== true) throw review()
}

async function lockSource(tx: Prisma.TransactionClient, table: string, organizationId: string, id: string) {
  if (!/^[a-z_]+$/.test(table)) throw new BusinessRuleError("Invalid purchasing source lock.")
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM ${Prisma.raw(`"${table}"`)} WHERE "organizationId" = ${organizationId} AND "id" = ${id} FOR UPDATE`)
}

type ReturnLinePlan = {
  sourceGoodsReceiptLineId: string
  sourcePurchaseOrderLineId: string
  itemId: string
  quantity: Prisma.Decimal
  invoicedQuantity: Prisma.Decimal
  uninvoicedQuantity: Prisma.Decimal
  unitCost: Prisma.Decimal
  inventoryAmount: Prisma.Decimal
  supplierClaimAmount: Prisma.Decimal
  grniAmount: Prisma.Decimal
  sourceInventoryTransactionId?: string | null
}

async function findReturnReplay(tx: Prisma.TransactionClient, organizationId: string, idempotencyKey: string) {
  return tx.purchaseReturn.findUnique({
    where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } },
    include: { lines: true },
  })
}

export async function postPurchaseReturn(input: PostPurchaseReturnInput, client: DbClient = db) {
  const parsed = postPurchaseReturnInputSchema.parse(input)
  const occurredAt = parseDate(parsed.occurredAt)
  const normalizedLines = parsed.lines
    .map((line) => ({
      sourceGoodsReceiptLineId: line.sourceGoodsReceiptLineId,
      quantity: quantity(line.quantity).toFixed(3),
    }))
    .sort((a, b) => a.sourceGoodsReceiptLineId.localeCompare(b.sourceGoodsReceiptLineId))
  assertDistinct(normalizedLines.map((line) => line.sourceGoodsReceiptLineId), "A receipt line can appear only once per return.")
  if (normalizedLines.some((line) => quantity(line.quantity).lte(0))) {
    throw new BusinessRuleError("Purchase return quantities must be greater than zero.")
  }
  const payload = {
    command: "POST_PURCHASE_RETURN",
    organizationId: parsed.organizationId,
    purchaseOrderId: parsed.purchaseOrderId,
    goodsReceiptId: parsed.goodsReceiptId,
    occurredAt: parsed.occurredAt ? occurredAt.toISOString() : null,
    reason: parsed.reason,
    documentHash: parsed.documentHash ?? null,
    lines: normalizedLines,
  }
  const payloadHash = prefixedHash(payload)

  return inTransaction(client, async (tx) => {
    const replay = await findReturnReplay(tx, parsed.organizationId, parsed.idempotencyKey)
    if (replay) {
      assertReplay(replay, payloadHash)
      return { purchaseReturn: replay, replayed: true }
    }

    await tx.$queryRaw`SELECT s.id FROM suppliers s JOIN purchase_orders p ON p."supplierId" = s.id JOIN goods_receipts r ON r."purchaseOrderId" = p.id WHERE r.id = ${parsed.goodsReceiptId} AND r."organizationId" = ${parsed.organizationId} AND p."organizationId" = ${parsed.organizationId} AND s."organizationId" = ${parsed.organizationId} FOR UPDATE OF s`
    await lockSource(tx, "goods_receipts", parsed.organizationId, parsed.goodsReceiptId)
    const lockedReplay = await findReturnReplay(tx, parsed.organizationId, parsed.idempotencyKey)
    if (lockedReplay) {
      assertReplay(lockedReplay, payloadHash)
      return { purchaseReturn: lockedReplay, replayed: true }
    }
    const receipt = await tx.goodsReceipt.findFirst({
      where: {
        id: parsed.goodsReceiptId,
        organizationId: parsed.organizationId,
        purchaseOrderId: parsed.purchaseOrderId,
        deletedAt: null,
      },
      include: {
        organization: { select: { currency: true } },
        purchaseOrder: { select: { id: true, supplierId: true, locationId: true, deletedAt: true } },
        lines: { include: { item: { select: { trackInventory: true } } } },
      },
    })
    if (!receipt || receipt.purchaseOrder.deletedAt) {
      throw new NotFoundError("Source purchase order and goods receipt were not found for this organization.")
    }
    const inventoryPostedReceipt = receipt.status === GoodsReceiptStatus.RECEIVED
      || receipt.status === GoodsReceiptStatus.COMPLETED
    if (!inventoryPostedReceipt || !receipt.inventoryPostedAt) {
      throw new BusinessRuleError("Only inventory-posted goods receipts can be returned.")
    }
    if (occurredAt < receipt.inventoryPostedAt) throw new BusinessRuleError("A return cannot precede its receipt inventory recognition.")

    const sourceLineById = new Map(receipt.lines.map((line) => [line.id, line]))
    const requestedIds = normalizedLines.map((line) => line.sourceGoodsReceiptLineId)
    const priorLines = await tx.purchaseReturnLine.findMany({
      where: { organizationId: parsed.organizationId, sourceGoodsReceiptLineId: { in: requestedIds } },
      include: { purchaseReturn: { select: { direction: true } } },
    })
    const invoicedLines = await tx.supplierInvoiceLine.findMany({
      where: {
        organizationId: parsed.organizationId,
        goodsReceiptLineId: { in: requestedIds },
        supplierInvoice: {
          organizationId: parsed.organizationId,
          status: { in: [SupplierInvoiceStatus.POSTED, SupplierInvoiceStatus.PAYMENT_PENDING, SupplierInvoiceStatus.PAID] },
        },
      },
      select: { goodsReceiptLineId: true, quantity: true },
    })

    let plans: ReturnLinePlan[] = normalizedLines.map((requested) => {
      const source = sourceLineById.get(requested.sourceGoodsReceiptLineId)
      if (!source) throw new BusinessRuleError("Every return line must belong to the specified goods receipt and tenant.")
      if (!source.item.trackInventory) throw new BusinessRuleError("Purchase return stock correction requires an inventory-tracked source item.")
      const requestedQuantity = quantity(requested.quantity)
      const netReturned = priorLines
        .filter((line) => line.sourceGoodsReceiptLineId === source.id)
        .reduce(
          (total, line) => total.plus(
            line.purchaseReturn.direction === PurchaseCorrectionDirection.CORRECTION ? line.quantity : line.quantity.negated(),
          ),
          new Prisma.Decimal(0),
        )
        .toDecimalPlaces(3)
      if (netReturned.plus(requestedQuantity).gt(source.receivedQuantity)) {
        throw new BusinessRuleError("Purchase return quantity exceeds the unreturned source receipt quantity.")
      }
      const invoiced = invoicedLines
        .filter((line) => line.goodsReceiptLineId === source.id)
        .reduce((total, line) => total.plus(line.quantity), new Prisma.Decimal(0))
      const previouslyReturnedAsInvoiced = priorLines
        .filter((line) => line.sourceGoodsReceiptLineId === source.id)
        .reduce(
          (total, line) => total.plus(
            line.purchaseReturn.direction === PurchaseCorrectionDirection.CORRECTION
              ? line.invoicedQuantity
              : line.invoicedQuantity.negated(),
          ),
          new Prisma.Decimal(0),
        )
      const invoicedQuantity = Prisma.Decimal.min(
        requestedQuantity,
        Prisma.Decimal.max(new Prisma.Decimal(0), invoiced.minus(previouslyReturnedAsInvoiced)),
      ).toDecimalPlaces(3)
      const uninvoicedQuantity = requestedQuantity.minus(invoicedQuantity).toDecimalPlaces(3)
      const unitCost = money(source.unitCost)
      const inventoryAmount = money(requestedQuantity.times(unitCost))
      const supplierClaimAmount = money(invoicedQuantity.times(unitCost))
      const grniAmount = inventoryAmount.minus(supplierClaimAmount).toDecimalPlaces(2)
      return {
        sourceGoodsReceiptLineId: source.id,
        sourcePurchaseOrderLineId: source.purchaseOrderLineId,
        itemId: source.itemId,
        quantity: requestedQuantity,
        invoicedQuantity,
        uninvoicedQuantity,
        unitCost,
        inventoryAmount,
        supplierClaimAmount,
        grniAmount,
      }
    })

    const purchaseReturnId = randomUUID()
    const source = await readReceiptRecognitionSource(tx, parsed.organizationId, receipt.id)
    const currency = source?.manifest.currency ?? receipt.organization.currency
    const recognition = await resolveReceiptReturnRecognition(tx, { organizationId: parsed.organizationId, supplierId: receipt.purchaseOrder.supplierId, receiptId: receipt.id, returnId: purchaseReturnId, currency, plans })
    plans = recognition.allocatedPlans ?? plans
    const returnNumber = await allocatePurchaseDocumentNumber(tx, {
      organizationId: parsed.organizationId,
      documentType: PURCHASE_DOCUMENT_TYPE.PURCHASE_RETURN,
    })
    const documentHash = parsed.documentHash ?? prefixedHash({ payload, returnNumber })
    const evidenceHash = parsed.evidenceHash ?? prefixedHash({
      payloadHash,
      returnNumber,
      sourceReceiptNumber: receipt.receiptNumber,
      plans: plans.map((plan) => ({
        sourceGoodsReceiptLineId: plan.sourceGoodsReceiptLineId,
        quantity: plan.quantity.toFixed(3),
        unitCost: plan.unitCost.toFixed(2),
      })),
    })
    const inventoryAmount = plans.reduce((total, line) => total.plus(line.inventoryAmount), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const supplierClaimAmount = plans.reduce((total, line) => total.plus(line.supplierClaimAmount), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const grniAmount = plans.reduce((total, line) => total.plus(line.grniAmount), new Prisma.Decimal(0)).toDecimalPlaces(2)
    if (recognition.recognition.version === 2 && inventoryAmount.eq(0)) await getOpenPeriodForDate(parsed.organizationId, occurredAt, tx)
    const posting: PurchaseReturnPostingOutcome = recognition.recognition.version === 2 && inventoryAmount.eq(0) ? noValuePosting() : await postPurchaseCorrectionLedgerInTx(tx, {
      organizationId: parsed.organizationId,
      sourceType: AccountingSourceType.PURCHASE_RETURN,
      sourceId: purchaseReturnId,
      sourceNumber: returnNumber,
      sourceDate: occurredAt,
      supplierId: receipt.purchaseOrder.supplierId,
      currency,
      actorId: parsed.postedById,
      documentHash,
      sourceAmount: inventoryAmount,
      netAmount: supplierClaimAmount,
      grossAmount: inventoryAmount,
      taxAmount: 0,
      costAmount: inventoryAmount,
      varianceAmount: grniAmount,
      metadata: { purchaseOrderId: parsed.purchaseOrderId, goodsReceiptId: parsed.goodsReceiptId, evidenceHash, receiptReturnRecognition: recognition.recognition },
      receiptReturnRecognitionHash: recognition.recognition.status === "VERIFIED" ? recognition.recognitionHash : undefined,
      sourceReviewBlocker: recognition.sourceReviewBlocker,
    })
    const stock = await postPurchaseReturnStock({
      organizationId: parsed.organizationId,
      purchaseReturnId,
      returnNumber,
      purchaseOrderId: parsed.purchaseOrderId,
      goodsReceiptId: parsed.goodsReceiptId,
      direction: PurchaseCorrectionDirection.CORRECTION,
      postedById: parsed.postedById,
      occurredAt,
      idempotencyKey: `purchase-return-stock:${parsed.idempotencyKey}`,
      documentHash,
      accountingPostingBatchId: posting.ledgerBatch?.id ?? null,
      ...(recognition.recognition.version === 2 ? { valuation: { version: 2 as const, recognition: recognition.recognition as typeof recognition.recognition & { version: 2 } } } : {}),
      lines: plans.map((plan) => ({
        itemId: plan.itemId,
        locationId: receipt.locationId,
        quantity: plan.quantity,
        unitCost: plan.unitCost,
        ...(recognition.recognition.version === 2 ? { sourceGoodsReceiptLineId: plan.sourceGoodsReceiptLineId, allocatedValue: plan.inventoryAmount.toFixed(2) } : {}),
      })),
    }, tx)
    if (!stock.eventId || stock.movementTransactionIds.length !== plans.length) {
      throw new BusinessRuleError("Purchase return did not create complete inventory evidence.")
    }
    const created = await tx.purchaseReturn.create({
      data: {
        id: purchaseReturnId,
        organizationId: parsed.organizationId,
        purchaseOrderId: parsed.purchaseOrderId,
        goodsReceiptId: parsed.goodsReceiptId,
        supplierId: receipt.purchaseOrder.supplierId,
        returnNumber,
        reason: parsed.reason,
        idempotencyKey: parsed.idempotencyKey,
        payloadHash,
        documentHash,
        evidenceHash,
        inventoryBusinessEventId: stock.eventId,
        ledgerPostingBatchId: posting.ledgerBatch?.id ?? null,
        journalEntryId: posting.journalEntryId ?? null,
        postedById: parsed.postedById,
        occurredAt,
        lines: { create: plans.map((plan, index) => ({
          sourceGoodsReceiptLineId: plan.sourceGoodsReceiptLineId,
          sourcePurchaseOrderLineId: plan.sourcePurchaseOrderLineId,
          itemId: plan.itemId,
          quantity: plan.quantity,
          invoicedQuantity: plan.invoicedQuantity,
          uninvoicedQuantity: plan.uninvoicedQuantity,
          unitCost: plan.unitCost,
          inventoryAmount: plan.inventoryAmount,
          supplierClaimAmount: plan.supplierClaimAmount,
          grniAmount: plan.grniAmount,
          inventoryTransactionId: stock.movementTransactionIds[index],
          evidenceHash: prefixedHash({ evidenceHash, sourceLineId: plan.sourceGoodsReceiptLineId }),
        })) },
      },
      include: { lines: true },
    })
    await recordReceiptReturnRecognition(tx, created, recognition.recognition)
    await tx.auditLog.create({ data: {
      organizationId: parsed.organizationId,
      userId: parsed.postedById,
      entityType: "PurchaseReturn",
      entityId: created.id,
      action: "PURCHASE_RETURN_POSTED",
      changes: { after: { purchaseOrderId: created.purchaseOrderId, goodsReceiptId: created.goodsReceiptId, evidenceHash, movementTransactionIds: stock.movementTransactionIds } },
    } })
    return { purchaseReturn: created, replayed: false, ledgerStatus: posting.ledgerStatus, accountingReviewRequired: !!recognition.sourceReviewBlocker || posting.ledgerStatus === "BLOCKED_PENDING_RULES" }
  })
}

/** Finance recovery calls this after original receipt recognition, in the same
 * transaction. It never replays stock or rewrites the immutable return header. */
export async function recoverPurchaseReturnAccountingInTx(tx: Prisma.TransactionClient, input: { organizationId: string; purchaseReturnId: string; actorId: string }): Promise<PurchaseReturnPostingOutcome> {
  await tx.$queryRaw`SELECT s.id FROM suppliers s JOIN purchase_returns r ON r."supplierId" = s.id WHERE r.id = ${input.purchaseReturnId} AND r."organizationId" = ${input.organizationId} AND s."organizationId" = ${input.organizationId} FOR UPDATE OF s`
  await tx.$queryRaw`SELECT g.id FROM goods_receipts g JOIN purchase_returns r ON r."goodsReceiptId" = g.id WHERE r.id = ${input.purchaseReturnId} AND r."organizationId" = ${input.organizationId} AND g."organizationId" = ${input.organizationId} FOR UPDATE OF g`
  await lockSource(tx, "purchase_returns", input.organizationId, input.purchaseReturnId)
  const original = await tx.purchaseReturn.findFirst({ where: { id: input.purchaseReturnId, organizationId: input.organizationId }, include: { lines: true, reversedByPurchaseReturn: { select: { id: true } } } })
  if (!original) throw new NotFoundError("Purchase return was not found for this organization.")
  if (original.direction !== "CORRECTION" || original.reversedByPurchaseReturn) throw new BusinessRuleError("Only an active original return can recover its accounting.")
  const source = await readReceiptRecognitionSource(tx, input.organizationId, original.goodsReceiptId)
  if (!source) throw new BusinessRuleError("Original receipt recognition must be verified before recovering return accounting.", "INVOICE_EVIDENCE_REQUIRED")
  await validateReceiptReturnStockForRecognition(tx, source)
  const retained = await readPurchaseReturnAccountingEvidence(tx, original)
  if (!retained.recognition) throw new BusinessRuleError("The original return has no verified allocation evidence.", "INVOICE_EVIDENCE_REQUIRED")
  if (retained.accountingComplete && !retained.journalEntryId) return noValuePosting()
  if (retained.journalEntryId) {
    const batchId = original.ledgerPostingBatchId
    if (!batchId) throw new BusinessRuleError("Recovered return journal has no retained posting batch.", "INVOICE_EVIDENCE_REQUIRED")
    const batch = await tx.ledgerPostingBatch.findFirst({ where: { id: batchId, organizationId: input.organizationId }, include: { sourceLinks: true } })
    if (!batch || batch.status !== "POSTED" || batch.sourceLinks.length !== 1 || batch.sourceLinks[0].journalEntryId !== retained.journalEntryId) throw new BusinessRuleError("Recovered return accounting requires review.")
    return { ledgerBatch: batch, ledgerStatus: "POSTED" as const, journalEntryId: retained.journalEntryId, accountingSourceLinkId: batch.sourceLinks[0].id }
  }
  const resolved = await resolveReceiptReturnRecognition(tx, { organizationId: input.organizationId, supplierId: original.supplierId, receiptId: original.goodsReceiptId, returnId: original.id, currency: source.manifest.currency, plans: original.lines, recovering: true })
  if (resolved.sourceReviewBlocker || resolved.recognition.status !== "VERIFIED") throw new BusinessRuleError(resolved.sourceReviewBlocker?.message ?? "Return recognition requires accounting review.", "INVOICE_EVIDENCE_REQUIRED")
  // A previously verified allocation is frozen even if later invoices or returns
  // changed the current aggregate. Revalidation above checks its remaining cap.
  const recognition = retained.recognition.status === "VERIFIED" ? retained.recognition : resolved.recognition
  const inventory = original.lines.reduce((sum, line) => sum.plus(line.inventoryAmount), new Prisma.Decimal(0))
  const claim = original.lines.reduce((sum, line) => sum.plus(line.supplierClaimAmount), new Prisma.Decimal(0))
  const grni = original.lines.reduce((sum, line) => sum.plus(line.grniAmount), new Prisma.Decimal(0))
  if (recognition.version === 2 && inventory.eq(0)) {
    if (original.ledgerPostingBatchId) throw new BusinessRuleError("Zero-value return has unexpected accounting evidence.", "INVOICE_EVIDENCE_REQUIRED")
    await recordReceiptReturnResolution(tx, original, recognition, null, input.actorId)
    return noValuePosting()
  }
  const posting = await postPurchaseCorrectionLedgerInTx(tx, { organizationId: input.organizationId, sourceType: AccountingSourceType.PURCHASE_RETURN, sourceId: original.id, sourceNumber: original.returnNumber, sourceDate: original.occurredAt,
    supplierId: original.supplierId, currency: source.manifest.currency, actorId: input.actorId, documentHash: original.documentHash,
    sourceAmount: inventory, grossAmount: inventory, costAmount: inventory, netAmount: claim, taxAmount: 0, varianceAmount: grni,
    receiptReturnRecognitionHash: hashBusinessPayload(recognition), metadata: { purchaseOrderId: original.purchaseOrderId, goodsReceiptId: original.goodsReceiptId, evidenceHash: original.evidenceHash, receiptReturnRecognition: recognition } })
  if (posting.ledgerStatus !== "POSTED" || !posting.journalEntryId || posting.ledgerBatch.id !== original.ledgerPostingBatchId) throw new BusinessRuleError(posting.blockerMessage ?? "Return accounting setup is incomplete; receipt and return recovery was not applied.")
  await recordReceiptReturnResolution(tx, original, recognition, posting.journalEntryId, input.actorId)
  return posting
}

export async function reversePurchaseReturn(input: ReversePurchaseReturnInput, client: DbClient = db, control: PurchaseCorrectionReversalControl = {}) {
  const parsed = reversePurchaseReturnInputSchema.parse(input)
  const occurredAt = parseDate(parsed.occurredAt)
  const payload = {
    command: "REVERSE_PURCHASE_RETURN",
    organizationId: parsed.organizationId,
    purchaseReturnId: parsed.purchaseReturnId,
    occurredAt: parsed.occurredAt ? occurredAt.toISOString() : null,
    reason: parsed.reason,
    documentHash: parsed.documentHash ?? null,
  }
  const payloadHash = prefixedHash(payload)

  return inReversalTransaction(client, async (tx) => {
    const replay = await findReturnReplay(tx, parsed.organizationId, parsed.idempotencyKey)
    if (replay) {
      assertReplay(replay, payloadHash)
      return { purchaseReturn: replay, replayed: true }
    }
    await lockJournalReversalCatalogInTx(tx, parsed.organizationId)
    await tx.$queryRaw`SELECT s.id FROM suppliers s JOIN purchase_returns r ON r."supplierId" = s.id WHERE r.id = ${parsed.purchaseReturnId} AND r."organizationId" = ${parsed.organizationId} AND s."organizationId" = ${parsed.organizationId} FOR UPDATE OF s`
    await tx.$queryRaw`SELECT g.id FROM goods_receipts g JOIN purchase_returns r ON r."goodsReceiptId" = g.id WHERE r.id = ${parsed.purchaseReturnId} AND r."organizationId" = ${parsed.organizationId} AND g."organizationId" = ${parsed.organizationId} FOR UPDATE OF g`
    await lockSource(tx, "purchase_returns", parsed.organizationId, parsed.purchaseReturnId)
    const lockedReplay = await findReturnReplay(tx, parsed.organizationId, parsed.idempotencyKey)
    if (lockedReplay) {
      assertReplay(lockedReplay, payloadHash)
      return { purchaseReturn: lockedReplay, replayed: true }
    }
    const original = await tx.purchaseReturn.findFirst({
      where: { id: parsed.purchaseReturnId, organizationId: parsed.organizationId },
      include: {
        lines: true,
        reversedByPurchaseReturn: { select: { id: true } },
        supplierCreditNotes: {
          where: { direction: PurchaseCorrectionDirection.CORRECTION },
          include: { reversedBySupplierCreditNote: { select: { id: true } } },
        },
      },
    })
    if (!original) throw new NotFoundError("Purchase return was not found for this organization.")
    if (original.direction !== PurchaseCorrectionDirection.CORRECTION || original.reversedByPurchaseReturn) {
      throw new BusinessRuleError("Only an unreversed original purchase return can be reversed.")
    }
    if (occurredAt < original.occurredAt) throw new BusinessRuleError("A reversal cannot precede its original return.")
    if (original.supplierCreditNotes.some((credit) => !credit.reversedBySupplierCreditNote)) {
      throw new BusinessRuleError("Reverse the active supplier credit before reversing its purchase return.")
    }

    const receipt = await tx.goodsReceipt.findFirst({
      where: { id: original.goodsReceiptId, organizationId: parsed.organizationId, purchaseOrderId: original.purchaseOrderId },
      select: { locationId: true },
    })
    if (!receipt) throw new NotFoundError("Source goods receipt was not found for this organization.")
    const purchaseReturnId = randomUUID()
    const recognition = await retainReturnReversalRecognition(tx, original, purchaseReturnId)
    const accounting = await readPurchaseReturnAccountingEvidence(tx, original)
    const prepared = await preparePurchaseCorrectionReversalInTx(tx, {
      organizationId: parsed.organizationId, sourceType: AccountingSourceType.PURCHASE_RETURN,
      originalSourceId: original.id, originalJournalEntryId: accounting.journalEntryId,
      originalPostingBatchId: original.ledgerPostingBatchId, originalSourceDate: original.occurredAt, reversalDate: occurredAt,
    })
    await control.assertCurrentAuthority?.()
    const returnNumber = await allocatePurchaseDocumentNumber(tx, {
      organizationId: parsed.organizationId,
      documentType: PURCHASE_DOCUMENT_TYPE.PURCHASE_RETURN,
    })
    const documentHash = parsed.documentHash ?? prefixedHash({ payload, returnNumber, originalEvidenceHash: original.evidenceHash })
    const evidenceHash = parsed.evidenceHash ?? prefixedHash({ payloadHash, returnNumber, originalEvidenceHash: original.evidenceHash })
    const noValue = recognition?.version === 2 && original.lines.every(line => line.inventoryAmount.eq(0))
    if (noValue) {
      if (original.ledgerPostingBatchId || accounting.journalEntryId) throw new BusinessRuleError("Zero-value return has unexpected journal evidence.", "INVOICE_EVIDENCE_REQUIRED")
      await assertNoMonetaryEffects(tx, parsed.organizationId, "PURCHASE_RETURN", original.id)
    }
    const posting = noValue ? null : await reversePurchaseCorrectionLedgerInTx(tx, {
      organizationId: parsed.organizationId,
      sourceType: AccountingSourceType.PURCHASE_RETURN,
      sourceId: purchaseReturnId,
      sourceNumber: returnNumber,
      sourceDate: occurredAt,
      originalJournalEntryId: accounting.journalEntryId,
      originalSourceId: original.id,
      originalPostingBatchId: original.ledgerPostingBatchId,
      actorId: parsed.postedById,
      supplierId: original.supplierId,
      documentHash,
      reason: parsed.reason,
      metadata: { reversalOfPurchaseReturnId: original.id, evidenceHash, ...(recognition ? { receiptReturnRecognition: recognition } : {}) },
    }, prepared)
    const stock = await postPurchaseReturnStock({
      organizationId: parsed.organizationId,
      purchaseReturnId,
      returnNumber,
      purchaseOrderId: original.purchaseOrderId,
      goodsReceiptId: original.goodsReceiptId,
      direction: PurchaseCorrectionDirection.REVERSAL,
      postedById: parsed.postedById,
      occurredAt,
      idempotencyKey: `purchase-return-stock:${parsed.idempotencyKey}`,
      documentHash,
      accountingPostingBatchId: posting?.ledgerBatch.id ?? null,
      ...(recognition?.version === 2 ? { valuation: { version: 2 as const, recognition: recognition as typeof recognition & { version: 2 } } } : {}),
      lines: original.lines.map((line) => ({
        itemId: line.itemId,
        locationId: receipt.locationId,
        quantity: line.quantity,
        unitCost: line.unitCost,
        sourceInventoryTransactionId: line.inventoryTransactionId,
        ...(recognition?.version === 2 ? { sourceGoodsReceiptLineId: line.sourceGoodsReceiptLineId, allocatedValue: line.inventoryAmount.toFixed(2) } : {}),
      })),
    }, tx, { transaction: tx, organizationId: parsed.organizationId, affectedPeriodIds: prepared.affectedPeriodIds, deferCloseInvalidation: true })
    if (!stock.eventId || stock.movementTransactionIds.length !== original.lines.length) {
      throw new BusinessRuleError("Purchase return reversal did not create complete inventory evidence.")
    }
    const created = await tx.purchaseReturn.create({
      data: {
        id: purchaseReturnId,
        organizationId: parsed.organizationId,
        purchaseOrderId: original.purchaseOrderId,
        goodsReceiptId: original.goodsReceiptId,
        supplierId: original.supplierId,
        returnNumber,
        direction: PurchaseCorrectionDirection.REVERSAL,
        reversalOfPurchaseReturnId: original.id,
        reason: parsed.reason,
        idempotencyKey: parsed.idempotencyKey,
        payloadHash,
        documentHash,
        evidenceHash,
        inventoryBusinessEventId: stock.eventId,
        ledgerPostingBatchId: posting?.ledgerBatch.id ?? null,
        journalEntryId: posting?.journalEntryId ?? null,
        postedById: parsed.postedById,
        occurredAt,
        lines: { create: original.lines.map((line, index) => ({
          sourceGoodsReceiptLineId: line.sourceGoodsReceiptLineId,
          sourcePurchaseOrderLineId: line.sourcePurchaseOrderLineId,
          itemId: line.itemId,
          quantity: line.quantity,
          invoicedQuantity: line.invoicedQuantity,
          uninvoicedQuantity: line.uninvoicedQuantity,
          unitCost: line.unitCost,
          inventoryAmount: line.inventoryAmount,
          supplierClaimAmount: line.supplierClaimAmount,
          grniAmount: line.grniAmount,
          inventoryTransactionId: stock.movementTransactionIds[index],
          evidenceHash: prefixedHash({ evidenceHash, originalLineEvidenceHash: line.evidenceHash }),
        })) },
      },
      include: { lines: true },
    })
    if (recognition) await recordReceiptReturnRecognition(tx, created, recognition)
    await tx.auditLog.create({ data: {
      organizationId: parsed.organizationId,
      userId: parsed.postedById,
      entityType: "PurchaseReturn",
      entityId: created.id,
      action: "PURCHASE_RETURN_REVERSED",
      changes: { after: { reversalOfPurchaseReturnId: original.id, evidenceHash, movementTransactionIds: stock.movementTransactionIds } },
    } })
    await recordPurchaseCorrectionReversalCloseInvalidationsInTx(tx, prepared, {
      sourceId: created.id, documentHash, actorId: parsed.postedById, posting,
    })
    return { purchaseReturn: created, replayed: false }
  })
}

async function findCreditReplay(tx: Prisma.TransactionClient, organizationId: string, idempotencyKey: string) {
  return tx.supplierCreditNote.findUnique({
    where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } },
    include: { lines: true },
  })
}

export async function postSupplierCreditNote(input: PostSupplierCreditNoteInput, client: DbClient = db) {
  const parsed = postSupplierCreditNoteInputSchema.parse(input)
  const creditDate = parseDate(parsed.creditDate)
  const mappings = [...parsed.lines].sort((a, b) => a.sourcePurchaseReturnLineId.localeCompare(b.sourcePurchaseReturnLineId))
  assertDistinct(mappings.map((line) => line.sourcePurchaseReturnLineId), "A return line can appear only once per supplier credit.")
  assertDistinct(mappings.map((line) => line.sourceSupplierInvoiceLineId), "An invoice line can appear only once per supplier credit.")
  const payload = {
    command: "POST_SUPPLIER_CREDIT_NOTE",
    organizationId: parsed.organizationId,
    purchaseReturnId: parsed.purchaseReturnId,
    supplierInvoiceId: parsed.supplierInvoiceId,
    creditNoteNumber: normalizeDocumentNumber(parsed.creditNoteNumber),
    creditDate: creditDate.toISOString(),
    documentHash: parsed.documentHash,
    reason: parsed.reason,
    lines: mappings,
  }
  const payloadHash = prefixedHash(payload)

  return inTransaction(client, async (tx) => {
    const replay = await findCreditReplay(tx, parsed.organizationId, parsed.idempotencyKey)
    if (replay) {
      assertReplay(replay, payloadHash)
      return { supplierCreditNote: replay, replayed: true }
    }
    await tx.$queryRaw`SELECT s.id FROM suppliers s JOIN purchase_returns r ON r."supplierId" = s.id WHERE r.id = ${parsed.purchaseReturnId} AND r."organizationId" = ${parsed.organizationId} AND s."organizationId" = ${parsed.organizationId} FOR UPDATE OF s`
    await lockSource(tx, "purchase_returns", parsed.organizationId, parsed.purchaseReturnId)
    const lockedReplay = await findCreditReplay(tx, parsed.organizationId, parsed.idempotencyKey)
    if (lockedReplay) {
      assertReplay(lockedReplay, payloadHash)
      return { supplierCreditNote: lockedReplay, replayed: true }
    }
    await lockSource(tx, "supplier_invoices", parsed.organizationId, parsed.supplierInvoiceId)
    const sourceReturn = await tx.purchaseReturn.findFirst({
      where: { id: parsed.purchaseReturnId, organizationId: parsed.organizationId },
      include: {
        lines: true,
        reversedByPurchaseReturn: { select: { id: true } },
        supplierCreditNotes: { where: { direction: PurchaseCorrectionDirection.CORRECTION }, select: { id: true } },
      },
    })
    if (!sourceReturn) throw new NotFoundError("Purchase return was not found for this organization.")
    if (sourceReturn.direction !== PurchaseCorrectionDirection.CORRECTION || sourceReturn.reversedByPurchaseReturn) {
      throw new BusinessRuleError("Supplier credits require an active original purchase return.")
    }
    if (sourceReturn.supplierCreditNotes.length > 0) {
      throw new ConflictError("This purchase return already has a supplier credit correction.")
    }
    await lockSource(tx, "suppliers", parsed.organizationId, sourceReturn.supplierId)
    const invoice = await tx.supplierInvoice.findFirst({
      where: {
        id: parsed.supplierInvoiceId,
        organizationId: parsed.organizationId,
        // Receipt-based invoices can span orders and have no single header order.
        // Every credited line is still matched to the exact returned receipt/order line below.
        OR: [{ purchaseOrderId: sourceReturn.purchaseOrderId }, { purchaseOrderId: null }],
        supplierId: sourceReturn.supplierId,
        deletedAt: null,
      },
      include: {
        supplier: { select: { id: true, isActive: true, currentBalance: true } },
        lines: true,
      },
    })
    if (!invoice) throw new NotFoundError("Source supplier invoice was not found for the return tenant and purchase order.")
    const postedSupplierInvoice = invoice.status === SupplierInvoiceStatus.POSTED
      || invoice.status === SupplierInvoiceStatus.PAYMENT_PENDING
      || invoice.status === SupplierInvoiceStatus.PAID
    if (!postedSupplierInvoice || !invoice.postedAt) {
      throw new BusinessRuleError("Supplier credits can only adjust a posted supplier invoice.")
    }
    if (!invoice.supplier.isActive) throw new BusinessRuleError("Supplier is inactive.")

    const expectedReturnLines = sourceReturn.lines.filter((line) => line.invoicedQuantity.gt(0))
    if (expectedReturnLines.length === 0) {
      throw new BusinessRuleError("This return has no invoiced quantity eligible for a supplier credit.")
    }
    if (mappings.length !== expectedReturnLines.length) {
      throw new BusinessRuleError("Supplier credit must cover every invoiced line of the source return exactly once.")
    }
    const priorCreditLines = await tx.supplierCreditNoteLine.findMany({
      where: {
        organizationId: parsed.organizationId,
        sourceSupplierInvoiceLineId: { in: mappings.map((line) => line.sourceSupplierInvoiceLineId) },
      },
      include: { supplierCreditNote: { include: { lines: true } } },
    })
    const priorCredits = [...new Map(priorCreditLines.map(line => [line.supplierCreditNote.id, line.supplierCreditNote])).values()]
    for (const prior of priorCredits) {
      if (prior.organizationId !== parsed.organizationId || prior.supplierInvoiceId !== invoice.id || prior.currency !== invoice.currency) throw new BusinessRuleError("Prior credit allocation belongs to a different invoice source.")
      await readSupplierCreditAllocationProof(tx, prior)
      if (prior.direction === "REVERSAL") {
        const original = priorCredits.find(value => value.id === prior.reversalOfSupplierCreditNoteId)
        if (!original || original.direction !== "CORRECTION" || priorCredits.filter(value => value.reversalOfSupplierCreditNoteId === original.id).length !== 1 || prior.lines.length !== original.lines.length || prior.lines.some(line => !original.lines.some(value => value.sourceSupplierInvoiceLineId === line.sourceSupplierInvoiceLineId && value.sourcePurchaseReturnLineId === line.sourcePurchaseReturnLineId && value.quantity.eq(line.quantity) && value.unitCost.eq(line.unitCost) && value.taxAmount.eq(line.taxAmount) && value.lineTotal.eq(line.lineTotal)))) throw new BusinessRuleError("Prior credit reversal does not exactly restore its source allocation.")
      }
    }
    const returnLineById = new Map(expectedReturnLines.map((line) => [line.id, line]))
    const invoiceLineById = new Map(invoice.lines.map((line) => [line.id, line]))
    let hasPriceDifference = false
    const plans = mappings.map((mapping) => {
      const returnLine = returnLineById.get(mapping.sourcePurchaseReturnLineId)
      const invoiceLine = invoiceLineById.get(mapping.sourceSupplierInvoiceLineId)
      if (!returnLine || !invoiceLine) {
        throw new BusinessRuleError("Supplier credit lines must belong to the source return and supplier invoice.")
      }
      if (invoiceLine.goodsReceiptLineId !== returnLine.sourceGoodsReceiptLineId
          || invoiceLine.purchaseOrderLineId !== returnLine.sourcePurchaseOrderLineId
          || invoiceLine.itemId !== returnLine.itemId) {
        throw new BusinessRuleError("Supplier credit line does not match the return's receipt, purchase line, and item evidence.")
      }
      if (invoiceLine.quantity.lt(returnLine.invoicedQuantity)) {
        throw new BusinessRuleError("Supplier credit quantity exceeds the linked supplier invoice line quantity.")
      }
      const netCredited = priorCreditLines
        .filter((line) => line.sourceSupplierInvoiceLineId === invoiceLine.id)
        .reduce(
          (total, line) => total.plus(
            line.supplierCreditNote.direction === PurchaseCorrectionDirection.CORRECTION
              ? line.quantity
              : line.quantity.negated(),
          ),
          new Prisma.Decimal(0),
        )
      if (netCredited.plus(returnLine.invoicedQuantity).gt(invoiceLine.quantity)) {
        throw new BusinessRuleError("Supplier credit would duplicate quantity already credited against the invoice line.")
      }
      if (!money(invoiceLine.unitCost).eq(returnLine.unitCost)) hasPriceDifference = true
      const sourceCredits = priorCreditLines.filter(line => line.sourceSupplierInvoiceLineId === invoiceLine.id)
      const creditedNet = sourceCredits.reduce((sum, line) => sum.plus(line.lineTotal.minus(line.taxAmount).times(line.supplierCreditNote.direction === "REVERSAL" ? -1 : 1)), new Prisma.Decimal(0))
      const creditedTax = sourceCredits.reduce((sum, line) => sum.plus(line.taxAmount.times(line.supplierCreditNote.direction === "REVERSAL" ? -1 : 1)), new Prisma.Decimal(0))
      const netAllocation = allocateReceiptCost({ sourceQuantity: invoiceLine.quantity, sourceValue: invoiceLine.lineTotal.minus(invoiceLine.taxAmount), consumedQuantity: netCredited, consumedValue: creditedNet, quantity: returnLine.invoicedQuantity })
      const taxAllocation = allocateReceiptCost({ sourceQuantity: invoiceLine.quantity, sourceValue: invoiceLine.taxAmount, consumedQuantity: netCredited, consumedValue: creditedTax, quantity: returnLine.invoicedQuantity })
      const lineSubtotal = money(netAllocation.allocatedValue)
      const taxRate = new Prisma.Decimal(invoiceLine.taxRate).toDecimalPlaces(3)
      const taxAmount = money(taxAllocation.allocatedValue)
      return {
        sourcePurchaseReturnLineId: returnLine.id,
        sourceSupplierInvoiceLineId: invoiceLine.id,
        sourceGoodsReceiptLineId: returnLine.sourceGoodsReceiptLineId,
        itemId: returnLine.itemId,
        quantity: returnLine.invoicedQuantity,
        unitCost: money(invoiceLine.unitCost),
        taxRate,
        taxAmount,
        lineTotal: lineSubtotal.plus(taxAmount).toDecimalPlaces(2),
        lineSubtotal,
        claimAmount: returnLine.supplierClaimAmount,
        netAllocation,
        taxAllocation,
        invoiceLineHash: hashBusinessPayload({ invoiceId: invoice.id, id: invoiceLine.id, receiptLineId: invoiceLine.goodsReceiptLineId, purchaseOrderLineId: invoiceLine.purchaseOrderLineId, itemId: invoiceLine.itemId, quantity: invoiceLine.quantity.toFixed(3), unitCost: invoiceLine.unitCost.toFixed(2), taxRate: invoiceLine.taxRate.toFixed(3), taxAmount: invoiceLine.taxAmount.toFixed(2), lineTotal: invoiceLine.lineTotal.toFixed(2) }),
      }
    })
    if (new Set(plans.map((line) => line.sourcePurchaseReturnLineId)).size !== expectedReturnLines.length) {
      throw new BusinessRuleError("Supplier credit does not cover the source return evidence exactly once.")
    }
    if (hasPriceDifference) await assertApprovedCreditPriceSource(tx, sourceReturn, invoice)

    const subtotal = plans.reduce((total, line) => total.plus(line.lineSubtotal), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const taxAmount = plans.reduce((total, line) => total.plus(line.taxAmount), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const total = subtotal.plus(taxAmount).toDecimalPlaces(2)
    if (total.lt(0)) throw new BusinessRuleError("Supplier credit total cannot be negative.")
    const returnFunding = await assertPurchaseReturnClaimFunding(tx, sourceReturn, { currency: invoice.currency, sourceDate: creditDate,
      claims: plans.map(line => ({ returnLineId: line.sourcePurchaseReturnLineId, quantity: line.quantity, amount: line.claimAmount })) })
    const supplierCreditNoteId = randomUUID()
    const claimAmount = plans.reduce((sum, line) => sum.plus(line.claimAmount), new Prisma.Decimal(0)), variance = subtotal.minus(claimAmount)
    const receiptCreditRecognition = creditProofSchema.parse({ version: 2, organizationId: parsed.organizationId, supplierId: sourceReturn.supplierId, invoiceId: invoice.id, returnId: sourceReturn.id, creditId: supplierCreditNoteId, currency: invoice.currency, direction: "CORRECTION", reversalOfCreditId: null, returnRecognitionHash: returnFunding.recognitionHash, returnJournalId: returnFunding.journalEntryId,
      lines: plans.map(line => ({ returnLineId: line.sourcePurchaseReturnLineId, invoiceLineId: line.sourceSupplierInvoiceLineId, receiptLineId: line.sourceGoodsReceiptLineId, quantity: line.quantity.toFixed(3), claimAmount: line.claimAmount.toFixed(2), invoiceLineHash: line.invoiceLineHash, netAllocation: line.netAllocation, taxAllocation: line.taxAllocation })) })
    const evidenceHash = parsed.evidenceHash ?? prefixedHash({
      payloadHash,
      sourceReturnEvidenceHash: sourceReturn.evidenceHash,
      invoiceEvidenceHash: invoice.evidenceHash ?? invoice.documentHash ?? invoice.id,
    })
    if (total.eq(0) && claimAmount.eq(0)) await getOpenPeriodForDate(parsed.organizationId, creditDate, tx)
    const posting: SupplierCreditPostingOutcome = total.eq(0) && claimAmount.eq(0) ? noValuePosting() : await postPurchaseCorrectionLedgerInTx(tx, {
      organizationId: parsed.organizationId,
      sourceType: AccountingSourceType.SUPPLIER_CREDIT_NOTE,
      sourceId: supplierCreditNoteId,
      sourceNumber: parsed.creditNoteNumber,
      sourceDate: creditDate,
      supplierId: sourceReturn.supplierId,
      currency: invoice.currency,
      actorId: parsed.postedById,
      documentHash: parsed.documentHash,
      sourceAmount: total,
      netAmount: subtotal,
      grossAmount: total,
      taxAmount,
      costAmount: claimAmount,
      varianceAmount: variance.abs(),
      receiptCreditRecognitionHash: hashBusinessPayload(receiptCreditRecognition),
      receiptCreditVarianceDirection: variance.gte(0) ? "CREDIT" : "DEBIT",
      metadata: {
        purchaseReturnId: sourceReturn.id,
        purchaseOrderId: sourceReturn.purchaseOrderId,
        goodsReceiptId: sourceReturn.goodsReceiptId,
        supplierInvoiceId: invoice.id,
        evidenceHash,
        purchaseReturnJournalId: returnFunding.journalEntryId,
        purchaseReturnRecognitionHash: returnFunding.recognitionHash,
        receiptCreditRecognition,
      },
    })
    const balanceAfter = money(invoice.supplier.currentBalance).minus(total).toDecimalPlaces(2)
    if (total.gt(0)) {
    await tx.supplier.update({ where: { id: invoice.supplier.id }, data: { currentBalance: balanceAfter } })
    await tx.supplierLedgerEntry.create({ data: {
      organizationId: parsed.organizationId,
      supplierId: invoice.supplier.id,
      entryDate: creditDate,
      type: LedgerEntryType.CREDIT_NOTE,
      debit: new Prisma.Decimal(0),
      credit: total,
      balanceAfter,
      description: `Supplier credit ${parsed.creditNoteNumber}`,
      referenceType: "SUPPLIER_CREDIT_NOTE",
      referenceId: supplierCreditNoteId,
    } })
    }
    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "purchase.supplier_credit.posted",
      eventSource: "INTERNAL",
      idempotencyKey: `supplier-credit:${parsed.idempotencyKey}`,
      actorId: parsed.postedById,
      occurredAt: creditDate,
      sourceType: AccountingSourceType.SUPPLIER_CREDIT_NOTE,
      sourceId: supplierCreditNoteId,
      postingBatchId: posting.ledgerBatch?.id,
      documentHash: parsed.documentHash,
      payload: { ...payload, subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), total: total.toFixed(2), evidenceHash, receiptCreditRecognition, ledgerStatus: posting.ledgerStatus },
      outboxMessages: [{ channel: "NOTIFICATION", eventName: "purchasing.supplier_credit.posted", payload: { supplierCreditNoteId, purchaseReturnId: sourceReturn.id, supplierInvoiceId: invoice.id, total: total.toFixed(2) } }],
    })
    if (!eventResult.created) throw new ConflictError("Supplier credit event already exists without immutable credit evidence.")
    const created = await tx.supplierCreditNote.create({
      data: {
        id: supplierCreditNoteId,
        organizationId: parsed.organizationId,
        supplierId: sourceReturn.supplierId,
        purchaseOrderId: sourceReturn.purchaseOrderId,
        goodsReceiptId: sourceReturn.goodsReceiptId,
        purchaseReturnId: sourceReturn.id,
        supplierInvoiceId: invoice.id,
        creditNoteNumber: parsed.creditNoteNumber.trim(),
        normalizedCreditNoteNumber: normalizeDocumentNumber(parsed.creditNoteNumber),
        creditDate,
        currency: invoice.currency,
        subtotal,
        taxAmount,
        total,
        idempotencyKey: parsed.idempotencyKey,
        payloadHash,
        documentHash: parsed.documentHash,
        evidenceHash,
        ledgerPostingBatchId: posting.ledgerBatch?.id ?? null,
        journalEntryId: posting.journalEntryId ?? null,
        postedBusinessEventId: eventResult.event.id,
        postedById: parsed.postedById,
        reason: parsed.reason,
        lines: { create: plans.map((line) => ({
          sourcePurchaseReturnLineId: line.sourcePurchaseReturnLineId,
          sourceSupplierInvoiceLineId: line.sourceSupplierInvoiceLineId,
          sourceGoodsReceiptLineId: line.sourceGoodsReceiptLineId,
          itemId: line.itemId,
          quantity: line.quantity,
          unitCost: line.unitCost,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,
          evidenceHash: prefixedHash({ evidenceHash, returnLineId: line.sourcePurchaseReturnLineId, invoiceLineId: line.sourceSupplierInvoiceLineId }),
        })) },
      },
      include: { lines: true },
    })
    await markBusinessEventAppliedInTx(tx, parsed.organizationId, eventResult.event.id)
    await tx.auditLog.create({ data: {
      organizationId: parsed.organizationId,
      userId: parsed.postedById,
      entityType: "SupplierCreditNote",
      entityId: created.id,
      action: "SUPPLIER_CREDIT_NOTE_POSTED",
      changes: { after: { purchaseReturnId: sourceReturn.id, supplierInvoiceId: invoice.id, documentHash: parsed.documentHash, evidenceHash, total: total.toFixed(2) } },
    } })
    await refreshSupplierInvoiceBalanceStatus(tx, parsed.organizationId, invoice)
    return { supplierCreditNote: created, replayed: false, ledgerStatus: posting.ledgerStatus }
  })
}

export async function reverseSupplierCreditNote(input: ReverseSupplierCreditNoteInput, client: DbClient = db, control: PurchaseCorrectionReversalControl = {}) {
  const parsed = reverseSupplierCreditNoteInputSchema.parse(input)
  const creditDate = parseDate(parsed.creditDate)
  const payload = {
    command: "REVERSE_SUPPLIER_CREDIT_NOTE",
    organizationId: parsed.organizationId,
    supplierCreditNoteId: parsed.supplierCreditNoteId,
    creditNoteNumber: normalizeDocumentNumber(parsed.creditNoteNumber),
    creditDate: creditDate.toISOString(),
    documentHash: parsed.documentHash,
    reason: parsed.reason,
  }
  const payloadHash = prefixedHash(payload)

  return inReversalTransaction(client, async (tx) => {
    const replay = await findCreditReplay(tx, parsed.organizationId, parsed.idempotencyKey)
    if (replay) {
      assertReplay(replay, payloadHash)
      return { supplierCreditNote: replay, replayed: true }
    }
    await lockJournalReversalCatalogInTx(tx, parsed.organizationId)
    await tx.$queryRaw`SELECT s.id FROM suppliers s JOIN supplier_credit_notes c ON c."supplierId" = s.id WHERE c.id = ${parsed.supplierCreditNoteId} AND c."organizationId" = ${parsed.organizationId} AND s."organizationId" = ${parsed.organizationId} FOR UPDATE OF s`
    await lockSource(tx, "supplier_credit_notes", parsed.organizationId, parsed.supplierCreditNoteId)
    const lockedReplay = await findCreditReplay(tx, parsed.organizationId, parsed.idempotencyKey)
    if (lockedReplay) {
      assertReplay(lockedReplay, payloadHash)
      return { supplierCreditNote: lockedReplay, replayed: true }
    }
    const original = await tx.supplierCreditNote.findFirst({
      where: { id: parsed.supplierCreditNoteId, organizationId: parsed.organizationId },
      include: {
        lines: true,
        reversedBySupplierCreditNote: { select: { id: true } },
        supplier: { select: { id: true, currentBalance: true } },
      },
    })
    if (!original) throw new NotFoundError("Supplier credit note was not found for this organization.")
    if (original.direction !== PurchaseCorrectionDirection.CORRECTION || original.reversedBySupplierCreditNote) {
      throw new BusinessRuleError("Only an unreversed original supplier credit can be reversed.")
    }
    if (creditDate < original.creditDate) throw new BusinessRuleError("A reversal cannot precede its original supplier credit.")
    const originalRecognition = await readSupplierCreditAllocationProof(tx, original)
    // Match payment/credit lock ordering so a concurrent payment cannot observe stale coverage.
    await lockSource(tx, "supplier_invoices", parsed.organizationId, original.supplierInvoiceId)
    const invoice = await tx.supplierInvoice.findFirst({ where: {
      id: original.supplierInvoiceId, organizationId: parsed.organizationId,
      supplierId: original.supplierId, currency: original.currency,
      status: { in: [SupplierInvoiceStatus.POSTED, SupplierInvoiceStatus.PAYMENT_PENDING, SupplierInvoiceStatus.PAID] },
    } })
    if (!invoice || !invoice.postedAt) throw new BusinessRuleError("The retained invoice requires review before reversing its supplier credit.")
    await lockSource(tx, "suppliers", parsed.organizationId, original.supplierId)
    const supplier = await tx.supplier.findFirst({
      where: { id: original.supplierId, organizationId: parsed.organizationId, deletedAt: null },
      select: { currentBalance: true },
    })
    if (!supplier) throw new NotFoundError("Supplier was not found for this organization.")

    const prepared = await preparePurchaseCorrectionReversalInTx(tx, {
      organizationId: parsed.organizationId, sourceType: AccountingSourceType.SUPPLIER_CREDIT_NOTE,
      originalSourceId: original.id, originalJournalEntryId: original.journalEntryId,
      originalPostingBatchId: original.ledgerPostingBatchId, originalSourceDate: original.creditDate, reversalDate: creditDate,
    })
    await control.assertCurrentAuthority?.()
    const supplierCreditNoteId = randomUUID()
    const receiptCreditRecognition = originalRecognition ? { ...originalRecognition, creditId: supplierCreditNoteId, direction: "REVERSAL" as const, reversalOfCreditId: original.id } : null
    const evidenceHash = parsed.evidenceHash ?? prefixedHash({
      payloadHash,
      originalEvidenceHash: original.evidenceHash,
      originalDocumentHash: original.documentHash,
    })
    const noValue = originalRecognition && originalRecognition.lines.every(line => money(line.claimAmount).eq(0) && money(line.netAllocation.allocatedValue).eq(0) && money(line.taxAllocation.allocatedValue).eq(0))
    if (noValue && (original.journalEntryId || original.ledgerPostingBatchId)) throw new BusinessRuleError("Zero-value supplier credit has unexpected journal evidence.", "INVOICE_EVIDENCE_REQUIRED")
    if (noValue) {
      await assertNoMonetaryEffects(tx, parsed.organizationId, "SUPPLIER_CREDIT_NOTE", original.id)
    }
    const posting = noValue ? null : await reversePurchaseCorrectionLedgerInTx(tx, {
      organizationId: parsed.organizationId,
      sourceType: AccountingSourceType.SUPPLIER_CREDIT_NOTE,
      sourceId: supplierCreditNoteId,
      sourceNumber: parsed.creditNoteNumber,
      sourceDate: creditDate,
      originalJournalEntryId: original.journalEntryId,
      originalSourceId: original.id,
      originalPostingBatchId: original.ledgerPostingBatchId,
      actorId: parsed.postedById,
      supplierId: original.supplierId,
      documentHash: parsed.documentHash,
      reason: parsed.reason,
      metadata: { reversalOfSupplierCreditNoteId: original.id, evidenceHash, ...(receiptCreditRecognition ? { receiptCreditRecognition } : {}) },
    }, prepared)
    const balanceAfter = money(supplier.currentBalance).plus(original.total).toDecimalPlaces(2)
    if (original.total.gt(0)) {
    await tx.supplier.update({ where: { id: original.supplierId }, data: { currentBalance: balanceAfter } })
    await tx.supplierLedgerEntry.create({ data: {
      organizationId: parsed.organizationId,
      supplierId: original.supplierId,
      entryDate: creditDate,
      type: LedgerEntryType.DEBIT_NOTE,
      debit: original.total,
      credit: new Prisma.Decimal(0),
      balanceAfter,
      description: `Supplier credit reversal ${parsed.creditNoteNumber}`,
      referenceType: "SUPPLIER_CREDIT_NOTE_REVERSAL",
      referenceId: supplierCreditNoteId,
    } })
    }
    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "purchase.supplier_credit.reversed",
      eventSource: "INTERNAL",
      idempotencyKey: `supplier-credit:${parsed.idempotencyKey}`,
      actorId: parsed.postedById,
      occurredAt: creditDate,
      sourceType: AccountingSourceType.SUPPLIER_CREDIT_NOTE,
      sourceId: supplierCreditNoteId,
      postingBatchId: posting?.ledgerBatch.id,
      documentHash: parsed.documentHash,
      payload: { ...payload, originalEvidenceHash: original.evidenceHash, evidenceHash, total: original.total.toFixed(2), ...(receiptCreditRecognition ? { receiptCreditRecognition } : {}), ledgerStatus: posting?.ledgerStatus ?? "NOT_REQUIRED" },
      outboxMessages: [{ channel: "NOTIFICATION", eventName: "purchasing.supplier_credit.reversed", payload: { supplierCreditNoteId, reversalOfSupplierCreditNoteId: original.id, total: original.total.toFixed(2) } }],
    })
    if (!eventResult.created) throw new ConflictError("Supplier credit reversal event exists without immutable reversal evidence.")
    const created = await tx.supplierCreditNote.create({
      data: {
        id: supplierCreditNoteId,
        organizationId: parsed.organizationId,
        supplierId: original.supplierId,
        purchaseOrderId: original.purchaseOrderId,
        goodsReceiptId: original.goodsReceiptId,
        purchaseReturnId: original.purchaseReturnId,
        supplierInvoiceId: original.supplierInvoiceId,
        direction: PurchaseCorrectionDirection.REVERSAL,
        reversalOfSupplierCreditNoteId: original.id,
        creditNoteNumber: parsed.creditNoteNumber.trim(),
        normalizedCreditNoteNumber: normalizeDocumentNumber(parsed.creditNoteNumber),
        creditDate,
        currency: original.currency,
        subtotal: original.subtotal,
        taxAmount: original.taxAmount,
        total: original.total,
        idempotencyKey: parsed.idempotencyKey,
        payloadHash,
        documentHash: parsed.documentHash,
        evidenceHash,
        ledgerPostingBatchId: posting?.ledgerBatch.id ?? null,
        journalEntryId: posting?.journalEntryId ?? null,
        postedBusinessEventId: eventResult.event.id,
        postedById: parsed.postedById,
        reason: parsed.reason,
        lines: { create: original.lines.map((line) => ({
          sourcePurchaseReturnLineId: line.sourcePurchaseReturnLineId,
          sourceSupplierInvoiceLineId: line.sourceSupplierInvoiceLineId,
          sourceGoodsReceiptLineId: line.sourceGoodsReceiptLineId,
          itemId: line.itemId,
          quantity: line.quantity,
          unitCost: line.unitCost,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,
          evidenceHash: prefixedHash({ evidenceHash, originalLineEvidenceHash: line.evidenceHash }),
        })) },
      },
      include: { lines: true },
    })
    await markBusinessEventAppliedInTx(tx, parsed.organizationId, eventResult.event.id)
    await tx.auditLog.create({ data: {
      organizationId: parsed.organizationId,
      userId: parsed.postedById,
      entityType: "SupplierCreditNote",
      entityId: created.id,
      action: "SUPPLIER_CREDIT_NOTE_REVERSED",
      changes: { after: { reversalOfSupplierCreditNoteId: original.id, documentHash: parsed.documentHash, evidenceHash, total: original.total.toFixed(2) } },
    } })
    await refreshSupplierInvoiceBalanceStatus(tx, parsed.organizationId, invoice)
    await recordPurchaseCorrectionReversalCloseInvalidationsInTx(tx, prepared, {
      sourceId: created.id, documentHash: parsed.documentHash, actorId: parsed.postedById, posting,
    })
    return { supplierCreditNote: created, replayed: false, ledgerStatus: posting?.ledgerStatus ?? "NOT_REQUIRED" }
  })
}
