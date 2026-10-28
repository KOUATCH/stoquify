export interface InventoryTransactionDTO {
  id: string
  createdAt: Date
  updatedAt: Date
  locationId?: string
  location?: {
    id: string
    name: string
    address?: string
    type: LocationType
  }
  itemId: string
  item: {
    id: string
    name: string
    sku: string
    description?: string
    costPrice: number
    sellingPrice: number
    trackSerialNumbers: boolean
    trackBatches: boolean
    trackExpiry: boolean
  }
  quantity: number
  reservedQuantity: number
  organizationId?: string
  type: TransactionType
  unitPrice: number
  totalValue: number
  reference?: string
  notes?: string
  transferId?: string
  orderId?: string
  purchaseOrderId?: string
  createdById?: string
  createdBy?: {
    id: string
    name?: string
    email?: string
  }
  batchNumber?: string
  serialNumbers: string[]
  expiryDate?: Date
  reservationReason?: string
  expiresAt?: Date
  releasedAt?: Date
}

export type TransactionType =
  // Inbound transactions
  | "INBOUND"
  | "PURCHASE_RECEIPT"
  | "RETURN_FROM_CUSTOMER"
  | "TRANSFER_IN"
  | "ADJUSTMENT_IN"
  | "PRODUCTION_IN"
  // Outbound transactions
  | "OUTBOUND"
  | "SALE"
  | "RETURN_TO_SUPPLIER"
  | "TRANSFER_OUT"
  | "ADJUSTMENT_OUT"
  | "PRODUCTION_OUT"
  | "DAMAGED"
  | "EXPIRED"
  | "THEFT"
  | "SHRINKAGE"
  // Reservation transactions
  | "RESERVED"
  | "UNRESERVED"
  // Special transactions
  | "CORRECTION"
  | "OPENING_BALANCE"
  | "CYCLE_COUNT"
  | "PHYSICAL_COUNT"

export type LocationType =
  | "WAREHOUSE"
  | "STORE"
  | "DISTRIBUTION_CENTER"
  | "SUPPLIER"
  | "CUSTOMER"
  | "MANUFACTURING"
  | "QUARANTINE"
  | "DAMAGED"

export interface LocationTransferDTO {
  id: string
  transferNumber: string
  date: Date
  fromLocationId: string
  fromLocation: {
    id: string
    name: string
    address?: string
    type: LocationType
  }
  toLocationId: string
  toLocation: {
    id: string
    name: string
    address?: string
    type: LocationType
  }
  status: TransferStatus
  priority: TransferPriority
  notes?: string
  internalNotes?: string
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
  requestedDate?: Date
  approvedDate?: Date
  shippedDate?: Date
  receivedDate?: Date
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
    costPrice: number
    trackSerialNumbers: boolean
    trackBatches: boolean
    trackExpiry: boolean
  }
  requestedQuantity: number
  approvedQuantity?: number
  shippedQuantity?: number
  receivedQuantity?: number
  unitCost?: number
  totalCost?: number
  notes?: string
  serialNumbers: string[]
  batchNumber?: string
  expiryDate?: Date
  status: TransferLineStatus
  createdAt: Date
  updatedAt: Date
}

export type TransferStatus = 
  | "DRAFT"
  | "SUBMITTED" 
  | "APPROVED"
  | "IN_TRANSIT"
  | "PARTIALLY_RECEIVED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"

export type TransferPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT"

export type TransferLineStatus = 
  | "PENDING"
  | "APPROVED"
  | "SHIPPED"
  | "RECEIVED"
  | "CANCELLED"
  | "BACKORDERED"

export interface CreateTransferPayload {
  fromLocationId: string
  toLocationId: string
  priority?: TransferPriority
  requestedDate?: Date
  notes?: string
  internalNotes?: string
  organizationId: string
  createdById: string
  lines: {
    itemId: string
    requestedQuantity: number
    notes?: string
    serialNumbers?: string[]
    batchNumber?: string
    expiryDate?: Date
  }[]
}

export interface InventoryReservationDTO {
  id: string
  itemId: string
  locationId: string
  reservedQuantity: number
  availableQuantity: number
  totalQuantity: number
  reservationReason: string
  expiresAt?: Date
  createdAt: Date
}

export interface StockMovementSummary {
  totalInbound: number
  totalOutbound: number
  totalTransfers: number
  totalAdjustments: number
  totalReservations: number
  netMovement: number
  valueChange: number
  transactionCount: number
}

export interface InventoryAvailability {
  itemId: string
  locationId: string
  totalQuantity: number
  reservedQuantity: number
  availableQuantity: number
  inTransitQuantity: number
  lastMovementDate?: Date
}
