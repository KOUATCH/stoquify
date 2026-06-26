import "server-only"

import type {
  BIActionLink,
  BIBlocker,
  BIChangeEvent,
  BICommandBrief,
  BICommandZone,
  BIDailyDigest,
  BIFreshness,
  BIKpiCard,
  BIKpiState,
  BIRedaction,
  BIRiskRank,
  BISeverity,
} from "@/services/bi/bi-contracts"
import {
  evidenceGradeToBITrustState,
  snapshotStatusToBIState,
} from "@/services/bi/bi-contracts"
import { normalizeSnapshotFreshness } from "@/services/bi/bi-evidence-adapter.service"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import type {
  ActionItem,
  BusinessSignal,
  SignalOwnerRole,
} from "@/services/signals/business-signal-contracts"
import { buildBusinessSignalsFromSnapshots } from "@/services/signals/business-signal-rules.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import {
  getTenantOperatingSnapshotFromRelated,
} from "@/services/snapshots/tenant-operating-snapshot.service"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotResult,
  SnapshotSourceModule,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"
import type {
  DailyHabitDigestData,
  DailyHabitDigestSummary,
} from "./daily-habit-digest-contracts"

type DailyHabitDigestInput = {
  organizationId: string
  organizationName?: string | null
  actorPermissions: readonly string[]
  currency?: string | null
  periodStart?: Date | string | null
  periodEnd?: Date | string | null
  now?: Date | string | null
}

type ComposeDailyHabitDigestInput = {
  organizationId: string
  organizationName: string | null
  actorPermissions: readonly string[]
  currency: string
  tenantOperating: SnapshotResult<TenantOperatingMetrics>
  paymentTruth: SnapshotResult<PaymentTruthMetrics>
  inventoryCash: SnapshotResult<InventoryCashMetrics>
  closeReadiness: SnapshotResult<CloseReadinessMetrics>
  now?: Date | string | null
}

type DigestConfig = {
  id: string
  audienceRole: string
  title: string
  summary: string
  moduleSlug: CommercialModuleSlug
  requiredPermission: string
  actionRoles: SignalOwnerRole[]
  primaryMetric: (input: ComposeDailyHabitDigestInput) => {
    title: string
    detail: string
    value: number | string | null
    unit: string
    format: BIKpiCard["format"]
    sourceModules: SnapshotSourceModule[]
    evidenceGrade: EvidenceGrade
    state?: BIKpiState
  }
  route: string
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const DIGEST_CONFIGS: DigestConfig[] = [
  {
    id: "owner-morning",
    audienceRole: "owner",
    title: "Owner morning digest",
    summary: "Cash truth, stock exposure, close pressure, and the highest visible action risks for today.",
    moduleSlug: "dashboard",
    requiredPermission: "dashboard.read",
    actionRoles: ["owner", "finance", "manager", "accountant"],
    route: "/dashboard/owner-war-room",
    primaryMetric: (input) => ({
      title: "Cash collected",
      detail: "Collected cash from tenant operating snapshot.",
      value: input.tenantOperating.metrics.cashCollected,
      unit: input.currency,
      format: "currency",
      sourceModules: ["payments", "sales"],
      evidenceGrade: input.tenantOperating.evidenceGrade,
    }),
  },
  {
    id: "manager-run-sheet",
    audienceRole: "manager",
    title: "Manager run sheet digest",
    summary: "Visible operational actions for today's branch, stock, payment, and receiving work.",
    moduleSlug: "dashboard",
    requiredPermission: "dashboard.read",
    actionRoles: ["manager", "purchasing", "stockkeeper"],
    route: "/dashboard/manager-action-center",
    primaryMetric: (input) => ({
      title: "Pending purchase orders",
      detail: "Purchase orders waiting for receiving, supplier follow-up, or operational review.",
      value: input.tenantOperating.metrics.pendingPurchaseOrderCount,
      unit: "POs",
      format: "number",
      sourceModules: ["purchasing"],
      evidenceGrade: input.tenantOperating.evidenceGrade,
    }),
  },
  {
    id: "finance-cash",
    audienceRole: "finance",
    title: "Finance cash truth digest",
    summary: "Suspense, reconciliation, provider evidence, and cash collection review for the finance desk.",
    moduleSlug: "finance",
    requiredPermission: "finance.read",
    actionRoles: ["finance"],
    route: "/dashboard/finance/cash-command",
    primaryMetric: (input) => ({
      title: "Unresolved suspense",
      detail: "Open payment suspense value from the payment truth snapshot.",
      value: input.paymentTruth.metrics.openSuspenseAmount,
      unit: input.currency,
      format: "currency",
      sourceModules: ["payments", "finance"],
      evidenceGrade: input.paymentTruth.evidenceGrade,
      state: input.paymentTruth.metrics.openSuspenseCount > 0 ? "blocked" : "ready",
    }),
  },
  {
    id: "accountant-close",
    audienceRole: "accountant",
    title: "Accountant close readiness digest",
    summary: "Close score, evidence coverage, open findings, and certification/export readiness.",
    moduleSlug: "close_assurance",
    requiredPermission: "accounting.close.read",
    actionRoles: ["accountant"],
    route: "/dashboard/accounting/close",
    primaryMetric: (input) => ({
      title: "Close readiness",
      detail: "Average readiness score from close readiness snapshot.",
      value: input.closeReadiness.metrics.averageReadinessScore ?? 0,
      unit: "%",
      format: "score",
      sourceModules: ["accounting", "close"],
      evidenceGrade: input.closeReadiness.evidenceGrade,
      state: input.closeReadiness.metrics.criticalOpenFindingCount > 0 ? "blocked" : "ready",
    }),
  },
  {
    id: "stockkeeper-stock",
    audienceRole: "stockkeeper",
    title: "Stockkeeper stock-risk digest",
    summary: "Stock cash exposure, available quantity, negative stock, and stockout signals.",
    moduleSlug: "inventory",
    requiredPermission: "inventory.read",
    actionRoles: ["stockkeeper"],
    route: "/dashboard/inventory",
    primaryMetric: (input) => ({
      title: "Stock cash exposure",
      detail: "Inventory value from the inventory cash snapshot.",
      value: input.inventoryCash.metrics.inventoryValue,
      unit: input.currency,
      format: "currency",
      sourceModules: ["inventory"],
      evidenceGrade: input.inventoryCash.evidenceGrade,
      state: input.inventoryCash.metrics.negativeStockLevelCount > 0 ? "blocked" : "ready",
    }),
  },
  {
    id: "end-of-day",
    audienceRole: "end_of_day",
    title: "End-of-day pulse",
    summary: "A closing pulse across sales, cash collection, source links, and open command actions.",
    moduleSlug: "dashboard",
    requiredPermission: "dashboard.read",
    actionRoles: ["manager", "finance", "stockkeeper", "accountant"],
    route: "/dashboard/manager-action-center",
    primaryMetric: (input) => ({
      title: "Source links",
      detail: "Accounting source-link coverage visible in the tenant operating snapshot.",
      value: input.tenantOperating.metrics.sourceLinkCount,
      unit: "links",
      format: "number",
      sourceModules: ["accounting"],
      evidenceGrade: input.tenantOperating.metrics.sourceLinkCount > 0 ? "posted" : "raw",
      state: input.tenantOperating.metrics.postedJournalEntryCount > 0 && input.tenantOperating.metrics.sourceLinkCount === 0 ? "blocked" : "ready",
    }),
  },
  {
    id: "weekly",
    audienceRole: "weekly",
    title: "Weekly business habit digest",
    summary: "A weekly read-only rollup of sales, inventory cash exposure, payment trust, and close readiness.",
    moduleSlug: "analytics",
    requiredPermission: "analytics.read",
    actionRoles: ["owner", "manager", "finance", "accountant", "stockkeeper"],
    route: "/dashboard/analytics",
    primaryMetric: (input) => ({
      title: "Completed sales",
      detail: "Completed sales revenue from tenant operating snapshot.",
      value: input.tenantOperating.metrics.completedSalesRevenue,
      unit: input.currency,
      format: "currency",
      sourceModules: ["sales", "pos"],
      evidenceGrade: input.tenantOperating.evidenceGrade,
    }),
  },
]

export async function getDailyHabitDigestData(input: DailyHabitDigestInput): Promise<DailyHabitDigestData> {
  const [paymentTruth, inventoryCash, closeReadiness] = await Promise.all([
    getPaymentTruthSnapshot(input),
    getInventoryCashSnapshot(input),
    getCloseReadinessSnapshot(input),
  ])
  const tenantOperating = await getTenantOperatingSnapshotFromRelated(input, {
    paymentTruth,
    inventoryCash,
    closeReadiness,
  })

  return composeDailyHabitDigestData({
    organizationId: input.organizationId,
    organizationName: input.organizationName ?? null,
    actorPermissions: input.actorPermissions,
    currency: input.currency ?? "XAF",
    tenantOperating,
    paymentTruth,
    inventoryCash,
    closeReadiness,
    now: input.now,
  })
}

export function composeDailyHabitDigestData(input: ComposeDailyHabitDigestInput): DailyHabitDigestData {
  const generatedAt = input.tenantOperating.generatedAt
  const signals = buildBusinessSignalsFromSnapshots({
    organizationId: input.organizationId,
    snapshots: [input.tenantOperating, input.paymentTruth, input.inventoryCash, input.closeReadiness],
    now: input.now ?? generatedAt,
  })
  const actionQueue = buildActionQueue({
    organizationId: input.organizationId,
    signals,
    actorPermissions: input.actorPermissions,
    now: input.now ?? generatedAt,
  })
  const digests = DIGEST_CONFIGS.map((config) =>
    buildDigest({
      config,
      input,
      signals: actionQueue.signals,
      actions: actionQueue.actionItems,
    }),
  )
  const summary: DailyHabitDigestSummary = {
    digestCount: digests.length,
    visibleActionCount: actionQueue.actionItems.length,
    filteredOutActionCount: actionQueue.filteredOutCount,
    staleSignalCount: actionQueue.summary.stale,
    redactedSignalCount: actionQueue.summary.redacted,
    blockedDigestCount: digests.filter((digest) => digest.commandBrief.state === "blocked").length,
  }

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    generatedAt,
    periodStart: input.tenantOperating.periodStart,
    periodEnd: input.tenantOperating.periodEnd,
    currency: input.currency,
    digests,
    actionQueue: {
      summary: actionQueue.summary,
      filteredOutCount: actionQueue.filteredOutCount,
    },
    summary,
  }
}

function buildDigest(input: {
  config: DigestConfig
  input: ComposeDailyHabitDigestInput
  signals: BusinessSignal[]
  actions: ActionItem[]
}): BIDailyDigest {
  const metric = input.config.primaryMetric(input.input)
  const roleActions = input.actions
    .filter((action) => input.config.actionRoles.includes(action.assignedRole))
    .sort((a, b) => b.severityScore - a.severityScore)
    .slice(0, 5)
  const roleSignals = input.signals
    .filter((signal) => input.config.actionRoles.includes(signal.assignedRole))
    .sort((a, b) => b.severityScore - a.severityScore)
    .slice(0, 5)
  const freshness = normalizeSnapshotFreshness(input.input.tenantOperating.freshness, input.input.tenantOperating.status)
  const blockers = [
    ...input.input.tenantOperating.blockers,
    ...roleSignals.flatMap((signal) => signal.blockers),
  ].map(toBIBlocker)
  const redactions = roleSignals.flatMap((signal) => signal.redactions).map(toBIRedaction)
  const state = digestState(metric.state ?? snapshotStatusToBIState(input.input.tenantOperating.status, input.input.tenantOperating.uiState), roleActions)
  const evidenceGrade = weakestEvidence([metric.evidenceGrade, input.input.tenantOperating.evidenceGrade])
  const card = kpiCard({
    organizationId: input.input.organizationId,
    moduleSlug: input.config.moduleSlug,
    requiredPermission: input.config.requiredPermission,
    title: metric.title,
    detail: metric.detail,
    value: metric.value,
    unit: metric.unit,
    format: metric.format,
    state,
    evidenceGrade,
    freshness,
    sourceModules: metric.sourceModules,
    href: input.config.route,
  })
  const actionLinks = roleActions.map((item) => actionLinkFromItem(item, input.config.moduleSlug))
  const changes = roleSignals.map((signal, index) => changeFromSignal(signal, index))
  const risks = roleActions.map((item, index) => riskFromAction(item, index, freshness, input.config.moduleSlug))
  const commandBrief = commandBriefForDigest({
    config: input.config,
    input: input.input,
    state,
    evidenceGrade,
    freshness,
    blockers,
    redactions,
    primaryAction: actionLinks[0] ?? {
      id: `${input.config.id}-open`,
      label: "Open surface",
      href: input.config.route,
      requiredPermission: input.config.requiredPermission,
      moduleSlug: input.config.moduleSlug,
      disabled: false,
      disabledReason: null,
    },
    actionCount: roleActions.length,
  })
  const zone = commandZoneForDigest({
    config: input.config,
    input: input.input,
    state,
    evidenceGrade,
    freshness,
    card,
    changes,
    risks,
    actions: actionLinks,
    blockers,
    redactions,
  })

  return {
    id: input.config.id,
    organizationId: input.input.organizationId,
    audienceRole: input.config.audienceRole,
    generatedAt: input.input.tenantOperating.generatedAt,
    periodStart: input.input.tenantOperating.periodStart,
    periodEnd: input.input.tenantOperating.periodEnd,
    freshness,
    commandBrief,
    changes,
    risks,
    actions: actionLinks,
    zones: [zone],
    blockers,
    redactions,
  }
}

function commandBriefForDigest(input: {
  config: DigestConfig
  input: ComposeDailyHabitDigestInput
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  freshness: BIFreshness
  blockers: BIBlocker[]
  redactions: BIRedaction[]
  primaryAction: BIActionLink | null
  actionCount: number
}): BICommandBrief {
  return {
    id: `${input.config.id}-brief`,
    organizationId: input.input.organizationId,
    title: input.config.title,
    summary: input.config.summary,
    conclusion: input.actionCount
      ? `${input.actionCount} visible action(s) need review for this digest.`
      : "No visible action is due for this digest right now.",
    mode: "brief",
    generatedAt: input.input.tenantOperating.generatedAt,
    periodStart: input.input.tenantOperating.periodStart,
    periodEnd: input.input.tenantOperating.periodEnd,
    state: input.state,
    evidenceGrade: input.evidenceGrade,
    trustState: evidenceGradeToBITrustState(input.evidenceGrade),
    freshness: input.freshness,
    provenance: {
      organizationId: input.input.organizationId,
      locationId: input.input.tenantOperating.locationId,
      sourceKind: input.input.tenantOperating.kind,
      sourceId: null,
      sourceHash: input.input.tenantOperating.sourceHash,
      sourceModules: input.input.tenantOperating.sourceModules,
      generatedAt: input.input.tenantOperating.generatedAt,
      periodStart: input.input.tenantOperating.periodStart,
      periodEnd: input.input.tenantOperating.periodEnd,
    },
    sourceModules: input.input.tenantOperating.sourceModules,
    blockers: input.blockers,
    redactions: input.redactions,
    primaryAction: input.primaryAction,
    drillThrough: {
      available: true,
      type: "route",
      label: "Open source surface",
      href: input.config.route,
      requiredPermission: input.config.requiredPermission,
    },
    reviewState: {
      organizationId: input.input.organizationId,
      reviewerId: null,
      reviewerRole: input.config.audienceRole,
      state: input.state === "blocked" ? "blocked" : input.freshness.stale ? "stale" : "not_started",
      reviewedAt: null,
      previousReviewedAt: null,
      nextReviewDueAt: new Date(new Date(input.input.tenantOperating.generatedAt).getTime() + ONE_DAY_MS).toISOString(),
      freshness: input.freshness,
      blockers: input.blockers,
    },
  }
}

function commandZoneForDigest(input: {
  config: DigestConfig
  input: ComposeDailyHabitDigestInput
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  freshness: BIFreshness
  card: BIKpiCard
  changes: BIChangeEvent[]
  risks: BIRiskRank[]
  actions: BIActionLink[]
  blockers: BIBlocker[]
  redactions: BIRedaction[]
}): BICommandZone {
  return {
    id: `${input.config.id}-zone`,
    organizationId: input.input.organizationId,
    moduleSlug: input.config.moduleSlug,
    title: input.config.title,
    businessQuestion: "What should this role review today?",
    summary: input.config.summary,
    state: input.state,
    evidenceGrade: input.evidenceGrade,
    trustState: evidenceGradeToBITrustState(input.evidenceGrade),
    freshness: input.freshness,
    sourceModules: input.card.provenance.sourceModules,
    primaryMetric: input.card,
    sections: [],
    cards: [input.card],
    insights: [],
    risks: input.risks,
    flowSteps: [],
    actions: input.actions,
    blockers: input.blockers,
    redactions: input.redactions,
    drillThrough: input.card.drillThrough,
  }
}

function kpiCard(input: {
  organizationId: string
  moduleSlug: CommercialModuleSlug
  requiredPermission: string
  title: string
  detail: string
  value: number | string | null
  unit: string
  format: BIKpiCard["format"]
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  freshness: BIFreshness
  sourceModules: SnapshotSourceModule[]
  href: string
}): BIKpiCard {
  return {
    id: `${input.moduleSlug}-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    organizationId: input.organizationId,
    moduleSlug: input.moduleSlug,
    requiredPermission: input.requiredPermission,
    title: input.title,
    detail: input.detail,
    value: input.value,
    unit: input.unit,
    format: input.format,
    state: input.state,
    evidenceGrade: input.evidenceGrade,
    trustState: evidenceGradeToBITrustState(input.evidenceGrade),
    freshness: input.freshness,
    provenance: {
      organizationId: input.organizationId,
      locationId: null,
      sourceHash: null,
      sourceModules: input.sourceModules,
      generatedAt: input.freshness.generatedAt,
    },
    blockers: [],
    redactions: [],
    drillThrough: {
      available: true,
      type: "route",
      label: "Open source surface",
      href: input.href,
      requiredPermission: input.requiredPermission,
    },
    actionLink: null,
  }
}

function actionLinkFromItem(item: ActionItem, moduleSlug: CommercialModuleSlug): BIActionLink {
  return {
    id: item.id,
    label: item.nextStep,
    href: item.actionPath,
    requiredPermission: item.requiredPermission,
    moduleSlug,
    disabled: false,
    disabledReason: null,
  }
}

function changeFromSignal(signal: BusinessSignal, index: number): BIChangeEvent {
  const freshness = freshnessFromSignal(signal)
  return {
    id: `${signal.id}-change`,
    organizationId: signal.organizationId,
    moduleSlug: signal.moduleSlug,
    requiredPermission: signal.requiredPermission,
    title: signal.title,
    detail: signal.detail,
    businessImpact: signal.businessImpact,
    direction: index === 0 ? "new" : "changed",
    severity: normalizeSeverity(signal.severity),
    state: signal.status === "active" ? "ready" : signal.status === "stale" ? "stale" : "partial",
    evidenceGrade: signal.evidenceGrade,
    trustState: evidenceGradeToBITrustState(signal.evidenceGrade),
    freshness,
    sourceModules: [signal.sourceModule],
    changedAt: signal.generatedAt,
    previousValue: null,
    currentValue: signal.severityScore,
    unit: "risk",
    format: "score",
    provenance: {
      organizationId: signal.organizationId,
      locationId: null,
      sourceKind: signal.sourceSnapshotKind ?? signal.signalType,
      sourceId: signal.id,
      sourceHash: signal.sourceHash ?? null,
      sourceModules: [signal.sourceModule],
      generatedAt: signal.generatedAt,
    },
    blockers: signal.blockers.map(toBIBlocker),
    redactions: signal.redactions.map(toBIRedaction),
    drillThrough: {
      available: true,
      type: "route",
      label: "Open action",
      href: signal.actionPath,
      requiredPermission: signal.requiredPermission,
    },
    actionLink: {
      id: `${signal.id}-action`,
      label: signal.suggestedAction,
      href: signal.actionPath,
      requiredPermission: signal.requiredPermission,
      moduleSlug: signal.moduleSlug,
      disabled: false,
      disabledReason: null,
    },
  }
}

function riskFromAction(
  item: ActionItem,
  index: number,
  freshness: BIFreshness,
  moduleSlug: CommercialModuleSlug,
): BIRiskRank {
  const severity = normalizeSeverity(item.severity)
  return {
    id: `${item.id}-risk`,
    organizationId: item.organizationId,
    moduleSlug,
    rank: index + 1,
    title: item.title,
    detail: item.nextStep,
    businessImpact: "This action is visible in the daily digest because an existing business signal marked it as review-worthy.",
    severity,
    severityScore: item.severityScore,
    moneyImpact: null,
    urgency: severity === "critical" ? "now" : severity === "high" ? "today" : "soon",
    state: item.status === "expired" ? "stale" : "ready",
    evidenceGrade: item.evidenceGrade,
    trustState: evidenceGradeToBITrustState(item.evidenceGrade),
    freshness,
    sourceModules: ["dashboard"],
    blockers: item.blockers.map(toBIBlocker),
    redactions: item.redactions.map(toBIRedaction),
    drillThrough: {
      available: true,
      type: "route",
      label: item.nextStep,
      href: item.actionPath,
      requiredPermission: item.requiredPermission,
    },
    actionLink: actionLinkFromItem(item, moduleSlug),
  }
}

function digestState(baseState: BIKpiState, actions: ActionItem[]): BIKpiState {
  if (actions.some((item) => item.severity === "critical" || item.status === "expired")) return "blocked"
  if (actions.some((item) => item.severity === "high")) return "partial"
  return baseState
}

function freshnessFromSignal(signal: BusinessSignal): BIFreshness {
  return {
    state: signal.status === "expired" ? "stale" : signal.freshness.stale ? "stale" : "fresh",
    generatedAt: signal.freshness.generatedAt,
    sourceMaxUpdatedAt: signal.freshness.sourceMaxUpdatedAt,
    maxAgeMinutes: signal.freshness.maxAgeMinutes,
    stale: signal.status === "expired" || signal.freshness.stale,
    staleReason: signal.status === "expired" ? "Signal is expired." : signal.freshness.staleReason,
  }
}

function toBIBlocker(blocker: SnapshotResult<TenantOperatingMetrics>["blockers"][number]): BIBlocker {
  return {
    id: blocker.id,
    severity: blocker.severity,
    gate: blocker.gate,
    title: blocker.title,
    detail: blocker.detail,
    sourceTables: blocker.sourceTables,
    nextAction: blocker.nextAction,
  }
}

function toBIRedaction(redaction: SnapshotResult<TenantOperatingMetrics>["redactions"][number]): BIRedaction {
  return {
    id: redaction.id,
    field: redaction.field,
    reason: redaction.reason,
    policy: redaction.policy,
  }
}

function normalizeSeverity(severity: ActionItem["severity"]): BISeverity {
  return severity === "info" ? "info" : severity
}

function weakestEvidence(grades: EvidenceGrade[]): EvidenceGrade {
  if (grades.includes("blocked")) return "blocked"
  if (grades.includes("raw")) return "raw"
  if (grades.includes("operational")) return "operational"
  if (grades.includes("posted")) return "posted"
  if (grades.includes("reconciled")) return "reconciled"
  return "certified"
}
