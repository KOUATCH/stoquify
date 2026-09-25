import { z } from "zod"
import { purchaseApprovalRequestSchema } from "./purchase-order-approval-contracts"

export const purchaseLifecycleKindSchema = z.enum(["submit", "cancel", "complete", "archive"])
export type PurchaseLifecycleKind = z.infer<typeof purchaseLifecycleKindSchema>
export const purchaseLifecycleRequestSchema = purchaseApprovalRequestSchema.extend({
  kind: purchaseLifecycleKindSchema,
  reason: z.string().trim().max(2000).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.kind === "cancel" && !value.reason) ctx.addIssue({ code: "custom", path: ["reason"], message: "A cancellation reason is required." })
  if (value.kind !== "cancel" && value.reason !== undefined) ctx.addIssue({ code: "custom", path: ["reason"], message: "A reason belongs only to cancellation." })
})
export type PurchaseLifecycleRequest = z.infer<typeof purchaseLifecycleRequestSchema>
export const purchaseLifecycleReceiptSchema = z.object({
  requestReference: z.string().min(8).max(128), orderId: z.string().min(1), kind: purchaseLifecycleKindSchema,
  reviewedRevision: z.string().regex(/^[a-f0-9]{64}$/), actorId: z.string().min(1), recordedAt: z.string().datetime(),
  fromStatus: z.string().min(1), toStatus: z.string().min(1), archived: z.boolean(),
}).strict()
export type PurchaseLifecycleReceipt = z.infer<typeof purchaseLifecycleReceiptSchema> & { replayed: boolean }
export type PurchaseLifecyclePreview = {
  organizationId: string; actorId: string; orderId: string; orderNumber: string; kind: PurchaseLifecycleKind; revision: string;
  status: string; supplier: string; location: string; currency: string; total: string; notes: string | null;
  requiresFreshAuth: boolean; linkedRecords: number; heldReceipts: number;
  lines: Array<{ id: string; nameEn: string; nameFr: string; ordered: string; received: string; total: string }>;
}

export const purchaseLifecyclePermission = (kind: PurchaseLifecycleKind) => kind === "archive" ? "purchases.delete" : kind === "cancel" ? "purchases.orders.cancel" : "purchases.orders.update"
export const purchaseLifecycleEventType = (kind: PurchaseLifecycleKind) => ({ submit: "purchase_order.submitted", cancel: "purchase_order.cancelled", complete: "purchase_order.completed", archive: "purchase_order.archived" })[kind]
