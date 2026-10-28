// Core types for the sales inventory finance system
export interface Organization {
  id: string
  name: string
  slug: string
  currency: string
  timezone: string
}

export interface Location {
  id: string
  name: string
  code: string
  type: "WAREHOUSE" | "STORE" | "PRODUCCTION_SITE"
  isActive: boolean
}

export interface Item {
  id: string
  name: string
  sku: string
  barcode?: string
  costPrice: number
  sellingPrice: number
  trackInventory: boolean
  minStockLevel: number
  reorderLevel: number
  isActive: boolean
}

export interface InventoryLevel {
  id: string
  itemId: string
  locationId: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  reorderPoint: number
  averageCost: number
  totalValue: number
}

export interface SalesOrder {
  id: string
  orderNumber: string
  status: "DRAFT" | "CONFIRMED" | "PROCESSING" | "COMPLETED" | "CANCELLED"
  orderDate: Date
  customerId: string
  locationId: string
  subtotal: number
  taxAmount: number
  total: number
  paymentStatus: "PENDING" | "PARTIAL" | "PAID" | "REFUNDED"
  lines: SalesOrderLine[]
}

export interface SalesOrderLine {
  id: string
  itemId: string
  quantity: number
  unitPrice: number
  discount: number
  taxAmount: number
  lineTotal: number
}

export interface PurchaseOrder {
  id: string
  orderNumber: string
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "RECEIVED" | "COMPLETED"
  orderDate: Date
  supplierId: string
  locationId: string
  subtotal: number
  taxAmount: number
  total: number
  lines: PurchaseOrderLine[]
}

export interface PurchaseOrderLine {
  id: string
  itemId: string
  orderedQuantity: number
  receivedQuantity: number
  unitCost: number
  lineTotal: number
}

export interface StockAdjustment {
  id: string
  adjustmentNumber: string
  type: "CYCLE_COUNT" | "PHYSICAL_COUNT" | "DAMAGED" | "EXPIRED" | "CORRECTION"
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "COMPLETED"
  adjustmentDate: Date
  locationId: string
  lines: StockAdjustmentLine[]
}

export interface StockAdjustmentLine {
  id: string
  itemId: string
  systemQuantity: number
  actualQuantity: number
  adjustedQuantity: number
  unitCost?: number
  totalCost?: number
}

export interface Payment {
  id: string
  paymentNumber: string
  amount: number
  method: "CASH" | "CARD" | "DIGITAL"
  status: "PENDING" | "COMPLETED" | "FAILED"
  salesOrderId?: string
  processedAt?: Date
}

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  isActive: boolean
}

export interface Supplier {
  id: string
  name: string
  code?: string
  email?: string
  phone?: string
  address?: string
  paymentTerms?: number
  isActive: boolean
}
export interface Brand {
  id: string
  brandName: string
  description?: string
  isActive: boolean
}
