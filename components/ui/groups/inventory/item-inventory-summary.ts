import type { ItemWithInventoryLevelsPayload } from "@/types/itemTypes"

type InventorySummaryItem = Pick<
  ItemWithInventoryLevelsPayload,
  "inventoryLevels" | "minStockLevel" | "reorderLevel" | "maxStockLevel" | "sellingPrice"
>

export function getItemInventorySummary(item: InventorySummaryItem) {
  const totals = item.inventoryLevels.reduce(
    (sum, level) => ({
      stock: sum.stock + Number(level.quantityOnHand),
      available: sum.available + Number(level.quantityAvailable),
      reserved: sum.reserved + Number(level.quantityReserved),
      value: sum.value + Number(level.totalValue),
      reorderPoint: Math.max(sum.reorderPoint, Number(level.reorderPoint)),
    }),
    { stock: 0, available: 0, reserved: 0, value: 0, reorderPoint: 0 },
  )
  const stock = Number(totals.stock.toFixed(3))
  const value = Number(totals.value.toFixed(2))
  const threshold = Math.max(Number(item.minStockLevel) || 0, Number(item.reorderLevel) || 0, totals.reorderPoint)

  return {
    stock,
    available: Number(totals.available.toFixed(3)),
    reserved: Number(totals.reserved.toFixed(3)),
    value,
    threshold,
    maxStock: Number(item.maxStockLevel) || 0,
    potentialProfit: Number((stock * Number(item.sellingPrice) - value).toFixed(2)),
  }
}

export function summarizeInventoryItems(items: InventorySummaryItem[]) {
  const totals = items.reduce(
    (sum, item) => {
      const { stock, value, threshold, potentialProfit } = getItemInventorySummary(item)
      return {
        totalValue: sum.totalValue + value,
        totalProfit: sum.totalProfit + potentialProfit,
        lowStockCount: sum.lowStockCount + Number(stock > 0 && stock <= threshold),
        outOfStockCount: sum.outOfStockCount + Number(stock <= 0),
      }
    },
    { totalValue: 0, totalProfit: 0, lowStockCount: 0, outOfStockCount: 0 },
  )
  return {
    ...totals,
    totalValue: Number(totals.totalValue.toFixed(2)),
    totalProfit: Number(totals.totalProfit.toFixed(2)),
  }
}
