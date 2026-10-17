import "server-only"

import { CloseRunStatus, Prisma, type PrismaClient } from "@prisma/client"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { lockAccountingPeriodCatalogInTx } from "./accounting-period-catalog.service"
import { lockCloseAssessmentPeriodsInTx } from "./close-assessment-order.service"

export type JournalReversalFreshReader = Pick<PrismaClient, "accountingPeriod" | "closeRun" | "$transaction">
export type JournalReversalPeriodScope = {
  originalPeriodId: string
  reversalPeriodId: string
  originalEntryDate: Date
  reversalDate: Date
  includeLaterPeriods: boolean
}

// Only the owning transaction runner may retry this signal. No effects from a
// failed attempt may be committed or resumed inside that old snapshot.
export class JournalReversalSnapshotChangedError extends Error {
  constructor() {
    super("Journal reversal evidence scope changed. Retry the entire transaction.")
    this.name = "JournalReversalSnapshotChangedError"
  }
}

async function snapshotReaderRequired(tx: Prisma.TransactionClient, reader?: JournalReversalFreshReader) {
  const rows = await tx.$queryRaw<Array<{ isolationLevel: string }>>(
    Prisma.sql`SELECT current_setting('transaction_isolation') AS "isolationLevel"`,
  )
  if (rows[0]?.isolationLevel === "read committed") return false
  if (rows[0]?.isolationLevel === "serializable" && typeof reader?.$transaction === "function") return true
  throw new ConflictError("Journal reversal requires Read Committed or a Serializable transaction with a fresh evidence reader.")
}

/** Acquire before any period row lock. Serializable snapshots must agree with
 * committed membership under the catalog lock; waiting alone cannot refresh
 * an old snapshot. The root reader needs a separate available connection.
 */
export async function lockJournalReversalCatalogInTx(
  tx: Prisma.TransactionClient, organizationId: string, freshReader?: JournalReversalFreshReader,
): Promise<void> {
  const compare = await snapshotReaderRequired(tx, freshReader)
  await lockAccountingPeriodCatalogInTx(tx, organizationId, "shared")
  if (compare) {
    const query = { where: { organizationId }, select: { id: true, startDate: true, endDate: true }, orderBy: { id: "asc" as const } }
    const snapshot = await tx.accountingPeriod.findMany(query)
    const current = await freshReader!.accountingPeriod.findMany(query)
    if (JSON.stringify(snapshot) !== JSON.stringify(current)) throw new JournalReversalSnapshotChangedError()
  }
}

/** Resolve under catalog + posting-period row locks; acquire the entire set
 * before financial writes or Close run locks. Cumulative inventory evidence
 * includes class-3 journal status from its original date onward.
 */
export async function lockJournalReversalClosePeriodsInTx(
  tx: Prisma.TransactionClient, organizationId: string, input: JournalReversalPeriodScope,
  freshReader?: JournalReversalFreshReader,
): Promise<string[]> {
  const compare = await snapshotReaderRequired(tx, freshReader)
  if (!Number.isFinite(input.originalEntryDate.getTime()) || !Number.isFinite(input.reversalDate.getTime())) {
    throw new ConflictError("Journal reversal period dates are unavailable.")
  }
  const earliest = input.originalEntryDate < input.reversalDate ? input.originalEntryDate : input.reversalDate
  const periods = await tx.accountingPeriod.findMany({
    where: {
      organizationId,
      OR: [
        { id: { in: [input.originalPeriodId, input.reversalPeriodId] } },
        // Operating evidence includes POSTED journal counts and source links by
        // date, so the original status/source-date change affects overlaps too.
        { startDate: { lte: input.originalEntryDate }, endDate: { gte: input.originalEntryDate } },
        { startDate: { lte: input.reversalDate }, endDate: { gte: input.reversalDate } },
        ...(input.includeLaterPeriods ? [{ endDate: { gte: earliest } }] : []),
      ],
    },
    select: { id: true }, orderBy: { id: "asc" },
  })
  const periodIds = [...new Set(periods.map(period => period.id))].sort()
  if (![input.originalPeriodId, input.reversalPeriodId].every(id => periodIds.includes(id))) {
    throw new NotFoundError("Journal reversal accounting period not found")
  }
  await lockCloseAssessmentPeriodsInTx(tx, organizationId, periodIds)
  if (compare) {
    // Compare eligibility too: retained certified exports can make a historical
    // run a target. Merely comparing publication IDs misses that transition.
    const query = {
      where: {
        organizationId, periodId: { in: periodIds },
        OR: [
          { status: { in: [CloseRunStatus.RUNNING, CloseRunStatus.READY, CloseRunStatus.CERTIFIED, CloseRunStatus.EXPORTED] } },
          { packExports: { some: { isCertified: true } } },
        ],
      }, select: { id: true }, orderBy: { id: "asc" as const },
    }
    const snapshot = await tx.closeRun.findMany(query)
    const current = await freshReader!.closeRun.findMany(query)
    if (JSON.stringify(snapshot) !== JSON.stringify(current)) throw new JournalReversalSnapshotChangedError()
  }
  return periodIds
}
