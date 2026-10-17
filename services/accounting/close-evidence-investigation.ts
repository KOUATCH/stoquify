import "server-only"

import { createHash } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { NotFoundError } from "@/services/_shared/action-errors"
import { CLOSE_RECIPIENT_REPLACED, readCloseEvidenceRecipient } from "./close-evidence-recipient.service"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { CLOSE_HISTORY_PROPOSED, CLOSE_HISTORY_APPROVED, CLOSE_HISTORY_CLOSED, closeHistoryProposalSchema, readCloseHistoryOutcome, readResolvedCloseEvidence } from "./close-evidence-resolution-records"

const visibilities = ["CLIENT_ACTION_REQUIRED", "CLIENT_RESPONSE_SUBMITTED", "ACCOUNTANT_RESPONSE_ACCEPTED"]
const limit = 100
export type CloseEvidenceIssue = "MULTIPLE_REQUESTS" | "MULTIPLE_RESPONSES" | "MULTIPLE_ACCEPTANCES" | "SCOPE_MISMATCH" | "MALFORMED_RECORD" | "BROKEN_LINK" | "ASSIGNMENT_HISTORY" | "RESOLUTION_HISTORY" | "TRUNCATED"
function text(metadata: Prisma.JsonValue | null, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null
  const value = metadata[key]
  return typeof value === "string" && value.trim() ? value : null
}

/** Internal read model. Caller checks current accountant-review authority before
 * and after a repeatable-read transaction. This exposes evidence for human
 * investigation; it neither selects canonical records nor establishes validity.
 */
export async function readCloseEvidenceInvestigationInTx(tx: Prisma.TransactionClient, organizationId: string, periodId: string, requestId: string, actorId?: string) {
  const request = await tx.accountantComment.findFirst({ where: { id: requestId, organizationId, periodId, visibility: visibilities[0] } })
  if (!request?.findingId) throw new NotFoundError("Retained request unavailable")
  const finding = await tx.closeAssuranceFinding.findFirst({ where: { id: request.findingId, organizationId, periodId },
    select: { id: true, periodId: true, closeRunId: true, title: true, status: true, ownerId: true, resolvedAt: true, updatedAt: true } })
  if (!finding) throw new NotFoundError("Retained finding unavailable")
  // Do not filter by metadata, period or run: inconsistent links must be visible.
  const candidates = await tx.accountantComment.findMany({ where: { organizationId, findingId: finding.id, visibility: { in: visibilities } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: limit + 1 })
  const rows = candidates.slice(0, limit), requests = rows.filter(row => row.visibility === visibilities[0])
  const audits = requests.length ? await tx.ledgerAuditEvent.findMany({ where: { organizationId, action: CLOSE_RECIPIENT_REPLACED, resourceType: "AccountantComment", resourceId: { in: requests.map(row => row.id) } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: limit + 1,
    select: { id: true, resourceId: true, actorId: true, metadata: true, createdAt: true } }) : []
  const truncated = candidates.length > limit || audits.length > limit
  const issues = new Set<CloseEvidenceIssue>(truncated ? ["TRUNCATED"] : [])
  const counts = { requests: requests.length, responses: rows.filter(row => row.visibility === visibilities[1]).length, acceptances: rows.filter(row => row.visibility === visibilities[2]).length }
  if (counts.requests > 1) issues.add("MULTIPLE_REQUESTS")
  if (counts.responses > 1) issues.add("MULTIPLE_RESPONSES")
  if (counts.acceptances > 1) issues.add("MULTIPLE_ACCEPTANCES")
  const assignments = []
  for (const row of requests) {
    try {
      const assignment = await readCloseEvidenceRecipient(tx, row)
      assignments.push({ requestId: row.id, revision: assignment.revision, agreesWithFinding: assignment.recipientId === finding.ownerId })
      if (assignment.recipientId !== finding.ownerId) issues.add("ASSIGNMENT_HISTORY")
    } catch (error) { if (!(error instanceof BusinessRuleError)) throw error; issues.add("ASSIGNMENT_HISTORY") }
  }
  const records = rows.map(row => {
    const kind = row.visibility === visibilities[0] ? "request" : row.visibility === visibilities[1] ? "response" : "acceptance"
    const problems: CloseEvidenceIssue[] = []
    if (row.periodId !== finding.periodId || row.closeRunId !== finding.closeRunId) problems.push("SCOPE_MISMATCH")
    const typeKey = kind === "request" ? "requestType" : kind === "response" ? "responseType" : "acceptanceType"
    const expectedType = kind === "request" ? "MISSING_CLOSE_EVIDENCE" : kind === "response" ? "MISSING_CLOSE_EVIDENCE_RESPONSE" : "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE"
    if (!row.authorId || !row.body.trim() || !row.correlationId || text(row.metadata, typeKey) !== expectedType || text(row.metadata, "correlationId") !== row.correlationId) problems.push("MALFORMED_RECORD")
    const linkedRequestId = text(row.metadata, "requestId"), linkedResponseId = text(row.metadata, "responseId")
    if (kind !== "request" && !rows.some(item => item.id === linkedRequestId && item.visibility === visibilities[0] && item.correlationId === text(row.metadata, "requestCorrelationId"))) problems.push("BROKEN_LINK")
    if (kind === "acceptance" && !rows.some(item => item.id === linkedResponseId && item.visibility === visibilities[1] && item.correlationId === text(row.metadata, "responseCorrelationId") && text(item.metadata, "requestId") === linkedRequestId)) problems.push("BROKEN_LINK")
    for (const problem of problems) issues.add(problem)
    return { id: row.id, kind, periodId: row.periodId, closeRunId: row.closeRunId, createdAt: row.createdAt.toISOString(), body: row.body,
      requestId: linkedRequestId, responseId: linkedResponseId, issues: [...new Set(problems)] }
  })
  // Raw metadata, actor identifiers, authentication and audit network data are
  // never returned. Bind the retained source, not just the redacted presentation.
  const revision = createHash("sha256").update(JSON.stringify({ version: 1, organizationId, periodId, requestId, finding, candidates, audits, assignments })).digest("hex")
  const history = await tx.ledgerAuditEvent.findMany({ where: { organizationId, resourceType: "CloseAssuranceFinding", resourceId: finding.id, action: { in: [CLOSE_HISTORY_PROPOSED, CLOSE_HISTORY_APPROVED, CLOSE_HISTORY_CLOSED] } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21 })
  let resolution: Awaited<ReturnType<typeof readResolvedCloseEvidence>> = null
  try { resolution = await readResolvedCloseEvidence(tx, organizationId, finding.id) }
  catch (error) { if (!(error instanceof BusinessRuleError)) throw error; issues.add("RESOLUTION_HISTORY") }
  const proposals = []
  for (const row of history.slice(0, 20).filter(row => row.action === CLOSE_HISTORY_PROPOSED)) {
    const parsed = closeHistoryProposalSchema.safeParse(row.metadata)
    if (!parsed.success || !row.actorId || parsed.data.findingId !== finding.id) { issues.add("RESOLUTION_HISTORY"); continue }
    let outcome: Awaited<ReturnType<typeof readCloseHistoryOutcome>> = null
    try { outcome = await readCloseHistoryOutcome(tx, organizationId, finding.id, row) }
    catch (error) { if (!(error instanceof BusinessRuleError)) throw error; issues.add("RESOLUTION_HISTORY") }
    const proposal = parsed.data, command = proposal.command, approvalId = outcome?.state === "APPROVED" ? outcome.id : null
    const selected = [command.selectedRequestId, command.selectedResponseId, command.selectedAcceptanceId].filter(Boolean)
    const stale = command.expectedRevision !== revision || proposal.previousApprovalId !== (resolution?.approvalId ?? null)
    proposals.push({ id: row.id, createdAt: row.createdAt.toISOString(), selectedRequestId: command.selectedRequestId, selectedResponseId: command.selectedResponseId,
      selectedAcceptanceId: command.selectedAcceptanceId, reason: command.reason, exclusions: command.exclusions, approvalId, stale, outcome,
      canWithdraw: !!actorId && row.actorId === actorId && !outcome,
      canReject: !!actorId && row.actorId !== actorId && !outcome,
      canApprove: !!actorId && row.actorId !== actorId && !rows.some(source => selected.includes(source.id) && source.authorId === actorId) && !outcome && !stale && !truncated && !issues.has("RESOLUTION_HISTORY") })
  }
  return { requestId, findingId: finding.id, title: finding.title, periodId, observedAt: new Date().toISOString(), revision,
    truncated, counts, issues: [...issues], records, resolutionId: resolution?.approvalId ?? null, excludedIds: resolution?.excludedIds ?? [], proposals: proposals.map(row => ({ ...row, canApprove: row.canApprove && !issues.has("RESOLUTION_HISTORY"), canWithdraw: row.canWithdraw && !issues.has("RESOLUTION_HISTORY"), canReject: row.canReject && !issues.has("RESOLUTION_HISTORY") })), proposalsTruncated: history.length > 20,
    assignmentChanges: audits.slice(0, limit).map(row => ({ id: row.id, requestId: row.resourceId, createdAt: row.createdAt.toISOString() })) }
}

export type CloseEvidenceInvestigation = Awaited<ReturnType<typeof readCloseEvidenceInvestigationInTx>>
