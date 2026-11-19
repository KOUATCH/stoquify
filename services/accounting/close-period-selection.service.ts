import "server-only"
import { AccountingPeriodStatus, type Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { NotFoundError } from "@/services/_shared/action-errors"

const select = {
  id: true, name: true, status: true, startDate: true, endDate: true,
  organization: { select: { currency: true } },
} satisfies Prisma.AccountingPeriodSelect

// Shared by close detail and portfolio. Never creates a period or assessment.
export async function resolveTargetPeriod(
  organizationId: string, periodId?: string | null,
  client: typeof db | Prisma.TransactionClient = db, now = new Date(),
) {
  if (periodId) {
    const period = await client.accountingPeriod.findFirst({ where: { organizationId, id: periodId }, select })
    if (!period) throw new NotFoundError("Accounting period not found")
    return period
  }
  const current = await client.accountingPeriod.findFirst({
    where: { organizationId, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: [{ startDate: "desc" }, { id: "desc" }], select,
  })
  return current ?? client.accountingPeriod.findFirst({
    where: { organizationId, status: AccountingPeriodStatus.OPEN },
    orderBy: [{ startDate: "desc" }, { id: "desc" }], select,
  })
}
