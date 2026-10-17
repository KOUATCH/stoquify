import "server-only"

import { CloseRunStatus, Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { ConflictError } from "@/services/_shared/action-errors"
import { lockCloseAssessmentPeriodsInTx } from "@/services/accounting/close-assessment-order.service"
import { JournalReversalSnapshotChangedError, lockJournalReversalCatalogInTx } from "@/services/accounting/journal-reversal-order.service"

// Reuse the catalog/snapshot protocol without requiring a posting period:
// creating a reconciliation run remains possible before accounting setup.
export async function lockReconciliationCloseCatalogInTx(tx: Prisma.TransactionClient, organizationId: string) {
  await lockJournalReversalCatalogInTx(tx, organizationId, db)
}

/** Call after catalog and applicable period row locks, before provider/run/source
 * locks. Close consumes reconciliation tenant-wide. Callers use Serializable;
 * committed reads need a separate free connection because waits do not refresh
 * snapshots. The owning transaction must restart on membership changes.
 */
export async function lockReconciliationClosePeriodsInTx(tx: Prisma.TransactionClient, organizationId: string) {
  const periods = await tx.accountingPeriod.findMany({ where: { organizationId }, select: { id: true }, orderBy: { id: "asc" } })
  const periodIds = [...new Set(periods.map(period => period.id))].sort()
  await lockCloseAssessmentPeriodsInTx(tx, organizationId, periodIds)
  const query = {
    where: { organizationId, periodId: { in: periodIds }, OR: [
      { status: { in: [CloseRunStatus.RUNNING, CloseRunStatus.READY, CloseRunStatus.CERTIFIED, CloseRunStatus.EXPORTED] } },
      { packExports: { some: { isCertified: true } } },
    ] }, select: { id: true }, orderBy: { id: "asc" as const },
  }
  const snapshot = await tx.closeRun.findMany(query)
  const current = await db.closeRun.findMany(query)
  if (JSON.stringify(snapshot) !== JSON.stringify(current)) throw new JournalReversalSnapshotChangedError()
  return periodIds
}

// Retry only proven stale Close membership, as a complete new transaction.
export async function withReconciliationCloseRetry<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await work() } catch (error) {
      if (!(error instanceof JournalReversalSnapshotChangedError)) throw error
      if (attempt >= 2) throw new ConflictError("Close evidence changed concurrently. Refresh and retry reconciliation.")
    }
  }
}
