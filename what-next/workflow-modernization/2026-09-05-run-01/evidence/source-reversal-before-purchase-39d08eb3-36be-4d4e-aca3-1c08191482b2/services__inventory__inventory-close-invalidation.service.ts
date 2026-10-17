import { Prisma } from "@prisma/client"

import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { lockCloseAssessmentPeriodsInTx } from "@/services/accounting/close-assessment-order.service"
import { lockAccountingPeriodCatalogInTx } from "@/services/accounting/accounting-period-catalog.service"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"

type InventoryValuationCloseInvalidationInput = {
  organizationId: string
  sourceCode?: "INVENTORY_VALUATION_WRITE" | "INVENTORY_PHYSICAL_COUNT_VALIDATED"
  sourceId?: string | null
  periodId?: string | null
  occurredAt: Date
  // Source fingerprints can include events cumulatively through a period's end.
  // Opt in only when later periods also depend on this source observation.
  includeLaterPeriods?: boolean
  actorId?: string | null
  documentHash?: string | null
  correlationId?: string | null
}

async function assertPhysicalCountReadCommittedInTx(tx: Prisma.TransactionClient): Promise<void> {
  const isolation = await tx.$queryRaw<Array<{ isolationLevel: string }>>(
    Prisma.sql`SELECT current_setting('transaction_isolation') AS "isolationLevel"`,
  )
  if (isolation[0]?.isolationLevel !== "read committed") {
    throw new ConflictError("Zero-variance count posting requires a Read Committed transaction. Retry in a supported transaction.")
  }
}

/** Catalog membership must be stable before taking posting-period row locks. */
export async function lockPhysicalCountPeriodCatalogInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<void> {
  await assertPhysicalCountReadCommittedInTx(tx)
  await lockAccountingPeriodCatalogInTx(tx, organizationId, "shared")
}

/** Lock cumulative count-evidence periods before any count source write.
 * The count caller holds the shared catalog lock before posting-period selection.
 * Other inventory producers retain their existing lock order.
 */
export async function lockPhysicalCountCloseAssessmentPeriodsInTx(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; periodId: string; occurredAt: Date },
): Promise<void> {
  await assertPhysicalCountReadCommittedInTx(tx)
  const periods = await tx.accountingPeriod.findMany({
    where: {
      organizationId: input.organizationId,
      OR: [{ id: input.periodId }, { endDate: { gte: input.occurredAt } }],
    },
    select: { id: true },
    orderBy: { id: "asc" },
  })
  if (!periods.some(period => period.id === input.periodId)) throw new NotFoundError("Accounting period not found")
  await lockCloseAssessmentPeriodsInTx(tx, input.organizationId, periods.map(period => period.id))
}
export async function recordInventoryValuationCloseInvalidationInTx(
  tx: Prisma.TransactionClient,
  input: InventoryValuationCloseInvalidationInput,
) {
  return recordCloseCertificationInvalidationsForSourceInTx(tx, input.organizationId, {
    sourceCode: input.sourceCode ?? "INVENTORY_VALUATION_WRITE",
    sourceId: input.sourceId ?? null,
    periodId: input.periodId ?? null,
    periodStart: input.occurredAt,
    periodEnd: input.includeLaterPeriods ? null : input.occurredAt,
    staleReason: input.sourceCode === "INVENTORY_PHYSICAL_COUNT_VALIDATED"
      ? "Completed physical count changed close evidence."
      : "Inventory valuation write changed certified close evidence.",
    newEvidenceHash: input.documentHash ?? null,
    correlationId: input.correlationId ?? null,
  }, {
    actorId: input.actorId ?? null,
  })
}
