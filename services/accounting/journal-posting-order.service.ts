import "server-only"

import { Prisma } from "@prisma/client"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { lockAccountingPeriodCatalogInTx } from "./accounting-period-catalog.service"
import { lockCloseAssessmentPeriodsInTx } from "./close-assessment-order.service"

async function assertCurrentCommittedReads(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ isolationLevel: string }>>(
    Prisma.sql`SELECT current_setting('transaction_isolation') AS "isolationLevel"`,
  )
  if (rows[0]?.isolationLevel !== "read committed") {
    throw new ConflictError("Manual journal posting requires Read Committed transaction isolation.")
  }
}

/** The posting owner acquires this before journal or period row locks. */
export async function lockJournalPostingCatalogInTx(tx: Prisma.TransactionClient, organizationId: string) {
  await assertCurrentCommittedReads(tx)
  await lockAccountingPeriodCatalogInTx(tx, organizationId, "shared")
}

/** Resolve under the catalog lock and retain every affected period lock through
 * commit. Class-3 closing evidence is cumulative, including periods with no run.
 */
export async function lockJournalPostingClosePeriodsInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: { periodId: string; entryDate: Date; includeLaterPeriods: boolean },
): Promise<string[]> {
  await assertCurrentCommittedReads(tx)
  if (!Number.isFinite(input.entryDate.getTime())) {
    throw new ConflictError("Journal posting date is unavailable.")
  }
  const periods = await tx.accountingPeriod.findMany({
    where: {
      organizationId,
      OR: [
        { id: input.periodId },
        { startDate: { lte: input.entryDate }, endDate: { gte: input.entryDate } },
        ...(input.includeLaterPeriods ? [{ endDate: { gte: input.entryDate } }] : []),
      ],
    },
    select: { id: true }, orderBy: { id: "asc" },
  })
  const periodIds = [...new Set(periods.map(period => period.id))].sort()
  if (!periodIds.includes(input.periodId)) throw new NotFoundError("Journal posting accounting period not found")
  await lockCloseAssessmentPeriodsInTx(tx, organizationId, periodIds)
  return periodIds
}
