import "server-only"

import { Prisma } from "@prisma/client"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"

/** All leave writers hold this transaction lock, including an empty ledger.
 * Read Committed is required so a waiter reads the previous holder's commit. */
export async function lockHrisLeaveLedgerInTx(
  tx: Prisma.TransactionClient,
  scope: { organizationId: string; employeeId: string; leavePolicyId: string },
) {
  const rows = await tx.$queryRaw<Array<{ isolationLevel: string }>>(
    Prisma.sql`SELECT current_setting('transaction_isolation') AS "isolationLevel"`,
  )
  if (rows[0]?.isolationLevel !== "read committed") {
    throw new ConflictError("Leave posting requires Read Committed transaction isolation.")
  }
  const key = JSON.stringify(["hris-leave-ledger-v1", scope.organizationId, scope.employeeId, scope.leavePolicyId])
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`)
}

/** Validate later dated balances as well: a backdated debit must not consume
 * funds already reserved by a future approved absence. Caller holds the lock. */
export async function assertHrisLeaveDebitInTx(
  tx: Prisma.TransactionClient,
  scope: { organizationId: string; employeeId: string; leavePolicyId: string },
  effectiveAt: Date,
  deltaMinutes: number,
) {
  const current = await tx.hrisLeaveBalanceEntry.aggregate({
    where: { ...scope, effectiveAt: { lte: effectiveAt } },
    _sum: { deltaMinutes: true },
  })
  let balance = (current._sum.deltaMinutes ?? 0) + deltaMinutes
  const later = await tx.hrisLeaveBalanceEntry.findMany({
    where: { ...scope, effectiveAt: { gt: effectiveAt } },
    select: { effectiveAt: true, deltaMinutes: true },
    orderBy: [{ effectiveAt: "asc" }, { id: "asc" }],
  })
  const deltasByTime = new Map<number, number>()
  for (const entry of later) {
    const time = entry.effectiveAt.getTime()
    deltasByTime.set(time, (deltasByTime.get(time) ?? 0) + entry.deltaMinutes)
  }
  let minimum = balance
  for (const delta of deltasByTime.values()) {
    balance += delta
    minimum = Math.min(minimum, balance)
  }
  if (minimum < 0) {
    throw new BusinessRuleError("HRIS_LEAVE_BALANCE_NEGATIVE: A posting cannot create negative available leave, including later approved commitments.")
  }
}
