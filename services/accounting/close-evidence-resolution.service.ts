import "server-only"

import { Prisma } from "@prisma/client"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { lockCloseEvidenceAcceptanceAuthorityInTx } from "./close-evidence-acceptance-authority.service"
import { readCloseEvidenceInvestigationInTx } from "./close-evidence-investigation"
import { readCloseEvidenceRecipient } from "./close-evidence-recipient.service"
import { parseCloseEvidenceReplacementBinding } from "./close-evidence-replacement.service"
import { mapMissingCloseEvidenceRequest, mapMissingCloseEvidenceResponse, mapMissingCloseEvidenceResponseAcceptance, runMissingCloseEvidenceTransaction } from "./close-assurance.service"
import { readCloseAssessmentPublicationTimeInTx } from "./close-assessment-order.service"
import { CLOSE_HISTORY_PROPOSED, CLOSE_HISTORY_APPROVED, CLOSE_HISTORY_CLOSED, closeHistoryDecisionSchema, closeHistoryClosedSchema, readCloseHistoryOutcome, proposeCloseHistorySchema, approveCloseHistorySchema, closeHistoryProposalSchema, closeHistoryApprovalSchema, closeHistoryRecordHash, closeHistoryValueHash, closeHistoryVisibilities } from "./close-evidence-resolution-records"

type Control = { actorId?: string | null; session?: { id: string; token: string } | null }
type Proposal = Prisma.JsonObject & { version: 1 }
const conflict = () => new ConflictError("The retained evidence or recovery decision changed. Inspect it again before submitting.")
const invalid = () => new BusinessRuleError("Select a valid retained chain matching the finding and explain every excluded record.", "REVIEW_REQUIRED")

async function previousApproval(tx: Prisma.TransactionClient, organizationId: string, findingId: string) {
  return tx.ledgerAuditEvent.findFirst({ where: { organizationId, action: CLOSE_HISTORY_APPROVED, resourceType: "CloseAssuranceFinding", resourceId: findingId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] })
}
async function validateSelection(tx: Prisma.TransactionClient, organizationId: string, command: ReturnType<typeof proposeCloseHistorySchema.parse>, approverId?: string) {
  const inspected = await readCloseEvidenceInvestigationInTx(tx, organizationId, command.periodId, command.requestId)
  if (inspected.truncated || inspected.revision !== command.expectedRevision) throw conflict()
  if (inspected.issues.includes("RESOLUTION_HISTORY")) throw invalid()
  const finding = await tx.closeAssuranceFinding.findFirst({ where: { id: inspected.findingId, organizationId, periodId: command.periodId } })
  if (!finding) throw new NotFoundError()
  const rows = await tx.accountantComment.findMany({ where: { organizationId, findingId: finding.id, visibility: { in: closeHistoryVisibilities } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 101 })
  const selected = [command.selectedRequestId, command.selectedResponseId, command.selectedAcceptanceId].filter((id): id is string => !!id)
  const excluded = command.exclusions.map(row => row.id), all = [...selected, ...excluded]
  if (rows.length > 100 || rows.length !== all.length || new Set(all).size !== all.length || rows.some(row => !all.includes(row.id))) throw invalid()
  const selectedRows = selected.map(id => rows.find(row => row.id === id)!)
  if (selectedRows.some(row => !row || row.periodId !== finding.periodId || row.closeRunId !== finding.closeRunId || !row.body.trim())) throw invalid()
  if (approverId && selectedRows.some(row => row.authorId === approverId)) throw new ForbiddenError("An independent reviewer who did not author the selected evidence must authorize recovery.")
  const request = mapMissingCloseEvidenceRequest(selectedRows[0]), assignment = await readCloseEvidenceRecipient(tx, selectedRows[0])
  if (finding.ownerId !== assignment.recipientId) throw invalid()
  if (!command.selectedResponseId) {
    if (command.selectedAcceptanceId || !["OPEN", "ASSIGNED", "REOPENED"].includes(finding.status)) throw invalid()
  } else {
    const response = mapMissingCloseEvidenceResponse(selectedRows[1])
    if (selectedRows[1].createdAt < selectedRows[0].createdAt || response.requestId !== request.id || response.requestCorrelationId !== request.correlationId || response.requestedById !== request.requestedById || response.requestedFromId !== assignment.recipientId || response.respondedById !== assignment.recipientId) throw invalid()
    if (!command.selectedAcceptanceId) { if (finding.status !== "IN_REVIEW") throw invalid() }
    else {
      const acceptance = mapMissingCloseEvidenceResponseAcceptance(selectedRows[2])
      const metadata = selectedRows[2].metadata as Prisma.JsonObject
      const binding = parseCloseEvidenceReplacementBinding(metadata.replacementBinding)
      if (finding.status !== "RESOLVED" || !finding.resolvedAt || acceptance.resolvedAt !== finding.resolvedAt.toISOString() ||
        selectedRows[2].createdAt < selectedRows[1].createdAt || !binding || binding.organizationId !== organizationId || binding.periodId !== finding.periodId || binding.findingId !== finding.id || binding.originalRunId !== finding.closeRunId ||
        acceptance.requestId !== request.id || acceptance.responseId !== response.id || acceptance.respondedById !== response.respondedById ||
        metadata.requestCorrelationId !== request.correlationId || metadata.responseCorrelationId !== response.correlationId || !acceptance.replacement) throw invalid()
    }
  }
  // Never restart work by excluding a structurally valid recorded acceptance.
  // A malformed legacy row can be explicitly excluded by independent review;
  // it remains retained and cannot itself establish an accepted outcome.
  if (!command.selectedAcceptanceId) for (const row of rows.filter(row => row.visibility === "ACCOUNTANT_RESPONSE_ACCEPTED")) {
    try { mapMissingCloseEvidenceResponseAcceptance(row) }
    catch (error) { if (error instanceof BusinessRuleError) continue; throw error }
    throw invalid()
  }
  return { finding, rows }
}

export async function proposeCloseEvidenceResolution(organizationId: string, input: unknown, control: Control) {
  const command = proposeCloseHistorySchema.parse(input), actorId = control.actorId?.trim()
  if (!actorId) throw new ForbiddenError()
  return runMissingCloseEvidenceTransaction(async tx => {
    const authority = await lockCloseEvidenceAcceptanceAuthorityInTx(tx, { homeOrganizationId: organizationId, organizationId, actorId, session: control.session, requireCloseRead: true })
    const key = JSON.stringify([CLOSE_HISTORY_PROPOSED, organizationId, command.correlationId])
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`)
    const replay = await tx.ledgerAuditEvent.findFirst({ where: { organizationId, action: CLOSE_HISTORY_PROPOSED, metadata: { path: ["command", "correlationId"], equals: command.correlationId } } })
    if (replay) {
      const parsed = closeHistoryProposalSchema.safeParse(replay.metadata)
      if (!parsed.success || replay.actorId !== actorId || closeHistoryValueHash(parsed.data.command) !== closeHistoryValueHash(command)) throw conflict()
      await authority.revalidate(); return { proposalId: replay.id, state: "PROPOSED" as const }
    }
    const anchor = await tx.accountantComment.findFirst({ where: { id: command.requestId, organizationId, periodId: command.periodId }, select: { findingId: true } })
    if (!anchor?.findingId) throw new NotFoundError()
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "close_assurance_findings" WHERE "id" = ${anchor.findingId} AND "organizationId" = ${organizationId} FOR UPDATE`)
    const { finding, rows } = await validateSelection(tx, organizationId, command)
    const previous = await previousApproval(tx, organizationId, finding.id)
    const recordedAt = await readCloseAssessmentPublicationTimeInTx(tx); await authority.revalidate(recordedAt)
    const metadata: Proposal = { version: 1, command, findingId: finding.id, closeRunId: finding.closeRunId, previousApprovalId: previous?.id ?? null, sourceHashes: rows.map(row => ({ id: row.id, hash: closeHistoryRecordHash(row) })) }
    const proposal = await tx.ledgerAuditEvent.create({ data: { organizationId, actorId, action: CLOSE_HISTORY_PROPOSED, resourceType: "CloseAssuranceFinding", resourceId: finding.id,
      createdAt: recordedAt, message: "Retained Close evidence recovery proposed; no evidence changed", metadata } })
    await authority.revalidate(); return { proposalId: proposal.id, state: "PROPOSED" as const }
  }, Prisma.TransactionIsolationLevel.ReadCommitted)
}

export async function approveCloseEvidenceResolution(organizationId: string, input: unknown, control: Control) {
  const command = approveCloseHistorySchema.parse(input), actorId = control.actorId?.trim()
  if (!actorId) throw new ForbiddenError()
  return runMissingCloseEvidenceTransaction(async tx => {
    const authority = await lockCloseEvidenceAcceptanceAuthorityInTx(tx, { homeOrganizationId: organizationId, organizationId, actorId, session: control.session, requireCloseRead: true })
    const key = JSON.stringify([CLOSE_HISTORY_APPROVED, organizationId, command.correlationId])
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`)
    const replay = await tx.ledgerAuditEvent.findFirst({ where: { organizationId, action: CLOSE_HISTORY_APPROVED, metadata: { path: ["command", "correlationId"], equals: command.correlationId } } })
    if (replay) {
      const parsed = closeHistoryApprovalSchema.safeParse(replay.metadata)
      if (!parsed.success || replay.actorId !== actorId || closeHistoryValueHash(parsed.data.command) !== closeHistoryValueHash(command)) throw conflict()
      await authority.revalidate(); return { proposalId: command.proposalId, approvalId: replay.id, state: "APPROVED" as const }
    }
    const proposalRow = await tx.ledgerAuditEvent.findFirst({ where: { id: command.proposalId, organizationId, action: CLOSE_HISTORY_PROPOSED, resourceType: "CloseAssuranceFinding" } })
    if (!proposalRow) throw new NotFoundError()
    const parsed = closeHistoryProposalSchema.safeParse(proposalRow.metadata)
    if (!parsed.success || !proposalRow.actorId || parsed.data.findingId !== proposalRow.resourceId) throw invalid()
    if (proposalRow.actorId === actorId) throw new ForbiddenError("The proposer cannot authorize their own recovery decision.")
    const proposal = parsed.data
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "close_assurance_findings" WHERE "id" = ${proposal.findingId} AND "organizationId" = ${organizationId} FOR UPDATE`)
    if (await readCloseHistoryOutcome(tx, organizationId, proposal.findingId, proposalRow)) throw conflict()
    const previous = await previousApproval(tx, organizationId, proposal.findingId)
    if ((previous?.id ?? null) !== proposal.previousApprovalId) throw conflict()
    const { rows } = await validateSelection(tx, organizationId, proposal.command, actorId)
    if (closeHistoryValueHash(rows.map(row => ({ id: row.id, hash: closeHistoryRecordHash(row) }))) !== closeHistoryValueHash(proposal.sourceHashes)) throw conflict()
    const recordedAt = await readCloseAssessmentPublicationTimeInTx(tx)
    if (recordedAt <= proposalRow.createdAt || (previous && recordedAt <= previous.createdAt)) throw conflict()
    await authority.revalidate(recordedAt)
    const approved = await tx.ledgerAuditEvent.create({ data: { organizationId, actorId, action: CLOSE_HISTORY_APPROVED, resourceType: "CloseAssuranceFinding", resourceId: proposal.findingId,
      createdAt: recordedAt, message: "Retained Close evidence selection independently authorized; source records preserved",
      metadata: { version: 1, proposalId: proposalRow.id, proposerId: proposalRow.actorId, command, proposal } } })
    await authority.revalidate(); return { proposalId: proposalRow.id, approvalId: approved.id, state: "APPROVED" as const }
  }, Prisma.TransactionIsolationLevel.ReadCommitted)
}

export async function closeEvidenceResolutionProposal(organizationId: string, input: unknown, control: Control) {
  const command = closeHistoryDecisionSchema.parse(input), actorId = control.actorId?.trim()
  if (!actorId) throw new ForbiddenError()
  return runMissingCloseEvidenceTransaction(async tx => {
    const authority = await lockCloseEvidenceAcceptanceAuthorityInTx(tx, { homeOrganizationId: organizationId, organizationId, actorId, session: control.session, requireCloseRead: true })
    const key = JSON.stringify([CLOSE_HISTORY_CLOSED, organizationId, command.correlationId])
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`)
    const replay = await tx.ledgerAuditEvent.findFirst({ where: { organizationId, action: CLOSE_HISTORY_CLOSED, metadata: { path: ["command", "correlationId"], equals: command.correlationId } } })
    if (replay) {
      const parsed = closeHistoryClosedSchema.safeParse(replay.metadata)
      if (!parsed.success || replay.actorId !== actorId || closeHistoryValueHash(parsed.data.command) !== closeHistoryValueHash(command)) throw conflict()
      await authority.revalidate(); return { proposalId: command.proposalId, decisionId: replay.id, state: command.decision }
    }
    const proposalRow = await tx.ledgerAuditEvent.findFirst({ where: { id: command.proposalId, organizationId, action: CLOSE_HISTORY_PROPOSED, resourceType: "CloseAssuranceFinding" } })
    if (!proposalRow) throw new NotFoundError()
    const parsed = closeHistoryProposalSchema.safeParse(proposalRow.metadata)
    if (!parsed.success || !proposalRow.actorId || parsed.data.findingId !== proposalRow.resourceId) throw invalid()
    if (command.decision === "WITHDRAWN" ? proposalRow.actorId !== actorId : proposalRow.actorId === actorId) throw new ForbiddenError("Only the proposer can withdraw; rejection requires another current reviewer.")
    const findingId = parsed.data.findingId
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "close_assurance_findings" WHERE "id" = ${findingId} AND "organizationId" = ${organizationId} FOR UPDATE`)
    if (await readCloseHistoryOutcome(tx, organizationId, findingId, proposalRow)) throw conflict()
    // Withdrawal/rejection remains useful after source changes. It never selects
    // evidence or changes an existing authorization, finding or financial record.
    const recordedAt = await readCloseAssessmentPublicationTimeInTx(tx)
    if (recordedAt <= proposalRow.createdAt) throw conflict()
    await authority.revalidate(recordedAt)
    const decision = await tx.ledgerAuditEvent.create({ data: { organizationId, actorId, action: CLOSE_HISTORY_CLOSED, resourceType: "CloseAssuranceFinding", resourceId: findingId, createdAt: recordedAt,
      message: "Pending Close evidence recovery proposal closed; source evidence unchanged", metadata: { version: 1, proposalId: proposalRow.id, proposerId: proposalRow.actorId, proposalHash: closeHistoryValueHash(proposalRow.metadata), command } } })
    await authority.revalidate(); return { proposalId: proposalRow.id, decisionId: decision.id, state: command.decision }
  }, Prisma.TransactionIsolationLevel.ReadCommitted)
}
