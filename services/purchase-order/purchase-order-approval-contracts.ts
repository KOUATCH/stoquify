import { z } from "zod"

export const purchaseApprovalRequestSchema = z.object({
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().min(8).max(128).regex(/^[A-Za-z0-9:_-]+$/),
}).strict()
export type PurchaseApprovalRequest = z.infer<typeof purchaseApprovalRequestSchema>
export const purchaseApprovalReceiptSchema = z.object({
  requestReference: z.string().min(8).max(128), orderId: z.string().min(1),
  reviewedRevision: z.string().regex(/^[a-f0-9]{64}$/), approvedById: z.string().min(1),
  approvedAt: z.string().datetime(),
}).strict()
export type PurchaseApprovalReceipt = z.infer<typeof purchaseApprovalReceiptSchema> & { replayed: boolean }
export type PurchaseApprovalPreview = {
  organizationId: string; actorId: string; orderId: string; orderNumber: string; revision: string;
  requester: string; supplier: string; location: string; currency: string; total: string;
  orderDate: string; expectedDeliveryDate: string | null; paymentTerms: string | null; notes: string | null;
  shippingCost: string; taxAmount: string; discount: string; requiresFreshAuth: boolean;
  lines: Array<{ id: string; nameEn: string; nameFr: string; quantity: string; unitCost: string; total: string; taxRate: string; discount: string; notes: string | null }>;
}
