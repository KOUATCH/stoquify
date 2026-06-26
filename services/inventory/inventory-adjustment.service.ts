import {
  AccountingPostingPurpose,
  AccountingSourceType,
  AdjustmentType,
  AdjustmentStatus,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { createLedgerPostingBatch } from "@/services/accounting/posting.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { getActivePostingRule } from "@/services/accounting/posting-rules.service"
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { recordInventoryValuationCloseInvalidationInTx } from "./inventory-close-invalidation.service"

import {
  createStockAdjustmentInputSchema,
  postStockAdjustmentInputSchema,
  type CreateStockAdjustmentInput,
  type PostStockAdjustmentInput,
} from "./inventory-event.schemas"
import {
  ConcurrentStockUpdateError,
  InsufficientStockError,
  InventorySoDViolationError,
  MissingInventoryEvidenceError,
} from "./inventory-errors"

type DbClient = Prisma.TransactionClient | typeof db

const adjustmentInclude = {
  location: {
    select: {
      id: true,
      name: true,
      organizationId: true,
      isActive: true,
      deletedAt: true,
      allowNegativeStock: true,
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
} satisfies Prisma.StockAdjustmentInclude

type StockAdjustmentWithLines = Prisma.StockAdjustmentGetPayload<{
  include: typeof adjustmentInclude
}>

type ManualAdjustmentItem = Prisma.ItemGetPayload<{
  include: { inventoryLevels: true }
}>

type AdjustmentPlan = {
  line: StockAdjustmentWithLines["lines"][number]
  level: Prisma.InventoryLevelGetPayload<{}> | null
  quantityDelta: Prisma.Decimal
  unitCost: Prisma.Decimal
  signedValueDelta: Prisma.Decimal
  absoluteValue: Prisma.Decimal
  nextQuantityOnHand: Prisma.Decimal
  nextQuantityAvailable: Prisma.Decimal
  nextAverageCost: Prisma.Decimal
  nextTotalValue: Prisma.Decimal
  movementType:
    | "ADJUSTMENT_IN"
    | "ADJUSTMENT_OUT"
    | "DAMAGED"
    | "EXPIRED"
    | "THEFT"
    | "WRITE_OFF"
}

type AdjustmentLedgerResult = {
  status: "POSTED" | "BLOCKED"
  postingBatchId: string
  journalEntryId?: string
  blockerCode?: string
  message?: string
}

export type PostStockAdjustmentResult = {
  adjustment: StockAdjustmentWithLines
  eventId: string
  idempotencyKey: string
  documentHash: string
  evidenceHash?: string
  movementTransactionIds: string[]
  ledger: AdjustmentLedgerResult
  replayed: boolean
}

export type RequestManualItemStockAdjustmentInput = {
  organizationId: string
  itemId: string
  actorId: string
  quantityChange: Prisma.Decimal.Value
  mode?: "delta" | "set"
  reason: string
  notes?: string | null
  locationId?: string | null
  unitCost?: Prisma.Decimal.Value | null
  occurredAt?: Date
}

export type RequestManualItemStockAdjustmentResult = {
  item: ManualAdjustmentItem
  inventoryLevel: Prisma.InventoryLevelGetPayload<{}> | null
  adjustment: StockAdjustmentWithLines | null
  quantityDelta: string
  targetQuantity: string
  requiresApproval: boolean
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

function maxZeroDecimal(value: Prisma.Decimal) {
  return value.lt(0) ? new Prisma.Decimal(0) : value
}

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}

async function nextAdjustmentNumber(tx: Prisma.TransactionClient, organizationId: string, adjustmentDate: Date) {
  const count = await tx.stockAdjustment.count({
    where: {
      organizationId,
      adjustmentNumber: { startsWith: `ADJ-${compactDate(adjustmentDate)}` },
    },
  })

  return `ADJ-${compactDate(adjustmentDate)}-${String(count + 1).padStart(4, "0")}`
}

async function nextInventoryAdjustmentEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
) {
  const prefix = `INVADJ-${compactDate(entryDate)}`
  const count = await tx.journalEntry.count({
    where: {
      organizationId,
      entryNumber: { startsWith: prefix },
    },
  })

  return `${prefix}-${String(count + 1).padStart(4, "0")}`
}

function adjustmentEventType(adjustment: Pick<StockAdjustmentWithLines, "type">) {
  return adjustment.type === AdjustmentType.WRITE_OFF
    ? "stock.write_off.posted"
    : "stock.adjustment.posted"
}

function adjustmentEventIdempotencyKey(adjustmentId: string) {
  return `stock-adjustment:${adjustmentId}:posted`
}

function isSensitiveAdjustment(type: AdjustmentType) {
  const sensitiveTypes: readonly AdjustmentType[] = [
    AdjustmentType.DAMAGED,
    AdjustmentType.EXPIRED,
    AdjustmentType.THEFT,
    AdjustmentType.WRITE_OFF,
    AdjustmentType.PHYSICAL_COUNT,
  ]
  return sensitiveTypes.includes(type)
}

function defaultAdjustmentDocumentHash(adjustment: StockAdjustmentWithLines) {
  return `sha256:${hashBusinessPayload({
    adjustmentId: adjustment.id,
    adjustmentNumber: adjustment.adjustmentNumber,
    type: adjustment.type,
    reason: adjustment.reason,
    locationId: adjustment.locationId,
    adjustmentDate: adjustment.adjustmentDate.toISOString(),
    sourceCountSessionId: adjustment.sourceCountSessionId,
    lines: adjustment.lines.map((line) => ({
      lineId: line.id,
      itemId: line.itemId,
      sku: line.item.sku,
      systemQuantity: String(line.systemQuantity),
      actualQuantity: String(line.actualQuantity),
      adjustedQuantity: String(line.adjustedQuantity),
      unitCost: String(line.unitCost ?? line.item.costPrice ?? 0),
      evidenceHash: line.evidenceHash,
      stockCountLineId: line.stockCountLineId,
    })),
  })}`
}

function mapMovementType(type: AdjustmentType, quantityDelta: Prisma.Decimal): AdjustmentPlan["movementType"] {
  if (quantityDelta.gt(0)) return "ADJUSTMENT_IN"
  if (type === AdjustmentType.WRITE_OFF) return "WRITE_OFF"
  if (type === AdjustmentType.DAMAGED) return "DAMAGED"
  if (type === AdjustmentType.EXPIRED) return "EXPIRED"
  if (type === AdjustmentType.THEFT) return "THEFT"
  return "ADJUSTMENT_OUT"
}

function buildAdjustmentPayload(input: {
  adjustment: StockAdjustmentWithLines
  plans: AdjustmentPlan[]
  documentHash: string
  evidenceHash?: string
  approvedById: string
  movementTransactionIds: string[]
  ledger: AdjustmentLedgerResult
}) {
  return {
    adjustmentId: input.adjustment.id,
    adjustmentNumber: input.adjustment.adjustmentNumber,
    type: input.adjustment.type,
    reason: input.adjustment.reason,
    locationId: input.adjustment.locationId,
    approvedById: input.approvedById,
    sourceCountSessionId: input.adjustment.sourceCountSessionId,
    documentHash: input.documentHash,
    evidenceHash: input.evidenceHash,
    valuationMethod: "WEIGHTED_AVERAGE",
    movementTransactionIds: input.movementTransactionIds,
    ledger: input.ledger,
    lines: input.plans.map((plan) => ({
      lineId: plan.line.id,
      itemId: plan.line.itemId,
      sku: plan.line.item.sku,
      systemQuantity: decimal3(plan.line.systemQuantity).toFixed(3),
      actualQuantity: decimal3(plan.line.actualQuantity).toFixed(3),
      adjustedQuantity: plan.quantityDelta.toFixed(3),
      unitCost: plan.unitCost.toFixed(2),
      valueDelta: plan.signedValueDelta.toFixed(2),
      absoluteValue: plan.absoluteValue.toFixed(2),
      movementType: plan.movementType,
      balanceAfter: plan.nextQuantityOnHand.toFixed(3),
      evidenceHash: plan.line.evidenceHash,
      stockCountLineId: plan.line.stockCountLineId,
    })),
  }
}

async function assertAdjustmentPeriodOpen(
  tx: Prisma.TransactionClient,
  organizationId: string,
  eventDate: Date,
) {
  try {
    return await getOpenPeriodForDate(organizationId, eventDate, tx)
  } catch {
    throw new BusinessRuleError("An open accounting period is required before posting inventory adjustments.")
  }
}

function assertAdjustmentCanPost(
  adjustment: StockAdjustmentWithLines,
  approvedById: string,
  evidenceHash?: string,
) {
  if (adjustment.organizationId !== adjustment.location.organizationId) {
    throw new BusinessRuleError("Adjustment location does not belong to this organization.")
  }

  if (!adjustment.location.isActive || adjustment.location.deletedAt) {
    throw new BusinessRuleError("Adjustment location is not active.")
  }

  if (!["DRAFT", "SUBMITTED", "APPROVED"].includes(adjustment.status)) {
    throw new BusinessRuleError(`Cannot post adjustment with status: ${adjustment.status}`)
  }

  if (adjustment.lines.length === 0) {
    throw new BusinessRuleError("Adjustment requires at least one line.")
  }

  if (adjustment.createdById && adjustment.createdById === approvedById) {
    throw new InventorySoDViolationError(undefined, {
      adjustmentId: adjustment.id,
      createdById: adjustment.createdById,
      approvedById,
    })
  }

  if (isSensitiveAdjustment(adjustment.type) && !evidenceHash) {
    throw new MissingInventoryEvidenceError("Evidence hash is required for stock count, damage, expiry, theft, and write-off adjustments.", {
      adjustmentId: adjustment.id,
      type: adjustment.type,
    })
  }
}

async function loadAdjustment(
  tx: Prisma.TransactionClient,
  organizationId: string,
  adjustmentId: string,
) {
  const adjustment = await tx.stockAdjustment.findFirst({
    where: { id: adjustmentId, organizationId, deletedAt: null },
    include: adjustmentInclude,
  })

  if (!adjustment) {
    throw new NotFoundError("Stock adjustment not found or you do not have permission to post it.")
  }

  return adjustment
}

async function loadAdjustmentPlans(
  tx: Prisma.TransactionClient,
  adjustment: StockAdjustmentWithLines,
): Promise<AdjustmentPlan[]> {
  const plans: AdjustmentPlan[] = []

  for (const line of adjustment.lines) {
    if (line.item.organizationId !== adjustment.organizationId) {
      throw new BusinessRuleError("Adjustment line item does not belong to this organization.")
    }

    if (!line.item.isActive || line.item.isDiscontinued || line.item.deletedAt) {
      throw new BusinessRuleError(`Item ${line.item.sku} is not active for inventory adjustment posting.`)
    }

    if (!line.item.trackInventory) {
      throw new BusinessRuleError(`Item ${line.item.sku} is not inventory-tracked.`)
    }

    const quantityDelta = decimal3(line.adjustedQuantity)
    if (quantityDelta.eq(0)) continue

    const level = await tx.inventoryLevel.findUnique({
      where: {
        itemId_locationId: {
          itemId: line.itemId,
          locationId: adjustment.locationId,
        },
      },
    })

    if (!level && quantityDelta.lt(0)) {
      throw new InsufficientStockError(`No inventory found for item ${line.item.sku} at the adjustment location.`, {
        itemId: line.itemId,
        locationId: adjustment.locationId,
      })
    }

    const currentOnHand = decimal3(level?.quantityOnHand ?? 0)
    const currentAvailable = decimal3(level?.quantityAvailable ?? 0)
    const currentTotalValue = money(level?.totalValue ?? 0)
    const currentAverageCost = money(level?.averageCost ?? 0)
    const unitCost = money(line.unitCost ?? (currentAverageCost.gt(0) ? currentAverageCost : line.item.costPrice))
    const signedValueDelta = money(unitCost.times(quantityDelta))
    const absoluteValue = signedValueDelta.abs().toDecimalPlaces(2)

    if (quantityDelta.lt(0) && !adjustment.location.allowNegativeStock) {
      const decrease = quantityDelta.abs().toDecimalPlaces(3)
      if (currentOnHand.lt(decrease) || currentAvailable.lt(decrease)) {
        throw new InsufficientStockError(
          `Insufficient inventory for item ${line.item.sku}. Available: ${currentAvailable.toFixed(3)}, Required decrease: ${decrease.toFixed(3)}`,
          {
            itemId: line.itemId,
            locationId: adjustment.locationId,
            available: currentAvailable.toFixed(3),
            requiredDecrease: decrease.toFixed(3),
          },
        )
      }
    }

    if (adjustment.type === AdjustmentType.PHYSICAL_COUNT && level) {
      const countSnapshot = decimal3(line.systemQuantity)
      if (!currentOnHand.eq(countSnapshot)) {
        throw new ConcurrentStockUpdateError(
          `Inventory changed after count snapshot for item ${line.item.sku}; freeze a new count session.`,
        )
      }
    }

    const nextQuantityOnHand = currentOnHand.plus(quantityDelta).toDecimalPlaces(3)
    const nextQuantityAvailable = currentAvailable.plus(quantityDelta).toDecimalPlaces(3)
    const unclampedValue = currentTotalValue.plus(signedValueDelta).toDecimalPlaces(2)
    const nextTotalValue = nextQuantityOnHand.eq(0)
      ? new Prisma.Decimal(0)
      : maxDecimal(unclampedValue, new Prisma.Decimal(0)).toDecimalPlaces(2)
    const nextAverageCost = nextQuantityOnHand.gt(0)
      ? nextTotalValue.div(nextQuantityOnHand).toDecimalPlaces(2)
      : new Prisma.Decimal(0)

    plans.push({
      line,
      level,
      quantityDelta,
      unitCost,
      signedValueDelta,
      absoluteValue,
      nextQuantityOnHand,
      nextQuantityAvailable,
      nextAverageCost,
      nextTotalValue,
      movementType: mapMovementType(adjustment.type, quantityDelta),
    })
  }

  if (plans.length === 0) {
    throw new BusinessRuleError("Adjustment has no non-zero quantity variance to post.")
  }

  return plans
}

async function postAdjustmentPlan(
  tx: Prisma.TransactionClient,
  adjustment: StockAdjustmentWithLines,
  plan: AdjustmentPlan,
  approvedById: string,
  now: Date,
) {
  if (plan.level) {
    const guard: Prisma.InventoryLevelWhereInput = {
      id: plan.level.id,
      version: plan.level.version,
    }

    if (plan.quantityDelta.lt(0) && !adjustment.location.allowNegativeStock) {
      const decrease = plan.quantityDelta.abs().toDecimalPlaces(3)
      guard.quantityOnHand = { gte: decrease }
      guard.quantityAvailable = { gte: decrease }
    }

    const update = await tx.inventoryLevel.updateMany({
      where: guard,
      data: {
        quantityOnHand: plan.nextQuantityOnHand,
        quantityAvailable: plan.nextQuantityAvailable,
        averageCost: plan.nextAverageCost,
        totalValue: plan.nextTotalValue,
        lastTransactionAt: now,
        version: { increment: 1 },
      },
    })

    if (update.count !== 1) {
      throw new ConcurrentStockUpdateError(`Inventory changed while posting adjustment line for item ${plan.line.item.sku}.`)
    }
  } else {
    await tx.inventoryLevel.create({
      data: {
        itemId: plan.line.itemId,
        locationId: adjustment.locationId,
        quantityOnHand: plan.nextQuantityOnHand,
        quantityAvailable: plan.nextQuantityAvailable,
        quantityReserved: new Prisma.Decimal(0),
        quantityInTransit: new Prisma.Decimal(0),
        quantityOnOrder: new Prisma.Decimal(0),
        reorderPoint: new Prisma.Decimal(0),
        averageCost: plan.nextAverageCost,
        totalValue: plan.nextTotalValue,
        lastTransactionAt: now,
      },
    })
  }

  await tx.stockAdjustmentLine.update({
    where: { id: plan.line.id },
    data: {
      unitCost: plan.unitCost,
      totalCost: plan.absoluteValue,
      evidenceHash: plan.line.evidenceHash ?? adjustment.evidenceHash,
      metadata: {
        valueDelta: plan.signedValueDelta.toFixed(2),
        movementType: plan.movementType,
      },
    },
  })

  const movement = await tx.inventoryTransaction.create({
    data: {
      itemId: plan.line.itemId,
      locationId: adjustment.locationId,
      organizationId: adjustment.organizationId,
      createdById: approvedById,
      type: plan.movementType,
      quantity: plan.quantityDelta,
      unitCost: plan.unitCost,
      totalCost: plan.absoluteValue,
      balanceAfter: plan.nextQuantityOnHand,
      referenceType: "STOCK_ADJUSTMENT",
      referenceId: adjustment.id,
      referenceNumber: adjustment.adjustmentNumber,
      notes: adjustment.reason,
    },
  })

  return movement.id
}

function postingAmount(
  sourceAmount: Prisma.Decimal,
  line: {
    amountSource: PostingRuleAmountSource
    multiplier: Prisma.Decimal
  },
) {
  if (line.amountSource === PostingRuleAmountSource.TAX_AMOUNT) {
    throw new BusinessRuleError("Tax amount is not supported for inventory adjustment posting rules.")
  }

  if (line.amountSource === PostingRuleAmountSource.FIXED) {
    return money(line.multiplier.abs())
  }

  return money(sourceAmount.times(line.multiplier.abs()))
}

async function resolvePostingAccount(
  tx: Prisma.TransactionClient,
  organizationId: string,
  ruleLine: {
    accountId: string | null
    mappingKey: string | null
  },
) {
  const account = await tx.chartOfAccount.findFirst({
    where: ruleLine.accountId
      ? { id: ruleLine.accountId, organizationId, deletedAt: null }
      : { organizationId, mappingKey: ruleLine.mappingKey, deletedAt: null },
    include: { _count: { select: { children: true } } },
  })

  if (!account) throw new BusinessRuleError("Inventory adjustment posting account was not found.")
  if (!account.isActive) throw new BusinessRuleError(`Inventory adjustment posting account ${account.code} is inactive.`)
  if (account._count.children > 0) {
    throw new BusinessRuleError(`Inventory adjustment posting account ${account.code} must be a leaf account.`)
  }

  return account
}

async function markAdjustmentPostingBlocked(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    actorId: string
    postingBatchId: string
    message: string
    blockerCode: string
    metadata?: Prisma.InputJsonValue
  },
): Promise<AdjustmentLedgerResult> {
  const batch = await tx.ledgerPostingBatch.update({
    where: { id: input.postingBatchId },
    data: {
      status: LedgerPostingBatchStatus.FAILED,
      errorMessage: input.message,
      metadata: input.metadata,
    },
  })

  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "INVENTORY_ADJUSTMENT_LEDGER_BLOCKED",
      resourceType: "LedgerPostingBatch",
      resourceId: batch.id,
      postingBatchId: batch.id,
      message: input.message,
      metadata: {
        blockerCode: input.blockerCode,
        details: input.metadata,
      },
    },
  })

  return {
    status: "BLOCKED",
    postingBatchId: batch.id,
    blockerCode: input.blockerCode,
    message: input.message,
  }
}

async function postAdjustmentLedgerOrBlock(
  tx: Prisma.TransactionClient,
  input: {
    adjustment: StockAdjustmentWithLines
    plans: AdjustmentPlan[]
    periodId: string
    approvedById: string
    occurredAt: Date
    documentHash: string
  },
): Promise<AdjustmentLedgerResult> {
  const sourceAmount = input.plans
    .reduce((total, plan) => total.plus(plan.absoluteValue), new Prisma.Decimal(0))
    .toDecimalPlaces(2)

  const batch = await createLedgerPostingBatch(
    {
      organizationId: input.adjustment.organizationId,
      periodId: input.periodId,
      sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
      sourceId: input.adjustment.id,
      postingPurpose: AccountingPostingPurpose.INVENTORY_ADJUSTMENT,
      idempotencyKey: `inventory-adjustment:${input.adjustment.id}:ledger`,
      metadata: {
        adjustmentNumber: input.adjustment.adjustmentNumber,
        adjustmentType: input.adjustment.type,
        sourceAmount: sourceAmount.toFixed(2),
        documentHash: input.documentHash,
      },
    },
    tx,
  )

  let rule
  try {
    rule = await getActivePostingRule(
      input.adjustment.organizationId,
      {
        sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
        postingPurpose: AccountingPostingPurpose.INVENTORY_ADJUSTMENT,
        effectiveAt: input.occurredAt,
      },
      tx,
    )
  } catch (error) {
    return markAdjustmentPostingBlocked(tx, {
      organizationId: input.adjustment.organizationId,
      actorId: input.approvedById,
      postingBatchId: batch.id,
      blockerCode: "INVALID_POSTING_RULE",
      message: error instanceof Error ? error.message : "Inventory adjustment posting rule is invalid.",
      metadata: { adjustmentId: input.adjustment.id },
    })
  }

  if (!rule) {
    return markAdjustmentPostingBlocked(tx, {
      organizationId: input.adjustment.organizationId,
      actorId: input.approvedById,
      postingBatchId: batch.id,
      blockerCode: "MISSING_POSTING_RULE",
      message: "No active inventory adjustment posting rule is configured.",
      metadata: {
        sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
        postingPurpose: AccountingPostingPurpose.INVENTORY_ADJUSTMENT,
      },
    })
  }

  const journal = await tx.journal.findFirst({
    where: {
      organizationId: input.adjustment.organizationId,
      type: "INVENTORY",
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  })

  if (!journal) {
    return markAdjustmentPostingBlocked(tx, {
      organizationId: input.adjustment.organizationId,
      actorId: input.approvedById,
      postingBatchId: batch.id,
      blockerCode: "MISSING_INVENTORY_JOURNAL",
      message: "No active inventory journal is configured.",
      metadata: { adjustmentId: input.adjustment.id },
    })
  }

  try {
    const journalLines = []

    for (const ruleLine of rule.lines) {
      const amount = postingAmount(sourceAmount, {
        amountSource: ruleLine.amountSource,
        multiplier: ruleLine.multiplier,
      })
      if (amount.eq(0)) continue

      const account = await resolvePostingAccount(tx, input.adjustment.organizationId, {
        accountId: ruleLine.accountId,
        mappingKey: ruleLine.mappingKey,
      })

      journalLines.push({
        organizationId: input.adjustment.organizationId,
        accountId: account.id,
        lineNumber: ruleLine.lineNumber,
        description:
          ruleLine.description?.trim() ||
          `Inventory adjustment ${input.adjustment.adjustmentNumber} ${ruleLine.amountSource}`,
        debit: ruleLine.side === PostingRuleLineSide.DEBIT ? amount : new Prisma.Decimal(0),
        credit: ruleLine.side === PostingRuleLineSide.CREDIT ? amount : new Prisma.Decimal(0),
        currency: account.currency || "XAF",
        exchangeRate: new Prisma.Decimal(1),
        baseDebit: ruleLine.side === PostingRuleLineSide.DEBIT ? amount : new Prisma.Decimal(0),
        baseCredit: ruleLine.side === PostingRuleLineSide.CREDIT ? amount : new Prisma.Decimal(0),
        locationId: input.adjustment.locationId,
        itemId: input.plans.length === 1 ? input.plans[0].line.itemId : null,
        dimensions: ruleLine.dimensions ?? undefined,
        metadata: {
          adjustmentId: input.adjustment.id,
          adjustmentType: input.adjustment.type,
          amountSource: ruleLine.amountSource,
        },
      })
    }

    const debit = journalLines.reduce((total, line) => total.plus(line.debit), new Prisma.Decimal(0))
    const credit = journalLines.reduce((total, line) => total.plus(line.credit), new Prisma.Decimal(0))
    if (journalLines.length < 2 || !debit.eq(credit)) {
      throw new BusinessRuleError(
        `Inventory adjustment posting rule produced an unbalanced entry: debit ${debit.toFixed(2)} credit ${credit.toFixed(2)}.`,
      )
    }

    const now = new Date()
    const postedBatch = await tx.ledgerPostingBatch.update({
      where: { id: batch.id },
      data: {
        status: LedgerPostingBatchStatus.POSTED,
        postedAt: now,
        errorMessage: null,
      },
    })

    const journalEntry = await tx.journalEntry.create({
      data: {
        organizationId: input.adjustment.organizationId,
        journalId: journal.id,
        periodId: input.periodId,
        postingBatchId: postedBatch.id,
        entryNumber: await nextInventoryAdjustmentEntryNumber(tx, input.adjustment.organizationId, input.occurredAt),
        entryDate: input.occurredAt,
        status: JournalEntryStatus.POSTED,
        currency: "XAF",
        memo: `Inventory adjustment ${input.adjustment.adjustmentNumber}`,
        reference: input.adjustment.adjustmentNumber,
        sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
        sourceId: input.adjustment.id,
        postingPurpose: AccountingPostingPurpose.INVENTORY_ADJUSTMENT,
        postedAt: now,
        postedById: input.approvedById,
        createdById: input.approvedById,
        lines: { create: journalLines },
      },
    })

    const existingLink = await tx.accountingSourceLink.findFirst({
      where: {
        organizationId: input.adjustment.organizationId,
        postingBatchId: postedBatch.id,
        sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
        sourceId: input.adjustment.id,
      },
    })

    if (!existingLink) {
      await tx.accountingSourceLink.create({
        data: {
          organizationId: input.adjustment.organizationId,
          postingBatchId: postedBatch.id,
          journalEntryId: journalEntry.id,
          sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
          sourceId: input.adjustment.id,
          sourceNumber: input.adjustment.adjustmentNumber,
          sourceDate: input.adjustment.adjustmentDate,
          metadata: {
            documentHash: input.documentHash,
            adjustmentType: input.adjustment.type,
          },
        },
      })
    }

    await tx.ledgerAuditEvent.create({
      data: {
        organizationId: input.adjustment.organizationId,
        actorId: input.approvedById,
        action: "INVENTORY_ADJUSTMENT_LEDGER_POSTED",
        resourceType: "LedgerPostingBatch",
        resourceId: postedBatch.id,
        postingBatchId: postedBatch.id,
        journalEntryId: journalEntry.id,
        message: `Inventory adjustment ${input.adjustment.adjustmentNumber} posted to ledger`,
        metadata: {
          sourceAmount: sourceAmount.toFixed(2),
          documentHash: input.documentHash,
        },
      },
    })

    return {
      status: "POSTED",
      postingBatchId: postedBatch.id,
      journalEntryId: journalEntry.id,
    }
  } catch (error) {
    return markAdjustmentPostingBlocked(tx, {
      organizationId: input.adjustment.organizationId,
      actorId: input.approvedById,
      postingBatchId: batch.id,
      blockerCode: "POSTING_RULE_FAILED",
      message: error instanceof Error ? error.message : "Inventory adjustment ledger posting failed.",
      metadata: { adjustmentId: input.adjustment.id },
    })
  }
}

export async function createStockAdjustment(
  input: CreateStockAdjustmentInput,
  client: DbClient = db,
) {
  const parsed = createStockAdjustmentInputSchema.parse(input)
  const run = async (tx: Prisma.TransactionClient) => {
    const adjustmentDate = parsed.adjustmentDate ?? new Date()
    const location = await tx.location.findFirst({
      where: {
        id: parsed.locationId,
        organizationId: parsed.organizationId,
        isActive: true,
        deletedAt: null,
      },
    })

    if (!location) throw new NotFoundError("Adjustment location not found.")

    const itemIds = parsed.lines.map((line) => line.itemId)
    const [items, levels] = await Promise.all([
      tx.item.findMany({
        where: {
          id: { in: itemIds },
          organizationId: parsed.organizationId,
          isActive: true,
          isDiscontinued: false,
          deletedAt: null,
        },
        select: {
          id: true,
          costPrice: true,
        },
      }),
      tx.inventoryLevel.findMany({
        where: {
          itemId: { in: itemIds },
          locationId: parsed.locationId,
        },
      }),
    ])

    if (items.length !== new Set(itemIds).size) {
      throw new BusinessRuleError("One or more adjustment items were not found for this organization.")
    }

    const itemById = new Map(items.map((item) => [item.id, item]))
    const levelByItemId = new Map(levels.map((level) => [level.itemId, level]))
    const adjustmentNumber = await nextAdjustmentNumber(tx, parsed.organizationId, adjustmentDate)

    return tx.stockAdjustment.create({
      data: {
        organizationId: parsed.organizationId,
        locationId: parsed.locationId,
        adjustmentNumber,
        type: parsed.type,
        reason: parsed.reason,
        status: "DRAFT",
        adjustmentDate,
        notes: parsed.notes ?? null,
        createdById: parsed.createdById,
        evidenceHash: parsed.evidenceHash ?? null,
        documentHash: parsed.documentHash ?? null,
        sourceCountSessionId: parsed.sourceCountSessionId ?? null,
        metadata: parsed.metadata as Prisma.InputJsonValue | undefined,
        lines: {
          create: parsed.lines.map((line) => {
            const level = levelByItemId.get(line.itemId)
            const item = itemById.get(line.itemId)
            const systemQuantity = decimal3(line.systemQuantity ?? level?.quantityOnHand ?? 0)
            const adjustedQuantity = decimal3(line.adjustedQuantity)
            const actualQuantity = decimal3(line.actualQuantity ?? systemQuantity.plus(adjustedQuantity))
            const unitCost = money(line.unitCost ?? level?.averageCost ?? item?.costPrice ?? 0)

            return {
              itemId: line.itemId,
              systemQuantity,
              actualQuantity,
              adjustedQuantity,
              unitCost,
              totalCost: money(adjustedQuantity.abs().times(unitCost)),
              notes: line.notes ?? null,
              evidenceHash: line.evidenceHash ?? parsed.evidenceHash ?? null,
              stockCountLineId: line.stockCountLineId ?? null,
              metadata: line.metadata as Prisma.InputJsonValue | undefined,
            }
          }),
        },
      },
      include: adjustmentInclude,
    })
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export async function requestManualItemStockAdjustment(
  input: RequestManualItemStockAdjustmentInput,
  client: DbClient = db,
): Promise<RequestManualItemStockAdjustmentResult> {
  const run = async (tx: Prisma.TransactionClient): Promise<RequestManualItemStockAdjustmentResult> => {
    const adjustmentDate = input.occurredAt ?? new Date()
    const item = await tx.item.findFirst({
      where: {
        id: input.itemId,
        organizationId: input.organizationId,
        isActive: true,
        isDiscontinued: false,
        deletedAt: null,
      },
      include: {
        inventoryLevels: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!item) throw new NotFoundError("Item not found or inactive for this organization.")
    if (!item.trackInventory) throw new BusinessRuleError("Item is not inventory-tracked.")

    let inventoryLevel: Prisma.InventoryLevelGetPayload<{}> | null = null
    let locationId = input.locationId ?? item.inventoryLevels[0]?.locationId

    if (locationId) {
      inventoryLevel = await tx.inventoryLevel.findUnique({
        where: {
          itemId_locationId: {
            itemId: item.id,
            locationId,
          },
        },
      })
    } else {
      const defaultLocation = await tx.location.findFirst({
        where: {
          organizationId: input.organizationId,
          isDefault: true,
          isActive: true,
          deletedAt: null,
        },
      })

      if (!defaultLocation) {
        throw new BusinessRuleError("A default active location is required before requesting a stock adjustment.")
      }

      locationId = defaultLocation.id
    }

    const location = await tx.location.findFirst({
      where: {
        id: locationId,
        organizationId: input.organizationId,
        isActive: true,
        deletedAt: null,
      },
    })

    if (!location) throw new NotFoundError("Inventory location not found or inactive for this organization.")

    const currentQuantity = decimal3(inventoryLevel?.quantityOnHand ?? 0)
    const requestedQuantity = decimal3(input.quantityChange)
    const targetQuantity = input.mode === "set"
      ? maxZeroDecimal(requestedQuantity).toDecimalPlaces(3)
      : maxZeroDecimal(currentQuantity.plus(requestedQuantity)).toDecimalPlaces(3)
    const quantityDelta = targetQuantity.minus(currentQuantity).toDecimalPlaces(3)

    if (quantityDelta.eq(0)) {
      return {
        item,
        inventoryLevel,
        adjustment: null,
        quantityDelta: quantityDelta.toFixed(3),
        targetQuantity: targetQuantity.toFixed(3),
        requiresApproval: false,
      }
    }

    const adjustment = await createStockAdjustment(
      {
        organizationId: input.organizationId,
        locationId,
        type: AdjustmentType.CORRECTION,
        reason: input.reason,
        createdById: input.actorId,
        adjustmentDate,
        notes: input.notes ?? undefined,
        metadata: {
          source: "legacy_manual_item_stock_action",
          mode: input.mode ?? "delta",
          requestedQuantityChange: requestedQuantity.toFixed(3),
        },
        lines: [
          {
            itemId: item.id,
            systemQuantity: currentQuantity.toFixed(3),
            actualQuantity: targetQuantity.toFixed(3),
            adjustedQuantity: quantityDelta.toFixed(3),
            unitCost: money(input.unitCost ?? inventoryLevel?.averageCost ?? item.costPrice ?? 0).toFixed(2),
            notes: input.notes ?? input.reason,
            metadata: {
              source: "legacy_manual_item_stock_action",
            },
          },
        ],
      },
      tx,
    )

    const submittedAdjustment = await tx.stockAdjustment.update({
      where: { id: adjustment.id },
      data: { status: AdjustmentStatus.SUBMITTED },
      include: adjustmentInclude,
    })

    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorId,
        entityType: "StockAdjustment",
        entityId: adjustment.id,
        action: "REQUEST_MANUAL_ITEM_STOCK_ADJUSTMENT",
        changes: {
          after: {
            adjustmentId: adjustment.id,
            adjustmentNumber: adjustment.adjustmentNumber,
            itemId: item.id,
            locationId,
            mode: input.mode ?? "delta",
            currentQuantity: currentQuantity.toFixed(3),
            targetQuantity: targetQuantity.toFixed(3),
            quantityDelta: quantityDelta.toFixed(3),
            requiresApproval: true,
          },
        },
      },
    })

    return {
      item,
      inventoryLevel,
      adjustment: submittedAdjustment,
      quantityDelta: quantityDelta.toFixed(3),
      targetQuantity: targetQuantity.toFixed(3),
      requiresApproval: true,
    }
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export async function postStockAdjustment(
  input: PostStockAdjustmentInput,
  client: DbClient = db,
): Promise<PostStockAdjustmentResult> {
  const parsed = postStockAdjustmentInputSchema.parse(input)
  const run = async (tx: Prisma.TransactionClient): Promise<PostStockAdjustmentResult> => {
    const idempotencyKey = parsed.idempotencyKey ?? adjustmentEventIdempotencyKey(parsed.adjustmentId)
    const adjustment = await loadAdjustment(tx, parsed.organizationId, parsed.adjustmentId)

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
        existingEvent.sourceType !== AccountingSourceType.STOCK_ADJUSTMENT ||
        existingEvent.sourceId !== adjustment.id
      ) {
        throw new ConflictError("Stock adjustment idempotency key is already used by another business event.")
      }

      if (adjustment.approvedById && adjustment.approvedById !== parsed.approvedById) {
        throw new ConflictError("Stock adjustment idempotency key was replayed by a different approver.")
      }

      return {
        adjustment,
        eventId: existingEvent.id,
        idempotencyKey,
        documentHash: existingEvent.documentHash ?? adjustment.documentHash ?? defaultAdjustmentDocumentHash(adjustment),
        evidenceHash: adjustment.evidenceHash ?? undefined,
        movementTransactionIds: [],
        ledger: {
          status: adjustment.ledgerPostingBatchId ? "BLOCKED" : "BLOCKED",
          postingBatchId: adjustment.ledgerPostingBatchId ?? "",
          message: "Replay returned the previously recorded stock adjustment event.",
        },
        replayed: true,
      }
    }

    const evidenceHash = parsed.evidenceHash ?? adjustment.evidenceHash ?? undefined
    const documentHash = parsed.documentHash ?? adjustment.documentHash ?? evidenceHash ?? defaultAdjustmentDocumentHash(adjustment)
    assertAdjustmentCanPost(adjustment, parsed.approvedById, evidenceHash)
    const occurredAt = parsed.occurredAt ?? adjustment.adjustmentDate
    const period = await assertAdjustmentPeriodOpen(tx, parsed.organizationId, occurredAt)
    const plans = await loadAdjustmentPlans(tx, adjustment)
    const now = new Date()
    const movementTransactionIds: string[] = []

    for (const plan of plans) {
      movementTransactionIds.push(await postAdjustmentPlan(tx, adjustment, plan, parsed.approvedById, now))
    }

    const ledger = await postAdjustmentLedgerOrBlock(tx, {
      adjustment,
      plans,
      periodId: period.id,
      approvedById: parsed.approvedById,
      occurredAt,
      documentHash,
    })

    const eventPayload = buildAdjustmentPayload({
      adjustment,
      plans,
      documentHash,
      evidenceHash,
      approvedById: parsed.approvedById,
      movementTransactionIds,
      ledger,
    })

    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: adjustmentEventType(adjustment),
      eventSource: "INTERNAL",
      idempotencyKey,
      actorId: parsed.approvedById,
      locationId: adjustment.locationId,
      occurredAt,
      sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
      sourceId: adjustment.id,
      postingBatchId: ledger.postingBatchId,
      documentHash,
      payload: eventPayload,
      metadata: {
        correlationId: parsed.correlationId,
        valuationMethod: "WEIGHTED_AVERAGE",
        ledgerStatus: ledger.status,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: adjustmentEventType(adjustment),
          payload: {
            adjustmentId: adjustment.id,
            adjustmentNumber: adjustment.adjustmentNumber,
            type: adjustment.type,
            locationId: adjustment.locationId,
            ledgerStatus: ledger.status,
            postingBatchId: ledger.postingBatchId,
          },
        },
        ...(ledger.status === "BLOCKED"
          ? [
              {
                channel: "NOTIFICATION" as const,
                eventName: "inventory.adjustment.ledger_blocked",
                payload: {
                  adjustmentId: adjustment.id,
                  adjustmentNumber: adjustment.adjustmentNumber,
                  postingBatchId: ledger.postingBatchId,
                  blockerCode: ledger.blockerCode,
                  message: ledger.message,
                },
              },
            ]
          : []),
      ],
    })

    const postedAdjustment = await tx.stockAdjustment.update({
      where: { id: adjustment.id },
      data: {
        status: "COMPLETED",
        approvedById: parsed.approvedById,
        approvedAt: now,
        evidenceHash: evidenceHash ?? null,
        documentHash,
        postedBusinessEventId: eventResult.event.id,
        ledgerPostingBatchId: ledger.postingBatchId,
      },
      include: adjustmentInclude,
    })

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.approvedById,
        entityType: "StockAdjustment",
        entityId: adjustment.id,
        action: "POST_STOCK_ADJUSTMENT",
        changes: {
          after: {
            eventId: eventResult.event.id,
            idempotencyKey,
            documentHash,
            evidenceHash,
            movementTransactionIds,
            ledger,
            adjustmentType: adjustment.type,
            sourceCountSessionId: adjustment.sourceCountSessionId,
          },
        },
      },
    })

    await markBusinessEventAppliedInTx(tx, parsed.organizationId, eventResult.event.id)

    await recordInventoryValuationCloseInvalidationInTx(tx, {
      organizationId: parsed.organizationId,
      sourceId: adjustment.id,
      periodId: period.id,
      occurredAt,
      actorId: parsed.approvedById,
      documentHash,
      correlationId: parsed.correlationId ?? null,
    })

    return {
      adjustment: postedAdjustment,
      eventId: eventResult.event.id,
      idempotencyKey,
      documentHash,
      evidenceHash,
      movementTransactionIds,
      ledger,
      replayed: false,
    }
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}
