import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { assertBalancedJournalEntry } from "@/services/accounting/invariants"
import { loadVerifiedPostedSuspenseInTx, type SuspenseCorrectionControl } from "./payment-suspense-correction.service"
import { correctionJournalHash, correctionJournalInclude } from "./payment-suspense-cycle-ledger.service"
import { suspenseEvidenceHash, suspenseEvidenceRevision, suspenseMetadata } from "./payment-suspense-evidence"
import { suspenseResolutionClearingKey, suspenseResolutionDraftSchema, type SuspenseResolutionDraft } from "./payment-suspense-resolution.contracts"

const clearingInclude = {
  ...correctionJournalInclude,
  lines: { include: { account: { select: { organizationId: true, type: true, code: true, nameEn: true, nameFr: true } } }, orderBy: { lineNumber: "asc" } },
} satisfies Prisma.JournalEntryInclude

export async function loadSuspenseResolutionEvidenceInTx(tx: Prisma.TransactionClient, draft: SuspenseResolutionDraft, control: Pick<SuspenseCorrectionControl, "organizationId" | "now">, resolvedReceiptId?: string) {
  const current = await loadVerifiedPostedSuspenseInTx(tx, control, draft.suspenseItemId, { allowResolved: !!resolvedReceiptId, allowResolutionProposal: true })
  if (suspenseMetadata(current.item.metadata).correctionProposalId) throw new ConflictError("A pending posting correction must be reviewed before final resolution.")
  const clearing = await tx.journalEntry.findFirst({ where: { id: draft.clearingJournalId, organizationId: control.organizationId }, include: clearingInclude })
  if (!clearing) throw new NotFoundError("Clearing journal is unavailable in this workspace.")
  const batch = clearing.postingBatch, original = current.journal
  if (clearing.id === original.id || clearing.status !== "POSTED" || !clearing.postedAt || !clearing.createdById || !clearing.postedById
    || clearing.createdById === clearing.postedById || clearing.reversalOfEntryId || !clearing.reference?.trim()
    || clearing.sourceType !== "MANUAL" || clearing.sourceId !== clearing.id || clearing.postingPurpose !== "MANUAL_JOURNAL"
    || !batch || batch.organizationId !== control.organizationId || batch.status !== "POSTED" || batch.sourceType !== "MANUAL"
    || batch.sourceId !== clearing.id || batch.postingPurpose !== "MANUAL_JOURNAL" || batch.postingCycle !== 1
    || clearing.periodId !== batch.periodId || clearing.lines.length !== 2
    || clearing.lines.some(line => line.organizationId !== control.organizationId || line.account.organizationId !== control.organizationId)) {
    throw new BusinessRuleError("Resolution requires a separately posted, independently approved two-line manual clearing journal with a retained reference.")
  }
  const links = clearing.sourceLinks.filter(link => link.organizationId === control.organizationId && link.journalEntryId === clearing.id
    && link.postingBatchId === batch.id && link.sourceType === "MANUAL" && link.sourceId === clearing.id)
  const audit = await tx.ledgerAuditEvent.findFirst({ where: { organizationId: control.organizationId, action: "JOURNAL_ENTRY_POST",
    actorId: clearing.postedById, journalEntryId: clearing.id, postingBatchId: batch.id } })
  if (links.length !== 1 || !audit) throw new ConflictError("Clearing journal source linkage or posting approval evidence requires review.")
  const now = control.now ?? new Date()
  if (clearing.entryDate < original.entryDate || clearing.entryDate > now) throw new BusinessRuleError("Clearing date must be on or after the original posting and no later than today.")
  const basis = suspenseMetadata(suspenseMetadata(original.postingBatch?.metadata).currencyBasis)
  const settings = await tx.organizationAccountingSettings.findUnique({ where: { organizationId: control.organizationId }, select: { baseCurrency: true } })
  const currency = current.item.currencyCode.trim().toUpperCase()
  if (basis.version !== 1 || basis.baseCurrency !== currency || settings?.baseCurrency.trim().toUpperCase() !== basis.baseCurrency
    || clearing.currency !== currency || clearing.lines.some(line => line.currency !== clearing.currency || !line.exchangeRate.eq(1)
      || line.baseDebit == null || line.baseCredit == null || !line.baseDebit.eq(line.debit) || !line.baseCredit.eq(line.credit))) {
    throw new BusinessRuleError("Resolution requires verified matching original and clearing accounting currencies.", "SUSPENSE_CURRENCY_EVIDENCE_REQUIRED")
  }
  assertBalancedJournalEntry(clearing.lines)
  const source = original.lines.filter(line => line.accountId === current.item.suspenseLedgerAccountId)
  const cleared = clearing.lines.filter(line => line.accountId === current.item.suspenseLedgerAccountId)
  if (source.length !== 1 || cleared.length !== 1 || !source[0].debit.eq(cleared[0].credit) || !source[0].credit.eq(cleared[0].debit)
    || source[0].baseDebit == null || source[0].baseCredit == null || !source[0].baseDebit.eq(cleared[0].baseCredit!) || !source[0].baseCredit.eq(cleared[0].baseDebit!)) {
    throw new BusinessRuleError("Clearing journal must offset the full suspense amount on the same account and currency, including base amounts.")
  }
  const counterpart = clearing.lines.find(line => line.id !== cleared[0].id)!
  if (counterpart.account.type === "MEMO") throw new BusinessRuleError("A memorandum account cannot establish financial clearing.")
  if (original.lines.some(line => line.accountId === counterpart.accountId)) throw new BusinessRuleError("An exact reversal of the original classification reopens the obligation; it cannot establish final resolution.")
  if (draft.outcome === "WRITTEN_OFF" && (counterpart.account.type !== "EXPENSE" || counterpart.debit.lte(0) || source[0].debit.lte(0))) {
    throw new BusinessRuleError("This write-off path requires a debit suspense balance cleared to an independently posted expense. Other write-off policies require accounting review.")
  }
  if (draft.outcome === "RESOLVED" && counterpart.account.type === "EXPENSE") throw new BusinessRuleError("A clearing expense must be explicitly reviewed as a write-off.")
  const reservation = await tx.paymentReconciliationInboxItem.findFirst({ where: { organizationId: control.organizationId, source: "SUSPENSE_POST", idempotencyKey: suspenseResolutionClearingKey(clearing.id) } })
  if (resolvedReceiptId) {
    if (reservation?.id !== resolvedReceiptId || reservation.externalId !== current.item.id || reservation.status !== "PROCESSED"
      || suspenseMetadata(current.item.metadata).resolutionReceiptId !== resolvedReceiptId || current.item.status !== draft.outcome || !current.item.resolvedAt) {
      throw new ConflictError("Retained resolution allocation requires review.")
    }
  } else if (reservation) throw new ConflictError("This clearing journal is already allocated to a suspense resolution.")
  const financialHash = suspenseEvidenceHash({ original: correctionJournalHash(original), originalApproval: current.originalApproval, clearing: correctionJournalHash(clearing),
    currencyBasis: basis, counterpartType: counterpart.account.type, reference: clearing.reference, cycle: current.cycle })
  const revision = suspenseEvidenceHash({ draft, financialHash, itemRevision: suspenseEvidenceRevision(current.item, current.item.postedAt!) })
  return { ...current, clearing, counterpart, financialHash, revision }
}

export async function previewSuspenseResolution(input: SuspenseResolutionDraft, control: SuspenseCorrectionControl) {
  const draft = suspenseResolutionDraftSchema.parse(input)
  if (!hasRbacPermission(control.actorPermissions, "payments.reconciliation.read") || !hasRbacPermission(control.actorPermissions, "accounting.journal.read")) {
    throw new ForbiddenError("Reconciliation and accounting journal read permissions are required.")
  }
  return db.$transaction(async tx => {
    if (!await tx.user.findFirst({ where: { id: control.actorId, organizationId: control.organizationId, isActive: true }, select: { id: true } })) throw new ForbiddenError("Active workspace actor is required.")
    const current = await loadSuspenseResolutionEvidenceInTx(tx, draft, control)
    return { scope: { organizationId: control.organizationId, actorId: control.actorId }, revision: current.revision, suspenseItemId: current.item.id,
      currentStatus: current.item.status, proposedOutcome: draft.outcome, cycle: current.cycle, amount: current.item.amount.toFixed(2), currencyCode: current.item.currencyCode,
      originalJournal: { id: current.journal.id, number: current.journal.entryNumber },
      clearingJournal: { id: current.clearing.id, number: current.clearing.entryNumber, date: current.clearing.entryDate.toISOString(), reference: current.clearing.reference },
      destination: { id: current.counterpart.accountId, code: current.counterpart.account.code, nameEn: current.counterpart.account.nameEn, nameFr: current.counterpart.account.nameFr, type: current.counterpart.account.type },
      newFinancialPosting: false, resolutionRecorded: false, asOf: (control.now ?? new Date()).toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function suspenseResolutionManifestEvidenceInTx(tx: Prisma.TransactionClient, organizationId: string, item: { id: string; status: string; metadata: unknown }) {
  if (!["RESOLVED", "WRITTEN_OFF"].includes(item.status)) return null
  const metadata = suspenseMetadata(item.metadata)
  if (typeof metadata.resolutionDecisionId !== "string" || typeof metadata.resolutionReceiptId !== "string") throw new ConflictError("Final suspense status lacks verified resolution evidence.")
  const decision = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: metadata.resolutionDecisionId, organizationId, source: "SUSPENSE_POST", status: "PROCESSED", externalId: item.id } })
  const record = suspenseMetadata(decision?.payloadSummary)
  if (!decision || decision.payloadHash !== suspenseEvidenceHash(decision.payloadSummary).slice(7) || record.kind !== "SUSPENSE_RESOLUTION_APPROVED_V1"
    || record.allocationId !== metadata.resolutionReceiptId || record.suspenseItemId !== item.id || typeof record.proposalId !== "string"
    || typeof record.decidedById !== "string" || typeof record.proposedById !== "string" || record.decidedById === record.proposedById
    || decision.idempotencyKey !== `suspense-resolution-decision:${record.proposalId}`) throw new ConflictError("Final suspense approval record requires review.")
  const draft = suspenseResolutionDraftSchema.parse(record.draft)
  if (draft.suspenseItemId !== item.id || draft.outcome !== item.status) throw new ConflictError("Final suspense outcome does not match its decision.")
  const proof = await loadSuspenseResolutionEvidenceInTx(tx, draft, { organizationId }, metadata.resolutionReceiptId)
  if (proof.financialHash !== record.financialHash || proof.clearing.createdById === record.decidedById) throw new ConflictError("Clearing evidence changed after final resolution.")
  const proposal = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: record.proposalId, organizationId, source: "SUSPENSE_POST", status: "PROCESSED", externalId: item.id } })
  const proposed = suspenseMetadata(proposal?.payloadSummary)
  const allocation = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: metadata.resolutionReceiptId, organizationId, source: "SUSPENSE_POST", status: "PROCESSED", externalId: item.id } })
  const allocated = suspenseMetadata(allocation?.payloadSummary)
  const audit = await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceId: item.id, action: "SUSPENSE_RESOLUTION_APPROVE", actorId: record.decidedById, journalEntryId: proof.clearing.id } })
  if (!proposal || proposal.payloadHash !== suspenseEvidenceHash(proposal.payloadSummary).slice(7) || proposed.kind !== "SUSPENSE_RESOLUTION_PROPOSED_V1"
    || proposed.proposedById !== record.proposedById || proposed.financialHash !== record.financialHash || suspenseEvidenceHash(proposed.draft) !== suspenseEvidenceHash(record.draft)
    || !allocation || allocation.payloadHash !== suspenseEvidenceHash(allocation.payloadSummary).slice(7) || allocated.kind !== "SUSPENSE_RESOLUTION_ALLOCATION_V1"
    || allocated.decisionId !== decision.id || allocated.suspenseItemId !== item.id || allocated.clearingJournalId !== proof.clearing.id || !audit) throw new ConflictError("Resolution approval and clearing allocation lineage require review.")
  return { decisionId: decision.id, decisionHash: decision.payloadHash, allocationId: allocation.id, allocationHash: allocation.payloadHash, financialHash: proof.financialHash }
}
