import { Prisma } from "@prisma/client"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"
import { loadReconciliationExceptionLinkSourceInTx } from "./payment-exception-source-evidence"
import { loadAdditionalSourcesReceiptInTx } from "./reconciliation-run-preparation-evidence"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"

type Tx = Prisma.TransactionClient
const hash = (value: unknown) => suspenseEvidenceHash(JSON.parse(JSON.stringify(value)))
const normalized = (value: string | null) => value?.trim().toUpperCase() || null
const reviewRequired = () => new BusinessRuleError("This evidence does not establish an exact corroboration of one retained allocation. Keep the source investigation open.", "REVIEW_REQUIRED")

export function isCorroboratingSourceCase(row: { type: string; evidence?: unknown }) {
  return row.type === "MANUAL_REVIEW_REQUIRED" && suspenseMetadata(row.evidence).rule === "ADDITIONAL_EVIDENCE_FOR_RETAINED_SOURCE"
}

// This is a source decision, never an allocation or a financial resolution.
// The retained match and all imported evidence remain unchanged.
export async function loadCorroboratingSourceInTx(tx: Tx, organizationId: string, exceptionId: string, itemId: string) {
  const current = await loadReconciliationExceptionLinkSourceInTx(tx, organizationId, itemId)
  const { exception, item, run } = current
  if (exception.id !== exceptionId || !isCorroboratingSourceCase(exception) || exception.paymentTransactionId
    || Boolean(exception.providerEventId) === Boolean(exception.statementLineId)) throw reviewRequired()
  if (item.ledgerPostingBatchId || item.postedAt || !["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED", "RESOLVED"].includes(item.status)
    || await tx.ledgerPostingBatch.count({ where: { organizationId, sourceId: item.id } })) throw reviewRequired()
  const scope = { organizationId, providerAccountId: item.providerAccountId! }
  const sourceId = (exception.providerEventId ?? exception.statementLineId)!
  const sourceType = exception.providerEventId ? "PROVIDER_EVENT" as const : "STATEMENT_LINE" as const

  async function external(eventId: string | null, lineId: string | null) {
    if (eventId) {
      const event = await tx.providerEvent.findFirst({ where: { ...scope, id: eventId } })
      if (!event || !event.signatureValid || !["VERIFIED", "PROCESSED"].includes(event.status) || !event.rawPayloadHash
        || !event.occurredAt || event.occurredAt < run.periodStart || event.occurredAt >= run.periodEnd) throw reviewRequired()
      return { row: event, file: null, direction: event.direction }
    }
    const line = await tx.statementLine.findFirst({ where: { ...scope, id: lineId! } })
    if (!line || !line.fingerprint || line.occurredAt < run.periodStart || line.occurredAt >= run.periodEnd
      || !["UNMATCHED", "MATCHED"].includes(line.status)) throw reviewRequired()
    const file = await tx.statementFile.findFirst({ where: { ...scope, id: line.statementFileId } })
    if (!file || !file.fileHash || !["IMPORTED", "PROCESSED"].includes(file.status)) throw reviewRequired()
    return { row: line, file, direction: line.direction === "CREDIT" ? "INBOUND" : line.direction === "DEBIT" ? "OUTBOUND" : null }
  }
  const source = await external(exception.providerEventId, exception.statementLineId)
  const transactionId = normalized(source.row.providerTransactionId)
  if (!transactionId) throw reviewRequired()
  const payments = await tx.paymentTransaction.findMany({ where: { ...scope,
    providerTransactionId: { equals: source.row.providerTransactionId!.trim(), mode: "insensitive" } } })
  if (payments.length !== 1) throw reviewRequired()
  const payment = payments[0]
  if (!["CONFIRMED", "SETTLED"].includes(payment.state) || payment.amount.lte(0) || !payment.occurredAt
    || payment.occurredAt < run.periodStart || payment.occurredAt >= run.periodEnd) throw reviewRequired()
  function assertAgrees(value: typeof source) {
    if (normalized(value.row.providerTransactionId) !== transactionId || !value.row.amount?.eq(payment.amount)
      || normalized(value.row.currencyCode) !== normalized(payment.currencyCode) || value.direction !== payment.direction
      || (normalized(value.row.providerReference) !== null && normalized(payment.providerReference) !== null
        && normalized(value.row.providerReference) !== normalized(payment.providerReference))) throw reviewRequired()
  }
  assertAgrees(source)
  const matches = await tx.matchRecord.findMany({ where: { ...scope, paymentTransactionId: payment.id } })
  if (matches.length !== 1) throw reviewRequired()
  const match = matches[0]
  if (match.reconciliationRunId !== run.id || !["AUTO_MATCHED", "APPROVED", "CORRECTED"].includes(match.status)
    || !match.amountMatched?.eq(payment.amount) || normalized(match.currencyCode) !== normalized(payment.currencyCode)
    || (!match.providerEventId && !match.statementLineId)) throw reviewRequired()
  const retained = []
  if (match.providerEventId) retained.push(await external(match.providerEventId, null))
  if (match.statementLineId) retained.push(await external(null, match.statementLineId))
  for (const evidence of retained) assertAgrees(evidence)
  const claim = sourceType === "PROVIDER_EVENT" ? { providerEventId: sourceId } : { statementLineId: sourceId }
  if (await tx.matchRecord.count({ where: { ...scope, ...claim } })
    || await tx.paymentException.count({ where: { ...scope, ...claim, id: { not: exception.id } } })) throw reviewRequired()
  if (!item.amount.eq(payment.amount) || normalized(item.currencyCode) !== normalized(payment.currencyCode) || item.direction !== payment.direction) throw reviewRequired()
  if (!exception.correlationId) throw reviewRequired()
  const recovery = await loadAdditionalSourcesReceiptInTx(tx, organizationId, run.id, exception.correlationId)
  const additions = suspenseMetadata(recovery.data.additions)
  const addedIds = sourceType === "PROVIDER_EVENT" ? additions.providerEventIds : additions.statementLineIds
  if (!Array.isArray(addedIds) || !addedIds.includes(sourceId)) throw reviewRequired()
  const excludedApproverIds = [...new Set([run.runById, match.matchedById, recovery.data.actorId].filter((id): id is string => Boolean(id)))].sort()
  const sourceHash = hash({ payment, match, source, retained, excludedApproverIds, recoveryReceiptHash: recovery.row.payloadHash })
  const sourceReview = { kind: "CORROBORATING_SOURCE_V1" as const, sourceType, sourceId, matchId: match.id, paymentId: payment.id,
    amount: payment.amount.toFixed(2), currencyCode: payment.currencyCode, sourceHash, excludedApproverIds }
  return { ...current, financial: null, sourceReview, sourceHash, revision: hash({ original: current.revision, sourceReview }) }
}

export function assertCorroboratingDecisionState(current: Awaited<ReturnType<typeof loadCorroboratingSourceInTx>>, receiptId: string, afterItemHash: unknown) {
  const { updatedAt: _updatedAt, ...item } = current.item
  if (current.item.status !== "RESOLVED" || !current.item.resolvedAt
    || suspenseMetadata(current.item.metadata).nonfinancialExceptionId !== current.exception.id
    || suspenseMetadata(current.item.metadata).nonfinancialClosureReceiptId !== receiptId || hash(item) !== afterItemHash)
    throw new ConflictError("The nonfinancial source decision no longer matches its retained investigation record.")
}
