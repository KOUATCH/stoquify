import { z } from "zod"
import { ConflictError } from "@/services/_shared/action-errors"
import { suspenseEvidenceHash } from "./payment-suspense-evidence"
import { suspenseResolutionDraftSchema } from "./payment-suspense-resolution.contracts"
import { suspenseResolutionRecoveryDraftSchema } from "./payment-suspense-resolution-recovery.contracts"

const id = z.string().min(1).max(191), hash = z.string().regex(/^sha256:[a-f0-9]{64}$/)
const common = { financialHash: hash, proposedById: id }
const resolution = { ...common, draft: suspenseResolutionDraftSchema, originalJournalId: id, cycle: z.number().int().positive() }
const decision = { suspenseItemId: id, proposalId: id, decidedAt: z.string().datetime(), reason: z.string().min(5).max(2000), commandHash: hash, reviewedRevision: hash }
const recovery = { ...common, allocationId: id, clearingJournalId: id, clearingJournalHash: hash }
const recoveryDecision = { ...recovery, ...decision, approvedById: id, resolutionDecisionId: id, resolutionDecisionHash: z.string().regex(/^[a-f0-9]{64}$/) }
const schema = z.discriminatedUnion("kind", [
  z.object({ ...resolution, kind: z.literal("SUSPENSE_RESOLUTION_PROPOSED_V1"), proposedAt: z.string().datetime(), requestHash: hash }),
  z.object({ ...resolution, ...decision, kind: z.literal("SUSPENSE_RESOLUTION_APPROVED_V1"), decidedById: id, allocationId: id }),
  z.object({ ...resolution, ...decision, kind: z.literal("SUSPENSE_RESOLUTION_REJECTED_V1"), decidedById: id }),
  z.object({ ...recovery, kind: z.literal("SUSPENSE_RESOLUTION_RECOVERY_PROPOSED_V1"), draft: suspenseResolutionRecoveryDraftSchema, clearingPostedById: id, proposedAt: z.string().datetime(), requestHash: hash }),
  z.object({ ...recoveryDecision, kind: z.literal("SUSPENSE_RESOLUTION_RECOVERY_APPROVED_V1"), recoveryReceiptId: id }),
  z.object({ ...recoveryDecision, kind: z.literal("SUSPENSE_RESOLUTION_RECOVERY_REJECTED_V1") }),
])
export type SuspenseResolutionRecord = z.infer<typeof schema>
export type ResolutionRecord = Extract<SuspenseResolutionRecord, { originalJournalId: string }>
export function parseSuspenseResolutionRecord(row: { id: string; payloadHash: string; payloadSummary: unknown; externalId: string | null; idempotencyKey: string }) {
  const parsed = schema.safeParse(row.payloadSummary)
  if (!parsed.success || row.payloadHash !== suspenseEvidenceHash(row.payloadSummary).slice(7)) throw new ConflictError("Retained resolution record is incomplete or changed.")
  const data = parsed.data, itemId = "suspenseItemId" in data ? data.suspenseItemId : data.draft.suspenseItemId
  const recovery = data.kind.startsWith("SUSPENSE_RESOLUTION_RECOVERY_"), proposal = "proposedAt" in data
  const prefix = `suspense-resolution-${recovery ? "recovery-" : ""}${proposal ? "proposal:" : "decision:"}`
  if (row.externalId !== itemId || ("draft" in data && data.draft.suspenseItemId !== itemId)
    || !row.idempotencyKey.startsWith(prefix) || (!proposal && row.idempotencyKey !== prefix + data.proposalId)) throw new ConflictError("Resolution record identity requires review.")
  return data
}
export function suspenseResolutionRecordRevision(row: { id: string; payloadHash: string; createdAt: Date }) {
  return suspenseEvidenceHash({ recordId: row.id, payloadHash: row.payloadHash, recordedAt: row.createdAt.toISOString() })
}
