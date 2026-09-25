import "server-only"
import { restrictCloseSnapshotDetails, restrictInventorySnapshotDetails, restrictPaymentSnapshotDetails, restrictPayrollSnapshotDetails } from "./daily-habit-source-visibility"
import { presentDailyDigest } from "./daily-habit-digest-presentation"
import { presentDailyAction, presentDailySignal } from "./daily-habit-signal-presentation"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { NotFoundError } from "@/services/_shared/action-errors"

import type {
  BIActionLink,
  BIBlocker,
  BIChangeEvent,
  BICommandBrief,
  BICommandZone,
  BIDailyDigest,
  BIDrillThrough,
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
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { resolveTenantWideOperatingAuthority } from "@/services/operating-access/operating-access-scope-contracts"
import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import type {
  ActionItem,
  BusinessSignal,
  SignalOwnerRole,
} from "@/services/signals/business-signal-contracts"
import { buildBusinessSignalsFromSnapshots } from "@/services/signals/business-signal-rules.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getInventoryLossSnapshot } from "@/services/snapshots/inventory-loss-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import { normalizeSnapshotScope } from "@/services/snapshots/snapshot-utils"
import {
  getTenantOperatingSnapshotFromRelated,
} from "@/services/snapshots/tenant-operating-snapshot.service"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  InventoryLossMetrics,
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
  operatingAccessContext?: OperatingAccessContext
  locale?: "en" | "fr"
  organizationId: string
  actorId?: string | null
  actorPermissions: readonly string[]
  actorRoleCodes: readonly string[]
  isSuperUser?: boolean
  periodStart?: Date | string | null
  periodEnd?: Date | string | null
  now?: Date | string | null
}

type ComposeDailyHabitDigestInput = {
  operatingHandoffs?: { owner: boolean; manager: boolean }
  locale?: "en" | "fr"
  organizationId: string
  organizationName: string | null
  payrollModuleAccess?: boolean
  financeModuleAccess?: boolean
  reconciliationModuleAccess?: boolean
  closeModuleAccess?: boolean
  inventoryModuleAccess?: boolean
  purchasingModuleAccess?: boolean
  dashboardModuleAccess?: boolean
  analyticsModuleAccess?: boolean
  actorPermissions: readonly string[]
  actorRoleCodes: readonly string[]
  currency: string
  timezone?: string
  tenantOperating: SnapshotResult<TenantOperatingMetrics>
  paymentTruth: SnapshotResult<PaymentTruthMetrics>
  inventoryCash: SnapshotResult<InventoryCashMetrics>
  inventoryLoss?: SnapshotResult<InventoryLossMetrics> | null
  closeReadiness: SnapshotResult<CloseReadinessMetrics>
  weeklySources?: DigestSources
  now?: Date | string | null
}

type DigestSources = Pick<ComposeDailyHabitDigestInput, "tenantOperating" | "paymentTruth" | "inventoryCash" | "inventoryLoss" | "closeReadiness">

type DigestConfig = {
  id: string
  audienceRole: string
  title: string
  summary: string
  moduleSlug: CommercialModuleSlug
  requiredPermission: string
  audienceRoleCodes?: readonly string[]
  actionRoles: SignalOwnerRole[]
  primaryMetric: (input: ComposeDailyHabitDigestInput) => {
    source: SnapshotResult<unknown>
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
  routePermission?: string
  routeAnyPermissions?: readonly string[]
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
    audienceRoleCodes: ["owner", "admin", "administrator", "org_admin", "super_admin"],
    actionRoles: ["owner", "finance", "manager", "accountant", "payroll"],
    route: "/dashboard/owner-war-room",
    primaryMetric: (input) => ({
      title: "Cash collected",
      source: input.tenantOperating,
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
    audienceRoleCodes: ["manager"],
    actionRoles: ["manager", "purchasing", "stockkeeper"],
    route: "/dashboard/manager-action-center",
    primaryMetric: (input) => ({
      title: "Pending purchase orders",
      source: input.tenantOperating,
      detail: "Purchase orders waiting for receiving, supplier follow-up, or operational review.",
      value: input.purchasingModuleAccess === true ? input.tenantOperating.metrics.pendingPurchaseOrderCount : null,
      state: input.purchasingModuleAccess === true ? undefined : "module_unavailable",
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
    actionRoles: ["finance", "payroll"],
    route: "/dashboard/finance/cash-command",
    primaryMetric: (input) => ({
      title: "Unresolved suspense",
      source: input.paymentTruth,
      detail: "Open payment suspense value from the payment truth snapshot.",
      value: input.paymentTruth.metrics.openSuspenseAmount,
      unit: input.currency,
      format: "currency",
      sourceModules: ["payments", "finance"],
      evidenceGrade: input.paymentTruth.evidenceGrade,
      state: input.paymentTruth.metrics.openSuspenseCount > 0 ? "blocked" : undefined,
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
      source: input.closeReadiness,
      detail: "Average readiness score from close readiness snapshot.",
      value: input.closeReadiness.metrics.averageReadinessScore,
      unit: "%",
      format: "score",
      sourceModules: ["accounting", "close"],
      evidenceGrade: input.closeReadiness.evidenceGrade,
      state: input.closeReadiness.metrics.criticalOpenFindingCount > 0 ? "blocked" : undefined,
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
    route: "/dashboard/inventory/items",
    routePermission: "inventory.items.read",
    primaryMetric: (input) => ({
      title: "Stock cash exposure",
      source: input.inventoryCash,
      detail: "Inventory value from the inventory cash snapshot.",
      value: input.inventoryCash.metrics.inventoryValue,
      unit: input.currency,
      format: "currency",
      sourceModules: ["inventory"],
      evidenceGrade: input.inventoryCash.evidenceGrade,
      state: input.inventoryCash.metrics.negativeStockLevelCount > 0 ? "blocked" : undefined,
    }),
  },
  {
    id: "end-of-day",
    audienceRole: "end_of_day",
    title: "End-of-day pulse",
    summary: "A closing pulse across sales, cash collection, source links, and open command actions.",
    moduleSlug: "dashboard",
    requiredPermission: "dashboard.read",
    audienceRoleCodes: ["owner", "admin", "administrator", "org_admin", "super_admin", "manager", "cashier", "pos_operator"],
    actionRoles: ["manager", "finance", "stockkeeper", "accountant"],
    route: "/dashboard/manager-action-center",
    primaryMetric: (input) => ({
      title: "Source links",
      source: input.tenantOperating,
      detail: "Accounting source-link coverage visible in the tenant operating snapshot.",
      value: input.tenantOperating.metrics.sourceLinkCount,
      unit: "links",
      format: "number",
      sourceModules: ["accounting"],
      evidenceGrade: input.tenantOperating.metrics.sourceLinkCount > 0 ? "posted" : "raw",
      state: input.tenantOperating.metrics.postedJournalEntryCount > 0 && input.tenantOperating.metrics.sourceLinkCount === 0 ? "blocked" : undefined,
    }),
  },
  {
    id: "weekly",
    audienceRole: "weekly",
    title: "Weekly business habit digest",
    summary: "Sales over seven UTC days ending on the report date, alongside current inventory balances, payment obligations and close readiness. Current balances are not seven-day totals.",
    moduleSlug: "analytics",
    requiredPermission: "analytics.read",
    actionRoles: ["owner", "manager", "finance", "accountant", "stockkeeper"],
    route: "/dashboard/analytics",
    routePermission: "reports.read",
    routeAnyPermissions: ["reports.read", "dashboard.read"],
    primaryMetric: (input) => ({
      title: "Completed sales",
      source: input.tenantOperating,
      detail: "Completed sales revenue over the displayed seven-day UTC period, including the report date.",
      value: input.tenantOperating.metrics.completedSalesRevenue,
      unit: input.currency,
      format: "currency",
      sourceModules: ["sales", "pos"],
      evidenceGrade: input.tenantOperating.evidenceGrade,
    }),
  },
]

export async function getDailyHabitDigestData(input: DailyHabitDigestInput): Promise<DailyHabitDigestData> {
  // All sources must use the same day and freshness clock, even across midnight.
  input = { ...input, now: input.now ?? new Date() }
  const inventoryAccess = loadDailyHabitModuleRead(input, "inventory", ["inventory.read", "inventory.items.read", "inventory.levels.read"])
  const [organization, paymentTruth, inventoryCash, closeReadiness, inventoryLoss, payrollModuleAccess, financeModuleAccess, reconciliationModuleAccess, closeModuleAccess, inventoryModuleAccess, purchasingModuleAccess, dashboardModuleAccess, analyticsModuleAccess] = await Promise.all([
    db.organization.findFirst({
      where: { id: input.organizationId, isActive: true, deletedAt: null },
      select: { name: true, currency: true, timezone: true },
    }),
    getPaymentTruthSnapshot(input),
    getInventoryCashSnapshot(input),
    getCloseReadinessSnapshot(input),
    loadDailyHabitInventoryLoss(input, inventoryAccess),
    loadDailyHabitPayrollAccess(input),
    loadDailyHabitModuleRead(input, "finance", "finance.read"),
    loadDailyHabitModuleRead(input, "payment_reconciliation", "payments.reconciliation.read"),
    loadDailyHabitModuleRead(input, "close_assurance", "accounting.close.read"),
    inventoryAccess,
    loadDailyHabitModuleRead(input, "purchasing", input.actorRoleCodes.some(role => normalizeRoleCode(role) === "manager") ? ["dashboard.read", "purchases.orders.read"] : "purchases.orders.read"),
    loadDailyHabitModuleRead(input, "dashboard", "dashboard.read"),
    loadDailyHabitModuleRead(input, "analytics", "analytics.read"),
  ])
  if (!organization) throw new NotFoundError("Organization not found")

  const operatingHandoffs = await loadOperatingHandoffs(input, dashboardModuleAccess)

  const tenantOperating = await getTenantOperatingSnapshotFromRelated(input, {
    paymentTruth,
    inventoryCash,
    closeReadiness,
  })

  let weeklySources: DigestSources | undefined
  if (analyticsModuleAccess && hasRbacPermission(input.actorPermissions, "analytics.read")) {
    const scope = normalizeSnapshotScope(input)
    // A rolling seven-day report ending on the requested end date. Daily/custom
    // ranges remain unchanged; balances retain their source's current-state meaning.
    const weeklyInput = { ...input, periodStart: new Date(scope.periodEnd.getTime() + 1 - 7 * ONE_DAY_MS), periodEnd: scope.periodEnd }
    const [weeklyPayment, weeklyInventory, weeklyClose, weeklyLoss] = await Promise.all([
      getPaymentTruthSnapshot(weeklyInput), getInventoryCashSnapshot(weeklyInput),
      getCloseReadinessSnapshot(weeklyInput), loadDailyHabitInventoryLoss(weeklyInput, Promise.resolve(inventoryModuleAccess)),
    ])
    const related = { paymentTruth: weeklyPayment, inventoryCash: weeklyInventory, closeReadiness: weeklyClose }
    weeklySources = { ...related, inventoryLoss: weeklyLoss, tenantOperating: await getTenantOperatingSnapshotFromRelated(weeklyInput, related) }
  }

  return composeDailyHabitDigestData({
    operatingHandoffs,
    locale: input.locale,
    organizationId: input.organizationId,
    organizationName: organization.name,
    payrollModuleAccess,
    financeModuleAccess,
    reconciliationModuleAccess,
    closeModuleAccess,
    inventoryModuleAccess,
    purchasingModuleAccess,
    dashboardModuleAccess,
    analyticsModuleAccess,
    actorPermissions: input.actorPermissions,
    actorRoleCodes: input.actorRoleCodes,
    currency: organization.currency.trim().toUpperCase(),
    timezone: organization.timezone ?? "UTC",
    tenantOperating,
    paymentTruth,
    inventoryCash,
    inventoryLoss,
    closeReadiness,
    weeklySources,
    now: input.now,
  })
}

async function loadOperatingHandoffs(input: DailyHabitDigestInput, dashboardModuleAccess: boolean) {
  const denied = { owner: false, manager: false }
  const context = input.operatingAccessContext
  if (!dashboardModuleAccess || !context || !input.actorId || !hasRbacPermission(input.actorPermissions, "dashboard.read")) return denied
  if (context.orgId !== input.organizationId || context.userId !== input.actorId) {
    throw new Error("Digest operating access context is inconsistent")
  }
  const access = await resolveOperatingAccessScope(context)
  if (access.organizationId !== input.organizationId || access.actorId !== input.actorId) {
    throw new Error("Digest operating scope evidence is inconsistent")
  }
  return {
    owner: access.allowed && access.scope.kind === "TENANT" && access.authority.kind === "TENANT_WIDE",
    manager: access.allowed,
  }
}

export function composeDailyHabitDigestData(input: ComposeDailyHabitDigestInput): DailyHabitDigestData {
  const visibleConfigs = DIGEST_CONFIGS.filter((config) => isDigestVisible(config, input))
  const daily = prepareDigestSources(input)
  let weekly: ReturnType<typeof prepareDigestSources> | undefined
  if (visibleConfigs.some(config => config.id === "weekly")) {
    const sources = input.weeklySources
    if (!sources) throw new Error("Weekly Digest sources are unavailable")
    const end = input.tenantOperating.periodEnd
    const start = new Date(Date.parse(end) + 1 - 7 * ONE_DAY_MS).toISOString()
    const snapshots = [sources.tenantOperating, sources.paymentTruth, sources.inventoryCash, sources.closeReadiness, ...(sources.inventoryLoss ? [sources.inventoryLoss] : [])]
    if (snapshots.some(source => source.periodStart !== start || source.periodEnd !== end || source.generatedAt !== input.tenantOperating.generatedAt)) {
      throw new Error("Weekly Digest source period does not match the reporting window")
    }
    weekly = prepareDigestSources({ ...input, ...sources })
  }
  const generatedAt = input.tenantOperating.generatedAt
  // Summary counts represent distinct source actions across both windows.
  const signals = [...new Map([...daily.signals, ...(weekly?.signals ?? [])].map(signal => [signal.dedupeKey, signal])).values()]
  const actionQueue = buildActionQueue({ organizationId: input.organizationId, signals, actorPermissions: input.actorPermissions, now: input.now ?? generatedAt })
  const digests = visibleConfigs.map(config => {
    const prepared = config.id === "weekly" ? weekly! : daily
    return buildDigest({ config, input: prepared.input, signals: prepared.queue.signals, actions: prepared.queue.actionItems })
  })
  const summary: DailyHabitDigestSummary = {
    digestCount: digests.length,
    visibleActionCount: actionQueue.actionItems.length,
    filteredOutActionCount: actionQueue.filteredOutCount,
    staleSignalCount: actionQueue.summary.stale + actionQueue.summary.expired,
    redactedSignalCount: actionQueue.summary.redacted,
    blockedDigestCount: digests.filter((digest) => digest.commandBrief.state === "blocked").length,
    hiddenDigestCount: DIGEST_CONFIGS.length - visibleConfigs.length,
  }

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    generatedAt,
    periodStart: input.tenantOperating.periodStart,
    periodEnd: input.tenantOperating.periodEnd,
    currency: input.currency,
    timezone: input.timezone ?? "UTC",
    digests: digests.map(digest => presentDailyDigest(digest, input.locale ?? "en")),
    actionQueue: { summary: actionQueue.summary, filteredOutCount: actionQueue.filteredOutCount },
    summary,
  }
}

function prepareDigestSources(input: ComposeDailyHabitDigestInput) {
  // Composition must never relabel another tenant's evidence as the caller's data.
  const snapshots = [input.tenantOperating, input.paymentTruth, input.inventoryCash, input.closeReadiness, ...(input.inventoryLoss ? [input.inventoryLoss] : [])]
  if (snapshots.some((snapshot) => snapshot.organizationId !== input.organizationId)) {
    throw new Error("Digest source scope does not match the organization")
  }
  const payrollDetailsAllowed = input.payrollModuleAccess === true && hasRbacPermission(input.actorPermissions, "payroll.command.read")
  const reconciliationAllowed = input.reconciliationModuleAccess === true && hasRbacPermission(input.actorPermissions, "payments.reconciliation.read")
  const paymentDetailsAllowed = reconciliationAllowed || (input.financeModuleAccess === true && hasRbacPermission(input.actorPermissions, "finance.read"))
  const closeDetailsAllowed = input.closeModuleAccess === true && hasRbacPermission(input.actorPermissions, "accounting.close.read")
  const inventoryDetailsAllowed = input.inventoryModuleAccess === true && ["inventory.read", "inventory.items.read", "inventory.levels.read"].some(permission => hasRbacPermission(input.actorPermissions, permission))
  // Related snapshots still contribute to source limitations. Restrict their
  // details before composing any owner, finance, weekly or agent-facing output.
  const scoped = <T,>(source: SnapshotResult<T>) => {
    const locale = input.locale ?? "en"
    const payroll = restrictPayrollSnapshotDetails(source, payrollDetailsAllowed, locale)
    const payment = restrictPaymentSnapshotDetails(payroll, paymentDetailsAllowed, locale)
    const close = restrictCloseSnapshotDetails(payment, closeDetailsAllowed, locale)
    return restrictInventorySnapshotDetails(close, inventoryDetailsAllowed, locale)
  }
  input = { ...input, tenantOperating: scoped(input.tenantOperating), paymentTruth: scoped(input.paymentTruth), inventoryCash: scoped(input.inventoryCash), closeReadiness: scoped(input.closeReadiness), inventoryLoss: input.inventoryLoss ? scoped(input.inventoryLoss) : input.inventoryLoss }
  const generatedAt = input.tenantOperating.generatedAt
  const signals = buildBusinessSignalsFromSnapshots({
    organizationId: input.organizationId,
    snapshots: [
      input.tenantOperating,
      input.paymentTruth,
      input.inventoryCash,
      input.closeReadiness,
      ...(input.inventoryLoss ? [input.inventoryLoss] : []),
    ],
    now: input.now ?? generatedAt,
  }).filter(signal => (signal.sourceModule !== "payroll" || payrollDetailsAllowed)
    && (signal.moduleSlug !== "payment_reconciliation" || reconciliationAllowed)
    && (signal.moduleSlug !== "close_assurance" || closeDetailsAllowed)
    && (signal.moduleSlug !== "purchasing" || input.purchasingModuleAccess === true)
    && (signal.moduleSlug !== "inventory" || inventoryDetailsAllowed))
  const queue = buildActionQueue({
    organizationId: input.organizationId,
    signals,
    actorPermissions: input.actorPermissions,
    now: input.now ?? generatedAt,
  })
  return { input, signals, queue }
}

async function loadDailyHabitPayrollAccess(input: DailyHabitDigestInput): Promise<boolean> {
  return loadDailyHabitModuleRead(input, "payroll", "payroll.command.read")
}

async function loadDailyHabitModuleRead(input: DailyHabitDigestInput, moduleSlug: CommercialModuleSlug, permission: string | readonly string[]): Promise<boolean> {
  const actorId = input.actorId?.trim()
  const permissions = typeof permission === "string" ? [permission] : permission
  if (!actorId || !permissions.some(value => hasRbacPermission(input.actorPermissions, value))) return false
  const access = await observeModuleAccess({
    organizationId: input.organizationId, userId: actorId, actorPermissions: input.actorPermissions,
    moduleSlug, surfaceType: "report", surface: `daily-habit-digest.${moduleSlug}-source`,
    accessIntent: "read", mode: "enforce", audit: true, now: input.now ?? null,
  })
  return access.allowed
}

async function loadDailyHabitInventoryLoss(
  input: DailyHabitDigestInput,
  moduleAccess: Promise<boolean>,
): Promise<SnapshotResult<InventoryLossMetrics> | null> {
  const actorId = input.actorId?.trim()
  if (!actorId) return null
  if (!hasRbacPermission(input.actorPermissions, "dashboard.read")) return null
  if (!hasRbacPermission(input.actorPermissions, "inventory.levels.read")) return null

  const authority = resolveTenantWideOperatingAuthority({
    isSuperUser: input.isSuperUser === true,
    roleCodes: input.actorRoleCodes,
  })
  if (!authority) return null

  if (!await moduleAccess) return null

  return getInventoryLossSnapshot({
    organizationId: input.organizationId,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    now: input.now ?? null,
  })
}

function isDigestVisible(config: DigestConfig, input: ComposeDailyHabitDigestInput) {
  if (!hasRbacPermission(input.actorPermissions, config.requiredPermission)) return false
  if (config.moduleSlug === "dashboard" && input.dashboardModuleAccess !== true) return false
  if (config.moduleSlug === "analytics" && input.analyticsModuleAccess !== true) return false
  if (config.moduleSlug === "finance" && input.financeModuleAccess !== true) return false
  if (config.moduleSlug === "close_assurance" && input.closeModuleAccess !== true) return false
  if (config.moduleSlug === "inventory" && input.inventoryModuleAccess !== true) return false
  if (!config.audienceRoleCodes?.length) return true

  const actorRoles = new Set(input.actorRoleCodes.map(normalizeRoleCode))
  return config.audienceRoleCodes.some((roleCode) => actorRoles.has(normalizeRoleCode(roleCode)))
}

function normalizeRoleCode(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}
function buildDigest(input: {
  config: DigestConfig
  input: ComposeDailyHabitDigestInput
  signals: BusinessSignal[]
  actions: ActionItem[]
}): BIDailyDigest {
  const metric = input.config.primaryMetric(input.input)
  const sourceDrill = digestSourceDrill(input.config, input.input)
  const roleActions = input.actions
    .filter((action) => input.config.actionRoles.includes(action.assignedRole))
    .sort((a, b) => b.severityScore - a.severityScore)
    .slice(0, 5)
    .map((action) => presentDailyAction(action, input.input.locale ?? "en"))
  const roleSignals = input.signals
    .filter((signal) => input.config.actionRoles.includes(signal.assignedRole))
    .sort((a, b) => b.severityScore - a.severityScore)
    .slice(0, 5)
    .map((signal) => presentDailySignal(signal, input.input.locale ?? "en"))
  const freshness = normalizeSnapshotFreshness(input.input.tenantOperating.freshness, input.input.tenantOperating.status)
  const blockers = [
    ...input.input.tenantOperating.blockers,
    ...roleSignals.flatMap((signal) => signal.blockers),
  ].map(toBIBlocker)
  const redactions = roleSignals.flatMap((signal) => signal.redactions).map(toBIRedaction)
  const metricState = leastAvailableState([
    snapshotStatusToBIState(metric.source.status, metric.source.uiState),
    metric.state ?? "ready",
    metric.source.freshness.stale ? "stale" : "ready",
    metric.value === null ? "empty" : "ready",
  ])
  const metricFreshness = normalizeSnapshotFreshness(metric.source.freshness, metric.source.status)
  if (metricFreshness.stale && metricFreshness.state === "fresh") metricFreshness.state = "stale"
  const state = digestState(leastAvailableState([metricState, snapshotStatusToBIState(input.input.tenantOperating.status, input.input.tenantOperating.uiState)]), roleActions)
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
    state: metricState,
    evidenceGrade: metric.evidenceGrade,
    freshness: metricFreshness,
    source: metric.source,
    sourceModules: metric.sourceModules,
    href: input.config.route,
  })
  card.drillThrough = sourceDrill
  const changes = roleSignals.map(changeFromSignal)
  const risks = roleActions.map((item, index) => {
    const signal = input.signals.find((source) => source.id === item.signalId)
    if (!signal) throw new Error("Digest action source is unavailable")
    return riskFromAction(item, index, presentDailySignal(signal, input.input.locale ?? "en"))
  })
  // The destination owns each action's module contract, regardless of the hosting workspace.
  const actionLinks = risks.map((risk) => risk.actionLink!)
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
      requiredPermission: sourceDrill.requiredPermission,
      moduleSlug: input.config.moduleSlug,
      disabled: !sourceDrill.available,
      disabledReason: sourceDrill.available ? null : sourceDrill.unavailableReason,
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
    drillThrough: digestSourceDrill(input.config, input.input),
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

function digestSourceDrill(config: DigestConfig, input: ComposeDailyHabitDigestInput): BIDrillThrough {
  const requiredPermission = config.routeAnyPermissions?.find(permission => hasRbacPermission(input.actorPermissions, permission)) ?? config.routePermission ?? config.requiredPermission
  const common = { type: "route" as const, label: "Open source surface", requiredPermission }
  const operatingDestination = config.id === "owner-morning" ? "owner" : config.id === "manager-run-sheet" || config.id === "end-of-day" ? "manager" : null
  if (operatingDestination && input.operatingHandoffs?.[operatingDestination] !== true) {
    return { ...common, available: false, unavailableReason: operatingDestination === "owner"
      ? (input.locale === "fr" ? "Vous pouvez consulter ce digest. L’espace Dirigeant nécessite une autorité opérationnelle sur toute l’organisation." : "You can view this digest. The Owner workspace requires organization-wide operating authority.")
      : (input.locale === "fr" ? "Vous pouvez consulter ce digest. L’espace Responsable nécessite une autorité sur l’organisation ou une affectation active à un site géré." : "You can view this digest. The Manager workspace requires organization-wide authority or an active managed-location assignment.") }
  }
  return hasRbacPermission(input.actorPermissions, requiredPermission)
    ? { ...common, available: true, href: config.route }
    : { ...common, available: false, unavailableReason: config.id === "weekly"
        ? (input.locale === "fr" ? "Votre rôle peut consulter ce digest. L’espace d’analyse nécessite un accès aux rapports ou au tableau de bord." : "Your role can view this digest. The analytics workspace requires report or dashboard access.")
        : input.locale === "fr"
        ? "Votre rôle peut consulter cette synthèse, mais l’accès aux détails des articles nécessite une autorisation supplémentaire."
        : "Your role can view this summary, but opening item details requires additional permission." }
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
  source: SnapshotResult<unknown>
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
      locationId: input.source.locationId,
      sourceKind: input.source.kind,
      sourceHash: input.source.sourceHash,
      periodStart: input.source.periodStart,
      periodEnd: input.source.periodEnd,
      sourceModules: input.sourceModules,
      generatedAt: input.freshness.generatedAt,
    },
    blockers: input.source.blockers.map(toBIBlocker),
    redactions: input.source.redactions.map(toBIRedaction),
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
    ...(item.additionalRequiredPermissions ? { additionalRequiredPermissions: item.additionalRequiredPermissions } : {}),
    moduleSlug,
    disabled: false,
    disabledReason: null,
  }
}

function changeFromSignal(signal: BusinessSignal): BIChangeEvent {
  const freshness = freshnessFromSignal(signal)
  return {
    id: `${signal.id}-change`,
    organizationId: signal.organizationId,
    moduleSlug: signal.moduleSlug,
    requiredPermission: signal.requiredPermission,
    ...(signal.additionalRequiredPermissions ? { additionalRequiredPermissions: signal.additionalRequiredPermissions } : {}),
    title: signal.title,
    detail: signal.detail,
    businessImpact: signal.businessImpact,
    direction: "observed",
    severity: normalizeSeverity(signal.severity),
    state: signal.status === "active" ? "ready" : signal.status === "stale" || signal.status === "expired" ? "stale" : "partial",
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
    ...(signal.additionalRequiredPermissions ? { additionalRequiredPermissions: signal.additionalRequiredPermissions } : {}),
    },
    actionLink: {
      id: `${signal.id}-action`,
      label: signal.suggestedAction,
      href: signal.actionPath,
      requiredPermission: signal.requiredPermission,
    ...(signal.additionalRequiredPermissions ? { additionalRequiredPermissions: signal.additionalRequiredPermissions } : {}),
      moduleSlug: signal.moduleSlug,
      disabled: false,
      disabledReason: null,
    },
  }
}

function riskFromAction(
  item: ActionItem,
  index: number,
  signal: BusinessSignal,
): BIRiskRank {
  const severity = normalizeSeverity(item.severity)
  const freshness = freshnessFromSignal(signal)
  return {
    id: `${item.id}-risk`,
    organizationId: item.organizationId,
    moduleSlug: signal.moduleSlug,
    rank: index + 1,
    title: item.title,
    detail: item.nextStep,
    businessImpact: signal.businessImpact,
    severity,
    severityScore: item.severityScore,
    moneyImpact: null,
    // Signal severity and expiry do not establish an assessed business urgency.
    urgency: null,
    state: freshness.stale ? "stale" : signal.status === "active" ? "ready" : "partial",
    evidenceGrade: item.evidenceGrade,
    trustState: evidenceGradeToBITrustState(item.evidenceGrade),
    freshness,
    sourceModules: [signal.sourceModule],
    blockers: item.blockers.map(toBIBlocker),
    redactions: item.redactions.map(toBIRedaction),
    drillThrough: {
      available: true,
      type: "route",
      label: item.nextStep,
      href: item.actionPath,
      requiredPermission: item.requiredPermission,
    ...(item.additionalRequiredPermissions ? { additionalRequiredPermissions: item.additionalRequiredPermissions } : {}),
    },
    actionLink: actionLinkFromItem(item, signal.moduleSlug),
  }
}

function digestState(baseState: BIKpiState, actions: ActionItem[]): BIKpiState {
  const actionState = actions.some((item) => item.severity === "critical") ? "blocked"
    : actions.some((item) => item.status === "expired") ? "stale"
      : actions.some((item) => item.severity === "high") ? "partial" : "ready"
  return leastAvailableState([baseState, actionState])
}

// Access/failure states must not be replaced by a business-risk or ready classification.
function leastAvailableState(states: BIKpiState[]): BIKpiState {
  const precedence: BIKpiState[] = ["permission_denied", "module_unavailable", "redacted", "safe_error", "loading", "blocked", "stale", "partial", "empty", "ready"]
  return precedence.find(state => states.includes(state)) ?? "ready"
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
