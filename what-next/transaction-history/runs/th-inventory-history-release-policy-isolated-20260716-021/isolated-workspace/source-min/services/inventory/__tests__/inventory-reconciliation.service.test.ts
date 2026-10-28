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
    inventoryLevel: { count: jest.fn() },
    journalEntryLine: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    inventoryTransaction: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    stockAdjustment: { count: jest.fn() },
    stockCountSession: { count: jest.fn() },
    businessEvent: { count: jest.fn(), findMany: jest.fn() },
  },
}));

const mockedDb = db as unknown as {
  accountingPeriod: { findFirst: jest.Mock };
  inventoryLevel: { count: jest.Mock };
  journalEntryLine: {
    aggregate: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
  };
  inventoryTransaction: {
    aggregate: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
  };
  stockAdjustment: { count: jest.Mock };
  stockCountSession: { count: jest.Mock };
  businessEvent: { count: jest.Mock; findMany: jest.Mock };
};

const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");
const recordedThrough = new Date("2026-07-01T00:00:00.000Z");

function decimal(value: string | number) {
  return new Prisma.Decimal(value);
}

function mockInventoryValues(values: Array<string | number>) {
  for (const value of values) {
    mockedDb.inventoryTransaction.aggregate.mockResolvedValueOnce({
      _sum: { totalCost: decimal(value) },
    });
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
      .mockResolvedValueOnce([finalMovement]);
    mockedDb.businessEvent.findMany
      .mockReset()
      .mockResolvedValueOnce(
        firstPage.map((movement) => ({
          sourceType: AccountingSourceType.STOCK_TRANSFER,
          sourceId: movement.referenceId,
        })),
      )
      .mockResolvedValueOnce([]);

    const result = await reconcileInventoryClass3({
      organizationId: "org-1",
      periodId: "period-1",
      recordedThrough,
    });

    expect(mockedDb.inventoryTransaction.findMany).toHaveBeenCalledTimes(2);
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
});
