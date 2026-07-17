// Enhanced type definitions for modern POS/Inventory/Financial Management System

// ===== CORE ENUMS =====
export enum LocationType {
  WAREHOUSE = "WAREHOUSE",
  STORE = "STORE",
  DISTRIBUTION_CENTER = "DISTRIBUTION_CENTER",
  SUPPLIER = "SUPPLIER",
  CUSTOMER = "CUSTOMER",
  MANUFACTURING = "MANUFACTURING",
  QUARANTINE = "QUARANTINE",
  DAMAGED = "DAMAGED",
  TRANSIT = "TRANSIT",
  VIRTUAL = "VIRTUAL",
}

export enum UnitType {
  QUANTITY = "QUANTITY",
  WEIGHT = "WEIGHT",
  VOLUME = "VOLUME",
  LENGTH = "LENGTH",
  AREA = "AREA",
  TIME = "TIME",
}

export enum TaxType {
  SALES = "SALES",
  VAT = "VAT",
  GST = "GST",
  EXCISE = "EXCISE",
  IMPORT = "IMPORT",
  EXPORT = "EXPORT",
}

// ===== INVENTORY & TRANSACTION TYPES =====
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

export enum InventoryTransactionType {
  SALE = "SALE",
  RETURN = "RETURN",
  ADJUSTMENT = "ADJUSTMENT",
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT",
  COUNT = "COUNT",
  DAMAGE = "DAMAGE",
  EXPIRED = "EXPIRED",
}

export enum SerialStatus {
  AVAILABLE = "AVAILABLE",
  RESERVED = "RESERVED",
  SOLD = "SOLD",
  DAMAGED = "DAMAGED",
  RETURNED = "RETURNED",
  EXPIRED = "EXPIRED",
}

// ===== ORDER STATUS TYPES =====
export enum PurchaseOrderStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
  RECEIVED = "RECEIVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum SalesOrderStatus {
  DRAFT = "DRAFT",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  RETURNED = "RETURNED",
}

export enum GoodsReceiptStatus {
  DRAFT = "DRAFT",
  RECEIVED = "RECEIVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

// ===== ADJUSTMENT TYPES =====
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

// ===== TRANSFER TYPES =====
export enum TransferStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  IN_TRANSIT = "IN_TRANSIT",
  PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

// ===== POS SYSTEM TYPES =====
export enum POSSessionStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  CLOSED = "CLOSED",
  RECONCILED = "RECONCILED",
}

export enum cashDrawerTransactionType {
  OPENING_BALANCE = "OPENING_BALANCE",
  SALE = "SALE",
  RETURN = "RETURN",
  CASH_IN = "CASH_IN",
  CASH_OUT = "CASH_OUT",
  CLOSING_BALANCE = "CLOSING_BALANCE",
  RECONCILIATION = "RECONCILIATION",
  REFUND = "REFUND",
  PAYOUT = "PAYOUT",
}

// ===== PAYMENT TYPES =====
export enum PaymentMethod {
  CASH = "CASH",
  DIGITAL = "DIGITAL",
  CARD = "CARD",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED",
}

export enum RefundStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  PROCESSED = "PROCESSED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

// ===== INTERFACE TYPES =====
export interface ItemWithInventory {
  id: string
  name: string
  slug: string
  sku: string
  barcode?: string
  description?: string
  imageUrls: string
  thumbnail?: string
  costPrice: number
  sellingPrice: number
  msrp?: number
  trackInventory: boolean
  minStockLevel: number
  maxStockLevel?: number
  reorderLevel: number
  isActive: boolean
  isDiscontinued: boolean
  organizationId: string
  categoryId?: string
  brandId?: string
  unitId?: string
  taxRateId?: string
  category?: {
    id: string
    title: string
    slug: string
  }
  brand?: {
    id: string
    brandName: string
    slug: string
  }
  unit?: {
    id: string
    name: string
    symbol: string
    type: UnitType
  }
  taxRate?: {
    id: string
    taxRateName: string
    rate: number
    type: TaxType
  }
  inventoryLevels?: {
    id: string
    itemId: string
    locationId: string
    quantityOnHand: number
    quantityReserved: number
    quantityAvailable: number
    quantityInTransit: number
    quantityOnOrder: number
    reorderPoint: number
    averageCost: number
    totalValue: number
    lastCountDate?: Date
    lastTransactionAt?: Date
  }[]
  createdAt: Date
  updatedAt: Date
}

export interface FetchItemsParams {
  organizationId: string
  locationId?: string
  categoryId?: string
  brandId?: string
  isActive?: boolean
  search?: string
  skip?: number
  take?: number
  orderBy?: {
    field: "name" | "sku" | "sellingPrice" | "costPrice" | "createdAt" | "quantityOnHand"
    direction: "asc" | "desc"
  }[]
}

export interface FetchItemsResponse {
  items: ItemWithInventory[]
  total: number
  hasMore: boolean
}

export interface CartItem {
  id: string
  itemId: string
  name: string
  sku: string
  price: number
  quantity: number
  discount: number
  taxRate: number
  taxAmount: number
  lineTotal: number
  imageUrl?: string
}

export interface CashDrawerSummary {
  currentBalance: number
  openingBalance: number
  totalCashIn: number
  totalCashOut: number
  totalSales: number
  expectedBalance: number
  variance: number
  isOpen: boolean
  lastActivity?: Date
}

export interface SessionSummary {
  id: string
  sessionNumber: string
  status: POSSessionStatus
  startTime: Date
  endTime?: Date
  terminalName: string
  locationName: string
  userName: string
  openingBalance: number
  closingBalance?: number
  expectedBalance?: number
  variance?: number
  totalSales: number
  totalTax: number
  totalDiscount: number
  transactionCount: number
  cashTotal: number
  cardTotal: number
  digitalTotal: number
}

export interface SalesAnalytics {
  totalSales: number
  totalTransactions: number
  averageTransaction: number
  cashSales: number
  cardSales: number
  digitalSales: number
  grossProfit: number
  grossMargin: number
  topSellingItems: {
    itemId: string
    itemName: string
    quantitySold: number
    revenue: number
  }[]
  hourlySales: {
    hour: number
    sales: number
    transactions: number
  }[]
  dailySales: Record<string, number>
}

export interface CashDrawerAnalytics {
  openingBalance: number
  totalCashIn: number
  totalCashOut: number
  salesTotal: number
  expectedBalance: number
  actualBalance?: number
  variance: number
  events: {
    id: string
    type: cashDrawerTransactionType
    amount: number
    reason?: string
    notes?: string
    balanceBefore: number
    balanceAfter: number
    createdAt: Date
    userName?: string
  }[]
}

export interface InventoryAnalytics {
  totalValue: number
  totalItems: number
  averageValue: number
  lowStockCount: number
  lowStockItems: {
    id: string
    itemId: string
    locationId: string
    quantityOnHand: number
    quantityAvailable: number
    reorderPoint: number
    item?: {
      id: string
      name: string
      sku: string
      minStockLevel: number
    }
  }[]
}

export interface AlertConfig {
  lowStockThreshold: number
  varianceThreshold: number
  sessionTimeoutMinutes: number
  enableSoundAlerts: boolean
  enableEmailAlerts: boolean
}

export interface Alert {
  id: string
  type: "LOW_STOCK" | "CASH_VARIANCE" | "SESSION_TIMEOUT" | "SYSTEM_ERROR"
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  title: string
  message: string
  data?: any
  isRead: boolean
  isAcknowledged: boolean
  createdAt: Date
  acknowledgedAt?: Date
  acknowledgedBy?: string
}

// ===== LEGACY TYPE ALIASES FOR COMPATIBILITY =====
export type TransactionReferenceTypeLegacy = "SALE" | "RETURN" | "ADJUSTMENT" | "TRANSFER" | "COUNT"
export type TransactionTypeLegacy = "IN" | "OUT" | "ADJUSTMENT"
export type PaymentMethodLegacy = "CASH" | "CARD" | "CHECK" | "GIFT_CARD" | "STORE_CREDIT"
