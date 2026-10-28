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
import { postPurchaseCorrectionLedgerInTx } from "./ap-control.service"
import { reversePurchaseCorrectionLedgerInTx } from "./purchase-correction-ledger.service"
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

function hasTransaction(client: DbClient): client is typeof db {
  return typeof (client as typeof db).$transaction === "function"
}

function inTransaction<T>(client: DbClient, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return hasTransaction(client) ? client.$transaction(work) : work(client as Prisma.TransactionClient)
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

    const plans: ReturnLinePlan[] = normalizedLines.map((requested) => {
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
    const posting = await postPurchaseCorrectionLedgerInTx(tx, {
      organizationId: parsed.organizationId,
      sourceType: AccountingSourceType.PURCHASE_RETURN,
      sourceId: purchaseReturnId,
      sourceNumber: returnNumber,
      sourceDate: occurredAt,
      supplierId: receipt.purchaseOrder.supplierId,
      currency: "XAF",
      actorId: parsed.postedById,
      documentHash,
      sourceAmount: inventoryAmount,
      netAmount: supplierClaimAmount,
      grossAmount: inventoryAmount,
      taxAmount: 0,
      costAmount: inventoryAmount,
      varianceAmount: grniAmount,
      metadata: { purchaseOrderId: parsed.purchaseOrderId, goodsReceiptId: parsed.goodsReceiptId, evidenceHash },
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
      accountingPostingBatchId: posting.ledgerBatch.id,
      lines: plans.map((plan) => ({
        itemId: plan.itemId,
        locationId: receipt.locationId,
        quantity: plan.quantity,
        unitCost: plan.unitCost,
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
        ledgerPostingBatchId: posting.ledgerBatch.id,
        journalEntryId: posting.journalEntryId ?? null,
        postedById: parsed.postedById,
        occurredAt,
        lines: { create: plans.map((plan, index) => ({
          organizationId: parsed.organizationId,
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
    await tx.auditLog.create({ data: {
      organizationId: parsed.organizationId,
      userId: parsed.postedById,
      entityType: "PurchaseReturn",
      entityId: created.id,
      action: "PURCHASE_RETURN_POSTED",
      changes: { after: { purchaseOrderId: created.purchaseOrderId, goodsReceiptId: created.goodsReceiptId, evidenceHash, movementTransactionIds: stock.movementTransactionIds } },
    } })
    return { purchaseReturn: created, replayed: false }
  })
}

export async function reversePurchaseReturn(input: ReversePurchaseReturnInput, client: DbClient = db) {
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

  return inTransaction(client, async (tx) => {
    const replay = await findReturnReplay(tx, parsed.organizationId, parsed.idempotencyKey)
    if (replay) {
      assertReplay(replay, payloadHash)
      return { purchaseReturn: replay, replayed: true }
    }
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
    if (original.supplierCreditNotes.some((credit) => !credit.reversedBySupplierCreditNote)) {
      throw new BusinessRuleError("Reverse the active supplier credit before reversing its purchase return.")
    }

    const purchaseOrder = await tx.purchaseOrder.findFirst({
      where: { id: original.purchaseOrderId, organizationId: parsed.organizationId },
      select: { locationId: true },
    })
    if (!purchaseOrder) throw new NotFoundError("Source purchase order was not found for this organization.")
    const purchaseReturnId = randomUUID()
    const returnNumber = await allocatePurchaseDocumentNumber(tx, {
      organizationId: parsed.organizationId,
      documentType: PURCHASE_DOCUMENT_TYPE.PURCHASE_RETURN,
    })
    const documentHash = parsed.documentHash ?? prefixedHash({ payload, returnNumber, originalEvidenceHash: original.evidenceHash })
    const evidenceHash = parsed.evidenceHash ?? prefixedHash({ payloadHash, returnNumber, originalEvidenceHash: original.evidenceHash })
    const posting = await reversePurchaseCorrectionLedgerInTx(tx, {
      organizationId: parsed.organizationId,
      sourceType: AccountingSourceType.PURCHASE_RETURN,
      sourceId: purchaseReturnId,
      sourceNumber: returnNumber,
      sourceDate: occurredAt,
      originalJournalEntryId: original.journalEntryId,
      originalPostingBatchId: original.ledgerPostingBatchId,
      actorId: parsed.postedById,
      supplierId: original.supplierId,
      documentHash,
      reason: parsed.reason,
      metadata: { reversalOfPurchaseReturnId: original.id, evidenceHash },
    })
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
      lines: original.lines.map((line) => ({
        itemId: line.itemId,
        locationId: purchaseOrder.locationId,
        quantity: line.quantity,
        unitCost: line.unitCost,
        sourceInventoryTransactionId: line.inventoryTransactionId,
      })),
    }, tx)
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
          organizationId: parsed.organizationId,
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
    await tx.auditLog.create({ data: {
      organizationId: parsed.organizationId,
      userId: parsed.postedById,
      entityType: "PurchaseReturn",
      entityId: created.id,
      action: "PURCHASE_RETURN_REVERSED",
      changes: { after: { reversalOfPurchaseReturnId: original.id, evidenceHash, movementTransactionIds: stock.movementTransactionIds } },
    } })
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
        purchaseOrderId: sourceReturn.purchaseOrderId,
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
      include: { supplierCreditNote: { select: { direction: true } } },
    })
    const returnLineById = new Map(expectedReturnLines.map((line) => [line.id, line]))
    const invoiceLineById = new Map(invoice.lines.map((line) => [line.id, line]))
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
      if (!money(invoiceLine.unitCost).eq(returnLine.unitCost)) {
        throw new BusinessRuleError("Supplier credit unit cost differs from the source receipt; use an approved price-variance correction workflow.")
      }
      const lineSubtotal = money(returnLine.invoicedQuantity.times(returnLine.unitCost))
      const taxRate = new Prisma.Decimal(invoiceLine.taxRate).toDecimalPlaces(3)
      const taxAmount = money(lineSubtotal.times(taxRate).div(100))
      return {
        sourcePurchaseReturnLineId: returnLine.id,
        sourceSupplierInvoiceLineId: invoiceLine.id,
        sourceGoodsReceiptLineId: returnLine.sourceGoodsReceiptLineId,
        itemId: returnLine.itemId,
        quantity: returnLine.invoicedQuantity,
        unitCost: returnLine.unitCost,
        taxRate,
        taxAmount,
        lineTotal: lineSubtotal.plus(taxAmount).toDecimalPlaces(2),
        lineSubtotal,
      }
    })
    if (new Set(plans.map((line) => line.sourcePurchaseReturnLineId)).size !== expectedReturnLines.length) {
      throw new BusinessRuleError("Supplier credit does not cover the source return evidence exactly once.")
    }

    const subtotal = plans.reduce((total, line) => total.plus(line.lineSubtotal), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const taxAmount = plans.reduce((total, line) => total.plus(line.taxAmount), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const total = subtotal.plus(taxAmount).toDecimalPlaces(2)
    if (total.lte(0)) throw new BusinessRuleError("Supplier credit total must be greater than zero.")
    const supplierCreditNoteId = randomUUID()
    const evidenceHash = parsed.evidenceHash ?? prefixedHash({
      payloadHash,
      sourceReturnEvidenceHash: sourceReturn.evidenceHash,
      invoiceEvidenceHash: invoice.evidenceHash ?? invoice.documentHash ?? invoice.id,
    })
    const posting = await postPurchaseCorrectionLedgerInTx(tx, {
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
      costAmount: subtotal,
      metadata: {
        purchaseReturnId: sourceReturn.id,
        purchaseOrderId: sourceReturn.purchaseOrderId,
        goodsReceiptId: sourceReturn.goodsReceiptId,
        supplierInvoiceId: invoice.id,
        evidenceHash,
      },
    })
    const balanceAfter = money(invoice.supplier.currentBalance).minus(total).toDecimalPlaces(2)
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
    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "purchase.supplier_credit.posted",
      eventSource: "INTERNAL",
      idempotencyKey: `supplier-credit:${parsed.idempotencyKey}`,
      actorId: parsed.postedById,
      occurredAt: creditDate,
      sourceType: AccountingSourceType.SUPPLIER_CREDIT_NOTE,
      sourceId: supplierCreditNoteId,
      postingBatchId: posting.ledgerBatch.id,
      documentHash: parsed.documentHash,
      payload: { ...payload, subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), total: total.toFixed(2), evidenceHash },
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
        ledgerPostingBatchId: posting.ledgerBatch.id,
        journalEntryId: posting.journalEntryId ?? null,
        postedBusinessEventId: eventResult.event.id,
        postedById: parsed.postedById,
        reason: parsed.reason,
        lines: { create: plans.map((line) => ({
          organizationId: parsed.organizationId,
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
    return { supplierCreditNote: created, replayed: false }
  })
}

export async function reverseSupplierCreditNote(input: ReverseSupplierCreditNoteInput, client: DbClient = db) {
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

  return inTransaction(client, async (tx) => {
    const replay = await findCreditReplay(tx, parsed.organizationId, parsed.idempotencyKey)
    if (replay) {
      assertReplay(replay, payloadHash)
      return { supplierCreditNote: replay, replayed: true }
    }
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
    await lockSource(tx, "suppliers", parsed.organizationId, original.supplierId)
    const supplier = await tx.supplier.findFirst({
      where: { id: original.supplierId, organizationId: parsed.organizationId, deletedAt: null },
      select: { currentBalance: true },
    })
    if (!supplier) throw new NotFoundError("Supplier was not found for this organization.")

    const supplierCreditNoteId = randomUUID()
    const evidenceHash = parsed.evidenceHash ?? prefixedHash({
      payloadHash,
      originalEvidenceHash: original.evidenceHash,
      originalDocumentHash: original.documentHash,
    })
    const posting = await reversePurchaseCorrectionLedgerInTx(tx, {
      organizationId: parsed.organizationId,
      sourceType: AccountingSourceType.SUPPLIER_CREDIT_NOTE,
      sourceId: supplierCreditNoteId,
      sourceNumber: parsed.creditNoteNumber,
      sourceDate: creditDate,
      originalJournalEntryId: original.journalEntryId,
      originalPostingBatchId: original.ledgerPostingBatchId,
      actorId: parsed.postedById,
      supplierId: original.supplierId,
      documentHash: parsed.documentHash,
      reason: parsed.reason,
      metadata: { reversalOfSupplierCreditNoteId: original.id, evidenceHash },
    })
    const balanceAfter = money(supplier.currentBalance).plus(original.total).toDecimalPlaces(2)
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
      payload: { ...payload, originalEvidenceHash: original.evidenceHash, evidenceHash, total: original.total.toFixed(2) },
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
          organizationId: parsed.organizationId,
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
    return { supplierCreditNote: created, replayed: false }
  })
}
