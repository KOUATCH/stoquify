import { loadExceptionClosureSourceInTx as source, loadExceptionClosureReceiptInTx as receipt, exceptionClosureStateHash as afterHash, exceptionClosureManifestEvidenceInTx, financialExceptionClosureTypes } from "./payment-exception-closure-evidence.service"
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { FreshAuthRequiredError } from "@/lib/security/auth-session"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import type { SuspenseCorrectionControl } from "./payment-suspense-correction.service"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"
import { exceptionClosureReadSchema, exceptionClosureProposalSchema, exceptionClosureDecisionSchema, exceptionClosureCasesSchema, exceptionClosureHistorySchema, type ExceptionClosureProposal, type ExceptionClosureDecision } from "./payment-exception-closure.contracts"

type Tx = Prisma.TransactionClient
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
const hash = (value: unknown) => suspenseEvidenceHash(json(value))
const openStatuses = new Set(["OPEN", "ASSIGNED", "ACKNOWLEDGED", "ESCALATED", "RESOLUTION_PROPOSED", "REOPENED"])

async function authorize(tx: Tx, control: SuspenseCorrectionControl, write = false) {
  if (!["payments.reconciliation.read", "accounting.journal.read", ...(write ? ["payments.reconciliation.exception.resolve"] : [])].every(p => hasRbacPermission(control.actorPermissions, p))) throw new ForbiddenError("Current reconciliation, accounting read and exception-resolution authority are required.")
  if (!await tx.user.findFirst({ where: { id: control.actorId, organizationId: control.organizationId, isActive: true }, select: { id: true } })) throw new ForbiddenError("Active workspace actor is required.")
  const now = (control.now ?? new Date()).getTime(), at = control.lastAuthAt?.getTime()
  if (write && (at === undefined || !Number.isFinite(at) || at > now || now - at > 300_000)) throw new FreshAuthRequiredError()
}
async function record(tx: Tx, control: SuspenseCorrectionControl, exceptionId: string, key: string, payload: unknown, id = randomUUID()) {
  const body = json(payload)
  return tx.paymentReconciliationInboxItem.create({ data: { id, organizationId: control.organizationId, externalId: exceptionId, source: "RECONCILIATION_RUN", status: "PROCESSED",
    idempotencyKey: key, payloadSummary: body, payloadHash: hash(body).slice(7), processedAt: control.now ?? new Date(), correlationId: id } })
}
async function transaction<T>(work: (tx: Tx) => Promise<T>) {
  try { return await db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && (["P2002", "P2034"].includes(error.code) || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code))))) throw new ConflictError("Exception evidence changed concurrently. Refresh or retry the same request."); throw error }
}
export async function previewExceptionClosure(input: { exceptionId: string }, control: SuspenseCorrectionControl) {
  const command = exceptionClosureReadSchema.parse(input)
  return db.$transaction(async tx => {
    await authorize(tx, control)
    const current = await source(tx, control.organizationId, command.exceptionId)
    return { exceptionId: current.exception.id, type: current.exception.type, status: current.exception.status, suspenseItemId: current.item.id, runId: current.run.id,
      financialDecisionId: current.financial.decisionId, financialOutcome: current.item.status, revision: current.revision,
      canPropose: openStatuses.has(current.exception.status), separateExceptionDecisionRequired: true, asOf: (control.now ?? new Date()).toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

const pageSize = 20
function pageAfter(cursor: { createdAt: string; id: string } | null | undefined) {
  return cursor ? { OR: [{ createdAt: { lt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } }] } : {}
}
function nextPage(rows: Array<{ id: string; createdAt: Date }>) {
  const last = rows[pageSize - 1]
  return rows.length > pageSize ? { id: last.id, createdAt: last.createdAt.toISOString() } : null
}
export async function listExceptionClosureCases(input: unknown, control: SuspenseCorrectionControl) {
  const command = exceptionClosureCasesSchema.parse(input)
  return db.$transaction(async tx => {
    await authorize(tx, control)
    const where: Prisma.PaymentExceptionWhereInput = { organizationId: control.organizationId,
      ...(command.view === "OPEN" ? { status: { notIn: ["RESOLVED", "DISMISSED"] } } : {}),
      ...(command.suspenseItemId ? { suspenseItemId: command.suspenseItemId } : {}) }
    const rows = await tx.paymentException.findMany({ where: { ...where, ...pageAfter(command.cursor) }, take: pageSize + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, type: true, status: true, suspenseItemId: true, createdAt: true } })
    const total = await tx.paymentException.count({ where })
    return { items: rows.slice(0, pageSize).map(row => ({ ...row, createdAt: row.createdAt.toISOString(),
      closurePath: financialExceptionClosureTypes.has(row.type) ? "FINANCIAL_REVIEW" as const : "INVESTIGATION_REQUIRED" as const })),
      total, nextCursor: nextPage(rows), asOf: (control.now ?? new Date()).toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

// Historical identity/audit checks intentionally do not require today's financial source to
// match an earlier decision. Reopening preserves that decision without making it current.
async function historicalRecord(tx: Tx, organizationId: string, exceptionId: string, id: string) {
  const saved = await receipt(tx, organizationId, exceptionId, id), data = saved.data
  const proposal = data.kind === "EXCEPTION_CLOSURE_PROPOSED_V1", approved = data.kind === "EXCEPTION_CLOSURE_APPROVED_V1"
  const actorId = proposal ? data.proposedById : data.decidedById, at = proposal ? data.proposedAt : data.decidedAt
  if ((!proposal && !approved && data.kind !== "EXCEPTION_CLOSURE_REJECTED_V1") || data.exceptionId !== exceptionId
    || typeof actorId !== "string" || !actorId || typeof at !== "string" || !Number.isFinite(Date.parse(at))
    || typeof data.reason !== "string" || data.reason.trim().length < 5 || data.reason.length > 2000
    || typeof data.reviewedRevision !== "string" || !/^sha256:[a-f0-9]{64}$/.test(data.reviewedRevision)
    || (proposal ? !saved.row.idempotencyKey.startsWith("exception-closure-proposal:")
      : typeof data.proposalId !== "string" || saved.row.idempotencyKey !== "exception-closure-decision:" + data.proposalId || data.proposedById === actorId)) {
    throw new ConflictError("Historical exception record identity requires review.")
  }
  if (!await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceId: exceptionId, actorId,
    action: proposal ? "EXCEPTION_CLOSURE_PROPOSE" : approved ? "EXCEPTION_CLOSURE_APPROVE" : "EXCEPTION_CLOSURE_REJECT",
    metadata: { path: [proposal ? "proposalId" : "receiptId"], equals: id } }, select: { id: true } })) throw new ConflictError("Historical exception audit is missing.")
  return { ...saved, actorId, at, reason: data.reason, proposal, approved }
}
async function historicalDecision(tx: Tx, organizationId: string, exceptionId: string, id: string) {
  const saved = await historicalRecord(tx, organizationId, exceptionId, id)
  if (saved.proposal || typeof saved.data.proposalId !== "string") throw new ConflictError("Historical exception decision identity requires review.")
  const proposed = await historicalRecord(tx, organizationId, exceptionId, saved.data.proposalId)
  if (!proposed.proposal || proposed.actorId !== saved.data.proposedById || proposed.data.reviewedRevision !== saved.data.reviewedRevision
    || proposed.data.sourceHash !== saved.data.sourceHash || hash(proposed.data.financial) !== hash(saved.data.financial)) throw new ConflictError("Historical exception proposal lineage requires review.")
  return saved
}
export async function readExceptionClosureHistory(input: unknown, control: SuspenseCorrectionControl) {
  const command = exceptionClosureHistorySchema.parse(input)
  return db.$transaction(async tx => {
    await authorize(tx, control)
    const exception = await tx.paymentException.findFirst({ where: { id: command.exceptionId, organizationId: control.organizationId },
      select: { id: true, status: true, type: true, suspenseItemId: true } })
    if (!exception) throw new NotFoundError("Exception is unavailable in this workspace.")
    const where: Prisma.PaymentReconciliationInboxItemWhereInput = { organizationId: control.organizationId, externalId: exception.id, source: "RECONCILIATION_RUN", status: "PROCESSED",
      OR: [{ idempotencyKey: { startsWith: "exception-closure-proposal:" } }, { idempotencyKey: { startsWith: "exception-closure-decision:" } }] }
    const rows = await tx.paymentReconciliationInboxItem.findMany({ where: { AND: [where, pageAfter(command.cursor)] }, take: pageSize + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, createdAt: true } })
    const total = await tx.paymentReconciliationInboxItem.count({ where })
    const items = []
    for (const row of rows.slice(0, pageSize)) {
      const saved = await historicalRecord(tx, control.organizationId, exception.id, row.id)
      let decisionId: string | null = null
      if (saved.proposal) {
        const decision = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, externalId: exception.id,
          source: "RECONCILIATION_RUN", status: "PROCESSED", idempotencyKey: "exception-closure-decision:" + row.id }, select: { id: true } })
        if (decision) { await historicalDecision(tx, control.organizationId, exception.id, decision.id); decisionId = decision.id }
      } else await historicalDecision(tx, control.organizationId, exception.id, row.id)
      items.push({ id: row.id, kind: saved.proposal ? "PROPOSED" as const : saved.approved ? "APPROVED" as const : "REJECTED" as const,
        actorId: saved.actorId, at: saved.at, reason: saved.reason, proposalId: saved.proposal ? row.id : String(saved.data.proposalId), decisionId,
        requiresCurrentReview: saved.proposal && !decisionId && openStatuses.has(exception.status) })
    }
    return { exception, items, total, nextCursor: nextPage(rows), asOf: (control.now ?? new Date()).toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
export async function proposeExceptionClosure(input: ExceptionClosureProposal, control: SuspenseCorrectionControl) {
  const command = exceptionClosureProposalSchema.parse(input), key = "exception-closure-proposal:" + command.idempotencyKey, requestHash = hash({ command, actorId: control.actorId, organizationId: control.organizationId })
  return transaction(async tx => {
    await authorize(tx, control, true)
    const prior = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, idempotencyKey: key } })
    if (prior) {
      const saved = await receipt(tx, control.organizationId, command.exceptionId, prior.id)
      if (saved.data.kind !== "EXCEPTION_CLOSURE_PROPOSED_V1" || saved.data.requestHash !== requestHash) throw new IdempotencyConflictError()
      if (!await tx.ledgerAuditEvent.findFirst({ where: { organizationId: control.organizationId, resourceId: command.exceptionId, actorId: control.actorId, action: "EXCEPTION_CLOSURE_PROPOSE", metadata: { path: ["proposalId"], equals: prior.id } } })) throw new ConflictError("The retained proposal audit is missing.")
      return { proposalId: prior.id, replayed: true }
    }
    const current = await source(tx, control.organizationId, command.exceptionId)
    if (!openStatuses.has(current.exception.status) || command.expectedRevision !== current.revision) throw new ConflictError("Exception or financial evidence changed. Review the current source.")
    const row = await record(tx, control, command.exceptionId, key, { kind: "EXCEPTION_CLOSURE_PROPOSED_V1", requestHash, exceptionId: command.exceptionId,
      proposedById: control.actorId, proposedAt: (control.now ?? new Date()).toISOString(), reason: command.reason, reviewedRevision: current.revision, financial: current.financial, sourceHash: current.sourceHash })
    await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "EXCEPTION_CLOSURE_PROPOSE", resourceType: "PaymentException", resourceId: command.exceptionId,
      message: "Exception closure proposed for independent decision; financial treatment unchanged", metadata: json({ proposalId: row.id, reviewedRevision: current.revision }) } })
    await publishPaymentReconciliationNotification({ type: "payment-reconciliation.exception.closure-proposed", organizationId: control.organizationId, evidenceRef: { exceptionId: command.exceptionId, suspenseItemId: current.item.id, reconciliationRunId: current.run.id }, correlationId: row.id, dedupeKey: row.id }, tx)
    return { proposalId: row.id, replayed: false }
  })
}
export async function reviewExceptionClosure(exceptionId: string, proposalId: string, control: SuspenseCorrectionControl) {
  const parsed = exceptionClosureReadSchema.parse({ exceptionId })
  return db.$transaction(async tx => {
    await authorize(tx, control)
    const proposed = await receipt(tx, control.organizationId, parsed.exceptionId, proposalId)
    if (proposed.data.kind !== "EXCEPTION_CLOSURE_PROPOSED_V1" || proposed.data.exceptionId !== parsed.exceptionId) throw new ConflictError("Exception proposal identity requires review.")
    const current = await source(tx, control.organizationId, parsed.exceptionId)
    if (proposed.data.reviewedRevision !== current.revision || !openStatuses.has(current.exception.status)) throw new ConflictError("This proposal is no longer current. Review the exception again.")
    return { exceptionId: parsed.exceptionId, proposalId, revision: current.revision, proposedById: String(proposed.data.proposedById), reason: String(proposed.data.reason),
      financialDecisionId: current.financial.decisionId, financialOutcome: current.item.status, runMakerId: current.run.runById, runId: current.run.id, asOf: (control.now ?? new Date()).toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
export async function decideExceptionClosure(input: ExceptionClosureDecision, control: SuspenseCorrectionControl) {
  const command = exceptionClosureDecisionSchema.parse(input), key = "exception-closure-decision:" + command.proposalId, commandHash = hash({ command, actorId: control.actorId, organizationId: control.organizationId })
  return transaction(async tx => {
    await authorize(tx, control, true)
    const proposed = await receipt(tx, control.organizationId, command.exceptionId, command.proposalId)
    if (proposed.data.kind !== "EXCEPTION_CLOSURE_PROPOSED_V1" || typeof proposed.data.proposedById !== "string" || !proposed.row.idempotencyKey.startsWith("exception-closure-proposal:")) throw new ConflictError("Exception proposal identity requires review.")
    if (proposed.data.proposedById === control.actorId) throw new BusinessRuleError("Another authorized reviewer must decide exception closure.", "SOD_VIOLATION")
    if (!await tx.ledgerAuditEvent.findFirst({ where: { organizationId: control.organizationId, resourceId: command.exceptionId, actorId: proposed.data.proposedById, action: "EXCEPTION_CLOSURE_PROPOSE", metadata: { path: ["proposalId"], equals: command.proposalId } } })) throw new ConflictError("The retained proposal audit is missing.")
    await tx.$queryRaw`SELECT id FROM payment_exceptions WHERE id = ${command.exceptionId} AND "organizationId" = ${control.organizationId} FOR UPDATE`
    const prior = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, idempotencyKey: key } })
    if (prior) {
      const saved = await receipt(tx, control.organizationId, command.exceptionId, prior.id)
      if (saved.data.commandHash !== commandHash) throw new IdempotencyConflictError()
      const approved = command.decision === "APPROVE"
      if (saved.data.kind !== (approved ? "EXCEPTION_CLOSURE_APPROVED_V1" : "EXCEPTION_CLOSURE_REJECTED_V1") || saved.data.proposalId !== command.proposalId
        || !await tx.ledgerAuditEvent.findFirst({ where: { organizationId: control.organizationId, resourceId: command.exceptionId, actorId: control.actorId,
          action: approved ? "EXCEPTION_CLOSURE_APPROVE" : "EXCEPTION_CLOSURE_REJECT", metadata: { path: ["receiptId"], equals: prior.id } } })) throw new ConflictError("The retained exception decision audit is incomplete.")
      if (approved) await exceptionClosureManifestEvidenceInTx(tx, control.organizationId, { id: command.exceptionId, status: "RESOLVED" })
      return { receiptId: prior.id, outcome: approved ? "RESOLVED" as const : "REJECTED" as const, replayed: true }
    }
    const current = await source(tx, control.organizationId, command.exceptionId)
    if (!openStatuses.has(current.exception.status) || command.expectedRevision !== current.revision || proposed.data.reviewedRevision !== current.revision) throw new ConflictError("Exception or financial evidence changed after the proposal. Refresh and propose again.")
    const approved = command.decision === "APPROVE", now = control.now ?? new Date(), id = randomUUID(), exception = current.exception, run = current.run
    const change = { status: "RESOLVED" as const, resolvedAt: now, resolutionNotes: command.reason, metadata: json({ ...suspenseMetadata(exception.metadata), closureReceiptId: id }) }
    const body = { kind: approved ? "EXCEPTION_CLOSURE_APPROVED_V1" : "EXCEPTION_CLOSURE_REJECTED_V1", exceptionId: exception.id, proposalId: proposed.row.id, proposedById: proposed.data.proposedById,
      decidedById: control.actorId, decidedAt: now.toISOString(), reason: command.reason, commandHash, reviewedRevision: current.revision, financial: current.financial, sourceHash: current.sourceHash,
      beforeException: exception, afterExceptionHash: approved ? afterHash({ ...exception, ...change }) : afterHash(exception),
      priorRunCertificate: { runId: run.id, status: run.status, signedAt: run.signedAt, signedById: run.signedById, certificateHash: run.certificateHash, certificatePayload: run.certificatePayload } }
    if (approved) {
      if (control.actorId === run.runById) throw new BusinessRuleError("The reconciliation run maker cannot approve exception closure.", "SOD_VIOLATION")
      const updated = await tx.paymentException.updateMany({ where: { id: exception.id, organizationId: control.organizationId, updatedAt: exception.updatedAt, status: exception.status }, data: change })
      if (updated.count !== 1) throw new ConflictError("The exception changed concurrently.")
      await tx.reconciliationRun.update({ where: { id: run.id, organizationId: control.organizationId }, data: { status: "NEEDS_REVIEW", signedAt: null, signedById: null, certificateHash: null, certificatePayload: Prisma.JsonNull,
        metadata: json({ ...suspenseMetadata(run.metadata), immutableAfterSignoff: false, signedSourceVersionHash: null, exceptionClosureInvalidation: { receiptId: id, at: now.toISOString() } }) } })
      await recordCloseCertificationInvalidationsForSourceInTx(tx, control.organizationId, { sourceCode: "PAYMENT_RECONCILIATION_EXCEPTION_DECIDED", sourceId: run.id, periodId: run.accountingPeriodId,
        periodStart: run.periodStart, periodEnd: run.periodEnd, previousEvidenceHash: run.certificateHash, newEvidenceHash: hash(body), correlationId: id, staleReason: "Exception decision changed reconciliation evidence; run review and sign-off are required." }, { actorId: control.actorId, now })
    }
    await record(tx, control, exception.id, key, body, id)
    await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: approved ? "EXCEPTION_CLOSURE_APPROVE" : "EXCEPTION_CLOSURE_REJECT", resourceType: "PaymentException", resourceId: exception.id,
      message: approved ? "Independent exception closure recorded; run remains subject to review" : "Exception closure rejected; original obligation remains", metadata: json({ receiptId: id, proposalId: proposed.row.id }) } })
    await publishPaymentReconciliationNotification({ type: approved ? "payment-reconciliation.exception.closure-approved" : "payment-reconciliation.exception.closure-rejected", organizationId: control.organizationId,
      evidenceRef: { exceptionId: exception.id, suspenseItemId: current.item.id, reconciliationRunId: run.id }, correlationId: id, dedupeKey: id }, tx)
    return { receiptId: id, outcome: approved ? "RESOLVED" as const : "REJECTED" as const, replayed: false }
  })
}
