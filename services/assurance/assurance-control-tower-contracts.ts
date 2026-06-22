import type { EvidenceGrade, ProofTrailRedaction } from "@/services/evidence/evidence-contracts"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import type { SnapshotBlocker } from "@/services/snapshots/snapshot-contracts"

import type {
  WorkflowAssuranceIncidentDto,
  WorkflowAssuranceIncidentStatus,
} from "./assurance-incident-contracts"
import type {
  WorkflowAssuranceRunStatus,
  WorkflowAssuranceSeverity,
  WorkflowAssuranceWorkflow,
} from "./assurance-registry-contracts"

export type AssuranceDashboardTone = "brand" | "success" | "info" | "gold" | "danger" | "spruce" | "muted"

export type AssuranceControlTowerIncident = WorkflowAssuranceIncidentDto & {
  requiredPermission: string
  ownerRole: string
  sourceRoute: string
  detailRoute: string
  actionLabel: string
  canManage: boolean
  moduleSlugNormalized: CommercialModuleSlug
  blockers: SnapshotBlocker[]
}

export type AssuranceControlTowerBucket = {
  key: string
  label: string
  count: number
  tone: AssuranceDashboardTone
}

export type AssuranceControlTowerEngineHealth = {
  state: "healthy" | "watch" | "blocked"
  recentRunCount: number
  staleRunningCount: number
  failedRunCount: number
  pendingAlertCount: number
  failedAlertCount: number
  lastRunAt: string | null
}

export type AssuranceControlTowerCheckRun = {
  id: string
  checkKey: string
  runStatus: WorkflowAssuranceRunStatus
  resultStatus: string | null
  severity: WorkflowAssuranceSeverity | null
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  errorCode: string | null
  errorMessage: string | null
}

export type AssuranceControlTowerSummary = {
  open: number
  blocking: number
  complianceCritical: number
  overdue: number
  redacted: number
  suppressed: number
  waived: number
  hiddenByPermission: number
}

export type AssuranceControlTowerData = {
  organizationId: string
  generatedAt: string
  summary: AssuranceControlTowerSummary
  severityBuckets: AssuranceControlTowerBucket[]
  workflowBuckets: AssuranceControlTowerBucket[]
  ownerBuckets: AssuranceControlTowerBucket[]
  incidents: AssuranceControlTowerIncident[]
  recentRuns: AssuranceControlTowerCheckRun[]
  engineHealth: AssuranceControlTowerEngineHealth
}

export type AssuranceIncidentTimelineEvent = {
  id: string
  eventType: string
  fromStatus: WorkflowAssuranceIncidentStatus | null
  toStatus: WorkflowAssuranceIncidentStatus | null
  actorId: string | null
  message: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type AssuranceIncidentWaiverSummary = {
  id: string
  status: string
  requesterId: string
  approverId: string | null
  evidenceHash: string
  expiresAt: string
  requestedAt: string
  approvedAt: string | null
}

export type AssuranceIncidentDetailData = {
  organizationId: string
  generatedAt: string
  incident: AssuranceControlTowerIncident
  canManage: boolean
  timeline: AssuranceIncidentTimelineEvent[]
  waivers: AssuranceIncidentWaiverSummary[]
  redactions: ProofTrailRedaction[]
  evidenceGrade: EvidenceGrade
}
