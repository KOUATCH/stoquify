import { z } from "zod"

export const invoiceLedgerRecoveryQuerySchema = z.object({ search: z.string().trim().max(120).default(""), after: z.string().min(1).max(160).optional() }).strict()
export const invoiceLedgerRecoveryDraftSchema = z.object({ invoiceId: z.string().min(1).max(160) }).strict()
export const invoiceLedgerRecoveryHistoryQuerySchema = invoiceLedgerRecoveryDraftSchema.extend({ before: z.string().min(1).max(160).optional() }).strict()
export const invoiceLedgerRecoveryCommandSchema = invoiceLedgerRecoveryDraftSchema.extend({ expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), idempotencyKey: z.string().min(8).max(128) }).strict()
export const invoiceLedgerRecoveryDecisionSchema = z.object({
  organizationId: z.string().min(1), actorId: z.string().min(1), invoiceId: z.string().min(1), invoiceNumber: z.string().min(1),
  requestReference: z.string().min(8).max(128), reviewedRevision: z.string().regex(/^[a-f0-9]{64}$/), recordedAt: z.string().datetime(),
  approvalEventId: z.string().min(1), supplierLiabilityId: z.string().min(1), postingBatchId: z.string().min(1),
  ledgerStatus: z.enum(["POSTED", "BLOCKED_PENDING_RULES"]), journalEntryId: z.string().nullable(), accountingSourceLinkId: z.string().nullable(),
  blockerCode: z.string().nullable(), total: z.string().regex(/^\d+\.\d{2}$/), currency: z.string().regex(/^[A-Z]{3}$/),
}).strict().superRefine((value, context) => {
  if (value.ledgerStatus === "POSTED" ? (!value.journalEntryId || !value.accountingSourceLinkId || value.blockerCode !== null) : (value.journalEntryId !== null || value.accountingSourceLinkId !== null || !value.blockerCode)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Posting status and retained evidence disagree." })
})
export type InvoiceLedgerRecoveryQuery = z.input<typeof invoiceLedgerRecoveryQuerySchema>
export type InvoiceLedgerRecoveryDraft = z.infer<typeof invoiceLedgerRecoveryDraftSchema>
export type InvoiceLedgerRecoveryHistoryQuery = z.infer<typeof invoiceLedgerRecoveryHistoryQuerySchema>
export type InvoiceLedgerRecoveryCommand = z.infer<typeof invoiceLedgerRecoveryCommandSchema>
export type InvoiceLedgerRecoveryDecision = z.infer<typeof invoiceLedgerRecoveryDecisionSchema>
export type InvoiceLedgerRecoveryBlocker = "ALREADY_POSTED" | "BATCH_REVIEW" | "COUNTRY_SETUP" | "PERIOD_UNAVAILABLE" | "RULE_UNAVAILABLE" | "JOURNAL_UNAVAILABLE"
export type InvoiceLedgerRecoveryPreview = {
  organizationId: string; actorId: string; invoiceId: string; invoiceNumber: string; supplierName: string;
  total: string; currency: string; invoiceDate: string; approvalAt: string; approvalEventId: string; supplierLiabilityId: string;
  periodName: string | null; ruleCode: string | null; journalCode: string | null; countryPackVersion: string | null;
  blockers: InvoiceLedgerRecoveryBlocker[]; requiresFreshAuth: boolean; revision: string; checkedAt: string;
}
