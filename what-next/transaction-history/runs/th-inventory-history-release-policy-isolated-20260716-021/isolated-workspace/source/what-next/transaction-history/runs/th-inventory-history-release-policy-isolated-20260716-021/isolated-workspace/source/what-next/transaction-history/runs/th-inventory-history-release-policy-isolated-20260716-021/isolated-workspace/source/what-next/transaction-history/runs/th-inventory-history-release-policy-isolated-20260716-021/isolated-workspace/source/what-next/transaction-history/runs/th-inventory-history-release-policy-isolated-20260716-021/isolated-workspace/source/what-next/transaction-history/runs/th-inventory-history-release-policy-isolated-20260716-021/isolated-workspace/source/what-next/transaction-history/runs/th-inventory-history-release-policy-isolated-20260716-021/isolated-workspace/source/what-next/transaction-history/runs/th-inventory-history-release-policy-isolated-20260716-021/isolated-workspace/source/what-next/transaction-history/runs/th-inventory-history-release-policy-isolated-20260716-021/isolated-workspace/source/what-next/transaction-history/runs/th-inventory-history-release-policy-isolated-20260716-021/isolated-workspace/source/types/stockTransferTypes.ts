// Stock Management Types based on Prisma schema

export interface StockAdjustment {
  id: string
  locationId: string
  itemId: string
  adjustmentType: "INCREASE" | "DECREASE" | "SET"
  quantity: number
  reason: string
  notes?: string
  referenceNumber?: string
  userId: string
  createdAt: Date
  updatedAt: Date

  // Relations
  location?: Location
  item?: Item
  user?: User
}

export interface StockTransfer {
  id: string
  fromLocationId: string
  toLocationId: string
  status: "PENDING" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED"
  transferNumber: string
  notes?: string
  requestedBy: string
  approvedBy?: string
  completedBy?: string
  requestedAt: Date
  approvedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date

  // Relations
  fromLocation?: Location
  toLocation?: Location
  items: StockTransferItem[]
  requestedByUser?: User
  approvedByUser?: User
  completedByUser?: User
}

export interface StockTransferItem {
  id: string
  transferId: string
  itemId: string
  quantityRequested: number
  quantityTransferred?: number
  notes?: string

  // Relations
  transfer?: StockTransfer
  item?: Item
}

export interface Location {
  id: string
  name: string
  code: string
  type: "WAREHOUSE" | "STORE" | "OUTLET"
  address?: string
  isActive: boolean
}

export interface Item {
  id: string
  name: string
  sku: string
  description?: string
  categoryId?: string
  brandId?: string
  unitId: string
  costPrice: number
  sellingPrice: number
  isActive: boolean

  // Relations
  category?: Category
  brand?: Brand
  unit?: Unit
  inventory?: InventoryLevel[]
}

export interface InventoryLevel {
  id: string
  locationId: string
  itemId: string
  currentStock: number
  reservedStock: number
  availableStock: number
  reorderLevel: number
  maxLevel: number
  lastUpdated: Date

  // Relations
  location?: Location
  item?: Item
}

export interface Category {
  id: string
  name: string
  description?: string
}

export interface Brand {
  id: string
  name: string
  description?: string
}

export interface Unit {
  id: string
  name: string
  abbreviation: string
}

export interface User {
  id: string
  name: string
  email: string
}

// Form types
export interface CreateStockAdjustmentForm {
  locationId: string
  itemId: string
  adjustmentType: "INCREASE" | "DECREASE" | "SET"
  quantity: number
  reason: string
  notes?: string
  referenceNumber?: string
}

export interface CreateStockTransferForm {
  fromLocationId: string
  toLocationId: string
  notes?: string
  items: {
    itemId: string
    quantityRequested: number
    notes?: string
  }[]
}

// Analytics types
export interface StockAnalytics {
  totalAdjustments: number
  totalTransfers: number
  pendingTransfers: number
  lowStockItems: number
  adjustmentsByType: {
    INCREASE: number
    DECREASE: number
    SET: number
  }
  transfersByStatus: {
    PENDING: number
    IN_TRANSIT: number
    COMPLETED: number
    CANCELLED: number
  }
  recentActivity: (StockAdjustment | StockTransfer)[]
}
