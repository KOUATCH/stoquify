// Financial Types for Comprehensive Financial System

export interface FinancialPeriod {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isActive: boolean
  isClosed: boolean
}

export interface CashFlowEntry {
  id: string
  date: Date
  type: 'inflow' | 'outflow'
  category: 'sales' | 'expenses' | 'investments' | 'loans' | 'taxes' | 'other'
  subcategory: string
  amount: number
  description: string
  reference?: string
  customerId?: string
  supplierId?: string
  orderId?: string
  invoiceId?: string
  isRecurring?: boolean
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface ProfitLossStatement {
  id: string
  periodId: string
  period: FinancialPeriod
  revenue: {
    totalSales: number
    returnsAndAllowances: number
    netSales: number
    costOfGoodsSold: number
    grossProfit: number
    grossProfitMargin: number
  }
  operatingExpenses: {
    salaries: number
    rent: number
    utilities: number
    marketing: number
    insurance: number
    depreciation: number
    other: number
    total: number
  }
  operatingIncome: number
  nonOperatingIncome: {
    interestIncome: number
    investmentGains: number
    other: number
    total: number
  }
  nonOperatingExpenses: {
    interestExpense: number
    taxes: number
    other: number
    total: number
  }
  netIncome: number
  netProfitMargin: number
  ebitda: number
  createdAt: Date
}

export interface CashFlowStatement {
  id: string
  periodId: string
  period: FinancialPeriod
  operatingActivities: {
    netIncome: number
    depreciation: number
    accountsReceivableChange: number
    inventoryChange: number
    accountsPayableChange: number
    other: number
    netCashFromOperating: number
  }
  investingActivities: {
    equipmentPurchases: number
    equipmentSales: number
    investments: number
    other: number
    netCashFromInvesting: number
  }
  financingActivities: {
    loans: number
    loanRepayments: number
    ownerWithdrawals: number
    ownerContributions: number
    other: number
    netCashFromFinancing: number
  }
  netCashFlow: number
  beginningCash: number
  endingCash: number
  createdAt: Date
}

export interface BalanceSheet {
  id: string
  periodId: string
  period: FinancialPeriod
  assets: {
    currentAssets: {
      cash: number
      accountsReceivable: number
      inventory: number
      prepaidExpenses: number
      other: number
      totalCurrentAssets: number
    }
    fixedAssets: {
      equipment: number
      accumulatedDepreciation: number
      netFixedAssets: number
    }
    totalAssets: number
  }
  liabilities: {
    currentLiabilities: {
      accountsPayable: number
      shortTermLoans: number
      accruedExpenses: number
      other: number
      totalCurrentLiabilities: number
    }
    longTermLiabilities: {
      longTermLoans: number
      other: number
      totalLongTermLiabilities: number
    }
    totalLiabilities: number
  }
  equity: {
    ownerEquity: number
    retainedEarnings: number
    totalEquity: number
  }
  createdAt: Date
}

export interface CustomerPerformance {
  customerId: string
  customerName: string
  period: FinancialPeriod
  metrics: {
    totalOrders: number
    totalRevenue: number
    averageOrderValue: number
    totalItems: number
    grossProfit: number
    grossProfitMargin: number
    acquisitionCost: number
    lifetimeValue: number
    returnRate: number
    paymentTermsCompliance: number
    creditUtilization: number
  }
  trends: {
    revenueGrowth: number
    orderFrequency: number
    seasonality: Record<string, number>
  }
  risk: {
    creditRisk: 'low' | 'medium' | 'high'
    churnProbability: number
    paymentHistory: 'excellent' | 'good' | 'poor'
  }
}

export interface ItemPerformance {
  itemId: string
  itemName: string
  sku: string
  categoryId: string
  categoryName: string
  period: FinancialPeriod
  metrics: {
    totalSold: number
    totalRevenue: number
    costOfGoodsSold: number
    grossProfit: number
    grossProfitMargin: number
    averageSellingPrice: number
    averageCostPrice: number
    turnoverRate: number
    daysToSell: number
    returnRate: number
    discountRate: number
  }
  trends: {
    salesGrowth: number
    priceElasticity: number
    seasonality: Record<string, number>
  }
  inventory: {
    currentStock: number
    averageStock: number
    stockValue: number
    reorderPoint: number
    economicOrderQuantity: number
    carryingCost: number
  }
}

export interface FinancialKPI {
  id: string
  name: string
  value: number
  target?: number
  variance?: number
  variancePercentage?: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
  category: 'profitability' | 'liquidity' | 'efficiency' | 'leverage' | 'growth'
  period: FinancialPeriod
  description: string
  formula?: string
  benchmark?: number
  status: 'excellent' | 'good' | 'warning' | 'poor'
}

export interface FinancialForecast {
  id: string
  type: 'revenue' | 'expenses' | 'cashflow' | 'profit'
  periodType: 'monthly' | 'quarterly' | 'yearly'
  forecastData: Array<{
    period: string
    predicted: number
    confidence: number
    scenario: 'optimistic' | 'realistic' | 'pessimistic'
  }>
  methodology: 'linear' | 'exponential' | 'seasonal' | 'regression'
  accuracy: number
  createdAt: Date
  updatedAt: Date
}

export interface FinancialAlert {
  id: string
  type: 'cashflow' | 'profitability' | 'expense' | 'kpi' | 'forecast'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  value: number
  threshold: number
  metric: string
  recommendations: string[]
  isActive: boolean
  createdAt: Date
  acknowledgedAt?: Date
}

export interface FinancialReport {
  id: string
  name: string
  type: 'profit_loss' | 'cash_flow' | 'balance_sheet' | 'customer_performance' | 'item_performance' | 'kpi_dashboard' | 'budget_variance'
  format: 'pdf' | 'excel' | 'csv' | 'json'
  periodId: string
  parameters: Record<string, any>
  data: any
  generatedAt: Date
  generatedBy: string
  size: number
  downloadUrl?: string
}

export interface BudgetEntry {
  id: string
  category: string
  subcategory: string
  periodId: string
  budgetedAmount: number
  actualAmount: number
  variance: number
  variancePercentage: number
  notes?: string
  isApproved: boolean
  approvedBy?: string
  approvedAt?: Date
}

export interface FinancialMetrics {
  profitability: {
    grossProfitMargin: number
    netProfitMargin: number
    returnOnAssets: number
    returnOnEquity: number
    ebitdaMargin: number
  }
  liquidity: {
    currentRatio: number
    quickRatio: number
    cashRatio: number
    workingCapital: number
    cashConversionCycle: number
  }
  efficiency: {
    inventoryTurnover: number
    receivablesTurnover: number
    payablesTurnover: number
    assetTurnover: number
    salesPerEmployee: number
  }
  leverage: {
    debtToEquity: number
    debtToAssets: number
    interestCoverage: number
    debtServiceCoverage: number
  }
  growth: {
    revenueGrowth: number
    profitGrowth: number
    customerGrowth: number
    marketShare: number
  }
}

export interface FinancialDashboardData {
  period: FinancialPeriod
  summary: {
    totalRevenue: number
    totalExpenses: number
    netIncome: number
    cashPosition: number
    grossMargin: number
    netMargin: number
  }
  trends: {
    revenue: Array<{ period: string; value: number }>
    profit: Array<{ period: string; value: number }>
    cashflow: Array<{ period: string; value: number }>
    expenses: Array<{ period: string; value: number }>
  }
  kpis: FinancialKPI[]
  alerts: FinancialAlert[]
  topCustomers: CustomerPerformance[]
  topItems: ItemPerformance[]
  cashFlowForecast: FinancialForecast
  metrics: FinancialMetrics
}