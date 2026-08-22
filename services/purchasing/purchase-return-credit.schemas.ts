import { z } from "zod"

const id = z.string().trim().min(1)
const idempotencyKey = z.string().trim().min(8).max(191)
const quantity = z.union([z.string().trim().min(1), z.number()])
const requiredDate = z.union([z.date(), z.string().trim().min(1)])
const optionalDate = requiredDate.optional()

export const postPurchaseReturnInputSchema = z.object({
  organizationId: id,
  purchaseOrderId: id,
  goodsReceiptId: id,
  postedById: id,
  idempotencyKey,
  reason: z.string().trim().min(3).max(500),
  occurredAt: optionalDate,
  documentHash: z.string().trim().min(8).max(71).optional(),
  evidenceHash: z.string().trim().min(8).max(71).optional(),
  lines: z.array(z.object({
    sourceGoodsReceiptLineId: id,
    quantity,
  })).min(1),
})

export const reversePurchaseReturnInputSchema = z.object({
  organizationId: id,
  purchaseReturnId: id,
  postedById: id,
  idempotencyKey,
  reason: z.string().trim().min(3).max(500),
  occurredAt: optionalDate,
  documentHash: z.string().trim().min(8).max(71).optional(),
  evidenceHash: z.string().trim().min(8).max(71).optional(),
})

export const postSupplierCreditNoteInputSchema = z.object({
  organizationId: id,
  purchaseReturnId: id,
  supplierInvoiceId: id,
  postedById: id,
  idempotencyKey,
  creditNoteNumber: z.string().trim().min(1).max(80),
  creditDate: requiredDate,
  documentHash: z.string().trim().min(8).max(71),
  evidenceHash: z.string().trim().min(8).max(71).optional(),
  reason: z.string().trim().min(3).max(500),
  lines: z.array(z.object({
    sourcePurchaseReturnLineId: id,
    sourceSupplierInvoiceLineId: id,
  })).min(1),
})

export const reverseSupplierCreditNoteInputSchema = z.object({
  organizationId: id,
  supplierCreditNoteId: id,
  postedById: id,
  idempotencyKey,
  creditNoteNumber: z.string().trim().min(1).max(80),
  creditDate: requiredDate,
  documentHash: z.string().trim().min(8).max(71),
  evidenceHash: z.string().trim().min(8).max(71).optional(),
  reason: z.string().trim().min(3).max(500),
})

export type PostPurchaseReturnInput = z.input<typeof postPurchaseReturnInputSchema>
export type ReversePurchaseReturnInput = z.input<typeof reversePurchaseReturnInputSchema>
export type PostSupplierCreditNoteInput = z.input<typeof postSupplierCreditNoteInputSchema>
export type ReverseSupplierCreditNoteInput = z.input<typeof reverseSupplierCreditNoteInputSchema>
