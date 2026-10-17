import { z } from "zod"
import { ReceiveItemsSchema, ResolveGoodsReceiptInspectionSchema } from "./purchase-order.schemas"

const id = z.string().min(1).max(191)
const receivingDraft = ReceiveItemsSchema.innerType().omit({ purchaseOrderId: true, organizationId: true, receivedById: true, idempotencyKey: true }).extend({ kind: z.literal("receive"), orderId: id }).strict()
const resolutionDraft = ResolveGoodsReceiptInspectionSchema.omit({ organizationId: true, resolvedById: true, idempotencyKey: true }).extend({ kind: z.literal("resolve"), orderId: id }).strict()
export const purchaseReceivingDraftSchema = z.discriminatedUnion("kind", [receivingDraft, resolutionDraft]).superRefine((draft, context) => {
  if (draft.kind !== "receive") return
  const { kind: _kind, orderId, ...selection } = draft
  const parsed = ReceiveItemsSchema.safeParse({ ...selection, purchaseOrderId: orderId, organizationId: "validation", receivedById: "validation", idempotencyKey: "validation-preview" })
  if (!parsed.success) for (const issue of parsed.error.issues) context.addIssue(issue)
})
export type PurchaseReceivingDraft = z.infer<typeof purchaseReceivingDraftSchema>
export const purchaseReceivingCommandSchema = z.object({ draft: purchaseReceivingDraftSchema, expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), idempotencyKey: z.string().min(8).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/) }).strict()
export type PurchaseReceivingCommand = z.infer<typeof purchaseReceivingCommandSchema>
export const purchaseReceivingDecisionSchema = z.object({ kind: z.enum(["receive", "resolve"]), orderId: id, goodsReceiptId: id, receiptNumber: z.string().min(1).max(191), requestReference: z.string().min(8).max(128), reviewedRevision: z.string().regex(/^[a-f0-9]{64}$/), actorId: id, recordedAt: z.string().datetime(), disposition: z.enum(["HELD", "RECEIVED", "REJECTED"]), quantity: z.string(), value: z.string(), currency: z.string().min(3).max(3), stockStatus: z.enum(["unavailable", "recorded", "unverified"]), accountingStatus: z.enum(["not_started", "not_required", "review_required", "posted", "unverified"]) }).strict()
export type PurchaseReceivingDecision = z.infer<typeof purchaseReceivingDecisionSchema>

export type PurchaseReceivingLine = { id: string; itemId: string; nameEn: string; nameFr: string; ordered: string; received: string; held: string; available: string; unitCost: string; trackBatches: boolean; trackSerialNumbers: boolean; trackExpiry: boolean; active: boolean }
export type PurchaseReceiptHistoryRow = { id: string; number: string; recordedAt: string; status: string; location: string; receiver: string; quantity: string; value: string; currency: string | null; inspection: { outcome: string; reason: string | null; evidenceNotes: string | null; inspector: string; inspectedById: string; at: string } | null; resolution: { decision: string; reason: string; resolver: string; at: string } | null; stockStatus: PurchaseReceivingDecision["stockStatus"]; accountingStatus: PurchaseReceivingDecision["accountingStatus"]; decision: PurchaseReceivingDecision | null; canAccept: boolean; canReject: boolean }
export type PurchaseReceivingWorkbench = { organizationId: string; actorId: string; orderId: string; orderNumber: string; orderStatus: string; supplier: string; currency: string; checkedAt: string; revision: string; locationId: string; location: string; canReceive: boolean; canReviewAccounting: boolean; lines: PurchaseReceivingLine[]; receipts: PurchaseReceiptHistoryRow[]; olderReceipts: boolean }
export type PurchaseReceivingPreview = { organizationId: string; actorId: string; orderId: string; orderNumber: string; currency: string; location: string; revision: string; draft: PurchaseReceivingDraft; quantity: string; value: string; disposition: "HELD" | "RECEIVED" | "REJECTED"; requiresFreshAuth: boolean; lines: Array<{ id: string; nameEn: string; nameFr: string; quantity: string; unitCost: string; value: string }>; checkedAt: string }
