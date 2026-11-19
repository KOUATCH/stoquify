import { z } from "zod"

const id = z.string().trim().min(1).max(191)

export const purchaseReturnWorkbenchSourceQuerySchema = z.object({ purchaseOrderId: id, goodsReceiptId: id }).strict()

export const purchaseReturnWorkbenchCommandSchema = z.object({
  purchaseOrderId: id,
  goodsReceiptId: id,
  idempotencyKey: id.min(8),
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
  reason: z.string().trim().min(3).max(500),
  lines: z.array(z.object({
    sourceGoodsReceiptLineId: id,
    quantity: z.string().regex(/^\d{1,9}(?:\.\d{1,3})?$/).refine(value => Number(value) > 0),
  }).strict()).min(1).max(100),
}).strict()

export type PurchaseReturnWorkbenchCommand = z.infer<typeof purchaseReturnWorkbenchCommandSchema>

export type PurchaseReturnWorkbenchSource = {
  organizationId: string
  actorId: string
  purchaseOrderId: string
  goodsReceiptId: string
  receiptNumber: string
  location: string
  revision: string
  requiresFreshAuth: boolean
  lines: Array<{ id: string; nameEn: string; nameFr: string; available: string }>
}
