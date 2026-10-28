export interface Customer {
  id: string
  name: string
  code: string | null
  email: string | null
  phone: string | null
  address: string | null
  taxId: string | null
  creditLimit: number | null
  paymentTerms: number
  notes: string | null
  isActive: boolean
  organizationId: string
  createdAt: Date
  updatedAt: Date
}

export interface CustomerWithStats extends Customer {
  totalOrders: number
  totalRevenue: number
  totalOrderValue: number
  averageOrderValue: number
  lastOrderDate: Date | null
}

export interface CustomerOrderLine {
  id: string
  itemName: string
  sku: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface CustomerOrderPayment {
  id: string
  paymentNumber: string
  amount: number
  method: string
  status: string
  processedAt: Date | null
  createdAt: Date
}

export interface CustomerOrder {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  subtotal: number
  taxAmount: number
  discountAmount: number
  itemCount: number
  lineItems: number
  createdAt: Date
  updatedAt: Date
  lines: CustomerOrderLine[]
  payments: CustomerOrderPayment[]
}

export interface CustomerOrdersResult {
  orders: CustomerOrder[]
  stats: {
    totalOrders: number
    totalRevenue: number
    averageOrderValue: number
  }
}
