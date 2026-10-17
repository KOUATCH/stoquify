import { loadSourceDecisionWithdrawalInTx } from "./payment-source-decision-withdrawal"
import { loadExceptionClosureSourceInTx as source, loadExceptionClosureReceiptInTx as receipt, exceptionClosureStateHash as afterHash, exceptionClosureManifestEvidenceInTx, financialExceptionClosureTypes } from "./payment-exception-closure-evidence.service"
import { isCorroboratingSourceCase } from "./payment-corroborating-source-evidence"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { FreshAuthRequiredError } from "@/lib/security/auth-session"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { lockReconciliationCloseCatalogInTx, lockReconciliationClosePeriodsInTx, withReconciliationCloseRetry } from "./reconciliation-close-order.service"
import type { SuspenseCorrectionControl } from "./payment-suspense-correction.service"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"
import { exceptionClosureReadSchema, exceptionClosureProposalSchema, exceptionClosureDecisionSchema, exceptionClosureCasesSchema, exceptionClosureHistorySchema, type ExceptionClosureProposal, type ExceptionClosureDecision } from "./payment-exception-closure.contracts"

type Tx = Prisma.TransactionClient
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
const hash = (value: unknown) => suspenseEvidenceHash(json(value))
const openStatuses = new Set(["OPEN", "ASSIGNED", "ACKNOWLEDGED", "ESCALATED", "RESOLUTION_PROPOSED", "REOPENED"])

async function loadSource(tx: Tx, organizationId: string, exceptionId: string, purpose?: "REOPEN_SOURCE") {
  return purpose === "REOPEN_SOURCE" ? loadSourceDecisionWithdrawalInTx(tx, organizationId, exceptionId) : { ...await source(tx, organizationId, exceptionId), withdrawal: null }
}
const canPropose = (current: Awaited<ReturnType<typeof loadSource>>) => current.withdrawal ? current.exception.status === "RESOLVED" : openStatuses.has(current.exception.status)
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
export async function previewExceptionClosure(input: { exceptionId: string; purpose?: "REOPEN_SOURCE" }, control: SuspenseCorrectionControl) {
  const command = exceptionClosureReadSchema.parse(input)
  return db.$transaction(async tx => {
    await authorize(tx, control)
    const current = await loadSource(tx, control.organizationId, command.exceptionId, command.purpose)
    return { exceptionId: current.exception.id, type: current.exception.type, status: current.exception.status, suspenseItemId: current.item.id, runId: current.run.id,
      financialDecisionId: current.financial?.decisionId ?? null, financialOutcome: current.financial ? current.item.status : null, sourceReview: current.sourceReview, revision: current.revision,
      purpose: command.purpose, withdrawal: current.withdrawal, canPropose: canPropose(current), separateExceptionDecisionRequired: true, asOf: (control.now ?? new Date()).toISOString() }
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
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, type: true, status: true, suspenseItemId: true, createdAt: true, evidence: true } })
    const total = await tx.paymentException.count({ where })
    return { items: rows.slice(0, pageSize).map(({ evidence, ...row }) => ({ ...row, createdAt: row.createdAt.toISOString(),
      closurePath: financialExceptionClosureTypes.has(row.type) ? "FINANCIAL_REVIEW" as const : isCorroboratingSourceCase({ ...row, evidence }) ? "SOURCE_REVIEW" as const : "INVESTIGATION_REQUIRED" as const })),
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
    || proposed.data.purpose !== saved.data.purpose || hash(proposed.data.withdrawal ?? null) !== hash(saved.data.withdrawal ?? null) || proposed.data.sourceHash !== saved.data.sourceHash || hash(proposed.data.financial) !== hash(saved.data.financial) || hash(proposed.data.sourceReview ?? null) !== hash(saved.data.sourceReview ?? null)) throw new ConflictError("Historical exception proposal lineage requires review.")
  return saved
}
export async function readExceptionClosureHistory(input: unknown, control: SuspenseCorrectionControl) {
  const command = exceptionClosureHistorySchema.parse(input)
  return db.$transaction(async tx => {
    await authorize(tx, control)
    const exception = await tx.paymentException.findFirst({ where: { id: command.exceptionId, organizationId: control.organizationId },
      select: { id: true, status: true, type: true, suspenseItemId: true, evidence: true } })
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
        purpose: saved.data.purpose === "REOPEN_SOURCE" ? "REOPEN_SOURCE" as const : null,
        requiresCurrentReview: saved.proposal && !decisionId && (saved.data.purpose === "REOPEN_SOURCE" ? exception.status === "RESOLVED" : openStatuses.has(exception.status)) })
    }
    const { evidence, ...publicException } = exception
    return { exception: { ...publicException, canWithdrawSourceDecision: exception.status === "RESOLVED" && isCorroboratingSourceCase(exception) }, items, total, nextCursor: nextPage(rows), asOf: (control.now ?? new Date()).toISOString() }
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
    const current = await loadSource(tx, control.organizationId, command.exceptionId, command.purpose)
    if (!canPropose(current) || command.expectedRevision !== current.revision) throw new ConflictError("Exception or financial evidence changed. Review the current source.")
    const row = await record(tx, control, command.exceptionId, key, { kind: "EXCEPTION_CLOSURE_PROPOSED_V1", requestHash, exceptionId: command.exceptionId,
      proposedById: control.actorId, proposedAt: (control.now ?? new Date()).toISOString(), reason: command.reason, reviewedRevision: current.revision, financial: current.financial, sourceReview: current.sourceReview, sourceHash: current.sourceHash, ...(current.withdrawal ? { purpose: "REOPEN_SOURCE", withdrawal: current.withdrawal } : {}) })
    await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "EXCEPTION_CLOSURE_PROPOSE", resourceType: "PaymentException", resourceId: command.exceptionId,
      message: current.withdrawal ? "Source approval withdrawal proposed; current decision retained pending independent review" : "Exception closure proposed for independent decision; financial treatment unchanged", metadata: json({ proposalId: row.id, reviewedRevision: current.revision }) } })
    await publishPaymentReconciliationNotification({ type: current.withdrawal ? "payment-reconciliation.exception.source-withdrawal-proposed" : "payment-reconciliation.exception.closure-proposed", organizationId: control.organizationId, evidenceRef: { exceptionId: command.exceptionId, suspenseItemId: current.item.id, reconciliationRunId: current.run.id }, correlationId: row.id, dedupeKey: row.id }, tx)
    return { proposalId: row.id, replayed: false }
  })
}
export async function reviewExceptionClosure(exceptionId: string, proposalId: string, control: SuspenseCorrectionControl) {
  const parsed = exceptionClosureReadSchema.parse({ exceptionId })
  return db.$transaction(async tx => {
    await authorize(tx, control)
    const proposed = await receipt(tx, control.organizationId, parsed.exceptionId, proposalId)
    if (proposed.data.kind !== "EXCEPTION_CLOSURE_PROPOSED_V1" || proposed.data.exceptionId !== parsed.exceptionId) throw new ConflictError("Exception proposal identity requires review.")
    const purpose = proposed.data.purpose === "REOPEN_SOURCE" ? "REOPEN_SOURCE" as const : undefined
    const current = await loadSource(tx, control.organizationId, parsed.exceptionId, purpose)
    if (proposed.data.reviewedRevision !== current.revision || !canPropose(current)) throw new ConflictError("This proposal is no longer current. Review the exception again.")
    return { exceptionId: parsed.exceptionId, proposalId, revision: current.revision, proposedById: String(proposed.data.proposedById), reason: String(proposed.data.reason),
      purpose, withdrawal: current.withdrawal, financialDecisionId: current.financial?.decisionId ?? null, financialOutcome: current.financial ? current.item.status : null, sourceReview: current.sourceReview, runMakerId: current.run.runById, runId: current.run.id, asOf: (control.now ?? new Date()).toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
export async function decideExceptionClosure(input: ExceptionClosureDecision, control: SuspenseCorrectionControl) {
  const startedAt = Date.now(), requestNow = control.now ?? new Date()
  const command = exceptionClosureDecisionSchema.parse(input), key = "exception-closure-decision:" + command.proposalId, commandHash = hash({ command, actorId: control.actorId, organizationId: control.organizationId })
  return withReconciliationCloseRetry(() => transaction(async tx => {
    await authorize(tx, { ...control, now: requestNow }, true)
    const proposed = await receipt(tx, control.organizationId, command.exceptionId, command.proposalId)
    if (proposed.data.kind !== "EXCEPTION_CLOSURE_PROPOSED_V1" || typeof proposed.data.proposedById !== "string" || !proposed.row.idempotencyKey.startsWith("exception-closure-proposal:")) throw new ConflictError("Exception proposal identity requires review.")
    const purpose = proposed.data.purpose === "REOPEN_SOURCE" ? "REOPEN_SOURCE" as const : undefined
    if (proposed.data.proposedById === control.actorId) throw new BusinessRuleError("Another authorized reviewer must decide exception closure.", "SOD_VIOLATION")
    if (!await tx.ledgerAuditEvent.findFirst({ where: { organizationId: control.organizationId, resourceId: command.exceptionId, actorId: proposed.data.proposedById, action: "EXCEPTION_CLOSURE_PROPOSE", metadata: { path: ["proposalId"], equals: command.proposalId } } })) throw new ConflictError("The retained proposal audit is missing.")
    const prior = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, idempotencyKey: key } })
    if (prior) {
      const saved = await receipt(tx, control.organizationId, command.exceptionId, prior.id)
      if (saved.data.commandHash !== commandHash) throw new IdempotencyConflictError()
      const approved = command.decision === "APPROVE"
      if (saved.data.kind !== (approved ? "EXCEPTION_CLOSURE_APPROVED_V1" : "EXCEPTION_CLOSURE_REJECTED_V1") || saved.data.proposalId !== command.proposalId
        || !await tx.ledgerAuditEvent.findFirst({ where: { organizationId: control.organizationId, resourceId: command.exceptionId, actorId: control.actorId,
          action: approved ? "EXCEPTION_CLOSURE_APPROVE" : "EXCEPTION_CLOSURE_REJECT", metadata: { path: ["receiptId"], equals: prior.id } } })) throw new ConflictError("The retained exception decision audit is incomplete.")
      if (purpose) await historicalDecision(tx, control.organizationId, command.exceptionId, prior.id)
      else if (approved) await exceptionClosureManifestEvidenceInTx(tx, control.organizationId, { id: command.exceptionId, status: "RESOLVED" })
      return { receiptId: prior.id, outcome: approved ? purpose ? "REOPENED" as const : "RESOLVED" as const : "REJECTED" as const, replayed: true }
    }
    const approved = command.decision === "APPROVE"
    if (approved) await lockReconciliationCloseCatalogInTx(tx, control.organizationId)
    const current = await loadSource(tx, control.organizationId, command.exceptionId, purpose)
    if (!canPropose(current) || command.expectedRevision !== current.revision || proposed.data.reviewedRevision !== current.revision) throw new ConflictError("Exception or financial evidence changed after the proposal. Refresh and propose again.")
    if (proposed.data.sourceHash !== current.sourceHash || hash(proposed.data.financial) !== hash(current.financial)
      || hash(proposed.data.sourceReview ?? null) !== hash(current.sourceReview) || hash(proposed.data.withdrawal ?? null) !== hash(current.withdrawal)) throw new ConflictError("The retained proposal does not match its reviewed evidence.")
    const now = control.now ?? new Date(), id = randomUUID(), exception = current.exception, run = current.run
    if (current.sourceReview && !current.withdrawal && (run.signedAt || run.signedById || run.certificateHash || !["NEEDS_REVIEW", "READY_FOR_SIGNOFF"].includes(run.status)))
      throw new ConflictError("Signed reconciliation evidence requires its source recovery workflow.")
    if (approved && current.sourceReview) {
      if ((current.withdrawal?.excludedApproverIds ?? current.sourceReview.excludedApproverIds).includes(control.actorId)) throw new BusinessRuleError("An independent reviewer must decide the retained-source investigation.", "SOD_VIOLATION")
      await getOpenPeriodForDate(control.organizationId, run.businessDate, tx)
    }
    // Close consumes reconciliation across the tenant. Acquire the complete
    // assessment set before the exception row to match other source producers.
    const affectedPeriodIds = approved ? await lockReconciliationClosePeriodsInTx(tx, control.organizationId) : []
    await tx.$queryRaw`SELECT id FROM payment_exceptions WHERE id = ${command.exceptionId} AND "organizationId" = ${control.organizationId} FOR UPDATE`
    await authorize(tx, { ...control, now: new Date(requestNow.getTime() + Math.max(0, Date.now() - startedAt)) }, true)
    const { nonfinancialExceptionId: _priorNonfinancialExceptionId, ...retainedSuspenseMetadata } = suspenseMetadata(current.item.metadata)
    const suspenseChange = { status: current.withdrawal ? "REOPENED" as const : "RESOLVED" as const, resolvedAt: current.withdrawal ? null : now, resolutionNotes: command.reason,
      metadata: json({ ...retainedSuspenseMetadata, ...(current.withdrawal ? {} : { nonfinancialExceptionId: exception.id }), nonfinancialClosureReceiptId: current.withdrawal ? null : id,
        ...(current.withdrawal ? { latestSourceWithdrawalReceiptId: id } : {}) }) }
    const change = { status: current.withdrawal ? "REOPENED" as const : "RESOLVED" as const, resolvedAt: current.withdrawal ? null : now, resolutionNotes: command.reason,
      metadata: json({ ...suspenseMetadata(exception.metadata), closureReceiptId: current.withdrawal ? null : id, ...(current.withdrawal ? { latestSourceWithdrawalReceiptId: id } : {}) }) }
    const body = { kind: approved ? "EXCEPTION_CLOSURE_APPROVED_V1" : "EXCEPTION_CLOSURE_REJECTED_V1", exceptionId: exception.id, proposalId: proposed.row.id, proposedById: proposed.data.proposedById,
      decidedById: control.actorId, decidedAt: now.toISOString(), reason: command.reason, commandHash, reviewedRevision: current.revision, financial: current.financial, sourceReview: current.sourceReview, sourceHash: current.sourceHash,
      ...(current.sourceReview && approved ? { afterSuspenseHash: afterHash({ ...current.item, ...suspenseChange }) } : {}),
      ...(current.withdrawal ? { purpose: "REOPEN_SOURCE", withdrawal: current.withdrawal, beforeSuspense: current.item } : {}),
      beforeException: exception, afterExceptionHash: approved ? afterHash({ ...exception, ...change }) : afterHash(exception),
      priorRunCertificate: { runId: run.id, status: run.status, signedAt: run.signedAt, signedById: run.signedById, certificateHash: run.certificateHash, certificatePayload: run.certificatePayload } }
    if (approved) {
      if (control.actorId === run.runById) throw new BusinessRuleError("The reconciliation run maker cannot approve exception closure.", "SOD_VIOLATION")
      const updated = await tx.paymentException.updateMany({ where: { id: exception.id, organizationId: control.organizationId, updatedAt: exception.updatedAt, status: exception.status }, data: change })
      if (updated.count !== 1) throw new ConflictError("The exception changed concurrently.")
      if (current.sourceReview) {
        const changed = await tx.suspenseItem.updateMany({ where: { id: current.item.id, organizationId: control.organizationId, updatedAt: current.item.updatedAt, status: current.item.status, ledgerPostingBatchId: null, postedAt: null }, data: suspenseChange })
        if (changed.count !== 1) throw new ConflictError("The investigation changed concurrently.")
        const changedRun = await tx.reconciliationRun.updateMany({ where: { id: run.id, organizationId: control.organizationId, updatedAt: run.updatedAt, status: run.status, signedAt: run.signedAt, signedById: run.signedById, certificateHash: run.certificateHash },
          data: { status: "NEEDS_REVIEW", updatedAt: now, ...(current.withdrawal ? { signedAt: null, signedById: null, certificateHash: null, certificatePayload: Prisma.JsonNull } : {}),
            metadata: json({ ...suspenseMetadata(run.metadata), ...(current.withdrawal ? { immutableAfterSignoff: false, signedSourceVersionHash: null } : {}), exceptionClosureInvalidation: { receiptId: id, at: now.toISOString() } }) } })
        if (changedRun.count !== 1) throw new ConflictError("The reconciliation changed concurrently.")
      } else await tx.reconciliationRun.update({ where: { id: run.id, organizationId: control.organizationId }, data: { status: "NEEDS_REVIEW", signedAt: null, signedById: null, certificateHash: null, certificatePayload: Prisma.JsonNull,
        metadata: json({ ...suspenseMetadata(run.metadata), immutableAfterSignoff: false, signedSourceVersionHash: null, exceptionClosureInvalidation: { receiptId: id, at: now.toISOString() } }) } })
      await recordCloseCertificationInvalidationsForSourceInTx(tx, control.organizationId, { sourceCode: "PAYMENT_RECONCILIATION_EXCEPTION_DECIDED", sourceId: run.id, periodIds: affectedPeriodIds,
        previousEvidenceHash: run.certificateHash, newEvidenceHash: hash(body), correlationId: id, staleReason: "Exception decision changed reconciliation evidence; run review and sign-off are required." }, { actorId: control.actorId, now })
    }
    await record(tx, control, exception.id, key, body, id)
    await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: approved ? "EXCEPTION_CLOSURE_APPROVE" : "EXCEPTION_CLOSURE_REJECT", resourceType: "PaymentException", resourceId: exception.id,
      message: current.withdrawal ? approved ? "Source approval withdrawn; investigation reopened and prior certificate retained" : "Source withdrawal rejected; original decision retained" : approved ? "Independent exception closure recorded; run remains subject to review" : "Exception closure rejected; original obligation remains", metadata: json({ receiptId: id, proposalId: proposed.row.id }) } })
    await publishPaymentReconciliationNotification({ type: current.withdrawal ? approved ? "payment-reconciliation.exception.source-withdrawn" : "payment-reconciliation.exception.source-withdrawal-rejected" : approved ? "payment-reconciliation.exception.closure-approved" : "payment-reconciliation.exception.closure-rejected", organizationId: control.organizationId,
      evidenceRef: { exceptionId: exception.id, suspenseItemId: current.item.id, reconciliationRunId: run.id }, correlationId: id, dedupeKey: id }, tx)
    return { receiptId: id, outcome: approved ? current.withdrawal ? "REOPENED" as const : "RESOLVED" as const : "REJECTED" as const, replayed: false }
  }))
}
