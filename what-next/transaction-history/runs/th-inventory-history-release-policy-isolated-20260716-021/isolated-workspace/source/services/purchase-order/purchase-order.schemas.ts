import { z } from "zod"

export const PurchaseOrderStatusEnum = z.enum([
  "DRAFT", "SUBMITTED", "APPROVED",
  "PARTIALLY_RECEIVED", "RECEIVED", "COMPLETED", "CANCELLED",
])

export const OrderLineSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  unitPrice: z.number().nonnegative("Unit price must be non-negative"),
  taxRate: z.number().min(0).max(100, "Tax rate must be between 0 and 100").optional().default(0),
  discount: z.number().nonnegative("Discount cannot be negative").optional().default(0),
  notes: z.string().optional(),
})

export const CreatePurchaseOrderSchema = z.object({
  organizationId: z.string().min(1),
  createdById: z.string().min(1, "Creator is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  locationId: z.string().min(1, "Delivery location is required"),
  date: z.string().min(1, "Order date is required"),
  expectedDeliveryDate: z.string().min(1, "Expected delivery date is required"),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  shippingCost: z.number().nonnegative().optional().default(0),
  orderLines: z.array(OrderLineSchema).min(1, "At least one line item is required"),
})

export const UpdatePurchaseOrderSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  updatedById: z.string().optional(),
  supplierId: z.string().optional(),
  locationId: z.string().optional(),
  date: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  shippingCost: z.number().nonnegative().optional(),
  orderLines: z.array(OrderLineSchema).optional(),
})

export const GoodsReceiptItemSchema = z.object({
  lineId: z.string().min(1, "Line ID is required"),
  receivedQuantity: z.number().int().positive("Received quantity must be greater than 0"),
  unitPrice: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
})

export const ReceiveItemsSchema = z.object({
  purchaseOrderId: z.string().min(1),
  organizationId: z.string().min(1),
  receivedById: z.string().min(1),
  locationId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(GoodsReceiptItemSchema).min(1, "At least one item must be received"),
})

export const BulkStatusUpdateSchema = z.object({
  organizationId: z.string().min(1),
  purchaseOrderIds: z.array(z.string().min(1)).min(1, "No purchase orders specified"),
  toStatus: PurchaseOrderStatusEnum,
  reason: z.string().optional(),
})

export const ClonePurchaseOrderSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  overrides: z.object({
    supplierId: z.string().optional(),
    locationId: z.string().optional(),
    date: z.string().optional(),
    expectedDeliveryDate: z.string().optional(),
    notes: z.string().optional(),
    paymentTerms: z.string().optional(),
    shippingCost: z.number().nonnegative().optional(),
  }).optional(),
})

export const POAnalyticsSchema = z.object({
  organizationId: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
  topSuppliersLimit: z.number().int().positive().optional().default(5),
})

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderSchema>
export type ReceiveItemsInput = z.infer<typeof ReceiveItemsSchema>
export type BulkStatusUpdateInput = z.infer<typeof BulkStatusUpdateSchema>
export type ClonePurchaseOrderInput = z.infer<typeof ClonePurchaseOrderSchema>
export type POAnalyticsInput = z.infer<typeof POAnalyticsSchema>
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusEnum>
export type OrderLineInput = z.infer<typeof OrderLineSchema>
export type GoodsReceiptItemInput = z.infer<typeof GoodsReceiptItemSchema>
