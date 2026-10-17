import { z } from "zod"

const id = z.string().min(1).max(191)
export const receiptLedgerRecoveryDraftSchema = z.object({ orderId: id, receiptId: id }).strict()
export const receiptLedgerRecoveryCommandSchema = receiptLedgerRecoveryDraftSchema.extend({ expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), idempotencyKey: z.string().min(8).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/) }).strict()
const returnRecoveryIdentity = { returnId: id, effectiveAt: z.string().datetime(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/) }
const returnRecoveryOutcome = z.union([
  // Older retained decisions omitted the status and always included a journal.
  z.object({ ...returnRecoveryIdentity, ledgerStatus: z.literal("POSTED").optional(), postingBatchId: id, journalEntryId: id, accountingSourceLinkId: id }).strict(),
  z.object({ ...returnRecoveryIdentity, ledgerStatus: z.literal("NOT_REQUIRED"), postingBatchId: z.null(), journalEntryId: z.null(), accountingSourceLinkId: z.null() }).strict(),
])
export const receiptLedgerRecoveryDecisionSchema = z.object({
  organizationId: id, actorId: id, orderId: id, receiptId: id, receiptNumber: id,
  sourceEventId: id, sourceHash: z.string().regex(/^[a-f0-9]{64}$/), effectiveAt: z.string().datetime(),
  requestReference: z.string().min(8).max(128), reviewedRevision: z.string().regex(/^[a-f0-9]{64}$/), recordedAt: z.string().datetime(),
  postingBatchId: id, ledgerStatus: z.enum(["POSTED", "BLOCKED_PENDING_RULES"]),
  journalEntryId: id.nullable(), accountingSourceLinkId: id.nullable(), blockerCode: z.string().nullable(),
  returnOutcomes: z.array(returnRecoveryOutcome),
  value: z.string().regex(/^\d+\.\d{2}$/), currency: z.string().regex(/^[A-Z]{3}$/),
}).strict().superRefine((value, context) => {
  if (value.ledgerStatus === "POSTED" ? (!value.journalEntryId || !value.accountingSourceLinkId || value.blockerCode !== null) : (value.journalEntryId !== null || value.accountingSourceLinkId !== null || !value.blockerCode)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Posting status and retained evidence disagree." })
  if (value.ledgerStatus !== "POSTED" && value.returnOutcomes.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Return recovery requires posted original receipt accounting." })
})
export type ReceiptLedgerRecoveryDraft = z.infer<typeof receiptLedgerRecoveryDraftSchema>
export type ReceiptLedgerRecoveryCommand = z.infer<typeof receiptLedgerRecoveryCommandSchema>
export type ReceiptLedgerRecoveryDecision = z.infer<typeof receiptLedgerRecoveryDecisionSchema>
export type ReceiptLedgerRecoveryBlocker = "LEGACY_SOURCE" | "SOURCE_UNVERIFIED" | "STOCK_UNVERIFIED" | "ALREADY_POSTED" | "NOT_REQUIRED" | "BATCH_REVIEW" | "PERIOD_UNAVAILABLE" | "RULE_UNAVAILABLE" | "JOURNAL_UNAVAILABLE" | "RETURN_UNAVAILABLE"
export type ReceiptLedgerRecoveryPreview = {
  organizationId: string; actorId: string; orderId: string; receiptId: string; receiptNumber: string;
  supplierName: string; value: string; currency: string; effectiveAt: string | null;
  sourceEventId: string | null; sourceHash: string | null; periodName: string | null; ruleCode: string | null; journalCode: string | null;
  blockers: ReceiptLedgerRecoveryBlocker[]; requiresFreshAuth: boolean; revision: string; checkedAt: string;
  returns: Array<{ returnId: string; effectiveAt: string; value: string; currency: string; accountingRequired: boolean; periodName: string | null; ruleCode: string | null; journalCode: string | null; blockers: Array<"PERIOD_UNAVAILABLE" | "RULE_UNAVAILABLE" | "JOURNAL_UNAVAILABLE"> }>;
}
