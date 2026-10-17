import "server-only"

import { type Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"

export const CLOSE_RECIPIENT_REPLACED = "CLOSE_MISSING_EVIDENCE_RECIPIENT_REPLACED"
export type CloseRecipientRequest = {
  id: string; organizationId: string; findingId: string | null; periodId: string; closeRunId: string
  createdAt: Date; metadata: Prisma.JsonValue | null
}
export type CloseRecipientAssignment = {
  recipientId: string; originalRecipientId: string; revision: string; sequence: number
  changedAt: string | null; changedById: string | null; reason: string | null
  changeCorrelationId: string | null
}
function record(value: Prisma.JsonValue | null) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}
function value(metadata: Prisma.JsonValue | null, key: string) {
  const entry = record(metadata)[key]
  return typeof entry === "string" && entry.trim() ? entry : null
}

/** Internal: caller enforces current tenant/object authority. The original
 * request is immutable. Service-owned replacement audits carry the assignment
 * revision; finding.ownerId must agree before a response can be admitted.
 * This validates the current transition and its immediate predecessor, not a
 * certification of the entire historical audit trail.
 */
export async function readCloseEvidenceRecipient(tx: Pick<Prisma.TransactionClient, "ledgerAuditEvent">, request: CloseRecipientRequest): Promise<CloseRecipientAssignment> {
  const originalRecipientId = value(request.metadata, "requestedFromId")
  const invalid = () => new BusinessRuleError("Stored response-owner history needs investigation.")
  if (!originalRecipientId || !request.findingId) throw invalid()
  const changes = await tx.ledgerAuditEvent.findMany({
    where: { organizationId: request.organizationId, action: CLOSE_RECIPIENT_REPLACED, resourceType: "AccountantComment", resourceId: request.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 2,
  })
  if (!changes.length) return { recipientId: originalRecipientId, originalRecipientId, revision: request.id, sequence: 0, changedAt: null, changedById: null, reason: null, changeCorrelationId: null }
  const parsed = changes.map(change => {
    const data = record(change.metadata), fromId = value(change.metadata, "fromId"), toId = value(change.metadata, "toId"), previousRevision = value(change.metadata, "previousRevision"), reason = value(change.metadata, "reason")
    if (change.organizationId !== request.organizationId || change.action !== CLOSE_RECIPIENT_REPLACED || change.resourceType !== "AccountantComment" || change.resourceId !== request.id ||
      !change.actorId || data.version !== 1 || data.requestId !== request.id || data.findingId !== request.findingId || data.periodId !== request.periodId || data.closeRunId !== request.closeRunId ||
      data.originalRecipientId !== originalRecipientId || !fromId || !toId || fromId === toId || !previousRevision || !reason || reason.trim().length < 10 ||
      !value(change.metadata, "correlationId") || typeof data.sequence !== "number" || !Number.isSafeInteger(data.sequence) || data.sequence < 1 || change.createdAt < request.createdAt) throw invalid()
    return { change, fromId, toId, previousRevision, reason, sequence: data.sequence }
  })
  const current = parsed[0], previous = parsed[1]
  if (previous ? current.sequence !== previous.sequence + 1 || current.previousRevision !== previous.change.id || current.fromId !== previous.toId || current.change.createdAt <= previous.change.createdAt
    : current.sequence !== 1 || current.previousRevision !== request.id || current.fromId !== originalRecipientId) throw invalid()
  return { recipientId: current.toId, originalRecipientId, revision: current.change.id, sequence: current.sequence,
    changedAt: current.change.createdAt.toISOString(), changedById: current.change.actorId, reason: current.reason, changeCorrelationId: value(current.change.metadata, "correlationId") }
}
