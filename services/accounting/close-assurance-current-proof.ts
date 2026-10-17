import { CloseRunStatus, type Prisma } from "@prisma/client"

import type { EvidenceGrade, ProofTrailBlocker } from "@/services/evidence/evidence-contracts"
import { computeCloseRunEvidenceGrade } from "@/services/evidence/evidence-grade.service"

export type CloseCurrentProof = {
  checkedAt: string
  grade: EvidenceGrade
  blockers: ProofTrailBlocker[]
  // Populated by the dashboard's tenant-period snapshot, never inferred by the client.
  assessmentState?: "CURRENT" | "HISTORICAL" | "AMBIGUOUS" | "VOIDED"
  latestAssessmentCreatedAt?: string | null
}

type CurrentProofRun = {
  status: CloseRunStatus
  metadata: Prisma.JsonValue
  voidedAt?: Date | null
  findings: Array<{ status: string; severity: string }>
  checklistItems: Array<{ status: string; severity: string }>
  evidenceItems: Array<{ available: boolean }>
  packExports: Array<{ metadata: Prisma.JsonValue }>
}

function stale(metadata: Prisma.JsonValue) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false
  const value = metadata.staleState
  return !!value && typeof value === "object" && !Array.isArray(value) && value.status === "EVIDENCE_STALE"
}

// The caller supplies all tenant-scoped run relations and certified exports from
// one database snapshot. Persisted readiness scores remain historical evidence.
export function deriveCloseCurrentProof(run: CurrentProofRun, checkedAt: Date): CloseCurrentProof {
  const blockers: ProofTrailBlocker[] = []
  const currentExports = run.packExports.filter(item => !stale(item.metadata)).length
  const openFindings = run.findings.filter(item => ["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"].includes(item.status))
  const failedControls = run.checklistItems.filter(item => ["FAILED", "UNAVAILABLE"].includes(item.status))
  const unavailableEvidence = run.evidenceItems.filter(item => !item.available).length
  const high = (items: Array<{ severity: string }>) => items.some(item => ["HIGH", "CRITICAL"].includes(item.severity))
  if (run.status === CloseRunStatus.BLOCKED || run.status === CloseRunStatus.VOIDED || run.voidedAt) blockers.push({
    id: "close-runs-blocked", severity: "high", gate: "close_readiness", title: "Close runs are blocked",
    detail: "1 close run(s) are blocked in the selected period.", sourceTables: ["close_runs"],
    nextAction: "Use Close Assurance to clear blockers before certification.",
  })
  if (stale(run.metadata)) blockers.push({
    id: "close-evidence-stale", severity: "high", gate: "close_readiness", title: "Close evidence has been invalidated",
    detail: "1 close run(s) require fresh evidence after a source change.", sourceTables: ["close_runs", "close_pack_exports"],
    nextAction: "Reevaluate Close Assurance and obtain current certification evidence.",
  })
  if (run.status === CloseRunStatus.CERTIFIED && currentExports === 0) blockers.push({
    id: "close-certified-export-missing", severity: "high", gate: "close_readiness", title: "Close certification evidence is missing",
    detail: "1 certified close run(s) lack a current certified export.", sourceTables: ["close_runs", "close_pack_exports"],
    nextAction: "Review and retain a current certified close pack before relying on certification.",
  })
  if (openFindings.length) blockers.push({
    id: "close-findings-open", severity: high(openFindings) ? "high" : "medium", gate: "close_readiness", title: "Close findings remain open",
    detail: `${openFindings.length} finding(s) remain unresolved in the selected close runs.`, sourceTables: ["close_assurance_findings"],
    nextAction: "Resolve or formally waive close findings through Close Assurance.",
  })
  if (failedControls.length) blockers.push({
    id: "close-checklist-incomplete", severity: high(failedControls) ? "high" : "medium", gate: "close_readiness", title: "Close controls failed or are unavailable",
    detail: `${failedControls.length} checklist control(s) failed or are unavailable in the selected close runs.`, sourceTables: ["close_checklist_items"],
    nextAction: "Review failed controls and restore their evidence before certification.",
  })
  if (unavailableEvidence) blockers.push({
    id: "close-evidence-unavailable", severity: "high", gate: "close_readiness", title: "Close evidence is unavailable",
    detail: `${unavailableEvidence} close evidence item(s) are unavailable for this organization.`, sourceTables: ["close_evidence_items"],
    nextAction: "Regenerate or attach the missing close evidence.",
  })
  return { checkedAt: checkedAt.toISOString(), grade: computeCloseRunEvidenceGrade({ status: run.status, certifiedPackExportCount: currentExports, blockers }).grade, blockers }
}
