import { z } from "zod"
import { ConflictError } from "@/services/_shared/action-errors"
import { suspenseCorrectionDraftSchema } from "./payment-suspense-correction.contracts"
import { suspenseEvidenceHash } from "./payment-suspense-evidence"

const id = z.string().min(1), hash = z.string().regex(/^sha256:[a-f0-9]{64}$/)
const approval = z.object({ inboxItemId: id, approvedById: id, proposedById: id, ledgerPostingBatchId: id,
  reviewedRevision: hash, sourceHash: hash, proposalHash: hash, approvedAt: z.string().datetime() }).passthrough()
const common = { suspenseItemId: id, cycle: z.number().int().positive(), proposedById: id, originalJournalId: id,
  originalJournalHash: hash, originalApproval: approval }
const decision = { ...common, proposalId: id, approvedById: id, decidedAt: z.string().datetime(), reason: z.string().min(5), reviewedRevision: hash, commandHash: hash }
const schema = z.discriminatedUnion("kind", [
  z.object({ ...common, kind: z.literal("SUSPENSE_CORRECTION_PROPOSED_V1"), draft: suspenseCorrectionDraftSchema,
    proposedAt: z.string().datetime(), originalPostedById: id, originalPostingBatchId: id, financialHash: hash, requestHash: hash }).passthrough(),
  z.object({ ...decision, kind: z.literal("SUSPENSE_CORRECTION_REJECTED_V1") }).passthrough(),
  z.object({ ...decision, kind: z.literal("SUSPENSE_CORRECTION_APPROVED_V1"), reversalJournalId: id, reversalJournalHash: hash,
    reversalBatchId: id, reversalDate: z.string(), originalPostingBatchId: id }).passthrough(),
])
export function parseSuspenseCorrectionRecord(row: { id: string; payloadHash: string; payloadSummary: unknown; externalId: string | null }) {
  const parsed = schema.safeParse(row.payloadSummary)
  if (!parsed.success || row.payloadHash !== suspenseEvidenceHash(row.payloadSummary).slice(7)
    || row.externalId !== parsed.data.suspenseItemId
    || (parsed.data.kind === "SUSPENSE_CORRECTION_PROPOSED_V1" && parsed.data.draft.suspenseItemId !== parsed.data.suspenseItemId)) {
    throw new ConflictError("Retained correction record is incomplete or its evidence hash changed.")
  }
  return parsed.data
}
export function suspenseCorrectionRecordRevision(row: { id: string; payloadHash: string; createdAt: Date }) {
  return suspenseEvidenceHash({ recordId: row.id, payloadHash: row.payloadHash, recordedAt: row.createdAt.toISOString() })
}
