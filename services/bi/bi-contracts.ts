import type {
  EvidenceGrade,
  ProofTrailBlockerSeverity,
  ProofTrailSubjectType,
} from "@/services/evidence/evidence-contracts"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import type {
  SnapshotKind,
  SnapshotSourceModule,
  SnapshotStatus,
  SnapshotUiState,
} from "@/services/snapshots/snapshot-contracts"

export type BITrustState = "operational" | "posted" | "reconciled" | "certified" | "blocked"

export type BIFreshnessState = "fresh" | "stale" | "partial" | "blocked" | "unknown"

export type BIKpiState =
  | "loading"
  | "empty"
  | "ready"
  | "stale"
  | "partial"
  | "blocked"
  | "redacted"
  | "permission_denied"
  | "module_unavailable"
  | "safe_error"

export type BISeverity = "info" | "low" | "medium" | "high" | "critical"

export type BIKpiValueFormat = "number" | "currency" | "percent" | "score" | "text"

export type BIFreshness = {
  state: BIFreshnessState
  generatedAt: string
  sourceMaxUpdatedAt: string | null
  maxAgeMinutes: number | null
  stale: boolean
  staleReason: string | null
}

export type BIBlocker = {
  id: string
  severity: ProofTrailBlockerSeverity
  gate: string
  title: string
  detail: string
  sourceTables: string[]
  nextAction?: string
}

export type BIRedaction = {
  id: string
  field: string
  reason: string
  policy: string
}

export type BIDrillThrough =
  | {
      available: true
      type: "route" | "proof" | "route_and_proof"
      label: string
      href?: string
      subjectType?: ProofTrailSubjectType
      subjectId?: string
      requiredPermission: string
    }
  | {
      available: false
      type: "route" | "proof" | "route_and_proof"
      label: string
      requiredPermission: string
      unavailableReason: string
    }

export type BIProvenance = {
  organizationId: string
  locationId: string | null
  sourceKind?: SnapshotKind | string
  sourceId?: string | null
  sourceHash: string | null
  sourceModules: SnapshotSourceModule[]
  generatedAt: string
  periodStart?: string | null
  periodEnd?: string | null
}

export type BIActionLink = {
  id: string
  label: string
  href: string
  requiredPermission: string
  moduleSlug: CommercialModuleSlug
  disabled: boolean
  disabledReason: string | null
}

export type BIKpiCard = {
  id: string
  organizationId: string
  moduleSlug: CommercialModuleSlug
  requiredPermission: string
  title: string
  detail: string
  value: number | string | null
  unit: string
  format: BIKpiValueFormat
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  provenance: BIProvenance
  blockers: BIBlocker[]
  redactions: BIRedaction[]
  drillThrough: BIDrillThrough
  actionLink: BIActionLink | null
}

export type BIKpiGroup = {
  id: string
  organizationId: string
  title: string
  detail?: string
  moduleSlug: CommercialModuleSlug
  requiredPermission: string
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  cards: BIKpiCard[]
  blockers: BIBlocker[]
  redactions: BIRedaction[]
}

export type BIInsight = {
  id: string
  organizationId: string
  moduleSlug: CommercialModuleSlug
  sourceModules: SnapshotSourceModule[]
  title: string
  detail: string
  businessImpact: string
  severity: BISeverity
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  blockers: BIBlocker[]
  redactions: BIRedaction[]
  actionLink: BIActionLink | null
  drillThrough: BIDrillThrough
}

export type BICommandMode = "brief" | "command" | "investigate"

export type BICommandBrief = {
  id: string
  organizationId: string
  title: string
  summary: string
  conclusion: string
  mode: BICommandMode
  generatedAt: string
  periodStart: string | null
  periodEnd: string | null
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  provenance: BIProvenance | null
  sourceModules: SnapshotSourceModule[]
  blockers: BIBlocker[]
  redactions: BIRedaction[]
  primaryAction: BIActionLink | null
  drillThrough: BIDrillThrough | null
  reviewState: BIReviewState | null
}

export type BICommandSection = {
  id: string
  organizationId: string
  title: string
  detail: string | null
  mode: BICommandMode
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  sourceModules: SnapshotSourceModule[]
  cards: BIKpiCard[]
  insights: BIInsight[]
  changeEvents: BIChangeEvent[]
  flowSteps: BIFlowStep[]
  risks: BIRiskRank[]
  actions: BIActionLink[]
  blockers: BIBlocker[]
  redactions: BIRedaction[]
}

export type BICommandZone = {
  id: string
  organizationId: string
  moduleSlug: CommercialModuleSlug
  title: string
  businessQuestion: string
  summary: string
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  sourceModules: SnapshotSourceModule[]
  primaryMetric: BIKpiCard | null
  sections: BICommandSection[]
  cards: BIKpiCard[]
  insights: BIInsight[]
  risks: BIRiskRank[]
  flowSteps: BIFlowStep[]
  actions: BIActionLink[]
  blockers: BIBlocker[]
  redactions: BIRedaction[]
  drillThrough: BIDrillThrough | null
}

export type BIChangeDirection = "improved" | "worsened" | "changed" | "new" | "resolved" | "unchanged"

export type BIChangeEvent = {
  id: string
  organizationId: string
  moduleSlug: CommercialModuleSlug
  requiredPermission: string
  title: string
  detail: string
  businessImpact: string
  direction: BIChangeDirection
  severity: BISeverity
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  sourceModules: SnapshotSourceModule[]
  changedAt: string
  previousValue: number | string | null
  currentValue: number | string | null
  unit: string | null
  format: BIKpiValueFormat
  provenance: BIProvenance | null
  blockers: BIBlocker[]
  redactions: BIRedaction[]
  drillThrough: BIDrillThrough | null
  actionLink: BIActionLink | null
}

export type BIReviewState = {
  organizationId: string
  reviewerId: string | null
  reviewerRole: string | null
  state: "not_started" | "in_review" | "reviewed" | "stale" | "blocked"
  reviewedAt: string | null
  previousReviewedAt: string | null
  nextReviewDueAt: string | null
  freshness: BIFreshness
  blockers: BIBlocker[]
}

export type BIDailyDigest = {
  id: string
  organizationId: string
  audienceRole: string
  generatedAt: string
  periodStart: string
  periodEnd: string
  freshness: BIFreshness
  commandBrief: BICommandBrief
  changes: BIChangeEvent[]
  risks: BIRiskRank[]
  actions: BIActionLink[]
  zones: BICommandZone[]
  blockers: BIBlocker[]
  redactions: BIRedaction[]
}

export type BIFlowStep = {
  id: string
  organizationId: string
  moduleSlug: CommercialModuleSlug
  order: number
  label: string
  detail: string
  value: number | string | null
  unit: string | null
  format: BIKpiValueFormat
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  sourceModules: SnapshotSourceModule[]
  provenance: BIProvenance | null
  blockers: BIBlocker[]
  redactions: BIRedaction[]
  drillThrough: BIDrillThrough | null
  actionLink: BIActionLink | null
}

export type BIRiskRank = {
  id: string
  organizationId: string
  moduleSlug: CommercialModuleSlug
  rank: number
  title: string
  detail: string
  businessImpact: string
  severity: BISeverity
  severityScore: number
  moneyImpact: number | null
  urgency: "now" | "today" | "soon" | "watch"
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  sourceModules: SnapshotSourceModule[]
  blockers: BIBlocker[]
  redactions: BIRedaction[]
  drillThrough: BIDrillThrough
  actionLink: BIActionLink | null
}

export type BIProofDrawerSubject =
  | {
      available: true
      organizationId: string
      moduleSlug: CommercialModuleSlug
      subjectType: ProofTrailSubjectType
      subjectId: string
      label: string
      requiredPermission: string
      sourceModules: SnapshotSourceModule[]
    }
  | {
      available: false
      organizationId: string
      moduleSlug: CommercialModuleSlug
      label: string
      requiredPermission: string
      unavailableReason: string
      sourceModules: SnapshotSourceModule[]
    }

export function evidenceGradeToBITrustState(evidenceGrade: EvidenceGrade): BITrustState {
  switch (evidenceGrade) {
    case "posted":
      return "posted"
    case "reconciled":
      return "reconciled"
    case "certified":
      return "certified"
    case "blocked":
      return "blocked"
    case "raw":
    case "operational":
    default:
      return "operational"
  }
}

export function snapshotStatusToBIState(status: SnapshotStatus, uiState?: SnapshotUiState | null): BIKpiState {
  if (uiState) {
    if (uiState === "fresh") return "ready"
    return uiState
  }

  switch (status) {
    case "fresh":
      return "ready"
    case "stale":
      return "stale"
    case "partial":
      return "partial"
    case "blocked":
      return "blocked"
    case "building":
      return "loading"
    case "failed":
      return "safe_error"
    case "empty":
    default:
      return "empty"
  }
}

export function snapshotStatusToFreshnessState(status: SnapshotStatus): BIFreshnessState {
  switch (status) {
    case "fresh":
      return "fresh"
    case "stale":
      return "stale"
    case "partial":
      return "partial"
    case "blocked":
    case "failed":
      return "blocked"
    case "building":
    case "empty":
    default:
      return "unknown"
  }
}
