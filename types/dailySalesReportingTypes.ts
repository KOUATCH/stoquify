// Types for the Daily Sales Dashboard System
export interface DailySalesReport {
  id: string
  date: Date
  locationId: string
  organizationId: string
  totalRevenue: number
  totalCost: number
  grossProfit: number
  grossMargin: number
  totalQuantitySold: number
  totalTransactions: number
  averageTransactionValue: number
  itemsSold: number
  cashSales: number
  cardSales: number
  digitalSales: number
  openingBalance: number
  closingBalance: number
  cashIn: number
  cashOut: number
  variance: number
  reportGeneratedAt: Date
  isFinalized: boolean
  notes?: string
  itemSales: DailySalesReportItem[]
  cashDrawerTransactions: cashDrawerTransaction[]
}

export interface DailySalesReportItem {
  id: string
  itemName: string
  itemSku: string
  costPrice: number
  sellingPrice: number
  startingQuantity: number
  quantitySold: number
  endingQuantity: number
  cashSales: number
  cardSales: number
  digitalSales: number
  totalRevenue: number
  totalCost: number
  grossProfit: number
  margin: number
}

export interface cashDrawerTransaction {
  id: string
  eventType: "OPENING_BALANCE" | "SALE" | "RETURN" | "CASH_IN" | "CASH_OUT" | "CLOSING_BALANCE" | "RECONCILIATION"
  amount: number
  balanceBefore: number
  balanceAfter: number
  timestamp: Date
  userName?: string
  notes?: string
}

export interface Location {
  id: string
  name: string
  code: string
  type: "WAREHOUSE" | "STORE" | "DISTRIBUTION_CENTER"
}

export interface ReportHistory {
  id: string
  date: Date
  locationId: string
  totalRevenue: number
  totalTransactions: number
  isFinalized: boolean
  reportGeneratedAt: Date
  location: Location
}

export interface GenerateReportParams {
  date: string
  locationId: string
  organizationId: string
  forceRegenerate?: boolean
}

export interface FinalizeReportParams {
  reportId: string
  notes?: string
}
