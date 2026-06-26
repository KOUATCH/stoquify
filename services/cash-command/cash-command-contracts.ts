import type {
  BIActionLink,
  BIBlocker,
  BIChangeEvent,
  BICommandBrief,
  BIFreshness,
  BIKpiCard,
  BIKpiState,
  BIProofDrawerSubject,
  BIRedaction,
  BIRiskRank,
  BISeverity,
  BITrustState,
} from "@/services/bi/bi-contracts"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type { ModuleControlCenterData } from "@/services/modules/module-control-contracts"
import type { ActionQueueResult } from "@/services/signals/business-signal-contracts"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"
import type { CashDrawerDashboardData } from "@/services/pos/drawer-dashboard.service"

export type CashCommandCardId =
  | "cash_collected"
  | "unreconciled_cash"
  | "open_suspense"
  | "drawer_risk"
  | "provider_risk"
  | "stock_cash_buffer"

export type CashCommandTrustSignalId =
  | "provider_evidence"
  | "reconciliation_signoff"
  | "open_suspense"
  | "drawer_confidence"
  | "close_readiness"
  | "freshness"

export type CashCommandTone = "brand" | "success" | "info" | "gold" | "danger" | "spruce" | "muted"

export type CashCommandTrustSignal = {
  id: CashCommandTrustSignalId
  label: string
  value: string
  detail: string | null
  tone: CashCommandTone
  requiredPermission: string
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  blockers: BIBlocker[]
  redactions: BIRedaction[]
}

export type CashCommandActionItem = {
  id: string
  title: string
  nextStep: string
  severity: BISeverity
  state: BIKpiState
  actionLink: BIActionLink
  evidenceGrade: EvidenceGrade
  trustState: BITrustState
  freshness: BIFreshness
  dueLabel: string | null
  ownerLabel: string | null
  blockers: BIBlocker[]
  redactions: BIRedaction[]
}

export type CashCommandSummary = {
  cashCollected: number
  unreconciledCash: number
  openSuspenseCount: number
  drawerVariance: number
  drawerAlertCount: number
  providerRiskCount: number
  actionCountToday: number
  staleCount: number
  blockedCount: number
  redactedCount: number
}

export type CashCommandDrawerState = {
  drawerCount: number
  openDrawerCount: number
  confidenceScore: number
  liveVariance: number
  sessionVariance: number
  alertCount: number
  highRiskAlertCount: number
}

export type CashCommandData = {
  organizationId: string
  organizationName: string | null
  generatedAt: string
  periodStart: string
  periodEnd: string
  currency: string
  commandBrief: BICommandBrief
  cards: BIKpiCard[]
  trustSignals: CashCommandTrustSignal[]
  changes: BIChangeEvent[]
  actionsToday: CashCommandActionItem[]
  risks: BIRiskRank[]
  proofSubjects: BIProofDrawerSubject[]
  drawerState: CashCommandDrawerState
  actionQueue: Pick<ActionQueueResult, "summary" | "filteredOutCount">
  moduleControl: Pick<
    ModuleControlCenterData,
    "mode" | "hardEnforcementEnabled" | "summary" | "generatedAt" | "unknownRequestedModules"
  >
  summary: CashCommandSummary
}

export type CashCommandSnapshotBundle = {
  tenantOperating: SnapshotResult<TenantOperatingMetrics>
  paymentTruth: SnapshotResult<PaymentTruthMetrics>
  inventoryCash: SnapshotResult<InventoryCashMetrics>
  closeReadiness: SnapshotResult<CloseReadinessMetrics>
}

export type ComposeCashCommandInput = {
  organizationId: string
  organizationName: string | null
  generatedAt: string
  currency: string
  snapshots: CashCommandSnapshotBundle
  drawerDashboard: CashDrawerDashboardData
  actionQueue: ActionQueueResult
  moduleControl: ModuleControlCenterData
  proofSubjectIds?: {
    paymentTransactionId?: string | null
    journalEntryId?: string | null
    reconciliationRunId?: string | null
    closeRunId?: string | null
  }
}
