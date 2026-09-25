import { Prisma } from "@prisma/client"
import { ConflictError } from "@/services/_shared/action-errors"
import { assertBalancedJournalEntry } from "@/services/accounting/invariants"
import { correctionJournalHash, correctionJournalInclude, correctionLineEvidence } from "./payment-suspense-cycle-ledger.service"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"

export async function assertSuspenseResolutionRecoveryInTx(tx: Prisma.TransactionClient, organizationId: string, itemId: string, allocationId: string) {
  const allocation = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: allocationId, organizationId, externalId: itemId, source: "SUSPENSE_POST", status: "PROCESSED" } })
  const allocated = suspenseMetadata(allocation?.payloadSummary)
  if (!allocation || allocation.payloadHash !== suspenseEvidenceHash(allocation.payloadSummary).slice(7) || allocated.kind !== "SUSPENSE_RESOLUTION_ALLOCATION_V1"
    || allocated.suspenseItemId !== itemId || typeof allocated.clearingJournalId !== "string" || typeof allocated.decisionId !== "string"
    || allocation.idempotencyKey !== `suspense-resolution-clearing:${allocated.clearingJournalId}`) throw new ConflictError("Retained clearing allocation requires recovery review.")
  const receipt = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId, externalId: itemId, source: "SUSPENSE_POST", status: "PROCESSED", idempotencyKey: `suspense-resolution-recovered:${allocationId}` } })
  const saved = suspenseMetadata(receipt?.payloadSummary)
  if (!receipt || receipt.payloadHash !== suspenseEvidenceHash(receipt.payloadSummary).slice(7) || saved.kind !== "SUSPENSE_RESOLUTION_RECOVERED_V1"
    || saved.suspenseItemId !== itemId || saved.allocationId !== allocationId || saved.resolutionDecisionId !== allocated.decisionId
    || saved.clearingJournalId !== allocated.clearingJournalId || typeof saved.reversalJournalId !== "string" || typeof saved.proposalId !== "string"
    || typeof saved.proposedById !== "string" || typeof saved.approvedById !== "string" || saved.proposedById === saved.approvedById) throw new ConflictError("Clearing allocation has no verified source recovery.")
  const clearing = await tx.journalEntry.findFirst({ where: { id: allocated.clearingJournalId, organizationId }, include: correctionJournalInclude })
  const reversal = await tx.journalEntry.findFirst({ where: { id: saved.reversalJournalId, organizationId }, include: correctionJournalInclude })
  if (!clearing || !reversal || !clearing.postingBatch || !reversal.postingBatch
    || clearing.status !== "REVERSED" || clearing.postingBatch.status !== "REVERSED" || !clearing.reversedAt || clearing.reversedById !== saved.approvedById
    || clearing.sourceType !== "MANUAL" || clearing.sourceId !== clearing.id || clearing.postingPurpose !== "MANUAL_JOURNAL"
    || reversal.status !== "POSTED" || reversal.postingBatch.status !== "POSTED" || reversal.reversalOfEntryId !== clearing.id
    || reversal.sourceType !== "MANUAL" || reversal.sourceId !== clearing.id || reversal.postingPurpose !== "REVERSAL"
    || reversal.postedById !== saved.approvedById || clearing.postedById === saved.approvedById
    || clearing.currency !== reversal.currency || clearing.lines.length !== 2 || reversal.lines.length !== 2
    || correctionJournalHash(clearing) !== saved.clearingJournalHash || correctionJournalHash(reversal) !== saved.reversalJournalHash
    || suspenseEvidenceHash(clearing.lines.map(line => correctionLineEvidence(line, true))) !== suspenseEvidenceHash(reversal.lines.map(line => correctionLineEvidence(line)))) {
    throw new ConflictError("Source recovery does not exactly neutralize its retained clearing journal.")
  }
  for (const journal of [clearing, reversal]) {
    const batch = journal.postingBatch!
    if (batch.organizationId !== organizationId || batch.sourceType !== "MANUAL" || batch.sourceId !== clearing.id
      || batch.postingPurpose !== journal.postingPurpose || batch.postingCycle !== 1 || batch.periodId !== journal.periodId
      || journal.lines.some(line => line.organizationId !== organizationId || line.account.organizationId !== organizationId)
      || journal.sourceLinks.filter(link => link.organizationId === organizationId && link.journalEntryId === journal.id && link.postingBatchId === batch.id
        && link.sourceType === "MANUAL" && link.sourceId === clearing.id).length !== 1) throw new ConflictError("Source recovery journal linkage requires review.")
    assertBalancedJournalEntry(journal.lines)
  }
  const proposal = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: saved.proposalId, organizationId, externalId: itemId, source: "SUSPENSE_POST", status: "PROCESSED" } })
  const proposed = suspenseMetadata(proposal?.payloadSummary)
  const decision = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId, externalId: itemId, source: "SUSPENSE_POST", status: "PROCESSED", idempotencyKey: `suspense-resolution-recovery-decision:${saved.proposalId}` } })
  const decided = suspenseMetadata(decision?.payloadSummary)
  const audit = await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceId: itemId, action: "SUSPENSE_RESOLUTION_RECOVER", actorId: saved.approvedById, journalEntryId: reversal.id, postingBatchId: reversal.postingBatchId } })
  const originalDecision = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: allocated.decisionId, organizationId, externalId: itemId, source: "SUSPENSE_POST", status: "PROCESSED" } })
  const original = suspenseMetadata(originalDecision?.payloadSummary)
  if (!proposal || proposal.payloadHash !== suspenseEvidenceHash(proposal.payloadSummary).slice(7) || proposed.kind !== "SUSPENSE_RESOLUTION_RECOVERY_PROPOSED_V1"
    || proposed.proposedById !== saved.proposedById || proposed.allocationId !== allocationId || proposed.financialHash !== saved.financialHash
    || proposed.clearingPostedById !== clearing.postedById || proposed.clearingJournalHash !== saved.clearingJournalHash
    || !decision || decision.payloadHash !== suspenseEvidenceHash(decision.payloadSummary).slice(7) || decided.kind !== "SUSPENSE_RESOLUTION_RECOVERY_APPROVED_V1"
    || decided.recoveryReceiptId !== receipt.id || decided.commandHash !== saved.commandHash || !audit
    || !originalDecision || originalDecision.payloadHash !== saved.resolutionDecisionHash || originalDecision.payloadHash !== suspenseEvidenceHash(originalDecision.payloadSummary).slice(7)
    || original.kind !== "SUSPENSE_RESOLUTION_APPROVED_V1" || original.allocationId !== allocationId || original.suspenseItemId !== itemId
    || suspenseMetadata(reversal.postingBatch.metadata).resolutionRecoveryReceiptId !== receipt.id) throw new ConflictError("Source recovery independent decision lineage requires review.")
  return { receipt, clearing, reversal }
}

export async function assertPriorSuspenseResolutionsInTx(tx: Prisma.TransactionClient, organizationId: string, item: { id: string; status?: string; metadata?: unknown }) {
  const allocations = await tx.paymentReconciliationInboxItem.findMany({ where: { organizationId, externalId: item.id, source: "SUSPENSE_POST", idempotencyKey: { startsWith: "suspense-resolution-clearing:" } }, select: { id: true } })
  const active = ["RESOLVED", "WRITTEN_OFF"].includes(item.status ?? "") ? suspenseMetadata(item.metadata).resolutionReceiptId : null
  for (const allocation of allocations) if (allocation.id !== active) await assertSuspenseResolutionRecoveryInTx(tx, organizationId, item.id, allocation.id)
}
