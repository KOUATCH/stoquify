import "server-only"

import { type Prisma } from "@prisma/client"
import { expandPermissions, hasRbacPermission } from "@/lib/security/rbac-permissions"
import { isUsableAccount } from "@/services/roles/role-custodian-policy"
import { closeEvidenceAfter, closeEvidenceNextCursor, readCloseEvidenceCursor } from "./close-evidence-pagination"
import { parseCloseEvidenceReplacementBinding } from "./close-evidence-replacement.service"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { readCloseEvidenceRecipient, type CloseRecipientAssignment } from "./close-evidence-recipient.service"
import { readResolvedCloseEvidence } from "./close-evidence-resolution-records"

const requestVisibility = "CLIENT_ACTION_REQUIRED", responseVisibility = "CLIENT_RESPONSE_SUBMITTED", acceptanceVisibility = "ACCOUNTANT_RESPONSE_ACCEPTED"
export type CloseEvidenceTrackingItem = {
  requestId: string; findingId: string | null; closeRunId: string; title: string | null; createdAt: string; dueAt: string | null
  state: "AWAITING_RESPONSE" | "AWAITING_REVIEW" | "ACCEPTED" | "REVIEW_REQUIRED" | "SUPERSEDED"
  resolutionId?: string
  requester?: { name: string | null; available: boolean | null }
  recipientName: string | null; recipientAvailable: boolean; respondedAt: string | null; acceptedAt: string | null
  assignment?: { revision: string; recipientId: string; changedAt: string | null; reason: string | null }
}
function text(value: Prisma.JsonValue | null, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const entry = value[key]; return typeof entry === "string" && entry.trim() ? entry : null
}
function object(value: Prisma.JsonValue | null) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

/** Internal projection: caller must enforce current Close read + request permission
 * before and after this repeatable-read transaction. Supervision additionally
 * requires current finding.assign permission and lists only other authors.
 * Never exposed as an action.
 */
export async function readCloseEvidenceRequestTrackingInTx(tx: Prisma.TransactionClient, actor: { organizationId: string; actorId: string }, periodId: string, after?: string, supervise = false) {
  const scope = { ...actor, periodId, kind: supervise ? "supervision" as const : "tracking" as const }, cursor = readCloseEvidenceCursor(scope, after)
  const candidates = await tx.accountantComment.findMany({
    where: { organizationId: actor.organizationId, periodId, authorId: supervise ? { not: actor.actorId } : actor.actorId, visibility: requestVisibility, ...closeEvidenceAfter(cursor) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 101,
    include: { finding: { select: { id: true, organizationId: true, periodId: true, closeRunId: true, title: true, status: true, ownerId: true, resolvedAt: true,
      comments: { where: { organizationId: actor.organizationId, periodId, visibility: { in: [requestVisibility, responseVisibility, acceptanceVisibility] } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 4 },
    } } },
  })
  const visible = candidates.slice(0, 100)
  const resolutions = new Map<string, Awaited<ReturnType<typeof readResolvedCloseEvidence>>>()
  const invalidResolutions = new Set<string>()
  for (const row of visible) {
    if (!row.findingId || resolutions.has(row.findingId) || invalidResolutions.has(row.findingId)) continue
    try { resolutions.set(row.findingId, await readResolvedCloseEvidence(tx, actor.organizationId, row.findingId)) }
    catch (error) { if (!(error instanceof BusinessRuleError)) throw error; invalidResolutions.add(row.findingId) }
  }
  const assignments = new Map<string, CloseRecipientAssignment>()
  for (const request of visible) {
    if (!text(request.metadata, "requestedFromId") || !request.findingId) continue
    try { assignments.set(request.id, await readCloseEvidenceRecipient(tx, request)) }
    catch (error) { if (!(error instanceof BusinessRuleError)) throw error }
  }
  const recipientIds = [...new Set([...assignments.values()].map(row => row.recipientId).concat(supervise ? visible.flatMap(row => row.authorId ? [row.authorId] : []) : []))]
  const recipients = recipientIds.length ? await tx.user.findMany({ where: { organizationId: actor.organizationId, id: { in: recipientIds } }, include: { roles: true } }) : []
  const now = new Date(), byId = new Map(recipients.map(row => [row.id, row]))
  const items: CloseEvidenceTrackingItem[] = visible.map(request => {
    const finding = request.finding, recipientId = assignments.get(request.id)?.recipientId, dueAt = text(request.metadata, "dueAt")
    const inScope = !!finding && finding.organizationId === actor.organizationId && finding.periodId === periodId && finding.closeRunId === request.closeRunId
    const result: CloseEvidenceTrackingItem = { requestId: request.id, findingId: inScope ? finding.id : null, closeRunId: request.closeRunId,
      title: inScope ? finding.title : null, createdAt: request.createdAt.toISOString(), dueAt: null, state: "REVIEW_REQUIRED",
      recipientName: null, recipientAvailable: false, respondedAt: null, acceptedAt: null }
    if (supervise) {
      const requester = request.authorId ? byId.get(request.authorId) : undefined
      const permissions = requester ? expandPermissions(requester.roles.filter(role => role.organizationId === actor.organizationId).flatMap(role => role.permissions)) : []
      result.requester = { name: requester?.name || null, available: requester ? isUsableAccount(requester, now) && ["accounting.close.read", "accounting.close.evidence.request"].every(permission => hasRbacPermission(permissions, permission)) : null }
    }
    if (!inScope || invalidResolutions.has(finding.id)) return result
    const resolution = resolutions.get(finding.id)
    if (resolution) result.resolutionId = resolution.approvalId
    if (resolution?.excludedIds.includes(request.id)) { result.state = "SUPERSEDED"; return result }
    if (!inScope || !recipientId || !dueAt || !Number.isFinite(new Date(dueAt).getTime()) || !request.correlationId || !request.body.trim() ||
      !request.authorId || text(request.metadata, "requestType") !== "MISSING_CLOSE_EVIDENCE" || text(request.metadata, "requestedById") !== request.authorId || text(request.metadata, "correlationId") !== request.correlationId) return result
    const assignment = assignments.get(request.id)!
    result.assignment = { revision: assignment.revision, recipientId, changedAt: assignment.changedAt, reason: assignment.reason }
    result.dueAt = new Date(dueAt).toISOString()
    const recipient = byId.get(recipientId)
    if (recipient) {
      result.recipientName = recipient.name || null
      const permissions = expandPermissions(recipient.roles.filter(role => role.organizationId === actor.organizationId).flatMap(role => role.permissions))
      result.recipientAvailable = isUsableAccount(recipient, now) && ["accounting.close.read", "accounting.close.finding.comment"].every(permission => hasRbacPermission(permissions, permission))
    }
    const comments = resolution?.records ?? finding.comments, requests = comments.filter(row => row.visibility === requestVisibility), responses = comments.filter(row => row.visibility === responseVisibility), acceptances = comments.filter(row => row.visibility === acceptanceVisibility)
    if (comments.length > 3 || requests.length !== 1 || requests[0].id !== request.id || responses.length > 1 || acceptances.length > 1 || finding.ownerId !== recipientId) return result
    const response = responses[0], acceptance = acceptances[0]
    if (!response) {
      if (!acceptance && ["OPEN", "ASSIGNED", "REOPENED"].includes(finding.status)) result.state = "AWAITING_RESPONSE"
      return result
    }
    if (response.findingId !== finding.id || response.closeRunId !== request.closeRunId || response.authorId !== recipientId || !response.body.trim() || !response.correlationId ||
      text(response.metadata, "responseType") !== "MISSING_CLOSE_EVIDENCE_RESPONSE" || text(response.metadata, "requestId") !== request.id ||
      text(response.metadata, "requestCorrelationId") !== request.correlationId || text(response.metadata, "requestedById") !== request.authorId ||
      text(response.metadata, "requestedFromId") !== recipientId || text(response.metadata, "respondedById") !== recipientId || text(response.metadata, "correlationId") !== response.correlationId) return result
    result.respondedAt = response.createdAt.toISOString()
    if (!acceptance) { if (finding.status === "IN_REVIEW") result.state = "AWAITING_REVIEW"; return result }
    const binding = parseCloseEvidenceReplacementBinding(object(acceptance.metadata).replacementBinding)
    const resolvedAt = text(acceptance.metadata, "resolvedAt")
    if (finding.status !== "RESOLVED" || !finding.resolvedAt || !resolvedAt || new Date(resolvedAt).getTime() !== finding.resolvedAt.getTime() ||
      acceptance.findingId !== finding.id || acceptance.closeRunId !== request.closeRunId || !acceptance.authorId || acceptance.authorId === recipientId || !acceptance.correlationId || acceptance.body.trim().length < 10 ||
      text(acceptance.metadata, "acceptanceType") !== "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE" || text(acceptance.metadata, "decision") !== "ACCEPTED" ||
      text(acceptance.metadata, "findingStatus") !== "RESOLVED" || text(acceptance.metadata, "findingId") !== finding.id || text(acceptance.metadata, "periodId") !== periodId || text(acceptance.metadata, "closeRunId") !== request.closeRunId ||
      text(acceptance.metadata, "requestId") !== request.id || text(acceptance.metadata, "responseId") !== response.id || text(acceptance.metadata, "requestCorrelationId") !== request.correlationId ||
      text(acceptance.metadata, "responseCorrelationId") !== response.correlationId || text(acceptance.metadata, "respondedById") !== recipientId || text(acceptance.metadata, "acceptedById") !== acceptance.authorId ||
      text(acceptance.metadata, "correlationId") !== acceptance.correlationId || !binding || binding.organizationId !== actor.organizationId || binding.periodId !== periodId || binding.findingId !== finding.id || binding.originalRunId !== request.closeRunId) return result
    result.state = "ACCEPTED"; result.acceptedAt = acceptance.createdAt.toISOString(); return result
  })
  return { items, nextCursor: closeEvidenceNextCursor(scope, candidates.length > 100 ? candidates[99] : undefined), evidenceIssue: items.some(row => row.state === "REVIEW_REQUIRED") }
}
