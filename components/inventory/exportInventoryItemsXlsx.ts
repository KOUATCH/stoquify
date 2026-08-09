import { format } from "date-fns"
import * as XLSX from "xlsx"

import { formatDate } from "@/lib/formateDate"
import type { ItemWithInventoryLevelsPayload } from "@/types/itemTypes"

export function exportInventoryItemsXlsx(
  items: ItemWithInventoryLevelsPayload[],
  generatedAt = new Date(),
) {
  const exportData = items.map((item) => ({
    Name: item.name,
    Slug: item.slug,
    SKU: item.sku,
    "Cost Price": item.costPrice,
    "Selling Price": item.sellingPrice,
    "Total Value":
      (Number(item.sellingPrice) || 0) * (Number(item.maxStockLevel) || 0),
    "Date Added": formatDate(item.createdAt),
  }))

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Items")

  const fileName = `Items_${format(generatedAt, "yyyy-MM-dd_HH-mm-ss")}.xlsx`
  XLSX.writeFile(workbook, fileName)

  return { fileName, rowCount: items.length }
}
