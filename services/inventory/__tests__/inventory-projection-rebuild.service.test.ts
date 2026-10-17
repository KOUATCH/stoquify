import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"

import { rebuildInventoryProjection } from "../inventory-projection-rebuild.service"
import { readReceiptReturnStockValuations } from "@/services/purchasing/receipt-return-recognition"
jest.mock("@/services/purchasing/receipt-return-recognition", () => ({ readReceiptReturnStockValuations: jest.fn() }))

jest.mock("@/prisma/db", () => ({
  db: {
    inventoryTransaction: { findMany: jest.fn() },
    inventoryLevel: { findMany: jest.fn() },
  },
}))

const mockedDb = db as unknown as {
  inventoryTransaction: { findMany: jest.Mock }
  inventoryLevel: { findMany: jest.Mock }
}

function decimal(value: string | number) {
  return new Prisma.Decimal(value)
}

describe("rebuildInventoryProjection", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(readReceiptReturnStockValuations as jest.Mock).mockResolvedValue(new Map())
  })

  it("rebuilds weighted-average stock projection from immutable movements", async () => {
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([
      {
        id: "movement-1",
        itemId: "item-1",
        locationId: "loc-1",
        quantity: decimal("10"),
        unitCost: decimal("100"),
        totalCost: decimal("1000"),
      },
      {
        id: "movement-2",
        itemId: "item-1",
        locationId: "loc-1",
        quantity: decimal("-3"),
        unitCost: decimal("100"),
        totalCost: decimal("300"),
      },
    ])
    mockedDb.inventoryLevel.findMany.mockResolvedValue([
      {
        itemId: "item-1",
        locationId: "loc-1",
        quantityOnHand: decimal("7"),
        averageCost: decimal("100"),
        totalValue: decimal("700"),
      },
    ])

    const result = await rebuildInventoryProjection({
      organizationId: "org-1",
      asOf: new Date("2026-06-15T23:59:59Z"),
    })

    expect(result.driftCount).toBe(0)
    expect(result.projections).toEqual([
      {
        itemId: "item-1",
        locationId: "loc-1",
        quantityOnHand: "7.000",
        totalValue: "700.00",
        averageCost: "100.00",
      },
    ])
    expect(result.projectionHash).toMatch(/^sha256:/)
  })

  it("reports drift instead of overwriting stored inventory levels", async () => {
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([
      {
        id: "movement-1",
        itemId: "item-1",
        locationId: "loc-1",
        quantity: decimal("10"),
        unitCost: decimal("100"),
        totalCost: decimal("1000"),
      },
    ])
    mockedDb.inventoryLevel.findMany.mockResolvedValue([
      {
        itemId: "item-1",
        locationId: "loc-1",
        quantityOnHand: decimal("9"),
        averageCost: decimal("100"),
        totalValue: decimal("900"),
      },
    ])

    const result = await rebuildInventoryProjection({
      organizationId: "org-1",
      asOf: new Date("2026-06-15T23:59:59Z"),
    })

    expect(result.driftCount).toBe(2)
    expect(result.drifts.map((drift) => drift.type)).toEqual([
      "QUANTITY_DRIFT",
      "VALUE_DRIFT",
    ])
    expect(mockedDb.inventoryLevel.findMany).toHaveBeenCalled()
    expect((mockedDb.inventoryLevel as unknown as { update?: jest.Mock }).update).toBeUndefined()
  })
  it("uses effective and recorded cutoffs instead of row creation time", async () => {
    const asOf = new Date("2026-06-30T23:59:59Z")
    const recordedThrough = new Date("2026-07-01T12:00:00Z")
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([])
    mockedDb.inventoryLevel.findMany.mockResolvedValue([])

    const result = await rebuildInventoryProjection({
      organizationId: "org-1",
      asOf,
      recordedThrough,
    })

    expect(mockedDb.inventoryTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          effectiveAt: { lte: asOf },
          recordedAt: { lte: recordedThrough },
        }),
        orderBy: [
          { effectiveAt: "asc" },
          { recordedAt: "asc" },
          { id: "asc" },
        ],
      }),
    )
    expect(result.asOf).toBe(asOf.toISOString())
    expect(result.recordedThrough).toBe(recordedThrough.toISOString())
  })

  it("reports stored stock that has no immutable movement support", async () => {
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([])
    mockedDb.inventoryLevel.findMany.mockResolvedValue([
      {
        itemId: "item-1",
        locationId: "loc-1",
        quantityOnHand: decimal("4"),
        averageCost: decimal("100"),
        totalValue: decimal("400"),
      },
    ])

    const result = await rebuildInventoryProjection({ organizationId: "org-1" })

    expect(result.driftCount).toBe(1)
    expect(result.drifts).toEqual([
      expect.objectContaining({
        type: "UNEXPLAINED_LEVEL",
        itemId: "item-1",
        locationId: "loc-1",
        expected: {
          quantityOnHand: "0.000",
          totalValue: "0.00",
          averageCost: "0.00",
        },
      }),
    ])
  })

  it("rejects a future recorded cutoff before reading stock evidence", async () => {
    await expect(
      rebuildInventoryProjection({
        organizationId: "org-1",
        recordedThrough: new Date(Date.now() + 60_000),
      }),
    ).rejects.toThrow(/recordedThrough cannot be in the future/i)

    expect(mockedDb.inventoryTransaction.findMany).not.toHaveBeenCalled()
    expect(mockedDb.inventoryLevel.findMany).not.toHaveBeenCalled()
  })

  it("rebuilds fractional returns and non-tail reversal using retained values, including an authoritative zero", async () => {
    const values = [["receipt", "1", "0.01", "PURCHASE_RECEIPT", "GOODS_RECEIPT", "receipt"], ["first", "-0.4", "0.00", "PURCHASE_RETURN", "RETURN", "return-first"], ["second", "-0.4", "0.01", "PURCHASE_RETURN", "RETURN", "return-second"], ["reverse-first", "0.4", "0.00", "PURCHASE_RETURN_REVERSAL", "RETURN", "reversal"], ["last", "-0.6", "0.00", "PURCHASE_RETURN", "RETURN", "return-last"]]
    mockedDb.inventoryTransaction.findMany.mockResolvedValue(values.map(([id, q, value, type, referenceType, referenceId]) => ({ id, itemId: "item-1", locationId: "loc-1", quantity: decimal(q), unitCost: decimal("0.01"), totalCost: decimal(value), type, referenceType, referenceId })))
    mockedDb.inventoryLevel.findMany.mockResolvedValue([{ itemId: "item-1", locationId: "loc-1", quantityOnHand: decimal(0), averageCost: decimal(0), totalValue: decimal(0) }])
    ;(readReceiptReturnStockValuations as jest.Mock).mockResolvedValue(new Map(values.slice(1).map(([id, , value]) => [id, value])))
    const result = await rebuildInventoryProjection({ organizationId: "org-1" })
    expect(result.driftCount).toBe(0)
    expect(result.projections[0]).toMatchObject({ quantityOnHand: "0.000", totalValue: "0.00" })
    expect(readReceiptReturnStockValuations).toHaveBeenCalledWith(db, { organizationId: "org-1", returnIds: ["return-first", "return-second", "reversal", "return-last"] })
  })

  it("keeps unmarked historical zero-cost fallback and does not invent a verified allocation", async () => {
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([{ id: "legacy", itemId: "item-1", locationId: "loc-1", quantity: decimal("-0.8"), unitCost: decimal("0.01"), totalCost: decimal(0), type: "PURCHASE_RETURN", referenceType: "RETURN", referenceId: "legacy-return" }])
    mockedDb.inventoryLevel.findMany.mockResolvedValue([])
    const result = await rebuildInventoryProjection({ organizationId: "org-1" })
    expect(result.projections[0].totalValue).toBe("-0.01")
  })

  it("rejects malformed return valuation evidence rather than falling back to nominal cost", async () => {
    mockedDb.inventoryTransaction.findMany.mockResolvedValue([{ id: "marked", itemId: "item-1", locationId: "loc-1", quantity: decimal("-0.8"), unitCost: decimal("0.01"), totalCost: decimal(0), type: "PURCHASE_RETURN", referenceType: "RETURN", referenceId: "marked-return" }])
    mockedDb.inventoryLevel.findMany.mockResolvedValue([])
    const failure = new Error("retained allocation unavailable")
    ;(readReceiptReturnStockValuations as jest.Mock).mockRejectedValueOnce(failure)
    await expect(rebuildInventoryProjection({ organizationId: "org-1" })).rejects.toBe(failure)
  })
})
