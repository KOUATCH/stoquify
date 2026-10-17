import { getItemInventorySummary, summarizeInventoryItems } from "../item-inventory-summary"

function item(levels: { quantity: number; value: number; reserved?: number; reorderPoint?: number }[]) {
  return {
    minStockLevel: 10,
    reorderLevel: 15,
    maxStockLevel: 250,
    sellingPrice: 12,
    inventoryLevels: levels.map((level, index) => ({
      id: `level-${index}`,
      quantityOnHand: level.quantity,
      quantityReserved: level.reserved ?? 0,
      quantityAvailable: level.quantity - (level.reserved ?? 0),
      quantityInTransit: 0,
      quantityOnOrder: 0,
      reorderPoint: level.reorderPoint ?? 0,
      totalValue: level.value,
    })),
  }
}

describe("inventory list summaries", () => {
  it("includes every location and values stock from its actual valuation rather than catalog price", () => {
    const summary = getItemInventorySummary(item([
      { quantity: 99, value: 495, reserved: 3 },
      { quantity: 1_401, value: 9_807, reserved: 4 },
    ]))

    expect(summary).toMatchObject({ stock: 1_500, available: 1_493, reserved: 7, value: 10_302, potentialProfit: 7_698 })
  })

  it("keeps measured stock at the stored three-decimal precision", () => {
    const summary = getItemInventorySummary(item([
      { quantity: 0.1, value: 0.1 },
      { quantity: 0.2, value: 0.2 },
      { quantity: 1_499.7, value: 1_499.7 },
    ]))

    expect(summary.stock).toBe(1_500)
    expect(summary.value).toBe(1_500)
  })

  it("distinguishes low stock from no stock using the configured threshold", () => {
    const rows = [
      item([{ quantity: 18, value: 90, reorderPoint: 20 }]),
      item([{ quantity: 1, value: 5 }, { quantity: 100, value: 500 }]),
      item([]),
    ]

    expect(summarizeInventoryItems(rows)).toMatchObject({ lowStockCount: 1, outOfStockCount: 1, totalValue: 595 })
  })

  it("summarizes the full result set supplied by the page, including records beyond page size", () => {
    const rows = Array.from({ length: 51 }, () => item([{ quantity: 100, value: 500 }]))
    expect(summarizeInventoryItems(rows)).toEqual({
      totalValue: 25_500,
      totalProfit: 35_700,
      lowStockCount: 0,
      outOfStockCount: 0,
    })
    expect(summarizeInventoryItems([])).toEqual({ totalValue: 0, totalProfit: 0, lowStockCount: 0, outOfStockCount: 0 })
  })
})
