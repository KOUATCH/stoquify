export interface SupplierInput {
  organizationId: string
  name: string
  code?: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  taxId?: string
  paymentTerms?: number
  creditLimit?: number
  notes?: string
  isActive?: boolean
}

export interface SupplierDTO extends SupplierInput {
  id: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface SupplierFilters {
  organizationId: string
  page?: number
  limit?: number
  search?: string
  active?: boolean
  sortBy?: "name" | "createdAt" | "updatedAt" | "code"
  sortOrder?: "asc" | "desc"
}

export interface PaginatedSuppliersResponse {
  data: SupplierDTO[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
    pageStart: number
  }
  filters: SupplierFilters
}

export interface ItemSupplierLink {
  id: string
  itemId: string
  supplierId: string
  supplierSku?: string | null
  supplierName?: string | null
  isPreferred: boolean
  leadTimeDays?: number | null
  minOrderQuantity?: number | null
  unitCost?: number | null
  lastPurchaseDate?: string | Date | null
  notes?: string | null
  item?: { id: string; name: string; sku?: string } | null
}

export type SupplierItemStatsMap = Record<
  string,
  {
    avgUnitCost: number | null
    lastOrderDate: Date | null
  }
>

export type RecentPOItem = {
  itemId: string
  name: string
  sku?: string
  lastOrderDate: Date | null
  avgUnitCost: number | null
}
export interface CreatePurchaseOrderPayload {
  supplierId: string
  locationId: string
  organizationId: string
  date: string
  expectedDeliveryDate: string
  createdBy?: string
  paymentTerms?: string
  notes?: string
  shippingCost?: number
  orderLines: OrderLineInput[]
}

export interface OrderLineInput {
  itemId: string
  quantity: number
  unitPrice: number
  taxRate?: number
  discount?: number
  notes?: string
}

export interface PurchaseOrderResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PurchaseOrderWithRelations {
  id: string
  orderNumber: string
  status: string
  orderDate: Date
  expectedDeliveryDate?: Date
  paymentTerms?: string
  notes?: string
  subtotal: number
  taxAmount: number
  shippingCost: number
  discount: number
  total: number
  supplier: any
  location: any
  organization: any
  createdBy?: any
  approvedBy?: any
  lines: any[]
  createdAt: Date
  updatedAt: Date
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
