import "server-only"

import { createActionLinkFromActionItem, createSignalInsight, createSnapshotKpi, normalizeSnapshotFreshness } from "@/services/bi/bi-evidence-adapter.service"
import type { BICommandBrief, BIKpiCard, BIKpiState } from "@/services/bi/bi-contracts"
import { evidenceGradeToBITrustState } from "@/services/bi/bi-contracts"
import { getAssuranceControlTowerData } from "@/services/assurance/assurance-control-tower.service"
import type { AssuranceControlTowerIncident } from "@/services/assurance/assurance-control-tower-contracts"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import type {
  ActionItem,
  ActionQueueResult,
  BusinessSignalSeverity,
} from "@/services/signals/business-signal-contracts"
import { buildBusinessSignalsFromSnapshots } from "@/services/signals/business-signal-rules.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import type { SnapshotResult } from "@/services/snapshots/snapshot-contracts"
import { getTenantOperatingSnapshotFromRelated } from "@/services/snapshots/tenant-operating-snapshot.service"

import type {
  ComposeManagerActionCenterInput,
  ManagerActionCenterAction,
  ManagerActionCenterData,
  ManagerActionCenterSummary,
  ManagerActionDueState,
  ManagerActionRunSheetGroup,
  ManagerActionRunSheetGroupId,
} from "./manager-action-center-contracts"

type ManagerActionCenterInput = {
  organizationId: string
  actorPermissions: readonly string[]
  periodStart?: Date | string | null
  periodEnd?: Date | string | null
  maxAgeMinutes?: number | null
  now?: Date | string | null
}

const SEVERITY_RANK: Record<BusinessSignalSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

const RUN_SHEET_GROUPS: Array<{
  id: ManagerActionRunSheetGroupId
  title: string
  detail: string
}> = [
  {
    id: "overdue",
    title: "Overdue now",
    detail: "Actions already past their due time. Handle these before routine work.",
  },
  {
    id: "critical",
    title: "Critical pressure",
    detail: "Critical or high-risk actions that can block cash, stock, close, or control trust.",
  },
  {
    id: "due_today",
    title: "Due today",
    detail: "Visible work that should be cleared before the day closes.",
  },
  {
    id: "blocked",
    title: "Blocked",
    detail: "Actions with evidence, workflow, or source-data blockers that need manager routing.",
  },
  {
    id: "waiting",
    title: "Waiting soon",
    detail: "Actions approaching their due window or waiting on another operating role.",
  },
  {
    id: "assigned",
    title: "Assigned",
    detail: "Actions already routed to a responsible role and waiting for completion.",
  },
  {
    id: "routine",
    title: "Routine watch",
    detail: "Lower-pressure actions that remain visible after urgent work is handled.",
  },
]

export async function getManagerActionCenterData(
  input: ManagerActionCenterInput,
): Promise<ManagerActionCenterData> {
  const scope = {
    organizationId: input.organizationId,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    maxAgeMinutes: input.maxAgeMinutes ?? null,
    now: input.now ?? null,
  }

  const [paymentTruth, inventoryCash, closeReadiness, assuranceControlTower] = await Promise.all([
    getPaymentTruthSnapshot(scope),
    getInventoryCashSnapshot(scope),
    getCloseReadinessSnapshot(scope),
    getSafeAssuranceControlTowerData(input),
  ])
  const tenantOperating = await getTenantOperatingSnapshotFromRelated(scope, {
    paymentTruth,
    inventoryCash,
    closeReadiness,
  })

  const signals = buildBusinessSignalsFromSnapshots({
    organizationId: input.organizationId,
    snapshots: [tenantOperating, paymentTruth, inventoryCash, closeReadiness],
  })
  const actionQueue = buildActionQueue({
    organizationId: input.organizationId,
    signals,
    actorPermissions: input.actorPermissions,
    now: input.now ?? null,
  })

  return composeManagerActionCenterData({
    organizationId: input.organizationId,
    generatedAt: normalizeNow(input.now).toISOString(),
    snapshots: {
      tenantOperating,
      paymentTruth,
      inventoryCash,
      closeReadiness,
    },
    actionQueue,
    assuranceIncidents: assuranceControlTower.incidents,
    assuranceHiddenByPermission: assuranceControlTower.hiddenByPermission,
  })
}

export function composeManagerActionCenterData(
  input: ComposeManagerActionCenterInput,
): ManagerActionCenterData {
  const { tenantOperating, paymentTruth, inventoryCash, closeReadiness } = input.snapshots
  const now = new Date(input.generatedAt)
  const assuranceActions = (input.assuranceIncidents ?? []).map((incident) => managerActionFromAssuranceIncident(incident, now))
  const summary = summarizeManagerActions(input.actionQueue, now, assuranceActions, input.assuranceHiddenByPermission ?? 0)
  const signalModuleById = new Map(input.actionQueue.signals.map((signal) => [signal.id, signal.moduleSlug]))
  const actionItems = input.actionQueue.actionItems
    .slice()
    .sort(sortActionItems)
    .map((item) => managerActionFromItem(item, signalModuleById.get(item.signalId) ?? "dashboard", now))
    .concat(assuranceActions)
    .sort(sortManagerActions)
  const commandBrief = buildManagerCommandBrief({
    input,
    summary,
    actionItems,
  })
  const runSheetGroups = buildRunSheetGroups(actionItems)

  return {
    organizationId: input.organizationId,
    generatedAt: input.generatedAt,
    periodStart: tenantOperating.periodStart,
    periodEnd: tenantOperating.periodEnd,
    commandBrief,
    runSheetGroups,
    kpis: [
      managerKpi({
        id: "manager-open-actions",
        title: "Open manager actions",
        detail: "Permission-filtered work items generated from trusted business signals.",
        value: summary.total,
        unit: "actions",
        snapshot: tenantOperating,
        href: "/dashboard/manager-action-center",
        evidenceGrade: strongestEvidenceGrade(input.actionQueue.actionItems.map((item) => item.evidenceGrade)),
        state: queueState(summary),
        blockers: input.actionQueue.actionItems.flatMap((item) => item.blockers),
        redactions: input.actionQueue.actionItems.flatMap((item) => item.redactions),
      }),
      managerKpi({
        id: "manager-critical-actions",
        title: "Critical pressure",
        detail: "Critical or high-severity actions that should be handled before routine work.",
        value: summary.critical + summary.high,
        unit: "actions",
        snapshot: paymentTruth,
        href: "/dashboard/finance/payments",
        evidenceGrade: strongestEvidenceGrade(
          input.actionQueue.actionItems
            .filter((item) => item.severity === "critical" || item.severity === "high")
            .map((item) => item.evidenceGrade),
        ),
        state: summary.critical > 0 ? "blocked" : summary.high > 0 ? "partial" : summary.total > 0 ? "ready" : "empty",
        blockers: paymentTruth.blockers,
        redactions: paymentTruth.redactions,
        moduleSlug: "payment_reconciliation",
        requiredPermission: "payments.reconciliation.read",
      }),
      managerKpi({
        id: "manager-stock-work",
        title: "Stock and supplier work",
        detail: "Inventory, purchase order, stockout, and supplier actions visible to this manager.",
        value: countRoleActions(input.actionQueue, ["stockkeeper", "purchasing"]),
        unit: "actions",
        snapshot: inventoryCash,
        href: "/dashboard/inventory/stock",
        state: inventoryCash.blockers.length ? "blocked" : inventoryCash.freshness.stale ? "stale" : "ready",
        moduleSlug: "inventory",
        requiredPermission: "inventory.read",
      }),
      managerKpi({
        id: "manager-hidden-actions",
        title: "Hidden by permission",
        detail: "Signals the server withheld because this user lacks the required role permission.",
        value: summary.hiddenByPermission,
        unit: "actions",
        snapshot: closeReadiness,
        href: "/dashboard/settings/roles",
        evidenceGrade: summary.hiddenByPermission > 0 ? "operational" : closeReadiness.evidenceGrade,
        state: summary.hiddenByPermission > 0 ? "permission_denied" : "ready",
        moduleSlug: "administration",
        requiredPermission: "users.read",
      }),
    ],
    insights: input.actionQueue.signals.slice(0, 8).map((signal) => createSignalInsight({ signal })),
    actionItems,
    actionQueue: input.actionQueue,
    summary,
    assuranceIncidents: input.assuranceIncidents ?? [],
  }
}

async function getSafeAssuranceControlTowerData(input: ManagerActionCenterInput) {
  try {
    const data = await getAssuranceControlTowerData({
      organizationId: input.organizationId,
      actorPermissions: input.actorPermissions,
      now: input.now ?? null,
      limit: 25,
    })

    return {
      incidents: data.incidents,
      hiddenByPermission: data.summary.hiddenByPermission,
    }
  } catch {
    return {
      incidents: [],
      hiddenByPermission: 0,
    }
  }
}

function buildManagerCommandBrief(input: {
  input: ComposeManagerActionCenterInput
  summary: ManagerActionCenterSummary
  actionItems: ManagerActionCenterAction[]
}): BICommandBrief {
  const { tenantOperating } = input.input.snapshots
  const state = queueState(input.summary)
  const evidenceGrade = strongestEvidenceGrade([
    tenantOperating.evidenceGrade,
    ...input.actionItems.map((item) => item.evidenceGrade),
  ])
  const freshness = normalizeSnapshotFreshness(tenantOperating.freshness, tenantOperating.status)
  const blockers = input.actionItems.flatMap((item) => item.blockers)
  const redactions = input.actionItems.flatMap((item) => item.redactions)

  return {
    id: `manager-daily-run-sheet:${input.input.organizationId}`,
    organizationId: input.input.organizationId,
    title: "Manager daily run sheet",
    summary: buildManagerBriefSummary(input.summary),
    conclusion: buildManagerBriefConclusion(input.summary),
    mode: "brief",
    generatedAt: input.input.generatedAt,
    periodStart: tenantOperating.periodStart,
    periodEnd: tenantOperating.periodEnd,
    state,
    evidenceGrade,
    trustState: evidenceGradeToBITrustState(evidenceGrade),
    freshness,
    provenance: {
      organizationId: tenantOperating.organizationId,
      locationId: tenantOperating.locationId,
      sourceKind: tenantOperating.kind,
      sourceHash: tenantOperating.sourceHash,
      sourceModules: tenantOperating.sourceModules,
      generatedAt: tenantOperating.generatedAt,
      periodStart: tenantOperating.periodStart,
      periodEnd: tenantOperating.periodEnd,
    },
    sourceModules: tenantOperating.sourceModules,
    blockers,
    redactions,
    primaryAction: input.actionItems[0]?.actionLink ?? null,
    drillThrough: null,
    reviewState: {
      organizationId: input.input.organizationId,
      reviewerId: null,
      reviewerRole: "manager",
      state: state === "blocked" ? "blocked" : state === "stale" || state === "partial" ? "stale" : "not_started",
      reviewedAt: null,
      previousReviewedAt: null,
      nextReviewDueAt: null,
      freshness,
      blockers,
    },
  }
}

function buildManagerBriefSummary(summary: ManagerActionCenterSummary) {
  return `${summary.total} visible action${summary.total === 1 ? "" : "s"}: ${summary.overdue} overdue, ${summary.critical + summary.high} critical or high, ${summary.blocked} blocked, and ${summary.hiddenByPermission} hidden by permission.`
}

function buildManagerBriefConclusion(summary: ManagerActionCenterSummary) {
  if (summary.overdue > 0) return "Start with overdue work before the operating day drifts further out of control."
  if (summary.critical > 0 || summary.high > 0) return "Handle critical pressure before scanning routine KPIs."
  if (summary.blocked > 0) return "Clear blockers first so assigned teams can complete their work."
  if (summary.hiddenByPermission > 0) return "Some work is withheld by server-side permissions; use visible actions only."
  if (summary.total > 0) return "Work the run sheet from top to bottom, then review routine signals."
  return "No manager action is visible for this tenant and permission set right now."
}

function buildRunSheetGroups(actionItems: ManagerActionCenterAction[]): ManagerActionRunSheetGroup[] {
  return RUN_SHEET_GROUPS.map((group) => {
    const actions = actionItems.filter((item) => runSheetGroupForAction(item) === group.id)
    return {
      ...group,
      count: actions.length,
      state: runSheetGroupState(group.id, actions),
      actions,
    }
  })
}

function runSheetGroupForAction(item: ManagerActionCenterAction): ManagerActionRunSheetGroupId {
  if (item.dueState === "overdue") return "overdue"
  if (item.blockers.length > 0) return "blocked"
  if (item.severity === "critical" || item.severity === "high") return "critical"
  if (item.dueState === "due_today") return "due_today"
  if (item.status === "assigned") return "assigned"
  if (item.dueState === "due_soon") return "waiting"
  return "routine"
}

function runSheetGroupState(
  id: ManagerActionRunSheetGroupId,
  actions: readonly ManagerActionCenterAction[],
): BIKpiState {
  if (actions.length === 0) return "empty"
  if (id === "overdue" || id === "critical" || id === "blocked") return "blocked"
  if (id === "waiting" || id === "assigned") return "partial"
  return "ready"
}

function managerKpi(input: {
  id: string
  title: string
  detail: string
  value: number
  unit: string
  snapshot: SnapshotResult<unknown>
  href: string
  moduleSlug?: CommercialModuleSlug
  requiredPermission?: string
  evidenceGrade?: EvidenceGrade
  state?: BIKpiState
  blockers?: BIKpiCard["blockers"]
  redactions?: BIKpiCard["redactions"]
}): BIKpiCard {
  const card = createSnapshotKpi({
    id: input.id,
    title: input.title,
    detail: input.detail,
    value: input.value,
    unit: input.unit,
    moduleSlug: input.moduleSlug ?? "dashboard",
    requiredPermission: input.requiredPermission ?? "dashboard.read",
    snapshot: input.snapshot,
    href: input.href,
  })
  const evidenceGrade = input.evidenceGrade ?? card.evidenceGrade

  return {
    ...card,
    state: input.state ?? card.state,
    evidenceGrade,
    trustState: evidenceGradeToBITrustState(evidenceGrade),
    blockers: input.blockers ?? card.blockers,
    redactions: input.redactions ?? card.redactions,
  }
}

function managerActionFromItem(
  item: ActionItem,
  moduleSlug: CommercialModuleSlug,
  now: Date,
): ManagerActionCenterAction {
  return {
    id: item.id,
    signalId: item.signalId,
    title: item.title,
    nextStep: item.nextStep,
    actionPath: item.actionPath,
    requiredPermission: item.requiredPermission,
    status: item.status,
    severity: item.severity,
    severityScore: item.severityScore,
    assignedRole: item.assignedRole,
    dueAt: item.dueAt,
    dueState: dueState(item.dueAt, now),
    evidenceGrade: item.evidenceGrade,
    trustState: evidenceGradeToBITrustState(item.evidenceGrade),
    state: actionState(item),
    blockers: item.blockers,
    redactions: item.redactions,
    actionLink: createActionLinkFromActionItem({ item, moduleSlug }),
  }
}

function managerActionFromAssuranceIncident(
  incident: AssuranceControlTowerIncident,
  now: Date,
): ManagerActionCenterAction {
  const severity = assuranceSeverityToBusinessSeverity(incident.severity)
  const dueAt = incident.dueAt ?? incident.lastDetectedAt

  return {
    id: `assurance-${incident.id}`,
    signalId: incident.id,
    title: incident.title,
    nextStep: incident.proofSummary.blockerReason ?? incident.actionLabel,
    actionPath: incident.detailRoute,
    requiredPermission: incident.requiredPermission,
    status: incident.status === "assigned" ? "assigned" : "open",
    severity,
    severityScore: assuranceSeverityScore(incident.severity),
    assignedRole: ownerRoleToSignalRole(incident.ownerRole),
    dueAt,
    dueState: dueState(dueAt, now),
    evidenceGrade: incident.evidenceGrade,
    trustState: evidenceGradeToBITrustState(incident.evidenceGrade),
    state: incident.redactions.length > 0 ? "redacted" : incident.blockers.length > 0 ? "blocked" : "ready",
    blockers: incident.blockers,
    redactions: incident.redactions,
    actionLink: {
      id: `assurance-action-${incident.id}`,
      label: "Open assurance incident",
      href: incident.detailRoute,
      requiredPermission: incident.requiredPermission,
      moduleSlug: incident.moduleSlugNormalized,
      disabled: false,
      disabledReason: null,
    },
  }
}

function summarizeManagerActions(
  actionQueue: ActionQueueResult,
  now: Date,
  assuranceActions: readonly ManagerActionCenterAction[] = [],
  assuranceHiddenByPermission = 0,
): ManagerActionCenterSummary {
  const actionItems = [
    ...actionQueue.actionItems.map((item) => managerActionFromItem(item, "dashboard", now)),
    ...assuranceActions,
  ]

  return {
    total: actionItems.length,
    open: actionItems.filter((item) => item.status === "open").length,
    assigned: actionItems.filter((item) => item.status === "assigned").length,
    stale: actionQueue.summary.stale,
    expired: actionQueue.summary.expired,
    critical: actionItems.filter((item) => item.severity === "critical").length,
    high: actionItems.filter((item) => item.severity === "high").length,
    redacted: actionItems.filter((item) => item.redactions.length > 0).length,
    blocked: actionItems.filter((item) => item.blockers.length > 0).length,
    overdue: actionItems.filter((item) => item.dueState === "overdue").length,
    hiddenByPermission: actionQueue.filteredOutCount + assuranceHiddenByPermission,
  }
}

function sortActionItems(left: ActionItem, right: ActionItem) {
  const severityDelta = SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]
  if (severityDelta !== 0) return severityDelta
  const dueDelta = new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
  if (dueDelta !== 0) return dueDelta
  return right.severityScore - left.severityScore
}

function sortManagerActions(left: ManagerActionCenterAction, right: ManagerActionCenterAction) {
  const severityDelta = SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]
  if (severityDelta !== 0) return severityDelta
  const dueDelta = new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
  if (dueDelta !== 0) return dueDelta
  return right.severityScore - left.severityScore
}

function actionState(item: ActionItem): BIKpiState {
  if (item.status === "expired") return "stale"
  if (item.blockers.length > 0) return "blocked"
  if (item.redactions.length > 0) return "redacted"
  return "ready"
}

function queueState(summary: ManagerActionCenterSummary): BIKpiState {
  if (summary.total === 0 && summary.hiddenByPermission > 0) return "permission_denied"
  if (summary.total === 0) return "empty"
  if (summary.blocked > 0 || summary.critical > 0) return "blocked"
  if (summary.stale > 0 || summary.expired > 0 || summary.hiddenByPermission > 0) return "partial"
  return "ready"
}

function countRoleActions(actionQueue: ActionQueueResult, roles: readonly string[]) {
  return actionQueue.actionItems.filter((item) => roles.includes(item.assignedRole)).length
}

function assuranceSeverityToBusinessSeverity(value: AssuranceControlTowerIncident["severity"]): BusinessSignalSeverity {
  if (value === "blocking" || value === "compliance_critical") return "critical"
  if (value === "high") return "high"
  if (value === "warning") return "medium"
  return "low"
}

function assuranceSeverityScore(value: AssuranceControlTowerIncident["severity"]) {
  if (value === "compliance_critical") return 100
  if (value === "blocking") return 96
  if (value === "high") return 84
  if (value === "warning") return 62
  return 38
}

function ownerRoleToSignalRole(value: string): ManagerActionCenterAction["assignedRole"] {
  if (/accountant/i.test(value)) return "accountant"
  if (/finance/i.test(value)) return "finance"
  if (/inventory|stock/i.test(value)) return "stockkeeper"
  if (/purchas|supplier/i.test(value)) return "purchasing"
  if (/payroll/i.test(value)) return "payroll"
  if (/owner/i.test(value)) return "owner"
  return "manager"
}

function strongestEvidenceGrade(grades: EvidenceGrade[]): EvidenceGrade {
  if (grades.includes("blocked")) return "blocked"
  if (grades.includes("certified")) return "certified"
  if (grades.includes("reconciled")) return "reconciled"
  if (grades.includes("posted")) return "posted"
  if (grades.includes("operational")) return "operational"
  return "raw"
}

function dueState(value: string, now: Date): ManagerActionDueState {
  const due = new Date(value)
  if (Number.isNaN(due.getTime())) return "scheduled"
  if (due.getTime() < now.getTime()) return "overdue"
  if (sameUtcDay(due, now)) return "due_today"
  if (due.getTime() <= now.getTime() + 72 * 3_600_000) return "due_soon"
  return "scheduled"
}

function sameUtcDay(left: Date, right: Date) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  )
}

function normalizeNow(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}
