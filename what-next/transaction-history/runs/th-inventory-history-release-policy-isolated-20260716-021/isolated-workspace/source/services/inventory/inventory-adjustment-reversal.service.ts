import {
  AccountingPostingPurpose,
  AccountingSourceType,
  AdjustmentStatus,
  AdjustmentType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  Prisma,
  StockAdjustmentCorrectionKind,
  TransactionType,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import { recordReversedJournalCloseInvalidationsInTx } from "@/services/accounting/journal-close-invalidation.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { createLedgerPostingBatch } from "@/services/accounting/posting.service"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  type ReverseStockAdjustmentInput,
  reverseStockAdjustmentInputSchema,
} from "./inventory-adjustment-reversal.schemas"
import { recordInventoryValuationCloseInvalidationInTx } from "./inventory-close-invalidation.service"
import {
  ConcurrentStockUpdateError,
  InsufficientStockError,
} from "./inventory-errors"

type DbClient = Prisma.TransactionClient | typeof db

const originalMovementInclude = {
  item: { select: { id: true, organizationId: true } },
  location: { select: { id: true, organizationId: true } },
  reversedByTransaction: { select: { id: true } },
} satisfies Prisma.InventoryTransactionInclude

type OriginalMovement = Prisma.InventoryTransactionGetPayload<{
  include: typeof originalMovementInclude
}>

type ReversalPlan = {
  itemId: string
  locationId: string
  level: Prisma.InventoryLevelGetPayload<{}>
  movements: OriginalMovement[]
  currentQuantityOnHand: Prisma.Decimal
  currentQuantityAvailable: Prisma.Decimal
  currentTotalValue: Prisma.Decimal
  reversalQuantity: Prisma.Decimal
  reversalValue: Prisma.Decimal
  nextQuantityOnHand: Prisma.Decimal
  nextQuantityAvailable: Prisma.Decimal
  nextTotalValue: Prisma.Decimal
  nextAverageCost: Prisma.Decimal
  totalCost: Prisma.Decimal
  unitCost: Prisma.Decimal | null
}

export type ReverseStockAdjustmentResult = {
  originalAdjustmentId: string
  correctionAdjustmentId: string
  eventId: string
  idempotencyKey: string
  documentHash: string
  movementTransactionIds: string[]
  postingBatchId: string
  journalEntryId: string
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

function reversalAdjustmentNumber(originalNumber: string, originalId: string) {
  return `REV-${originalNumber}-${originalId.slice(-6)}`
}

async function nextReversalEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
) {
  const prefix = `INVREV-${compactDate(entryDate)}`
  const count = await tx.journalEntry.count({
    where: {
      organizationId,
      entryNumber: { startsWith: prefix },
    },
  })

  return `${prefix}-${String(count + 1).padStart(4, "0")}`
}

function reversalQuantity(movement: OriginalMovement) {
  return decimal3(movement.quantity).negated().toDecimalPlaces(3)
}

function reversalValue(movement: OriginalMovement) {
  const quantity = decimal3(movement.quantity)
  const totalCost = money(movement.totalCost)
  if (quantity.eq(0) || totalCost.lt(0) || money(movement.unitCost).lt(0)) {
    throw new BusinessRuleError(`Inventory movement ${movement.id} cannot be reversed exactly.`)
  }

  const originalSignedValue = quantity.gt(0) ? totalCost : totalCost.negated()
  return originalSignedValue.negated().toDecimalPlaces(2)
}

function assertBalancedJournal(
  lines: Array<{
    debit: Prisma.Decimal
    credit: Prisma.Decimal
    baseDebit: Prisma.Decimal | null
    baseCredit: Prisma.Decimal | null
    currency: string
  }>,
) {
  if (lines.length < 2) {
    throw new BusinessRuleError("The original inventory journal does not have enough lines to reverse.")
  }

  const byCurrency = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>()
  let baseDebit = new Prisma.Decimal(0)
  let baseCredit = new Prisma.Decimal(0)

  for (const line of lines) {
    const totals = byCurrency.get(line.currency) ?? {
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(0),
    }
    totals.debit = totals.debit.plus(line.debit)
    totals.credit = totals.credit.plus(line.credit)
    byCurrency.set(line.currency, totals)
    baseDebit = baseDebit.plus(line.baseDebit ?? line.debit)
    baseCredit = baseCredit.plus(line.baseCredit ?? line.credit)
  }

  if ([...byCurrency.values()].some((totals) => !totals.debit.eq(totals.credit))) {
    throw new BusinessRuleError("The original inventory journal is not balanced by currency.")
  }
  if (!baseDebit.eq(baseCredit)) {
    throw new BusinessRuleError("The original inventory journal is not balanced in base currency.")
  }
}

async function buildReversalPlans(
  tx: Prisma.TransactionClient,
  organizationId: string,
  movements: OriginalMovement[],
): Promise<ReversalPlan[]> {
  const groups = new Map<string, OriginalMovement[]>()

  for (const movement of movements) {
    if (
      movement.organizationId !== organizationId ||
      movement.item.organizationId !== organizationId ||
      movement.location.organizationId !== organizationId
    ) {
      throw new BusinessRuleError("The original inventory movement has inconsistent tenant ownership.")
    }
    if (movement.reversedByTransaction) {
      throw new ConflictError(`Inventory movement ${movement.id} has already been reversed.`)
    }

    const key = `${movement.itemId}:${movement.locationId}`
    groups.set(key, [...(groups.get(key) ?? []), movement])
  }

  const plans: ReversalPlan[] = []
  for (const groupedMovements of groups.values()) {
    const first = groupedMovements[0]
    const level = await tx.inventoryLevel.findUnique({
      where: {
        itemId_locationId: {
          itemId: first.itemId,
          locationId: first.locationId,
        },
      },
    })
    if (!level) {
      throw new InsufficientStockError("The current inventory level required for reversal was not found.", {
        itemId: first.itemId,
        locationId: first.locationId,
      })
    }

    const currentQuantityOnHand = decimal3(level.quantityOnHand)
    const currentQuantityAvailable = decimal3(level.quantityAvailable)
    const currentTotalValue = money(level.totalValue)
    const reversalQuantityTotal = groupedMovements
      .reduce((total, movement) => total.plus(reversalQuantity(movement)), new Prisma.Decimal(0))
      .toDecimalPlaces(3)
    const reversalValueTotal = groupedMovements
      .reduce((total, movement) => total.plus(reversalValue(movement)), new Prisma.Decimal(0))
      .toDecimalPlaces(2)
    const nextQuantityOnHand = currentQuantityOnHand.plus(reversalQuantityTotal).toDecimalPlaces(3)
    const nextQuantityAvailable = currentQuantityAvailable.plus(reversalQuantityTotal).toDecimalPlaces(3)
    const nextTotalValue = currentTotalValue.plus(reversalValueTotal).toDecimalPlaces(2)

    if (nextQuantityOnHand.lt(0) || nextQuantityAvailable.lt(0)) {
      throw new InsufficientStockError("Current stock cannot support this exact adjustment reversal.", {
        itemId: first.itemId,
        locationId: first.locationId,
        currentQuantityOnHand: currentQuantityOnHand.toFixed(3),
        currentQuantityAvailable: currentQuantityAvailable.toFixed(3),
        reversalQuantity: reversalQuantityTotal.toFixed(3),
      })
    }
    if (nextTotalValue.lt(0)) {
      throw new BusinessRuleError("Current inventory value cannot support this exact adjustment reversal.")
    }
    if (nextQuantityOnHand.eq(0) && !nextTotalValue.eq(0)) {
      throw new BusinessRuleError(
        "Exact reversal would leave residual inventory value with zero quantity.",
      )
    }

    const costs = groupedMovements.map((movement) => money(movement.unitCost))
    const commonUnitCost = costs.every((cost) => cost.eq(costs[0])) ? costs[0] : null
    const totalCost = groupedMovements
      .reduce((total, movement) => total.plus(money(movement.totalCost)), new Prisma.Decimal(0))
      .toDecimalPlaces(2)

    plans.push({
      itemId: first.itemId,
      locationId: first.locationId,
      level,
      movements: groupedMovements,
      currentQuantityOnHand,
      currentQuantityAvailable,
      currentTotalValue,
      reversalQuantity: reversalQuantityTotal,
      reversalValue: reversalValueTotal,
      nextQuantityOnHand,
      nextQuantityAvailable,
      nextTotalValue,
      nextAverageCost: nextQuantityOnHand.gt(0)
        ? nextTotalValue.div(nextQuantityOnHand).toDecimalPlaces(2)
        : new Prisma.Decimal(0),
      totalCost,
      unitCost: commonUnitCost,
    })
  }

  return plans
}

async function replayExistingCorrection(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    originalAdjustmentId: string
    requestedById: string
    approvedById: string
    idempotencyKey: string
  },
  event: {
    id: string
    eventType: string
    sourceType: AccountingSourceType | null
    sourceId: string | null
    documentHash: string | null
    postingBatchId: string | null
  },
): Promise<ReverseStockAdjustmentResult> {
  if (event.eventType !== "stock.adjustment.reversed" || event.sourceType !== AccountingSourceType.STOCK_ADJUSTMENT) {
    throw new ConflictError("The reversal idempotency key is already used by another business event.")
  }

  const correction = await tx.stockAdjustment.findFirst({
    where: {
      id: event.sourceId ?? undefined,
      organizationId: input.organizationId,
      reversalOfAdjustmentId: input.originalAdjustmentId,
      correctionKind: StockAdjustmentCorrectionKind.REVERSAL,
      deletedAt: null,
    },
    select: {
      id: true,
      createdById: true,
      approvedById: true,
      documentHash: true,
      ledgerPostingBatchId: true,
      postedBusinessEventId: true,
    },
  })
  if (
    !correction ||
    correction.createdById !== input.requestedById ||
    correction.approvedById !== input.approvedById ||
    correction.postedBusinessEventId !== event.id
  ) {
    throw new ConflictError("The reversal idempotency key does not match this correction request.")
  }

  const [movements, journal] = await Promise.all([
    tx.inventoryTransaction.findMany({
      where: {
        organizationId: input.organizationId,
        referenceType: "STOCK_ADJUSTMENT",
        referenceId: correction.id,
        reversalOfTransactionId: { not: null },
      },
      select: { id: true },
      orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
    }),
    tx.journalEntry.findFirst({
      where: {
        organizationId: input.organizationId,
        postingBatchId: correction.ledgerPostingBatchId ?? undefined,
        sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
        sourceId: correction.id,
        postingPurpose: AccountingPostingPurpose.REVERSAL,
      },
      select: { id: true },
    }),
  ])
  if (!journal || !correction.ledgerPostingBatchId) {
    throw new ConflictError("The recorded correction is missing its reversal journal evidence.")
  }

  return {
    originalAdjustmentId: input.originalAdjustmentId,
    correctionAdjustmentId: correction.id,
    eventId: event.id,
    idempotencyKey: input.idempotencyKey,
    documentHash: event.documentHash ?? correction.documentHash ?? "",
    movementTransactionIds: movements.map((movement) => movement.id),
    postingBatchId: correction.ledgerPostingBatchId,
    journalEntryId: journal.id,
    replayed: true,
  }
}

export async function reverseStockAdjustment(
  input: ReverseStockAdjustmentInput,
  client: DbClient = db,
): Promise<ReverseStockAdjustmentResult> {
  const parsed = reverseStockAdjustmentInputSchema.parse(input)

  const run = async (tx: Prisma.TransactionClient): Promise<ReverseStockAdjustmentResult> => {
    const existingEvent = await tx.businessEvent.findUnique({
      where: {
        organizationId_eventSource_idempotencyKey: {
          organizationId: parsed.organizationId,
          eventSource: "INTERNAL",
          idempotencyKey: parsed.idempotencyKey,
        },
      },
      select: {
        id: true,
        eventType: true,
        sourceType: true,
        sourceId: true,
        documentHash: true,
        postingBatchId: true,
      },
    })
    if (existingEvent) {
      return replayExistingCorrection(tx, parsed, existingEvent)
    }

    const original = await tx.stockAdjustment.findFirst({
      where: {
        id: parsed.originalAdjustmentId,
        organizationId: parsed.organizationId,
        deletedAt: null,
      },
      include: {
        reversedByAdjustment: { select: { id: true } },
      },
    })
    if (!original) throw new NotFoundError("Stock adjustment not found.")
    if (original.status !== AdjustmentStatus.COMPLETED) {
      throw new BusinessRuleError("Only completed stock adjustments can be reversed.")
    }
    if (original.reversalOfAdjustmentId || original.correctionKind) {
      throw new BusinessRuleError("A correction adjustment cannot itself be reversed by this command.")
    }
    if (original.reversedByAdjustment) {
      throw new ConflictError("Stock adjustment has already been reversed.")
    }
    if (!original.ledgerPostingBatchId) {
      throw new BusinessRuleError("The original adjustment has no ledger posting batch to reverse.")
    }

    const movements = await tx.inventoryTransaction.findMany({
      where: {
        organizationId: parsed.organizationId,
        referenceType: "STOCK_ADJUSTMENT",
        referenceId: original.id,
        reversalOfTransactionId: null,
      },
      include: originalMovementInclude,
      orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
    })
    if (movements.length === 0) {
      throw new BusinessRuleError("The original adjustment has no immutable inventory movements to reverse.")
    }

    const originalBatch = await tx.ledgerPostingBatch.findFirst({
      where: {
        id: original.ledgerPostingBatchId,
        organizationId: parsed.organizationId,
      },
      include: {
        journalEntries: {
          include: {
            lines: { orderBy: { lineNumber: "asc" } },
            reversedByEntries: { select: { id: true } },
          },
        },
        sourceLinks: true,
      },
    })
    if (
      !originalBatch ||
      originalBatch.status !== LedgerPostingBatchStatus.POSTED ||
      originalBatch.sourceType !== AccountingSourceType.STOCK_ADJUSTMENT ||
      originalBatch.sourceId !== original.id ||
      originalBatch.postingPurpose !== AccountingPostingPurpose.INVENTORY_ADJUSTMENT
    ) {
      throw new BusinessRuleError("The original adjustment does not have a complete posted ledger batch.")
    }

    const postedJournals = originalBatch.journalEntries.filter(
      (entry) => entry.status === JournalEntryStatus.POSTED,
    )
    if (postedJournals.length !== 1) {
      throw new BusinessRuleError("The original adjustment must have exactly one posted journal entry.")
    }
    const originalJournal = postedJournals[0]
    if (originalJournal.reversedByEntries.length > 0 || originalJournal.reversalOfEntryId) {
      throw new ConflictError("The original adjustment journal has already been reversed.")
    }
    if (!originalBatch.sourceLinks.some((link) =>
      link.sourceType === AccountingSourceType.STOCK_ADJUSTMENT &&
      link.sourceId === original.id &&
      link.journalEntryId === originalJournal.id
    )) {
      throw new BusinessRuleError("The original adjustment journal is missing its accounting source link.")
    }
    assertBalancedJournal(originalJournal.lines)

    const plans = await buildReversalPlans(tx, parsed.organizationId, movements)
    const period = await getOpenPeriodForDate(parsed.organizationId, parsed.effectiveAt, tx)
    const now = new Date()
    const correction = await tx.stockAdjustment.create({
      data: {
        organizationId: parsed.organizationId,
        locationId: original.locationId,
        adjustmentNumber: reversalAdjustmentNumber(original.adjustmentNumber, original.id),
        type: AdjustmentType.CORRECTION,
        reason: parsed.reason,
        status: AdjustmentStatus.COMPLETED,
        adjustmentDate: parsed.effectiveAt,
        createdById: parsed.requestedById,
        approvedById: parsed.approvedById,
        approvedAt: now,
        correctionKind: StockAdjustmentCorrectionKind.REVERSAL,
        reversalOfAdjustmentId: original.id,
        metadata: {
          originalAdjustmentId: original.id,
          originalAdjustmentNumber: original.adjustmentNumber,
          originalPostingBatchId: originalBatch.id,
          originalJournalEntryId: originalJournal.id,
          idempotencyKey: parsed.idempotencyKey,
        },
      },
    })

    const movementTransactionIds: string[] = []
    const movementEvidence: Array<{
      originalMovementId: string
      reversalMovementId: string
      quantity: string
      totalCost: string
    }> = []

    for (const plan of plans) {
      const updated = await tx.inventoryLevel.updateMany({
        where: {
          id: plan.level.id,
          version: plan.level.version,
          quantityOnHand: plan.currentQuantityOnHand,
          quantityAvailable: plan.currentQuantityAvailable,
          totalValue: plan.currentTotalValue,
        },
        data: {
          quantityOnHand: plan.nextQuantityOnHand,
          quantityAvailable: plan.nextQuantityAvailable,
          totalValue: plan.nextTotalValue,
          averageCost: plan.nextAverageCost,
          lastTransactionAt: now,
          version: { increment: 1 },
        },
      })
      if (updated.count !== 1) {
        throw new ConcurrentStockUpdateError("Inventory changed while reversing the stock adjustment.")
      }

      await tx.stockAdjustmentLine.create({
        data: {
          adjustmentId: correction.id,
          itemId: plan.itemId,
          systemQuantity: plan.currentQuantityOnHand,
          actualQuantity: plan.nextQuantityOnHand,
          adjustedQuantity: plan.reversalQuantity,
          unitCost: plan.unitCost,
          totalCost: plan.totalCost,
          notes: parsed.reason,
          metadata: {
            originalMovementIds: plan.movements.map((movement) => movement.id),
            reversalValue: plan.reversalValue.toFixed(2),
          },
        },
      })

      let runningQuantity = plan.currentQuantityOnHand
      for (const originalMovement of plan.movements) {
        const quantity = reversalQuantity(originalMovement)
        runningQuantity = runningQuantity.plus(quantity).toDecimalPlaces(3)
        const movement = await tx.inventoryTransaction.create({
          data: {
            itemId: originalMovement.itemId,
            locationId: originalMovement.locationId,
            organizationId: parsed.organizationId,
            createdById: parsed.approvedById,
            type: quantity.gt(0) ? TransactionType.ADJUSTMENT_IN : TransactionType.ADJUSTMENT_OUT,
            quantity,
            unitCost: originalMovement.unitCost,
            totalCost: originalMovement.totalCost,
            balanceAfter: runningQuantity,
            referenceType: "STOCK_ADJUSTMENT",
            referenceId: correction.id,
            referenceNumber: correction.adjustmentNumber,
            notes: parsed.reason,
            effectiveAt: parsed.effectiveAt,
            recordedAt: now,
            timeProvenance: "EXPLICIT_SOURCE_TIME",
            reversalOfTransactionId: originalMovement.id,
          },
        })
        movementTransactionIds.push(movement.id)
        movementEvidence.push({
          originalMovementId: originalMovement.id,
          reversalMovementId: movement.id,
          quantity: quantity.toFixed(3),
          totalCost: money(originalMovement.totalCost).toFixed(2),
        })
      }
    }

    const documentHash = `sha256:${hashBusinessPayload({
      originalAdjustmentId: original.id,
      correctionAdjustmentId: correction.id,
      requestedById: parsed.requestedById,
      approvedById: parsed.approvedById,
      reason: parsed.reason,
      effectiveAt: parsed.effectiveAt.toISOString(),
      originalDocumentHash: original.documentHash,
      movementEvidence,
      originalJournalEntryId: originalJournal.id,
    })}`

    const batch = await createLedgerPostingBatch({
      organizationId: parsed.organizationId,
      periodId: period.id,
      sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
      sourceId: correction.id,
      postingPurpose: AccountingPostingPurpose.REVERSAL,
      idempotencyKey: `inventory-adjustment-reversal:${original.id}:ledger`,
      metadata: {
        originalAdjustmentId: original.id,
        originalPostingBatchId: originalBatch.id,
        originalJournalEntryId: originalJournal.id,
        documentHash,
      },
    }, tx)
    if (batch.status !== LedgerPostingBatchStatus.PENDING) {
      throw new ConflictError("The inventory reversal posting batch already exists in an unexpected state.")
    }

    const postedBatch = await tx.ledgerPostingBatch.update({
      where: { id: batch.id },
      data: {
        status: LedgerPostingBatchStatus.POSTED,
        postedAt: now,
        errorMessage: null,
      },
    })

    const reversalJournal = await tx.journalEntry.create({
      data: {
        organizationId: parsed.organizationId,
        journalId: originalJournal.journalId,
        periodId: period.id,
        postingBatchId: postedBatch.id,
        entryNumber: await nextReversalEntryNumber(tx, parsed.organizationId, parsed.effectiveAt),
        entryDate: parsed.effectiveAt,
        status: JournalEntryStatus.POSTED,
        currency: originalJournal.currency,
        memo: parsed.reason,
        reference: correction.adjustmentNumber,
        sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
        sourceId: correction.id,
        postingPurpose: AccountingPostingPurpose.REVERSAL,
        reversalOfEntryId: originalJournal.id,
        postedAt: now,
        postedById: parsed.approvedById,
        createdById: parsed.approvedById,
        lines: {
          create: originalJournal.lines.map((line, index) => ({
            organizationId: parsed.organizationId,
            accountId: line.accountId,
            lineNumber: index + 1,
            description: line.description
              ? `Reversal: ${line.description}`
              : `Reversal of ${originalJournal.entryNumber}`,
            debit: line.credit,
            credit: line.debit,
            currency: line.currency,
            exchangeRate: line.exchangeRate,
            baseDebit: line.baseCredit ?? line.credit,
            baseCredit: line.baseDebit ?? line.debit,
            locationId: line.locationId,
            customerId: line.customerId,
            supplierId: line.supplierId,
            itemId: line.itemId,
            dimensions: line.dimensions ?? undefined,
            metadata: line.metadata ?? undefined,
          })),
        },
      },
    })

    await tx.journalEntry.update({
      where: { id: originalJournal.id },
      data: {
        status: JournalEntryStatus.REVERSED,
        reversedAt: now,
        reversedById: parsed.approvedById,
      },
    })

    await tx.accountingSourceLink.create({
      data: {
        organizationId: parsed.organizationId,
        postingBatchId: postedBatch.id,
        journalEntryId: reversalJournal.id,
        sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
        sourceId: correction.id,
        sourceNumber: correction.adjustmentNumber,
        sourceDate: parsed.effectiveAt,
        metadata: {
          originalAdjustmentId: original.id,
          originalJournalEntryId: originalJournal.id,
          documentHash,
        },
      },
    })

    await tx.ledgerAuditEvent.create({
      data: {
        organizationId: parsed.organizationId,
        actorId: parsed.approvedById,
        action: "INVENTORY_ADJUSTMENT_REVERSED",
        resourceType: "StockAdjustment",
        resourceId: correction.id,
        postingBatchId: postedBatch.id,
        journalEntryId: reversalJournal.id,
        message: `Inventory adjustment ${original.adjustmentNumber} reversed by ${correction.adjustmentNumber}`,
        metadata: {
          originalAdjustmentId: original.id,
          requestedById: parsed.requestedById,
          approvedById: parsed.approvedById,
          documentHash,
        },
      },
    })

    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "stock.adjustment.reversed",
      eventSource: "INTERNAL",
      idempotencyKey: parsed.idempotencyKey,
      actorId: parsed.approvedById,
      locationId: original.locationId,
      occurredAt: parsed.effectiveAt,
      sourceType: AccountingSourceType.STOCK_ADJUSTMENT,
      sourceId: correction.id,
      postingBatchId: postedBatch.id,
      documentHash,
      payload: {
        originalAdjustmentId: original.id,
        correctionAdjustmentId: correction.id,
        requestedById: parsed.requestedById,
        approvedById: parsed.approvedById,
        reason: parsed.reason,
        effectiveAt: parsed.effectiveAt.toISOString(),
        movementEvidence,
        originalJournalEntryId: originalJournal.id,
        reversalJournalEntryId: reversalJournal.id,
      },
      metadata: {
        correlationId: parsed.correlationId,
        correctionKind: StockAdjustmentCorrectionKind.REVERSAL,
      },
    })

    await tx.stockAdjustment.update({
      where: { id: correction.id },
      data: {
        documentHash,
        postedBusinessEventId: eventResult.event.id,
        ledgerPostingBatchId: postedBatch.id,
      },
    })

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.approvedById,
        entityType: "StockAdjustment",
        entityId: correction.id,
        action: "REVERSE_STOCK_ADJUSTMENT",
        changes: {
          before: {
            originalAdjustmentId: original.id,
            originalPostingBatchId: originalBatch.id,
            originalJournalEntryId: originalJournal.id,
          },
          after: {
            correctionAdjustmentId: correction.id,
            requestedById: parsed.requestedById,
            approvedById: parsed.approvedById,
            eventId: eventResult.event.id,
            postingBatchId: postedBatch.id,
            reversalJournalEntryId: reversalJournal.id,
            movementTransactionIds,
            documentHash,
          },
        },
      },
    })

    await markBusinessEventAppliedInTx(tx, parsed.organizationId, eventResult.event.id)
    await recordInventoryValuationCloseInvalidationInTx(tx, {
      organizationId: parsed.organizationId,
      sourceId: correction.id,
      periodId: period.id,
      occurredAt: parsed.effectiveAt,
      actorId: parsed.approvedById,
      documentHash,
      correlationId: parsed.correlationId ?? postedBatch.id,
    })
    await recordReversedJournalCloseInvalidationsInTx(tx, parsed.organizationId, {
      originalJournalEntryId: originalJournal.id,
      reversalJournalEntryId: reversalJournal.id,
      originalPeriodId: originalJournal.periodId,
      reversalPeriodId: period.id,
      reversalDate: parsed.effectiveAt,
      correlationId: parsed.correlationId ?? postedBatch.id,
    }, {
      actorId: parsed.approvedById,
      now,
    })

    return {
      originalAdjustmentId: original.id,
      correctionAdjustmentId: correction.id,
      eventId: eventResult.event.id,
      idempotencyKey: parsed.idempotencyKey,
      documentHash,
      movementTransactionIds,
      postingBatchId: postedBatch.id,
      journalEntryId: reversalJournal.id,
      replayed: false,
    }
  }

  try {
    return hasTransaction(client) ? await client.$transaction(run) : await run(client)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Stock adjustment or one of its movements has already been reversed.")
    }
    throw error
  }
}
