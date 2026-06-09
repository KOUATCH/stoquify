// ===== ENUMS =====
export enum TransactionType {
  // Inbound transactions
  PURCHASE_RECEIPT = "PURCHASE_RECEIPT",
  SALES_RETURN = "SALES_RETURN",
  TRANSFER_IN = "TRANSFER_IN",
  ADJUSTMENT_IN = "ADJUSTMENT_IN",
  PRODUCTION_IN = "PRODUCTION_IN",
  INITIAL_STOCK = "INITIAL_STOCK",

  // Outbound transactions
  SALE = "SALE",
  PURCHASE_RETURN = "PURCHASE_RETURN",
  TRANSFER_OUT = "TRANSFER_OUT",
  ADJUSTMENT_OUT = "ADJUSTMENT_OUT",
  PRODUCTION_OUT = "PRODUCTION_OUT",
  DAMAGED = "DAMAGED",
  EXPIRED = "EXPIRED",
  THEFT = "THEFT",
  WRITE_OFF = "WRITE_OFF",
  SAMPLE = "SAMPLE",
  PROMOTION = "PROMOTION",

  // Reservations
  RESERVATION = "RESERVATION",
  RESERVATION_RELEASE = "RESERVATION_RELEASE",
}

export enum TransactionReferenceType {
  SALES_ORDER = "SALES_ORDER",
  PURCHASE_ORDER = "PURCHASE_ORDER",
  STOCK_TRANSFER = "STOCK_TRANSFER",
  STOCK_ADJUSTMENT = "STOCK_ADJUSTMENT",
  GOODS_RECEIPT = "GOODS_RECEIPT",
  RETURN = "RETURN",
  MANUAL = "MANUAL",
}

export enum SerialStatus {
  AVAILABLE = "AVAILABLE",
  RESERVED = "RESERVED",
  SOLD = "SOLD",
  DAMAGED = "DAMAGED",
  EXPIRED = "EXPIRED",
}

export enum AdjustmentType {
  CYCLE_COUNT = "CYCLE_COUNT",
  PHYSICAL_COUNT = "PHYSICAL_COUNT",
  DAMAGED = "DAMAGED",
  EXPIRED = "EXPIRED",
  THEFT = "THEFT",
  WRITE_OFF = "WRITE_OFF",
  FOUND = "FOUND",
  CORRECTION = "CORRECTION",
  OTHER = "OTHER",
}

export enum AdjustmentStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum TransferStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  IN_TRANSIT = "IN_TRANSIT",
  PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

// ===== BASE TYPES =====
export interface Item {
  id: string
  name: string
  slug: string
  sku: string
  barcode?: string | null
  description?: string | null
  imageUrls: string
  thumbnail?: string | null

  // Product identifiers
  upc?: string | null
  ean?: string | null
  mpn?: string | null
  isbn?: string | null

  // Physical properties
  dimensions?: string | null
  weight?: number | null
  color?: string | null
  size?: string | null

  // Pricing
  costPrice: number
  sellingPrice: number
  msrp?: number | null

  // Inventory settings
  trackInventory: boolean
  trackSerialNumbers: boolean
  trackBatches: boolean
  trackExpiry: boolean
  minStockLevel: number
  maxStockLevel?: number | null
  reorderLevel: number
  reorderQuantity?: number | null

  // Status
  isActive: boolean
  isDiscontinued: boolean

  // Foreign keys
  organizationId: string
  categoryId?: string | null
  brandId?: string | null
  unitId?: string | null
  taxRateId?: string | null

  createdAt: Date
  updatedAt: Date
}

export interface InventoryLevel {
  id: string
  itemId: string
  locationId: string
  reorderPoint:number
  location: {
    id: string
    name: string
  }
  // Current quantities
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  quantityInTransit: number
  quantityOnOrder: number

  // Valuation
  averageCost: number
  totalValue: number

  // Last updated
  lastCountDate?: Date | null
  lastTransactionAt?: Date | null

  createdAt: Date
  updatedAt: Date
}

export interface InventoryTransaction {
  id: string
  type: TransactionType
  quantity: number
  unitCost: number
  totalCost: number
  notes?: string | null
  createdAt: Date

  // Item and location
  itemId: string
  locationId: string

  // Organization and user
  organizationId: string
  createdById?: string | null

  // Reference tracking
  referenceType?: TransactionReferenceType | null
  referenceId?: string | null
  referenceNumber?: string | null

  // Batch and serial tracking
  batchNumber?: string | null
  serialNumbers: string[]
  expiryDate?: Date | null

  // Balance after transaction
  balanceAfter: number
}

export interface SerialNumber {
  id: string
  serialNumber: string
  status: SerialStatus
  itemId: string
  locationId?: string | null
  batchNumber?: string | null
  expiryDate?: Date | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface StockAdjustment {
  id: string
  adjustmentNumber: string
  type: AdjustmentType
  reason: string
  status: AdjustmentStatus
  adjustmentDate: Date
  notes?: string | null

  locationId: string
  organizationId: string
  createdById?: string | null
  approvedById?: string | null
  approvedAt?: Date | null

  createdAt: Date
  updatedAt: Date
}

export interface StockAdjustmentLine {
  id: string
  adjustmentId: string
  itemId: string

  systemQuantity: number
  actualQuantity: number
  adjustedQuantity: number
  unitCost?: number | null
  totalCost?: number | null
  notes?: string | null
  serialNumbers: string[]

  createdAt: Date
  updatedAt: Date
}

export interface StockTransfer {
  id: string
  transferNumber: string
  status: TransferStatus
  transferDate: Date
  expectedDate?: Date | null
  actualDate?: Date | null
  notes?: string | null

  fromLocationId: string
  toLocationId: string
  organizationId: string
  createdById?: string | null
  approvedById?: string | null
  approvedAt?: Date | null

  createdAt: Date
  updatedAt: Date
}

export interface StockTransferLine {
  id: string
  transferId: string
  itemId: string

  requestedQuantity: number
  shippedQuantity: number
  receivedQuantity: number
  unitCost?: number | null
  notes?: string | null
  serialNumbers: string[]

  createdAt: Date
  updatedAt: Date
}

// ===== EXTENDED TYPES WITH RELATIONS =====
export interface ItemWithRelations extends Item {
  category?: { id: string; name: string } | null
  brand?: { id: string; name: string } | null
  unit?: { id: string; name: string; abbreviation: string } | null
  inventoryLevels?: InventoryLevel[]
  inventoryTransactions?: InventoryTransaction[]
  serialNumbers?: SerialNumber[]
}

export interface InventoryLevelWithRelations extends InventoryLevel {
  item?: {
    id: string
    name: string
    sku: string
    unit?: { name: string; abbreviation: string }
  }
  // location?: {
  //   id: string
  //   name: string
  // }
}

export interface InventoryTransactionWithRelations extends InventoryTransaction {
  item?: {
    id: string
    name: string
    sku: string
  }
  location?: {
    id: string
    name: string
  }
  createdBy?: {
    id: string
    name: string
  }
}

export interface StockAdjustmentWithRelations extends StockAdjustment {
  location?: {
    id: string
    name: string
  }
  createdBy?: {
    id: string
    name: string
  }
  approvedBy?: {
    id: string
    name: string
  }
  lines?: StockAdjustmentLineWithRelations[]
}

export interface StockAdjustmentLineWithRelations extends StockAdjustmentLine {
  item?: {
    id: string
    name: string
    sku: string
  }
}

export interface StockTransferWithRelations extends StockTransfer {
  fromLocation?: {
    id: string
    name: string
  }
  toLocation?: {
    id: string
    name: string
  }
  createdBy?: {
    id: string
    name: string
  }
  approvedBy?: {
    id: string
    name: string
  }
  lines?: StockTransferLineWithRelations[]
}

export interface StockTransferLineWithRelations extends StockTransferLine {
  item?: {
    id: string
    name: string
    sku: string
  }
}

// ===== REQUEST/RESPONSE TYPES =====
export interface InventoryResponse<T> {
  success: boolean
  error?: string | null
  data: T
}

export interface CreateItemRequest {
  name: string
  sku: string
  barcode?: string
  description?: string
  costPrice: number
  sellingPrice: number
  categoryId?: string
  brandId?: string
  unitId?: string
  trackInventory?: boolean
  minStockLevel?: number
  reorderLevel?: number
}

export interface  UpdateInventoryLevelRequest {
  inventoryLevelId: string
  referenceNumber: null
  createdById: null
  itemId: string
  locationId: string
  quantity: number
  unitCost?: number
  notes?: string
  type: TransactionType 
}

export interface CreateStockAdjustmentRequest {
  locationId: string
  type: AdjustmentType
  reason: string
  notes?: string
  lines: {
    itemId: string
    systemQuantity: number
    actualQuantity: number
    unitCost?: number
    notes?: string
  }[]
}

export interface CreateStockTransferRequest {
  fromLocationId: string
  toLocationId: string
  expectedDate?: Date
  notes?: string
  lines: {
    itemId: string
    requestedQuantity: number
    notes?: string
  }[]
}

export interface ReserveInventoryRequest {
  reservations: {
    inventoryLevelId: any
    itemId: string
    locationId: string
    quantity: number
  }[]
  organizationId: string
}

// ===== FILTER TYPES =====
export interface InventoryFilters {
  locationId?: string
  categoryId?: string
  brandId?: string
  lowStock?: boolean
  outOfStock?: boolean
  search?: string
}

export interface TransactionFilters {
  itemId?: string
  locationId?: string
  type?: TransactionType
  referenceType?: TransactionReferenceType
  dateFrom?: Date
  dateTo?: Date
}
