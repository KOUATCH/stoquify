import { ApiResponse, ItemDTO } from './itemTypes';

// Enums that match your Prisma schema exactly
export enum TransactionType {
  // Inbound transactions
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
  SALES_RETURN = 'SALES_RETURN',
  TRANSFER_IN = 'TRANSFER_IN',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  PRODUCTION_IN = 'PRODUCTION_IN',
  INITIAL_STOCK = 'INITIAL_STOCK',
  
  // Outbound transactions
  SALE = 'SALE',
  PURCHASE_RETURN = 'PURCHASE_RETURN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  PRODUCTION_OUT = 'PRODUCTION_OUT',
  DAMAGED = 'DAMAGED',
  EXPIRED = 'EXPIRED',
  THEFT = 'THEFT',
  WRITE_OFF = 'WRITE_OFF',
  SAMPLE = 'SAMPLE',
  PROMOTION = 'PROMOTION',
  
  // Reservations
  RESERVATION = 'RESERVATION',
  RESERVATION_RELEASE = 'RESERVATION_RELEASE'
}

export enum TransactionReferenceType {
  SALES_ORDER = 'SALES_ORDER',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  STOCK_TRANSFER = 'STOCK_TRANSFER',
  STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT',
  GOODS_RECEIPT = 'GOODS_RECEIPT',
  RETURN = 'RETURN',
  MANUAL = 'MANUAL'
}

export enum LocationType {
  WAREHOUSE = 'WAREHOUSE',
  STORE = 'STORE',
  DISTRIBUTION_CENTER = 'DISTRIBUTION_CENTER',
  SUPPLIER = 'SUPPLIER',
  CUSTOMER = 'CUSTOMER',
  MANUFACTURING = 'MANUFACTURING',
  QUARANTINE = 'QUARANTINE',
  DAMAGED = 'DAMAGED',
  TRANSIT = 'TRANSIT',
  VIRTUAL = 'VIRTUAL'
}

// Interfaces that match your Prisma models
export interface InventoryLevel {
  reorderPoint: number;
  id: string;
  itemId: string;
  locationId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityInTransit: number;
  quantityOnOrder: number;
  averageCost: number;
  totalValue: number;
  lastCountDate?: Date | null;
  lastTransactionAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  unitCost?: number;
  maxStockLevel?: number;
  
  item?: {
    id: string;
    name: string;
    sku: string;
    slug: string;
    imageUrls: string[];
    costPrice: number;
    sellingPrice: number;
    thumbnail?: string | null | undefined ;
  };
  location?: {
    id: string;
    name: string;
    code: string;
    type: LocationType;
  };
}

export interface InventoryTransaction {
  id: string;
  type: TransactionType;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string | null;
  itemId: string;
  locationId: string;
  organizationId: string;
  createdById?: string | null;
  referenceType?: TransactionReferenceType | null;
  referenceId?: string | null;
  referenceNumber?: string | null;
  batchNumber?: string | null;
  serialNumbers: string[];
  expiryDate?: Date | null;
  balanceAfter: number;
  createdAt: Date;
  item?: {
    name: string;
    sku: string;
  };
  location?: {
    name: string;
    code: string;
  };
  createdBy?: {
    name?: string | null;
  };
}

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  isDefault: boolean;
  organizationId: string;
  managerId?: string | null;
  allowNegativeStock: boolean;
  requiresApproval: boolean;
}

// Extended ItemCreateDTO to include inventory data
export interface ItemCreateWithInventoryDTO {
  nameEn: string;
  nameFr?: string | null;
  sku?: string;
  slug?: string;
  costPrice: number;
  sellingPrice: number;
  imageUrls?: string;
  thumbnail?: string | null;
  descriptionEn?: string | null;
  descriptionFr?: string | null;
  barcode?: string | null;
  
  // Initial inventory data
  locationId: string;
  initialQuantity?: number;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: Date;
  notes?: string;
}

export interface StockAdjustmentData {
  itemId: string;
  locationId: string;
  adjustmentQuantity: number;
  unitCost?: number;
  notes?: string;
  batchNumber?: string;
  expiryDate?: Date;
  referenceType?: TransactionReferenceType;
  referenceNumber?: string;
}

export interface CreateInventoryLevelData {
  itemId: string;
  locationId: string;
  quantityOnHand: number;
  quantityReserved?: number;
  quantityInTransit?: number;
  quantityOnOrder?: number;
  averageCost?: number;
  reorderPoint?: number;
}

export interface UpdateInventoryLevelData {
  quantityOnHand?: number;
  quantityReserved?: number;
  quantityInTransit?: number;
  quantityOnOrder?: number;
  averageCost?: number;
  reorderPoint?: number;
}

export interface ItemWithInventory extends ItemDTO {
  inventoryLevels: InventoryLevel[];
  totalQuantityOnHand: number;
  totalValue: number;
}

// API Response types using your existing pattern
export type InventoryLevelResponse = ApiResponse<InventoryLevel[]>;
export type InventoryTransactionResponse = ApiResponse<InventoryTransaction[]>;
export type ItemWithInventoryResponse = ApiResponse<ItemWithInventory[]>;
export type LocationResponse = ApiResponse<Location[]>;
export type StockAdjustmentResponse = ApiResponse<{
  inventoryLevel: InventoryLevel;
  transaction: InventoryTransaction;
}[]>;
