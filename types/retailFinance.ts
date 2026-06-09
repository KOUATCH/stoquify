// Simplified Financial Types for Retail Management
export interface RetailFinancialSummary {
  period: {
    startDate: Date
    endDate: Date
    label: string
  }

  // Revenue & Sales
  sales: {
    totalRevenue: number
    totalTransactions: number
    averageTransactionValue: number
    salesGrowth: number
    dailyAverage: number
    topSellingCategories: CategorySales[]
    topSellingProducts: ProductSales[]
    salesByLocation: LocationSales[]
  }

  // Costs & Purchases
  costs: {
    totalPurchases: number
    costOfGoodsSold: number
    inventoryValue: number
    purchasesBySupplier: SupplierPurchases[]
    pendingPurchaseOrders: number
  }

  // Profitability
  profitability: {
    grossProfit: number
    grossMargin: number
    netProfit: number
    profitByCategory: CategoryProfit[]
    profitByProduct: ProductProfit[]
    mostProfitableItems: ProfitableItem[]
  }

  // Customer Finances
  customerFinances: {
    totalReceivables: number
    overdueReceivables: number
    customerCredits: number
    topDebtors: CustomerDebt[]
    paymentHistory: CustomerPaymentSummary[]
    creditUtilization: number
  }

  // Supplier Finances
  supplierFinances: {
    totalPayables: number
    overduePayables: number
    upcomingPayments: UpcomingPayment[]
    supplierCreditBalance: number
    paymentHistory: SupplierPaymentSummary[]
  }

  // Payroll & HR Expenses
  payroll: {
    totalPayrollExpense: number
    totalEmployees: number
    averageSalary: number
    payrollGrowth: number
    departmentBreakdown: Array<{
      department: string
      employeeCount: number
      totalCost: number
      averageSalary: number
    }>
    benefitsCost: number
    payrollTaxes: number
    overtimeCost: number
    overtimePercentage: number
  }

  // Cash Flow
  cashFlow: {
    currentCashPosition: number
    cashIn: number
    cashOut: number
    netCashFlow: number
    projectedCashFlow: number
    cashFlowTrend: CashFlowData[]
  }
}

// Detailed Customer Financial Management
export interface CustomerFinancialAccount {
  customerId: string
  customerName: string
  customerCode: string
  email?: string
  phone?: string

  // Account Balances
  currentBalance: number // Positive = customer owes money, Negative = store owes customer
  creditLimit: number
  availableCredit: number

  // Receivables (money owed to us by customer)
  receivables: {
    total: number
    overdue: number
    current: number
    aging: {
      current: number      // 0-30 days
      days30to60: number  // 31-60 days
      days60to90: number  // 61-90 days
      over90days: number  // 90+ days
    }
  }

  // Store Credits & Payables (money we owe customer)
  credits: {
    storeCredit: number
    refunds: number
    loyaltyPoints: number
    promoCodes: number
  }

  // Transaction History
  transactions: CustomerTransaction[]
  payments: CustomerPayment[]

  // Account Status
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  lastActivity: Date

  // Financial Summary
  summary: {
    totalPurchases: number
    totalPayments: number
    averageOrderValue: number
    paymentHistory: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
    daysSinceLastPayment: number
  }
}

export interface CustomerTransaction {
  id: string
  date: Date
  type: 'SALE' | 'RETURN' | 'CREDIT' | 'PAYMENT' | 'ADJUSTMENT'
  amount: number
  description: string
  reference?: string // Invoice/Receipt number
  balanceAfter: number
}

export interface CustomerPayment {
  id: string
  date: Date
  amount: number
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'MOBILE_MONEY'
  reference?: string
  appliedTo: string[] // Invoice IDs this payment was applied to
  notes?: string
}

// Supporting types
export interface CategorySales {
  categoryId: string
  categoryName: string
  totalSales: number
  quantity: number
  growth: number
  margin: number
}

export interface ProductSales {
  productId: string
  productName: string
  sku: string
  unitsSold: number
  revenue: number
  averagePrice: number
}

export interface LocationSales {
  locationId: string
  locationName: string
  totalSales: number
  transactions: number
  averageTransaction: number
}

export interface SupplierPurchases {
  supplierId: string
  supplierName: string
  totalPurchases: number
  pendingAmount: number
  lastPurchase: Date
}

export interface CategoryProfit {
  categoryId: string
  categoryName: string
  revenue: number
  cost: number
  profit: number
  margin: number
}

export interface ProductProfit {
  productId: string
  productName: string
  sku: string
  revenue: number
  cost: number
  profit: number
  margin: number
  unitsSold: number
}

export interface ProfitableItem {
  productId: string
  productName: string
  profit: number
  margin: number
  rank: number
}

export interface CustomerDebt {
  customerId: string
  customerName: string
  totalOwed: number
  overdueAmount: number
  daysPastDue: number
  lastContact: Date
}

export interface CustomerPaymentSummary {
  customerId: string
  customerName: string
  totalPaid: number
  lastPayment: Date
  paymentMethod: string
}

export interface UpcomingPayment {
  supplierId: string
  supplierName: string
  amount: number
  dueDate: Date
  purchaseOrderId?: string
}

export interface SupplierPaymentSummary {
  supplierId: string
  supplierName: string
  totalPaid: number
  lastPayment: Date
  pendingAmount: number
}

export interface CashFlowData {
  date: Date
  cashIn: number
  cashOut: number
  netFlow: number
  balance: number
}

// Financial Analysis Filters
export interface FinancialFilters {
  dateRange: {
    startDate: Date
    endDate: Date
  }
  locations?: string[]
  categories?: string[]
  suppliers?: string[]
  customers?: string[]
  includeReturns: boolean
  includeTax: boolean
}

// Payroll Management Types
export interface Employee {
  id: string
  userId?: string // Link to User table
  employeeCode: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone?: string
  jobTitle: string
  department: string
  hireDate: Date
  isActive: boolean

  // Salary Information
  salaryInfo: {
    baseSalary: number
    payFrequency: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY'
    currency: string
    effectiveDate: Date
  }

  // Benefits and Deductions
  benefits: EmployeeBenefit[]
  deductions: EmployeeDeduction[]

  // Tax Information
  taxInfo: {
    taxId: string
    taxClassification: string
    exemptions: number
    additionalWithholding: number
  }

  // Banking Information
  bankInfo?: {
    bankName: string
    accountNumber: string
    routingNumber: string
    accountType: 'CHECKING' | 'SAVINGS'
  }

  createdAt: Date
  updatedAt: Date
}

export interface EmployeeBenefit {
  id: string
  type: 'HEALTH_INSURANCE' | 'DENTAL' | 'VISION' | 'RETIREMENT' | 'LIFE_INSURANCE' | 'OTHER'
  name: string
  employerContribution: number
  employeeContribution: number
  isActive: boolean
}

export interface EmployeeDeduction {
  id: string
  type: 'TAX' | 'INSURANCE' | 'LOAN' | 'GARNISHMENT' | 'VOLUNTARY' | 'OTHER'
  name: string
  amount: number
  isPercentage: boolean
  isActive: boolean
}

export interface PayrollPeriod {
  id: string
  organizationId: string
  periodStart: Date
  periodEnd: Date
  payDate: Date
  status: 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'PAID' | 'CANCELLED'
  totalGrossPay: number
  totalDeductions: number
  totalNetPay: number
  totalEmployees: number
  notes?: string
  createdAt: Date
  updatedAt: Date

  // Payroll entries for this period
  payrollEntries: PayrollEntry[]
}

export interface PayrollEntry {
  id: string
  employeeId: string
  employee: Employee
  payrollPeriodId: string
  payrollPeriod: PayrollPeriod

  // Earnings
  baseSalary: number
  overtime: number
  bonuses: number
  commissions: number
  allowances: number
  totalGrossEarnings: number

  // Deductions
  federalTax: number
  stateTax: number
  socialSecurity: number
  medicare: number
  healthInsurance: number
  retirementContribution: number
  otherDeductions: number
  totalDeductions: number

  // Net Pay
  netPay: number

  // Hours (if applicable)
  regularHours?: number
  overtimeHours?: number

  // Status
  status: 'DRAFT' | 'APPROVED' | 'PAID'
  paidDate?: Date
  paymentMethod: 'DIRECT_DEPOSIT' | 'CHECK' | 'CASH'
  paymentReference?: string

  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface PayrollSummary {
  period: {
    startDate: Date
    endDate: Date
    payDate: Date
    label: string
  }

  totals: {
    totalEmployees: number
    totalGrossPay: number
    totalDeductions: number
    totalNetPay: number
    averageSalary: number
  }

  breakdown: {
    byDepartment: Array<{
      department: string
      employeeCount: number
      totalGrossPay: number
      totalNetPay: number
      averageSalary: number
    }>

    byPayFrequency: Array<{
      frequency: string
      employeeCount: number
      totalAmount: number
    }>
  }

  deductions: {
    federalTax: number
    stateTax: number
    socialSecurity: number
    medicare: number
    healthInsurance: number
    retirement: number
    other: number
  }

  paymentMethods: {
    directDeposit: number
    check: number
    cash: number
  }
}

export interface PayrollExpenseAllocation {
  id: string
  organizationId: string
  payrollPeriodId: string

  // Expense Categories
  salariesAndWages: number
  benefits: number
  payrollTaxes: number
  workersCompensation: number
  unemploymentTax: number

  // Department Allocation
  departmentAllocations: Array<{
    department: string
    amount: number
    percentage: number
  }>

  // Cost Center Allocation (if applicable)
  costCenterAllocations?: Array<{
    costCenter: string
    amount: number
    percentage: number
  }>

  totalPayrollExpense: number
  createdAt: Date
}

// Financial Alerts
export interface FinancialAlert {
  id: string
  type: 'OVERDUE_RECEIVABLE' | 'LOW_CASH' | 'HIGH_INVENTORY_COST' | 'MARGIN_DROP' | 'PAYMENT_DUE' | 'PAYROLL_VARIANCE' | 'HIGH_OVERTIME_COST'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  amount?: number
  relatedEntity?: {
    id: string
    type: 'customer' | 'supplier' | 'product' | 'category' | 'employee' | 'payroll'
    name: string
  }
  actionRequired: string
  createdAt: Date
  resolvedAt?: Date
}