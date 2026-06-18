import { AccountingSourceType, AdjustmentType, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  createStockCountSessionInputSchema,
  postStockCountInputSchema,
  submitStockCountSessionInputSchema,
  type CreateStockCountSessionInput,
  type PostStockCountInput,
  type SubmitStockCountSessionInput,
} from "./inventory-event.schemas"
import {
  InventorySoDViolationError,
  MissingInventoryEvidenceError,
} from "./inventory-errors"
import {
  createStockAdjustment,
  postStockAdjustment,
  type PostStockAdjustmentResult,
} from "./inventory-adjustment.service"

type DbClient = Prisma.TransactionClient | typeof db

const countSessionInclude = {
  location: {
    select: {
      id: true,
      name: true,
      organizationId: true,
      isActive: true,
      deletedAt: true,
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
  submittedBy: {
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
  postedBy: {
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
} satisfies Prisma.StockCountSessionInclude

type StockCountSessionWithLines = Prisma.StockCountSessionGetPayload<{
  include: typeof countSessionInclude
}>

type StockCountSnapshot = {
  item: {
    id: string
    sku: string
    nameEn: string
    nameFr: string | null
    costPrice: Prisma.Decimal
  }
  level: {
    quantityOnHand: Prisma.Decimal
    averageCost: Prisma.Decimal
    totalValue: Prisma.Decimal
  } | null
}

export type CreateStockCountSessionResult = StockCountSessionWithLines
export type SubmitStockCountSessionResult = StockCountSessionWithLines

export type PostStockCountResult = {
  countSession: StockCountSessionWithLines
  eventId: string
  idempotencyKey: string
  countSheetHash: string
  snapshotHash?: string
  varianceLineCount: number
  totalVarianceValue: string
  generatedAdjustmentId?: string
  generatedAdjustmentEventId?: string
  generatedAdjustmentLedgerStatus?: PostStockAdjustmentResult["ledger"]["status"]
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

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}

function hashWithPrefix(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`
}

async function nextCountNumber(tx: Prisma.TransactionClient, organizationId: string, countDate: Date) {
  const prefix = `CNT-${compactDate(countDate)}`
  const count = await tx.stockCountSession.count({
    where: {
      organizationId,
      countNumber: { startsWith: prefix },
    },
  })

  return `${prefix}-${String(count + 1).padStart(4, "0")}`
}

function countEventIdempotencyKey(countSessionId: string) {
  return `stock-count:${countSessionId}:validated`
}

function countAdjustmentIdempotencyKey(countSessionId: string) {
  return `stock-count:${countSessionId}:variance-adjustment`
}

function snapshotHash(input: {
  organizationId: string
  locationId: string
  countDate: Date
  snapshots: StockCountSnapshot[]
}) {
  return hashWithPrefix({
    organizationId: input.organizationId,
    locationId: input.locationId,
    countDate: input.countDate.toISOString(),
    lines: input.snapshots.map(({ item, level }) => ({
      itemId: item.id,
      sku: item.sku,
      systemQuantity: decimal3(level?.quantityOnHand ?? 0).toFixed(3),
      unitCost: money(level?.averageCost ?? item.costPrice ?? 0).toFixed(2),
      totalValue: money(level?.totalValue ?? 0).toFixed(2),
    })),
  })
}

function countSheetPayload(input: {
  session: StockCountSessionWithLines
  countSheetHash: string
  approvedById: string
  adjustmentResult?: PostStockAdjustmentResult
}) {
  const varianceLines = input.session.lines.filter((line) =>
    !decimal3(line.varianceQuantity ?? 0).eq(0),
  )
  const totalVarianceValue = varianceLines
    .reduce((total, line) => total.plus(line.varianceValue ?? 0), new Prisma.Decimal(0))
    .toDecimalPlaces(2)

  return {
    countSessionId: input.session.id,
    countNumber: input.session.countNumber,
    locationId: input.session.locationId,
    snapshotHash: input.session.snapshotHash,
    countSheetHash: input.countSheetHash,
    approvedById: input.approvedById,
    varianceLineCount: varianceLines.length,
    totalVarianceValue: totalVarianceValue.toFixed(2),
    generatedAdjustmentId: input.adjustmentResult?.adjustment.id,
    generatedAdjustmentEventId: input.adjustmentResult?.eventId,
    generatedAdjustmentLedgerStatus: input.adjustmentResult?.ledger.status,
    lines: input.session.lines.map((line) => ({
      lineId: line.id,
      itemId: line.itemId,
      sku: line.item.sku,
      systemQuantity: decimal3(line.systemQuantity).toFixed(3),
      countedQuantity: line.countedQuantity == null ? null : decimal3(line.countedQuantity).toFixed(3),
      varianceQuantity: line.varianceQuantity == null ? null : decimal3(line.varianceQuantity).toFixed(3),
      unitCost: money(line.unitCost ?? line.item.costPrice ?? 0).toFixed(2),
      varianceValue: money(line.varianceValue ?? 0).toFixed(2),
      reasonCode: line.reasonCode,
      evidenceHash: line.evidenceHash,
    })),
  }
}

async function loadCountSession(
  tx: Prisma.TransactionClient,
  organizationId: string,
  countSessionId: string,
) {
  const session = await tx.stockCountSession.findFirst({
    where: {
      id: countSessionId,
      organizationId,
    },
    include: countSessionInclude,
  })

  if (!session) {
    throw new NotFoundError("Stock count session not found or you do not have permission to access it.")
  }

  return session
}

function assertCountCanPost(
  session: StockCountSessionWithLines,
  approvedById: string,
  countSheetHash?: string | null,
) {
  if (session.organizationId !== session.location.organizationId) {
    throw new BusinessRuleError("Count location does not belong to this organization.")
  }

  if (!session.location.isActive || session.location.deletedAt) {
    throw new BusinessRuleError("Count location is not active.")
  }

  if (!["SUBMITTED", "APPROVED"].includes(session.status)) {
    throw new BusinessRuleError(`Cannot post stock count with status: ${session.status}`)
  }

  if (!countSheetHash) {
    throw new MissingInventoryEvidenceError("Count sheet hash is required before posting a physical count.", {
      countSessionId: session.id,
    })
  }

  if (session.submittedById && session.submittedById === approvedById) {
    throw new InventorySoDViolationError("The user who submitted the stock count cannot approve and post it.", {
      countSessionId: session.id,
      submittedById: session.submittedById,
      approvedById,
    })
  }

  if (session.createdById && session.createdById === approvedById) {
    throw new InventorySoDViolationError("The user who created the stock count cannot approve and post it.", {
      countSessionId: session.id,
      createdById: session.createdById,
      approvedById,
    })
  }

  if (session.lines.length === 0) {
    throw new BusinessRuleError("Stock count requires at least one frozen line.")
  }

  const uncountedLine = session.lines.find((line) => line.countedQuantity == null || line.varianceQuantity == null)
  if (uncountedLine) {
    throw new BusinessRuleError(`Stock count line for item ${uncountedLine.item.sku} has not been counted.`)
  }
}

async function getCountSnapshots(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    locationId: string
    itemIds?: string[]
  },
): Promise<StockCountSnapshot[]> {
  const itemIds = Array.from(new Set(input.itemIds ?? []))

  if (itemIds.length > 0) {
    const [items, levels] = await Promise.all([
      tx.item.findMany({
        where: {
          id: { in: itemIds },
          organizationId: input.organizationId,
          isActive: true,
          isDiscontinued: false,
          deletedAt: null,
          trackInventory: true,
        },
        select: {
          id: true,
          sku: true,
          nameEn: true,
          nameFr: true,
          costPrice: true,
        },
        orderBy: { sku: "asc" },
      }),
      tx.inventoryLevel.findMany({
        where: {
          locationId: input.locationId,
          itemId: { in: itemIds },
        },
      }),
    ])

    if (items.length !== itemIds.length) {
      throw new BusinessRuleError("One or more stock count items were not found for this organization.")
    }

    const levelsByItemId = new Map(levels.map((level) => [level.itemId, level]))
    return items.map((item) => ({
      item,
      level: levelsByItemId.get(item.id) ?? null,
    }))
  }

  const levels = await tx.inventoryLevel.findMany({
    where: {
      locationId: input.locationId,
      item: {
        organizationId: input.organizationId,
        isActive: true,
        isDiscontinued: false,
        deletedAt: null,
        trackInventory: true,
      },
    },
    include: {
      item: {
        select: {
          id: true,
          sku: true,
          nameEn: true,
          nameFr: true,
          costPrice: true,
        },
      },
    },
    orderBy: { itemId: "asc" },
  })

  return levels.map((level) => ({
    item: level.item,
    level,
  }))
}

export async function createStockCountSession(
  input: CreateStockCountSessionInput,
  client: DbClient = db,
): Promise<CreateStockCountSessionResult> {
  const parsed = createStockCountSessionInputSchema.parse(input)
  const run = async (tx: Prisma.TransactionClient) => {
    const countDate = parsed.countDate ?? new Date()
    const location = await tx.location.findFirst({
      where: {
        id: parsed.locationId,
        organizationId: parsed.organizationId,
        isActive: true,
        deletedAt: null,
      },
    })

    if (!location) throw new NotFoundError("Stock count location not found.")

    const snapshots = await getCountSnapshots(tx, {
      organizationId: parsed.organizationId,
      locationId: parsed.locationId,
      itemIds: parsed.itemIds,
    })

    if (snapshots.length === 0) {
      throw new BusinessRuleError("Stock count requires at least one active inventory-tracked item.")
    }

    const countNumber = parsed.countNumber ?? await nextCountNumber(tx, parsed.organizationId, countDate)
    const frozenHash = snapshotHash({
      organizationId: parsed.organizationId,
      locationId: parsed.locationId,
      countDate,
      snapshots,
    })

    const session = await tx.stockCountSession.create({
      data: {
        organizationId: parsed.organizationId,
        locationId: parsed.locationId,
        countNumber,
        status: "FROZEN",
        countDate,
        snapshotHash: frozenHash,
        notes: parsed.notes ?? null,
        createdById: parsed.createdById,
        metadata: parsed.metadata as Prisma.InputJsonValue | undefined,
        lines: {
          create: snapshots.map(({ item, level }) => ({
            itemId: item.id,
            locationId: parsed.locationId,
            systemQuantity: decimal3(level?.quantityOnHand ?? 0),
            unitCost: money(level?.averageCost ?? item.costPrice ?? 0),
            varianceValue: new Prisma.Decimal(0),
          })),
        },
      },
      include: countSessionInclude,
    })

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.createdById,
        entityType: "StockCountSession",
        entityId: session.id,
        action: "CREATE_STOCK_COUNT_SESSION",
        changes: {
          after: {
            countNumber: session.countNumber,
            status: session.status,
            snapshotHash: session.snapshotHash,
            lineCount: session.lines.length,
          },
        },
      },
    })

    return session
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export async function submitStockCountSession(
  input: SubmitStockCountSessionInput,
  client: DbClient = db,
): Promise<SubmitStockCountSessionResult> {
  const parsed = submitStockCountSessionInputSchema.parse(input)
  const run = async (tx: Prisma.TransactionClient) => {
    const session = await loadCountSession(tx, parsed.organizationId, parsed.countSessionId)

    if (!["DRAFT", "FROZEN"].includes(session.status)) {
      throw new BusinessRuleError(`Cannot submit stock count with status: ${session.status}`)
    }

    const linesById = new Map(session.lines.map((line) => [line.id, line]))
    const linesByItemId = new Map(session.lines.map((line) => [line.itemId, line]))
    const updates = []
    const seenLineIds = new Set<string>()

    for (const inputLine of parsed.lines) {
      const line = inputLine.lineId
        ? linesById.get(inputLine.lineId)
        : inputLine.itemId
          ? linesByItemId.get(inputLine.itemId)
          : undefined

      if (!line) {
        throw new BusinessRuleError("Submitted count line does not belong to this stock count session.")
      }

      if (seenLineIds.has(line.id)) {
        throw new BusinessRuleError(`Duplicate submitted count line for item ${line.item.sku}.`)
      }

      seenLineIds.add(line.id)
      const countedQuantity = decimal3(inputLine.countedQuantity)
      const varianceQuantity = countedQuantity.minus(line.systemQuantity).toDecimalPlaces(3)
      const unitCost = money(line.unitCost ?? line.item.costPrice ?? 0)
      const varianceValue = money(varianceQuantity.abs().times(unitCost))

      updates.push({
        line,
        countedQuantity,
        varianceQuantity,
        unitCost,
        varianceValue,
        reasonCode: inputLine.reasonCode ?? null,
        evidenceHash: inputLine.evidenceHash ?? null,
        metadata: inputLine.metadata as Prisma.InputJsonValue | undefined,
      })
    }

    if (updates.length !== session.lines.length) {
      throw new BusinessRuleError("Every frozen count line must be submitted before the count can be approved.")
    }

    for (const update of updates) {
      await tx.stockCountLine.update({
        where: { id: update.line.id },
        data: {
          countedQuantity: update.countedQuantity,
          varianceQuantity: update.varianceQuantity,
          unitCost: update.unitCost,
          varianceValue: update.varianceValue,
          reasonCode: update.reasonCode,
          evidenceHash: update.evidenceHash,
          metadata: update.metadata,
        },
      })
    }

    const totalVarianceValue = updates
      .reduce((total, update) => total.plus(update.varianceValue), new Prisma.Decimal(0))
      .toDecimalPlaces(2)
    const varianceLineCount = updates.filter((update) => !update.varianceQuantity.eq(0)).length
    const now = new Date()
    const submitted = await tx.stockCountSession.update({
      where: { id: session.id },
      data: {
        status: "SUBMITTED",
        countSheetHash: parsed.countSheetHash,
        submittedById: parsed.submittedById,
        submittedAt: now,
      },
      include: countSessionInclude,
    })

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.submittedById,
        entityType: "StockCountSession",
        entityId: session.id,
        action: "SUBMIT_STOCK_COUNT_SESSION",
        changes: {
          after: {
            countSheetHash: parsed.countSheetHash,
            varianceLineCount,
            totalVarianceValue: totalVarianceValue.toFixed(2),
          },
        },
      },
    })

    return submitted
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export async function postStockCount(
  input: PostStockCountInput,
  client: DbClient = db,
): Promise<PostStockCountResult> {
  const parsed = postStockCountInputSchema.parse(input)
  const run = async (tx: Prisma.TransactionClient): Promise<PostStockCountResult> => {
    const idempotencyKey = parsed.idempotencyKey ?? countEventIdempotencyKey(parsed.countSessionId)
    const session = await loadCountSession(tx, parsed.organizationId, parsed.countSessionId)

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
      if (existingEvent.sourceType !== AccountingSourceType.STOCK_COUNT || existingEvent.sourceId !== session.id) {
        throw new ConflictError("Stock count idempotency key is already used by another business event.")
      }

      if (session.approvedById && session.approvedById !== parsed.approvedById) {
        throw new ConflictError("Stock count idempotency key was replayed by a different approver.")
      }

      const varianceLines = session.lines.filter((line) => !decimal3(line.varianceQuantity ?? 0).eq(0))
      const totalVarianceValue = varianceLines
        .reduce((total, line) => total.plus(line.varianceValue ?? 0), new Prisma.Decimal(0))
        .toDecimalPlaces(2)

      return {
        countSession: session,
        eventId: existingEvent.id,
        idempotencyKey,
        countSheetHash: existingEvent.documentHash ?? session.countSheetHash ?? "",
        snapshotHash: session.snapshotHash ?? undefined,
        varianceLineCount: varianceLines.length,
        totalVarianceValue: totalVarianceValue.toFixed(2),
        generatedAdjustmentId: session.postedAdjustmentId ?? undefined,
        replayed: true,
      }
    }

    const countSheetHash = parsed.countSheetHash ?? session.countSheetHash
    assertCountCanPost(session, parsed.approvedById, countSheetHash)
    const occurredAt = parsed.occurredAt ?? session.countDate
    await getOpenPeriodForDate(parsed.organizationId, occurredAt, tx)

    const varianceLines = session.lines.filter((line) => !decimal3(line.varianceQuantity ?? 0).eq(0))
    const totalVarianceValue = varianceLines
      .reduce((total, line) => total.plus(line.varianceValue ?? 0), new Prisma.Decimal(0))
      .toDecimalPlaces(2)
    let adjustmentResult: PostStockAdjustmentResult | undefined

    if (varianceLines.length > 0) {
      const generatedAdjustment = await createStockAdjustment(
        {
          organizationId: parsed.organizationId,
          locationId: session.locationId,
          type: AdjustmentType.PHYSICAL_COUNT,
          reason: `Physical count variance ${session.countNumber}`,
          createdById: session.submittedById ?? session.createdById ?? parsed.approvedById,
          adjustmentDate: occurredAt,
          evidenceHash: countSheetHash!,
          documentHash: countSheetHash!,
          sourceCountSessionId: session.id,
          metadata: {
            generatedBy: "inventory-count.service",
            countSessionId: session.id,
            countNumber: session.countNumber,
          },
          lines: varianceLines.map((line) => ({
            itemId: line.itemId,
            systemQuantity: decimal3(line.systemQuantity).toFixed(3),
            actualQuantity: decimal3(line.countedQuantity ?? 0).toFixed(3),
            adjustedQuantity: decimal3(line.varianceQuantity ?? 0).toFixed(3),
            unitCost: money(line.unitCost ?? line.item.costPrice ?? 0).toFixed(2),
            evidenceHash: line.evidenceHash ?? countSheetHash!,
            stockCountLineId: line.id,
            metadata: {
              countSessionId: session.id,
              countLineId: line.id,
              reasonCode: line.reasonCode,
            },
          })),
        },
        tx,
      )

      adjustmentResult = await postStockAdjustment(
        {
          organizationId: parsed.organizationId,
          adjustmentId: generatedAdjustment.id,
          approvedById: parsed.approvedById,
          idempotencyKey: countAdjustmentIdempotencyKey(session.id),
          occurredAt,
          evidenceHash: countSheetHash!,
          documentHash: countSheetHash!,
          correlationId: parsed.correlationId,
        },
        tx,
      )
    }

    const payload = countSheetPayload({
      session,
      countSheetHash: countSheetHash!,
      approvedById: parsed.approvedById,
      adjustmentResult,
    })
    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "inventory.physical_count.validated",
      eventSource: "INTERNAL",
      idempotencyKey,
      actorId: parsed.approvedById,
      locationId: session.locationId,
      occurredAt,
      sourceType: AccountingSourceType.STOCK_COUNT,
      sourceId: session.id,
      postingBatchId: adjustmentResult?.ledger.postingBatchId,
      documentHash: countSheetHash!,
      payload,
      metadata: {
        correlationId: parsed.correlationId,
        snapshotHash: session.snapshotHash,
        varianceLineCount: varianceLines.length,
        totalVarianceValue: totalVarianceValue.toFixed(2),
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "inventory.physical_count.validated",
          payload: {
            countSessionId: session.id,
            countNumber: session.countNumber,
            locationId: session.locationId,
            varianceLineCount: varianceLines.length,
            totalVarianceValue: totalVarianceValue.toFixed(2),
            generatedAdjustmentId: adjustmentResult?.adjustment.id,
            generatedAdjustmentLedgerStatus: adjustmentResult?.ledger.status,
          },
        },
        ...(varianceLines.length > 0
          ? [
              {
                channel: "NOTIFICATION" as const,
                eventName: "stock.count.variance_posted",
                payload: {
                  countSessionId: session.id,
                  countNumber: session.countNumber,
                  generatedAdjustmentId: adjustmentResult?.adjustment.id,
                  generatedAdjustmentEventId: adjustmentResult?.eventId,
                  ledgerStatus: adjustmentResult?.ledger.status,
                  postingBatchId: adjustmentResult?.ledger.postingBatchId,
                },
              },
            ]
          : []),
      ],
    })

    const now = new Date()
    const postedSession = await tx.stockCountSession.update({
      where: { id: session.id },
      data: {
        status: "POSTED",
        approvedById: parsed.approvedById,
        approvedAt: now,
        postedById: parsed.approvedById,
        postedAt: now,
        countSheetHash,
        postedBusinessEventId: eventResult.event.id,
        postedAdjustmentId: adjustmentResult?.adjustment.id ?? null,
      },
      include: countSessionInclude,
    })

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.approvedById,
        entityType: "StockCountSession",
        entityId: session.id,
        action: "POST_STOCK_COUNT_SESSION",
        changes: {
          after: {
            eventId: eventResult.event.id,
            idempotencyKey,
            countSheetHash,
            snapshotHash: session.snapshotHash,
            varianceLineCount: varianceLines.length,
            totalVarianceValue: totalVarianceValue.toFixed(2),
            generatedAdjustmentId: adjustmentResult?.adjustment.id,
            generatedAdjustmentEventId: adjustmentResult?.eventId,
            generatedAdjustmentLedgerStatus: adjustmentResult?.ledger.status,
          },
        },
      },
    })

    await markBusinessEventAppliedInTx(tx, parsed.organizationId, eventResult.event.id)

    return {
      countSession: postedSession,
      eventId: eventResult.event.id,
      idempotencyKey,
      countSheetHash: countSheetHash!,
      snapshotHash: session.snapshotHash ?? undefined,
      varianceLineCount: varianceLines.length,
      totalVarianceValue: totalVarianceValue.toFixed(2),
      generatedAdjustmentId: adjustmentResult?.adjustment.id,
      generatedAdjustmentEventId: adjustmentResult?.eventId,
      generatedAdjustmentLedgerStatus: adjustmentResult?.ledger.status,
      replayed: false,
    }
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}
