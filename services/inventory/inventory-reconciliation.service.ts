import { JournalEntryStatus, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { NotFoundError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"

import {
  reconcileInventoryClass3InputSchema,
  type ReconcileInventoryClass3Input,
} from "./inventory-event.schemas"

type DbClient = Prisma.TransactionClient | typeof db

export type InventoryClass3FailureType =
  | "CLASS3_RECONCILIATION_DRIFT"
  | "MISSING_STOCK_EVENT"
  | "ORPHAN_CLASS3_POSTING"

export type InventoryClass3Failure = {
  type: InventoryClass3FailureType
  severity: "high" | "critical"
  message: string
  metadata?: Record<string, unknown>
}

export type InventoryClass3ReconciliationResult = {
  organizationId: string
  periodId?: string
  currency: string
  status: "PASSED" | "BLOCKED"
  inventoryValue: string
  ledgerClass3Value: string
  driftAmount: string
  reportHash: string
  sourceCounts: {
    inventoryLevelCount: number
    inventoryTransactionCount: number
    stockAdjustmentCount: number
    stockWriteOffCount: number
    stockCountVarianceCount: number
    purchaseReceiptCount: number
    posMovementCount: number
    openingStockCount: number
    class3JournalLineCount: number
    stockBusinessEventCount: number
  }
  failures: InventoryClass3Failure[]
}

const stockSourceTypes = ["STOCK_TRANSFER", "STOCK_ADJUSTMENT", "GOODS_RECEIPT", "PRODUCTION_BATCH"] as const
const postedStatuses = [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] as const

function decimal(value: Prisma.Decimal.Value | null | undefined) {
  if (value === null || value === undefined) return new Prisma.Decimal(0)
  return new Prisma.Decimal(value)
}

function money(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2)
}

async function resolvePeriod(
  client: DbClient,
  organizationId: string,
  periodId?: string,
) {
  if (!periodId) return null

  const period = await client.accountingPeriod.findFirst({
    where: { id: periodId, organizationId },
    select: { id: true, startDate: true, endDate: true },
  })

  if (!period) throw new NotFoundError("Accounting period not found")
  return period
}

export async function reconcileInventoryClass3(
  input: ReconcileInventoryClass3Input,
  client: DbClient = db,
): Promise<InventoryClass3ReconciliationResult> {
  const parsed = reconcileInventoryClass3InputSchema.parse(input)
  const period = await resolvePeriod(client, parsed.organizationId, parsed.periodId)
  const toleranceValue = decimal(parsed.toleranceValue ?? "0.00")
  const currency = parsed.currency.trim().toUpperCase()

  const inventoryMovementWhere = {
    organizationId: parsed.organizationId,
    ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
    ...(period ? { createdAt: { gte: period.startDate, lte: period.endDate } } : {}),
  } satisfies Prisma.InventoryTransactionWhereInput

  const adjustmentDateFilter = period
    ? { adjustmentDate: { gte: period.startDate, lte: period.endDate } }
    : {}
  const countDateFilter = period
    ? { countDate: { gte: period.startDate, lte: period.endDate } }
    : {}

  const [
    levels,
    class3Lines,
    movements,
    events,
    inventoryTransactionCount,
    stockAdjustmentCount,
    stockWriteOffCount,
    stockCountVarianceCount,
    purchaseReceiptCount,
    posMovementCount,
    openingStockCount,
  ] = await Promise.all([
    client.inventoryLevel.findMany({
      where: {
        item: { organizationId: parsed.organizationId },
        location: {
          organizationId: parsed.organizationId,
          ...(parsed.locationId ? { id: parsed.locationId } : {}),
        },
      },
      select: {
        itemId: true,
        locationId: true,
        totalValue: true,
      },
    }),
    client.journalEntryLine.findMany({
      where: {
        organizationId: parsed.organizationId,
        currency,
        account: {
          organizationId: parsed.organizationId,
          isActive: true,
          syscohadaClass: { startsWith: "3" },
        },
        journalEntry: {
          organizationId: parsed.organizationId,
          status: { in: [...postedStatuses] },
          ...(period ? { periodId: period.id } : {}),
        },
      },
      select: {
        id: true,
        debit: true,
        credit: true,
        accountId: true,
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            sourceType: true,
            sourceId: true,
          },
        },
      },
    }),
    client.inventoryTransaction.findMany({
      where: inventoryMovementWhere,
      select: {
        id: true,
        type: true,
        referenceType: true,
        referenceId: true,
        referenceNumber: true,
        itemId: true,
        locationId: true,
      },
      take: 500,
    }),
    client.businessEvent.findMany({
      where: {
        organizationId: parsed.organizationId,
        sourceType: { in: [...stockSourceTypes] },
      },
      select: {
        sourceType: true,
        sourceId: true,
      },
      take: 1000,
    }),
    client.inventoryTransaction.count({ where: inventoryMovementWhere }),
    client.stockAdjustment.count({
      where: {
        organizationId: parsed.organizationId,
        status: "COMPLETED",
        ...adjustmentDateFilter,
      },
    }),
    client.stockAdjustment.count({
      where: {
        organizationId: parsed.organizationId,
        status: "COMPLETED",
        type: "WRITE_OFF",
        ...adjustmentDateFilter,
      },
    }),
    client.stockCountSession.count({
      where: {
        organizationId: parsed.organizationId,
        status: "POSTED",
        ...countDateFilter,
      },
    }),
    client.inventoryTransaction.count({
      where: {
        ...inventoryMovementWhere,
        OR: [{ type: "PURCHASE_RECEIPT" }, { referenceType: "GOODS_RECEIPT" }],
      },
    }),
    client.inventoryTransaction.count({
      where: {
        ...inventoryMovementWhere,
        type: { in: ["SALE", "SALES_RETURN"] },
      },
    }),
    client.inventoryTransaction.count({
      where: {
        ...inventoryMovementWhere,
        type: "INITIAL_STOCK",
      },
    }),
  ])

  const inventoryValue = levels.reduce(
    (total, level) => total.plus(decimal(level.totalValue)).toDecimalPlaces(2),
    new Prisma.Decimal(0),
  )
  const ledgerClass3Value = class3Lines.reduce(
    (total, line) => total.plus(decimal(line.debit)).minus(decimal(line.credit)).toDecimalPlaces(2),
    new Prisma.Decimal(0),
  )
  const driftAmount = inventoryValue.minus(ledgerClass3Value).toDecimalPlaces(2)
  const failures: InventoryClass3Failure[] = []

  if (driftAmount.abs().gt(toleranceValue)) {
    failures.push({
      type: "CLASS3_RECONCILIATION_DRIFT",
      severity: "critical",
      message: `Inventory subledger value ${money(inventoryValue)} does not reconcile to class 3 ledger value ${money(ledgerClass3Value)} ${currency}.`,
      metadata: {
        inventoryValue: money(inventoryValue),
        ledgerClass3Value: money(ledgerClass3Value),
        driftAmount: money(driftAmount),
        currency,
      },
    })
  }

  const eventKeys = new Set(
    events
      .filter((event) => event.sourceType && event.sourceId)
      .map((event) => `${event.sourceType}:${event.sourceId}`),
  )

  for (const movement of movements) {
    if (!movement.referenceType || !movement.referenceId) continue
    if (!stockSourceTypes.includes(movement.referenceType as (typeof stockSourceTypes)[number])) continue
    if (!eventKeys.has(`${movement.referenceType}:${movement.referenceId}`)) {
      failures.push({
        type: "MISSING_STOCK_EVENT",
        severity: "high",
        message: `Inventory movement ${movement.id} is missing stock business event evidence.`,
        metadata: {
          inventoryTransactionId: movement.id,
          referenceType: movement.referenceType,
          referenceId: movement.referenceId,
          referenceNumber: movement.referenceNumber,
          itemId: movement.itemId,
          locationId: movement.locationId,
        },
      })
    }
  }

  for (const line of class3Lines) {
    if (
      !line.journalEntry.sourceType ||
      !line.journalEntry.sourceId ||
      !stockSourceTypes.includes(line.journalEntry.sourceType as (typeof stockSourceTypes)[number])
    ) {
      failures.push({
        type: "ORPHAN_CLASS3_POSTING",
        severity: "critical",
        message: `Class 3 journal line ${line.id} is not linked to an inventory source event.`,
        metadata: {
          journalEntryId: line.journalEntry.id,
          entryNumber: line.journalEntry.entryNumber,
          sourceType: line.journalEntry.sourceType,
          sourceId: line.journalEntry.sourceId,
          accountId: line.accountId,
        },
      })
    }
  }

  const report = {
    organizationId: parsed.organizationId,
    periodId: parsed.periodId,
    currency,
    inventoryValue: money(inventoryValue),
    ledgerClass3Value: money(ledgerClass3Value),
    driftAmount: money(driftAmount),
    sourceCounts: {
      inventoryLevelCount: levels.length,
      inventoryTransactionCount,
      stockAdjustmentCount,
      stockWriteOffCount,
      stockCountVarianceCount,
      purchaseReceiptCount,
      posMovementCount,
      openingStockCount,
      class3JournalLineCount: class3Lines.length,
      stockBusinessEventCount: events.length,
    },
    failureCount: failures.length,
  }

  return {
    ...report,
    status: failures.length === 0 ? "PASSED" : "BLOCKED",
    reportHash: `sha256:${hashBusinessPayload(report)}`,
    failures,
  }
}
