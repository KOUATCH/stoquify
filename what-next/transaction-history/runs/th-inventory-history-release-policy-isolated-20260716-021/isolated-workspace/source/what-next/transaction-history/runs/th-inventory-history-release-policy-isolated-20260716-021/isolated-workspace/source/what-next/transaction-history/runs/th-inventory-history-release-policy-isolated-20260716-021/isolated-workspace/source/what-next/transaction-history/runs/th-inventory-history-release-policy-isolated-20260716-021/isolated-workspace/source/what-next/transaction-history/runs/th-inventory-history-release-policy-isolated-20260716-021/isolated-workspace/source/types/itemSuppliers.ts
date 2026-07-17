

export interface Pagination {
  // Suppliers: BriefSupplierDTO[];
  totalCount: string | null | undefined;
  page: string | null | undefined;
  limit: string | null | undefined;
  pages: string | null | undefined;
}

export interface PaginatedResponse<T> {
  pagination: Pagination;
  data: T[];

}
export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};
export type ItemSupplierResponse = ApiResponse<ItemSupplierDTO[]>;
// export type ItemsSuppliersResponses = ApiResponse<ItemSupplier[]>;


// Type for the response from the server action
export type UpdateItemSupplierResponse = {
  success: boolean
  data?: any
  error?: string | null
}

// Type for the actual database update (excluding identification fields)
export type ItemSupplierUpdateData = {
  isPreferred?: boolean
  supplierSku?: string | null
  leadTime?: number | null
  minOrderQty?: number | null
  unitCost?: number | null
  lastPurchaseDate?: Date | null
  notes?: string | null
}

export interface BriefItemSupplierDTO {
  id: string
  itemId: string
  supplierId: string
  isPreferred: boolean
  supplierSku: string | null
  unitCost?: number
  supplier?: {
    name: string
  }
  item?: {
    name: string
    sku: string
  }
}

export interface CreateItemSupplierDTO {
  itemId: string
  supplierId: string
  organizationId?: string
  isPreferred?: boolean
  supplierSku?: string | null
  leadTime?: number
  minOrderQty?: number
  unitCost?: number
  lastPurchaseDate?: Date
  notes?: string | null
}

export interface UpdateItemSupplierDTO {
  updatedAt: Date;
  createdAt: Date;
  id: string
  itemId: string
  supplierId: string
  isPreferred?: boolean
  supplierSku?: string | null
  leadTime?: number
  minOrderQty?: number
  unitCost?: number
  lastPurchaseDate?: Date
  notes?: string | null
}

export interface ItemSupplierUpdateResponse {
  success: boolean
  data?: ItemSupplierDTO
  error?: string | null
}

// Type definitions for ItemSupplier operations
export interface ItemSupplierDTO {
  id: string
  itemId: string
  supplierId: string
  isPreferred: boolean
  supplierSku: string | null
  leadTime?: number
  minOrderQty?: number
  unitCost?: number
  lastPurchaseDate?: Date
  notes: string | null
  createdAt: Date
  updatedAt: Date
  supplier?: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  item?: {
    id: string
    name: string
    sku: string
  }
}

export interface BriefItemSupplierDTO {
  id: string
  itemId: string
  supplierId: string
  isPreferred: boolean
  supplierSku: string | null
  unitCost?: number
  supplier?: {
    name: string
  }
  item?: {
    name: string
    sku: string
  }
}

export interface CreateItemSupplierDTO {
  itemId: string
  supplierId: string
  organizationId?: string
  isPreferred?: boolean
  supplierSku?: string | null
  leadTime?: number
  minOrderQty?: number
  unitCost?: number
  lastPurchaseDate?: Date
  notes?: string | null
}

export interface UpdateItemSupplierDTO {
  id: string
  itemId: string
  supplierId: string
  isPreferred?: boolean
  supplierSku?: string | null
  leadTime?: number
  minOrderQty?: number
  unitCost?: number
  lastPurchaseDate?: Date
  notes?: string | null
}
export interface ItemSupplierUpdateResponse {
  success: boolean
  data?: ItemSupplierDTO
  error?: string | null
}