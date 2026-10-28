export interface CustomerDTO {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  notes?: string
  isActive: boolean
  organizationId?: string
  createdAt: Date
  updatedAt: Date
}

export interface SalesOrderDTO {
  id: string
  orderNumber: string
  date: Date
  customerId: string
  customer: CustomerDTO
  locationId: string
  location: {
    id: string
    name: string
    address?: string
  }
  status: SalesOrderStatus
  subTotal: number
  taxAmount: number
  shippingCost: number
  discount: number
  total: number
  paymentStatus: PaymentStatus
  paymentMethod?: string
  notes?: string
  organizationId?: string
  createdById?: string
  createdBy?: {
    id: string
    name?: string
    email?: string
  }
  lines: SalesOrderLineDTO[]
  createdAt: Date
  updatedAt: Date
}

export interface SalesOrderLineDTO {
  id: string
  salesOrderId: string
  itemId: string
  item: {
    id: string
    name: string
    sku: string
    description?: string
    sellingPrice: number
  }
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  discount?: number
  totalPrice: number
  createdAt: Date
  updatedAt: Date
}

export type SalesOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "RETURNED"

export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "REFUNDED" | "CANCELLED"

export interface CreateSalesOrderPayload {
  customerId: string
  locationId: string
  paymentMethod?: string
  notes?: string
  organizationId: string
  createdById: string
  orderLines: {
    itemId: string
    quantity: number
    unitPrice: number
    taxRate?: number
    discount?: number
  }[]
  shippingCost?: number
}

export interface SalesOrderFilters {
  orderDate: any
  organizationId: string
  search?: string
  status?: SalesOrderStatus | SalesOrderStatus[]
  paymentStatus?: PaymentStatus | PaymentStatus[]
  customerId?: string
  locationId?: string
  dateFrom?: string
  dateTo?: string
  minTotal?: number
  maxTotal?: number
  createdBy?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface TransferDTO {
  id: string
  transferNumber: string
  date: Date
  fromLocationId: string
  fromLocation: {
    id: string
    name: string
    address?: string
  }
  toLocationId: string
  toLocation: {
    id: string
    name: string
    address?: string
  }
  status: TransferStatus
  notes?: string
  organizationId?: string
  createdById?: string
  createdBy?: {
    id: string
    name?: string
    email?: string
  }
  approvedById?: string
  approvedBy?: {
    id: string
    name?: string
    email?: string
  }
  lines: TransferLineDTO[]
  createdAt: Date
  updatedAt: Date
}

export interface TransferLineDTO {
  id: string
  transferId: string
  itemId: string
  item: {
    id: string
    name: string
    sku: string
    description?: string
  }
  quantity: number
  notes?: string
  serialNumbers: string[]
  createdAt: Date
  updatedAt: Date
}

export type TransferStatus = "DRAFT" | "APPROVED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED"

export interface AdjustmentDTO {
  id: string
  adjustmentNumber: string
  date: Date
  adjustmentType: AdjustmentType
  reason: string
  notes: string
  status: AdjustmentStatus
  locationId?: string
  location?: {
    id: string
    name: string
    address?: string
  }
  organizationId?: string
  createdById?: string
  createdBy?: {
    id: string
    name?: string
    email?: string
  }
  approvedById?: string
  approvedBy?: {
    id: string
    name?: string
    email?: string
  }
  lines: AdjustmentLineDTO[]
  createdAt: Date
  updatedAt: Date
}

export interface AdjustmentLineDTO {
  id: string
  adjustmentId: string
  itemId: string
  item: {
    id: string
    name: string
    sku: string
    description?: string
  }
  beforeQuantity: number
  afterQuantity: number
  adjustedQuantity: number
  notes?: string
  serialNumbers: string[]
  unitCost?: number
  totalCost?: number
  createdAt: Date
  updatedAt: Date
}

export type AdjustmentType = "STOCK_COUNT" | "DAMAGED" | "THEFT" | "EXPIRED" | "WRITE_OFF" | "CORRECTION" | "OTHERS"

export type AdjustmentStatus = "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED"
