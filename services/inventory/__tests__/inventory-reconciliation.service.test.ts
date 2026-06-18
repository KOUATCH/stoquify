import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"

import { reconcileInventoryClass3 } from "../inventory-reconciliation.service"

jest.mock("@/prisma/db", () => ({
  db: {
    accountingPeriod: { findFirst: jest.fn() },
    inventoryLevel: { findMany: jest.fn() },
    journalEntryLine: { findMany: jest.fn() },
    inventoryTransaction: { findMany: jest.fn(), count: jest.fn() },
    stockAdjustment: { count: jest.fn() },
    stockCountSession: { count: jest.fn() },
    businessEvent: { findMany: jest.fn() },
  },
}))

const mockedDb = db as unknown as {
  accountingPeriod: { findFirst: jest.Mock }
  inventoryLevel: { findMany: jest.Mock }
  journalEntryLine: { findMany: jest.Mock }
  inventoryTransaction: { findMany: jest.Mock; count: jest.Mock }
  stockAdjustment: { count: jest.Mock }
  stockCountSession: { count: jest.Mock }
  businessEvent: { findMany: jest.Mock }
}

function decimal(value: string | number) {
  return new Prisma.Decimal(value)
}

describe("reconcileInventoryClass3", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedDb.accountingPeriod.findFirst.mockResolvedValue({
      id: "period-1",
      startDate: new Date("2026-06-01T00:00:00Z"),
      endDate: new Date("2026-06-30T23:59:59Z"),
    })
    mockedDb.inventoryTransaction.count.mockResolvedValue(1)
    mockedDb.stockAdjustment.count.mockResolvedValue(0)
    mockedDb.stockCountSession.count.mockResolvedValue(0)
  })

  it("passes when inventory subledger value ties to class 3 ledger value and stock events exist", async () => {
    mockedDb.inventoryLevel.findMany.mockResolvedValue([
      { itemId: "item-1", locationId: "loc-1", totalValue: decimal("700") },
    ])
    mockedDb.journalEntryLine.findMany.mockResolvedValue([
      {
        id: "line-1",
        debit: decimal("700"),
        credit: decimal("0"),
        accountId: "account-31",
        journalEntry: {
          id: "entry-1",
          entryNumber: "INV-1",
          sourceType: "STOCK_TRANSFER",
          sourceId: "transfer-1",
        },
      },
    ])
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([
      {
        id: "movement-1",
        referenceType: "STOCK_TRANSFER",
        referenceId: "transfer-1",
        referenceNumber: "TR-1",
        itemId: "item-1",
        locationId: "loc-1",
      },
    ])
    mockedDb.businessEvent.findMany.mockResolvedValue([
      { sourceType: "STOCK_TRANSFER", sourceId: "transfer-1" },
    ])

    const result = await reconcileInventoryClass3({
      organizationId: "org-1",
      periodId: "period-1",
    })

    expect(result).toMatchObject({
      status: "PASSED",
      inventoryValue: "700.00",
      ledgerClass3Value: "700.00",
      driftAmount: "0.00",
      sourceCounts: expect.objectContaining({
        inventoryLevelCount: 1,
        inventoryTransactionCount: 1,
        class3JournalLineCount: 1,
        stockBusinessEventCount: 1,
      }),
      failures: [],
    })
    expect(result.reportHash).toMatch(/^sha256:/)
  })

  it("blocks on material class 3 drift and missing stock event evidence", async () => {
    mockedDb.inventoryLevel.findMany.mockResolvedValue([
      { itemId: "item-1", locationId: "loc-1", totalValue: decimal("700") },
    ])
    mockedDb.journalEntryLine.findMany.mockResolvedValue([
      {
        id: "line-1",
        debit: decimal("600"),
        credit: decimal("0"),
        accountId: "account-31",
        journalEntry: {
          id: "entry-1",
          entryNumber: "INV-1",
          sourceType: null,
          sourceId: null,
        },
      },
    ])
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([
      {
        id: "movement-1",
        referenceType: "STOCK_TRANSFER",
        referenceId: "transfer-1",
        referenceNumber: "TR-1",
        itemId: "item-1",
        locationId: "loc-1",
      },
    ])
    mockedDb.businessEvent.findMany.mockResolvedValue([])

    const result = await reconcileInventoryClass3({
      organizationId: "org-1",
      periodId: "period-1",
    })

    expect(result.status).toBe("BLOCKED")
    expect(result.failures.map((failure) => failure.type)).toEqual([
      "CLASS3_RECONCILIATION_DRIFT",
      "MISSING_STOCK_EVENT",
      "ORPHAN_CLASS3_POSTING",
    ])
  })
})
