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
} from "@/services/snapshots/snapshot-contracts"
import type { CashOperatingMetrics, CashSource } from "./cash-command-sources.service"
import type { CashDrawerDashboardData } from "@/services/pos/drawer-dashboard.service"

export type CashCommandCardId =
  | "cash_collected"
  | "unreconciled_cash"
  | "open_suspense"
  | "drawer_risk"
  | "provider_risk"
  | "employee_balance_recovery"
  | "upcoming_payroll_net_pay"
  | "upcoming_statutory_liability"
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
  cashCollected: number | null
  unreconciledCash: number | null
  openSuspenseCount: number | null
  drawerVariance: number | null
  drawerAlertCount: number | null
  providerRiskCount: number | null
  activeEmployeeBalanceCaseCount: number | null
  employeeBalanceOutstandingAmount: number | null
  upcomingPayrollNetPayAmount: number | null
  upcomingStatutoryLiabilityAmount: number | null
  payrollForecastTotalAmount: number | null
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
  drawerState: CashCommandDrawerState | null
  sourceRestrictions?: { id: string; title: string; reason: "permission_denied" | "module_unavailable" }[]
  actionQueue: Pick<ActionQueueResult, "summary" | "filteredOutCount">
  moduleControl: Pick<
    ModuleControlCenterData,
    "mode" | "hardEnforcementEnabled" | "summary" | "generatedAt" | "unknownRequestedModules"
  > | null
  summary: CashCommandSummary
}

export type AuthorizedCashCommandData = Omit<CashCommandData, "summary" | "drawerState" | "moduleControl" | "actionQueue"> & {
  summary: { [K in keyof CashCommandSummary]: CashCommandSummary[K] | null }
  drawerState: CashCommandDrawerState | null
  moduleControl: CashCommandData["moduleControl"] | null
  actionQueue: { summary: Pick<ActionQueueResult["summary"], "total" | "bySeverity">; filteredOutCount: number | null }
  restrictedCapabilities?: { id: string; title: string; reason: "permission_denied" | "module_unavailable" }[]
}

export type CashCommandSnapshotBundle = {
  tenantOperating: CashSource<CashOperatingMetrics>
  paymentTruth: SnapshotResult<PaymentTruthMetrics> | null
  inventoryCash: SnapshotResult<InventoryCashMetrics> | null
  closeReadiness: SnapshotResult<CloseReadinessMetrics> | null
}

export type ComposeCashCommandInput = {
  organizationId: string
  organizationName: string | null
  generatedAt: string
  currency: string
  cardSources?: Partial<Record<CashCommandCardId, CashSource<unknown>>>
  snapshots: CashCommandSnapshotBundle
  drawerDashboard: CashDrawerDashboardData | null
  sourceRestrictions?: CashCommandData["sourceRestrictions"]
  actionQueue: ActionQueueResult
  moduleControl: ModuleControlCenterData | null
  proofSubjectUnavailableReasons?: Partial<Record<"payment.transaction" | "journal.entry" | "reconciliation.run" | "close.run", string>>
  proofSubjectIds?: {
    paymentTransactionId?: string | null
    journalEntryId?: string | null
    reconciliationRunId?: string | null
    closeRunId?: string | null
  }
}
