import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { createAccountingSourceLink } from "@/services/accounting/source-link.service"
import { recordReversedJournalCloseInvalidationsInTx } from "@/services/accounting/journal-close-invalidation.service"
import { assertSensitiveActionAllowed, auditSensitiveActionDecision, evaluateSensitiveAction, type SensitiveActionDecision } from "@/services/controls/sensitive-action.service"
import { suspenseCorrectionDraftSchema, suspenseCorrectionProposalSchema, suspenseCorrectionDecisionSchema, suspenseCorrectionHistorySchema, type SuspenseCorrectionDraft, type SuspenseCorrectionProposal, type SuspenseCorrectionDecision, type SuspenseCorrectionHistoryInput } from "./payment-suspense-correction.contracts"
import { suspenseApprovalKey, suspenseEvidenceHash, suspenseEvidenceRevision, suspenseMetadata, suspensePostingSourceHash } from "./payment-suspense-evidence"
import { assertPaymentSuspenseLedgerTruthInTx } from "./payment-suspense-ledger.service"
import { assertCompensatedSuspenseCycleInTx, assertCycleJournal, assertPriorSuspenseCyclesInTx, correctionJournalHash, correctionJournalInclude } from "./payment-suspense-cycle-ledger.service"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"
import { parseSuspenseCorrectionRecord, suspenseCorrectionRecordRevision } from "./payment-suspense-correction-record"

// Trusted server context only. Public action schemas never accept these fields.
export type SuspenseCorrectionControl = { organizationId: string; actorId: string; actorPermissions: readonly string[]; lastAuthAt?: Date; now?: Date }
type Tx = Prisma.TransactionClient
type Controlled<T> = { value: T; denied?: never } | { denied: SensitiveActionDecision; value?: never }
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
const nowOf = (control: SuspenseCorrectionControl) => control.now ?? new Date()

async function transaction<T>(work: (tx: Tx) => Promise<Controlled<T>>) {
  try {
    const result = await db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    if (result.denied) {
      if (result.denied.reasonCode === "SELF_APPROVAL_BLOCKED") throw new BusinessRuleError(result.denied.safeMessage, "SOD_VIOLATION")
      if (result.denied.reasonCode === "MISSING_PERMISSION") throw new ForbiddenError(result.denied.safeMessage)
      assertSensitiveActionAllowed(result.denied)
      throw new ForbiddenError("Correction is not authorized.")
    }
    return result.value
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (["P2002", "P2034"].includes(error.code)
      || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code))))) {
      throw new ConflictError("Correction evidence changed concurrently. Refresh or retry the same request.")
    }
    throw error
  }
}

async function lockItem(tx: Tx, control: SuspenseCorrectionControl, itemId: string) {
  await tx.$queryRaw`SELECT id FROM suspense_items WHERE id = ${itemId} AND "organizationId" = ${control.organizationId} FOR UPDATE`
  const actor = await tx.user.findFirst({ where: { id: control.actorId, organizationId: control.organizationId, isActive: true }, select: { id: true } })
  if (!actor) throw new ForbiddenError("Active workspace actor is required.")
}

function authorize(control: SuspenseCorrectionControl, itemId: string, action: "payment.reconciliation.suspense.propose" | "payment.reconciliation.suspense.post" | "accounting.journal.reverse", subjectActorId?: string | null) {
  return evaluateSensitiveAction({ action, actorId: control.actorId, organizationId: control.organizationId, actorPermissions: control.actorPermissions,
    resourceType: "SuspenseItem", resourceId: itemId, subjectActorId, lastAuthAt: control.lastAuthAt, now: nowOf(control) })
}

async function record(tx: Tx, control: SuspenseCorrectionControl, key: string, itemId: string, payload: Record<string, unknown>, receiptId = randomUUID()) {
  const body = json(payload)
  return tx.paymentReconciliationInboxItem.create({ data: { id: receiptId, organizationId: control.organizationId,
    source: "SUSPENSE_POST", status: "PROCESSED", idempotencyKey: key, externalId: itemId,
    payloadSummary: body, payloadHash: suspenseEvidenceHash(body).slice(7), processedAt: nowOf(control), correlationId: receiptId } })
}

function payloadOf(row: { payloadHash: string; payloadSummary: Prisma.JsonValue | null } | null) {
  if (!row || row.payloadHash !== suspenseEvidenceHash(row.payloadSummary).slice(7)) throw new ConflictError("Retained correction evidence requires review.")
  return suspenseMetadata(row.payloadSummary)
}

export async function loadVerifiedPostedSuspenseInTx(tx: Tx, control: Pick<SuspenseCorrectionControl, "organizationId">, itemId: string, options: { allowResolved?: boolean; allowResolutionProposal?: boolean } = {}) {
  const item = await tx.suspenseItem.findFirst({ where: { id: itemId, organizationId: control.organizationId }, include: { providerAccount: true, reconciliationRun: true } })
  if (!item) throw new NotFoundError("Suspense record is unavailable in this workspace.")
  if (!(item.status === "POSTED_TO_SUSPENSE" || (options.allowResolved && ["RESOLVED", "WRITTEN_OFF"].includes(item.status))) || !item.postedAt || !item.ledgerPostingBatchId) throw new ConflictError("Only a verified posted suspense item can be reviewed.")
  if (!options.allowResolutionProposal && suspenseMetadata(item.metadata).resolutionProposalId) throw new ConflictError("Review or reject the pending resolution before proposing a posting correction.")
  if ((item.providerAccount && item.providerAccount.organizationId !== control.organizationId) || (item.reconciliationRun && item.reconciliationRun.organizationId !== control.organizationId)) throw new ConflictError("Suspense source scope requires review.")
  if (item.reconciliationRun?.status === "VOIDED" || item.reconciliationRun?.voidedAt) throw new ConflictError("A voided reconciliation run requires source review before correcting its suspense posting.")
  await assertPaymentSuspenseLedgerTruthInTx(tx, { organizationId: control.organizationId, suspenseItemId: item.id, ...(options.allowResolved ? { includeResolved: true } : {}) })
  const cycle = await assertPriorSuspenseCyclesInTx(tx, control.organizationId, item)
  const journals = await tx.journalEntry.findMany({ where: { organizationId: control.organizationId, postingBatchId: item.ledgerPostingBatchId }, include: correctionJournalInclude })
  if (journals.length !== 1) throw new ConflictError("Original suspense journal is ambiguous.")
  const journal = journals[0]; assertCycleJournal(journal, control.organizationId, item.id, cycle, false)
  const saved = suspenseMetadata(suspenseMetadata(item.metadata).postingApproval)
  const receipt = typeof saved.inboxItemId === "string" ? await tx.paymentReconciliationInboxItem.findFirst({ where: { id: saved.inboxItemId, organizationId: control.organizationId,
    source: "SUSPENSE_POST", status: "PROCESSED", idempotencyKey: suspenseApprovalKey(item), externalId: item.ledgerPostingBatchId } }) : null
  const retained = payloadOf(receipt)
  const audit = typeof saved.approvedById === "string" ? await tx.ledgerAuditEvent.findFirst({ where: {
    organizationId: control.organizationId, resourceId: item.id, action: "PAYMENT_RECONCILIATION_SUSPENSE_POST_APPROVE",
    actorId: saved.approvedById, postingBatchId: item.ledgerPostingBatchId,
  } }) : null
  if (saved.sourceHash !== suspensePostingSourceHash(item, item.postedAt) || saved.approvedAt !== item.postedAt.toISOString()
    || !audit || typeof saved.proposedById !== "string" || !saved.proposedById || typeof saved.reviewedRevision !== "string"
    || saved.proposedById !== suspenseMetadata(suspenseMetadata(item.metadata).reclassification).proposedById
    || retained.reviewedRevision !== saved.reviewedRevision || retained.suspenseItemId !== item.id
    || saved.proposalHash !== suspenseEvidenceHash(suspenseMetadata(item.metadata).reclassification)
    || saved.ledgerPostingBatchId !== item.ledgerPostingBatchId || saved.approvedById !== journal.postedById
    || saved.approvedById === saved.proposedById || retained.ledgerPostingBatchId !== item.ledgerPostingBatchId
    || retained.approvedById !== saved.approvedById || retained.requestedById !== saved.proposedById) throw new ConflictError("Original posting approval requires review before correction.")
  return { item, journal, cycle, originalApproval: saved }
}

async function preview(tx: Tx, draft: SuspenseCorrectionDraft, control: SuspenseCorrectionControl) {
  const current = await loadVerifiedPostedSuspenseInTx(tx, control, draft.suspenseItemId), date = new Date(`${draft.reversalDate}T00:00:00.000Z`)
  if (draft.reversalDate < current.journal.entryDate.toISOString().slice(0, 10) || draft.reversalDate > nowOf(control).toISOString().slice(0, 10)) throw new BusinessRuleError("Correction date must be on or after the original posting and no later than today.")
  const period = await getOpenPeriodForDate(control.organizationId, date, tx)
  const financialHash = suspenseEvidenceHash({ original: correctionJournalHash(current.journal), originalApproval: current.originalApproval,
    sourceHash: suspensePostingSourceHash(current.item, current.item.postedAt!), cycle: current.cycle })
  const revision = suspenseEvidenceHash({ draft, financialHash, itemRevision: suspenseEvidenceRevision(current.item, current.item.postedAt!), periodId: period.id })
  return { ...current, period, date, financialHash, revision }
}

export async function previewSuspenseCorrection(input: SuspenseCorrectionDraft, control: SuspenseCorrectionControl) {
  const draft = suspenseCorrectionDraftSchema.parse(input)
  if (!hasRbacPermission(control.actorPermissions, "payments.reconciliation.read")) throw new ForbiddenError("Suspense read permission is required.")
  return db.$transaction(async tx => {
    const current = await preview(tx, draft, control)
    return { revision: current.revision, suspenseItemId: current.item.id, cycle: current.cycle, amount: current.item.amount.toFixed(2), currencyCode: current.item.currencyCode,
      originalJournalId: current.journal.id, originalJournalNumber: current.journal.entryNumber, originalPostingDate: current.journal.entryDate.toISOString(),
      reversalDate: draft.reversalDate, periodId: current.period.id, outcome: "REOPENED" as const, nextCycle: current.cycle + 1 }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function proposeSuspenseCorrection(input: SuspenseCorrectionProposal, control: SuspenseCorrectionControl) {
  const command = suspenseCorrectionProposalSchema.parse(input), { expectedRevision, idempotencyKey, ...draft } = command
  return transaction(async tx => {
    await lockItem(tx, control, draft.suspenseItemId)
    const decision = authorize(control, draft.suspenseItemId, "payment.reconciliation.suspense.propose")
    await auditSensitiveActionDecision(tx, decision); if (!decision.allowed) return { denied: decision }
    const key = `suspense-correction-proposal:${idempotencyKey}`, requestHash = suspenseEvidenceHash({ command, actorId: control.actorId })
    const retained = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, source: "SUSPENSE_POST", idempotencyKey: key } })
    if (retained) {
      const payload = payloadOf(retained)
      if (payload.kind !== "SUSPENSE_CORRECTION_PROPOSED_V1" || payload.requestHash !== requestHash || payload.suspenseItemId !== draft.suspenseItemId) throw new IdempotencyConflictError()
      return { value: { proposalId: retained.id, replayed: true } }
    }
    const current = await preview(tx, draft, control)
    if (current.revision !== expectedRevision) throw new ConflictError("Correction preview changed. Review the current evidence.")
    const proposal = await record(tx, control, key, draft.suspenseItemId, { kind: "SUSPENSE_CORRECTION_PROPOSED_V1", requestHash, draft,
      suspenseItemId: draft.suspenseItemId, cycle: current.cycle, proposedById: control.actorId, proposedAt: nowOf(control).toISOString(),
      financialHash: current.financialHash, originalJournalId: current.journal.id, originalJournalHash: correctionJournalHash(current.journal),
      originalPostedById: current.journal.postedById, originalPostingBatchId: current.item.ledgerPostingBatchId, originalApproval: current.originalApproval })
    await tx.suspenseItem.update({ where: { id: current.item.id }, data: { metadata: json({ ...suspenseMetadata(current.item.metadata), correctionProposalId: proposal.id }) } })
    await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "PAYMENT_SUSPENSE_CORRECTION_PROPOSE",
      resourceType: "SuspenseItem", resourceId: current.item.id, journalEntryId: current.journal.id, postingBatchId: current.item.ledgerPostingBatchId,
      message: "Suspense correction proposed; original posting remains active", metadata: json({ proposalId: proposal.id, cycle: current.cycle }) } })
    await publishPaymentReconciliationNotification({ type: "payment-reconciliation.suspense.correction-proposed", organizationId: control.organizationId,
      evidenceRef: { suspenseItemId: current.item.id, reconciliationRunId: current.item.reconciliationRunId }, correlationId: proposal.id, dedupeKey: proposal.id }, tx)
    return { value: { proposalId: proposal.id, replayed: false } }
  })
}

export async function reviewSuspenseCorrection(suspenseItemId: string, proposalId: string, control: SuspenseCorrectionControl) {
  if (!hasRbacPermission(control.actorPermissions, "payments.reconciliation.read")) throw new ForbiddenError("Suspense read permission is required.")
  return db.$transaction(async tx => {
    const row = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: proposalId, organizationId: control.organizationId, source: "SUSPENSE_POST", externalId: suspenseItemId, status: "PROCESSED" } })
    const proposed = payloadOf(row)
    if (proposed.kind !== "SUSPENSE_CORRECTION_PROPOSED_V1" || proposed.suspenseItemId !== suspenseItemId) throw new NotFoundError("Correction proposal is unavailable.")
    const draft = suspenseCorrectionDraftSchema.parse(proposed.draft), current = await preview(tx, draft, control)
    if (suspenseMetadata(current.item.metadata).correctionProposalId !== proposalId || current.financialHash !== proposed.financialHash) throw new ConflictError("Correction proposal has been superseded or its source changed.")
    return { proposalId, draft, revision: suspenseEvidenceHash({ proposalHash: row!.payloadHash, currentRevision: current.revision }),
      proposedById: String(proposed.proposedById), originalPostedById: String(proposed.originalPostedById), cycle: current.cycle,
      originalJournalNumber: current.journal.entryNumber, amount: current.item.amount.toFixed(2), currencyCode: current.item.currencyCode, periodId: current.period.id }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function decideSuspenseCorrection(input: SuspenseCorrectionDecision, control: SuspenseCorrectionControl) {
  const command = suspenseCorrectionDecisionSchema.parse(input)
  return transaction(async tx => {
    await lockItem(tx, control, command.suspenseItemId)
    const proposal = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: command.proposalId, organizationId: control.organizationId, source: "SUSPENSE_POST", externalId: command.suspenseItemId, status: "PROCESSED" } })
    const proposed = payloadOf(proposal)
    if (proposed.kind !== "SUSPENSE_CORRECTION_PROPOSED_V1" || proposed.suspenseItemId !== command.suspenseItemId || typeof proposed.proposedById !== "string" || typeof proposed.originalPostedById !== "string") throw new ConflictError("Correction maker evidence is invalid.")
    for (const [action, subject] of [["payment.reconciliation.suspense.post", proposed.proposedById], ["accounting.journal.reverse", proposed.originalPostedById]] as const) {
      const decision = authorize(control, command.suspenseItemId, action, subject)
      await auditSensitiveActionDecision(tx, decision); if (!decision.allowed) return { denied: decision }
    }
    const decisionKey = `suspense-correction-decision:${proposal!.id}`, commandHash = suspenseEvidenceHash({ command, actorId: control.actorId })
    const existing = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, source: "SUSPENSE_POST", idempotencyKey: decisionKey } })
    if (existing) {
      const saved = payloadOf(existing)
      if (saved.commandHash !== commandHash) throw new IdempotencyConflictError("This proposal already has a different recorded decision.")
      if (saved.kind === "SUSPENSE_CORRECTION_APPROVED_V1") await assertCompensatedSuspenseCycleInTx(tx, control.organizationId, command.suspenseItemId, Number(saved.cycle))
      else if (saved.kind !== "SUSPENSE_CORRECTION_REJECTED_V1") throw new ConflictError("Correction decision history requires review.")
      return { value: { receiptId: existing.id, outcome: command.decision === "APPROVE" ? "REOPENED" as const : "REJECTED" as const, replayed: true } }
    }
    const draft = suspenseCorrectionDraftSchema.parse(proposed.draft), current = await preview(tx, draft, control)
    if (suspenseMetadata(current.item.metadata).correctionProposalId !== proposal!.id || current.financialHash !== proposed.financialHash
      || suspenseEvidenceHash({ proposalHash: proposal!.payloadHash, currentRevision: current.revision }) !== command.expectedRevision) throw new ConflictError("Correction evidence changed. Refresh the independent review.")
    const base = { commandHash, suspenseItemId: current.item.id, cycle: current.cycle, proposalId: proposal!.id, proposedById: proposed.proposedById,
      approvedById: control.actorId, decidedAt: nowOf(control).toISOString(), reason: command.reason, reviewedRevision: command.expectedRevision,
      originalJournalId: current.journal.id, originalJournalHash: correctionJournalHash(current.journal), originalApproval: current.originalApproval }
    if (command.decision === "REJECT") {
      const rejected = await record(tx, control, decisionKey, current.item.id, { ...base, kind: "SUSPENSE_CORRECTION_REJECTED_V1" })
      await tx.suspenseItem.update({ where: { id: current.item.id }, data: { metadata: json({ ...suspenseMetadata(current.item.metadata), correctionProposalId: null }) } })
      await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "PAYMENT_SUSPENSE_CORRECTION_REJECT", resourceType: "SuspenseItem", resourceId: current.item.id, message: "Correction rejected; original posting retained", metadata: json({ receiptId: rejected.id }) } })
      await publishPaymentReconciliationNotification({ type: "payment-reconciliation.suspense.correction-rejected", organizationId: control.organizationId,
        evidenceRef: { suspenseItemId: current.item.id, reconciliationRunId: current.item.reconciliationRunId }, correlationId: rejected.id, dedupeKey: rejected.id }, tx)
      return { value: { receiptId: rejected.id, outcome: "REJECTED" as const, replayed: false } }
    }
    const receiptId = randomUUID(), now = nowOf(control), original = current.journal
    const batch = await tx.ledgerPostingBatch.create({ data: { organizationId: control.organizationId, periodId: current.period.id,
      sourceType: "PAYMENT_SUSPENSE", sourceId: current.item.id, postingPurpose: "REVERSAL", postingCycle: current.cycle, sourceVersion: 1,
      idempotencyKey: `payment-suspense:${current.item.id}:reversal:cycle:${current.cycle}`, status: "POSTED", postedAt: now,
      metadata: json({ correctionReceiptId: receiptId, proposalId: proposal!.id, originalJournalId: original.id }) } })
    const reversal = await tx.journalEntry.create({ data: { organizationId: control.organizationId, journalId: original.journalId, periodId: current.period.id,
      postingBatchId: batch.id, entryNumber: `SC-${receiptId}`, entryDate: current.date, status: "POSTED", currency: original.currency,
      memo: "Source-owned suspense correction", reference: current.item.id, sourceType: "PAYMENT_SUSPENSE", sourceId: current.item.id, postingPurpose: "REVERSAL",
      reversalOfEntryId: original.id, postedAt: now, postedById: control.actorId, createdById: control.actorId,
      lines: { create: original.lines.map(line => ({ organizationId: control.organizationId, accountId: line.accountId, lineNumber: line.lineNumber,
        description: line.description, debit: line.credit, credit: line.debit, currency: line.currency, exchangeRate: line.exchangeRate,
        baseDebit: line.baseCredit, baseCredit: line.baseDebit, locationId: line.locationId, customerId: line.customerId, supplierId: line.supplierId, itemId: line.itemId,
        dimensions: line.dimensions === null ? Prisma.JsonNull : json(line.dimensions), metadata: json({ correctionReceiptId: receiptId, originalLineId: line.id }) })) } }, include: correctionJournalInclude })
    await createAccountingSourceLink({ organizationId: control.organizationId, postingBatchId: batch.id, journalEntryId: reversal.id,
      sourceType: "PAYMENT_SUSPENSE", sourceId: current.item.id, sourceDate: current.date, metadata: json({ correctionReceiptId: receiptId, originalJournalId: original.id }) }, tx, { actorId: control.actorId, audit: true })
    const run = current.item.reconciliationRun
    await record(tx, control, decisionKey, current.item.id, { ...base, kind: "SUSPENSE_CORRECTION_APPROVED_V1", reversalJournalId: reversal.id,
      reversalJournalHash: correctionJournalHash(reversal), reversalBatchId: batch.id, reversalDate: draft.reversalDate,
      originalPostingBatchId: original.postingBatchId, retainedSourceMetadata: current.item.metadata,
      priorRunCertificate: run ? { runId: run.id, status: run.status, signedById: run.signedById, signedAt: run.signedAt,
        certificateHash: run.certificateHash, certificatePayload: run.certificatePayload } : null }, receiptId)
    await tx.journalEntry.update({ where: { id: original.id }, data: { status: "REVERSED", reversedAt: now, reversedById: control.actorId } })
    await tx.ledgerPostingBatch.update({ where: { id: original.postingBatchId! }, data: { status: "REVERSED", reversedAt: now } })
    await tx.suspenseItem.update({ where: { id: current.item.id }, data: { status: "REOPENED", postedAt: null, resolvedAt: null, ledgerPostingBatchId: null,
      metadata: json({ ...suspenseMetadata(current.item.metadata), postingApproval: null, reclassification: null, correctionProposalId: null,
        postingCycle: { number: current.cycle + 1, postingDate: draft.reversalDate, previousPostingBatchId: original.postingBatchId,
          reversalJournalEntryId: reversal.id, correctionReceiptId: receiptId } }) } })
    await tx.paymentException.updateMany({ where: { organizationId: control.organizationId, suspenseItemId: current.item.id, status: { not: "DISMISSED" } }, data: { status: "REOPENED", resolvedAt: null } })
    if (run) await tx.reconciliationRun.update({ where: { id: run.id }, data: { status: "NEEDS_REVIEW", signedAt: null, signedById: null,
      certificateHash: null, certificatePayload: Prisma.JsonNull, metadata: json({ ...suspenseMetadata(run.metadata), immutableAfterSignoff: false,
        signedSourceVersionHash: null, correctionInvalidation: { receiptId, suspenseItemId: current.item.id, at: now.toISOString() } }) } })
    await recordReversedJournalCloseInvalidationsInTx(tx, control.organizationId, { originalJournalEntryId: original.id, reversalJournalEntryId: reversal.id,
      originalPeriodId: original.periodId, reversalPeriodId: current.period.id, reversalDate: current.date, correlationId: receiptId }, { actorId: control.actorId, now })
    await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "PAYMENT_SUSPENSE_CORRECTION_APPROVE", resourceType: "SuspenseItem", resourceId: current.item.id,
      postingBatchId: batch.id, journalEntryId: reversal.id, message: "Suspense posting reversed through independent source review; obligation reopened", metadata: json({ receiptId, proposalId: proposal!.id, cycle: current.cycle }) } })
    await assertCompensatedSuspenseCycleInTx(tx, control.organizationId, current.item.id, current.cycle)
    await publishPaymentReconciliationNotification({ type: "payment-reconciliation.suspense.correction-approved", organizationId: control.organizationId,
      evidenceRef: { suspenseItemId: current.item.id, reconciliationRunId: current.item.reconciliationRunId }, correlationId: receiptId, dedupeKey: receiptId }, tx)
    return { value: { receiptId, outcome: "REOPENED" as const, replayed: false } }
  })
}

export async function readSuspenseCorrectionHistory(input: SuspenseCorrectionHistoryInput, control: SuspenseCorrectionControl) {
  const parsed = suspenseCorrectionHistorySchema.parse(input)
  if (!hasRbacPermission(control.actorPermissions, "payments.reconciliation.read")) throw new ForbiddenError("Suspense read permission is required.")
  const item = await db.suspenseItem.findFirst({ where: { id: parsed.suspenseItemId, organizationId: control.organizationId }, select: { id: true } })
  if (!item) throw new NotFoundError("Suspense record is unavailable in this workspace.")
  const rows = await db.paymentReconciliationInboxItem.findMany({ where: {
    organizationId: control.organizationId, source: "SUSPENSE_POST", externalId: item.id, status: "PROCESSED", idempotencyKey: { startsWith: "suspense-correction-" },
    ...(parsed.cursor ? { OR: [{ createdAt: { lt: new Date(parsed.cursor.createdAt) } }, { createdAt: new Date(parsed.cursor.createdAt), id: { lt: parsed.cursor.id } }] } : {}),
  }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 26 })
  const page = rows.slice(0, 25), last = page.at(-1)
  const records = page.map(row => {
    parseSuspenseCorrectionRecord(row)
    const payload = payloadOf(row), kind = payload.kind
    if (!["SUSPENSE_CORRECTION_PROPOSED_V1", "SUSPENSE_CORRECTION_APPROVED_V1", "SUSPENSE_CORRECTION_REJECTED_V1"].includes(String(kind)) || payload.suspenseItemId !== item.id) throw new ConflictError("Correction history identity requires review.")
    const draft = suspenseMetadata(payload.draft)
    return { id: row.id, revision: suspenseCorrectionRecordRevision(row), kind: String(kind), recordedAt: row.createdAt.toISOString(), cycle: Number(payload.cycle),
      reason: String(payload.reason ?? draft.reason ?? ""), reversalDate: typeof payload.reversalDate === "string" ? payload.reversalDate : typeof draft.reversalDate === "string" ? draft.reversalDate : null,
      proposedById: typeof payload.proposedById === "string" ? payload.proposedById : null,
      decidedById: typeof payload.approvedById === "string" ? payload.approvedById : null,
      originalJournalId: typeof payload.originalJournalId === "string" ? payload.originalJournalId : null,
      reversalJournalId: typeof payload.reversalJournalId === "string" ? payload.reversalJournalId : null }
  })
  return { records, nextCursor: rows.length > 25 && last ? { id: last.id, createdAt: last.createdAt.toISOString() } : null }
}
