import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  createStockTransferInputSchema,
  type CreateStockTransferInput,
  postStockTransferInputSchema,
  type PostStockTransferInput,
} from "./inventory-event.schemas"
import {
  ConcurrentStockUpdateError,
  InsufficientStockError,
} from "./inventory-errors"

type DbClient = Prisma.TransactionClient | typeof db

const transferInclude = {
  fromLocation: {
    select: {
      id: true,
      name: true,
      organizationId: true,
      isActive: true,
      deletedAt: true,
      requiresApproval: true,
    },
  },
  toLocation: {
    select: {
      id: true,
      name: true,
      organizationId: true,
      isActive: true,
      deletedAt: true,
      requiresApproval: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  lines: {
    include: {
      item: {
        select: {
          id: true,
          organizationId: true,
          sku: true,
          nameEn: true,
          nameFr: true,
          isActive: true,
          isDiscontinued: true,
          deletedAt: true,
          trackInventory: true,
          costPrice: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.StockTransferInclude

type StockTransferWithLines = Prisma.StockTransferGetPayload<{
  include: typeof transferInclude
}>

type InventoryLevelPlan = {
  source: Prisma.InventoryLevelGetPayload<{}>
  destination: Prisma.InventoryLevelGetPayload<{}> | null
  line: StockTransferWithLines["lines"][number]
  quantity: Prisma.Decimal
  unitCost: Prisma.Decimal
  lineValue: Prisma.Decimal
}

export type CreateStockTransferResult = {
  transfer: StockTransferWithLines
}

export type PostStockTransferResult = {
  transfer: StockTransferWithLines
  eventId: string
  idempotencyKey: string
  documentHash: string
  movementTransactionIds: string[]
  valuationMethod: "WEIGHTED_AVERAGE"
  replayed: boolean
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

function maxDecimal(left: Prisma.Decimal, right: Prisma.Decimal) {
  return left.gte(right) ? left : right
}

function displayName(item: { nameEn?: string | null; nameFr?: string | null; sku?: string | null } | null | undefined) {
  return item?.nameEn ?? item?.nameFr ?? item?.sku ?? "item"
}

function transferEventIdempotencyKey(transferId: string) {
  return `stock-transfer:${transferId}:posted`
}

async function generateTransferNumber(tx: Prisma.TransactionClient, organizationId: string): Promise<string> {
  const lastTransfer = await tx.stockTransfer.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { transferNumber: true },
  })

  const lastNumber = lastTransfer
    ? Number.parseInt(lastTransfer.transferNumber.replace("TR-", ""), 10)
    : 0
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1

  return `TR-${nextNumber.toString().padStart(6, "0")}`
}

function buildTransferDocumentPayload(transfer: StockTransferWithLines) {
  return {
    transferId: transfer.id,
    transferNumber: transfer.transferNumber,
    organizationId: transfer.organizationId,
    fromLocationId: transfer.fromLocationId,
    toLocationId: transfer.toLocationId,
    transferDate: transfer.transferDate.toISOString(),
    lines: transfer.lines.map((line) => ({
      lineId: line.id,
      itemId: line.itemId,
      sku: line.item.sku,
      requestedQuantity: String(line.requestedQuantity),
      unitCost: String(line.unitCost ?? line.item.costPrice ?? 0),
    })),
  }
}

function defaultDocumentHash(transfer: StockTransferWithLines) {
  return `sha256:${hashBusinessPayload(buildTransferDocumentPayload(transfer))}`
}

function buildBusinessEventPayload(params: {
  transfer: StockTransferWithLines
  plans: InventoryLevelPlan[]
  documentHash: string
  approvedById: string
}) {
  return {
    transferId: params.transfer.id,
    transferNumber: params.transfer.transferNumber,
    fromLocationId: params.transfer.fromLocationId,
    toLocationId: params.transfer.toLocationId,
    transferDocumentHash: params.documentHash,
    approvedById: params.approvedById,
    valuationMethod: "WEIGHTED_AVERAGE",
    movementReference: {
      referenceType: "STOCK_TRANSFER",
      referenceId: params.transfer.id,
      referenceNumber: params.transfer.transferNumber,
    },
    lines: params.plans.map((plan) => ({
      lineId: plan.line.id,
      itemId: plan.line.itemId,
      sku: plan.line.item.sku,
      requestedQuantity: plan.quantity.toFixed(3),
      shippedQuantity: plan.quantity.toFixed(3),
      receivedQuantity: plan.quantity.toFixed(3),
      unitCost: plan.unitCost.toFixed(2),
      totalValue: plan.lineValue.toFixed(2),
      sourceBalanceBefore: decimal3(plan.source.quantityOnHand).toFixed(3),
      destinationBalanceBefore: plan.destination
        ? decimal3(plan.destination.quantityOnHand).toFixed(3)
        : "0.000",
    })),
  }
}

async function assertTransferAccountingPeriodOpen(
  tx: Prisma.TransactionClient,
  organizationId: string,
  eventDate: Date,
) {
  try {
    await getOpenPeriodForDate(organizationId, eventDate, tx)
  } catch {
    throw new BusinessRuleError("An open accounting period is required before posting stock transfers.")
  }
}

function assertTransferCanPost(transfer: StockTransferWithLines, approvedById: string) {
  if (transfer.organizationId !== transfer.fromLocation.organizationId) {
    throw new BusinessRuleError("Source location does not belong to this organization.")
  }

  if (transfer.organizationId !== transfer.toLocation.organizationId) {
    throw new BusinessRuleError("Destination location does not belong to this organization.")
  }

  if (!transfer.fromLocation.isActive || transfer.fromLocation.deletedAt) {
    throw new BusinessRuleError("Source location is not active.")
  }

  if (!transfer.toLocation.isActive || transfer.toLocation.deletedAt) {
    throw new BusinessRuleError("Destination location is not active.")
  }

  if (transfer.fromLocationId === transfer.toLocationId) {
    throw new BusinessRuleError("Source and destination locations cannot be the same.")
  }

  if (transfer.status !== "DRAFT") {
    throw new BusinessRuleError(`Cannot post transfer with status: ${transfer.status}`)
  }

  if (transfer.lines.length === 0) {
    throw new BusinessRuleError("Transfer requires at least one stock line.")
  }

  if (
    transfer.createdById &&
    transfer.createdById === approvedById &&
    (transfer.fromLocation.requiresApproval || transfer.toLocation.requiresApproval)
  ) {
    throw new BusinessRuleError("A separate approver is required for transfers involving approval-controlled locations.")
  }
}

async function loadPostingPlans(
  tx: Prisma.TransactionClient,
  transfer: StockTransferWithLines,
): Promise<InventoryLevelPlan[]> {
  const plans: InventoryLevelPlan[] = []

  for (const line of transfer.lines) {
    if (line.item.organizationId !== transfer.organizationId) {
      throw new BusinessRuleError("Transfer line item does not belong to this organization.")
    }

    if (!line.item.isActive || line.item.isDiscontinued || line.item.deletedAt) {
      throw new BusinessRuleError(`Item ${line.item.sku} is not active for stock transfer posting.`)
    }

    if (!line.item.trackInventory) {
      throw new BusinessRuleError(`Item ${line.item.sku} is not inventory-tracked.`)
    }

    const quantity = decimal3(line.requestedQuantity)
    if (quantity.lte(0)) {
      throw new BusinessRuleError(`Transfer quantity for item ${line.item.sku} must be greater than zero.`)
    }

    const source = await tx.inventoryLevel.findUnique({
      where: {
        itemId_locationId: {
          itemId: line.itemId,
          locationId: transfer.fromLocationId,
        },
      },
    })

    if (!source) {
      throw new InsufficientStockError(`No inventory found for item ${line.item.sku} at the source location.`, {
        itemId: line.itemId,
        fromLocationId: transfer.fromLocationId,
      })
    }

    const sourceOnHand = decimal3(source.quantityOnHand)
    const sourceAvailable = decimal3(source.quantityAvailable)
    if (sourceOnHand.lt(quantity) || sourceAvailable.lt(quantity)) {
      throw new InsufficientStockError(
        `Insufficient inventory for item ${line.item.sku}. Available: ${sourceAvailable.toFixed(3)}, Required: ${quantity.toFixed(3)}`,
        {
          itemId: line.itemId,
          fromLocationId: transfer.fromLocationId,
          available: sourceAvailable.toFixed(3),
          required: quantity.toFixed(3),
        },
      )
    }

    const destination = await tx.inventoryLevel.findUnique({
      where: {
        itemId_locationId: {
          itemId: line.itemId,
          locationId: transfer.toLocationId,
        },
      },
    })

    const unitCost = money(source.averageCost).gt(0)
      ? money(source.averageCost)
      : money(line.unitCost ?? line.item.costPrice ?? 0)
    const lineValue = money(unitCost.times(quantity))

    plans.push({
      source,
      destination,
      line,
      quantity,
      unitCost,
      lineValue,
    })
  }

  return plans
}

async function createMovement(
  tx: Prisma.TransactionClient,
  input: {
    transfer: StockTransferWithLines
    line: StockTransferWithLines["lines"][number]
    locationId: string
    type: "TRANSFER_OUT" | "TRANSFER_IN"
    quantity: Prisma.Decimal
    unitCost: Prisma.Decimal
    lineValue: Prisma.Decimal
    balanceAfter: Prisma.Decimal
    createdById: string
  },
) {
  return tx.inventoryTransaction.create({
    data: {
      itemId: input.line.itemId,
      locationId: input.locationId,
      organizationId: input.transfer.organizationId,
      createdById: input.createdById,
      type: input.type,
      quantity: input.quantity,
      unitCost: input.unitCost,
      totalCost: input.lineValue,
      balanceAfter: input.balanceAfter,
      referenceType: "STOCK_TRANSFER",
      referenceId: input.transfer.id,
      referenceNumber: input.transfer.transferNumber,
      notes:
        input.type === "TRANSFER_OUT"
          ? `Transfer out to ${input.transfer.toLocation.name}`
          : `Transfer in from ${input.transfer.fromLocation.name}`,
    },
  })
}

async function postPlan(
  tx: Prisma.TransactionClient,
  transfer: StockTransferWithLines,
  plan: InventoryLevelPlan,
  approvedById: string,
  now: Date,
) {
  const zero = new Prisma.Decimal(0)
  const sourceOnHand = decimal3(plan.source.quantityOnHand)
  const sourceAvailable = decimal3(plan.source.quantityAvailable)
  const nextSourceOnHand = sourceOnHand.minus(plan.quantity).toDecimalPlaces(3)
  const nextSourceAvailable = sourceAvailable.minus(plan.quantity).toDecimalPlaces(3)
  const nextSourceValue = money(nextSourceOnHand.times(plan.unitCost))

  const sourceUpdate = await tx.inventoryLevel.updateMany({
    where: {
      id: plan.source.id,
      version: plan.source.version,
      quantityOnHand: { gte: plan.quantity },
      quantityAvailable: { gte: plan.quantity },
    },
    data: {
      quantityOnHand: nextSourceOnHand,
      quantityAvailable: nextSourceAvailable,
      totalValue: nextSourceValue,
      lastTransactionAt: now,
      version: { increment: 1 },
    },
  })

  if (sourceUpdate.count !== 1) {
    throw new ConcurrentStockUpdateError(`Inventory changed while posting transfer line for item ${plan.line.item.sku}.`)
  }

  const movementOut = await createMovement(tx, {
    transfer,
    line: plan.line,
    locationId: transfer.fromLocationId,
    type: "TRANSFER_OUT",
    quantity: plan.quantity.times(-1).toDecimalPlaces(3),
    unitCost: plan.unitCost,
    lineValue: plan.lineValue,
    balanceAfter: nextSourceOnHand,
    createdById: approvedById,
  })

  let nextDestinationOnHand = plan.quantity
  let nextDestinationAverageCost = plan.unitCost
  let nextDestinationValue = plan.lineValue

  if (plan.destination) {
    const destinationOnHand = decimal3(plan.destination.quantityOnHand)
    const destinationReserved = decimal3(plan.destination.quantityReserved)
    const destinationValue = money(plan.destination.totalValue)
    nextDestinationOnHand = destinationOnHand.plus(plan.quantity).toDecimalPlaces(3)
    nextDestinationValue = money(destinationValue.plus(plan.lineValue))
    nextDestinationAverageCost = nextDestinationOnHand.gt(0)
      ? money(nextDestinationValue.div(nextDestinationOnHand))
      : zero

    const destinationUpdate = await tx.inventoryLevel.updateMany({
      where: {
        id: plan.destination.id,
        version: plan.destination.version,
      },
      data: {
        quantityOnHand: nextDestinationOnHand,
        quantityAvailable: maxDecimal(nextDestinationOnHand.minus(destinationReserved).toDecimalPlaces(3), zero),
        averageCost: nextDestinationAverageCost,
        totalValue: nextDestinationValue,
        lastTransactionAt: now,
        version: { increment: 1 },
      },
    })

    if (destinationUpdate.count !== 1) {
      throw new ConcurrentStockUpdateError(`Inventory changed while receiving transfer line for item ${plan.line.item.sku}.`)
    }
  } else {
    await tx.inventoryLevel.create({
      data: {
        itemId: plan.line.itemId,
        locationId: transfer.toLocationId,
        quantityOnHand: plan.quantity,
        quantityAvailable: plan.quantity,
        quantityReserved: zero,
        quantityInTransit: zero,
        quantityOnOrder: zero,
        reorderPoint: zero,
        averageCost: plan.unitCost,
        totalValue: plan.lineValue,
        lastTransactionAt: now,
      },
    })
  }

  const movementIn = await createMovement(tx, {
    transfer,
    line: plan.line,
    locationId: transfer.toLocationId,
    type: "TRANSFER_IN",
    quantity: plan.quantity,
    unitCost: nextDestinationAverageCost,
    lineValue: plan.lineValue,
    balanceAfter: nextDestinationOnHand,
    createdById: approvedById,
  })

  await tx.stockTransferLine.update({
    where: { id: plan.line.id },
    data: {
      shippedQuantity: plan.quantity,
      receivedQuantity: plan.quantity,
    },
  })

  return [movementOut.id, movementIn.id]
}

async function loadTransferForReplay(
  tx: Prisma.TransactionClient,
  organizationId: string,
  transferId: string,
) {
  const transfer = await tx.stockTransfer.findFirst({
    where: { id: transferId, organizationId, deletedAt: null },
    include: transferInclude,
  })

  if (!transfer) {
    throw new NotFoundError("Transfer not found or you do not have permission to post it.")
  }

  return transfer
}

export async function createStockTransfer(
  input: CreateStockTransferInput,
  client: DbClient = db,
): Promise<CreateStockTransferResult> {
  const parsed = createStockTransferInputSchema.parse(input)

  const run = async (tx: Prisma.TransactionClient): Promise<CreateStockTransferResult> => {
    if (parsed.fromLocationId === parsed.toLocationId) {
      throw new BusinessRuleError("Source and destination locations cannot be the same.")
    }

    const [fromLocation, toLocation] = await Promise.all([
      tx.location.findFirst({
        where: { id: parsed.fromLocationId, organizationId: parsed.organizationId },
        select: { id: true, name: true, isActive: true, deletedAt: true },
      }),
      tx.location.findFirst({
        where: { id: parsed.toLocationId, organizationId: parsed.organizationId },
        select: { id: true, name: true, isActive: true, deletedAt: true },
      }),
    ])

    if (!fromLocation) {
      throw new NotFoundError("Source location not found or you do not have permission to use it.")
    }

    if (!toLocation) {
      throw new NotFoundError("Destination location not found or you do not have permission to use it.")
    }

    if (!fromLocation.isActive || fromLocation.deletedAt) {
      throw new BusinessRuleError("Source location is not active.")
    }

    if (!toLocation.isActive || toLocation.deletedAt) {
      throw new BusinessRuleError("Destination location is not active.")
    }

    const requestedByItem = new Map<string, Prisma.Decimal>()
    for (const line of parsed.lines) {
      const quantity = decimal3(line.requestedQuantity)
      if (quantity.lte(0)) {
        throw new BusinessRuleError("Transfer quantities must be greater than zero.")
      }
      requestedByItem.set(line.itemId, (requestedByItem.get(line.itemId) ?? decimal(0)).plus(quantity))
    }

    const itemIds = [...requestedByItem.keys()]
    const items = await tx.item.findMany({
      where: {
        id: { in: itemIds },
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        sku: true,
        nameEn: true,
        nameFr: true,
        costPrice: true,
        isActive: true,
        isDiscontinued: true,
        trackInventory: true,
      },
    })

    if (items.length !== itemIds.length) {
      throw new NotFoundError("One or more items were not found or do not belong to this organization.")
    }

    const itemById = new Map(items.map((item) => [item.id, item]))

    for (const item of items) {
      if (!item.isActive || item.isDiscontinued) {
        throw new BusinessRuleError(`Item ${displayName(item)} is not active for stock transfer.`)
      }

      if (!item.trackInventory) {
        throw new BusinessRuleError(`Item ${displayName(item)} is not inventory-tracked.`)
      }
    }

    for (const [itemId, requestedQuantity] of requestedByItem.entries()) {
      const inventory = await tx.inventoryLevel.findUnique({
        where: {
          itemId_locationId: {
            itemId,
            locationId: parsed.fromLocationId,
          },
        },
      })

      const available = inventory ? decimal3(inventory.quantityAvailable) : decimal(0)
      if (!inventory || available.lt(requestedQuantity)) {
        const item = itemById.get(itemId)
        throw new InsufficientStockError(
          `Insufficient inventory for ${displayName(item)}. Available: ${available.toFixed(3)}, Required: ${requestedQuantity.toFixed(3)}`,
          {
            itemId,
            fromLocationId: parsed.fromLocationId,
            available: available.toFixed(3),
            required: requestedQuantity.toFixed(3),
          },
        )
      }
    }

    const transferNumber = await generateTransferNumber(tx, parsed.organizationId)

    try {
      const transfer = await tx.stockTransfer.create({
        data: {
          transferNumber,
          transferDate: new Date(),
          expectedDate: parsed.requestedDate,
          fromLocationId: parsed.fromLocationId,
          toLocationId: parsed.toLocationId,
          status: "DRAFT",
          notes: parsed.notes ?? "",
          organizationId: parsed.organizationId,
          createdById: parsed.createdById,
          lines: {
            create: parsed.lines.map((line) => ({
              itemId: line.itemId,
              requestedQuantity: decimal3(line.requestedQuantity),
              unitCost: money(itemById.get(line.itemId)?.costPrice ?? 0),
              notes: line.notes ?? "",
            })),
          },
        },
        include: transferInclude,
      })

      await tx.auditLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: parsed.createdById,
          entityType: "StockTransfer",
          entityId: transfer.id,
          action: "CREATE_STOCK_TRANSFER",
          changes: {
            after: {
              transferNumber,
              fromLocationId: parsed.fromLocationId,
              toLocationId: parsed.toLocationId,
              lineCount: parsed.lines.length,
              requestedDate: parsed.requestedDate?.toISOString(),
            },
          },
        },
      })

      return { transfer }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("A transfer with the generated number already exists. Please retry.")
      }
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Stock transfer could not be created. Please try again.",
        500,
        false,
        { operation: "createStockTransfer" },
      )
    }
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export async function postStockTransfer(
  input: PostStockTransferInput,
  client: DbClient = db,
): Promise<PostStockTransferResult> {
  const parsed = postStockTransferInputSchema.parse(input)
  const run = async (tx: Prisma.TransactionClient): Promise<PostStockTransferResult> => {
    const idempotencyKey = parsed.idempotencyKey ?? transferEventIdempotencyKey(parsed.transferId)
    const transfer = await loadTransferForReplay(tx, parsed.organizationId, parsed.transferId)

    const existingEvent = await tx.businessEvent.findUnique({
      where: {
        organizationId_eventSource_idempotencyKey: {
          organizationId: parsed.organizationId,
          eventSource: "INTERNAL",
          idempotencyKey,
        },
      },
    })

    if (existingEvent) {
      if (
        existingEvent.eventType !== "stock.transfer.posted" ||
        existingEvent.sourceType !== "STOCK_TRANSFER" ||
        existingEvent.sourceId !== transfer.id
      ) {
        throw new ConflictError("Stock transfer idempotency key is already used by another business event.")
      }

      if (transfer.approvedById && transfer.approvedById !== parsed.approvedById) {
        throw new ConflictError("Stock transfer idempotency key was replayed by a different approver.")
      }

      return {
        transfer,
        eventId: existingEvent.id,
        idempotencyKey,
        documentHash: existingEvent.documentHash ?? defaultDocumentHash(transfer),
        movementTransactionIds: [],
        valuationMethod: "WEIGHTED_AVERAGE",
        replayed: true,
      }
    }

    assertTransferCanPost(transfer, parsed.approvedById)
    const occurredAt = parsed.occurredAt ?? transfer.transferDate
    await assertTransferAccountingPeriodOpen(tx, parsed.organizationId, occurredAt)

    const plans = await loadPostingPlans(tx, transfer)
    const documentHash = parsed.documentHash ?? defaultDocumentHash(transfer)
    const eventPayload = buildBusinessEventPayload({
      transfer,
      plans,
      documentHash,
      approvedById: parsed.approvedById,
    })

    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "stock.transfer.posted",
      eventSource: "INTERNAL",
      idempotencyKey,
      actorId: parsed.approvedById,
      locationId: transfer.fromLocationId,
      occurredAt,
      sourceType: "STOCK_TRANSFER",
      sourceId: transfer.id,
      documentHash,
      payload: eventPayload,
      metadata: {
        correlationId: parsed.correlationId,
        valuationMethod: "WEIGHTED_AVERAGE",
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "stock.transfer.posted",
          payload: {
            transferId: transfer.id,
            transferNumber: transfer.transferNumber,
            fromLocationId: transfer.fromLocationId,
            toLocationId: transfer.toLocationId,
            lineCount: transfer.lines.length,
          },
        },
      ],
    })

    if (!eventResult.created) {
      return {
        transfer,
        eventId: eventResult.event.id,
        idempotencyKey,
        documentHash,
        movementTransactionIds: [],
        valuationMethod: "WEIGHTED_AVERAGE",
        replayed: true,
      }
    }

    const now = new Date()
    const movementTransactionIds: string[] = []

    for (const plan of plans) {
      const movementIds = await postPlan(tx, transfer, plan, parsed.approvedById, now)
      movementTransactionIds.push(...movementIds)
    }

    const postedTransfer = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: "COMPLETED",
        approvedById: parsed.approvedById,
        approvedAt: now,
        actualDate: now,
      },
      include: transferInclude,
    })

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.approvedById,
        entityType: "StockTransfer",
        entityId: transfer.id,
        action: "POST_STOCK_TRANSFER",
        changes: {
          after: {
            eventId: eventResult.event.id,
            idempotencyKey,
            documentHash,
            movementTransactionIds,
            fromLocationId: transfer.fromLocationId,
            toLocationId: transfer.toLocationId,
            valuationMethod: "WEIGHTED_AVERAGE",
          },
        },
      },
    })

    await markBusinessEventAppliedInTx(tx, parsed.organizationId, eventResult.event.id)

    return {
      transfer: postedTransfer,
      eventId: eventResult.event.id,
      idempotencyKey,
      documentHash,
      movementTransactionIds,
      valuationMethod: "WEIGHTED_AVERAGE",
      replayed: false,
    }
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}
