import { randomUUID, createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { auditSensitiveActionDecision, evaluateSensitiveAction, assertSensitiveActionAllowed, type SensitiveActionDecision } from "@/services/controls/sensitive-action.service"
import { suspenseCorrectionExportSchema, type SuspenseCorrectionExportInput } from "./payment-suspense-correction.contracts"
import { parseSuspenseCorrectionRecord, suspenseCorrectionRecordRevision } from "./payment-suspense-correction-record"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"
import { assertCompensatedSuspenseCycleInTx, assertCycleJournal, correctionJournalHash, correctionJournalInclude, correctionLineEvidence, type CorrectionJournal } from "./payment-suspense-cycle-ledger.service"
import type { SuspenseCorrectionControl } from "./payment-suspense-correction.service"

type Row = Prisma.PaymentReconciliationInboxItemGetPayload<Record<string, never>>
type RecordData = ReturnType<typeof parseSuspenseCorrectionRecord>
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
const byteHash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex")

function recordedEvent(row: Row, data: RecordData) {
  return { id: row.id, revision: suspenseCorrectionRecordRevision(row), payloadHash: row.payloadHash, kind: data.kind,
    recordedAt: row.createdAt.toISOString(), suspenseItemId: data.suspenseItemId, cycle: data.cycle, proposedById: data.proposedById,
    decidedById: data.kind === "SUSPENSE_CORRECTION_PROPOSED_V1" ? null : data.approvedById,
    reason: data.kind === "SUSPENSE_CORRECTION_PROPOSED_V1" ? data.draft.reason : data.reason,
    reversalDate: data.kind === "SUSPENSE_CORRECTION_PROPOSED_V1" ? data.draft.reversalDate : data.kind === "SUSPENSE_CORRECTION_APPROVED_V1" ? data.reversalDate : null,
    originalJournalId: data.originalJournalId, originalJournalHash: data.originalJournalHash }
}
function journalEvidence(entry: CorrectionJournal) {
  return { id: entry.id, number: entry.entryNumber, entryDate: entry.entryDate.toISOString(), periodId: entry.periodId,
    sourceType: entry.sourceType, sourceId: entry.sourceId, purpose: entry.postingPurpose, batchId: entry.postingBatchId,
    cycle: entry.postingBatch!.postingCycle, statusAtExport: entry.status, currency: entry.currency, postedById: entry.postedById,
    reversalOfEntryId: entry.reversalOfEntryId, retainedFinancialHash: correctionJournalHash(entry),
    lines: entry.lines.map(line => { const { dimensions, ...financial } = correctionLineEvidence(line); return { ...financial, dimensionsHash: suspenseEvidenceHash(dimensions) } }),
    sourceLinks: entry.sourceLinks.filter(link => link.organizationId === entry.organizationId && link.sourceId === entry.sourceId
      && link.sourceType === "PAYMENT_SUSPENSE" && link.journalEntryId === entry.id && link.postingBatchId === entry.postingBatchId).map(link => ({ id: link.id, sourceId: link.sourceId, sourceType: link.sourceType })) }
}

async function loadEvidence(tx: Prisma.TransactionClient, control: SuspenseCorrectionControl, row: Row, data: RecordData) {
  const original = await tx.journalEntry.findFirst({ where: { id: data.originalJournalId, organizationId: control.organizationId }, include: correctionJournalInclude })
  if (!original) throw new ConflictError("Original correction journal is unavailable.")
  assertCycleJournal(original, control.organizationId, data.suspenseItemId, data.cycle, false)
  if (!["POSTED", "REVERSED"].includes(original.status) || original.status !== original.postingBatch?.status
    || correctionJournalHash(original) !== data.originalJournalHash || original.postingBatchId !== data.originalApproval.ledgerPostingBatchId
    || original.postedById !== data.originalApproval.approvedById || data.originalApproval.approvedById === data.originalApproval.proposedById) {
    throw new ConflictError("Original financial and approval evidence changed.")
  }
  const approvalKey = data.cycle === 1 ? `${data.suspenseItemId}:posting-approval` : `${data.suspenseItemId}:posting-approval:cycle:${data.cycle}`
  const approval = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, id: data.originalApproval.inboxItemId,
    source: "SUSPENSE_POST", status: "PROCESSED", externalId: original.postingBatchId, idempotencyKey: approvalKey } })
  const approved = suspenseMetadata(approval?.payloadSummary)
  const approvalAudit = await tx.ledgerAuditEvent.findFirst({ where: { organizationId: control.organizationId, resourceId: data.suspenseItemId,
    action: "PAYMENT_RECONCILIATION_SUSPENSE_POST_APPROVE", actorId: data.originalApproval.approvedById, postingBatchId: original.postingBatchId } })
  if (!approval || !approvalAudit || approval.payloadHash !== suspenseEvidenceHash(approval.payloadSummary).slice(7)
    || approved.suspenseItemId !== data.suspenseItemId || approved.ledgerPostingBatchId !== original.postingBatchId
    || approved.approvedById !== data.originalApproval.approvedById || approved.requestedById !== data.originalApproval.proposedById
    || approved.reviewedRevision !== data.originalApproval.reviewedRevision) throw new ConflictError("Retained original approval requires review.")
  let proposal = row, proposed = data
  let reversal: CorrectionJournal | null = null
  if (data.kind !== "SUSPENSE_CORRECTION_PROPOSED_V1") {
    const candidate = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: data.proposalId, organizationId: control.organizationId,
      source: "SUSPENSE_POST", status: "PROCESSED", externalId: data.suspenseItemId } })
    if (!candidate) throw new ConflictError("Correction proposal is unavailable.")
    proposal = candidate; proposed = parseSuspenseCorrectionRecord(candidate)
    if (proposed.kind !== "SUSPENSE_CORRECTION_PROPOSED_V1" || proposed.cycle !== data.cycle || proposed.originalJournalHash !== data.originalJournalHash
      || proposed.proposedById !== data.proposedById || proposed.originalPostedById !== original.postedById
      || suspenseEvidenceHash(proposed.originalApproval) !== suspenseEvidenceHash(data.originalApproval)
      || data.approvedById === proposed.proposedById || data.approvedById === original.postedById) throw new ConflictError("Correction decision lineage requires review.")
    if (data.kind === "SUSPENSE_CORRECTION_APPROVED_V1") {
      const proof = await assertCompensatedSuspenseCycleInTx(tx, control.organizationId, data.suspenseItemId, data.cycle)
      if (proof.receipt.id !== row.id) throw new ConflictError("Correction receipt does not match the compensating journal.")
      reversal = proof.reversal
    }
  }
  return { selectedRecord: recordedEvent(row, data), proposal: recordedEvent(proposal, proposed),
    originalApproval: { id: approval.id, payloadHash: approval.payloadHash, auditId: approvalAudit.id,
      approvedById: data.originalApproval.approvedById, proposedById: data.originalApproval.proposedById,
      approvedAt: data.originalApproval.approvedAt, reviewedRevision: data.originalApproval.reviewedRevision,
      sourceHash: data.originalApproval.sourceHash, proposalHash: data.originalApproval.proposalHash },
    originalJournal: journalEvidence(original), reversalJournal: reversal ? journalEvidence(reversal) : null }
}

export type SuspenseCorrectionExportResult = { receiptId: string; fileName: string; mimeType: "application/json"; content: string; sha256: string; replayed: boolean }
type Outcome = { value: SuspenseCorrectionExportResult; denied?: never } | { denied: SensitiveActionDecision; value?: never }

export async function exportSuspenseCorrection(input: SuspenseCorrectionExportInput, control: SuspenseCorrectionControl): Promise<SuspenseCorrectionExportResult> {
  const command = suspenseCorrectionExportSchema.parse(input)
  if (!hasRbacPermission(control.actorPermissions, "payments.reconciliation.read")) throw new ForbiddenError("Reconciliation read permission is required for correction exports.")
  const now = control.now ?? new Date()
  try {
    const result = await db.$transaction(async (tx): Promise<Outcome> => {
      const actor = await tx.user.findFirst({ where: { id: control.actorId, organizationId: control.organizationId, isActive: true }, select: { id: true } })
      if (!actor) throw new ForbiddenError("An active workspace actor is required.")
      const decisionInput = { action: "payment.export" as const, actorId: control.actorId, organizationId: control.organizationId,
        actorPermissions: control.actorPermissions, lastAuthAt: control.lastAuthAt, now, resourceType: "SuspenseCorrectionRecord", resourceId: command.recordId }
      const authorized = evaluateSensitiveAction(decisionInput)
      if (!authorized.allowed) { await auditSensitiveActionDecision(tx, authorized); return { denied: authorized } }
      const item = await tx.suspenseItem.findFirst({ where: { id: command.suspenseItemId, organizationId: control.organizationId }, select: { id: true, status: true, updatedAt: true } })
      const row = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: command.recordId, organizationId: control.organizationId, source: "SUSPENSE_POST",
        status: "PROCESSED", externalId: command.suspenseItemId, idempotencyKey: { startsWith: "suspense-correction-" } } })
      if (!item || !row) throw new NotFoundError("Correction evidence is unavailable in this workspace.")
      const data = parseSuspenseCorrectionRecord(row)
      if (suspenseCorrectionRecordRevision(row) !== command.expectedRevision) throw new ConflictError("The selected correction record changed. Reload its history.")
      const evidence = await loadEvidence(tx, control, row, data)
      const requestHash = suspenseEvidenceHash({ command, actorId: control.actorId }), key = `suspense-correction-export:${command.idempotencyKey}`
      const previous = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, source: "CERTIFICATE_EXPORT", idempotencyKey: key } })
      if (previous) {
        const saved = suspenseMetadata(previous.payloadSummary)
        if (previous.externalId !== row.id || saved.kind !== "SUSPENSE_CORRECTION_EXPORT_V1" || saved.requestHash !== requestHash) throw new IdempotencyConflictError("This export key belongs to a different request.")
        if (previous.status !== "PROCESSED" || previous.payloadHash !== suspenseEvidenceHash(previous.payloadSummary).slice(7)
          || typeof saved.content !== "string" || typeof saved.sha256 !== "string" || typeof saved.fileName !== "string"
          || byteHash(saved.content) !== saved.sha256) throw new ConflictError("Retained export bytes require review.")
        return { value: { receiptId: previous.id, fileName: saved.fileName, mimeType: "application/json", content: saved.content, sha256: saved.sha256, replayed: true } }
      }
      const receiptId = randomUUID(), watermarkId = `stoquify-correction-${receiptId}`
      const payload = { schema: "stoquify.suspense-correction-evidence.v1", purpose: "Historical correction evidence; not a new approval, statutory certificate or current settlement confirmation",
        organizationId: control.organizationId, ...evidence, sourceObservedAtExport: { suspenseItemId: item.id, status: item.status, updatedAt: item.updatedAt.toISOString() },
        export: { receiptId, exportedAt: now.toISOString(), exportedById: control.actorId, watermarkId,
          redactions: ["Raw provider payloads", "Unrelated item metadata", "Prior certificate payloads", "Journal descriptions", "Raw dimensions (hash retained)"],
          verification: "File SHA-256 detects changed bytes; application audit references are not an independent cryptographic signer certificate" } }
      const content = JSON.stringify(payload, null, 2), sha256 = byteHash(content), fileName = `stoquify-suspense-correction-${receiptId}.json`
      const body = json({ kind: "SUSPENSE_CORRECTION_EXPORT_V1", requestHash, content, sha256, fileName, recordId: row.id, exportedById: control.actorId })
      const decision = evaluateSensitiveAction({ ...decisionInput, exportContext: { scope: "suspense-correction-record", filtersHash: command.expectedRevision,
        rowCount: evidence.originalJournal.lines.length + (evidence.reversalJournal?.lines.length ?? 0), fileType: "json", sensitivity: "financial", watermarkId } })
      await auditSensitiveActionDecision(tx, decision)
      if (!decision.allowed) return { denied: decision }
      await tx.paymentReconciliationInboxItem.create({ data: { id: receiptId, organizationId: control.organizationId, source: "CERTIFICATE_EXPORT",
        status: "PROCESSED", externalId: row.id, idempotencyKey: key, payloadSummary: body, payloadHash: suspenseEvidenceHash(body).slice(7), processedAt: now, correlationId: receiptId } })
      await tx.ledgerAuditEvent.create({ data: { organizationId: control.organizationId, actorId: control.actorId, action: "PAYMENT_SUSPENSE_CORRECTION_EXPORT",
        resourceType: "SuspenseCorrectionRecord", resourceId: row.id, message: "Historical correction evidence file prepared; client download not attested",
        metadata: json({ receiptId, sha256, watermarkId, fileName, requestHash }) } })
      return { value: { receiptId, fileName, mimeType: "application/json", content, sha256, replayed: false } }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    if (result.denied) { if (result.denied.reasonCode === "MISSING_PERMISSION") throw new ForbiddenError(result.denied.safeMessage); assertSensitiveActionAllowed(result.denied); throw new ForbiddenError("Export is unavailable.") }
    return result.value
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) throw new ConflictError("An export was issued concurrently. Retry the same request.")
    throw error
  }
}
