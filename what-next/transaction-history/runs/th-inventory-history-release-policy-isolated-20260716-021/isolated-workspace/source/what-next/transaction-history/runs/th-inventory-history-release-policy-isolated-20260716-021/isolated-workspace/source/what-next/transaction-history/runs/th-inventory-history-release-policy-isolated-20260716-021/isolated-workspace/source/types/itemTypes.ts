  import { ItemSupplier } from "@prisma/client";

export interface BriefItemData {
  data: BriefItemDTO[];
  pagination: Pagination;
}

export interface Pagination {
  // items: BriefItemDTO[];
  totalCount: number;
  page: number;
  limit: number;
  pages: number;
}


export interface PaginatedResponse<T> {
  pagination: Pagination;
  data: T[];

}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string | null | undefined;
}

// export type BriefItemResponse= ApiResponse<BriefItemData[]>;
export type BriefItemResponse = ApiResponse<BriefItemPayload[]>;
export type ItemResponse = ApiResponse<ItemPayload[]>;
export type CompleteItemResponse = ApiResponse<ItemDTO[]>;
export type SupplierItemResponse = ApiResponse<ItemWithSupplierDTO[]>;

export type ItemCreateDTO = {
  id?: string;
  createdAt?: Date | string;
  nameEn: string;
  nameFr?: string | null;
  slug?: string;
  costPrice: number;
  sellingPrice: number
  imageUrls?: string;
  thumbnail?: string | null;
  sku: string;
  organizationId: string;
  descriptionEn?: string | null;
  descriptionFr?: string | null;
}
// types/item.ts
export interface Item {
  id: string;
  name: string;
  sku: string;
  slug: string;
  costPrice: number;
  sellingPrice: number;
  thumbnail: string | null;
  imageUrls: string;
  organizationId: string;
  salesCount: number;
  salesTotal: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type ItemPayload = {
  description: any;
  id: string;
  name: string;
  slug: string;
  costPrice: number;
  sellingPrice: number;
  createdAt: Date;
  imageUrls: string;
  thumbnail: string | null;
  organizationId: string;
  sku: string;

}
// Fixed type definition
export type ItemWithInventoryLevelsPayload = {
  id: string;
  nameEn: string;
  nameFr?: string | null;
  descriptionEn?: string | null;
  descriptionFr?: string | null;
  name?: string;
  description?: string | null;
  slug: string;
  costPrice: number;
  sellingPrice: number;
  createdAt: Date;
  imageUrls: string;
  thumbnail: string | null;
  organizationId: string;
  minStockLevel: number;
  maxStockLevel?: number | null;
  reorderLevel?: number;
  reorderQuantity?: number | null;
  reorderPoint?: number;
  isActive: boolean;
  isDiscontinued: boolean;
  // averageCost: number;
  updatedAt: Date;
  brand: {
    id: string,
    brandName: string
  } | null
  category: {
    id: string,
    title: string
  } | null
  sku: string;
  categoryId?: string | null | undefined;
  inventoryLevels: {  // Changed from inventoryLevels? to inventoryLevels (removed optional)
    id: string;
    quantityOnHand: number;
    quantityReserved: number;
    quantityAvailable: number;
    quantityInTransit: number;
    quantityOnOrder: number;
    reorderPoint: number;
    totalValue: number;
  }[];  // Made it an array with []
};
export type ItemWithSupplierDTO = {
  id: string;
  name: string;
  slug: string;
  itemId: string;
  supplierId: string;
  isPreferred: boolean,
  supplierSku: string,
  notes: string,
  updatedAt: Date,
  costPrice: number;
  sellingPrice: number;
  createdAt: Date;
  imageUrls: string;
  thumbnail: string | null;
  organizationId: string;
  sku: string;
  supplierItems: ItemSupplier
};

export type UpdateItemPayload = {
  id?: string | undefined | null;
  nameEn: string | undefined | null;
  nameFr?: string | undefined | null;
  descriptionEn?: string | undefined | null;
  descriptionFr?: string | undefined | null;
  slug: string;
  costPrice: number;
  sellingPrice: number;
  createdAt: Date | null;
  thumbnail: string | null;
  organizationId: string;
  imageUrls: string;
  sku: string;
};

export type UpdateItemBasicInfoPayload = {
  organizationId: any;
  id: string;
  nameEn?: string;
  nameFr?: string | undefined;
  imageUrls?: string | string[] | undefined;
  thumbnail?: string | undefined;
  descriptionEn?: string | undefined;
  descriptionFr?: string | undefined;
};

export type UpdateItemStockPayload = {
  organizationId: any;
  id: string | null;
  minStockLevel: number;
  unitOfMeasure?: string | undefined;
  maxStockLevel?: number | undefined;
};

export type UpdateItemPricingPayload = {
  organizationId: any;

  id: string | null;
  costPrice: number;
  sellingPrice: number;
  tax?: number | undefined;
};

export type UpdateItemRelationsPayload = {
  organizationId: any;
  id: string;
  categoryId: string;
  brandId?: string | undefined;
  taxRateId?: string | undefined;
  unitId?: string | undefined;
};

export type UpdateItemDetailsPayload = {
  organizationId: any;
  id: string | null;
  sku: string;
  barcode?: string | undefined;
  dimensions?: string | undefined;
  weight?: number | undefined;
};

export type ItemApiResponse = {
  success: boolean;
  data?: any;
  error?: string | null;
};

export type ItemDTO = {
  id: string;
  nameEn: string | null;
  nameFr?: string | null;
  sku: string | null;
  barcode: string | null;
  descriptionEn: string | null;
  descriptionFr?: string | null;
  dimensions: string | null;
  upc: string | null;
  ean: string | null;
  slug: string | null;
  mpn: string | null;
  isbn: string | null;
  thumbnail: string | null | undefined;
  organizationId: string | null;
  categoryId: string | null;
  taxRateId: string | null;
  brandId: string | null;
  unitId: string | null;
  costPrice: number;
  weight: number | null;
  sellingPrice: number;
  createdAt: Date;
  updatedAt: Date;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  isActive: boolean | null;
  imageUrls: string;
  // Helper for backwards compatibility
  name?: string; // computed from nameEn
  description?: string; // computed from descriptionEn
};

export type ItemDTOLine = {
  id: string;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  dimensions: string | null;
  upc: string | null;
  ean: string | null;
  slug: string | null;
  mpn: string | null;
  isbn: string | null;
  // standard: string;
  thumbnail: string | null;
  organizationId: string | null;
  categoryId: string | null;
  taxRateId: string | null;
  brandId: string | null;
  unitId: string | null;
  unitOfMeasure: string | null;
  costPrice: number;
  weight: number | null;
  sellingPrice: number;
  salesCount: number;
  salesTotal: number;
  tax: number | null;
  createdAt: Date;
  updatedAt: Date;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  isActive: boolean | null;
  isSerialTracked: boolean | null;
  imageUrls: string;
  purchaseOrderLines: {
    taxRate: number,
    unit: string,
    item: Item

  }

};

export type BriefItemDTO = {
  id: string;
  name: string;
  slug: string;
  costPrice: number;
  sellingPrice: number;
  createdAt: Date;
  thumbnail: string | null;
  imageUrls: string;

  organizationId: string;
  sku: string;
};

export type BriefItemPayload = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  salesCount: number;
  salesTotal: number;
  organizationId: string;
  createdAt: Date;
  thumbnail: string | null;
  imageUrls: string;
  isActive: boolean;
  isSerialTracked: boolean;
};


// Mutation context and data types
export interface MutationContext<T> {
  previousItemDetail?: T | undefined
  previousItemsList?: T[] | undefined
}

export interface UpdateModelData<T> {
  id: string
  data: T
}
