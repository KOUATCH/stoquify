import "server-only"
import { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { apJournalEvidenceHash } from "./ap-control.service"
import { readVerifiedPaymentExecution } from "./payment-release-evidence"
import { paymentReconciliationDraftSchema, paymentReconciliationCommandSchema, paymentReconciliationDecisionSchema, paymentReconciliationReopenSchema, paymentReconciliationFinalizeSchema, type PaymentReconciliationDraft } from "./payment-reconciliation-contracts"

export const PAYMENT_RECONCILIATION_EVENT = "supplier.payment.reconciliation_reviewed"
export const reconciliationRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
export const paymentReconciliationRequired = () => new BusinessRuleError("Payment reconciliation evidence changed or is incomplete. Review the retained source and evidence.", "REVIEW_REQUIRED")
export const reconciliationJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
const hash = (value: unknown) => hashBusinessPayload(reconciliationJson(value))

/** Source owner: no substitute payment, ledger, suspense, or artificial provider. */
export async function readPaymentReconciliationSourceInTx(tx: Prisma.TransactionClient, organizationId: string, paymentId: string, requirePosted = true) {
  const execution = await readVerifiedPaymentExecution(tx, organizationId, paymentId), payment = execution.payment
  const transactions = await tx.paymentTransaction.findMany({ where: { organizationId, sourceType: "SUPPLIER_PAYMENT", sourceId: paymentId } }), transaction = transactions[0]
  const batch = await tx.ledgerPostingBatch.findFirst({ where: { id: payment.ledgerPostingBatchId!, organizationId, sourceType: "SUPPLIER_PAYMENT", sourceId: paymentId, postingPurpose: "SUPPLIER_PAYMENT" }, include: { journalEntries: { include: { lines: true } }, sourceLinks: true } })
  const journal = batch?.journalEntries[0], link = batch?.sourceLinks[0]
  if (!["RELEASED", "POSTED"].includes(payment.status) || transactions.length !== 1 || !transaction || transaction.id !== execution.payload.paymentTransactionId
    || transaction.ledgerPostingBatchId !== batch?.id || transaction.direction !== "OUTBOUND" || !transaction.amount.eq(payment.amount) || transaction.currencyCode !== payment.currency
    || transaction.occurredAt?.getTime() !== payment.paymentDate.getTime() || !batch || batch.journalEntries.length !== 1 || batch.sourceLinks.length !== 1 || !journal || !link
    || journal.organizationId !== organizationId || journal.sourceType !== "SUPPLIER_PAYMENT" || journal.sourceId !== paymentId || journal.postingBatchId !== batch.id
    || journal.lines.some(line => line.organizationId !== organizationId) || link.organizationId !== organizationId || link.journalEntryId !== journal.id || link.sourceType !== "SUPPLIER_PAYMENT" || link.sourceId !== paymentId
    || reconciliationRecord(batch.metadata).apJournalEvidenceHash !== apJournalEvidenceHash(journal)) throw paymentReconciliationRequired()
  if (requirePosted && (batch.status !== "POSTED" || journal.status !== "POSTED" || journal.reversedAt || batch.reversedAt)) throw paymentReconciliationRequired()
  const exceptions = await tx.paymentException.findMany({ where: { organizationId, paymentTransactionId: transaction.id, sourceType: "SUPPLIER_PAYMENT", sourceId: paymentId, type: "MISSING_STATEMENT_LINE" } })
  const exception = exceptions[0]
  if (exceptions.length !== 1 || !exception || exception.suspenseItemId) throw paymentReconciliationRequired()
  if (exception.id !== reconciliationRecord(execution.release.payload).paymentExceptionId) {
    const recoveries = await tx.businessEvent.findMany({ where: { organizationId, sourceType: "SUPPLIER_PAYMENT", sourceId: paymentId, eventType: "supplier.payment.posting_recovered" } }), recovery = recoveries[0], data = reconciliationRecord(recovery?.payload), result = reconciliationRecord(data.result)
    if (recoveries.length !== 1 || !recovery || recovery.status !== "APPLIED" || recovery.eventSource !== "INTERNAL" || !recovery.processedAt || recovery.payloadHash !== hash(recovery.payload)
      || result.nextExceptionId !== exception.id || result.resolvedExceptionId !== reconciliationRecord(execution.release.payload).paymentExceptionId || result.paymentTransactionId !== transaction.id
      || data.executionHash !== execution.event.payloadHash || result.journalEntryId !== journal.id || data.journalEvidenceHash !== apJournalEvidenceHash(journal)) throw paymentReconciliationRequired()
  }
  const supplier = await tx.supplier.findFirst({ where: { id: payment.supplierId, organizationId }, select: { name: true } })
  if (!supplier) throw paymentReconciliationRequired()
  const sourceHash = hash({ executionId: execution.event.id, executionHash: execution.event.payloadHash, releaseHash: execution.release.payloadHash,
    paymentId, transactionId: transaction.id, payloadHash: transaction.payloadHash, amount: transaction.amount, currency: transaction.currencyCode,
    batchId: batch.id, journalHash: apJournalEvidenceHash(journal), sourceLink: link, exceptionId: exception.id, originalExceptionEvidence: exception.evidence })
  return { execution, payment, transaction, batch, journal, exception, supplier, sourceHash }
}
export type PaymentReconciliationSource = Awaited<ReturnType<typeof readPaymentReconciliationSourceInTx>>

export async function readPaymentReconciliationBankEvidenceInTx(tx: Prisma.TransactionClient, source: PaymentReconciliationSource, lineId: string, requireUnused: boolean) {
  const organizationId = source.payment.organizationId, line = await tx.statementLine.findFirst({ where: { id: lineId, organizationId }, include: { statementFile: true, providerAccount: { include: { paymentRail: true, settlementAccounts: true } } } })
  const provider = line?.providerAccount, file = line?.statementFile, now = new Date()
  if (source.payment.method !== "BANK_TRANSFER" || !line || !provider || !file || provider.organizationId !== organizationId || file.organizationId !== organizationId || file.providerAccountId !== provider.id
    || provider.status !== "ACTIVE" || provider.archivedAt || !provider.paymentRail.isActive || provider.paymentRail.type !== "BANK_TRANSFER" || provider.currencyCode !== source.payment.currency
    || !provider.settlementLedgerAccountId || !provider.suspenseLedgerAccountId || !provider.settlementAccounts.some(account => account.organizationId === organizationId && account.ledgerAccountId === provider.settlementLedgerAccountId && account.approvalStatus === "APPROVED" && account.effectiveFrom <= now && (!account.effectiveTo || account.effectiveTo > now))
    || !["IMPORTED", "PROCESSED"].includes(file.status) || file.archivedAt || line.archivedAt || !file.fileHash || !line.rawLineHash || line.direction !== "DEBIT" || !line.amount.eq(source.payment.amount) || line.currencyCode !== source.payment.currency
    || line.providerReference !== source.execution.command.draft.executionReference || line.occurredAt.toISOString().slice(0, 10) !== source.payment.paymentDate.toISOString().slice(0, 10)
    || !source.journal.lines.some(row => row.accountId === provider.settlementLedgerAccountId && row.currency === source.payment.currency && row.credit.eq(source.payment.amount) && row.debit.eq(0))) throw paymentReconciliationRequired()
  const settlementAccount = await tx.chartOfAccount.findFirst({ where: { id: provider.settlementLedgerAccountId, organizationId, isActive: true }, select: { id: true } })
  if (!settlementAccount) throw paymentReconciliationRequired()
  if (requireUnused && (line.status !== "UNMATCHED" || await tx.matchRecord.count({ where: { organizationId, statementLineId: line.id, status: { in: ["PROPOSED", "AUTO_MATCHED", "APPROVED", "CORRECTED"] } } }))) throw paymentReconciliationRequired()
  const snapshot = { kind: "BANK_STATEMENT", statementLineId: line.id, providerAccountId: provider.id, settlementLedgerAccountId: provider.settlementLedgerAccountId,
    fileId: file.id, fileHash: file.fileHash, fingerprint: line.fingerprint, rawLineHash: line.rawLineHash, direction: line.direction,
    total: line.amount.toFixed(2), currency: line.currencyCode, reference: line.providerReference, providerTransactionId: line.providerTransactionId,
    occurredAt: line.occurredAt.toISOString(), postedAt: line.postedAt?.toISOString() ?? null }
  return { line, provider, snapshot, evidenceHash: hash(snapshot) }
}

export async function paymentReconciliationEvidenceSnapshotInTx(tx: Prisma.TransactionClient, source: PaymentReconciliationSource, evidence: PaymentReconciliationDraft["evidence"], requireUnused: boolean) {
  if (evidence.kind === "BANK_STATEMENT") return (await readPaymentReconciliationBankEvidenceInTx(tx, source, evidence.statementLineId, requireUnused)).snapshot
  const acknowledgedAt = new Date(evidence.acknowledgedAt)
  if (source.payment.method !== "CASH" || evidence.evidenceSha256 === source.execution.command.draft.evidenceSha256 || acknowledgedAt < new Date(source.execution.command.draft.executedAt) || acknowledgedAt > new Date()) throw paymentReconciliationRequired()
  // This records independent internal review. A URI/hash does not authenticate a recipient or fetch private content.
  return { ...evidence, total: source.payment.amount.toFixed(2), currency: source.payment.currency, supplierId: source.payment.supplierId, executionEventId: source.execution.event.id }
}

export async function readPaymentReconciliationHistoryInTx(tx: Prisma.TransactionClient, organizationId: string, paymentId: string) {
  const events = await tx.businessEvent.findMany({ where: { organizationId, sourceType: "SUPPLIER_PAYMENT", sourceId: paymentId, eventType: PAYMENT_RECONCILIATION_EVENT }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] })
  // Link order is authoritative even when two database timestamps have equal milliseconds.
  const ordered: typeof events = [], pending = [...events]
  let previousId: string | null = null
  while (pending.length) {
    const next = pending.filter(event => reconciliationRecord(event.payload).previousId === previousId)
    if (next.length !== 1) throw paymentReconciliationRequired()
    const event = next[0], data = reconciliationRecord(event.payload)
    const schema = data.operation === "propose" ? paymentReconciliationCommandSchema : data.operation === "decide" ? paymentReconciliationDecisionSchema : data.operation === "reopen" ? paymentReconciliationReopenSchema : data.operation === "finalize" ? paymentReconciliationFinalizeSchema : null
    const command = schema?.safeParse(data.command)
    if (event.schemaVersion !== 1 || event.eventSource !== "INTERNAL" || event.status !== "APPLIED" || !event.processedAt || !event.actorId
      || event.payloadHash !== hash(event.payload) || data.version !== 1 || data.paymentRequestId !== paymentId || data.organizationId !== organizationId
      || data.actorId !== event.actorId || data.recordedAt !== event.occurredAt.toISOString() || typeof data.requestReference !== "string"
      || event.idempotencyKey !== `payment-reconciliation:${data.requestReference}` || !command?.success || data.commandHash !== hash({ command: command.data, actorId: event.actorId, operation: data.operation })
      || command.data.idempotencyKey !== data.requestReference || command.data.expectedRevision !== data.reviewedRevision
      || ("draft" in command.data ? command.data.draft.paymentRequestId : command.data.paymentRequestId) !== paymentId
      || !await tx.auditLog.findFirst({ where: { organizationId, userId: event.actorId, entityType: "SupplierPayment", entityId: paymentId, action: "SUPPLIER_PAYMENT_RECONCILIATION", changes: { path: ["receiptId"], equals: event.id } }, select: { id: true } })) throw paymentReconciliationRequired()
    const prior = ordered.at(-1), priorData = reconciliationRecord(prior?.payload), priorStatus = priorData.status ?? "AWAITING_EVIDENCE"
    const expectedStatus = data.operation === "propose" ? "PROPOSED" : data.operation === "reopen" ? "REOPENED" : data.operation === "finalize" ? "RECONCILED"
      : "decision" in command.data && command.data.decision === "REJECT" ? "REJECTED" : reconciliationRecord(reconciliationRecord(data.draft).evidence).kind === "CASH_VOUCHER" ? "CASH_REVIEWED" : "ADMITTED"
    if (data.status !== expectedStatus || (prior && event.occurredAt < prior.occurredAt)
      || (data.operation === "propose" && !["AWAITING_EVIDENCE", "REJECTED", "REOPENED"].includes(String(priorStatus)))
      || (data.operation === "decide" && (priorStatus !== "PROPOSED" || data.proposalId !== prior?.id))
      || (data.operation === "finalize" && (priorStatus !== "ADMITTED" || data.approvalId !== prior?.id || data.proposalId !== priorData.proposalId))
      || (data.operation === "reopen" && !["ADMITTED", "CASH_REVIEWED", "RECONCILED"].includes(String(priorStatus)))) throw paymentReconciliationRequired()
    ordered.push(event); pending.splice(pending.indexOf(event), 1); previousId = event.id
  }
  return ordered
}

export async function readPaymentReconciliationMatchInTx(tx: Prisma.TransactionClient, source: PaymentReconciliationSource, statementLineId: string) {
  const matches = await tx.matchRecord.findMany({ where: { organizationId: source.payment.organizationId, OR: [{ paymentTransactionId: source.transaction.id }, { statementLineId }], status: { in: ["AUTO_MATCHED", "APPROVED", "CORRECTED"] } } }), match = matches[0]
  if (matches.length !== 1 || !match || match.paymentTransactionId !== source.transaction.id || match.statementLineId !== statementLineId || match.providerEventId || !match.reconciliationRunId || match.providerAccountId !== source.transaction.providerAccountId || !match.amountMatched || !match.amountMatched.eq(source.payment.amount) || match.currencyCode !== source.payment.currency) throw paymentReconciliationRequired()
  const run = await tx.reconciliationRun.findFirst({ where: { id: match.reconciliationRunId, organizationId: source.payment.organizationId, providerAccountId: match.providerAccountId! } })
  if (!run || run.voidedAt || !["READY_FOR_SIGNOFF", "SIGNED"].includes(run.status) || !source.transaction.occurredAt || source.transaction.occurredAt < run.periodStart || source.transaction.occurredAt >= run.periodEnd
    || await tx.paymentException.count({ where: { organizationId: source.payment.organizationId, reconciliationRunId: run.id, status: { notIn: ["RESOLVED", "DISMISSED"] } } })
    || await tx.suspenseItem.count({ where: { organizationId: source.payment.organizationId, reconciliationRunId: run.id, status: { not: "RESOLVED" } } })) throw paymentReconciliationRequired()
  return { matchId: match.id, matchHash: hash(match), runId: run.id, providerAccountId: match.providerAccountId, statementLineId }
}

/** Returns only a current independently verified terminal disposition. Pending evidence is null. */
export async function readCurrentPaymentReconciliationEvidenceInTx(tx: Prisma.TransactionClient, organizationId: string, paymentId: string) {
  const history = await readPaymentReconciliationHistoryInTx(tx, organizationId, paymentId), event = history.at(-1), data = reconciliationRecord(event?.payload)
  if (!event || !["RECONCILED", "CASH_REVIEWED"].includes(String(data.status))) return null
  const source = await readPaymentReconciliationSourceInTx(tx, organizationId, paymentId), draft = paymentReconciliationDraftSchema.parse(data.draft)
  const proposal = history.find(row => row.id === data.proposalId), proposed = reconciliationRecord(proposal?.payload), approval = data.status === "RECONCILED" ? history.find(row => row.id === data.approvalId) : event, approved = reconciliationRecord(approval?.payload)
  const excluded = [source.payment.requestedById, source.payment.approvedById, source.payment.releasedById, proposal?.actorId]
  if (draft.paymentRequestId !== paymentId || !proposal || proposed.status !== "PROPOSED" || !approval || !["CASH_REVIEWED", "ADMITTED"].includes(String(approved.status))
    || event.postingBatchId !== source.batch.id || approval.postingBatchId !== source.batch.id || proposal.postingBatchId !== source.batch.id
    || excluded.includes(event.actorId) || excluded.includes(approval.actorId) || approved.proposalId !== proposal.id || data.sourceHash !== source.sourceHash || proposed.sourceHash !== source.sourceHash
    || hash(proposed.draft) !== hash(draft) || hash(approved.draft) !== hash(draft) || source.exception.status !== "RESOLVED" || source.exception.resolvedAt?.toISOString() !== data.recordedAt
    || reconciliationRecord(source.exception.metadata).paymentReconciliationReceiptId !== event.id || !["CONFIRMED", "SETTLED"].includes(source.transaction.state)
    || reconciliationRecord(source.transaction.metadata).paymentReconciliationReceiptId !== event.id) throw paymentReconciliationRequired()
  const evidence = await paymentReconciliationEvidenceSnapshotInTx(tx, source, draft.evidence, false)
  if (hash(evidence) !== data.evidenceHash || hash(evidence) !== proposed.evidenceHash || hash(evidence) !== approved.evidenceHash) throw paymentReconciliationRequired()
  if (draft.evidence.kind === "BANK_STATEMENT") {
    const match = await readPaymentReconciliationMatchInTx(tx, source, draft.evidence.statementLineId)
    if (data.status !== "RECONCILED" || hash(match) !== hash(data.match) || source.transaction.providerAccountId !== reconciliationRecord(evidence).providerAccountId || source.transaction.providerReference !== source.execution.command.draft.executionReference) throw paymentReconciliationRequired()
  } else if (data.status !== "CASH_REVIEWED" || source.transaction.providerAccountId || source.transaction.providerAuthorityEventId) throw paymentReconciliationRequired()
  return { receiptId: event.id, receiptHash: event.payloadHash, decisionId: event.id, decisionHash: event.payloadHash, proposalId: proposal.id, proposalHash: proposal.payloadHash, status: data.status as "RECONCILED" | "CASH_REVIEWED",
    kind: draft.evidence.kind, mode: draft.evidence.kind, recordedAt: event.occurredAt.toISOString(), paymentRequestId: paymentId, paymentTransactionId: source.transaction.id, exceptionId: source.exception.id,
    sourceHash: source.sourceHash, evidenceHash: String(data.evidenceHash), approvalId: approval.id, approvalHash: approval.payloadHash }
}
