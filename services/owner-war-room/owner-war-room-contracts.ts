import type {
  BIActionLink,
  BIDailyDigest,
  BIFreshness,
  BIKpiState,
  BIProofDrawerSubject,
  BITrustState,
} from "@/services/bi/bi-contracts"
import type {
  EvidenceGrade,
  ProofTrailSubjectType,
} from "@/services/evidence/evidence-contracts"
import type { ModuleControlCenterData } from "@/services/modules/module-control-contracts"
import type {
  ActionQueueResult,
  BusinessSignalSeverity,
} from "@/services/signals/business-signal-contracts"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotBlocker,
  SnapshotFreshness,
  SnapshotRedaction,
  SnapshotResult,
  SnapshotSourceModule,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"

export type OwnerWarRoomCardId =
  | "cash_at_risk"
  | "reconciliation_exceptions"
  | "stock_cash_exposure"
  | "supplier_commitments"
  | "payroll_exposure"
  | "close_readiness"
  | "action_queue"
  | "module_observe"

export type OwnerWarRoomCardState =
  | "loading"
  | "empty"
  | "ready"
  | "partial"
  | "stale"
  | "blocked"
  | "redacted"
  | "permission_denied"
  | "module_unavailable"
  | "upgrade_request"
  | "safe_error"

export type OwnerWarRoomTone = "brand" | "success" | "info" | "gold" | "danger" | "spruce" | "muted"

export type OwnerWarRoomMetricCard = {
  id: OwnerWarRoomCardId
  title: string
  detail: string
  value: number
  unit: string
  tone: OwnerWarRoomTone
  state: OwnerWarRoomCardState
  evidenceGrade: EvidenceGrade
  freshness: SnapshotFreshness
  sourceModules: SnapshotSourceModule[]
  blockers: SnapshotBlocker[]
  redactions: SnapshotRedaction[]
  requiredPermission: string
  href: string
}

export type OwnerWarRoomProofSubject = {
  subjectType: ProofTrailSubjectType
  subjectId: string
  label: string
  detail: string
  requiredPermission: string
  enabled: boolean
  unavailableReason: string | null
}

export type OwnerWarRoomStrip = {
  id: "cash_leakage_radar" | "close_autopilot" | "module_control"
  title: string
  detail: string
  severity: BusinessSignalSeverity
  evidenceGrade: EvidenceGrade
  state: OwnerWarRoomCardState
  blockers: SnapshotBlocker[]
  redactions: SnapshotRedaction[]
}

export type OwnerWarRoomSummary = {
  criticalCount: number
  highCount: number
  redactedCount: number
  staleCount: number
  blockedCount: number
  upgradePromptCount: number
}

export type OwnerMorningBriefPriorityAction = {
  id: string
  title: string
  nextStep: string
  severity: BusinessSignalSeverity
  state: BIKpiState
  actionLink: BIActionLink
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  dueLabel: string | null
  ownerLabel: string | null
  blockers: SnapshotBlocker[]
  redactions: SnapshotRedaction[]
}

export type OwnerMorningBriefAcknowledgement = {
  supported: boolean
  state: "not_supported" | "not_started" | "acknowledged"
  acknowledgedAt: string | null
  detail: string
}

export type OwnerMorningBriefData = BIDailyDigest & {
  priorityActions: OwnerMorningBriefPriorityAction[]
  proofSubjects: BIProofDrawerSubject[]
  acknowledgement: OwnerMorningBriefAcknowledgement
  headlineMetrics: {
    cashAtRisk: number
    blockedCloseItems: number
    staleEvidenceItems: number
    proofLinkedActionCount: number
  }
}

export type OwnerWarRoomData = {
  organizationId: string
  organizationName: string | null
  generatedAt: string
  periodStart: string
  periodEnd: string
  cards: OwnerWarRoomMetricCard[]
  strips: OwnerWarRoomStrip[]
  proofSubjects: OwnerWarRoomProofSubject[]
  actionQueue: ActionQueueResult
  moduleControl: Pick<
    ModuleControlCenterData,
    "mode" | "hardEnforcementEnabled" | "summary" | "generatedAt" | "unknownRequestedModules"
  >
  summary: OwnerWarRoomSummary
  morningBrief: OwnerMorningBriefData
}

export type OwnerWarRoomSnapshotBundle = {
  tenantOperating: SnapshotResult<TenantOperatingMetrics>
  paymentTruth: SnapshotResult<PaymentTruthMetrics>
  inventoryCash: SnapshotResult<InventoryCashMetrics>
  closeReadiness: SnapshotResult<CloseReadinessMetrics>
}

export type ComposeOwnerWarRoomInput = {
  organizationId: string
  organizationName: string | null
  generatedAt: string
  snapshots: OwnerWarRoomSnapshotBundle
  actionQueue: ActionQueueResult
  moduleControl: ModuleControlCenterData
  proofSubjectIds?: Partial<Record<ProofTrailSubjectType, string | null>>
}
