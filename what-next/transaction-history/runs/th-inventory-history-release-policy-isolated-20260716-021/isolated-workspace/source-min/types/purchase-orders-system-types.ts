
"use client"

import { useEffect, useState } from "react"

export type PurchaseOrderStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "COMPLETED"
  | "CANCELLED"

export interface OrderLineInput {
  itemId: string
  quantity: number
  unitPrice: number
  taxRate?: number
  discount?: number
  notes?: string
}

export interface CreatePurchaseOrderPayload {
  organizationId: string
  supplierId: string
  locationId: string
  date: string
  expectedDeliveryDate: string
  paymentTerms?: string
  notes?: string
  shippingCost?: number
  createdBy?: string
  orderLines: OrderLineInput[]
}

export interface UpdatePurchaseOrderDTO {
  id: string
  organizationId: string
  supplierId?: string
  locationId?: string
  date?: string
  expectedDeliveryDate?: string
  paymentTerms?: string
  notes?: string
  shippingCost?: number
  orderLines?: OrderLineInput[]
}

// export interface PurchaseOrderFilters {
//   organizationId: string
//   page?: number
//   limit?: number
//   search?: string
//   status?: PurchaseOrderStatus | PurchaseOrderStatus[]
//   supplierId?: string
//   locationId?: string
//   createdBy?: string
//   dateFrom?: string
//   dateTo?: string
//   expectedDeliveryFrom?: string
//   expectedDeliveryTo?: string
//   minTotal?: number
//   maxTotal?: number
//   sortBy?: "createdAt" | "orderDate" | "expectedDeliveryDate" | "status" | "total" | "orderNumber"
//   sortOrder?: "asc" | "desc"
// }

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  pageStart: number
}

export interface PurchaseOrderWithRelations {
  id: string
  orderNumber: string
  status: PurchaseOrderStatus
  orderDate: string | Date
  expectedDeliveryDate?: string | Date | null
  paymentTerms?: string | null
  notes?: string | null
  subtotal: number
  taxAmount: number
  shippingCost: number
  discount: number
  total: number
  supplier?: any
  location?: any
  locationId?: string | undefined
  organization?: any
  createdBy?: any
  approvedBy?: any
  lines: Array<{
    id: string
    itemId: string
    orderedQuantity: number
    receivedQuantity: number
    unitCost: number
    discount: number
    taxRate: number
    taxAmount: number
    lineTotal: number
    notes?: string | null
    item?: any
  }>
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface PaginatedPurchaseOrdersResponse {
  data: PurchaseOrderWithRelations[]
  pagination: Pagination
  filters: PurchaseOrderFilters
}

export interface PurchaseOrderResponse<T> {
  success: boolean
  error?: string | null
  message?: string
  data: T
}

export interface GoodsReceiptItemInput {
  lineId: string
  receivedQuantity: number
  unitPrice?: number
  notes?: string
  serialNumbers?: string[] // Parsed from comma-separated input in the client
  batchNumber?: string
  expiryDate?: string | number | undefined // ISO date string (YYYY-MM-DD)
}
export interface GoodsReceiptPayload {
  id: string // Purchase Order ID
  organizationId: string
  receivedBy: string // User ID
  locationId?: string
  notes?: string
  items: GoodsReceiptItemInput[]
}

export type PurchaseOrderFilters = {
  organizationId: string
  page?: number
  limit?: number
  search?: string
  status?: PurchaseOrderStatus
  supplierId?: string
  locationId?: string
  createdBy?: string
  dateFrom?: string
  dateTo?: string
  expectedDeliveryFrom?: string
  expectedDeliveryTo?: string
  minTotal?: number
  maxTotal?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

// Client mirrors server filters for this preview
export type { PurchaseOrderFilters as ClientPurchaseOrderFilters }


/**
 * Custom hook that debounces a value by delaying updates until after a specified delay
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
