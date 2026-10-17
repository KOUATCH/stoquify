import "server-only"
import { Prisma } from "@prisma/client"
import { ConflictError } from "@/services/_shared/action-errors"
import { lockAccountingPeriodCatalogInTx } from "@/services/accounting/accounting-period-catalog.service"
import { lockCloseAssessmentPeriodsInTx } from "@/services/accounting/close-assessment-order.service"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"

/** Payment dashboard evidence is tenant-wide in every Close assessment. This
 * new evidence-review writer therefore takes the complete period set before
 * any source row lock. It does not change manual posting's existing scope.
 * Read Committed is required so discovery after a wait sees committed runs.
 */
export async function lockPaymentReconciliationCloseScopeInTx(
  tx: Prisma.TransactionClient, organizationId: string,
): Promise<string[]> {
  const isolation = await tx.$queryRaw<Array<{ level: string }>>`
    SELECT current_setting('transaction_isolation') AS level`
  if (isolation[0]?.level !== "read committed") {
    throw new ConflictError("Payment evidence review requires a current committed accounting snapshot.")
  }
  await lockAccountingPeriodCatalogInTx(tx, organizationId, "shared")
  const periods = await tx.accountingPeriod.findMany({
    where: { organizationId }, select: { id: true }, orderBy: { id: "asc" },
  })
  const ids = periods.map(period => period.id)
  await lockCloseAssessmentPeriodsInTx(tx, organizationId, ids)
  return ids
}

export async function invalidatePaymentReconciliationCloseScopeInTx(
  tx: Prisma.TransactionClient, organizationId: string,
  input: { paymentRequestId: string; actorId: string; affectedPeriodIds: readonly string[]; receiptId: string; receiptHash: string },
) {
  return recordCloseCertificationInvalidationsForSourceInTx(tx, organizationId, {
    sourceCode: "SUPPLIER_PAYMENT_RECONCILIATION_REVIEWED",
    sourceId: input.paymentRequestId,
    periodIds: input.affectedPeriodIds,
    correlationId: input.receiptId,
    // Bind each lifecycle change to its actual retained event payload. Reusing
    // only the payment ID would collide when that payment is reviewed again.
    newEvidenceHash: input.receiptHash,
    staleReason: "Supplier payment reconciliation evidence changed. Refresh Close assessment and review the retained payment decision.",
  }, { actorId: input.actorId })
}
