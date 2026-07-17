import type {
  BIActionLink,
  BICommandBrief,
  BIInsight,
  BIKpiCard,
  BIKpiState,
  BITrustState,
} from "@/services/bi/bi-contracts"
import type { AssuranceControlTowerIncident } from "@/services/assurance/assurance-control-tower-contracts"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type {
  ActionItemStatus,
  ActionQueueResult,
  BusinessSignalSeverity,
  SignalOwnerRole,
} from "@/services/signals/business-signal-contracts"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotBlocker,
  SnapshotRedaction,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"

export type ManagerActionDueState = "overdue" | "due_today" | "due_soon" | "scheduled"

export type ManagerActionRunSheetGroupId =
  | "overdue"
  | "critical"
  | "due_today"
  | "blocked"
  | "waiting"
  | "assigned"
  | "routine"

export type ManagerActionCenterAction = {
  id: string
  signalId: string
  title: string
  nextStep: string
  actionPath: string
  requiredPermission: string
  status: ActionItemStatus
  severity: BusinessSignalSeverity
  severityScore: number
  assignedRole: SignalOwnerRole
  dueAt: string
  dueState: ManagerActionDueState
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  state: BIKpiState
  blockers: SnapshotBlocker[]
  redactions: SnapshotRedaction[]
  actionLink: BIActionLink
}

export type ManagerActionRunSheetGroup = {
  id: ManagerActionRunSheetGroupId
  title: string
  detail: string
  state: BIKpiState
  count: number
  actions: ManagerActionCenterAction[]
}

export type ManagerActionCenterSummary = {
  total: number
  open: number
  assigned: number
  stale: number
  expired: number
  critical: number
  high: number
  redacted: number
  blocked: number
  overdue: number
  hiddenByPermission: number
}

export type ManagerActionCenterData = {
  organizationId: string
  generatedAt: string
  periodStart: string
  periodEnd: string
  commandBrief: BICommandBrief
  runSheetGroups: ManagerActionRunSheetGroup[]
  kpis: BIKpiCard[]
  insights: BIInsight[]
  actionItems: ManagerActionCenterAction[]
  actionQueue: ActionQueueResult
  summary: ManagerActionCenterSummary
  assuranceIncidents: AssuranceControlTowerIncident[]
}

export type ManagerActionCenterSnapshotBundle = {
  tenantOperating: SnapshotResult<TenantOperatingMetrics>
  paymentTruth: SnapshotResult<PaymentTruthMetrics>
  inventoryCash: SnapshotResult<InventoryCashMetrics>
  closeReadiness: SnapshotResult<CloseReadinessMetrics>
}

export type ComposeManagerActionCenterInput = {
  organizationId: string
  generatedAt: string
  snapshots: ManagerActionCenterSnapshotBundle
  actionQueue: ActionQueueResult
  assuranceIncidents?: AssuranceControlTowerIncident[]
  assuranceHiddenByPermission?: number
}
