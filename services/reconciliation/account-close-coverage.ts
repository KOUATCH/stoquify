import { createHash } from "node:crypto"
import type { ReconciliationNoActivityEvidence } from "@prisma/client"

export type CoverageInterval = { start: number; end: number }
// Inclusive milliseconds. Run readers explicitly convert their exclusive end.
export function coverageGaps(start: number, end: number, intervals: CoverageInterval[]) {
  let cursor = start
  const gaps: CoverageInterval[] = []
  for (const interval of [...intervals].sort((a, b) => a.start - b.start || a.end - b.end)) {
    if (!Number.isFinite(interval.start) || !Number.isFinite(interval.end) || interval.end < interval.start || interval.end < cursor || interval.start > end) continue
    if (interval.start > cursor) gaps.push({ start: cursor, end: Math.min(end, interval.start - 1) })
    cursor = Math.max(cursor, interval.end + 1)
    if (cursor > end) break
  }
  if (cursor <= end) gaps.push({ start: cursor, end })
  return gaps.map(gap => ({ start: new Date(gap.start).toISOString(), end: new Date(gap.end).toISOString() }))
}

export type NoActivityPayload = Pick<ReconciliationNoActivityEvidence,
  "organizationId" | "providerAccountId" | "periodId" | "periodStart" | "periodEnd" | "currencyCode" | "sourceReference" | "sourceDocumentHash" | "reason" | "proposedById">
export function noActivityEvidenceHash(value: NoActivityPayload) {
  return "sha256:" + createHash("sha256").update(JSON.stringify({ version: 1,
    organizationId: value.organizationId, providerAccountId: value.providerAccountId, periodId: value.periodId,
    periodStart: value.periodStart.toISOString(), periodEnd: value.periodEnd.toISOString(), currencyCode: value.currencyCode,
    sourceReference: value.sourceReference, sourceDocumentHash: value.sourceDocumentHash,
    reason: value.reason, proposedById: value.proposedById,
  })).digest("hex")
}

export function eligibleNoActivity(evidence: ReconciliationNoActivityEvidence, input: {
  organizationId: string; providerAccountId: string; periodId: string; start: Date; end: Date; cutoff: Date; currencyCode: string; activityCount: number; obligationCount: number
}) {
  return input.activityCount === 0 && input.obligationCount === 0
    && evidence.organizationId === input.organizationId && evidence.providerAccountId === input.providerAccountId && evidence.periodId === input.periodId
    && evidence.periodStart.getTime() === input.start.getTime() && evidence.periodEnd.getTime() === input.end.getTime()
    && evidence.currencyCode === input.currencyCode && evidence.status === "APPROVED" && evidence.revokedAt === null
    && evidence.createdAt <= input.cutoff && evidence.approvedAt !== null && evidence.approvedAt <= input.cutoff
    && evidence.approvedAt >= evidence.createdAt && !!evidence.approvedById && evidence.approvedById !== evidence.proposedById
    && /^sha256:[a-f0-9]{64}$/.test(evidence.sourceDocumentHash) && evidence.sourceReference.trim().length > 0
    && evidence.reason.trim().length >= 10 && evidence.evidenceHash === noActivityEvidenceHash(evidence)
}
