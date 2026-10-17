import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError } from "@/services/_shared/action-errors"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { createAccountingSourceLink } from "@/services/accounting/source-link.service"
import { recordOrderedReversedJournalCloseInvalidationsInTx } from "@/services/accounting/journal-close-invalidation.service"
import { JournalReversalSnapshotChangedError, lockJournalReversalCatalogInTx, lockJournalReversalClosePeriodsInTx } from "@/services/accounting/journal-reversal-order.service"
import { assertSensitiveActionAllowed, auditSensitiveActionDecision, evaluateSensitiveAction, type SensitiveActionDecision } from "@/services/controls/sensitive-action.service"
import { loadVerifiedPostedSuspenseInTx, type SuspenseCorrectionControl } from "./payment-suspense-correction.service"
import { suspenseResolutionManifestEvidenceInTx } from "./payment-suspense-resolution-evidence.service"
import { correctionJournalHash, correctionJournalInclude } from "./payment-suspense-cycle-ledger.service"
import { assertSuspenseResolutionRecoveryInTx } from "./payment-suspense-resolution-recovery-evidence.service"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"
import { suspenseResolutionRecoveryDraftSchema, suspenseResolutionRecoveryProposalSchema, suspenseResolutionRecoveryDecisionSchema,
  type SuspenseResolutionRecoveryDraft, type SuspenseResolutionRecoveryProposal, type SuspenseResolutionRecoveryDecision } from "./payment-suspense-resolution-recovery.contracts"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"

type Tx = Prisma.TransactionClient
type Controlled<T> = { value: T; denied?: never } | { denied: SensitiveActionDecision; value?: never }
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
const nowOf = (control: SuspenseCorrectionControl) => control.now ?? new Date()
async function transaction<T>(work: (tx: Tx) => Promise<Controlled<T>>) {
  for (let attempt = 0; ; attempt += 1) {
  try {
    const result = await db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    if (result.denied) {
      if (result.denied.reasonCode === "SELF_APPROVAL_BLOCKED") throw new BusinessRuleError(result.denied.safeMessage, "SOD_VIOLATION")
      if (result.denied.reasonCode === "MISSING_PERMISSION") throw new ForbiddenError(result.denied.safeMessage)
      assertSensitiveActionAllowed(result.denied); throw new ForbiddenError("Resolution recovery is not authorized.")
    }
    return result.value
  } catch (error) {
    if (error instanceof JournalReversalSnapshotChangedError) {
      if (attempt < 2) continue
      throw new ConflictError("Recovery evidence changed concurrently. Refresh or retry the same request.")
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && (["P2002", "P2034"].includes(error.code)
      || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code))))) throw new ConflictError("Recovery evidence changed concurrently. Refresh or retry the same request.")
    throw error
  }
  }
}
async function actor(tx: Tx, control: SuspenseCorrectionControl, itemId?: string) {
  if (!hasRbacPermission(control.actorPermissions, "payments.reconciliation.read") || !hasRbacPermission(control.actorPermissions, "accounting.journal.read")) throw new ForbiddenError("Reconciliation and accounting journal read permissions are required.")
  if (!await tx.user.findFirst({ where: { id: control.actorId, organizationId: control.organizationId, isActive: true }, select: { id: true } })) throw new ForbiddenError("Active workspace actor is required.")
  if (itemId) await tx.$queryRaw`SELECT id FROM suspense_items WHERE id = ${itemId} AND "organizationId" = ${control.organizationId} FOR UPDATE`
}
function authorization(control: SuspenseCorrectionControl, itemId: string, action: "payment.reconciliation.suspense.propose" | "payment.reconciliation.suspense.post" | "accounting.journal.reverse", subjectActorId?: string) {
  return evaluateSensitiveAction({ action, actorId: control.actorId, organizationId: control.organizationId, actorPermissions: control.actorPermissions, lastAuthAt: control.lastAuthAt,
    now: nowOf(control), resourceType: "SuspenseItem", resourceId: itemId, subjectActorId })
}
async function record(tx: Tx, control: SuspenseCorrectionControl, key: string, itemId: string, body: unknown, id = randomUUID()) {
  const payload = json(body)
  return tx.paymentReconciliationInboxItem.create({ data: { id, organizationId: control.organizationId, source: "SUSPENSE_POST", status: "PROCESSED",
    idempotencyKey: key, externalId: itemId, payloadSummary: payload, payloadHash: suspenseEvidenceHash(payload).slice(7), processedAt: nowOf(control), correlationId: id } })
}
function payload(row: { payloadHash: string; payloadSummary: Prisma.JsonValue | null } | null) {
  if (!row || row.payloadHash !== suspenseEvidenceHash(row.payloadSummary).slice(7)) throw new ConflictError("Resolution recovery record requires evidence review.")
  return suspenseMetadata(row.payloadSummary)
}
async function preview(tx: Tx, draft: SuspenseResolutionRecoveryDraft, control: SuspenseCorrectionControl) {
  const current = await loadVerifiedPostedSuspenseInTx(tx, control, draft.suspenseItemId, { allowResolved: true })
  const proof = await suspenseResolutionManifestEvidenceInTx(tx, control.organizationId, current.item)
  if (!proof) throw new ConflictError("Only a verified final resolution can be reopened.")
  const allocation = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: proof.allocationId, organizationId: control.organizationId, source: "SUSPENSE_POST", status: "PROCESSED", externalId: current.item.id } })
  const allocated = payload(allocation)
  if (typeof allocated.clearingJournalId !== "string") throw new ConflictError("Clearing journal identity requires review.")
  const clearing = await tx.journalEntry.findFirstOrThrow({ where: { id: allocated.clearingJournalId, organizationId: control.organizationId }, include: correctionJournalInclude })
  if (draft.reversalDate < clearing.entryDate.toISOString().slice(0, 10) || draft.reversalDate > nowOf(control).toISOString().slice(0, 10)) throw new BusinessRuleError("Recovery date must be on or after clearing and no later than today.")
  const date = new Date(`${draft.reversalDate}T00:00:00.000Z`), period = await getOpenPeriodForDate(control.organizationId, date, tx)
  const financialHash = suspenseEvidenceHash({ proof, clearingHash: correctionJournalHash(clearing), originalHash: correctionJournalHash(current.journal) })
  return { ...current, clearing, proof, date, period, financialHash, revision: suspenseEvidenceHash({ draft, financialHash, periodId: period.id, status: current.item.status }) }
}
export async function previewSuspenseResolutionRecovery(input: SuspenseResolutionRecoveryDraft, control: SuspenseCorrectionControl) {
  const draft = suspenseResolutionRecoveryDraftSchema.parse(input)
  return db.$transaction(async tx => {
    await actor(tx, control)
    const current = await preview(tx, draft, control)
    return { revision: current.revision, suspenseItemId: current.item.id, allocationId: current.proof.allocationId, priorOutcome: current.item.status,
      outcome: "POSTED_TO_SUSPENSE" as const, amount: current.item.amount.toFixed(2), currencyCode: current.item.currencyCode,
      clearingJournalNumber: current.clearing.entryNumber, originalJournalNumber: current.journal.entryNumber, reversalDate: draft.reversalDate, periodId: current.period.id,
      newFinancialPosting: true, originalPostingRetained: true }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
export async function proposeSuspenseResolutionRecovery(input: SuspenseResolutionRecoveryProposal, control: SuspenseCorrectionControl) {
  const command = suspenseResolutionRecoveryProposalSchema.parse(input), { expectedRevision, idempotencyKey, ...draft } = command
  return transaction(async tx => {
    await actor(tx, control, draft.suspenseItemId)
    const decision = authorization(control, draft.suspenseItemId, "payment.reconciliation.suspense.propose")
    await auditSensitiveActionDecision(tx, decision); if (!decision.allowed) return { denied: decision }
    const key = `suspense-resolution-recovery-proposal:${idempotencyKey}`, requestHash = suspenseEvidenceHash({ command, actorId: control.actorId })
    const existing = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, source: "SUSPENSE_POST", externalId: draft.suspenseItemId, idempotencyKey: key } })
    if (existing) { const saved = payload(existing); if (saved.kind !== "SUSPENSE_RESOLUTION_RECOVERY_PROPOSED_V1" || saved.requestHash !== requestHash) throw new IdempotencyConflictError(); return { value: { proposalId: existing.id, replayed: true } } }
    const current = await preview(tx, draft, control)
    if (current.revision !== expectedRevision) throw new ConflictError("Recovery preview changed. Review current evidence.")
    const row = await record(tx, control, key, current.item.id, { kind: "SUSPENSE_RESOLUTION_RECOVERY_PROPOSED_V1", draft, requestHash, financialHash: current.financialHash,
      allocationId: current.proof.allocationId, proposedById: control.actorId, proposedAt: nowOf(control).toISOString(), clearingPostedById: current.clearing.postedById,
      clearingJournalId: current.clearing.id, clearingJournalHash: correctionJournalHash(current.clearing) })
    await tx.suspenseItem.update({ where: { id: current.item.id }, data: { metadata: json({ ...suspenseMetadata(current.item.metadata), resolutionRecoveryProposalId: row.id }) } })
    await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "SUSPENSE_RESOLUTION_RECOVERY_PROPOSE", resourceType: "SuspenseItem", resourceId: current.item.id, message: "Reopening proposed; final resolution remains effective", metadata: json({ proposalId: row.id }) } })
    await publishPaymentReconciliationNotification({ type: "payment-reconciliation.suspense.recovery-proposed", organizationId: control.organizationId, evidenceRef: { suspenseItemId: current.item.id, reconciliationRunId: current.item.reconciliationRunId }, correlationId: row.id, dedupeKey: row.id }, tx)
    return { value: { proposalId: row.id, replayed: false } }
  })
}
export async function reviewSuspenseResolutionRecovery(itemId: string, proposalId: string, control: SuspenseCorrectionControl) {
  return db.$transaction(async tx => {
    await actor(tx, control)
    const row = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: proposalId, organizationId: control.organizationId, externalId: itemId, source: "SUSPENSE_POST", status: "PROCESSED" } })
    const saved = payload(row), draft = suspenseResolutionRecoveryDraftSchema.parse(saved.draft)
    if (saved.kind !== "SUSPENSE_RESOLUTION_RECOVERY_PROPOSED_V1" || draft.suspenseItemId !== itemId) throw new ConflictError("Recovery proposal source requires review.")
    const current = await preview(tx, draft, control)
    if (suspenseMetadata(current.item.metadata).resolutionRecoveryProposalId !== proposalId || saved.financialHash !== current.financialHash) throw new ConflictError("Recovery proposal was superseded or evidence changed.")
    return { draft, proposalId, revision: suspenseEvidenceHash({ proposalHash: row!.payloadHash, currentRevision: current.revision }), proposedById: String(saved.proposedById), clearingPostedById: String(saved.clearingPostedById),
      amount: current.item.amount.toFixed(2), currencyCode: current.item.currencyCode, clearingJournalNumber: current.clearing.entryNumber, outcome: "POSTED_TO_SUSPENSE" as const }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
export async function decideSuspenseResolutionRecovery(input: SuspenseResolutionRecoveryDecision, control: SuspenseCorrectionControl) {
  const command = suspenseResolutionRecoveryDecisionSchema.parse(input)
  const suppliedControl = control, startedAt = Date.now(), suppliedNow = nowOf(control).getTime()
  const controlNow = () => new Date(suppliedNow + Math.max(0, Date.now() - startedAt))
  return transaction(async tx => {
    const control = { ...suppliedControl, now: controlNow() }
    if (command.decision === "APPROVE") await lockJournalReversalCatalogInTx(tx, control.organizationId, db)
    await actor(tx, control, command.suspenseItemId)
    control.now = controlNow()
    const row = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: command.proposalId, organizationId: control.organizationId, externalId: command.suspenseItemId, source: "SUSPENSE_POST", status: "PROCESSED" } })
    const proposed = payload(row), draft = suspenseResolutionRecoveryDraftSchema.parse(proposed.draft)
    if (proposed.kind !== "SUSPENSE_RESOLUTION_RECOVERY_PROPOSED_V1" || draft.suspenseItemId !== command.suspenseItemId || typeof proposed.proposedById !== "string" || typeof proposed.clearingPostedById !== "string") throw new ConflictError("Recovery maker evidence requires review.")
    for (const [action, subject] of [["payment.reconciliation.suspense.post", proposed.proposedById], ["accounting.journal.reverse", proposed.clearingPostedById]] as const) {
      const decision = authorization(control, command.suspenseItemId, action, subject)
      await auditSensitiveActionDecision(tx, decision); if (!decision.allowed) return { denied: decision }
    }
    const key = `suspense-resolution-recovery-decision:${row!.id}`, commandHash = suspenseEvidenceHash({ command, actorId: control.actorId })
    const existing = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, source: "SUSPENSE_POST", externalId: command.suspenseItemId, idempotencyKey: key } })
    if (existing) {
      const saved = payload(existing)
      if (saved.commandHash !== commandHash) throw new IdempotencyConflictError()
      if (saved.kind === "SUSPENSE_RESOLUTION_RECOVERY_APPROVED_V1" && typeof saved.allocationId === "string") await assertSuspenseResolutionRecoveryInTx(tx, control.organizationId, command.suspenseItemId, saved.allocationId)
      else if (saved.kind !== "SUSPENSE_RESOLUTION_RECOVERY_REJECTED_V1") throw new ConflictError("Recovery decision lineage requires review.")
      return { value: { receiptId: existing.id, outcome: command.decision === "APPROVE" ? "POSTED_TO_SUSPENSE" as const : "REJECTED" as const, replayed: true } }
    }
    if (typeof proposed.clearingJournalId !== "string") throw new ConflictError("Recovery clearing reference is missing.")
    await tx.$queryRaw`SELECT id FROM journal_entries WHERE id = ${proposed.clearingJournalId} AND "organizationId" = ${control.organizationId} FOR UPDATE`
    const current = await preview(tx, draft, control)
    if (suspenseMetadata(current.item.metadata).resolutionRecoveryProposalId !== row!.id || current.financialHash !== proposed.financialHash
      || suspenseEvidenceHash({ proposalHash: row!.payloadHash, currentRevision: current.revision }) !== command.expectedRevision) throw new ConflictError("Recovery evidence changed. Refresh the independent review.")
    const affectedPeriodIds = command.decision === "APPROVE" ? await lockJournalReversalClosePeriodsInTx(tx, control.organizationId, {
      originalPeriodId: current.clearing.periodId, reversalPeriodId: current.period.id,
      originalEntryDate: current.clearing.entryDate, reversalDate: current.date,
      includeLaterPeriods: current.clearing.lines.some(line => line.account.syscohadaClass?.startsWith("3")),
      // Close's getPaymentReconciliationDashboardData collector is tenant-wide.
      includeAllPeriods: true,
      additionalEvidenceDates: current.item.reconciliationRun ? [current.item.reconciliationRun.businessDate] : [],
      additionalPeriodIds: current.clearing.postingBatch?.periodId ? [current.clearing.postingBatch.periodId] : [],
    }, db) : []
    // Recheck both independent approvals after all waits, advancing even a
    // caller-supplied control clock rather than extending its freshness.
    control.now = controlNow()
    for (const [action, subject] of [["payment.reconciliation.suspense.post", proposed.proposedById], ["accounting.journal.reverse", proposed.clearingPostedById]] as const) {
      const decision = authorization(control, command.suspenseItemId, action, subject)
      await auditSensitiveActionDecision(tx, decision); if (!decision.allowed) return { denied: decision }
    }
    const now = nowOf(control), base = { commandHash, suspenseItemId: current.item.id, proposalId: row!.id, proposedById: proposed.proposedById, approvedById: control.actorId,
      decidedAt: now.toISOString(), reason: command.reason, allocationId: current.proof.allocationId, resolutionDecisionId: current.proof.decisionId,
      resolutionDecisionHash: current.proof.decisionHash, financialHash: current.financialHash, clearingJournalId: current.clearing.id, clearingJournalHash: correctionJournalHash(current.clearing), reviewedRevision: command.expectedRevision }
    if (command.decision === "REJECT") {
      const rejected = await record(tx, control, key, current.item.id, { ...base, kind: "SUSPENSE_RESOLUTION_RECOVERY_REJECTED_V1" })
      await tx.suspenseItem.update({ where: { id: current.item.id }, data: { metadata: json({ ...suspenseMetadata(current.item.metadata), resolutionRecoveryProposalId: null }) } })
      await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "SUSPENSE_RESOLUTION_RECOVERY_REJECT", resourceType: "SuspenseItem", resourceId: current.item.id, message: "Reopening rejected; final resolution retained", metadata: json({ receiptId: rejected.id }) } })
      await publishPaymentReconciliationNotification({ type: "payment-reconciliation.suspense.recovery-rejected", organizationId: control.organizationId, evidenceRef: { suspenseItemId: current.item.id }, correlationId: rejected.id, dedupeKey: rejected.id }, tx)
      return { value: { receiptId: rejected.id, outcome: "REJECTED" as const, replayed: false } }
    }
    const receiptId = randomUUID(), decisionId = randomUUID(), clearing = current.clearing
    const batch = await tx.ledgerPostingBatch.create({ data: { organizationId: control.organizationId, periodId: current.period.id, sourceType: "MANUAL", sourceId: clearing.id, postingPurpose: "REVERSAL", postingCycle: 1, sourceVersion: 1,
      idempotencyKey: `suspense-resolution-reversal:${current.proof.allocationId}`, status: "POSTED", postedAt: now, metadata: json({ resolutionRecoveryReceiptId: receiptId, allocationId: current.proof.allocationId }) } })
    const reversal = await tx.journalEntry.create({ data: { organizationId: control.organizationId, journalId: clearing.journalId, periodId: current.period.id, postingBatchId: batch.id,
      entryNumber: `SR-${receiptId}`, entryDate: current.date, status: "POSTED", currency: clearing.currency, memo: "Source-owned suspense resolution recovery", reference: current.item.id,
      sourceType: "MANUAL", sourceId: clearing.id, postingPurpose: "REVERSAL", reversalOfEntryId: clearing.id, postedAt: now, postedById: control.actorId, createdById: control.actorId,
      lines: { create: clearing.lines.map(line => ({ organizationId: control.organizationId, accountId: line.accountId, lineNumber: line.lineNumber, description: line.description,
        debit: line.credit, credit: line.debit, currency: line.currency, exchangeRate: line.exchangeRate, baseDebit: line.baseCredit, baseCredit: line.baseDebit,
        locationId: line.locationId, customerId: line.customerId, supplierId: line.supplierId, itemId: line.itemId, dimensions: line.dimensions === null ? Prisma.JsonNull : json(line.dimensions),
        metadata: json({ resolutionRecoveryReceiptId: receiptId, originalLineId: line.id }) })) } }, include: correctionJournalInclude })
    await createAccountingSourceLink({ organizationId: control.organizationId, postingBatchId: batch.id, journalEntryId: reversal.id, sourceType: "MANUAL", sourceId: clearing.id, sourceDate: current.date, metadata: json({ resolutionRecoveryReceiptId: receiptId }) }, tx, { actorId: control.actorId, audit: true })
    await tx.journalEntry.update({ where: { id: clearing.id }, data: { status: "REVERSED", reversedAt: now, reversedById: control.actorId } })
    await tx.ledgerPostingBatch.update({ where: { id: clearing.postingBatchId! }, data: { status: "REVERSED", reversedAt: now } })
    const run = current.item.reconciliationRun
    await record(tx, control, `suspense-resolution-recovered:${current.proof.allocationId}`, current.item.id, { ...base, kind: "SUSPENSE_RESOLUTION_RECOVERED_V1", reversalJournalId: reversal.id, reversalJournalHash: correctionJournalHash(reversal),
      reversalDate: draft.reversalDate, priorOutcome: current.item.status, retainedSourceMetadata: current.item.metadata,
      priorRunCertificate: run ? { runId: run.id, status: run.status, signedById: run.signedById, signedAt: run.signedAt, certificateHash: run.certificateHash, certificatePayload: run.certificatePayload } : null }, receiptId)
    await record(tx, control, key, current.item.id, { ...base, kind: "SUSPENSE_RESOLUTION_RECOVERY_APPROVED_V1", recoveryReceiptId: receiptId }, decisionId)
    await tx.suspenseItem.update({ where: { id: current.item.id }, data: { status: "POSTED_TO_SUSPENSE", resolvedAt: null,
      metadata: json({ ...suspenseMetadata(current.item.metadata), resolutionRecoveryProposalId: null, resolutionProposalId: null, resolutionReceiptId: null, resolutionDecisionId: null, latestResolutionRecoveryReceiptId: receiptId }) } })
    await tx.paymentException.updateMany({ where: { organizationId: control.organizationId, suspenseItemId: current.item.id, status: { not: "DISMISSED" } }, data: { status: "REOPENED", resolvedAt: null } })
    if (run) await tx.reconciliationRun.update({ where: { id: run.id }, data: { status: "NEEDS_REVIEW", signedAt: null, signedById: null, certificateHash: null, certificatePayload: Prisma.JsonNull,
      metadata: json({ ...suspenseMetadata(run.metadata), immutableAfterSignoff: false, signedSourceVersionHash: null, resolutionRecoveryInvalidation: { receiptId, suspenseItemId: current.item.id, at: now.toISOString() } }) } })
    await recordOrderedReversedJournalCloseInvalidationsInTx(tx, control.organizationId, { originalJournalEntryId: clearing.id, reversalJournalEntryId: reversal.id, originalPeriodId: clearing.periodId, reversalPeriodId: current.period.id, reversalDate: current.date, correlationId: receiptId, affectedPeriodIds }, { actorId: control.actorId, now })
    await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "SUSPENSE_RESOLUTION_RECOVER", resourceType: "SuspenseItem", resourceId: current.item.id, journalEntryId: reversal.id, postingBatchId: batch.id,
      message: "Clearing reversed through independent source review; original suspense posting retained and obligation reopened", metadata: json({ receiptId, decisionId, allocationId: current.proof.allocationId }) } })
    await assertSuspenseResolutionRecoveryInTx(tx, control.organizationId, current.item.id, current.proof.allocationId)
    await publishPaymentReconciliationNotification({ type: "payment-reconciliation.suspense.recovered", organizationId: control.organizationId, evidenceRef: { suspenseItemId: current.item.id, reconciliationRunId: run?.id }, correlationId: receiptId, dedupeKey: receiptId }, tx)
    return { value: { receiptId: decisionId, outcome: "POSTED_TO_SUSPENSE" as const, replayed: false } }
  })
}
