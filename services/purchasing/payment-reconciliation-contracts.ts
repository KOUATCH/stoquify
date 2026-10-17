import { z } from "zod"
import { paymentRequestApprovalSchema } from "./payment-request-contracts"

const id = paymentRequestApprovalSchema.shape.paymentRequestId
const revision = paymentRequestApprovalSchema.shape.expectedRevision
const key = paymentRequestApprovalSchema.shape.idempotencyKey
export const paymentReconciliationEvidenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("BANK_STATEMENT"), statementLineId: id }).strict(),
  z.object({ kind: z.literal("CASH_VOUCHER"), voucherReference: z.string().trim().min(3).max(191),
    evidenceUri: z.string().trim().max(1000).url().refine(value => /^https?:\/\//i.test(value)),
    evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/), recipientName: z.string().trim().min(2).max(191),
    acknowledgedAt: z.string().datetime({ offset: true }), purpose: z.string().trim().min(10).max(1000),
    acknowledgment: z.literal("RECIPIENT_ACKNOWLEDGED") }).strict(),
])
export const paymentReconciliationDraftSchema = z.object({ paymentRequestId: id, evidence: paymentReconciliationEvidenceSchema }).strict()
export const paymentReconciliationCommandSchema = z.object({ draft: paymentReconciliationDraftSchema, expectedRevision: revision, idempotencyKey: key }).strict()
export const paymentReconciliationDecisionSchema = z.object({ paymentRequestId: id, proposalId: id, decision: z.enum(["APPROVE", "REJECT"]), reason: z.string().trim().min(10).max(1000), expectedRevision: revision, idempotencyKey: key }).strict()
export const paymentReconciliationReopenSchema = z.object({ paymentRequestId: id, reason: z.string().trim().min(10).max(1000), expectedRevision: revision, idempotencyKey: key }).strict()
export const paymentReconciliationFinalizeSchema = paymentRequestApprovalSchema
export const paymentReconciliationQuerySchema = z.object({ search: z.string().trim().max(120).default(""), after: id.optional() }).strict()
export type PaymentReconciliationDraft = z.infer<typeof paymentReconciliationDraftSchema>
export type PaymentReconciliationCommand = z.infer<typeof paymentReconciliationCommandSchema>
export type PaymentReconciliationDecision = z.infer<typeof paymentReconciliationDecisionSchema>
export type PaymentReconciliationReopen = z.infer<typeof paymentReconciliationReopenSchema>
export type PaymentReconciliationFinalize = z.infer<typeof paymentReconciliationFinalizeSchema>
export type PaymentReconciliationQuery = z.input<typeof paymentReconciliationQuerySchema>
export type PaymentReconciliationStatus = "AWAITING_EVIDENCE" | "PROPOSED" | "ADMITTED" | "RECONCILED" | "CASH_REVIEWED" | "REJECTED" | "REOPENED"
export type PaymentReconciliationView = {
  organizationId: string; actorId: string; paymentRequestId: string; paymentNumber: string; supplierName: string;
  total: string; currency: string; method: string; destinationLabel: string; executionReference: string; executedAt: string;
  status: PaymentReconciliationStatus; revision: string; proposalId: string | null; receiptId: string | null;
  evidence: PaymentReconciliationDraft["evidence"] | null; fresh: boolean; checkedAt: string;
  statementEvidence: { statementLineId: string; providerName: string; fileName: string | null; reference: string; total: string; currency: string; occurredAt: string } | null;
  evidenceCurrent: boolean; evidenceIssue: "REVIEW_REQUIRED" | null;
  bankMatch: { matchId: string; runId: string } | null;
  canPropose: boolean; canDecide: boolean; canReopen: boolean; canFinalize: boolean;
  history: Array<{ id: string; status: PaymentReconciliationStatus; recordedAt: string; reason: string | null }>;
}
