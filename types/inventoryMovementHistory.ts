// Client-safe inventory history filter vocabulary. Keep aligned with TransactionType.
export const inventoryMovementHistoryTypes = [
  "PURCHASE_RECEIPT", "PURCHASE_RETURN_REVERSAL", "SALES_RETURN", "TRANSFER_IN",
  "ADJUSTMENT_IN", "PRODUCTION_IN", "INITIAL_STOCK", "SALE", "PURCHASE_RETURN",
  "TRANSFER_OUT", "ADJUSTMENT_OUT", "PRODUCTION_OUT", "DAMAGED", "EXPIRED", "THEFT",
  "WRITE_OFF", "SAMPLE", "PROMOTION", "RESERVATION", "RESERVATION_RELEASE",
] as const

export type InventoryMovementHistoryType = (typeof inventoryMovementHistoryTypes)[number]

// Preserve older bookmarks for movement types that have a precise equivalent.
export const inventoryMovementHistoryTypeAliases: Record<string, InventoryMovementHistoryType> = {
  RETURN_FROM_CUSTOMER: "SALES_RETURN", RETURN_TO_SUPPLIER: "PURCHASE_RETURN",
  RESERVED: "RESERVATION", UNRESERVED: "RESERVATION_RELEASE",
}
