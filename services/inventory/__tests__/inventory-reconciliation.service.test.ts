import {
  AccountingSourceType,
  Prisma,
  TransactionReferenceType,
  TransactionType,
} from "@prisma/client";

import { db } from "@/prisma/db";

import { reconcileInventoryClass3 } from "../inventory-reconciliation.service";

jest.mock("@/prisma/db", () => ({
  db: {
    accountingPeriod: { findFirst: jest.fn() },
    inventoryLevel: { count: jest.fn(), findMany: jest.fn() },
    journalEntryLine: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    inventoryTransaction: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    stockAdjustment: { count: jest.fn(), findMany: jest.fn() },
    stockCountSession: { count: jest.fn(), findMany: jest.fn() },
    businessEvent: { count: jest.fn(), findMany: jest.fn() },
  },
}));

const mockedDb = db as unknown as {
  accountingPeriod: { findFirst: jest.Mock };
  inventoryLevel: { count: jest.Mock; findMany: jest.Mock };
  journalEntryLine: {
    aggregate: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
  inventoryTransaction: {
    aggregate: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
  };
  stockAdjustment: { count: jest.Mock; findMany: jest.Mock };
  stockCountSession: { count: jest.Mock; findMany: jest.Mock };
  businessEvent: { count: jest.Mock; findMany: jest.Mock };
};

const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");
const recordedThrough = new Date("2026-07-01T00:00:00.000Z");

function decimal(value: string | number) {
  return new Prisma.Decimal(value);
}

function mockInventoryValues(values: Array<string | number>) {
  for (const [index, value] of values.entries()) {
    mockedDb.inventoryTransaction.aggregate.mockResolvedValueOnce({
      _sum: { totalCost: index % 2 === 0 ? decimal(value) : Prisma.Decimal.max(decimal(value), 0) },
    });
    if (index % 2 === 1) mockedDb.inventoryTransaction.aggregate.mockResolvedValueOnce({ _sum: { totalCost: Prisma.Decimal.min(decimal(value), 0) } });
  }
}

function mockClass3Values(values: Array<[string | number, string | number]>) {
  for (const [debit, credit] of values) {
    mockedDb.journalEntryLine.aggregate.mockResolvedValueOnce({
      _sum: { debit: decimal(debit), credit: decimal(credit) },
      _count: { _all: 1 },
    });
  }
}

function stockMovement(id = "movement-1", referenceId = "transfer-1") {
  return {
    id,
    type: TransactionType.TRANSFER_IN,
    referenceType: TransactionReferenceType.STOCK_TRANSFER,
    referenceId,
    referenceNumber: "TR-" + id,
    itemId: "item-1",
    locationId: "loc-1",
  };
}

function configurePassingPopulation() {
  // opening=500, movement=300-100, closing=800-100
  mockInventoryValues([500, 0, 300, 100, 800, 100]);
  mockClass3Values([
    [500, 0],
    [300, 100],
    [800, 100],
  ]);
  mockedDb.inventoryTransaction.findMany.mockResolvedValue([stockMovement()]);
  mockedDb.businessEvent.findMany.mockResolvedValue([
    { sourceType: AccountingSourceType.STOCK_TRANSFER, sourceId: "transfer-1" },
  ]);
}

describe("reconcileInventoryClass3", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedDb.accountingPeriod.findFirst.mockResolvedValue({
      id: "period-1",
      startDate: periodStart,
      endDate: periodEnd,
    });
    mockedDb.inventoryLevel.count.mockResolvedValue(1);
    mockedDb.inventoryTransaction.count.mockResolvedValue(1);
    mockedDb.stockAdjustment.count.mockResolvedValue(0);
    mockedDb.stockCountSession.count.mockResolvedValue(0);
    mockedDb.businessEvent.count.mockResolvedValue(1);
    mockedDb.journalEntryLine.count.mockResolvedValue(0);
    mockedDb.journalEntryLine.findFirst.mockResolvedValue(null);
    for (const model of [mockedDb.inventoryLevel, mockedDb.journalEntryLine, mockedDb.stockAdjustment, mockedDb.stockCountSession]) model.findMany.mockResolvedValue([]);
    configurePassingPopulation();
  });

  it("proves inventory and class 3 roll-forwards at one recorded-through cutoff", async () => {
    const result = await reconcileInventoryClass3({
      organizationId: "org-1",
      periodId: "period-1",
      currency: "xaf",
      recordedThrough,
    });

    expect(result).toMatchObject({
      status: "PASSED",
      currency: "XAF",
      recordedThrough: recordedThrough.toISOString(),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      inventoryValue: "700.00",
      ledgerClass3Value: "700.00",
      driftAmount: "0.00",
      rollForward: {
        openingInventoryValue: "500.00",
        movementInventoryValue: "200.00",
        closingInventoryValue: "700.00",
        inventoryRollForwardVariance: "0.00",
        openingLedgerClass3Value: "500.00",
        movementLedgerClass3Value: "200.00",
        closingLedgerClass3Value: "700.00",
        ledgerRollForwardVariance: "0.00",
      },
      sourceCounts: expect.objectContaining({
        inventoryLevelCount: 1,
        inventoryTransactionCount: 1,
        class3JournalLineCount: 1,
        stockBusinessEventCount: 1,
      }),
      failures: [],
    });
    expect(result.reportHash).toMatch(/^sha256:/);
  });

  it.each([100, -100])("normalizes outbound cost %s without rewriting immutable movements", async (outboundCost) => {
    mockedDb.inventoryTransaction.aggregate.mockReset();
    mockInventoryValues([500, 0, 0, outboundCost, 500, outboundCost]);
    mockedDb.journalEntryLine.aggregate.mockReset();
    mockClass3Values([[500, 0], [0, 100], [500, 100]]);
    const result = await reconcileInventoryClass3({ organizationId: "org-1", periodId: "period-1", currency: "XAF", recordedThrough });
    expect(result.status).toBe("PASSED");
    expect(result.inventoryValue).toBe("400.00");
    expect(result.rollForward.movementInventoryValue).toBe("-100.00");
    const negativeCostQuery = mockedDb.inventoryTransaction.aggregate.mock.calls.find(([query]) => query.where.totalCost?.lt === 0)?.[0];
    expect(negativeCostQuery.where.type.in).toContain(TransactionType.SALE);
    expect(negativeCostQuery.where.type.in).not.toContain(TransactionType.PURCHASE_RECEIPT);
  });

  it.each([TransactionType.PURCHASE_RETURN, TransactionType.PURCHASE_RETURN_REVERSAL])("includes %s in return source evidence and reversal value populations", async (type) => {
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([{ ...stockMovement("return-movement", "return-1"), type, referenceType: TransactionReferenceType.RETURN }]);
    mockedDb.businessEvent.findMany.mockResolvedValue([{ sourceType: AccountingSourceType.PURCHASE_RETURN, sourceId: "return-1" }]);
    const result = await reconcileInventoryClass3({ organizationId: "org-1", periodId: "period-1", recordedThrough });
    expect(result.status).toBe("PASSED");
    const inboundQuery = mockedDb.inventoryTransaction.aggregate.mock.calls.find(([query]) => !query.where.totalCost)?.[0];
    expect(inboundQuery.where.type.in).toContain(TransactionType.PURCHASE_RETURN_REVERSAL);
    const lookup = mockedDb.businessEvent.findMany.mock.calls.find(([query]) => query.where.OR)?.[0];
    expect(lookup.where.OR).toContainEqual({ sourceType: AccountingSourceType.PURCHASE_RETURN, sourceId: "return-1" });
    const orphan = mockedDb.journalEntryLine.count.mock.calls.find(([query]) => query.where.journalEntry?.OR)?.[0];
    expect(orphan.where.journalEntry.OR.find((condition: { sourceType?: { notIn?: string[] } }) => condition.sourceType?.notIn).sourceType.notIn).toContain(AccountingSourceType.PURCHASE_RETURN);
  });

  it("reports a purchase-return reversal without its source event", async () => {
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([{ ...stockMovement("return-reversal", "return-1"), type: TransactionType.PURCHASE_RETURN_REVERSAL, referenceType: TransactionReferenceType.RETURN }]);
    mockedDb.businessEvent.findMany.mockResolvedValue([]);
    const result = await reconcileInventoryClass3({ organizationId: "org-1", periodId: "period-1", recordedThrough });
    expect(result.failures.some(failure => failure.type === "MISSING_STOCK_EVENT")).toBe(true);
  });

  it("does not turn a negative inbound cost into positive stock value", async () => {
    mockedDb.inventoryTransaction.aggregate.mockReset();
    mockInventoryValues([-500, 0, 0, 0, -500, 0]);
    mockedDb.journalEntryLine.aggregate.mockReset();
    mockClass3Values([[500, 0], [0, 0], [500, 0]]);
    const result = await reconcileInventoryClass3({ organizationId: "org-1", periodId: "period-1", currency: "XAF", recordedThrough });
    expect(result.status).toBe("BLOCKED");
    expect(result.inventoryValue).toBe("-500.00");
    expect(result.failures.some((failure) => failure.type === "CLASS3_RECONCILIATION_DRIFT")).toBe(true);
  });

  it("blocks material class 3 drift, missing event evidence, and orphan postings", async () => {
    mockedDb.journalEntryLine.aggregate.mockReset();
    mockClass3Values([
      [500, 0],
      [100, 0],
      [600, 0],
    ]);
    mockedDb.businessEvent.findMany.mockResolvedValue([]);
    mockedDb.journalEntryLine.count.mockResolvedValue(1);
    mockedDb.journalEntryLine.findFirst.mockResolvedValue({
      id: "line-1",
      accountId: "account-31",
      journalEntry: {
        id: "entry-1",
        entryNumber: "INV-1",
        sourceType: null,
        sourceId: null,
      },
    });

    const result = await reconcileInventoryClass3({
      organizationId: "org-1",
      periodId: "period-1",
      recordedThrough,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.failures.map((failure) => failure.type)).toEqual([
      "CLASS3_RECONCILIATION_DRIFT",
      "MISSING_STOCK_EVENT",
      "ORPHAN_CLASS3_POSTING",
    ]);
    expect(result.failures[0]?.metadata).toMatchObject({
      driftAmount: "100.00",
    });
  });

  it("uses the same recorded-through cutoff for every financial population", async () => {
    await reconcileInventoryClass3({
      organizationId: "org-1",
      periodId: "period-1",
      recordedThrough,
    });

    for (const [query] of mockedDb.inventoryTransaction.aggregate.mock.calls) {
      expect(query.where.recordedAt).toEqual({ lte: recordedThrough });
    }
    for (const [query] of mockedDb.journalEntryLine.aggregate.mock.calls) {
      expect(query.where.journalEntry.postedAt).toEqual({
        lte: recordedThrough,
      });
    }
    expect(mockedDb.inventoryTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          recordedAt: { lte: recordedThrough },
        }),
      }),
    );
    expect(mockedDb.businessEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          recordedAt: { lte: recordedThrough },
        }),
      }),
    );
  });

  it("walks every movement page and reports evidence missing after the first page", async () => {
    const firstPage = Array.from({ length: 250 }, (_, index) =>
      stockMovement(
        "movement-" + String(index).padStart(3, "0"),
        "transfer-" + index,
      ),
    );
    const finalMovement = stockMovement("movement-999", "transfer-999");
    mockedDb.inventoryTransaction.findMany
      .mockReset()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([finalMovement])
      .mockResolvedValue([]);
    mockedDb.businessEvent.findMany
      .mockReset()
      .mockResolvedValueOnce(
        firstPage.map((movement) => ({
          sourceType: AccountingSourceType.STOCK_TRANSFER,
          sourceId: movement.referenceId,
        })),
      )
      .mockResolvedValueOnce([])
      .mockResolvedValue([]);

    const result = await reconcileInventoryClass3({
      organizationId: "org-1",
      periodId: "period-1",
      recordedThrough,
    });

    expect(mockedDb.inventoryTransaction.findMany.mock.calls.filter(([query]) => query.select)).toHaveLength(2);
    expect(
      mockedDb.inventoryTransaction.findMany.mock.calls[1]?.[0],
    ).toMatchObject({
      cursor: { id: firstPage[249]?.id },
      skip: 1,
    });
    expect(result.failures).toEqual([
      expect.objectContaining({
        type: "MISSING_STOCK_EVENT",
        metadata: expect.objectContaining({ missingMovementCount: 1 }),
      }),
    ]);
  });

  it("rejects a future recorded-through cutoff before querying financial data", async () => {
    await expect(
      reconcileInventoryClass3({
        organizationId: "org-1",
        periodId: "period-1",
        recordedThrough: new Date(Date.now() + 60_000),
      }),
    ).rejects.toThrow("recordedThrough cannot be in the future");

    expect(mockedDb.accountingPeriod.findFirst).not.toHaveBeenCalled();
    expect(mockedDb.inventoryTransaction.aggregate).not.toHaveBeenCalled();
  });

  it("keeps source evidence stable while preserving distinct observation receipts", async () => {
    const input = { organizationId: "org-1", periodId: "period-1", recordedThrough };
    const first = await reconcileInventoryClass3(input);
    configurePassingPopulation();
    const second = await reconcileInventoryClass3({ ...input, recordedThrough: new Date(recordedThrough.getTime() + 1000) });
    expect(first.reportHash).not.toBe(second.reportHash);
    expect(first.evidenceHash).toBe(second.evidenceHash);
    expect(first.evidenceHashVersion).toBe(1);
  });

  it("detects offsetting movement corrections even when the report totals and counts match", async () => {
    const input = { organizationId: "org-1", periodId: "period-1", recordedThrough };
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([
      { ...stockMovement("a"), totalCost: decimal(100) },
      { ...stockMovement("b"), totalCost: decimal(100) },
    ]);
    const first = await reconcileInventoryClass3(input);
    configurePassingPopulation();
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([
      { ...stockMovement("a"), totalCost: decimal(80) },
      { ...stockMovement("b"), totalCost: decimal(120) },
    ]);
    const second = await reconcileInventoryClass3(input);
    expect(first.reportHash).toBe(second.reportHash);
    expect(first.evidenceHash).not.toBe(second.evidenceHash);
  });

  it("fingerprints every source page, including rows outside continuity's reference population", async () => {
    const input = { organizationId: "org-1", periodId: "period-1", recordedThrough };
    let finalCost = "1";
    mockedDb.inventoryTransaction.findMany.mockImplementation(async query => query.select ? [] : query.cursor
      ? [{ id: "z-last", referenceId: null, totalCost: finalCost }]
      : Array.from({ length: 250 }, (_, i) => ({ id: "a-" + String(i).padStart(3, "0"), referenceId: null, totalCost: "1" })));
    const first = await reconcileInventoryClass3(input);
    mockInventoryValues([500, 0, 300, 100, 800, 100]);
    mockClass3Values([[500, 0], [300, 100], [800, 100]]);
    finalCost = "2";
    const second = await reconcileInventoryClass3(input);
    expect(first.evidenceHash).not.toBe(second.evidenceHash);
    const queries = mockedDb.inventoryTransaction.findMany.mock.calls.map(([query]) => query).filter(query => !query.select);
    expect(queries).toHaveLength(4);
    expect(queries[1]).toMatchObject({ cursor: { id: "a-249" }, skip: 1, where: { organizationId: "org-1", recordedAt: { lte: recordedThrough }, effectiveAt: { lte: periodEnd } } });
    expect(queries[1].where.referenceId).toBeUndefined();
  });

  it("detects changed ledger identities and does not replace failed fingerprint reads with empty evidence", async () => {
    const input = { organizationId: "org-1", periodId: "period-1", recordedThrough };
    mockedDb.journalEntryLine.findMany.mockResolvedValue([{ id: "line-a", debit: decimal(700), credit: decimal(0) }]);
    const first = await reconcileInventoryClass3(input);
    configurePassingPopulation();
    mockedDb.journalEntryLine.findMany.mockResolvedValue([{ id: "replacement-line", debit: decimal(700), credit: decimal(0) }]);
    const second = await reconcileInventoryClass3(input);
    expect(first.reportHash).toBe(second.reportHash);
    expect(first.evidenceHash).not.toBe(second.evidenceHash);
    configurePassingPopulation();
    mockedDb.journalEntryLine.findMany.mockRejectedValueOnce(new Error("owned fingerprint unavailable"));
    await expect(reconcileInventoryClass3(input)).rejects.toThrow("owned fingerprint unavailable");
  });
});
