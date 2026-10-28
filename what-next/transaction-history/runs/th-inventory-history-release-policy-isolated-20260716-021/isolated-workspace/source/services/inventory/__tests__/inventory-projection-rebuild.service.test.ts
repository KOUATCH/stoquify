import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"

import { rebuildInventoryProjection } from "../inventory-projection-rebuild.service"

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
})
