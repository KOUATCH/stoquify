import { Prisma } from "@prisma/client"
import { ConflictError } from "@/services/_shared/action-errors"
import { assertBalancedJournalEntry } from "@/services/accounting/invariants"
import { suspenseEvidenceHash, suspenseMetadata, suspensePostingCycle } from "./payment-suspense-evidence"

export const correctionJournalInclude = {
  postingBatch: true, sourceLinks: true,
  lines: { include: { account: { select: { organizationId: true } } }, orderBy: { lineNumber: "asc" } },
} satisfies Prisma.JournalEntryInclude
export type CorrectionJournal = Prisma.JournalEntryGetPayload<{ include: typeof correctionJournalInclude }>

export function correctionLineEvidence(line: CorrectionJournal["lines"][number], reverse = false) {
  return {
    lineNumber: line.lineNumber, accountId: line.accountId, currency: line.currency,
    debit: String(reverse ? line.credit : line.debit), credit: String(reverse ? line.debit : line.credit),
    baseDebit: (reverse ? line.baseCredit : line.baseDebit)?.toString() ?? null,
    baseCredit: (reverse ? line.baseDebit : line.baseCredit)?.toString() ?? null,
    exchangeRate: String(line.exchangeRate), dimensions: line.dimensions,
    locationId: line.locationId, customerId: line.customerId, supplierId: line.supplierId, itemId: line.itemId,
  }
}

export function correctionJournalHash(entry: CorrectionJournal) {
  return suspenseEvidenceHash({
    id: entry.id, organizationId: entry.organizationId, journalId: entry.journalId, periodId: entry.periodId,
    postingBatchId: entry.postingBatchId, entryDate: entry.entryDate.toISOString(), entryNumber: entry.entryNumber,
    sourceType: entry.sourceType, sourceId: entry.sourceId, purpose: entry.postingPurpose, currency: entry.currency,
    postedById: entry.postedById, reversalOfEntryId: entry.reversalOfEntryId,
    lines: entry.lines.map(line => correctionLineEvidence(line)),
  })
}

export function assertCycleJournal(entry: CorrectionJournal, organizationId: string, itemId: string, cycle: number, reversal: boolean) {
  const purpose = reversal ? "REVERSAL" : "SUSPENSE_RECLASSIFICATION", batch = entry.postingBatch
  if (!batch || entry.organizationId !== organizationId || batch.organizationId !== organizationId
    || entry.sourceType !== "PAYMENT_SUSPENSE" || entry.sourceId !== itemId || entry.postingPurpose !== purpose
    || batch.sourceType !== "PAYMENT_SUSPENSE" || batch.sourceId !== itemId || batch.postingPurpose !== purpose
    || batch.postingCycle !== cycle || batch.sourceVersion !== 1 || entry.lines.length < 2
    || entry.lines.some(line => line.organizationId !== organizationId || line.account.organizationId !== organizationId)) {
    throw new ConflictError("Suspense correction journal identity requires review.")
  }
  const links = entry.sourceLinks.filter(link => link.organizationId === organizationId && link.sourceType === "PAYMENT_SUSPENSE"
    && link.sourceId === itemId && link.postingBatchId === batch.id && link.journalEntryId === entry.id)
  if (links.length !== 1) throw new ConflictError("Suspense correction source linkage requires review.")
  assertBalancedJournalEntry(entry.lines)
}

export async function assertCompensatedSuspenseCycleInTx(tx: Prisma.TransactionClient, organizationId: string, itemId: string, cycle: number) {
  const entries = await tx.journalEntry.findMany({
    where: { organizationId, sourceType: "PAYMENT_SUSPENSE", sourceId: itemId,
      postingBatch: { organizationId, postingCycle: cycle, sourceType: "PAYMENT_SUSPENSE", sourceId: itemId } },
    include: correctionJournalInclude,
  })
  const original = entries.filter(entry => entry.postingPurpose === "SUSPENSE_RECLASSIFICATION"), reversals = entries.filter(entry => entry.postingPurpose === "REVERSAL")
  if (entries.length !== 2 || original.length !== 1 || reversals.length !== 1) throw new ConflictError("Suspense correction must retain one original and one compensating journal per cycle.")
  const prior = original[0], reversal = reversals[0]
  assertCycleJournal(prior, organizationId, itemId, cycle, false); assertCycleJournal(reversal, organizationId, itemId, cycle, true)
  if (prior.status !== "REVERSED" || prior.postingBatch?.status !== "REVERSED" || reversal.status !== "POSTED" || reversal.postingBatch?.status !== "POSTED"
    || reversal.reversalOfEntryId !== prior.id || prior.reversalOfEntryId !== null || prior.currency !== reversal.currency
    || suspenseEvidenceHash(prior.lines.map(line => correctionLineEvidence(line, true))) !== suspenseEvidenceHash(reversal.lines.map(line => correctionLineEvidence(line)))) {
    throw new ConflictError("Suspense compensating journal does not exactly reverse its original financial evidence.")
  }
  const receiptId = suspenseMetadata(reversal.postingBatch.metadata).correctionReceiptId
  if (typeof receiptId !== "string") throw new ConflictError("Suspense correction approval receipt is missing.")
  const receipt = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: receiptId, organizationId, source: "SUSPENSE_POST", status: "PROCESSED" } })
  const record = suspenseMetadata(receipt?.payloadSummary)
  if (!receipt || receipt.payloadHash !== suspenseEvidenceHash(receipt.payloadSummary).slice(7)
    || record.kind !== "SUSPENSE_CORRECTION_APPROVED_V1" || record.suspenseItemId !== itemId || record.cycle !== cycle
    || record.originalJournalId !== prior.id || record.reversalJournalId !== reversal.id
    || record.originalJournalHash !== correctionJournalHash(prior) || record.reversalJournalHash !== correctionJournalHash(reversal)
    || typeof record.approvedById !== "string" || typeof record.proposedById !== "string" || !record.proposedById
    || typeof record.proposalId !== "string" || receipt.externalId !== itemId
    || receipt.idempotencyKey !== `suspense-correction-decision:${record.proposalId}`
    || record.approvedById === record.proposedById || record.approvedById === prior.postedById
    || reversal.postedById !== record.approvedById) throw new ConflictError("Suspense correction approval lineage requires review.")
  const proposal = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: String(record.proposalId), organizationId,
    source: "SUSPENSE_POST", status: "PROCESSED", externalId: itemId } })
  const proposed = suspenseMetadata(proposal?.payloadSummary)
  if (!proposal || proposal.payloadHash !== suspenseEvidenceHash(proposal.payloadSummary).slice(7)
    || proposed.kind !== "SUSPENSE_CORRECTION_PROPOSED_V1" || proposed.suspenseItemId !== itemId || proposed.cycle !== cycle
    || proposed.proposedById !== record.proposedById || proposed.originalPostedById !== prior.postedById
    || proposed.originalJournalId !== prior.id || proposed.originalJournalHash !== record.originalJournalHash
    || proposed.originalPostingBatchId !== prior.postingBatchId
    || suspenseEvidenceHash(proposed.originalApproval) !== suspenseEvidenceHash(record.originalApproval)) {
    throw new ConflictError("Suspense correction proposal lineage requires review.")
  }
  return { original: prior, reversal, receipt }
}

export async function assertPriorSuspenseCyclesInTx(tx: Prisma.TransactionClient, organizationId: string, item: { id: string; metadata?: unknown }) {
  const cycle = suspensePostingCycle(item)
  if (!cycle) return 1
  const originals = await tx.ledgerPostingBatch.findMany({ where: { organizationId, sourceType: "PAYMENT_SUSPENSE", sourceId: item.id,
    postingPurpose: "SUSPENSE_RECLASSIFICATION", postingCycle: { lt: cycle.number } }, select: { postingCycle: true } })
  if (originals.length !== cycle.number - 1) throw new ConflictError("Suspense correction cycle chain is incomplete.")
  for (let number = 1; number < cycle.number; number++) {
    const proof = await assertCompensatedSuspenseCycleInTx(tx, organizationId, item.id, number)
    if (number === cycle.number - 1 && (proof.original.postingBatchId !== cycle.previousPostingBatchId
      || proof.reversal.id !== cycle.reversalJournalEntryId || proof.receipt.id !== cycle.correctionReceiptId)) {
      throw new ConflictError("Suspense current cycle does not match the retained correction decision.")
    }
  }
  return cycle.number
}
