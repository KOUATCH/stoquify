import "server-only"
import { Prisma } from "@prisma/client"
import { resolveTargetPeriod } from "./close-period-selection.service"
import { deriveCloseCurrentProof } from "./close-assurance-current-proof"
import { applyCloseAssessmentSelection, deriveCloseAssessmentSelection, readCloseAssessmentOrderInTx } from "./close-assessment-order.service"
import { savedCloseSourceRevision } from "./close-source-revision.service"

// Caller supplies one RepeatableRead transaction. No collectors, row/advisory
// locks, publication helpers or write paths belong in this projection.
export async function readAccountantPortfolioProof(
  tx: Prisma.TransactionClient, organizationId: string, now: Date,
) {
  const period = await resolveTargetPeriod(organizationId, null, tx, now)
  const selectedPeriod = period ? {
    id: period.id, name: period.name, status: period.status,
    startDate: period.startDate.toISOString(), endDate: period.endDate.toISOString(),
  } : null
  const empty = { selectedPeriod, checkedAt: now.toISOString(), assessmentAsOf: null, close: null, currentProof: null }
  if (!period) return { ...empty, proofState: "NO_PERIOD" as const }
  const order = await readCloseAssessmentOrderInTx(tx, organizationId, period.id)
  if (!order.latest) return { ...empty, proofState: "NO_ASSESSMENT" as const }
  const run = await tx.closeRun.findFirst({
    where: { organizationId, periodId: period.id, id: order.latest.id },
    select: { id: true, periodId: true, status: true, readinessScore: true,
      criticalBlockerCount: true, highBlockerCount: true, asOf: true, metadata: true, voidedAt: true },
  })
  if (!run) return { ...empty, proofState: "UNAVAILABLE" as const }
  const scope = { organizationId, periodId: period.id, closeRunId: run.id }
  const findings = await tx.closeAssuranceFinding.groupBy({
    by: ["severity"], where: { ...scope, status: { in: ["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"] } }, _count: { _all: true },
  })
  const controls = await tx.closeChecklistItem.groupBy({
    by: ["severity"], where: { ...scope, status: { in: ["FAILED", "UNAVAILABLE"] } }, _count: { _all: true },
  })
  const unavailableEvidence = await tx.closeEvidenceItem.count({ where: { ...scope, available: false } })
  // SQL IS DISTINCT FROM includes SQL NULL, JSON null and absent staleState,
  // matching deriveCloseCurrentProof's retained-export predicate exactly.
  const exports = await tx.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS count FROM close_pack_exports
    WHERE "organizationId" = ${organizationId} AND "periodId" = ${period.id} AND "closeRunId" = ${run.id}
      AND "isCertified" = true
      AND (metadata #>> '{staleState,status}') IS DISTINCT FROM 'EVIDENCE_STALE'
  `)
  const sum = (rows: typeof findings, high = false) => rows.reduce((total, row) =>
    total + ((!high || ["HIGH", "CRITICAL"].includes(row.severity)) ? row._count._all : 0), 0)
  const proof = applyCloseAssessmentSelection(deriveCloseCurrentProof({
    ...run, findings: [], checklistItems: [], evidenceItems: [], packExports: [],
    counts: { currentExports: Number(exports[0]?.count ?? 0), openFindings: sum(findings),
      highFindings: sum(findings, true), failedControls: sum(controls), highControls: sum(controls, true), unavailableEvidence },
  }, now), deriveCloseAssessmentSelection(order, run))
  const proofState = proof.assessmentState !== "CURRENT" ? proof.assessmentState!
    : proof.blockers.some(b => b.id === "close-evidence-stale") ? "STALE" as const
      : proof.blockers.some(b => ["close-evidence-unavailable", "close-certified-export-missing"].includes(b.id)) ? "UNAVAILABLE" as const
        : "CURRENT" as const
  return {
    selectedPeriod, checkedAt: now.toISOString(), assessmentAsOf: run.asOf.toISOString(), proofState, currentProof: proof,
    close: {
      runId: run.id, periodId: run.periodId, status: run.status, readinessScore: run.readinessScore,
      blockerCount: run.criticalBlockerCount + run.highBlockerCount, asOf: run.asOf.toISOString(),
      scoreBasis: "HISTORICAL_ASSESSMENT" as const,
      // A global revision mismatch alone is not a period-specific invalidation.
      // Publication guards and source invalidators own that decision.
      sourceRevision: savedCloseSourceRevision(run.metadata),
    },
  }
}
