import { z } from "zod"
import { purchaseApprovalRequestSchema } from "./purchase-order-approval-contracts"

const id = z.string().trim().min(1).max(191)
export const purchaseAmendmentQuerySchema = z.object({ orderId: id, proposalId: id }).strict()
export const purchaseAmendmentCommandSchema = purchaseAmendmentQuerySchema.merge(purchaseApprovalRequestSchema)
export type PurchaseAmendmentCommand = z.infer<typeof purchaseAmendmentCommandSchema>
export const purchaseAmendmentReceiptSchema = z.object({
  requestReference: z.string().min(8).max(128), orderId: id, proposalId: id,
  reviewedRevision: z.string().regex(/^[a-f0-9]{64}$/), approvedById: id, approvedAt: z.string().datetime(),
  acceptedById: id, proposalStateHash: z.string().regex(/^[a-f0-9]{64}$/), total: z.string(), status: z.enum(["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"]),
}).strict()
export type PurchaseAmendmentReceipt = z.infer<typeof purchaseAmendmentReceiptSchema> & { replayed: boolean }
export type PurchaseAmendmentPreview = {
  organizationId: string; actorId: string; orderId: string; orderNumber: string; proposalId: string;
  revision: string; supplier: string; currency: string; acceptedById: string; acceptedAt: string; reason: string;
  beforeDate: string | null; afterDate: string | null; beforeTotal: string; afterTotal: string;
  requiresFreshAuth: boolean; receipt: PurchaseAmendmentReceipt | null;
  lines: Array<{ id: string; nameEn: string; nameFr: string; beforeQuantity: string; afterQuantity: string; receivedQuantity: string; unitCost: string; beforeTotal: string; afterTotal: string }>;
}
