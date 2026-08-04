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
import type {
  PaymentReconciliationSignOffCommandCandidate,
  PaymentReconciliationSignOffCommandStateResult,
} from "@/services/reconciliation/payment-reconciliation-sign-off-command-state-contracts"
import type { ClientMissingCloseEvidenceRequestQueue } from "@/services/accounting/missing-close-evidence-request-queue-contracts"

export type ManagerActionDueState =
  | "overdue"
  | "due_today"
  | "due_soon"
  | "scheduled"

export type ManagerActionRunSheetGroupId =
  | "overdue"
  | "critical"
  | "due_today"
  | "blocked"
  | "waiting"
  | "assigned"
  | "routine"
export type ClientMissingProofActionCenterSource =
  | {
      state: "AVAILABLE"
      queue: ClientMissingCloseEvidenceRequestQueue
      reason: null
    }
  | {
      state: "HIDDEN"
      queue: null
      reason: "RBAC_REQUIRED" | "MODULE_UNAVAILABLE"
    }
  | {
      state: "UNAVAILABLE"
      queue: null
      reason: "SOURCE_READ_FAILED"
    }

type ManagerActionCenterActionBase = {
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

export type ManagerActionCenterAction =
  | (ManagerActionCenterActionBase & {
      origin: "SIGNAL" | "ASSURANCE" | "ACCOUNTANT_REQUEST"
      kind: "LINK"
      sourceCommand: null
    })
  | (ManagerActionCenterActionBase & {
      origin: "SOURCE_COMMAND"
      kind: "LINK"
      sourceCommand: null
    })
  | (ManagerActionCenterActionBase & {
      origin: "SOURCE_COMMAND"
      kind: "PAYMENT_RECONCILIATION_SIGN_OFF"
      sourceCommand: PaymentReconciliationSignOffCommandCandidate
    })

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
  dueToday: number
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
  clientMissingProofSource: ClientMissingProofActionCenterSource | null
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
  paymentReconciliationSignOff?: PaymentReconciliationSignOffCommandStateResult | null
  clientMissingProofSource?: ClientMissingProofActionCenterSource | null
}
