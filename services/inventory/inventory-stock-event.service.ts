import {
  AccountingPostingPurpose,
  AccountingSourceType,
  LedgerPostingBatchStatus,
  Prisma,
  TransactionReferenceType,
  TransactionType,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { createLedgerPostingBatch } from "@/services/accounting/posting.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import { ConcurrentStockUpdateError, InsufficientStockError } from "./inventory-errors"

type DbClient = Prisma.TransactionClient | typeof db

type LedgerBlockerInput = {
  sourceType: AccountingSourceType
  sourceId: string
  postingPurpose: AccountingPostingPurpose
  blockerCode: string
  message: string
}

type StockEventLineInput = {
  itemId: string
  locationId: string
  quantity: Prisma.Decimal.Value
  unitCost?: Prisma.Decimal.Value | null
  movementType: TransactionType
  referenceType?: TransactionReferenceType | null
  referenceId?: string | null
  referenceNumber?: string | null
  notes?: string | null
  batchNumber?: string | null
  serialNumbers?: string[]
  expiryDate?: Date | null
}

type StockEventInput = {
  organizationId: string
  eventType: string
  idempotencyKey: string
  eventSource?: "INTERNAL" | "POS" | "SYSTEM"
  actorId?: string | null
  occurredAt?: Date
  sourceType?: AccountingSourceType
  sourceId?: string | null
  documentHash?: string | null
  metadata?: Record<string, unknown>
  requiresOpenPeriod?: boolean
  ledgerBlocker?: LedgerBlockerInput
  outboxEventName?: string
  lines: StockEventLineInput[]
}

export type InventoryStockEventResult = {
  eventId?: string
  idempotencyKey: string
  documentHash?: string | null
  movementTransactionIds: string[]
  totalCost: Prisma.Decimal
  postingBatchId?: string
  replayed: boolean
}

export type OpeningStockInput = {
  organizationId: string
  itemId: string
  locationId: string
  quantity: Prisma.Decimal.Value
  unitCost?: Prisma.Decimal.Value | null
  createdById?: string | null
  referenceNumber?: string | null
  notes?: string | null
  occurredAt?: Date
  idempotencyKey?: string
}

export type ManualStockCorrectionInput = {
  organizationId: string
  itemId: string
  locationId: string
  quantityDelta: Prisma.Decimal.Value
  unitCost?: Prisma.Decimal.Value | null
  actorId?: string | null
  reason: string
  notes?: string | null
  occurredAt?: Date
  idempotencyKey?: string
}

export type GoodsReceiptStockLineInput = {
  itemId: string
  locationId: string
  quantity: Prisma.Decimal.Value
  unitCost: Prisma.Decimal.Value
  purchaseOrderId?: string | null
  goodsReceiptLineId?: string | null
  notes?: string | null
  batchNumber?: string | null
  serialNumbers?: string[]
  expiryDate?: Date | null
}

export type GoodsReceiptStockInput = {
  organizationId: string
  receiptId: string
  receiptNumber: string
  receivedById?: string | null
  occurredAt?: Date
  idempotencyKey?: string
  lines: GoodsReceiptStockLineInput[]
}

export type POSStockLineInput = {
  itemId: string
  quantity: Prisma.Decimal.Value
  unitCost?: Prisma.Decimal.Value | null
  notes?: string | null
}

export type POSStockIssueInput = {
  organizationId: string
  saleId: string
  orderNumber: string
  locationId: string
  actorId?: string | null
  occurredAt?: Date
  idempotencyKey?: string
  lines: POSStockLineInput[]
}

export type POSStockReturnInput = POSStockIssueInput & {
  correctionType: "REFUND" | "VOID"
  reason: string
}

export type InventoryReservationInput = {
  organizationId: string
  itemId: string
  locationId: string
  quantity: Prisma.Decimal.Value
  actorId: string
  reason: string
  expiresAt?: Date | null
  occurredAt?: Date
  idempotencyKey?: string
}

function hasTransaction(client: DbClient): client is typeof db {
  return "$transaction" in client
}

function decimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value)
}

function decimal3(value: Prisma.Decimal.Value) {
  return decimal(value).toDecimalPlaces(3)
}

function money(value: Prisma.Decimal.Value) {
  return decimal(value).toDecimalPlaces(2)
}

function maxZero(value: Prisma.Decimal) {
  return value.lt(0) ? new Prisma.Decimal(0) : value
}

function defaultDocumentHash(payload: unknown) {
  return `sha256:${hashBusinessPayload(payload)}`
}

async function assertOpenInventoryPeriod(
  tx: Prisma.TransactionClient,
  organizationId: string,
  occurredAt: Date,
) {
  try {
    return await getOpenPeriodForDate(organizationId, occurredAt, tx)
  } catch {
    throw new BusinessRuleError("An open accounting period is required before posting this stock event.")
  }
}

async function createLedgerBlocker(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    periodId?: string | null
    actorId?: string | null
    documentHash?: string | null
    blocker: LedgerBlockerInput
  },
) {
  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.organizationId,
      periodId: input.periodId,
      sourceType: input.blocker.sourceType,
      sourceId: input.blocker.sourceId,
      postingPurpose: input.blocker.postingPurpose,
      idempotencyKey: `${input.blocker.sourceType}:${input.blocker.sourceId}:${input.blocker.postingPurpose}:blocked`,
      metadata: {
        blockerCode: input.blocker.blockerCode,
        documentHash: input.documentHash,
      },
    },
    tx,
  )

  const blocked = await tx.ledgerPostingBatch.update({
    where: { id: batch.id },
    data: {
      status: LedgerPostingBatchStatus.FAILED,
      errorMessage: input.blocker.message,
      metadata: {
        blockerCode: input.blocker.blockerCode,
        documentHash: input.documentHash,
      },
    },
  })

  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      action: "INVENTORY_STOCK_EVENT_LEDGER_BLOCKED",
      resourceType: "LedgerPostingBatch",
      resourceId: blocked.id,
      postingBatchId: blocked.id,
      message: input.blocker.message,
      metadata: {
        blockerCode: input.blocker.blockerCode,
        sourceType: input.blocker.sourceType,
        sourceId: input.blocker.sourceId,
        postingPurpose: input.blocker.postingPurpose,
      },
    },
  })

  return blocked
}

async function loadItemAndLocation(
  tx: Prisma.TransactionClient,
  organizationId: string,
  line: StockEventLineInput,
) {
  const [item, location] = await Promise.all([
    tx.item.findFirst({
      where: {
        id: line.itemId,
        organizationId,
        isActive: true,
        isDiscontinued: false,
        deletedAt: null,
      },
      select: {
        id: true,
        sku: true,
        nameEn: true,
        organizationId: true,
        trackInventory: true,
        costPrice: true,
      },
    }),
    tx.location.findFirst({
      where: {
        id: line.locationId,
        organizationId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        allowNegativeStock: true,
      },
    }),
  ])

  if (!item) throw new NotFoundError("Inventory item not found or inactive.")
  if (!location) throw new NotFoundError("Inventory location not found or inactive.")
  if (!item.trackInventory) return null

  return { item, location }
}

async function postReservationLine(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    actorId?: string | null
    now: Date
    line: StockEventLineInput
  },
) {
  const loaded = await loadItemAndLocation(tx, input.organizationId, input.line)
  if (!loaded) return null

  const quantity = decimal3(input.line.quantity)
  if (quantity.lte(0)) throw new BusinessRuleError("Reservation quantity must be greater than zero.")

  const level = await tx.inventoryLevel.findUnique({
    where: {
      itemId_locationId: {
        itemId: input.line.itemId,
        locationId: input.line.locationId,
      },
    },
  })

  if (!level) {
    throw new InsufficientStockError(`No inventory found for item ${loaded.item.sku} at this location.`, {
      itemId: input.line.itemId,
      locationId: input.line.locationId,
    })
  }

  const available = decimal3(level.quantityAvailable)
  if (available.lt(quantity)) {
    throw new InsufficientStockError(
      `Insufficient available inventory for item ${loaded.item.sku}. Available: ${available.toFixed(3)}, Required: ${quantity.toFixed(3)}`,
      {
        itemId: input.line.itemId,
        locationId: input.line.locationId,
        available: available.toFixed(3),
        required: quantity.toFixed(3),
      },
    )
  }

  const update = await tx.inventoryLevel.updateMany({
    where: {
      id: level.id,
      version: level.version,
      quantityAvailable: { gte: quantity },
    },
    data: {
      quantityReserved: decimal3(level.quantityReserved).plus(quantity).toDecimalPlaces(3),
      quantityAvailable: available.minus(quantity).toDecimalPlaces(3),
      lastTransactionAt: input.now,
      version: { increment: 1 },
    },
  })

  if (update.count !== 1) {
    throw new ConcurrentStockUpdateError(`Inventory changed while reserving item ${loaded.item.sku}.`)
  }

  const movement = await tx.inventoryTransaction.create({
    data: {
      itemId: input.line.itemId,
      locationId: input.line.locationId,
      organizationId: input.organizationId,
      createdById: input.actorId ?? null,
      type: TransactionType.RESERVATION,
      quantity: new Prisma.Decimal(0),
      unitCost: money(input.line.unitCost ?? level.averageCost ?? loaded.item.costPrice ?? 0),
      totalCost: new Prisma.Decimal(0),
      balanceAfter: decimal3(level.quantityOnHand),
      referenceType: TransactionReferenceType.MANUAL,
      referenceNumber: input.line.referenceNumber ?? "INVENTORY_RESERVATION",
      notes: input.line.notes ?? null,
      serialNumbers: [],
    },
  })

  return {
    movementId: movement.id,
    totalCost: new Prisma.Decimal(0),
  }
}

async function postStockLine(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    actorId?: string | null
    now: Date
    line: StockEventLineInput
  },
) {
  if (input.line.movementType === TransactionType.RESERVATION) {
    return postReservationLine(tx, input)
  }

  const loaded = await loadItemAndLocation(tx, input.organizationId, input.line)
  if (!loaded) return null

  const quantity = decimal3(input.line.quantity)
  if (quantity.eq(0)) return null

  const level = await tx.inventoryLevel.findUnique({
    where: {
      itemId_locationId: {
        itemId: input.line.itemId,
        locationId: input.line.locationId,
      },
    },
  })

  if (!level && quantity.lt(0)) {
    throw new InsufficientStockError(`No inventory found for item ${loaded.item.sku} at this location.`, {
      itemId: input.line.itemId,
      locationId: input.line.locationId,
    })
  }

  const currentOnHand = decimal3(level?.quantityOnHand ?? 0)
  const currentAvailable = decimal3(level?.quantityAvailable ?? 0)
  const currentReserved = decimal3(level?.quantityReserved ?? 0)
  const currentTotalValue = money(level?.totalValue ?? 0)
  const unitCost = money(input.line.unitCost ?? level?.averageCost ?? loaded.item.costPrice ?? 0)

  if (quantity.lt(0) && !loaded.location.allowNegativeStock) {
    const decrease = quantity.abs().toDecimalPlaces(3)
    if (currentOnHand.lt(decrease) || currentAvailable.lt(decrease)) {
      throw new InsufficientStockError(
        `Insufficient inventory for item ${loaded.item.sku}. Available: ${currentAvailable.toFixed(3)}, Required: ${decrease.toFixed(3)}`,
        {
          itemId: input.line.itemId,
          locationId: input.line.locationId,
          available: currentAvailable.toFixed(3),
          required: decrease.toFixed(3),
        },
      )
    }
  }

  const nextOnHand = currentOnHand.plus(quantity).toDecimalPlaces(3)
  const nextAvailable = currentAvailable.plus(quantity).toDecimalPlaces(3)
  const valueDelta = unitCost.times(quantity).toDecimalPlaces(2)
  const nextTotalValue = nextOnHand.eq(0)
    ? new Prisma.Decimal(0)
    : maxZero(currentTotalValue.plus(valueDelta).toDecimalPlaces(2))
  const nextAverageCost = nextOnHand.gt(0)
    ? nextTotalValue.div(nextOnHand).toDecimalPlaces(2)
    : new Prisma.Decimal(0)

  if (level) {
    const guard: Prisma.InventoryLevelWhereInput = {
      id: level.id,
      version: level.version,
    }

    if (quantity.lt(0) && !loaded.location.allowNegativeStock) {
      const decrease = quantity.abs().toDecimalPlaces(3)
      guard.quantityOnHand = { gte: decrease }
      guard.quantityAvailable = { gte: decrease }
    }

    const update = await tx.inventoryLevel.updateMany({
      where: guard,
      data: {
        quantityOnHand: nextOnHand,
        quantityAvailable: nextAvailable,
        averageCost: nextAverageCost,
        totalValue: nextTotalValue,
        lastTransactionAt: input.now,
        version: { increment: 1 },
      },
    })

    if (update.count !== 1) {
      throw new ConcurrentStockUpdateError(`Inventory changed while posting item ${loaded.item.sku}.`)
    }
  } else {
    await tx.inventoryLevel.create({
      data: {
        itemId: input.line.itemId,
        locationId: input.line.locationId,
        quantityOnHand: nextOnHand,
        quantityReserved: currentReserved,
        quantityAvailable: nextAvailable,
        quantityInTransit: new Prisma.Decimal(0),
        quantityOnOrder: new Prisma.Decimal(0),
        reorderPoint: new Prisma.Decimal(0),
        averageCost: nextAverageCost,
        totalValue: nextTotalValue,
        lastTransactionAt: input.now,
      },
    })
  }

  const totalCost = valueDelta.abs().toDecimalPlaces(2)
  const movement = await tx.inventoryTransaction.create({
    data: {
      itemId: input.line.itemId,
      locationId: input.line.locationId,
      organizationId: input.organizationId,
      createdById: input.actorId ?? null,
      type: input.line.movementType,
      quantity,
      unitCost,
      totalCost,
      balanceAfter: nextOnHand,
      referenceType: input.line.referenceType ?? null,
      referenceId: input.line.referenceId ?? null,
      referenceNumber: input.line.referenceNumber ?? null,
      notes: input.line.notes ?? null,
      batchNumber: input.line.batchNumber ?? null,
      serialNumbers: input.line.serialNumbers ?? [],
      expiryDate: input.line.expiryDate ?? null,
    },
  })

  return {
    movementId: movement.id,
    totalCost,
  }
}

function stockEventPayload(input: StockEventInput, postingBatchId?: string) {
  return {
    eventType: input.eventType,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    documentHash: input.documentHash ?? null,
    postingBatchId: postingBatchId ?? null,
    valuationMethod: "WEIGHTED_AVERAGE",
    lines: input.lines.map((line) => ({
      itemId: line.itemId,
      locationId: line.locationId,
      quantity: decimal3(line.quantity).toFixed(3),
      unitCost: line.unitCost === null || line.unitCost === undefined ? null : money(line.unitCost).toFixed(2),
      movementType: line.movementType,
      referenceType: line.referenceType ?? null,
      referenceId: line.referenceId ?? null,
      referenceNumber: line.referenceNumber ?? null,
      batchNumber: line.batchNumber ?? null,
      serialNumbers: line.serialNumbers ?? [],
      expiryDate: line.expiryDate?.toISOString() ?? null,
    })),
    metadata: input.metadata ?? {},
  }
}

async function postInventoryStockEvent(
  input: StockEventInput,
  client: DbClient = db,
): Promise<InventoryStockEventResult> {
  const runnableLines = input.lines.filter((line) => !decimal3(line.quantity).eq(0))
  const documentHash = input.documentHash ?? defaultDocumentHash({
    eventType: input.eventType,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    idempotencyKey: input.idempotencyKey,
    lines: runnableLines.map((line) => ({
      itemId: line.itemId,
      locationId: line.locationId,
      quantity: decimal3(line.quantity).toFixed(3),
      unitCost: line.unitCost === null || line.unitCost === undefined ? null : money(line.unitCost).toFixed(2),
      movementType: line.movementType,
      referenceType: line.referenceType ?? null,
      referenceId: line.referenceId ?? null,
      referenceNumber: line.referenceNumber ?? null,
    })),
  })

  if (runnableLines.length === 0) {
    return {
      idempotencyKey: input.idempotencyKey,
      documentHash,
      movementTransactionIds: [],
      totalCost: new Prisma.Decimal(0),
      replayed: false,
    }
  }

  const run = async (tx: Prisma.TransactionClient): Promise<InventoryStockEventResult> => {
    const occurredAt = input.occurredAt ?? new Date()
    const period = input.requiresOpenPeriod === false
      ? null
      : await assertOpenInventoryPeriod(tx, input.organizationId, occurredAt)
    const ledgerBatch = input.ledgerBlocker
      ? await createLedgerBlocker(tx, {
          organizationId: input.organizationId,
          periodId: period?.id ?? null,
          actorId: input.actorId,
          documentHash,
          blocker: input.ledgerBlocker,
        })
      : null
    const payload = stockEventPayload({ ...input, lines: runnableLines, documentHash }, ledgerBatch?.id)
    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: input.organizationId,
      eventType: input.eventType,
      eventSource: input.eventSource ?? "INTERNAL",
      idempotencyKey: input.idempotencyKey,
      actorId: input.actorId ?? undefined,
      locationId: runnableLines[0]?.locationId,
      occurredAt,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? undefined,
      postingBatchId: ledgerBatch?.id,
      documentHash,
      payload,
      metadata: {
        ...input.metadata,
        valuationMethod: "WEIGHTED_AVERAGE",
        ledgerStatus: ledgerBatch ? "BLOCKED" : "NOT_REQUIRED",
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: input.outboxEventName ?? input.eventType,
          payload: {
            eventType: input.eventType,
            sourceType: input.sourceType ?? null,
            sourceId: input.sourceId ?? null,
            documentHash,
            postingBatchId: ledgerBatch?.id ?? null,
            lineCount: runnableLines.length,
          },
        },
        ...(ledgerBatch
          ? [
              {
                channel: "NOTIFICATION" as const,
                eventName: "inventory.stock_event.ledger_blocked",
                payload: {
                  eventType: input.eventType,
                  postingBatchId: ledgerBatch.id,
                  blockerCode: input.ledgerBlocker?.blockerCode,
                  message: input.ledgerBlocker?.message,
                },
              },
            ]
          : []),
      ],
    })

    if (!eventResult.created) {
      return {
        eventId: eventResult.event.id,
        idempotencyKey: input.idempotencyKey,
        documentHash,
        movementTransactionIds: [],
        totalCost: new Prisma.Decimal(0),
        postingBatchId: ledgerBatch?.id,
        replayed: true,
      }
    }

    const movementTransactionIds: string[] = []
    let totalCost = new Prisma.Decimal(0)
    const now = new Date()

    for (const line of runnableLines) {
      const movement = await postStockLine(tx, {
        organizationId: input.organizationId,
        actorId: input.actorId,
        now,
        line,
      })

      if (!movement) continue
      movementTransactionIds.push(movement.movementId)
      totalCost = totalCost.plus(movement.totalCost).toDecimalPlaces(2)
    }

    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorId ?? null,
        entityType: "InventoryStockEvent",
        entityId: eventResult.event.id,
        action: "POST_INVENTORY_STOCK_EVENT",
        changes: {
          after: {
            eventType: input.eventType,
            idempotencyKey: input.idempotencyKey,
            documentHash,
            postingBatchId: ledgerBatch?.id ?? null,
            movementTransactionIds,
            totalCost: totalCost.toFixed(2),
          },
        },
      },
    })

    await markBusinessEventAppliedInTx(tx, input.organizationId, eventResult.event.id)

    return {
      eventId: eventResult.event.id,
      idempotencyKey: input.idempotencyKey,
      documentHash,
      movementTransactionIds,
      totalCost,
      postingBatchId: ledgerBatch?.id,
      replayed: false,
    }
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export function postOpeningStock(input: OpeningStockInput, client: DbClient = db) {
  const quantity = decimal3(input.quantity)
  const sourceId = `${input.itemId}:${input.locationId}`
  const idempotencyKey =
    input.idempotencyKey ?? `stock-opening:${input.organizationId}:${sourceId}`

  return postInventoryStockEvent(
    {
      organizationId: input.organizationId,
      eventType: "stock.opening_balance.posted",
      idempotencyKey,
      actorId: input.createdById,
      occurredAt: input.occurredAt,
      sourceType: AccountingSourceType.OPENING_BALANCE,
      sourceId,
      ledgerBlocker: {
        sourceType: AccountingSourceType.OPENING_BALANCE,
        sourceId,
        postingPurpose: AccountingPostingPurpose.OPENING_BALANCE,
        blockerCode: "OPENING_STOCK_LEDGER_REVIEW",
        message: "Opening stock was posted and requires explicit class 3 opening-balance ledger review.",
      },
      outboxEventName: "inventory.opening_stock.posted",
      lines: [
        {
          itemId: input.itemId,
          locationId: input.locationId,
          quantity,
          unitCost: input.unitCost,
          movementType: TransactionType.INITIAL_STOCK,
          referenceType: TransactionReferenceType.MANUAL,
          referenceId: sourceId,
          referenceNumber: input.referenceNumber ?? "OPENING_STOCK",
          notes: input.notes ?? "Opening stock",
        },
      ],
    },
    client,
  )
}

export function postManualStockCorrection(input: ManualStockCorrectionInput, client: DbClient = db) {
  const quantityDelta = decimal3(input.quantityDelta)
  if (!input.idempotencyKey) {
    throw new BusinessRuleError(
      "Manual stock corrections require an explicit idempotency key. Use the stock adjustment workflow for user-submitted corrections.",
    )
  }

  const idempotencyKey = input.idempotencyKey
  const sourceId = idempotencyKey

  return postInventoryStockEvent(
    {
      organizationId: input.organizationId,
      eventType: "stock.manual_correction.posted",
      idempotencyKey,
      actorId: input.actorId,
      occurredAt: input.occurredAt,
      sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
      sourceId,
      ledgerBlocker: {
        sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
        sourceId,
        postingPurpose: AccountingPostingPurpose.INVENTORY_ADJUSTMENT,
        blockerCode: "MANUAL_STOCK_CORRECTION_LEDGER_REVIEW",
        message: "Manual stock correction was posted and requires accounting review or conversion to a formal adjustment.",
      },
      outboxEventName: "inventory.manual_stock_correction.posted",
      metadata: {
        reason: input.reason,
        notes: input.notes ?? null,
      },
      lines: [
        {
          itemId: input.itemId,
          locationId: input.locationId,
          quantity: quantityDelta,
          unitCost: input.unitCost,
          movementType: quantityDelta.gt(0) ? TransactionType.ADJUSTMENT_IN : TransactionType.ADJUSTMENT_OUT,
          referenceType: TransactionReferenceType.MANUAL,
          referenceId: sourceId,
          referenceNumber: "MANUAL_STOCK_CORRECTION",
          notes: input.notes ?? input.reason,
        },
      ],
    },
    client,
  )
}

export function postGoodsReceiptStock(input: GoodsReceiptStockInput, client: DbClient = db) {
  const idempotencyKey =
    input.idempotencyKey ?? `goods-receipt-stock:${input.organizationId}:${input.receiptId}`

  return postInventoryStockEvent(
    {
      organizationId: input.organizationId,
      eventType: "purchase.goods_receipt.stock_posted",
      idempotencyKey,
      actorId: input.receivedById,
      occurredAt: input.occurredAt,
      sourceType: AccountingSourceType.GOODS_RECEIPT,
      sourceId: input.receiptId,
      ledgerBlocker: {
        sourceType: AccountingSourceType.GOODS_RECEIPT,
        sourceId: input.receiptId,
        postingPurpose: AccountingPostingPurpose.GOODS_RECEIPT,
        blockerCode: "GOODS_RECEIPT_LEDGER_REVIEW",
        message: "Goods receipt stock was posted and requires AP/stock ledger posting configuration.",
      },
      outboxEventName: "inventory.goods_receipt.stock_posted",
      metadata: {
        receiptNumber: input.receiptNumber,
      },
      lines: input.lines.map((line) => ({
        itemId: line.itemId,
        locationId: line.locationId,
        quantity: line.quantity,
        unitCost: line.unitCost,
        movementType: TransactionType.PURCHASE_RECEIPT,
        referenceType: TransactionReferenceType.GOODS_RECEIPT,
        referenceId: input.receiptId,
        referenceNumber: input.receiptNumber,
        notes: line.notes ?? "Goods received via purchase order",
        batchNumber: line.batchNumber ?? null,
        serialNumbers: line.serialNumbers ?? [],
        expiryDate: line.expiryDate ?? null,
      })),
    },
    client,
  )
}

export function postPOSStockIssue(input: POSStockIssueInput, client: DbClient = db) {
  const idempotencyKey =
    input.idempotencyKey ?? `pos-sale-stock:${input.organizationId}:${input.saleId}`

  return postInventoryStockEvent(
    {
      organizationId: input.organizationId,
      eventType: "pos.sale.stock_issued",
      eventSource: "POS",
      idempotencyKey,
      actorId: input.actorId,
      occurredAt: input.occurredAt,
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: input.saleId,
      outboxEventName: "inventory.pos_sale.stock_issued",
      metadata: {
        orderNumber: input.orderNumber,
      },
      lines: input.lines.map((line) => ({
        itemId: line.itemId,
        locationId: input.locationId,
        quantity: decimal3(line.quantity).times(-1),
        unitCost: line.unitCost,
        movementType: TransactionType.SALE,
        referenceType: TransactionReferenceType.SALES_ORDER,
        referenceId: input.saleId,
        referenceNumber: input.orderNumber,
        notes: line.notes ?? `POS sale ${input.orderNumber}`,
      })),
    },
    client,
  )
}

export function postPOSStockReturn(input: POSStockReturnInput, client: DbClient = db) {
  const sourceType =
    input.correctionType === "VOID" ? AccountingSourceType.POS_VOID : AccountingSourceType.POS_REFUND
  const idempotencyKey =
    input.idempotencyKey ??
    `pos-${input.correctionType.toLowerCase()}-stock:${input.organizationId}:${input.saleId}`

  return postInventoryStockEvent(
    {
      organizationId: input.organizationId,
      eventType: input.correctionType === "VOID" ? "pos.void.stock_returned" : "pos.refund.stock_returned",
      eventSource: "POS",
      idempotencyKey,
      actorId: input.actorId,
      occurredAt: input.occurredAt,
      sourceType,
      sourceId: input.saleId,
      outboxEventName:
        input.correctionType === "VOID"
          ? "inventory.pos_void.stock_returned"
          : "inventory.pos_refund.stock_returned",
      metadata: {
        orderNumber: input.orderNumber,
        reason: input.reason,
      },
      lines: input.lines.map((line) => ({
        itemId: line.itemId,
        locationId: input.locationId,
        quantity: line.quantity,
        unitCost: line.unitCost,
        movementType: TransactionType.SALES_RETURN,
        referenceType: TransactionReferenceType.SALES_ORDER,
        referenceId: input.saleId,
        referenceNumber: input.orderNumber,
        notes: line.notes ?? input.reason,
      })),
    },
    client,
  )
}

export function postInventoryReservation(input: InventoryReservationInput, client: DbClient = db) {
  const idempotencyKey =
    input.idempotencyKey ??
    `stock-reservation:${input.organizationId}:${input.itemId}:${input.locationId}:${input.actorId}:${Date.now()}`

  return postInventoryStockEvent(
    {
      organizationId: input.organizationId,
      eventType: "stock.reservation.posted",
      idempotencyKey,
      actorId: input.actorId,
      occurredAt: input.occurredAt,
      requiresOpenPeriod: false,
      outboxEventName: "inventory.reservation.posted",
      metadata: {
        reason: input.reason,
        expiresAt: input.expiresAt?.toISOString() ?? null,
      },
      lines: [
        {
          itemId: input.itemId,
          locationId: input.locationId,
          quantity: input.quantity,
          movementType: TransactionType.RESERVATION,
          referenceType: TransactionReferenceType.MANUAL,
          referenceNumber: "INVENTORY_RESERVATION",
          notes: input.reason,
        },
      ],
    },
    client,
  )
}
