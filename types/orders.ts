export const OrderStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  PARTIALLY_DELIVERED: 'PARTIALLY_DELIVERED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED'
} as const

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export const OrderPaymentStatus = {
  UNPAID: 'UNPAID',
  ADVANCE_PAID: 'ADVANCE_PAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  FULLY_PAID: 'FULLY_PAID',
  REFUNDED: 'REFUNDED',
  DISPUTED: 'DISPUTED'
} as const

export type OrderPaymentStatus = (typeof OrderPaymentStatus)[keyof typeof OrderPaymentStatus]

export const OrderPaymentMethod = {
  CASH: 'CASH',
  CREDIT_CARD: 'CREDIT_CARD',
  DEBIT_CARD: 'DEBIT_CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  MOBILE_MONEY: 'MOBILE_MONEY',
  CHEQUE: 'CHEQUE',
  STORE_CREDIT: 'STORE_CREDIT',
  OTHER: 'OTHER'
} as const

export type OrderPaymentMethod = (typeof OrderPaymentMethod)[keyof typeof OrderPaymentMethod]

export const DeliveryMethod = {
  PICKUP: 'PICKUP',
  DELIVERY: 'DELIVERY',
  SHIPPING: 'SHIPPING',
  DIGITAL: 'DIGITAL'
} as const

export type DeliveryMethod = (typeof DeliveryMethod)[keyof typeof DeliveryMethod]

export const OrderType = {
  STANDARD: 'STANDARD',
  EXPRESS: 'EXPRESS',
  BULK: 'BULK',
  SPECIAL: 'SPECIAL',
  RECURRING: 'RECURRING'
} as const

export type OrderType = (typeof OrderType)[keyof typeof OrderType]

export interface Customer {
  id: string
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
}

export interface Item {
  id: string
  name?: string | null
  nameEn?: string | null
  nameFr?: string | null
  sku?: string | null
  description?: string | null
  descriptionEn?: string | null
  descriptionFr?: string | null
}

export interface User {
  id?: string
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  email: string
}

export interface Location {
  id: string
  name: string
  code?: string | null
  address?: string | null
}

export interface Organization {
  id: string
  name: string
}

export interface ClientOrder {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  orderType: OrderType
  deliveryMethod: DeliveryMethod
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  orderDate: Date
  expectedDate?: Date | null
  completedDate?: Date | null
  subtotal: number
  taxAmount: number
  discountAmount: number
  shippingAmount: number
  totalAmount: number
  advanceAmount: number
  balanceAmount: number
  notes?: string | null
  specialInstructions?: string | null
  internalNotes?: string | null
  locationId?: string | null
  organizationId: string
  createdById?: string | null
  updatedById?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface OrderLine {
  id: string
  orderId?: string
  itemId: string
  itemName: string
  itemSku: string
  unitPrice: number
  quantity: number
  totalAmount: number
  deliveredQuantity: number
  notes?: string | null
  specialRequirements?: string | null
}

export interface OrderPayment {
  id: string
  orderId?: string
  paymentNumber: string
  paymentDate: Date
  paymentMethod: OrderPaymentMethod
  amount: number
  reference?: string | null
  notes?: string | null
  isAdvancePayment: boolean
  processedById?: string | null
}

export interface OrderDelivery {
  id: string
  orderId?: string
  deliveryNumber: string
  deliveryDate: Date
  deliveryAddress?: string | null
  deliveryNotes?: string | null
  recipientName?: string | null
  recipientPhone?: string | null
  isPartialDelivery: boolean
  deliveryFee?: number | null
  deliveredById?: string | null
}

export interface DeliveryItem {
  id: string
  deliveryId?: string
  orderLineId: string
  quantityDelivered: number
  notes?: string | null
}

export interface OrderStatusHistory {
  id: string
  orderId?: string
  fromStatus?: OrderStatus | null
  toStatus: OrderStatus
  reason?: string | null
  notes?: string | null
  changedAt: Date
  changedById?: string | null
}

export interface OrderDocument {
  id: string
  orderId?: string
  name?: string | null
  url?: string | null
  uploadedAt?: Date | null
  uploadedById?: string | null
}

// Extended types with relations
export interface ExtendedClientOrder extends ClientOrder {
  customer: Customer
  orderLines: (OrderLine & {
    item: Item
    deliveryItems?: DeliveryItem[]
  })[]
  payments: (OrderPayment & {
    processedBy: {
      name: string | null
      email: string
    }
  })[]
  deliveries?: (OrderDelivery & {
    deliveryItems: (DeliveryItem & {
      orderLine: OrderLine & {
        item: Item
      }
    })[]
    deliveredBy: {
      name: string | null
      email: string
    }
  })[]
  statusHistory: (OrderStatusHistory & {
    changedBy: {
      name: string | null
      email: string
    }
  })[]
  documents?: (OrderDocument & {
    uploadedBy: {
      name: string | null
      email: string
    }
  })[]
  location?: Location | null
  createdBy?: {
    name: string | null
    email: string
  }
  updatedBy?: {
    name: string | null
    email: string
  } | null
}

export interface ExtendedOrderLine extends OrderLine {
  item: Item
  deliveryItems: DeliveryItem[]
}

export interface ExtendedOrderPayment extends OrderPayment {
  processedBy: {
    name: string | null
    email: string
  }
  order?: {
    orderNumber: string
    customerName: string
  }
}

export interface ExtendedOrderDelivery extends OrderDelivery {
  order: {
    orderNumber: string
    customerName: string
    totalAmount: number
  }
  deliveryItems: (DeliveryItem & {
    orderLine: OrderLine & {
      item: {
        name: string
        sku: string
      }
    }
  })[]
  deliveredBy: {
    name: string | null
    email: string
  }
}

// Form data types
export interface OrderFormData {
  customerId: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  orderType: OrderType
  deliveryMethod: DeliveryMethod
  expectedDate?: Date
  notes?: string
  specialInstructions?: string
  orderLines: OrderLineFormData[]
}

export interface OrderLineFormData {
  itemId: string
  itemName: string
  itemSku: string
  unitPrice: number
  quantity: number
  notes?: string
  specialRequirements?: string
}

export interface PaymentFormData {
  paymentMethod: OrderPaymentMethod
  amount: number
  reference?: string
  notes?: string
  isAdvancePayment: boolean
}

export interface DeliveryFormData {
  deliveryAddress?: string
  deliveryNotes?: string
  recipientName?: string
  recipientPhone?: string
  isPartialDelivery: boolean
  deliveryFee?: number
  deliveryItems: DeliveryItemFormData[]
}

export interface DeliveryItemFormData {
  orderLineId: string
  quantityDelivered: number
  notes?: string
}

// Filter types
export interface OrderFilters {
  status?: OrderStatus
  paymentStatus?: OrderPaymentStatus
  customerId?: string
  locationId?: string
  dateFrom?: Date
  dateTo?: Date
  searchTerm?: string
}

export interface PaymentFilters {
  orderId?: string
  paymentMethod?: OrderPaymentMethod
  dateFrom?: Date
  dateTo?: Date
  searchTerm?: string
  isAdvancePayment?: boolean
}

export interface DeliveryFilters {
  orderId?: string
  dateFrom?: Date
  dateTo?: Date
  searchTerm?: string
  isPartialDelivery?: boolean
}

// Analytics types
export interface OrderAnalytics {
  totalOrders: number
  ordersByStatus: {
    pending: number
    processing: number
    ready: number
    delivered: number
    cancelled: number
  }
  revenue: {
    totalRevenue: number
    advancePayments: number
    balancePayments: number
  }
}

export interface PaymentAnalytics {
  totalPayments: number
  totalAmount: number
  advancePayments: {
    count: number
    amount: number
  }
  balancePayments: {
    count: number
    amount: number
  }
  paymentsByMethod: {
    [key in OrderPaymentMethod]?: {
      count: number
      amount: number
    }
  }
}

export interface DeliveryAnalytics {
  totalDeliveries: number
  partialDeliveries: number
  fullDeliveries: number
  totalDeliveryFees: number
}

// Dashboard summary type
export interface OrderDashboardSummary {
  ordersToday: number
  pendingOrders: number
  readyForPickup: number
  revenueToday: number
  advancePaymentsToday: number
  balanceCollectionToday: number
  recentOrders: ExtendedClientOrder[]
  recentPayments: ExtendedOrderPayment[]
  recentDeliveries: ExtendedOrderDelivery[]
}

// Status and method display helpers
export const ORDER_STATUS_COLORS = {
  [OrderStatus.DRAFT]: 'bg-gray-100 text-gray-700 border-gray-200',
  [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [OrderStatus.CONFIRMED]: 'bg-blue-100 text-blue-700 border-blue-200',
  [OrderStatus.PROCESSING]: 'bg-orange-100 text-orange-700 border-orange-200',
  [OrderStatus.READY_FOR_PICKUP]: 'bg-green-100 text-green-700 border-green-200',
  [OrderStatus.PARTIALLY_DELIVERED]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  [OrderStatus.DELIVERED]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-700 border-red-200',
  [OrderStatus.RETURNED]: 'bg-purple-100 text-purple-700 border-purple-200'
} as const

export const PAYMENT_STATUS_COLORS = {
  [OrderPaymentStatus.UNPAID]: 'bg-red-100 text-red-700 border-red-200',
  [OrderPaymentStatus.ADVANCE_PAID]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [OrderPaymentStatus.PARTIALLY_PAID]: 'bg-orange-100 text-orange-700 border-orange-200',
  [OrderPaymentStatus.FULLY_PAID]: 'bg-green-100 text-green-700 border-green-200',
  [OrderPaymentStatus.REFUNDED]: 'bg-purple-100 text-purple-700 border-purple-200',
  [OrderPaymentStatus.DISPUTED]: 'bg-gray-100 text-gray-700 border-gray-200'
} as const

export const PAYMENT_METHOD_LABELS = {
  [OrderPaymentMethod.CASH]: 'Cash',
  [OrderPaymentMethod.CREDIT_CARD]: 'Credit Card',
  [OrderPaymentMethod.DEBIT_CARD]: 'Debit Card',
  [OrderPaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [OrderPaymentMethod.MOBILE_MONEY]: 'Mobile Money',
  [OrderPaymentMethod.CHEQUE]: 'Cheque',
  [OrderPaymentMethod.STORE_CREDIT]: 'Store Credit',
  [OrderPaymentMethod.OTHER]: 'Other'
} as const

export const ORDER_TYPE_LABELS = {
  [OrderType.STANDARD]: 'Standard',
  [OrderType.EXPRESS]: 'Express',
  [OrderType.BULK]: 'Bulk',
  [OrderType.SPECIAL]: 'Special',
  [OrderType.RECURRING]: 'Recurring'
} as const

export const DELIVERY_METHOD_LABELS = {
  [DeliveryMethod.PICKUP]: 'Pickup',
  [DeliveryMethod.DELIVERY]: 'Delivery',
  [DeliveryMethod.SHIPPING]: 'Shipping',
  [DeliveryMethod.DIGITAL]: 'Digital'
} as const

// Helper functions
export const getOrderStatusLabel = (status: OrderStatus): string => {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

export const getPaymentStatusLabel = (status: OrderPaymentStatus): string => {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

export const formatOrderNumber = (orderNumber: string): string => {
  return orderNumber
}

export const calculateOrderProgress = (order: ExtendedClientOrder): number => {
  const totalItems = order.orderLines.reduce((sum, line) => sum + line.quantity, 0)
  const deliveredItems = order.orderLines.reduce((sum, line) => sum + line.deliveredQuantity, 0)

  return totalItems > 0 ? Math.round((deliveredItems / totalItems) * 100) : 0
}

export const canCancelOrder = (order: ExtendedClientOrder): boolean => {
  return [OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)
}

export const canEditOrder = (order: ExtendedClientOrder): boolean => {
  return [OrderStatus.DRAFT, OrderStatus.PENDING].includes(order.status)
}

export const canProcessOrder = (order: ExtendedClientOrder): boolean => {
  return order.status === OrderStatus.CONFIRMED
}

export const canDeliverOrder = (order: ExtendedClientOrder): boolean => {
  return [OrderStatus.PROCESSING, OrderStatus.READY_FOR_PICKUP, OrderStatus.PARTIALLY_DELIVERED].includes(order.status)
}
