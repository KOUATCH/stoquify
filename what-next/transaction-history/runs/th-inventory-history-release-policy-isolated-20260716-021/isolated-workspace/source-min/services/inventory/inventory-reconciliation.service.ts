import {
  AccountingSourceType,
  JournalEntryStatus,
  Prisma,
  TransactionReferenceType,
  TransactionType,
} from "@prisma/client";

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  NotFoundError,
} from "@/services/_shared/action-errors";
import { hashBusinessPayload } from "@/services/events/business-event.service";

import {
  reconcileInventoryClass3InputSchema,
  type ReconcileInventoryClass3Input,
} from "./inventory-event.schemas";

type DbClient = Prisma.TransactionClient | typeof db;

export type InventoryClass3FailureType =
  | "CLASS3_RECONCILIATION_DRIFT"
  | "INVENTORY_ROLL_FORWARD_DRIFT"
  | "CLASS3_ROLL_FORWARD_DRIFT"
  | "MISSING_STOCK_EVENT"
  | "ORPHAN_CLASS3_POSTING";

export type InventoryClass3Failure = {
  type: InventoryClass3FailureType;
  severity: "high" | "critical";
  message: string;
  metadata?: Record<string, unknown>;
};

export type InventoryClass3ReconciliationResult = {
  organizationId: string;
  periodId?: string;
  currency: string;
  status: "PASSED" | "BLOCKED";
  recordedThrough: string;
  periodStart: string | null;
  periodEnd: string | null;
  inventoryValue: string;
  ledgerClass3Value: string;
  driftAmount: string;
  rollForward: {
    openingInventoryValue: string;
    movementInventoryValue: string;
    closingInventoryValue: string;
    inventoryRollForwardVariance: string;
    openingLedgerClass3Value: string;
    movementLedgerClass3Value: string;
    closingLedgerClass3Value: string;
    ledgerRollForwardVariance: string;
  };
  reportHash: string;
  sourceCounts: {
    inventoryLevelCount: number;
    inventoryTransactionCount: number;
    stockAdjustmentCount: number;
    stockWriteOffCount: number;
    stockCountVarianceCount: number;
    purchaseReceiptCount: number;
    posMovementCount: number;
    openingStockCount: number;
    class3JournalLineCount: number;
    stockBusinessEventCount: number;
  };
  failures: InventoryClass3Failure[];
};

type PeriodBoundary = {
  id: string;
  startDate: Date;
  endDate: Date;
};

type ValueWindow = {
  value: Prisma.Decimal;
  count: number;
};

type SourceMovement = {
  id: string;
  type: TransactionType;
  referenceType: TransactionReferenceType | null;
  referenceId: string | null;
  referenceNumber: string | null;
  itemId: string;
  locationId: string;
};

const sourcePageSize = 250;
const maxFailureSamples = 25;
const postedStatuses = [
  JournalEntryStatus.POSTED,
  JournalEntryStatus.REVERSED,
] as const;

const inboundValueTypes = [
  TransactionType.PURCHASE_RECEIPT,
  TransactionType.SALES_RETURN,
  TransactionType.TRANSFER_IN,
  TransactionType.ADJUSTMENT_IN,
  TransactionType.PRODUCTION_IN,
  TransactionType.INITIAL_STOCK,
  TransactionType.RESERVATION_RELEASE,
] as const;

const outboundValueTypes = [
  TransactionType.SALE,
  TransactionType.PURCHASE_RETURN,
  TransactionType.TRANSFER_OUT,
  TransactionType.ADJUSTMENT_OUT,
  TransactionType.PRODUCTION_OUT,
  TransactionType.DAMAGED,
  TransactionType.EXPIRED,
  TransactionType.THEFT,
  TransactionType.WRITE_OFF,
  TransactionType.SAMPLE,
  TransactionType.PROMOTION,
  TransactionType.RESERVATION,
] as const;

const inventoryAccountingSourceTypes = [
  AccountingSourceType.OPENING_BALANCE,
  AccountingSourceType.GOODS_RECEIPT,
  AccountingSourceType.STOCK_ADJUSTMENT,
  AccountingSourceType.STOCK_COUNT,
  AccountingSourceType.STOCK_TRANSFER,
  AccountingSourceType.PRODUCTION_BATCH,
  AccountingSourceType.POS_SALE,
  AccountingSourceType.POS_REFUND,
  AccountingSourceType.POS_VOID,
] as const;

const manualAdjustmentTypes = new Set<TransactionType>([
  TransactionType.ADJUSTMENT_IN,
  TransactionType.ADJUSTMENT_OUT,
  TransactionType.DAMAGED,
  TransactionType.EXPIRED,
  TransactionType.THEFT,
  TransactionType.WRITE_OFF,
  TransactionType.SAMPLE,
  TransactionType.PROMOTION,
]);

function decimal(value: Prisma.Decimal.Value | null | undefined) {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

function money(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2);
}

function emptyValueWindow(): ValueWindow {
  return { value: new Prisma.Decimal(0), count: 0 };
}

async function resolvePeriod(
  client: DbClient,
  organizationId: string,
  periodId?: string,
): Promise<PeriodBoundary | null> {
  if (!periodId) return null;

  const period = await client.accountingPeriod.findFirst({
    where: { id: periodId, organizationId },
    select: { id: true, startDate: true, endDate: true },
  });

  if (!period) throw new NotFoundError("Accounting period not found");
  return period;
}

async function aggregateInventoryValue(
  client: DbClient,
  where: Prisma.InventoryTransactionWhereInput,
): Promise<ValueWindow> {
  const [inbound, outbound, count] = await Promise.all([
    client.inventoryTransaction.aggregate({
      where: { ...where, type: { in: [...inboundValueTypes] } },
      _sum: { totalCost: true },
    }),
    client.inventoryTransaction.aggregate({
      where: { ...where, type: { in: [...outboundValueTypes] } },
      _sum: { totalCost: true },
    }),
    client.inventoryTransaction.count({ where }),
  ]);

  return {
    value: decimal(inbound._sum.totalCost)
      .minus(decimal(outbound._sum.totalCost))
      .toDecimalPlaces(2),
    count,
  };
}

async function aggregateClass3Value(
  client: DbClient,
  where: Prisma.JournalEntryLineWhereInput,
): Promise<ValueWindow> {
  const aggregate = await client.journalEntryLine.aggregate({
    where,
    _sum: { debit: true, credit: true },
    _count: { _all: true },
  });

  return {
    value: decimal(aggregate._sum.debit)
      .minus(decimal(aggregate._sum.credit))
      .toDecimalPlaces(2),
    count: aggregate._count._all,
  };
}

function expectedBusinessSource(
  movement: SourceMovement,
): AccountingSourceType | null {
  switch (movement.referenceType) {
    case TransactionReferenceType.STOCK_TRANSFER:
      return AccountingSourceType.STOCK_TRANSFER;
    case TransactionReferenceType.STOCK_ADJUSTMENT:
      return AccountingSourceType.STOCK_ADJUSTMENT;
    case TransactionReferenceType.GOODS_RECEIPT:
      return AccountingSourceType.GOODS_RECEIPT;
    case TransactionReferenceType.PRODUCTION_BATCH:
      return AccountingSourceType.PRODUCTION_BATCH;
    case TransactionReferenceType.MANUAL:
      if (movement.type === TransactionType.INITIAL_STOCK)
        return AccountingSourceType.OPENING_BALANCE;
      if (manualAdjustmentTypes.has(movement.type)) {
        return AccountingSourceType.STOCK_ADJUSTMENT;
      }
      return null;
    case TransactionReferenceType.SALES_ORDER:
      if (movement.type === TransactionType.SALE)
        return AccountingSourceType.POS_SALE;
      if (movement.type === TransactionType.SALES_RETURN)
        return AccountingSourceType.POS_REFUND;
      return null;
    case TransactionReferenceType.RETURN:
      return movement.type === TransactionType.SALES_RETURN
        ? AccountingSourceType.POS_REFUND
        : null;
    default:
      return null;
  }
}

async function inspectMovementEventContinuity(
  client: DbClient,
  where: Prisma.InventoryTransactionWhereInput,
  organizationId: string,
  recordedThrough: Date,
) {
  let cursor: string | undefined;
  let missingCount = 0;
  const missingSamples: Array<Record<string, unknown>> = [];

  // The page size bounds memory only; cursor traversal continues through the complete population.
  for (;;) {
    const movements = await client.inventoryTransaction.findMany({
      where: { ...where, referenceId: { not: null } },
      select: {
        id: true,
        type: true,
        referenceType: true,
        referenceId: true,
        referenceNumber: true,
        itemId: true,
        locationId: true,
      },
      orderBy: { id: "asc" },
      take: sourcePageSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (movements.length === 0) break;

    const expectations = movements.flatMap((movement) => {
      const sourceType = expectedBusinessSource(movement);
      return sourceType && movement.referenceId
        ? [{ movement, sourceType, sourceId: movement.referenceId }]
        : [];
    });
    const uniqueSources = [
      ...new Map(
        expectations.map((item) => [
          `${item.sourceType}:${item.sourceId}`,
          item,
        ]),
      ).values(),
    ];
    const events =
      uniqueSources.length === 0
        ? []
        : await client.businessEvent.findMany({
            where: {
              organizationId,
              recordedAt: { lte: recordedThrough },
              OR: uniqueSources.map((source) => ({
                sourceType: source.sourceType,
                sourceId: source.sourceId,
              })),
            },
            select: { sourceType: true, sourceId: true },
          });
    const eventKeys = new Set(
      events
        .filter((event) => event.sourceType && event.sourceId)
        .map((event) => `${event.sourceType}:${event.sourceId}`),
    );

    for (const expectation of expectations) {
      if (eventKeys.has(`${expectation.sourceType}:${expectation.sourceId}`))
        continue;
      missingCount += 1;
      if (missingSamples.length < maxFailureSamples) {
        missingSamples.push({
          inventoryTransactionId: expectation.movement.id,
          expectedSourceType: expectation.sourceType,
          referenceType: expectation.movement.referenceType,
          referenceId: expectation.sourceId,
          referenceNumber: expectation.movement.referenceNumber,
          itemId: expectation.movement.itemId,
          locationId: expectation.movement.locationId,
        });
      }
    }

    cursor = movements[movements.length - 1]?.id;
    if (movements.length < sourcePageSize || !cursor) break;
  }

  return { missingCount, missingSamples };
}

export async function reconcileInventoryClass3(
  input: ReconcileInventoryClass3Input,
  client: DbClient = db,
): Promise<InventoryClass3ReconciliationResult> {
  const startedAt = new Date();
  const parsed = reconcileInventoryClass3InputSchema.parse(input);
  const recordedThrough = parsed.recordedThrough ?? startedAt;
  if (recordedThrough.getTime() > startedAt.getTime()) {
    throw new BusinessRuleError(
      "Inventory reconciliation recordedThrough cannot be in the future.",
    );
  }

  const period = await resolvePeriod(
    client,
    parsed.organizationId,
    parsed.periodId,
  );
  const toleranceValue = decimal(parsed.toleranceValue ?? "0.00");
  const currency = parsed.currency.trim().toUpperCase();
  const inventoryBaseWhere = {
    organizationId: parsed.organizationId,
    ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
    recordedAt: { lte: recordedThrough },
  } satisfies Prisma.InventoryTransactionWhereInput;
  const movementInventoryWhere = {
    ...inventoryBaseWhere,
    effectiveAt: period
      ? { gte: period.startDate, lte: period.endDate }
      : { lte: recordedThrough },
  } satisfies Prisma.InventoryTransactionWhereInput;
  const openingInventoryWhere = period
    ? ({
        ...inventoryBaseWhere,
        effectiveAt: { lt: period.startDate },
      } satisfies Prisma.InventoryTransactionWhereInput)
    : null;
  const closingInventoryWhere = period
    ? ({
        ...inventoryBaseWhere,
        effectiveAt: { lte: period.endDate },
      } satisfies Prisma.InventoryTransactionWhereInput)
    : movementInventoryWhere;

  const class3Where = (entryDate: Prisma.DateTimeFilter, orphanOnly = false) =>
    ({
      organizationId: parsed.organizationId,
      currency,
      ...(parsed.locationId ? { locationId: parsed.locationId } : {}),
      account: {
        organizationId: parsed.organizationId,
        isActive: true,
        syscohadaClass: { startsWith: "3" },
      },
      journalEntry: {
        organizationId: parsed.organizationId,
        status: { in: [...postedStatuses] },
        postedAt: { lte: recordedThrough },
        entryDate,
        ...(orphanOnly
          ? {
              OR: [
                { sourceType: null },
                { sourceId: null },
                { sourceType: { notIn: [...inventoryAccountingSourceTypes] } },
              ],
            }
          : {}),
      },
    }) satisfies Prisma.JournalEntryLineWhereInput;

  const movementClass3Where = class3Where(
    period
      ? { gte: period.startDate, lte: period.endDate }
      : { lte: recordedThrough },
  );
  const openingClass3Where = period
    ? class3Where({ lt: period.startDate })
    : null;
  const closingClass3Where = period
    ? class3Where({ lte: period.endDate })
    : movementClass3Where;
  const orphanClass3Where = class3Where(
    period ? { lte: period.endDate } : { lte: recordedThrough },
    true,
  );
  const adjustmentDateFilter = period
    ? { adjustmentDate: { gte: period.startDate, lte: period.endDate } }
    : {};
  const countDateFilter = period
    ? { countDate: { gte: period.startDate, lte: period.endDate } }
    : {};
  const closingEventDateFilter = period
    ? { occurredAt: { lte: period.endDate } }
    : { occurredAt: { lte: recordedThrough } };

  const openingInventoryPromise = openingInventoryWhere
    ? aggregateInventoryValue(client, openingInventoryWhere)
    : Promise.resolve(emptyValueWindow());
  const movementInventoryPromise = aggregateInventoryValue(
    client,
    movementInventoryWhere,
  );
  const closingInventoryPromise = period
    ? aggregateInventoryValue(client, closingInventoryWhere)
    : movementInventoryPromise;
  const openingClass3Promise = openingClass3Where
    ? aggregateClass3Value(client, openingClass3Where)
    : Promise.resolve(emptyValueWindow());
  const movementClass3Promise = aggregateClass3Value(
    client,
    movementClass3Where,
  );
  const closingClass3Promise = period
    ? aggregateClass3Value(client, closingClass3Where)
    : movementClass3Promise;

  const [
    openingInventory,
    movementInventory,
    closingInventory,
    openingClass3,
    movementClass3,
    closingClass3,
    inventoryLevelCount,
    stockAdjustmentCount,
    stockWriteOffCount,
    stockCountVarianceCount,
    purchaseReceiptCount,
    posMovementCount,
    openingStockCount,
    stockBusinessEventCount,
    orphanClass3Count,
    orphanClass3Sample,
  ] = await Promise.all([
    openingInventoryPromise,
    movementInventoryPromise,
    closingInventoryPromise,
    openingClass3Promise,
    movementClass3Promise,
    closingClass3Promise,
    client.inventoryLevel.count({
      where: {
        item: { organizationId: parsed.organizationId },
        location: {
          organizationId: parsed.organizationId,
          ...(parsed.locationId ? { id: parsed.locationId } : {}),
        },
      },
    }),
    client.stockAdjustment.count({
      where: {
        organizationId: parsed.organizationId,
        status: "COMPLETED",
        createdAt: { lte: recordedThrough },
        ...adjustmentDateFilter,
      },
    }),
    client.stockAdjustment.count({
      where: {
        organizationId: parsed.organizationId,
        status: "COMPLETED",
        type: "WRITE_OFF",
        createdAt: { lte: recordedThrough },
        ...adjustmentDateFilter,
      },
    }),
    client.stockCountSession.count({
      where: {
        organizationId: parsed.organizationId,
        status: "POSTED",
        createdAt: { lte: recordedThrough },
        ...countDateFilter,
      },
    }),
    client.inventoryTransaction.count({
      where: {
        ...movementInventoryWhere,
        OR: [
          { type: TransactionType.PURCHASE_RECEIPT },
          { referenceType: TransactionReferenceType.GOODS_RECEIPT },
        ],
      },
    }),
    client.inventoryTransaction.count({
      where: {
        ...movementInventoryWhere,
        type: { in: [TransactionType.SALE, TransactionType.SALES_RETURN] },
      },
    }),
    client.inventoryTransaction.count({
      where: { ...movementInventoryWhere, type: TransactionType.INITIAL_STOCK },
    }),
    client.businessEvent.count({
      where: {
        organizationId: parsed.organizationId,
        sourceType: { in: [...inventoryAccountingSourceTypes] },
        recordedAt: { lte: recordedThrough },
        ...closingEventDateFilter,
      },
    }),
    client.journalEntryLine.count({ where: orphanClass3Where }),
    client.journalEntryLine.findFirst({
      where: orphanClass3Where,
      select: {
        id: true,
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
      orderBy: { id: "asc" },
    }),
  ]);

  const continuity = await inspectMovementEventContinuity(
    client,
    closingInventoryWhere,
    parsed.organizationId,
    recordedThrough,
  );
  const inventoryRollForwardVariance = openingInventory.value
    .plus(movementInventory.value)
    .minus(closingInventory.value)
    .toDecimalPlaces(2);
  const ledgerRollForwardVariance = openingClass3.value
    .plus(movementClass3.value)
    .minus(closingClass3.value)
    .toDecimalPlaces(2);
  const driftAmount = closingInventory.value
    .minus(closingClass3.value)
    .toDecimalPlaces(2);
  const failures: InventoryClass3Failure[] = [];

  if (inventoryRollForwardVariance.abs().gt(toleranceValue)) {
    failures.push({
      type: "INVENTORY_ROLL_FORWARD_DRIFT",
      severity: "critical",
      message: `Inventory opening plus movement does not reproduce closing value at the declared cutoff.`,
      metadata: {
        openingInventoryValue: money(openingInventory.value),
        movementInventoryValue: money(movementInventory.value),
        closingInventoryValue: money(closingInventory.value),
        variance: money(inventoryRollForwardVariance),
      },
    });
  }

  if (ledgerRollForwardVariance.abs().gt(toleranceValue)) {
    failures.push({
      type: "CLASS3_ROLL_FORWARD_DRIFT",
      severity: "critical",
      message: `Class 3 opening plus movement does not reproduce closing value at the declared cutoff.`,
      metadata: {
        openingLedgerClass3Value: money(openingClass3.value),
        movementLedgerClass3Value: money(movementClass3.value),
        closingLedgerClass3Value: money(closingClass3.value),
        variance: money(ledgerRollForwardVariance),
      },
    });
  }

  if (driftAmount.abs().gt(toleranceValue)) {
    failures.push({
      type: "CLASS3_RECONCILIATION_DRIFT",
      severity: "critical",
      message: `Inventory subledger value ${money(closingInventory.value)} does not reconcile to class 3 ledger value ${money(closingClass3.value)} ${currency}.`,
      metadata: {
        inventoryValue: money(closingInventory.value),
        ledgerClass3Value: money(closingClass3.value),
        driftAmount: money(driftAmount),
        currency,
        recordedThrough: recordedThrough.toISOString(),
      },
    });
  }

  if (continuity.missingCount > 0) {
    failures.push({
      type: "MISSING_STOCK_EVENT",
      severity: "high",
      message: `${continuity.missingCount} inventory movement(s) are missing business-event evidence at the declared cutoff.`,
      metadata: {
        missingMovementCount: continuity.missingCount,
        sampledMovementCount: continuity.missingSamples.length,
        samples: continuity.missingSamples,
      },
    });
  }

  if (orphanClass3Count > 0) {
    failures.push({
      type: "ORPHAN_CLASS3_POSTING",
      severity: "critical",
      message: `${orphanClass3Count} class 3 journal line(s) are not linked to a recognized inventory source.`,
      metadata: {
        orphanClass3LineCount: orphanClass3Count,
        sample: orphanClass3Sample
          ? {
              journalEntryLineId: orphanClass3Sample.id,
              accountId: orphanClass3Sample.accountId,
              journalEntryId: orphanClass3Sample.journalEntry.id,
              entryNumber: orphanClass3Sample.journalEntry.entryNumber,
              sourceType: orphanClass3Sample.journalEntry.sourceType,
              sourceId: orphanClass3Sample.journalEntry.sourceId,
            }
          : null,
      },
    });
  }

  const rollForward = {
    openingInventoryValue: money(openingInventory.value),
    movementInventoryValue: money(movementInventory.value),
    closingInventoryValue: money(closingInventory.value),
    inventoryRollForwardVariance: money(inventoryRollForwardVariance),
    openingLedgerClass3Value: money(openingClass3.value),
    movementLedgerClass3Value: money(movementClass3.value),
    closingLedgerClass3Value: money(closingClass3.value),
    ledgerRollForwardVariance: money(ledgerRollForwardVariance),
  };
  const sourceCounts = {
    inventoryLevelCount,
    inventoryTransactionCount: movementInventory.count,
    stockAdjustmentCount,
    stockWriteOffCount,
    stockCountVarianceCount,
    purchaseReceiptCount,
    posMovementCount,
    openingStockCount,
    class3JournalLineCount: movementClass3.count,
    stockBusinessEventCount,
  };
  const report = {
    organizationId: parsed.organizationId,
    periodId: parsed.periodId,
    currency,
    recordedThrough: recordedThrough.toISOString(),
    periodStart: period?.startDate.toISOString() ?? null,
    periodEnd: period?.endDate.toISOString() ?? null,
    inventoryValue: money(closingInventory.value),
    ledgerClass3Value: money(closingClass3.value),
    driftAmount: money(driftAmount),
    rollForward,
    sourceCounts,
    failureCount: failures.length,
  };

  return {
    ...report,
    status: failures.length === 0 ? "PASSED" : "BLOCKED",
    reportHash: `sha256:${hashBusinessPayload(report)}`,
    failures,
  };
}
