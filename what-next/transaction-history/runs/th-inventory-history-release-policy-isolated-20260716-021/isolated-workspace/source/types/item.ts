// Bilingual Item Types
export interface ItemCreateDTO {
  id?: string;
  createdAt?: Date | string;
  nameEn: string;
  nameFr?: string | null;
  slug?: string;
  costPrice: number;
  sellingPrice: number;
  imageUrls?: string;
  thumbnail?: string | null;
  sku: string;
  organizationId: string;
  quantity?: number;
  descriptionEn?: string | null;
  descriptionFr?: string | null;
}

// Add interfaces for inventory management
export interface InventoryLevel {
  id: string;
  itemId: string;
  organizationId: string;
  locationId?: string;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  organizationId: string;
  type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
  quantity: number;
  runningBalance: number;
  reference?: string;
  createdAt: Date;
}
