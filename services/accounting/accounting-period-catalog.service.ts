import "server-only"

import { Prisma } from "@prisma/client"

/** Coordinate period-set discovery with online fiscal-calendar creation.
 * Acquire before period row/assessment locks and retain through commit.
 * Readers need current committed reads after waiting. Never upgrade a shared
 * lock in the same transaction. Date edits/deletions also need their own
 * evidence invalidation contract before joining this creation-only protocol.
 */
export async function lockAccountingPeriodCatalogInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  mode: "shared" | "exclusive",
): Promise<void> {
  const key = JSON.stringify(["accounting-period-catalog", organizationId])
  if (mode === "shared") {
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock_shared(hashtextextended(${key}, 0))::text`)
  } else {
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`)
  }
}
