import { Prisma } from "@prisma/client"
import { ConflictError } from "@/services/_shared/action-errors"
import { loadReconciliationExceptionLinkSourceInTx } from "./payment-exception-source-evidence"
import { exceptionClosureStateHash, loadExceptionClosureReceiptInTx } from "./payment-exception-closure-evidence.service"
import { isCorroboratingSourceCase } from "./payment-corroborating-source-evidence"
import { certificatePayloadHash } from "./payment-reconciliation-certification.service"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"
import { z } from "zod"

const hash = (value: unknown) => suspenseEvidenceHash(JSON.parse(JSON.stringify(value)))
const sourceReviewSchema = z.object({ kind: z.literal("CORROBORATING_SOURCE_V1"), sourceType: z.enum(["PROVIDER_EVENT", "STATEMENT_LINE"]),
  sourceId: z.string().min(1), matchId: z.string().min(1), paymentId: z.string().min(1), amount: z.string(), currencyCode: z.string(),
  sourceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/), excludedApproverIds: z.array(z.string().min(1)) }).strict()

// Withdrawal validates the retained decision, not whether today's source still agrees
// with it. A changed source is a reason to reopen, never a reason to preserve approval.
export async function loadSourceDecisionWithdrawalInTx(tx: Prisma.TransactionClient, organizationId: string, exceptionId: string) {
  const exception = await tx.paymentException.findFirst({ where: { id: exceptionId, organizationId } })
  if (!exception || !isCorroboratingSourceCase(exception) || !exception.suspenseItemId || exception.status !== "RESOLVED")
    throw new ConflictError("Only a retained nonfinancial source decision can use this withdrawal path.")
  const current = await loadReconciliationExceptionLinkSourceInTx(tx, organizationId, exception.suspenseItemId)
  const { item, run } = current, id = suspenseMetadata(exception.metadata).closureReceiptId
  if (current.exception.id !== exceptionId || typeof id !== "string" || item.status !== "RESOLVED" || !item.resolvedAt
    || item.ledgerPostingBatchId || item.postedAt || await tx.ledgerPostingBatch.count({ where: { organizationId, sourceId: item.id } }))
    throw new ConflictError("The retained source decision or its nonfinancial boundary requires review.")
  const saved = await loadExceptionClosureReceiptInTx(tx, organizationId, exceptionId, id), data = saved.data
  const parsed = sourceReviewSchema.safeParse(data.sourceReview)
  if (!parsed.success || data.kind !== "EXCEPTION_CLOSURE_APPROVED_V1" || data.purpose || data.exceptionId !== exceptionId
    || data.financial !== null || typeof data.proposalId !== "string" || typeof data.decidedById !== "string"
    || data.decidedById === data.proposedById || data.decidedById === run.runById || parsed.data.excludedApproverIds.includes(data.decidedById)
    || data.sourceHash !== parsed.data.sourceHash || saved.row.idempotencyKey !== "exception-closure-decision:" + data.proposalId
    || data.afterExceptionHash !== exceptionClosureStateHash(exception) || data.afterSuspenseHash !== exceptionClosureStateHash(item)
    || suspenseMetadata(item.metadata).nonfinancialExceptionId !== exceptionId || suspenseMetadata(item.metadata).nonfinancialClosureReceiptId !== id
    || parsed.data.sourceId !== (exception.providerEventId ?? exception.statementLineId))
    throw new ConflictError("The retained source approval no longer matches its investigation record.")
  const proposed = await loadExceptionClosureReceiptInTx(tx, organizationId, exceptionId, data.proposalId)
  if (proposed.data.kind !== "EXCEPTION_CLOSURE_PROPOSED_V1" || proposed.data.purpose || proposed.data.exceptionId !== exceptionId
    || proposed.data.proposedById !== data.proposedById || proposed.data.reviewedRevision !== data.reviewedRevision
    || proposed.data.sourceHash !== data.sourceHash || proposed.data.financial !== null || hash(proposed.data.sourceReview) !== hash(data.sourceReview)
    || !proposed.row.idempotencyKey.startsWith("exception-closure-proposal:")) throw new ConflictError("The retained source proposal lineage requires review.")
  for (const [action, actorId, field, value] of [["EXCEPTION_CLOSURE_PROPOSE", data.proposedById, "proposalId", data.proposalId], ["EXCEPTION_CLOSURE_APPROVE", data.decidedById, "receiptId", id]] as const) {
    if (typeof actorId !== "string" || !await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceId: exceptionId, actorId, action, metadata: { path: [field], equals: value } } }))
      throw new ConflictError("The retained source decision audit requires review.")
  }
  if (run.status === "SIGNED") {
    if (!run.signedAt || !run.signedById || !run.certificateHash || !run.certificatePayload || certificatePayloadHash(run.certificatePayload) !== run.certificateHash
      || !await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceId: run.id, actorId: run.signedById, action: "PAYMENT_RECONCILIATION_RUN_SIGN", metadata: { path: ["certificateHash"], equals: run.certificateHash } } }))
      throw new ConflictError("The signed certificate must be verified before withdrawal.")
  } else if (!["NEEDS_REVIEW", "READY_FOR_SIGNOFF"].includes(run.status) || run.signedAt || run.signedById || run.certificateHash || run.certificatePayload)
    throw new ConflictError("The reconciliation signature state requires review.")
  const withdrawal = { decisionId: id, decisionHash: saved.row.payloadHash, proposalId: proposed.row.id, proposalHash: proposed.row.payloadHash,
    priorApproverId: data.decidedById, priorCertificateHash: run.certificateHash,
    excludedApproverIds: [...new Set([...parsed.data.excludedApproverIds, data.decidedById, run.signedById].filter((actor): actor is string => Boolean(actor)))].sort() }
  return { ...current, financial: null, sourceReview: parsed.data, withdrawal, sourceHash: hash({ references: current.references, withdrawal }),
    revision: hash({ current: current.revision, withdrawal }) }
}
