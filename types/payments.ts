import { RefundStatus } from "@prisma/client"

export type OrderPaymentMethod =
  | "CASH"
  | "CARD"
  | "MOBILE_MONEY"
  | "BANK_TRANSFER"
  | "STORE_CREDIT"
  | "CHEQUE"

export type OrderPaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PARTIALLY_PAID"
  | "PARTIAL"
  | "FULLY_PAID"
  | "PAID"
  | "REFUNDED"
  | "CANCELLED"

export type PaymentFormData = {
  amount: number
  method: OrderPaymentMethod
  checkNumber?: string
  referenceNumber?: string
  notes?: string
  transactionId?: string
  authorizationCode?: string
  cardType?: string
  cardLast4?: string
  digitalWalletType?: string
  digitalTransactionId?: string
  cashTendered?: number
  changeGiven?: number
}

export type OrderPaymentWithDetails = {
  id: string
  paymentNumber: string
  amount: number
  method: OrderPaymentMethod
  status: OrderPaymentStatus
  paymentDate: Date
  checkNumber?: string
  referenceNumber?: string
  notes?: string
  transactionId?: string
  authorizationCode?: string
  cardType?: string
  cardLast4?: string
  digitalWalletType?: string
  digitalTransactionId?: string
  cashTendered?: number
  changeGiven?: number
  orderId: string
  processedById?: string
  organizationId: string
  createdAt: Date
  updatedAt: Date
  order?: {
    id: string
    orderNumber: string
    customerName: string
    totalAmount: number
  }
  processedBy?: {
    id: string
    name: string
    email: string
  }
}

export type PaymentRefundFormData = {
  amount: number
  reason: string
  notes?: string
}

export type PaymentRefundWithDetails = {
  id: string
  refundNumber: string
  amount: number
  reason: string
  status: RefundStatus
  notes?: string
  processedAt?: Date
  processedById?: string
  paymentId: string
  createdAt: Date
  updatedAt: Date
  payment?: {
    id: string
    paymentNumber: string
    amount: number
    method: OrderPaymentMethod
  }
  processedBy?: {
    id: string
    name: string
    email: string
  }
}

export type PaymentSummary = {
  totalPayments: number
  totalAmount: number
  pendingPayments: number
  pendingAmount: number
  completedPayments: number
  completedAmount: number
  refundedPayments: number
  refundedAmount: number
  paymentsByMethod: {
    method: OrderPaymentMethod
    count: number
    amount: number
  }[]
}

export type ReceiptData = {
  paymentId: string
  orderNumber: string
  paymentNumber: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  amount: number
  method: OrderPaymentMethod
  paymentDate: Date
  items: {
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  organization: {
    name: string
    address?: string
    phone?: string
    email?: string
  }
  cashTendered?: number
  changeGiven?: number
}

export type PaymentAnalytics = {
  dailyPayments: {
    date: string
    count: number
    amount: number
  }[]
  weeklyPayments: {
    week: string
    count: number
    amount: number
  }[]
  monthlyPayments: {
    month: string
    count: number
    amount: number
  }[]
  paymentMethodDistribution: {
    method: OrderPaymentMethod
    percentage: number
    amount: number
    count: number
  }[]
  averagePaymentAmount: number
  largestPayment: number
  smallestPayment: number
}

export type PaymentFilters = {
  status?: OrderPaymentStatus[]
  method?: OrderPaymentMethod[]
  dateFrom?: Date
  dateTo?: Date
  amountMin?: number
  amountMax?: number
  customerId?: string
  orderNumber?: string
}

export type PaymentTableColumn = {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
}
