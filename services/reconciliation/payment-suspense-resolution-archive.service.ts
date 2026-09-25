import { Prisma } from "@prisma/client"
import { ConflictError } from "@/services/_shared/action-errors"
import { assertBalancedJournalEntry } from "@/services/accounting/invariants"
import { assertCompensatedSuspenseCycleInTx, assertCycleJournal, correctionJournalHash, correctionJournalInclude, correctionLineEvidence, type CorrectionJournal } from "./payment-suspense-cycle-ledger.service"
import { assertSuspenseResolutionRecoveryInTx } from "./payment-suspense-resolution-recovery-evidence.service"
import { parseSuspenseResolutionRecord, suspenseResolutionRecordRevision, type ResolutionRecord } from "./payment-suspense-resolution-record"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"

type Tx = Prisma.TransactionClient
type Row = Prisma.PaymentReconciliationInboxItemGetPayload<Record<string, never>>
const fail = () => { throw new ConflictError("Historical resolution financial or decision evidence requires review.") }
const include = { ...correctionJournalInclude, lines: { include: { account: { select: { organizationId: true, type: true } } }, orderBy: { lineNumber: "asc" } } } satisfies Prisma.JournalEntryInclude
async function record(tx: Tx, organizationId: string, itemId: string, id: string) {
  const row = await tx.paymentReconciliationInboxItem.findFirst({ where: { id, organizationId, externalId: itemId, source: "SUSPENSE_POST", status: "PROCESSED" } })
  if (!row) return fail()
  return row
}
function event(row: Row) { return { id: row.id, revision: suspenseResolutionRecordRevision(row), payloadHash: row.payloadHash, recordedAt: row.createdAt.toISOString(), ...parseSuspenseResolutionRecord(row) } }
function journal(entry: CorrectionJournal) {
  return { id: entry.id, number: entry.entryNumber, entryDate: entry.entryDate.toISOString(), periodId: entry.periodId, currency: entry.currency,
    statusObserved: entry.status, sourceType: entry.sourceType, sourceId: entry.sourceId, postingPurpose: entry.postingPurpose,
    batchId: entry.postingBatchId, cycle: entry.postingBatch!.postingCycle, postedById: entry.postedById, reversalOfEntryId: entry.reversalOfEntryId,
    retainedFinancialHash: correctionJournalHash(entry), lines: entry.lines.map(line => { const { dimensions, ...value } = correctionLineEvidence(line); return { ...value, dimensionsHash: suspenseEvidenceHash(dimensions) } }),
    sourceLinks: entry.sourceLinks.filter(link => link.organizationId === entry.organizationId && link.journalEntryId === entry.id && link.postingBatchId === entry.postingBatchId
      && link.sourceType === entry.sourceType && link.sourceId === entry.sourceId).map(link => ({ id: link.id, sourceType: link.sourceType, sourceId: link.sourceId })) }
}
async function resolution(tx: Tx, organizationId: string, item: { id: string; metadata: unknown; ledgerPostingBatchId: string | null }, selected: Row, data: ResolutionRecord) {
  const proposal = data.kind === "SUSPENSE_RESOLUTION_PROPOSED_V1" ? selected : await record(tx, organizationId, item.id, data.proposalId)
  const proposed = parseSuspenseResolutionRecord(proposal)
  if (proposed.kind !== "SUSPENSE_RESOLUTION_PROPOSED_V1" || proposed.originalJournalId !== data.originalJournalId || proposed.cycle !== data.cycle
    || proposed.financialHash !== data.financialHash || proposed.proposedById !== data.proposedById || suspenseEvidenceHash(proposed.draft) !== suspenseEvidenceHash(data.draft)) return fail()
  if (!await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceId: item.id, actorId: proposed.proposedById, action: "SUSPENSE_RESOLUTION_PROPOSE", metadata: { path: ["proposalId"], equals: proposal.id } } })) return fail()
  const original = await tx.journalEntry.findFirst({ where: { id: data.originalJournalId, organizationId }, include })
  const clearing = await tx.journalEntry.findFirst({ where: { id: data.draft.clearingJournalId, organizationId }, include })
  if (!original || !clearing) return fail()
  assertCycleJournal(original, organizationId, item.id, data.cycle, false)
  if (!["POSTED", "REVERSED"].includes(original.status) || original.postingBatch?.status !== original.status) return fail()
  let originalApproval = suspenseMetadata(suspenseMetadata(item.metadata).postingApproval), originalReversal: CorrectionJournal | null = null
  if (original.status === "REVERSED") {
    const proof = await assertCompensatedSuspenseCycleInTx(tx, organizationId, item.id, data.cycle)
    if (proof.original.id !== original.id) return fail()
    originalApproval = suspenseMetadata(suspenseMetadata(proof.receipt.payloadSummary).originalApproval); originalReversal = proof.reversal
  } else if (item.ledgerPostingBatchId !== original.postingBatchId) return fail()
  if (typeof originalApproval.inboxItemId !== "string" || originalApproval.ledgerPostingBatchId !== original.postingBatchId
    || originalApproval.approvedById !== original.postedById || originalApproval.approvedById === originalApproval.proposedById) return fail()
  const approval = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: originalApproval.inboxItemId, organizationId, source: "SUSPENSE_POST", status: "PROCESSED", externalId: original.postingBatchId,
    idempotencyKey: data.cycle === 1 ? `${item.id}:posting-approval` : `${item.id}:posting-approval:cycle:${data.cycle}` } })
  const saved = suspenseMetadata(approval?.payloadSummary)
  const originalAudit = await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceId: item.id, action: "PAYMENT_RECONCILIATION_SUSPENSE_POST_APPROVE", actorId: original.postedById, postingBatchId: original.postingBatchId } })
  if (!approval || !originalAudit || approval.payloadHash !== suspenseEvidenceHash(approval.payloadSummary).slice(7) || saved.suspenseItemId !== item.id
    || saved.ledgerPostingBatchId !== original.postingBatchId || saved.approvedById !== originalApproval.approvedById || saved.requestedById !== originalApproval.proposedById
    || saved.reviewedRevision !== originalApproval.reviewedRevision || typeof saved.suspenseLedgerAccountId !== "string"
    || originalApproval.approvedAt !== approval.processedAt?.toISOString()) return fail()
  const batch = clearing.postingBatch
  if (!batch || !["POSTED", "REVERSED"].includes(clearing.status) || batch.status !== clearing.status || batch.organizationId !== organizationId
    || clearing.sourceType !== "MANUAL" || clearing.sourceId !== clearing.id || clearing.postingPurpose !== "MANUAL_JOURNAL" || clearing.reversalOfEntryId
    || batch.sourceType !== "MANUAL" || batch.sourceId !== clearing.id || batch.postingPurpose !== "MANUAL_JOURNAL" || batch.postingCycle !== 1
    || batch.periodId !== clearing.periodId || !clearing.createdById || !clearing.postedById || !clearing.postedAt || clearing.createdById === clearing.postedById
    || !clearing.reference?.trim() || clearing.lines.length !== 2 || clearing.lines.some(line => line.organizationId !== organizationId || line.account.organizationId !== organizationId)
    || clearing.sourceLinks.filter(link => link.organizationId === organizationId && link.journalEntryId === clearing.id && link.postingBatchId === batch.id && link.sourceType === "MANUAL" && link.sourceId === clearing.id).length !== 1) return fail()
  const clearingAudit = await tx.ledgerAuditEvent.findFirst({ where: { organizationId, action: "JOURNAL_ENTRY_POST", actorId: clearing.postedById, journalEntryId: clearing.id, postingBatchId: batch.id } })
  if (!clearingAudit) return fail()
  assertBalancedJournalEntry(clearing.lines)
  const basis = suspenseMetadata(suspenseMetadata(original.postingBatch!.metadata).currencyBasis)
  if (basis.version !== 1 || basis.baseCurrency !== original.currency || basis.sourceCurrency !== original.currency || clearing.currency !== original.currency
    || saved.currencyCode !== original.currency || clearing.entryDate < original.entryDate
    || clearing.lines.some(line => line.currency !== clearing.currency || !line.exchangeRate.eq(1) || line.baseDebit == null || line.baseCredit == null || !line.baseDebit.eq(line.debit) || !line.baseCredit.eq(line.credit))) return fail()
  const source = original.lines.filter(line => line.accountId === saved.suspenseLedgerAccountId), cleared = clearing.lines.filter(line => line.accountId === saved.suspenseLedgerAccountId)
  if (source.length !== 1 || cleared.length !== 1 || !source[0].debit.eq(cleared[0].credit) || !source[0].credit.eq(cleared[0].debit)
    || source[0].baseDebit == null || source[0].baseCredit == null || !source[0].baseDebit.eq(cleared[0].baseCredit!) || !source[0].baseCredit.eq(cleared[0].baseDebit!)) return fail()
  const destination = clearing.lines.find(line => line.id !== cleared[0].id)!
  if (destination.account.type === "MEMO" || original.lines.some(line => line.accountId === destination.accountId)
    || (data.draft.outcome === "WRITTEN_OFF" && (destination.account.type !== "EXPENSE" || destination.debit.lte(0) || source[0].debit.lte(0)))
    || (data.draft.outcome === "RESOLVED" && destination.account.type === "EXPENSE")) return fail()
  const financialHash = suspenseEvidenceHash({ original: correctionJournalHash(original), originalApproval, clearing: correctionJournalHash(clearing), currencyBasis: basis,
    counterpartType: destination.account.type, reference: clearing.reference, cycle: data.cycle })
  if (financialHash !== data.financialHash) return fail()
  const decision = data.kind === "SUSPENSE_RESOLUTION_PROPOSED_V1" ? null : data
  let allocation: Row | null = null, clearingReversal: CorrectionJournal | null = null
  if (decision) {
    const audit = await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceId: item.id, actorId: decision.decidedById, journalEntryId: clearing.id,
      action: decision.kind === "SUSPENSE_RESOLUTION_APPROVED_V1" ? "SUSPENSE_RESOLUTION_APPROVE" : "SUSPENSE_RESOLUTION_REJECT", metadata: { path: ["decisionId"], equals: selected.id } } })
    const metadata = suspenseMetadata(audit?.metadata)
    if (!audit || metadata.decisionId !== selected.id || metadata.proposalId !== proposal.id || decision.decidedById === proposed.proposedById) return fail()
    if (decision.kind === "SUSPENSE_RESOLUTION_APPROVED_V1") {
      allocation = await record(tx, organizationId, item.id, decision.allocationId)
      const allocated = suspenseMetadata(allocation.payloadSummary)
      if (allocation.payloadHash !== suspenseEvidenceHash(allocation.payloadSummary).slice(7) || allocated.kind !== "SUSPENSE_RESOLUTION_ALLOCATION_V1"
        || allocated.decisionId !== selected.id || allocated.suspenseItemId !== item.id || allocated.clearingJournalId !== clearing.id
        || allocation.idempotencyKey !== `suspense-resolution-clearing:${clearing.id}` || decision.decidedById === clearing.createdById) return fail()
      if (clearing.status === "REVERSED") clearingReversal = (await assertSuspenseResolutionRecoveryInTx(tx, organizationId, item.id, allocation.id)).reversal
      else if (suspenseMetadata(item.metadata).resolutionDecisionId !== selected.id || suspenseMetadata(item.metadata).resolutionReceiptId !== allocation.id) return fail()
    }
  }
  // Proposals and rejected decisions remain historical even if an unallocated clearing was reversed later.
  if (clearing.status === "REVERSED" && !clearingReversal) {
    const reversals = await tx.journalEntry.findMany({ where: { organizationId, reversalOfEntryId: clearing.id }, include: correctionJournalInclude })
    if (reversals.length !== 1) return fail()
    const reversal = reversals[0], reverseBatch = reversal.postingBatch
    if (reversal.status !== "POSTED" || reverseBatch?.status !== "POSTED" || reverseBatch.organizationId !== organizationId || reversal.sourceType !== "MANUAL"
      || reversal.sourceId !== clearing.id || reversal.postingPurpose !== "REVERSAL" || reverseBatch.sourceId !== clearing.id || reverseBatch.sourceType !== "MANUAL"
      || reverseBatch.postingPurpose !== "REVERSAL" || reverseBatch.periodId !== reversal.periodId || reverseBatch.postingCycle !== 1 || !reversal.postedAt || !clearing.reversedAt
      || reversal.currency !== clearing.currency || reversal.lines.some(line => line.organizationId !== organizationId || line.account.organizationId !== organizationId)
      || reversal.sourceLinks.filter(link => link.organizationId === organizationId && link.journalEntryId === reversal.id && link.postingBatchId === reverseBatch.id && link.sourceType === "MANUAL" && link.sourceId === clearing.id).length !== 1
      || suspenseEvidenceHash(clearing.lines.map(line => correctionLineEvidence(line, true))) !== suspenseEvidenceHash(reversal.lines.map(line => correctionLineEvidence(line)))) return fail()
    clearingReversal = reversal
  }
  return { selectedRecord: event(selected), proposal: event(proposal), financialHash,
    originalApproval: { id: approval.id, payloadHash: approval.payloadHash, auditId: originalAudit.id, approvedById: original.postedById, proposedById: originalApproval.proposedById, approvedAt: originalApproval.approvedAt },
    originalJournal: journal(original), originalReversal: originalReversal ? journal(originalReversal) : null,
    clearingJournal: journal(clearing), clearingPostingAuditId: clearingAudit.id, clearingReversal: clearingReversal ? journal(clearingReversal) : null,
    allocation: allocation ? { id: allocation.id, payloadHash: allocation.payloadHash } : null }
}

export async function loadSuspenseResolutionArchiveInTx(tx: Tx, organizationId: string, itemId: string, row: Row) {
  const item = await tx.suspenseItem.findFirst({ where: { id: itemId, organizationId }, select: { id: true, status: true, updatedAt: true, metadata: true, ledgerPostingBatchId: true } })
  if (!item || row.organizationId !== organizationId || row.externalId !== itemId || row.source !== "SUSPENSE_POST" || row.status !== "PROCESSED") return fail()
  const data = parseSuspenseResolutionRecord(row)
  if ("originalJournalId" in data) return { ...await resolution(tx, organizationId, item, row, data), recovery: null }
  const proposal = data.kind === "SUSPENSE_RESOLUTION_RECOVERY_PROPOSED_V1" ? row : await record(tx, organizationId, itemId, data.proposalId)
  const proposed = parseSuspenseResolutionRecord(proposal)
  if (proposed.kind !== "SUSPENSE_RESOLUTION_RECOVERY_PROPOSED_V1" || proposed.allocationId !== data.allocationId || proposed.financialHash !== data.financialHash
    || proposed.proposedById !== data.proposedById || proposed.clearingJournalId !== data.clearingJournalId || proposed.clearingJournalHash !== data.clearingJournalHash) return fail()
  if (!await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceId: itemId, actorId: proposed.proposedById, action: "SUSPENSE_RESOLUTION_RECOVERY_PROPOSE", metadata: { path: ["proposalId"], equals: proposal.id } } })) return fail()
  const allocation = await record(tx, organizationId, itemId, data.allocationId), allocated = suspenseMetadata(allocation.payloadSummary)
  if (typeof allocated.decisionId !== "string") return fail()
  const originalDecision = await record(tx, organizationId, itemId, allocated.decisionId), original = parseSuspenseResolutionRecord(originalDecision)
  if (original.kind !== "SUSPENSE_RESOLUTION_APPROVED_V1" || original.allocationId !== allocation.id) return fail()
  const history = await resolution(tx, organizationId, item, originalDecision, original)
  const proof = { decisionId: originalDecision.id, decisionHash: originalDecision.payloadHash, allocationId: allocation.id, allocationHash: allocation.payloadHash, financialHash: history.financialHash }
  if (data.financialHash !== suspenseEvidenceHash({ proof, clearingHash: history.clearingJournal.retainedFinancialHash, originalHash: history.originalJournal.retainedFinancialHash })
    || data.clearingJournalHash !== history.clearingJournal.retainedFinancialHash || proposed.clearingPostedById !== history.clearingJournal.postedById) return fail()
  if (data.kind !== "SUSPENSE_RESOLUTION_RECOVERY_PROPOSED_V1") {
    if (data.approvedById === proposed.proposedById || data.approvedById === proposed.clearingPostedById || data.resolutionDecisionId !== originalDecision.id || data.resolutionDecisionHash !== originalDecision.payloadHash) return fail()
    if (data.kind === "SUSPENSE_RESOLUTION_RECOVERY_APPROVED_V1") {
      const recovered = await assertSuspenseResolutionRecoveryInTx(tx, organizationId, itemId, allocation.id)
      if (recovered.receipt.id !== data.recoveryReceiptId || suspenseMetadata(recovered.receipt.payloadSummary).proposalId !== proposal.id) return fail()
    } else {
      const audit = await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceId: itemId, actorId: data.approvedById, action: "SUSPENSE_RESOLUTION_RECOVERY_REJECT", metadata: { path: ["receiptId"], equals: row.id } } })
      if (!audit || suspenseMetadata(audit.metadata).receiptId !== row.id) return fail()
    }
  }
  return { ...history, selectedRecord: event(row), recovery: { proposal: event(proposal), selectedRecord: event(row) } }
}
