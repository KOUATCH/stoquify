import "server-only"
import { Prisma } from "@prisma/client"
import { ConflictError } from "@/services/_shared/action-errors"
import { readCurrentPaymentReconciliationEvidenceInTx } from "./payment-reconciliation-evidence"
import { type CloseControlScope } from "@/services/accounting/close-control-scope"
import { closeExceptionWhere, closePaymentWhere } from "@/services/reconciliation/payment-close-scope"

export type SupplierPaymentReconciliationProof = {
  paymentRequestId: string
  exceptionId: string
  status: "CASH_REVIEWED" | "RECONCILED"
  kind: "CASH_VOUCHER" | "BANK_STATEMENT"
  decisionId: string
  decisionHash: string
  proposalId: string
  proposalHash: string
  recordedAt: string
}

/** AP exceptions have no suspense/run owner. A terminal label cannot replace
 * their source-owned receipt. Fail the collector on missing or changed proof;
 * never turn that failure into a successful empty evidence set.
 */
export async function readSupplierPaymentReconciliationProofsInTx(
  tx: Prisma.TransactionClient, organizationId: string,
  closeScope?: CloseControlScope,
): Promise<SupplierPaymentReconciliationProof[]> {
  if (closeScope && closeScope.organizationId !== organizationId) throw new ConflictError("Supplier payment close scope belongs to another organization.")
  const [terminal, confirmed] = await Promise.all([
    tx.paymentException.findMany({
      where: { ...(closeScope ? closeExceptionWhere(closeScope) : {}), organizationId, sourceType: "SUPPLIER_PAYMENT", type: "MISSING_STATEMENT_LINE", status: { in: ["RESOLVED", "DISMISSED"] } },
      select: { id: true, sourceId: true, paymentTransactionId: true }, orderBy: { id: "asc" },
    }),
    tx.paymentTransaction.findMany({
      where: { ...(closeScope ? closePaymentWhere(closeScope) : {}), organizationId, sourceType: "SUPPLIER_PAYMENT", state: { in: ["CONFIRMED", "SETTLED"] } },
      select: { id: true, sourceId: true, paymentExceptions: { select: { id: true, organizationId: true, sourceType: true, sourceId: true, type: true, status: true } } },
      orderBy: { id: "asc" },
    }),
  ])
  const ids = new Set<string>()
  for (const exception of terminal) {
    if (!exception.sourceId || !exception.paymentTransactionId) throw new ConflictError("Supplier payment reconciliation proof is missing its original source.")
    ids.add(exception.sourceId)
  }
  for (const payment of confirmed) {
    const obligations = payment.paymentExceptions.filter(row => row.organizationId === organizationId
      && row.sourceType === "SUPPLIER_PAYMENT" && row.sourceId === payment.sourceId && row.type === "MISSING_STATEMENT_LINE")
    if (!payment.sourceId || obligations.length !== 1 || payment.paymentExceptions.some(row => row.organizationId !== organizationId)) {
      throw new ConflictError("Confirmed supplier payment is missing its original reconciliation obligation.")
    }
    // Bank admission remains an open obligation until the actual run matches it.
    if (["RESOLVED", "DISMISSED"].includes(obligations[0].status)) ids.add(payment.sourceId)
  }
  const proofs: SupplierPaymentReconciliationProof[] = []
  for (const id of [...ids].sort()) {
    const proof = await readCurrentPaymentReconciliationEvidenceInTx(tx, organizationId, id)
    const exceptions = terminal.filter(row => row.sourceId === id)
    if (!proof || exceptions.length !== 1 || exceptions[0].id !== proof.exceptionId) {
      throw new ConflictError("Supplier payment reconciliation decision does not identify its original exception.")
    }
    if (closeScope && !(new Date(proof.recordedAt) <= new Date(closeScope.recordedThrough))) {
      throw new ConflictError("Supplier payment reconciliation proof was not available at the close cutoff; rerun the assessment.")
    }
    proofs.push(proof)
  }
  return proofs
}
