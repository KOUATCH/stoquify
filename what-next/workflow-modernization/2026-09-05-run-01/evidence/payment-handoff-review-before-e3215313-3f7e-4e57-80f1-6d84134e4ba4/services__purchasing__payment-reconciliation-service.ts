import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, recordBusinessEventInTx, markBusinessEventAppliedInTx } from "@/services/events/business-event.service"
import { paymentRequestScopeSchema, type PaymentRequestScope } from "./payment-request-contracts"
import { paymentReconciliationAuthority, type PaymentReconciliationOperation } from "./payment-reconciliation-authority"
import { lockPaymentReconciliationCloseScopeInTx, invalidatePaymentReconciliationCloseScopeInTx } from "./payment-reconciliation-close"
import { PAYMENT_RECONCILIATION_EVENT, paymentReconciliationRequired, reconciliationJson, reconciliationRecord as record,
  readPaymentReconciliationSourceInTx, readPaymentReconciliationHistoryInTx, readPaymentReconciliationBankEvidenceInTx,
  paymentReconciliationEvidenceSnapshotInTx, readPaymentReconciliationMatchInTx, readCurrentPaymentReconciliationEvidenceInTx,
  type PaymentReconciliationSource } from "./payment-reconciliation-evidence"
import { paymentReconciliationDraftSchema, paymentReconciliationCommandSchema, paymentReconciliationDecisionSchema,
  paymentReconciliationReopenSchema, paymentReconciliationFinalizeSchema, paymentReconciliationQuerySchema,
  type PaymentReconciliationDraft, type PaymentReconciliationCommand, type PaymentReconciliationDecision,
  type PaymentReconciliationReopen, type PaymentReconciliationFinalize, type PaymentReconciliationQuery,
  type PaymentReconciliationView, type PaymentReconciliationStatus } from "./payment-reconciliation-contracts"

type Tx = Prisma.TransactionClient
const hash = (value: unknown) => hashBusinessPayload(reconciliationJson(value))
async function transaction<T>(work: (tx: Tx) => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 30000 }) }
    catch (error) {
      const retry = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || (error.code === "P2010" && String(error.meta?.code) === "40P01"))
      if (!retry) throw error
      if (attempt >= 2) throw new ConflictError("Concurrent evidence changes interrupted the operation. Retry the same confirmation.")
    }
  }
}
const statusOf = (history: Awaited<ReturnType<typeof readPaymentReconciliationHistoryInTx>>) => String(record(history.at(-1)?.payload).status ?? "AWAITING_EVIDENCE") as PaymentReconciliationStatus
const independent = (source: PaymentReconciliationSource, actorId: string, proposerId?: string | null) => ![source.payment.requestedById, source.payment.approvedById, source.payment.releasedById, proposerId].includes(actorId)

async function view(tx: Tx, id: string, scope: PaymentRequestScope, authority: Awaited<ReturnType<typeof paymentReconciliationAuthority>>) {
  const source = await readPaymentReconciliationSourceInTx(tx, scope.organizationId, id, false), history = await readPaymentReconciliationHistoryInTx(tx, scope.organizationId, id)
  const last = history.at(-1), data = record(last?.payload), status = statusOf(history), draft = data.draft ? paymentReconciliationDraftSchema.parse(data.draft) : null
  const proposalId = status === "PROPOSED" ? last!.id : typeof data.proposalId === "string" ? data.proposalId : null
  const proposal = history.find(row => row.id === proposalId), canResolve = hasRbacPermission(authority.permissions, "payments.reconciliation.exception.resolve"), canSign = hasRbacPermission(authority.permissions, "payments.reconciliation.sign")
  const destination = source.payment.bankAccountId ? await tx.supplierBankAccount.findFirst({ where: { id: source.payment.bankAccountId, organizationId: scope.organizationId, supplierId: source.payment.supplierId }, select: { bankName: true, accountNumberMasked: true } }) : null
  const statement = draft?.evidence.kind === "BANK_STATEMENT" ? await tx.statementLine.findFirst({ where: { id: draft.evidence.statementLineId, organizationId: scope.organizationId }, include: { statementFile: true, providerAccount: true } }) : null
  let evidenceCurrent = true, matchEvidence: Awaited<ReturnType<typeof readPaymentReconciliationMatchInTx>> | null = null
  if (["CASH_REVIEWED", "RECONCILED", "ADMITTED"].includes(status)) {
    try {
      if (status !== "ADMITTED") { if (!await readCurrentPaymentReconciliationEvidenceInTx(tx, scope.organizationId, id)) throw paymentReconciliationRequired() }
      else {
        if (!draft || draft.evidence.kind !== "BANK_STATEMENT" || source.sourceHash !== data.sourceHash || source.transaction.state !== "CONFIRMED"
          || record(source.transaction.metadata).paymentReconciliationReceiptId !== last?.id || source.exception.status !== "OPEN"
          || hash(await paymentReconciliationEvidenceSnapshotInTx(tx, source, draft.evidence, false)) !== data.evidenceHash) throw paymentReconciliationRequired()
      }
    } catch (error) { if (!(error instanceof BusinessRuleError) && !(error instanceof ConflictError)) throw error; evidenceCurrent = false }
  }
  if (draft?.evidence.kind === "BANK_STATEMENT" && ["ADMITTED", "RECONCILED"].includes(status)) {
    try { matchEvidence = await readPaymentReconciliationMatchInTx(tx, source, draft.evidence.statementLineId) }
    catch (error) { if (!(error instanceof BusinessRuleError) && !(error instanceof ConflictError)) throw error }
  }
  const revision = hash({ sourceHash: source.sourceHash, batchStatus: source.batch.status, journalStatus: source.journal.status, transaction: source.transaction, exception: source.exception,
    history: history.map(row => ({ id: row.id, hash: row.payloadHash })), destination, matchEvidence, evidenceCurrent, statement })
  const result: PaymentReconciliationView = { organizationId: scope.organizationId, actorId: scope.actorId, paymentRequestId: id,
    paymentNumber: source.payment.paymentNumber, supplierName: source.supplier.name, total: source.payment.amount.toFixed(2), currency: source.payment.currency,
    method: source.payment.method, destinationLabel: source.payment.method === "CASH" ? "CASH" : [destination?.bankName, destination?.accountNumberMasked].filter(Boolean).join(" · ") || "UNAVAILABLE",
    executionReference: source.execution.command.draft.executionReference, executedAt: source.execution.command.draft.executedAt,
    status, revision, proposalId, receiptId: last?.id ?? null, evidence: draft?.evidence ?? null, fresh: authority.fresh, checkedAt: new Date().toISOString(),
    statementEvidence: statement && statement.statementFile.organizationId === scope.organizationId && statement.providerAccount.organizationId === scope.organizationId ? { statementLineId: statement.id, providerName: statement.providerAccount.displayName, fileName: statement.statementFile.fileName, reference: statement.providerReference ?? "", total: statement.amount.toFixed(2), currency: statement.currencyCode, occurredAt: statement.occurredAt.toISOString() } : null,
    evidenceCurrent, evidenceIssue: evidenceCurrent ? null : "REVIEW_REQUIRED", bankMatch: matchEvidence ? { matchId: matchEvidence.matchId, runId: matchEvidence.runId } : null,
    canPropose: canResolve && ["AWAITING_EVIDENCE", "REJECTED", "REOPENED"].includes(status),
    canDecide: canResolve && canSign && status === "PROPOSED" && independent(source, scope.actorId, proposal?.actorId),
    canReopen: canResolve && ["ADMITTED", "CASH_REVIEWED", "RECONCILED"].includes(status),
    canFinalize: canResolve && canSign && status === "ADMITTED" && evidenceCurrent && !!matchEvidence && independent(source, scope.actorId, proposal?.actorId),
    history: history.map(row => ({ id: row.id, status: String(record(row.payload).status) as PaymentReconciliationStatus, recordedAt: row.occurredAt.toISOString(), reason: typeof record(row.payload).reason === "string" ? String(record(row.payload).reason) : null })) }
  return { source, history, last, data, draft, result }
}

async function lockSource(tx: Tx, scope: PaymentRequestScope, id: string, draft?: PaymentReconciliationDraft) {
  const previous = await readPaymentReconciliationHistoryInTx(tx, scope.organizationId, id)
  const retained = draft ?? (record(previous.at(-1)?.payload).draft ? paymentReconciliationDraftSchema.parse(record(previous.at(-1)?.payload).draft) : null)
  if (retained?.evidence.kind === "BANK_STATEMENT") {
    const line = await tx.statementLine.findFirst({ where: { id: retained.evidence.statementLineId, organizationId: scope.organizationId }, select: { providerAccountId: true, statementFileId: true } })
    if (!line) throw paymentReconciliationRequired()
    await tx.$queryRaw`SELECT id FROM provider_accounts WHERE id = ${line.providerAccountId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM payment_rails WHERE id = (SELECT "paymentRailId" FROM provider_accounts WHERE id = ${line.providerAccountId} AND "organizationId" = ${scope.organizationId}) AND "organizationId" = ${scope.organizationId} FOR SHARE`
    await tx.$queryRaw`SELECT id FROM settlement_accounts WHERE "providerAccountId" = ${line.providerAccountId} AND "organizationId" = ${scope.organizationId} ORDER BY id FOR SHARE`
    await tx.$queryRaw`SELECT id FROM statement_files WHERE id = ${line.statementFileId} AND "organizationId" = ${scope.organizationId} FOR SHARE`
    await tx.$queryRaw`SELECT id FROM statement_lines WHERE id = ${retained.evidence.statementLineId} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  }
  await tx.$queryRaw`SELECT id FROM supplier_payments WHERE id = ${id} AND "organizationId" = ${scope.organizationId} FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM payment_transactions WHERE "sourceId" = ${id} AND "sourceType" = 'SUPPLIER_PAYMENT' AND "organizationId" = ${scope.organizationId} ORDER BY id FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM payment_exceptions WHERE "sourceId" = ${id} AND "sourceType" = 'SUPPLIER_PAYMENT' AND "organizationId" = ${scope.organizationId} ORDER BY id FOR UPDATE`
  await tx.$queryRaw`SELECT id FROM ledger_posting_batches WHERE "sourceId" = ${id} AND "sourceType"::text = 'SUPPLIER_PAYMENT' AND "organizationId" = ${scope.organizationId} ORDER BY id FOR SHARE`
  await tx.$queryRaw`SELECT id FROM journal_entries WHERE "sourceId" = ${id} AND "sourceType"::text = 'SUPPLIER_PAYMENT' AND "organizationId" = ${scope.organizationId} ORDER BY id FOR SHARE`
}

async function ensureEvidenceOwnership(tx: Tx, scope: PaymentRequestScope, draft: PaymentReconciliationDraft) {
  const evidence = draft.evidence, keys = evidence.kind === "BANK_STATEMENT" ? [`bank-line:${evidence.statementLineId}`] : [`cash-hash:${evidence.evidenceSha256}`, `cash-reference:${evidence.voucherReference}`]
  for (const key of keys.sort()) { const lock = JSON.stringify(["supplier-payment-evidence", scope.organizationId, key]); await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))::text` }
  const events = await tx.businessEvent.findMany({ where: { organizationId: scope.organizationId, eventType: PAYMENT_RECONCILIATION_EVENT, sourceType: "SUPPLIER_PAYMENT", sourceId: { not: draft.paymentRequestId }, OR: keys.map(key => ({ payload: { path: ["evidenceKeys"], array_contains: key } })) }, select: { sourceId: true } })
  for (const id of [...new Set(events.map(event => event.sourceId).filter((id): id is string => !!id))]) {
    const history = await readPaymentReconciliationHistoryInTx(tx, scope.organizationId, id)
    if (["ADMITTED", "RECONCILED", "CASH_REVIEWED"].includes(statusOf(history)) || (evidence.kind === "CASH_VOUCHER" && history.some(event => record(event.payload).status === "CASH_REVIEWED"))) throw new ConflictError("This evidence is already assigned to another supplier payment.")
  }
  return keys
}

async function preview(tx: Tx, draft: PaymentReconciliationDraft, scope: PaymentRequestScope, authority: Awaited<ReturnType<typeof paymentReconciliationAuthority>>) {
  const current = await view(tx, draft.paymentRequestId, scope, authority)
  if (!current.result.canPropose) throw new ConflictError("Review or reopen the existing decision before proposing new evidence.")
  const source = await readPaymentReconciliationSourceInTx(tx, scope.organizationId, draft.paymentRequestId)
  if (source.transaction.state !== "PENDING" || source.transaction.providerAuthorityEventId || source.transaction.providerAccountId || source.exception.status !== "OPEN") throw paymentReconciliationRequired()
  const snapshot = await paymentReconciliationEvidenceSnapshotInTx(tx, source, draft.evidence, true), evidenceHash = hash(snapshot)
  return { current, snapshot, evidenceHash, result: { ...current.result, draft, revision: hash({ revision: current.result.revision, draft, evidenceHash }) } }
}

export async function previewPaymentReconciliation(input: PaymentReconciliationDraft, scopeInput: PaymentRequestScope) {
  const draft = paymentReconciliationDraftSchema.parse(input), scope = paymentRequestScopeSchema.parse(scopeInput)
  return transaction(async tx => (await preview(tx, draft, scope, await paymentReconciliationAuthority(tx, scope, "propose", false))).result)
}
export async function reviewPaymentReconciliation(id: string, scopeInput: PaymentRequestScope) {
  const scope = paymentRequestScopeSchema.parse(scopeInput)
  return transaction(async tx => (await view(tx, id, scope, await paymentReconciliationAuthority(tx, scope, "read", false))).result)
}
export const readPaymentReconciliation = reviewPaymentReconciliation

type Command = PaymentReconciliationCommand | PaymentReconciliationDecision | PaymentReconciliationReopen | PaymentReconciliationFinalize
async function commit(operation: Exclude<PaymentReconciliationOperation, "read">, command: Command, scopeInput: PaymentRequestScope) {
  const scope = paymentRequestScopeSchema.parse(scopeInput), id = "draft" in command ? command.draft.paymentRequestId : command.paymentRequestId, commandHash = hash({ command, actorId: scope.actorId, operation })
  return transaction(async tx => {
    let authority = await paymentReconciliationAuthority(tx, scope, operation, true)
    const affectedPeriodIds = await lockPaymentReconciliationCloseScopeInTx(tx, scope.organizationId)
    const lock = JSON.stringify(["supplier-payment-reconciliation-command", scope.organizationId, command.idempotencyKey]); await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))::text`
    await lockSource(tx, scope, id, "draft" in command ? command.draft : undefined)
    const saved = await tx.businessEvent.findFirst({ where: { organizationId: scope.organizationId, eventSource: "INTERNAL", idempotencyKey: `payment-reconciliation:${command.idempotencyKey}` } })
    if (saved) {
      if (saved.eventType !== PAYMENT_RECONCILIATION_EVENT || saved.sourceId !== id || saved.actorId !== scope.actorId || record(saved.payload).commandHash !== commandHash) throw new IdempotencyConflictError()
      authority = await paymentReconciliationAuthority(tx, scope, operation, true)
      return { ...(await view(tx, id, scope, authority)).result, requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, replayed: true }
    }
    let current = await view(tx, id, scope, authority), draft = current.draft, evidenceHash = String(current.data.evidenceHash ?? ""), snapshot: unknown = current.data.evidenceSnapshot
    let nextStatus: PaymentReconciliationStatus, proposalId: string | null = current.result.proposalId, approvalId: string | null = typeof current.data.approvalId === "string" ? current.data.approvalId : null
    let evidenceKeys: string[] = [], match: Awaited<ReturnType<typeof readPaymentReconciliationMatchInTx>> | null = null
    if (operation === "propose" && "draft" in command) {
      const p = await preview(tx, command.draft, scope, authority)
      if (p.result.revision !== command.expectedRevision) throw new ConflictError("Payment or evidence changed. Review a fresh proposal.")
      current = p.current; draft = command.draft; evidenceHash = p.evidenceHash; snapshot = p.snapshot; nextStatus = "PROPOSED"; proposalId = null
    } else {
      if (current.result.revision !== command.expectedRevision) throw new ConflictError("Payment evidence changed. Review the current record before confirming.")
      if (!draft) throw paymentReconciliationRequired()
      if (operation === "decide" && "decision" in command) {
        if (!current.result.canDecide || command.proposalId !== current.result.proposalId) throw new BusinessRuleError("An independent reviewer must decide the current proposal.", "SOD_VIOLATION")
        if (command.decision === "REJECT") nextStatus = "REJECTED"
        else {
          const source = await readPaymentReconciliationSourceInTx(tx, scope.organizationId, id)
          snapshot = await paymentReconciliationEvidenceSnapshotInTx(tx, source, draft.evidence, true)
          if (hash(snapshot) !== evidenceHash || source.sourceHash !== current.data.sourceHash || source.transaction.state !== "PENDING" || source.exception.status !== "OPEN") throw paymentReconciliationRequired()
          nextStatus = draft.evidence.kind === "BANK_STATEMENT" ? "ADMITTED" : "CASH_REVIEWED"
        }
      } else if (operation === "finalize") {
        if (!current.result.canFinalize || draft.evidence.kind !== "BANK_STATEMENT") throw new BusinessRuleError("Independent review of an admitted bank payment is required.", "SOD_VIOLATION")
        const source = await readPaymentReconciliationSourceInTx(tx, scope.organizationId, id)
        snapshot = await paymentReconciliationEvidenceSnapshotInTx(tx, source, draft.evidence, false)
        if (hash(snapshot) !== evidenceHash || source.sourceHash !== current.data.sourceHash || source.transaction.state !== "CONFIRMED" || source.exception.status !== "OPEN") throw paymentReconciliationRequired()
        match = await readPaymentReconciliationMatchInTx(tx, source, draft.evidence.statementLineId)
        approvalId = current.last!.id; nextStatus = "RECONCILED"
      } else if (operation === "reopen") {
        if (!current.result.canReopen) throw new ConflictError("Only an admitted or completed evidence decision can be reopened.")
        if (draft.evidence.kind === "BANK_STATEMENT" && (await tx.matchRecord.count({ where: { organizationId: scope.organizationId, paymentTransactionId: current.source.transaction.id, status: { in: ["PROPOSED", "AUTO_MATCHED", "APPROVED", "CORRECTED"] } } }) || await tx.suspenseItem.count({ where: { organizationId: scope.organizationId, paymentTransactionId: current.source.transaction.id } }))) throw new BusinessRuleError("Bank evidence already has matching or suspense effects. Complete the reconciliation correction workflow before reopening the supplier handoff.", "REVIEW_REQUIRED")
        nextStatus = "REOPENED"
      } else throw paymentReconciliationRequired()
    }
    if (!draft) throw paymentReconciliationRequired()
    if (["PROPOSED", "ADMITTED", "CASH_REVIEWED", "RECONCILED"].includes(nextStatus)) evidenceKeys = await ensureEvidenceOwnership(tx, scope, draft)
    // Any lock can outlive the assurance window or grant validity. Recheck after all waits and before effects.
    authority = await paymentReconciliationAuthority(tx, scope, operation, true)
    const recordedAt = new Date(), payload = { version: 1, organizationId: scope.organizationId, actorId: scope.actorId, paymentRequestId: id,
      operation, command, status: nextStatus, previousId: current.last?.id ?? null, proposalId, approvalId, draft, evidenceSnapshot: snapshot,
      evidenceHash, evidenceKeys, sourceHash: current.source.sourceHash, match, requestReference: command.idempotencyKey,
      reviewedRevision: command.expectedRevision, commandHash, recordedAt: recordedAt.toISOString(), reason: "reason" in command ? command.reason : null }
    const savedEvent = await recordBusinessEventInTx(tx, { organizationId: scope.organizationId, actorId: scope.actorId, eventType: PAYMENT_RECONCILIATION_EVENT,
      eventSource: "INTERNAL", sourceType: "SUPPLIER_PAYMENT", sourceId: id, idempotencyKey: `payment-reconciliation:${command.idempotencyKey}`, occurredAt: recordedAt,
      postingBatchId: current.source.batch.id, payload: reconciliationJson(payload) })
    if (!savedEvent.created) throw new ConflictError("Evidence already exists. Retry the same request.")
    const receiptId = savedEvent.event.id
    if (["ADMITTED", "CASH_REVIEWED", "RECONCILED", "REOPENED"].includes(nextStatus)) {
      const bank = draft.evidence.kind === "BANK_STATEMENT" && nextStatus !== "REOPENED" ? await readPaymentReconciliationBankEvidenceInTx(tx, current.source, draft.evidence.statementLineId, nextStatus === "ADMITTED") : null
      const changed = await tx.paymentTransaction.updateMany({ where: { id: current.source.transaction.id, organizationId: scope.organizationId, state: current.source.transaction.state, updatedAt: current.source.transaction.updatedAt }, data: {
        state: nextStatus === "REOPENED" ? "PENDING" : "CONFIRMED", confirmedAt: nextStatus === "REOPENED" ? null : current.source.transaction.confirmedAt ?? recordedAt,
        providerAccountId: bank?.provider.id ?? null, providerReference: bank ? current.source.execution.command.draft.executionReference : current.source.payment.paymentNumber,
        providerTransactionId: bank?.line.providerTransactionId ?? null, metadata: { ...record(current.source.transaction.metadata), paymentReconciliationReceiptId: receiptId } } })
      if (changed.count !== 1) throw new ConflictError("The payment changed during review.")
      if (nextStatus !== "ADMITTED") {
        const changedException = await tx.paymentException.updateMany({ where: { id: current.source.exception.id, organizationId: scope.organizationId, status: current.source.exception.status, updatedAt: current.source.exception.updatedAt },
          data: { status: nextStatus === "REOPENED" ? "OPEN" : "RESOLVED", resolvedAt: nextStatus === "REOPENED" ? null : recordedAt,
            resolutionNotes: nextStatus === "REOPENED" ? "Evidence review reopened; retained financial records are unchanged." : nextStatus === "CASH_REVIEWED" ? "Cash disbursement voucher independently reviewed; no external settlement certification." : "Original supplier payment matched by the actual provider reconciliation workflow.",
            metadata: { ...record(current.source.exception.metadata), paymentReconciliationReceiptId: receiptId } } })
        if (changedException.count !== 1) throw new ConflictError("The original payment exception changed during review.")
      }
    }
    await markBusinessEventAppliedInTx(tx, scope.organizationId, receiptId)
    await tx.auditLog.create({ data: { organizationId: scope.organizationId, userId: scope.actorId, entityType: "SupplierPayment", entityId: id, action: "SUPPLIER_PAYMENT_RECONCILIATION", changes: { receiptId, status: nextStatus, previousId: current.last?.id ?? null, proposalId, evidenceHash } } })
    await invalidatePaymentReconciliationCloseScopeInTx(tx, scope.organizationId, { paymentRequestId: id, actorId: scope.actorId, affectedPeriodIds, receiptId })
    if (["CASH_REVIEWED", "RECONCILED"].includes(nextStatus)) await readCurrentPaymentReconciliationEvidenceInTx(tx, scope.organizationId, id)
    return { ...(await view(tx, id, scope, authority)).result, requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, replayed: false }
  })
}
export const proposePaymentReconciliation = (input: PaymentReconciliationCommand, scope: PaymentRequestScope) => commit("propose", paymentReconciliationCommandSchema.parse(input), scope)
export const decidePaymentReconciliation = (input: PaymentReconciliationDecision, scope: PaymentRequestScope) => commit("decide", paymentReconciliationDecisionSchema.parse(input), scope)
export const reopenPaymentReconciliation = (input: PaymentReconciliationReopen, scope: PaymentRequestScope) => commit("reopen", paymentReconciliationReopenSchema.parse(input), scope)
export const finalizePaymentReconciliation = (input: PaymentReconciliationFinalize, scope: PaymentRequestScope) => commit("finalize", paymentReconciliationFinalizeSchema.parse(input), scope)

export async function loadPaymentReconciliationSources(input: PaymentReconciliationQuery, scopeInput: PaymentRequestScope) {
  const query = paymentReconciliationQuerySchema.parse(input), scope = paymentRequestScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await paymentReconciliationAuthority(tx, scope, "read", false)
    const payments = await tx.supplierPayment.findMany({ where: { organizationId: scope.organizationId, deletedAt: null, status: { in: ["RELEASED", "POSTED"] }, method: { in: ["CASH", "BANK_TRANSFER"] },
      ...(query.after ? { id: { gt: query.after } } : {}), OR: [{ paymentNumber: { contains: query.search, mode: "insensitive" } }, { supplier: { organizationId: scope.organizationId, name: { contains: query.search, mode: "insensitive" } } }] },
      select: { id: true, paymentNumber: true, amount: true, currency: true, method: true, supplier: { select: { name: true } } }, orderBy: { id: "asc" }, take: 26 })
    const rows = await Promise.all(payments.slice(0, 25).map(async payment => ({ id: payment.id, number: payment.paymentNumber, supplierName: payment.supplier.name, total: payment.amount.toFixed(2), currency: payment.currency, method: payment.method,
      status: statusOf(await readPaymentReconciliationHistoryInTx(tx, scope.organizationId, payment.id)) })))
    return { organizationId: scope.organizationId, actorId: scope.actorId, checkedAt: new Date().toISOString(), next: payments.length > 25 ? payments[24].id : null, rows }
  })
}
export async function loadPaymentReconciliationEvidenceChoices(id: string, scopeInput: PaymentRequestScope) {
  const scope = paymentRequestScopeSchema.parse(scopeInput)
  return transaction(async tx => {
    await paymentReconciliationAuthority(tx, scope, "read", false)
    const source = await readPaymentReconciliationSourceInTx(tx, scope.organizationId, id)
    const candidates = source.payment.method === "BANK_TRANSFER" ? await tx.statementLine.findMany({ where: { organizationId: scope.organizationId, status: "UNMATCHED", direction: "DEBIT", amount: source.payment.amount, currencyCode: source.payment.currency, providerReference: source.execution.command.draft.executionReference, archivedAt: null }, orderBy: { id: "asc" }, take: 51 }) : []
    const rows: Array<{ statementLineId: string; providerName: string; fileName: string | null; reference: string; total: string; currency: string; occurredAt: string }> = []
    for (const line of candidates.slice(0, 50)) {
      try { const proof = await readPaymentReconciliationBankEvidenceInTx(tx, source, line.id, true); rows.push({ statementLineId: line.id, providerName: proof.provider.displayName, fileName: proof.line.statementFile.fileName, reference: line.providerReference!, total: line.amount.toFixed(2), currency: line.currencyCode, occurredAt: line.occurredAt.toISOString() }) }
      catch (error) { if (!(error instanceof BusinessRuleError)) throw error }
    }
    return { organizationId: scope.organizationId, actorId: scope.actorId, paymentRequestId: id, checkedAt: new Date().toISOString(), truncated: candidates.length > 50, rows }
  })
}
