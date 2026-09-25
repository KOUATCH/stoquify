import { z } from "zod"
import { purchaseLifecycleRequestSchema } from "./purchase-order-lifecycle-contracts"
import { purchaseQuantitySchema } from "./purchase-quantity"

export const PurchaseOrderStatusEnum = z.enum([
  "DRAFT", "SUBMITTED", "APPROVED",
  "PARTIALLY_RECEIVED", "RECEIVED", "COMPLETED", "CANCELLED",
])

export const OrderLineSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  quantity: purchaseQuantitySchema,
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
  updatedById: z.string().min(1).max(191),
  sessionId: z.string().min(1).max(191),
  sessionToken: z.string().min(1),
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/, "Review the current draft before saving"),
  idempotencyKey: z.string().min(8).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
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
  lineId: z.string().min(1, "Line ID is required").max(191),
  receivedQuantity: purchaseQuantitySchema,
  unitPrice: z.number().finite().nonnegative().max(9999999999.99).optional(),
  notes: z.string().max(2000).optional(),
  serialNumbers: z.array(z.string().trim().min(1).max(191)).max(5000).optional(),
  batchNumber: z.string().trim().max(191).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, "A valid expiry date is required").optional(),
}).strict()

export const GoodsReceiptInspectionOutcomeSchema = z.enum(["PASSED", "FAILED", "INCOMPLETE"])

export const GoodsReceiptInspectionResolutionDecisionSchema = z.enum(["ACCEPT", "REJECT"])

export const ReceiveItemsSchema = z.object({
  purchaseOrderId: z.string().min(1).max(191),
  organizationId: z.string().min(1).max(191),
  receivedById: z.string().min(1).max(191),
  idempotencyKey: z.string()
    .trim()
    .min(8, "Receipt idempotency key is required")
    .max(191)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, "Receipt idempotency key has an invalid format"),
  locationId: z.string().min(1).max(191).optional(),
  notes: z.string().max(2000).optional(),
  inspectionOutcome: GoodsReceiptInspectionOutcomeSchema,
  inspectionReason: z.string().trim().max(2000).optional(),
  inspectionEvidenceNotes: z.string().trim().max(4000).optional(),
  items: z.array(GoodsReceiptItemSchema).min(1, "At least one item must be received").max(200),
}).strict().superRefine((value, context) => {
  if (new Set(value.items.map(item => item.lineId)).size !== value.items.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Each purchase-order line may appear only once in a receipt" })
  if (value.inspectionOutcome !== "PASSED" && !value.inspectionReason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["inspectionReason"],
      message: "A reason is required when the inspection failed or is incomplete",
    })
  }
})

export const ResolveGoodsReceiptInspectionSchema = z.object({
  goodsReceiptId: z.string().min(1).max(191),
  organizationId: z.string().min(1).max(191),
  resolvedById: z.string().min(1).max(191),
  decision: GoodsReceiptInspectionResolutionDecisionSchema,
  reason: z.string().trim().min(1, "A resolution reason is required").max(2000),
  idempotencyKey: z.string()
    .trim()
    .min(8, "Resolution idempotency key is required")
    .max(191)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, "Resolution idempotency key has an invalid format"),
}).strict()

export const BulkStatusUpdateSchema = z.object({
  organizationId: z.string().min(1),
  purchaseOrderIds: z.array(z.string().min(1)).min(1, "No purchase orders specified"),
  toStatus: PurchaseOrderStatusEnum,
  reason: z.string().optional(),
  reviewedRequests: z.array(z.object({ id: z.string().min(1), request: purchaseLifecycleRequestSchema })).optional(),
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
export type ResolveGoodsReceiptInspectionInput = z.infer<typeof ResolveGoodsReceiptInspectionSchema>
export type BulkStatusUpdateInput = z.infer<typeof BulkStatusUpdateSchema>
export type ClonePurchaseOrderInput = z.infer<typeof ClonePurchaseOrderSchema>
export type POAnalyticsInput = z.infer<typeof POAnalyticsSchema>
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusEnum>
export type OrderLineInput = z.infer<typeof OrderLineSchema>
export type GoodsReceiptItemInput = z.infer<typeof GoodsReceiptItemSchema>
export type GoodsReceiptInspectionOutcome = z.infer<typeof GoodsReceiptInspectionOutcomeSchema>
export type GoodsReceiptInspectionResolutionDecision = z.infer<typeof GoodsReceiptInspectionResolutionDecisionSchema>
