import { Prisma } from "@prisma/client"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"
import { loadReconciliationExceptionLinkSourceInTx } from "./payment-exception-source-evidence"
import { suspenseResolutionManifestEvidenceInTx } from "./payment-suspense-resolution-evidence.service"
type Tx = Prisma.TransactionClient
const hash = (value: unknown) => suspenseEvidenceHash(JSON.parse(JSON.stringify(value)))
export const financialExceptionClosureTypes: ReadonlySet<string> = new Set(["AMOUNT_MISMATCH", "MISSING_PROVIDER_EVENT", "MISSING_STATEMENT_LINE", "MISSING_INTERNAL_PAYMENT", "FEE_DEVIATION", "LATE_SETTLEMENT"])
export const exceptionClosureStateHash = (row: object) => { const { updatedAt, ...retained } = row as Record<string, unknown>; return hash(retained) }

export async function loadExceptionClosureSourceInTx(tx: Tx, organizationId: string, exceptionId: string) {
  const exception = await tx.paymentException.findFirst({ where: { id: exceptionId, organizationId } })
  if (!exception) throw new NotFoundError("Exception is unavailable in this workspace.")
  if (!financialExceptionClosureTypes.has(exception.type)) throw new BusinessRuleError("This exception requires its own source or security investigation; financial clearing cannot establish closure.", "REVIEW_REQUIRED")
  if (!exception.suspenseItemId) throw new ConflictError("Review and repair the original suspense link before exception closure.")
  const current = await loadReconciliationExceptionLinkSourceInTx(tx, organizationId, exception.suspenseItemId)
  if (current.exception.id !== exceptionId) throw new ConflictError("The exception does not match the original suspense source.")
  const financial = await suspenseResolutionManifestEvidenceInTx(tx, organizationId, current.item)
  if (!financial || suspenseMetadata(current.item.metadata).resolutionRecoveryProposalId) throw new ConflictError("Complete financial treatment and any pending recovery review before exception closure.")
  const sourceHash = hash(current.references)
  return { ...current, financial, sourceHash, revision: hash({ sourceRevision: current.revision, financial }) }
}
export async function loadExceptionClosureReceiptInTx(tx: Tx, organizationId: string, exceptionId: string, id: string) {
  const row = await tx.paymentReconciliationInboxItem.findFirst({ where: { id, organizationId, externalId: exceptionId, source: "RECONCILIATION_RUN", status: "PROCESSED" } })
  if (!row || row.payloadHash !== hash(row.payloadSummary).slice(7)) throw new ConflictError("Exception decision evidence is missing or changed.")
  return { row, data: suspenseMetadata(row.payloadSummary) }
}
export async function exceptionClosureManifestEvidenceInTx(tx: Tx, organizationId: string, exception: { id: string; status: string }) {
  if (!["RESOLVED", "DISMISSED"].includes(exception.status)) return null
  const current = await loadExceptionClosureSourceInTx(tx, organizationId, exception.id), id = suspenseMetadata(current.exception.metadata).closureReceiptId
  if (current.exception.status !== "RESOLVED" || typeof id !== "string") throw new ConflictError("Final exception status lacks a verified independent closure decision.")
  const saved = await loadExceptionClosureReceiptInTx(tx, organizationId, exception.id, id), data = saved.data
  if (data.kind !== "EXCEPTION_CLOSURE_APPROVED_V1" || data.exceptionId !== exception.id || typeof data.proposalId !== "string" || typeof data.decidedById !== "string"
    || data.decidedById === data.proposedById || data.decidedById === current.run.runById || saved.row.idempotencyKey !== "exception-closure-decision:" + data.proposalId
    || data.afterExceptionHash !== exceptionClosureStateHash(current.exception) || hash(data.financial) !== hash(current.financial) || data.sourceHash !== current.sourceHash) throw new ConflictError("Final exception decision no longer matches its source and financial evidence.")
  const proposed = await loadExceptionClosureReceiptInTx(tx, organizationId, exception.id, data.proposalId)
  if (proposed.data.kind !== "EXCEPTION_CLOSURE_PROPOSED_V1" || proposed.data.exceptionId !== exception.id || proposed.data.proposedById !== data.proposedById
    || proposed.data.reviewedRevision !== data.reviewedRevision || proposed.data.sourceHash !== data.sourceHash || hash(proposed.data.financial) !== hash(data.financial)
    || !proposed.row.idempotencyKey.startsWith("exception-closure-proposal:")) throw new ConflictError("Exception proposal lineage requires review.")
  for (const [action, actorId, field, value] of [["EXCEPTION_CLOSURE_PROPOSE", data.proposedById, "proposalId", data.proposalId], ["EXCEPTION_CLOSURE_APPROVE", data.decidedById, "receiptId", id]] as const) {
    if (typeof actorId !== "string" || !await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceId: exception.id, actorId, action, metadata: { path: [field], equals: value } } })) throw new ConflictError("Exception decision audit requires review.")
  }
  return { receiptId: id, receiptHash: saved.row.payloadHash, proposalId: proposed.row.id, proposalHash: proposed.row.payloadHash, financialDecisionId: current.financial.decisionId }
}
