import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import type { SuspenseCorrectionControl } from "./payment-suspense-correction.service"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"
import { suspenseResolutionRecordRevision } from "./payment-suspense-resolution-record"
import { suspenseResolutionReadSchema, suspenseClearingSearchSchema, type SuspenseResolutionReadInput, type SuspenseClearingSearchInput } from "./payment-suspense-resolution-read.contracts"

async function source(tx: Prisma.TransactionClient, itemId: string, control: SuspenseCorrectionControl) {
  if (!hasRbacPermission(control.actorPermissions, "payments.reconciliation.read") || !hasRbacPermission(control.actorPermissions, "accounting.journal.read")) throw new ForbiddenError("Reconciliation and accounting journal read permissions are required.")
  if (!await tx.user.findFirst({ where: { id: control.actorId, organizationId: control.organizationId, isActive: true }, select: { id: true } })) throw new ForbiddenError("Active workspace actor is required.")
  const item = await tx.suspenseItem.findFirst({ where: { id: itemId, organizationId: control.organizationId }, select: { id: true, status: true, amount: true, currencyCode: true, suspenseLedgerAccountId: true, ledgerPostingBatchId: true, metadata: true } })
  if (!item) throw new NotFoundError("Suspense record is unavailable in this workspace.")
  return item
}
const kinds = ["SUSPENSE_RESOLUTION_PROPOSED_V1", "SUSPENSE_RESOLUTION_APPROVED_V1", "SUSPENSE_RESOLUTION_REJECTED_V1", "SUSPENSE_RESOLUTION_RECOVERY_PROPOSED_V1", "SUSPENSE_RESOLUTION_RECOVERY_APPROVED_V1", "SUSPENSE_RESOLUTION_RECOVERY_REJECTED_V1"] as const
const prefixes = ["suspense-resolution-proposal:", "suspense-resolution-decision:", "suspense-resolution-recovery-proposal:", "suspense-resolution-recovery-decision:"]
export async function readSuspenseResolutionWorkspace(input: SuspenseResolutionReadInput, control: SuspenseCorrectionControl) {
  const parsed = suspenseResolutionReadSchema.parse(input)
  return db.$transaction(async tx => {
    const item = await source(tx, parsed.suspenseItemId, control), metadata = suspenseMetadata(item.metadata)
    const rows = await tx.paymentReconciliationInboxItem.findMany({ where: { organizationId: control.organizationId, externalId: item.id, source: "SUSPENSE_POST", status: "PROCESSED",
      AND: [{ OR: prefixes.map(startsWith => ({ idempotencyKey: { startsWith } })) }, ...(parsed.cursor ? [{ OR: [{ createdAt: { lt: new Date(parsed.cursor.createdAt) } }, { createdAt: new Date(parsed.cursor.createdAt), id: { lt: parsed.cursor.id } }] }] : [])] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 26 })
    const page = rows.slice(0, 25), last = page.at(-1)
    const history = page.map(row => {
      const saved = suspenseMetadata(row.payloadSummary), draft = suspenseMetadata(saved.draft)
      if (row.payloadHash !== suspenseEvidenceHash(row.payloadSummary).slice(7) || !kinds.includes(saved.kind as typeof kinds[number])
        || (draft.suspenseItemId ?? saved.suspenseItemId) !== item.id) throw new ConflictError("Resolution history identity or integrity requires review.")
      return { id: row.id, revision: suspenseResolutionRecordRevision(row), kind: saved.kind as typeof kinds[number], recordedAt: row.createdAt.toISOString(),
        reason: typeof saved.reason === "string" ? saved.reason : typeof draft.reason === "string" ? draft.reason : "",
        proposedById: typeof saved.proposedById === "string" ? saved.proposedById : null,
        decidedById: typeof saved.decidedById === "string" ? saved.decidedById : typeof saved.approvedById === "string" ? saved.approvedById : null,
        clearingJournalId: typeof saved.clearingJournalId === "string" ? saved.clearingJournalId : typeof draft.clearingJournalId === "string" ? draft.clearingJournalId : null,
        outcome: draft.outcome === "RESOLVED" || draft.outcome === "WRITTEN_OFF" ? draft.outcome : null,
        reversalDate: typeof draft.reversalDate === "string" ? draft.reversalDate : null }
    })
    return { item: { id: item.id, status: item.status, amount: item.amount.toFixed(2), currencyCode: item.currencyCode,
      resolutionProposalId: typeof metadata.resolutionProposalId === "string" ? metadata.resolutionProposalId : null,
      recoveryProposalId: typeof metadata.resolutionRecoveryProposalId === "string" ? metadata.resolutionRecoveryProposalId : null,
      correctionPending: !!metadata.correctionProposalId }, history,
      nextCursor: rows.length > 25 && last ? { id: last.id, createdAt: last.createdAt.toISOString() } : null, asOf: new Date().toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
export async function searchSuspenseClearingJournals(input: SuspenseClearingSearchInput, control: SuspenseCorrectionControl) {
  const parsed = suspenseClearingSearchSchema.parse(input)
  return db.$transaction(async tx => {
    const item = await source(tx, parsed.suspenseItemId, control)
    if (!item.suspenseLedgerAccountId) throw new ConflictError("Suspense account setup is missing.")
    const rows = await tx.journalEntry.findMany({ where: { organizationId: control.organizationId, status: "POSTED", sourceType: "MANUAL", postingPurpose: "MANUAL_JOURNAL", reversalOfEntryId: null,
      lines: { some: { organizationId: control.organizationId, accountId: item.suspenseLedgerAccountId } },
      AND: [...(parsed.search ? [{ OR: [{ entryNumber: { contains: parsed.search, mode: "insensitive" as const } }, { reference: { contains: parsed.search, mode: "insensitive" as const } }] }] : []),
        ...(parsed.cursor ? [{ OR: [{ createdAt: { lt: new Date(parsed.cursor.createdAt) } }, { createdAt: new Date(parsed.cursor.createdAt), id: { lt: parsed.cursor.id } }] }] : [])] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 26, select: { id: true, entryNumber: true, entryDate: true, createdAt: true, currency: true, reference: true } })
    const page = rows.slice(0, 25), last = page.at(-1)
    return { journals: page.map(row => ({ id: row.id, number: row.entryNumber, date: row.entryDate.toISOString(), currency: row.currency, reference: row.reference })),
      nextCursor: rows.length > 25 && last ? { id: last.id, createdAt: last.createdAt.toISOString() } : null, eligibilityVerified: false as const, asOf: new Date().toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
