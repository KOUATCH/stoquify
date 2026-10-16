import { z } from "zod"
import { boundedArray, MAX_AP_BATCH_ENTRIES } from "@/lib/validation/bounded-array"
const id = z.string().trim().min(1).max(191)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const d = new Date(value + "T00:00:00Z"); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value }, "Invalid calendar date")
const amount = z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/).refine(value => Number(value) > 0)
export const paymentRequestDraftSchema = z.object({
  supplierId: id, bankAccountId: id, method: z.enum(["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CREDIT", "STORE_CREDIT", "CHEQUE", "MIXED"]), paymentDate: date,
  documentReference: z.string().trim().max(1000).url().refine(value => /^https?:\/\//i.test(value)), documentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  notes: z.string().trim().max(1000).optional(), allocations: boundedArray(z.array(z.object({ supplierInvoiceId: id, amount }).strict()).min(1).max(100), MAX_AP_BATCH_ENTRIES),
}).strict().refine(value => new Set(value.allocations.map(row => row.supplierInvoiceId)).size === value.allocations.length, "Duplicate invoice allocations")
export const paymentRequestCommandSchema = z.object({ draft: paymentRequestDraftSchema, expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), idempotencyKey: z.string().min(8).max(128) }).strict()
export const paymentRequestApprovalSchema = z.object({ paymentRequestId: id, expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), idempotencyKey: z.string().min(8).max(128) }).strict()
export const paymentRequestScopeSchema = z.object({ organizationId: id, actorId: id, sessionId: id, sessionToken: z.string().min(1) }).strict()
export type PaymentRequestDraft = z.infer<typeof paymentRequestDraftSchema>
export type PaymentRequestCommand = z.infer<typeof paymentRequestCommandSchema>
export type PaymentRequestApproval = z.infer<typeof paymentRequestApprovalSchema>
export type PaymentRequestScope = z.infer<typeof paymentRequestScopeSchema>
export type PaymentRequestPreview = { organizationId: string; actorId: string; draft: PaymentRequestDraft; revision: string; total: string; currency: string; supplierName: string; bankLabel: string; checkedAt: string; fresh: boolean; invoices: Array<{ id: string; number: string; available: string; amount: string }> }
export const paymentWorkspaceKindSchema = z.enum(["request", "approve"])
export const paymentSourcesQuerySchema = z.object({ supplierId: id.optional(), search: z.string().trim().max(120).default(""), supplierAfter: id.optional(), invoiceAfter: id.optional(), bankAfter: id.optional() }).strict()
export const paymentQueueQuerySchema = z.object({ search: z.string().trim().max(120).default(""), after: id.optional(), status: z.enum(["DRAFT", "ALL"]).default("DRAFT") }).strict()
export type PaymentSourcesQuery = z.input<typeof paymentSourcesQuerySchema>
export type PaymentQueueQuery = z.input<typeof paymentQueueQuerySchema>
