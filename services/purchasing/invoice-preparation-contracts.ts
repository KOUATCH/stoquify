import { z } from "zod"
import { boundedArray, MAX_AP_BATCH_ENTRIES } from "@/lib/validation/bounded-array"

const id = z.string().trim().min(1).max(191)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + "T00:00:00Z")
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, "Invalid calendar date")
const decimal = (places: number) => z.string().trim().regex(new RegExp(`^(?:0|[1-9]\\d{0,9})(?:\\.\\d{1,${places}})?$`))
export const invoicePreparationDraftSchema = z.object({
  supplierId: id,
  invoiceNumber: z.string().trim().min(1).max(80),
  invoiceDate: date,
  dueDate: date.optional(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  documentReference: z.string().trim().max(1000).url().refine(value => /^https?:\/\//i.test(value), "Use a retained document link"),
  documentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  notes: z.string().trim().max(1000).optional(),
  lines: boundedArray(z.array(z.object({ goodsReceiptLineId: id, description: z.string().trim().min(1).max(240), quantity: decimal(3).refine(value => Number(value) > 0), unitCost: decimal(2), taxRate: decimal(3).refine(value => Number(value) <= 100) }).strict()).min(1).max(100), MAX_AP_BATCH_ENTRIES),
}).strict().refine(value => !value.dueDate || value.dueDate >= value.invoiceDate, { path: ["dueDate"], message: "Due date precedes invoice date" })
export const invoicePreparationCommandSchema = z.object({ draft: invoicePreparationDraftSchema, expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), idempotencyKey: z.string().min(8).max(128) }).strict()
export const invoicePreparationQuerySchema = z.object({ supplierSearch: z.string().trim().max(120).default(""), supplierAfter: id.optional(), supplierId: id.optional(), receiptAfter: id.optional() }).strict()
export const invoicePreparationDecisionSchema = z.object({
  organizationId: id, actorId: id, invoiceId: id, invoiceNumber: z.string(), recordedAt: z.string().datetime(), requestReference: z.string(), reviewedRevision: z.string(),
  preparationStatus: z.enum(["MATCHED", "DISPUTED"]), total: z.string(), currency: z.string(), documentReference: z.string(), documentSha256: z.string(),
}).strict()
export type InvoicePreparationDraft = z.infer<typeof invoicePreparationDraftSchema>
export type InvoicePreparationCommand = z.infer<typeof invoicePreparationCommandSchema>
export type InvoicePreparationQuery = z.input<typeof invoicePreparationQuerySchema>
export type InvoicePreparationDecision = z.infer<typeof invoicePreparationDecisionSchema>
// Transport observation is deliberately separate from immutable event evidence.
export type InvoicePreparationOutcome = InvoicePreparationDecision & {
  replayed: boolean; sourceEventId: string;
  currentPreparationState: "CURRENT" | "SUPERSEDED" | "UNVERIFIED";
  observedInvoiceStatus: "DRAFT" | "MATCHED" | "POSTED" | "PAYMENT_PENDING" | "PAID" | "CANCELLED" | "DISPUTED";
  observedTotal: string; observedAt: string; archived: boolean;
}
export type InvoicePreparationSources = {
  organizationId: string; actorId: string; currency: string; checkedAt: string;
  suppliers: Array<{ id: string; name: string }>; supplierNext: string | null;
  receipts: Array<{ id: string; receiptNumber: string; orderNumber: string; description: string; descriptionFr: string; available: string; unitCost: string }>; receiptNext: string | null;
}
export type InvoicePreparationPreview = {
  organizationId: string; actorId: string; draft: InvoicePreparationDraft; revision: string; checkedAt: string; supplierName: string;
  subtotal: string; tax: string; total: string; variance: string;
  lines: Array<{ id: string; available: string; quantity: string; total: string; variance: string }>;
}
