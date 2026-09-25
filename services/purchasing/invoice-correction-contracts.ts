import { z } from "zod"
import { invoicePreparationDraftSchema } from "./invoice-preparation-contracts"

const id = z.string().min(1).max(191)
export const invoiceCorrectionDraftSchema = z.object({ invoiceId: id, reason: z.string().trim().min(8).max(1000), preparation: invoicePreparationDraftSchema }).strict()
export const invoiceCorrectionCommandSchema = z.object({ draft: invoiceCorrectionDraftSchema, expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), idempotencyKey: z.string().min(8).max(128) }).strict()
export const invoiceCorrectionQuerySchema = z.object({ search: z.string().trim().max(120).default(""), after: id.optional() }).strict()
export const invoiceCorrectionHistorySchema = z.object({ invoiceId: id, before: id.optional() }).strict()
export const invoiceCorrectionSourceSchema = z.object({ invoiceId: id, receiptAfter: id.optional() }).strict()
export type InvoiceCorrectionSourceQuery = z.infer<typeof invoiceCorrectionSourceSchema>
export type InvoiceCorrectionDraft = z.infer<typeof invoiceCorrectionDraftSchema>
export type InvoiceCorrectionCommand = z.infer<typeof invoiceCorrectionCommandSchema>
export type InvoiceCorrectionQuery = z.input<typeof invoiceCorrectionQuerySchema>
export type InvoiceCorrectionHistory = z.infer<typeof invoiceCorrectionHistorySchema>
