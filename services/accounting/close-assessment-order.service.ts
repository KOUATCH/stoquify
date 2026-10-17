import "server-only"

import { CloseRunStatus, Prisma, type CloseRun } from "@prisma/client"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"
import type { ProofTrailBlocker } from "@/services/evidence/evidence-contracts"

type OrderedAssessment = Pick<CloseRun, "id" | "createdAt" | "status" | "voidedAt">
export type CloseAssessmentOrder = { latest: OrderedAssessment | null; ambiguous: boolean }
export type CloseAssessmentSelection = {
  state: "CURRENT" | "HISTORICAL" | "AMBIGUOUS" | "VOIDED"
  latestRunId: string | null
  latestCreatedAt: Date | null
  ambiguous: boolean
}

// Creation and certification take this lock before any close-run row lock.
// Participating source writers acquire their complete ordered period set first;
// other invalidators retain their existing domain-lock -> close-run-lock order.
export async function lockCloseAssessmentOrderInTx(
  tx: Prisma.TransactionClient, organizationId: string, periodId: string,
) {
  const key = JSON.stringify(["close-assessment-order", organizationId, periodId])
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`)
}

/** Acquire the entire affected set before discovering runs or locking any run.
 * Callers must use current committed reads after waiting. This does not lock
 * the accounting-period predicate against concurrent creation of new periods.
 */
export async function lockCloseAssessmentPeriodsInTx(
  tx: Prisma.TransactionClient, organizationId: string, periodIds: readonly string[],
): Promise<void> {
  for (const periodId of [...new Set(periodIds)].sort()) {
    await lockCloseAssessmentOrderInTx(tx, organizationId, periodId)
  }
}

export async function readCloseAssessmentOrderInTx(
  tx: Prisma.TransactionClient, organizationId: string, periodId: string,
): Promise<CloseAssessmentOrder> {
  const rows = await tx.closeRun.findMany({
    where: { organizationId, periodId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 2,
    select: { id: true, createdAt: true, status: true, voidedAt: true },
  })
  const latest = rows[0] ?? null
  return { latest, ambiguous: !!latest && rows.length > 1 && latest.createdAt.getTime() === rows[1].createdAt.getTime() }
}

export async function readCloseAssessmentPublicationTimeInTx(tx: Prisma.TransactionClient): Promise<Date> {
  // now() is the transaction start, which can precede a lock wait. Truncate the
  // post-lock database clock to the existing TIMESTAMP(3)/JavaScript precision.
  const rows = await tx.$queryRaw<{ createdAt: Date }[]>(Prisma.sql`SELECT date_trunc('milliseconds', clock_timestamp()) AS "createdAt"`)
  const createdAt = rows[0]?.createdAt
  if (!(createdAt instanceof Date) || !Number.isFinite(createdAt.getTime())) {
    throw new ConflictError("The assessment publication time is unavailable. Retry after the database clock is available.")
  }
  return createdAt
}

export function deriveCloseAssessmentSelection(
  order: CloseAssessmentOrder, run: Pick<CloseRun, "id" | "status" | "voidedAt">,
): CloseAssessmentSelection {
  const state = run.voidedAt || run.status === CloseRunStatus.VOIDED ? "VOIDED"
    : order.ambiguous ? "AMBIGUOUS"
      : order.latest?.id === run.id ? "CURRENT" : "HISTORICAL"
  return { state, latestRunId: order.latest?.id ?? null, latestCreatedAt: order.latest?.createdAt ?? null, ambiguous: order.ambiguous }
}

export function assertCloseAssessmentCurrent(selection: CloseAssessmentSelection) {
  if (selection.state === "VOIDED") {
    throw new BusinessRuleError("This close assessment has been voided. Run a new assessment before certification.", "INVALID_TRANSITION")
  }
  if (selection.state === "AMBIGUOUS") {
    throw new ConflictError("The latest close assessments have the same creation time. Run a new assessment before certification.")
  }
  if (selection.state !== "CURRENT") {
    throw new ConflictError("This close assessment is no longer current. Open the latest assessment before certification.")
  }
}

export function closeAssessmentSelectionBlocker(selection: CloseAssessmentSelection): ProofTrailBlocker | null {
  const common = { severity: "high" as const, gate: "close_readiness", sourceTables: ["close_runs"] }
  if (selection.state === "VOIDED") return {
    ...common, id: "close-assessment-voided", title: "Close assessment is voided",
    detail: "This assessment has been voided and cannot establish current certification.",
    nextAction: "Run a new close assessment and resolve its controls before requesting certification.",
  }
  if (selection.state === "AMBIGUOUS") return {
    ...common, id: "close-assessment-order-ambiguous", title: "Current close assessment is ambiguous",
    detail: "1 accounting period(s) have multiple latest assessments with the same creation time.",
    nextAction: "Review the competing assessments and run Close Assurance again before relying on certification.",
  }
  if (selection.state === "HISTORICAL") return {
    ...common, id: "close-assessment-not-current", title: "Close assessment is historical",
    detail: "This assessment is not the latest assessment for its accounting period.",
    nextAction: "Open the latest close assessment before relying on certification.",
  }
  return null
}
