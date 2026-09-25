import { Prisma } from "@prisma/client"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"
type Tx = Prisma.TransactionClient
const hash = (value: unknown) => suspenseEvidenceHash(JSON.parse(JSON.stringify(value)))

export async function loadReconciliationExceptionLinkSourceInTx(tx: Tx, organizationId: string, itemId: string) {
  const item = await tx.suspenseItem.findFirst({ where: { id: itemId, organizationId } })
  if (!item) throw new NotFoundError("Suspense record is unavailable in this workspace.")
  const { exceptionId, ...originalEvidence } = suspenseMetadata(item.evidence)
  if (typeof exceptionId !== "string" || !exceptionId) throw new ConflictError("Original exception identity is missing; manual source review is required.")
  const exception = await tx.paymentException.findFirst({ where: { id: exceptionId, organizationId } })
  if (!exception || !item.reconciliationRunId || exception.sourceType !== "ReconciliationRun" || exception.sourceId !== item.reconciliationRunId
    || exception.reconciliationRunId !== item.reconciliationRunId || !item.providerAccountId || exception.providerAccountId !== item.providerAccountId
    || exception.paymentTransactionId !== item.paymentTransactionId || !item.correlationId || item.correlationId !== exception.correlationId
    || hash(originalEvidence) !== hash(exception.evidence) || (exception.suspenseItemId !== null && exception.suspenseItemId !== item.id)) throw new ConflictError("Original exception and suspense provenance disagree; repair was not applied.")
  const run = await tx.reconciliationRun.findFirst({ where: { id: item.reconciliationRunId, organizationId, providerAccountId: item.providerAccountId } })
  if (!run || run.status === "VOIDED" || run.voidedAt) throw new ConflictError("Reconciliation run requires source review before link repair.")
  const duplicates = await tx.suspenseItem.count({ where: { organizationId, evidence: { path: ["exceptionId"], equals: exception.id } } })
  const claims = await tx.paymentException.count({ where: { suspenseItemId: item.id, id: { not: exception.id } } })
  // The second count checks references to an already-authorized item, without exposing another tenant's records.
  if (duplicates !== 1 || claims !== 0) throw new ConflictError("Exception linkage is ambiguous; automatic repair is unavailable.")
  const references: unknown[] = []
  for (const [model, id] of [["paymentTransaction", exception.paymentTransactionId], ["providerEvent", exception.providerEventId], ["statementLine", exception.statementLineId]] as const) {
    if (!id) continue
    const where = { id, organizationId, providerAccountId: item.providerAccountId }
    const row = model === "paymentTransaction" ? await tx.paymentTransaction.findFirst({ where }) : model === "providerEvent" ? await tx.providerEvent.findFirst({ where }) : await tx.statementLine.findFirst({ where })
    if (!row) throw new ConflictError("Original payment source is unavailable in this workspace.")
    references.push(row)
  }
  if (!references.length) throw new ConflictError("Original payment evidence is missing.")
  const revision = hash({ item, exception, run, references })
  return { item, exception, run, references, revision }
}

