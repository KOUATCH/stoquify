import type { CashDrawerTransactionType } from "@prisma/client"

export interface pOSStationDTO {
  id: string
  stationNumber: string
  name: string
  locationId: string
  location: {
    id: string
    name: string
    address?: string
  }
  organizationId?: string
  isActive: boolean
  ipAddress?: string
  macAddress?: string
  serialNumber?: string
  hasCashDrawer: boolean
  hasReceiptPrinter: boolean
  hasBarcodeScanner: boolean
  hasCardReader: boolean
  hasScale: boolean
  currentSessionId?: string
  currentSession?: POSSessionDTO
  createdAt: Date
  updatedAt: Date
}

export interface POSSessionDTO {
  id: string
  sessionNumber: string
  stationId: string
  terminal: {
    id: string
    stationNumber: string
    name: string
  }
  userId: string
  user: {
    id: string
    name?: string
    email: string
  }
  startTime: Date
  endTime?: Date
  status: POSSessionStatus
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
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type POSSessionStatus = "ACTIVE" | "SUSPENDED" | "CLOSED" | "RECONCILED"

export interface CashDrawerDTO {
  id: string
  name: string
  locationId: string
  location: {
    id: string
    name: string
  }
  currentBalance: number
  isOpen: boolean
  lastOpenedAt?: Date
  lastClosedAt?: Date
  events: cashDrawerTransactionDTO[]
  createdAt: Date
  updatedAt: Date
}

export interface cashDrawerTransactionDTO {
  id: string
  cashDrawerId: string
  sessionId?: string
  type: CashDrawerTransactionType
  amount: number
  reason?: string
  notes?: string
  userId: string
  user: {
    id: string
    name?: string
    email: string
  }
  balanceBefore: number
  balanceAfter: number
  createdAt: Date
}

// Using CashDrawerTransactionType from @prisma/client instead of custom type

export interface PaymentDTO {
  id: string
  paymentNumber: string
  salesOrderId: string
  amount: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  cardType?: string
  cardLast4?: string
  transactionId?: string
  authorizationCode?: string
  digitalWalletType?: string
  digitalTransactionId?: string
  cashTendered?: number
  changeGiven?: number
  processedAt?: Date
  processorResponse?: string
  refundedAmount: number
  processedById?: string
  processedBy?: {
    id: string
    name?: string
    email: string
  }
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type PaymentMethod = 
  | "CASH"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "DIGITAL_WALLET"
  | "BANK_TRANSFER"
  | "CHECK"
  | "GIFT_CARD"
  | "STORE_CREDIT"
  | "LAYAWAY"

export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "REFUNDED" | "CANCELLED"

export interface CartItem {
  id: string
  itemId: string
  name: string
  sku: string
  price: number
  quantity: number
  taxRate: number
  discount: number
  total: number
  category?: string
  image?: string
}

export interface POSCart {
  items: CartItem[]
  subTotal: number
  taxAmount: number
  discount: number
  total: number
  itemCount: number
}

export interface CreatePOSSessionPayload {
  stationId: string
  userId: string
  openingBalance: number
  notes?: string
}

export interface ClosePOSSessionPayload {
  sessionId: string
  closingBalance: number
  notes?: string
}

export interface CashDrawerOperationPayload {
  cashDrawerId: string
  sessionId?: string
  type: CashDrawerTransactionType
  amount: number
  reason?: string
  notes?: string
  userId: string
}

export interface ProcessPaymentPayload {
  salesOrderId: string
  amount: number
  paymentMethod: PaymentMethod
  cardType?: string
  cardLast4?: string
  transactionId?: string
  authorizationCode?: string
  digitalWalletType?: string
  digitalTransactionId?: string
  cashTendered?: number
  changeGiven?: number
  notes?: string
}

export interface POSFilters {
  organizationId: string
  locationId?: string
  stationId?: string
  sessionId?: string
  status?: POSSessionStatus | POSSessionStatus[]
  dateFrom?: string
  dateTo?: string
  userId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface DailySalesReportDTO {
  id: string
  date: Date
  locationId: string
  location: {
    id: string
    name: string
    address?: string
  }
  organizationId?: string
  totalSales: number
  totalTax: number
  totalDiscount: number
  netSales: number
  transactionCount: number
  cashSales: number
  cardSales: number
  digitalSales: number
  otherSales: number
  totalReturns: number
  totalRefunds: number
  costOfGoodsSold: number
  grossProfit: number
  grossMargin: number
  generatedAt: Date
  generatedById?: string
  generatedBy?: {
    id: string
    name?: string
    email: string
  }
}

export interface POSSummary {
  activeSessions: number
  totalSalesToday: number
  transactionsToday: number
  averageTransactionValue: number
  cashInDrawer: number
  topSellingItems: Array<{
    itemId: string
    name: string
    sku: string
    quantitySold: number
    revenue: number
  }>
  paymentMethodBreakdown: {
    cash: number
    card: number
    digital: number
    other: number
  }
  hourlyStats: Array<{
    hour: number
    sales: number
    transactions: number
  }>
}
