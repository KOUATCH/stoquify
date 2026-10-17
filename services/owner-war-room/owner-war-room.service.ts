import "server-only"

import {
  evidenceGradeToBITrustState,
  snapshotStatusToFreshnessState,
} from "@/services/bi/bi-contracts"
import type {
  BIActionLink,
  BIDrillThrough,
  BIChangeEvent,
  BICommandZone,
  BIFreshness,
  BIKpiCard,
  BIKpiState,
  BIProofDrawerSubject,
  BIProvenance,
  BIRiskRank,
} from "@/services/bi/bi-contracts"
import type { EvidenceGrade, ProofTrailSubjectType } from "@/services/evidence/evidence-contracts"
import { SUBJECT_PERMISSION_MAP } from "@/services/evidence/evidence-contracts"
import { auditRbacDecision, RbacError } from "@/lib/security/rbac"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { presentSnapshotBlocker } from "@/lib/dashboard/snapshot-blocker-presentation"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import {
  getModuleControlCenterData,
  observeModuleAccess,
} from "@/services/modules/module-entitlement.service"
import { resolveTenantWideOperatingAuthority } from "@/services/operating-access/operating-access-scope-contracts"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import type { ActionItem, BusinessSignal } from "@/services/signals/business-signal-contracts"
import { buildBusinessSignalsFromSnapshots } from "@/services/signals/business-signal-rules.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getInventoryLossSnapshot } from "@/services/snapshots/inventory-loss-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import type {
  InventoryLossMetrics,
  SnapshotBlocker,
  SnapshotFreshness,
  SnapshotRedaction,
  SnapshotResult,
  SnapshotSourceModule,
  SnapshotUiState,
} from "@/services/snapshots/snapshot-contracts"
import { getTenantOperatingSnapshotFromRelated } from "@/services/snapshots/tenant-operating-snapshot.service"
import { db } from "@/prisma/db"

import type {
  ComposeOwnerWarRoomInput,
  OwnerMorningBriefPriorityAction,
  OwnerWarRoomCardId,
  OwnerWarRoomCardState,
  OwnerWarRoomData,
  OwnerWarRoomMetricCard,
  OwnerWarRoomProofSubject,
  OwnerWarRoomStrip,
  OwnerWarRoomTone,
} from "./owner-war-room-contracts"

import { ownerText, type OwnerLocale } from "./owner-war-room-copy"
import { presentOwnerActionQueue, presentOwnerForecastMessage } from "./owner-signal-copy"

type OwnerWarRoomInput = {
  locale?: OwnerLocale
  organizationId: string
  actorId?: string | null
  actorPermissions: readonly string[]
  actorRoleCodes?: readonly string[]
  isSuperUser?: boolean
  periodStart?: Date | string | null
  periodEnd?: Date | string | null
  maxAgeMinutes?: number | null
  now?: Date | string | null
}

const DEFAULT_FRESHNESS: SnapshotFreshness = {
  generatedAt: new Date(0).toISOString(),
  sourceMaxUpdatedAt: null,
  maxAgeMinutes: 24 * 60,
  stale: false,
  staleReason: null,
}

const OWNER_BRIEF_MAX_ACTIONS = 3
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const OWNER_STOCK_WORKSPACE = "/dashboard/inventory/items"

export async function getOwnerWarRoomData(input: OwnerWarRoomInput): Promise<OwnerWarRoomData> {
  await requireOwnerWarRoomTenantAuthority(input)

  const scope = {
    organizationId: input.organizationId,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    maxAgeMinutes: input.maxAgeMinutes ?? null,
    now: input.now ?? null,
  }

  const [paymentTruth, inventoryCash, closeReadiness, moduleControl, inventoryLoss] = await Promise.all([
    getPaymentTruthSnapshot(scope),
    getInventoryCashSnapshot(scope),
    getCloseReadinessSnapshot(scope),
    getModuleControlCenterData({
      organizationId: input.organizationId,
      actorId: input.actorId,
      actorPermissions: input.actorPermissions,
      now: input.now ?? null,
    }),
    loadOwnerWarRoomInventoryLoss(input),
  ])
  const tenantOperating = await getTenantOperatingSnapshotFromRelated(scope, {
    paymentTruth,
    inventoryCash,
    closeReadiness,
  })

  const signals = buildBusinessSignalsFromSnapshots({
    organizationId: input.organizationId,
    snapshots: [
      tenantOperating,
      paymentTruth,
      inventoryCash,
      closeReadiness,
      ...(inventoryLoss ? [inventoryLoss] : []),
    ],
  })
  const actionQueue = buildActionQueue({
    organizationId: input.organizationId,
    signals,
    actorPermissions: input.actorPermissions,
    now: input.now ?? null,
  })
  const proofSubjectIds = await getLatestProofSubjectIds({
    organizationId: input.organizationId,
    periodStart: tenantOperating.periodStart,
    periodEnd: tenantOperating.periodEnd,
  })

  return composeOwnerWarRoomData({
    organizationId: input.organizationId,
    organizationName: moduleControl.organizationName,
    locale: input.locale,
    actorPermissions: input.actorPermissions,
    generatedAt: normalizeNow(input.now).toISOString(),
    snapshots: {
      tenantOperating,
      paymentTruth,
      inventoryCash,
      closeReadiness,
    },
    actionQueue,
    moduleControl,
    proofSubjectIds,
  })
}

async function requireOwnerWarRoomTenantAuthority(
  input: OwnerWarRoomInput,
): Promise<void> {
  const actorId = input.actorId?.trim()
  const hasDashboardPermission = hasRbacPermission(
    input.actorPermissions,
    "dashboard.read",
  )
  const authority =
    actorId && hasDashboardPermission
      ? resolveTenantWideOperatingAuthority({
          isSuperUser: input.isSuperUser === true,
          roleCodes: input.actorRoleCodes ?? [],
        })
      : null

  if (actorId && hasDashboardPermission && authority) return

  await auditRbacDecision({
    ctx: actorId
      ? {
          userId: actorId,
          orgId: input.organizationId,
        }
      : null,
    permission: "dashboard.read",
    result: "denied",
    resource: "KontavaOwnerWarRoom",
    reason: !actorId
      ? "Missing actor identity"
      : !hasDashboardPermission
        ? "Missing permission"
        : "Tenant-wide operating authority required",
  })

  throw new RbacError(
    "Forbidden: Owner War Room requires tenant-wide operating authority",
    "FORBIDDEN",
    403,
  )
}

async function loadOwnerWarRoomInventoryLoss(
  input: OwnerWarRoomInput,
): Promise<SnapshotResult<InventoryLossMetrics> | null> {
  const actorId = input.actorId?.trim()
  if (!actorId) return null
  if (!hasRbacPermission(input.actorPermissions, "dashboard.read")) return null
  if (!hasRbacPermission(input.actorPermissions, "inventory.levels.read")) return null

  const authority = resolveTenantWideOperatingAuthority({
    isSuperUser: input.isSuperUser === true,
    roleCodes: input.actorRoleCodes ?? [],
  })
  if (!authority) return null

  const access = await observeModuleAccess({
    organizationId: input.organizationId,
    userId: actorId,
    actorPermissions: input.actorPermissions,
    moduleSlug: "inventory",
    surfaceType: "report",
    surface: "owner-war-room.inventory-loss",
    accessIntent: "read",
    mode: "enforce",
    audit: true,
    now: input.now ?? null,
  })
  if (!access.allowed) return null

  return getInventoryLossSnapshot({
    organizationId: input.organizationId,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    maxAgeMinutes: input.maxAgeMinutes ?? null,
    now: input.now ?? null,
  })
}

export function composeOwnerWarRoomData(input: ComposeOwnerWarRoomInput): OwnerWarRoomData {
  const displaySnapshot = <T,>(snapshot: SnapshotResult<T>): SnapshotResult<T> => ({
    ...snapshot,
    blockers: snapshot.blockers.map(blocker => presentSnapshotBlocker(blocker, input.locale ?? "en")),
  })
  input = {
    ...input,
    actionQueue: presentOwnerActionQueue(input.actionQueue, input.locale),
    snapshots: {
      tenantOperating: displaySnapshot(input.snapshots.tenantOperating),
      paymentTruth: displaySnapshot(input.snapshots.paymentTruth),
      inventoryCash: displaySnapshot(input.snapshots.inventoryCash),
      closeReadiness: displaySnapshot(input.snapshots.closeReadiness),
    },
  }
  const { tenantOperating, paymentTruth, inventoryCash, closeReadiness } = input.snapshots
  const payrollForecast = tenantOperating.metrics.payrollFinanceForecast
  const payrollBalanceCaseCount = tenantOperating.metrics.activeEmployeeBalanceCaseCount
  const payrollForecastBlocked = payrollForecast.blockerCodes.length > 0
  const payrollForecastBlockers = payrollForecastSnapshotBlockers(tenantOperating)
  const payrollExposureValue = payrollBalanceCaseCount > 0 ? payrollBalanceCaseCount : payrollForecast.totalUpcomingAmount
  const payrollExposureUnit = payrollBalanceCaseCount > 0 ? "cases" : "value"
  const payrollExposureHref = "/dashboard/payroll/payments"
  const payrollExposureDetail =
    payrollBalanceCaseCount > 0
      ? ownerText("Open employee balance recovery cases are counted without exposing person-level amounts.", input.locale)
      : payrollForecast.authoritative
        ? input.locale === "fr"
          ? `Le total prévisionnel des salaires nets et obligations légales atteint ${formatBriefAmount(payrollForecast.totalUpcomingAmount, input.locale)} ; les montants individuels restent dans le module de paie.`
          : `Upcoming aggregate net pay and statutory liability total ${formatBriefAmount(payrollForecast.totalUpcomingAmount)}; person-level amounts stay inside payroll.`
        : presentOwnerForecastMessage(payrollForecast, input.locale)
  const payrollExposureTone =
    payrollBalanceCaseCount > 0 ? "danger" : payrollForecastBlocked ? "danger" : payrollForecast.totalUpcomingAmount !== null && payrollForecast.totalUpcomingAmount > 0 ? "gold" : "muted"
  const payrollExposureState = payrollForecastBlocked ? "blocked" : payrollExposureValue !== null && payrollExposureValue > 0 ? "redacted" : undefined
  const cards: OwnerWarRoomMetricCard[] = [
    card({
      id: "cash_at_risk",
      title: ownerText("Cash at risk", input.locale),
      detail: ownerText("Unresolved payment suspense value that should be explained before owners trust cash.", input.locale),
      value: paymentTruth.metrics.openSuspenseAmount,
      unit: "value",
      tone: paymentTruth.metrics.openSuspenseCount > 0 ? "danger" : paymentTruth.metrics.openSuspenseAmount === null ? "muted" : "success",
      requiredPermission: "payments.reconciliation.read",
      href: "/dashboard/finance/reconciliation",
      snapshot: paymentTruth,
    }),
    card({
      id: "reconciliation_exceptions",
      title: ownerText("Reconciliation exceptions", input.locale),
      detail: ownerText("Open payment exceptions, critical issues, suspense items, and pending provider transactions.", input.locale),
      value:
        paymentTruth.metrics.openExceptionCount +
        paymentTruth.metrics.openSuspenseCount +
        paymentTruth.metrics.pendingTransactionCount,
      unit: "items",
      tone: paymentTruth.metrics.criticalExceptionCount > 0 ? "danger" : "gold",
      requiredPermission: "payments.reconciliation.read",
      href: "/dashboard/finance/reconciliation",
      snapshot: paymentTruth,
    }),
    card({
      id: "stock_cash_exposure",
      title: ownerText("Stock cash exposure", input.locale),
      detail: ownerText("Inventory value tied up in stock, with zero or negative-stock pressure highlighted.", input.locale),
      value: inventoryCash.metrics.inventoryValue,
      unit: "value",
      tone:
        inventoryCash.metrics.negativeStockLevelCount > 0 || inventoryCash.metrics.zeroStockLevelCount > 0
          ? "gold"
          : "spruce",
      requiredPermission: "inventory.read",
      href: OWNER_STOCK_WORKSPACE,
      snapshot: inventoryCash,
    }),
    card({
      id: "supplier_commitments",
      title: ownerText("Supplier commitments", input.locale),
      detail: ownerText("Pending purchase orders that may soon become cash obligations or receiving blockers.", input.locale),
      value: tenantOperating.metrics.pendingPurchaseOrderCount,
      unit: "orders",
      tone: tenantOperating.metrics.pendingPurchaseOrderCount > 0 ? "info" : "success",
      requiredPermission: "purchases.orders.read",
      href: "/dashboard/purchase-orders",
      snapshot: tenantOperating,
      sourceModules: ["purchasing", "finance", "accounting"],
    }),
    card({
      id: "payroll_exposure",
      title: ownerText("Payroll exposure", input.locale),
      detail: payrollExposureDetail,
      value: payrollExposureValue,
      unit: payrollExposureUnit,
      tone: payrollExposureTone,
      requiredPermission: "payments.reconciliation.read",
      href: payrollExposureHref,
      snapshot: tenantOperating,
      redactions: [
        ...tenantOperating.redactions,
        {
          id: "owner-war-room-payroll-person-values-redacted",
          field: "payroll.personLevelAmounts",
          reason: ownerText("The Owner War Room shows aggregate payroll forecast and exposure only; employee-level values stay inside payroll.", input.locale),
          policy: "KONTAVA_SENSITIVE_PAYROLL_EVIDENCE",
        },
      ],
      state: payrollExposureState,
      blockers: payrollForecastBlocked ? payrollForecastBlockers : [],
      sourceModules: ["payroll", "accounting", "finance"],
    }),
    card({
      id: "close_readiness",
      title: ownerText("Close readiness", input.locale),
      detail: ownerText("Open findings, unavailable evidence, readiness score, and close blockers for the active period.", input.locale),
      value: closeReadiness.metrics.averageReadinessScore ?? 0,
      unit: "score",
      tone:
        closeReadiness.metrics.criticalOpenFindingCount > 0 || closeReadiness.metrics.blockedCloseRunCount > 0
          ? "danger"
          : "brand",
      requiredPermission: "accounting.close.read",
      href: "/dashboard/accounting/close",
      snapshot: closeReadiness,
    }),
    {
      id: "action_queue",
      title: ownerText("Action queue", input.locale),
      detail: ownerText("Permission-filtered owner actions generated from the current business signals.", input.locale),
      value: input.actionQueue.summary.total,
      unit: "actions",
      tone: input.actionQueue.summary.bySeverity.critical > 0 ? "danger" : "info",
      state: input.actionQueue.filteredOutCount > 0 ? "permission_denied" : input.actionQueue.summary.total ? "ready" : "empty",
      evidenceGrade: strongestVisibleGrade(input.actionQueue.actionItems.map((item) => item.evidenceGrade)),
      freshness: paymentTruth.freshness,
      sourceModules: ["dashboard", "payments", "inventory", "purchasing", "payroll", "close"],
      blockers: input.actionQueue.actionItems.flatMap((item) => item.blockers),
      redactions: input.actionQueue.actionItems.flatMap((item) => item.redactions),
      requiredPermission: "dashboard.read",
      href: "/dashboard/owner-war-room",
    },
    {
      id: "module_observe",
      title: ownerText("Module observe", input.locale),
      detail: ownerText("Modules that would be blocked under entitlement enforcement, shown only as controlled upgrade pressure.", input.locale),
      value: input.moduleControl.summary.wouldBlockCount,
      unit: "modules",
      tone: input.moduleControl.summary.wouldBlockCount > 0 ? "gold" : "success",
      state: input.moduleControl.summary.wouldBlockCount > 0 ? "upgrade_request" : "ready",
      evidenceGrade: input.moduleControl.summary.wouldBlockCount > 0 ? "operational" : "posted",
      freshness: {
        ...DEFAULT_FRESHNESS,
        generatedAt: input.moduleControl.generatedAt,
        sourceMaxUpdatedAt: input.moduleControl.generatedAt,
      },
      sourceModules: ["dashboard"],
      blockers: [],
      redactions: [],
      requiredPermission: "system.settings.update",
      href: "/dashboard/settings/modules",
    },
  ]

  const strips: OwnerWarRoomStrip[] = [
    {
      id: "cash_leakage_radar",
      title: ownerText("Cash Leakage Radar MVP", input.locale),
      detail:
        paymentTruth.metrics.openSuspenseCount > 0 || paymentTruth.metrics.criticalExceptionCount > 0
          ? ownerText("Cash truth has unresolved suspense or critical exceptions. Owners should clear these before trusting daily cash.", input.locale)
          : ownerText("No critical cash leakage signal is visible from the current payment snapshot.", input.locale),
      severity: paymentTruth.metrics.criticalExceptionCount > 0 ? "critical" : paymentTruth.metrics.openSuspenseCount > 0 ? "high" : "info",
      evidenceGrade: paymentTruth.evidenceGrade,
      state: stateFromSnapshot(paymentTruth),
      blockers: paymentTruth.blockers,
      redactions: paymentTruth.redactions,
    },
    {
      id: "close_autopilot",
      title: ownerText("Close Autopilot strip", input.locale),
      detail:
        closeReadiness.metrics.openFindingCount > 0
          ? ownerText("The close still has findings or unavailable evidence. Work the blockers before signoff.", input.locale)
          : ownerText("Close readiness has no open blocker surfaced by the current snapshot.", input.locale),
      severity: closeReadiness.metrics.criticalOpenFindingCount > 0 ? "critical" : closeReadiness.metrics.openFindingCount > 0 ? "high" : "info",
      evidenceGrade: closeReadiness.evidenceGrade,
      state: stateFromSnapshot(closeReadiness),
      blockers: closeReadiness.blockers,
      redactions: closeReadiness.redactions,
    },
    {
      id: "module_control",
      title: ownerText("Module Control observe strip", input.locale),
      detail:
        input.moduleControl.summary.wouldBlockCount > 0
          ? ownerText("Observe mode is showing modules that would be hidden after enforcement. Owners can request an upgrade from controlled surfaces.", input.locale)
          : ownerText("Module observe mode is clean for the current tenant entitlement set.", input.locale),
      severity: input.moduleControl.summary.wouldBlockCount > 0 ? "medium" : "info",
      evidenceGrade: "operational",
      state: input.moduleControl.summary.wouldBlockCount > 0 ? "upgrade_request" : "ready",
      blockers: [],
      redactions: [],
    },
  ]

  const proofSubjects = buildOwnerProofSubjects(input.proofSubjectIds, input.locale)
  const summary = {
    criticalCount: input.actionQueue.summary.bySeverity.critical,
    highCount: input.actionQueue.summary.bySeverity.high,
    redactedCount: cards.filter((item) => item.redactions.length > 0 || item.state === "redacted").length,
    staleCount: cards.filter((item) => item.freshness.stale || item.state === "stale").length,
    blockedCount: cards.filter((item) => item.blockers.length > 0 || item.state === "blocked").length,
    upgradePromptCount: cards.filter((item) => item.state === "upgrade_request").length,
  }
  const morningBrief = buildOwnerMorningBrief({
    input,
    cards,
    strips,
    proofSubjects,
    summary,
  })

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    generatedAt: input.generatedAt,
    periodStart: tenantOperating.periodStart,
    periodEnd: tenantOperating.periodEnd,
    cards,
    strips,
    proofSubjects,
    actionQueue: input.actionQueue,
    moduleControl: {
      mode: input.moduleControl.mode,
      hardEnforcementEnabled: input.moduleControl.hardEnforcementEnabled,
      summary: input.moduleControl.summary,
      generatedAt: input.moduleControl.generatedAt,
      unknownRequestedModules: input.moduleControl.unknownRequestedModules,
    },
    summary,
    morningBrief,
  }
}

function buildOwnerProofSubjects(
  proofSubjectIds: ComposeOwnerWarRoomInput["proofSubjectIds"],
  locale: OwnerLocale = "en",
): OwnerWarRoomProofSubject[] {
  return [
    {
      subjectType: "journal.entry",
      subjectId: proofSubjectIds?.["journal.entry"] ?? "",
      label: ownerText("Ledger proof", locale),
      detail: ownerText("Inspect ledger evidence when a posted journal entry is selected from accounting.", locale),
      requiredPermission: SUBJECT_PERMISSION_MAP["journal.entry"],
      enabled: Boolean(proofSubjectIds?.["journal.entry"]),
      unavailableReason: proofSubjectIds?.["journal.entry"]
        ? null
        : ownerText("No posted journal entry is visible in this period.", locale),
    },
    {
      subjectType: "reconciliation.run",
      subjectId: proofSubjectIds?.["reconciliation.run"] ?? "",
      label: ownerText("Reconciliation proof", locale),
      detail: ownerText("Inspect payment reconciliation evidence and blockers for the selected run.", locale),
      requiredPermission: SUBJECT_PERMISSION_MAP["reconciliation.run"],
      enabled: Boolean(proofSubjectIds?.["reconciliation.run"]),
      unavailableReason: proofSubjectIds?.["reconciliation.run"]
        ? null
        : ownerText("No reconciliation run is visible in this period.", locale),
    },
    {
      subjectType: "close.run",
      subjectId: proofSubjectIds?.["close.run"] ?? "",
      label: ownerText("Close proof", locale),
      detail: ownerText("Inspect close evidence, findings, redactions, and readiness blockers.", locale),
      requiredPermission: SUBJECT_PERMISSION_MAP["close.run"],
      enabled: Boolean(proofSubjectIds?.["close.run"]),
      unavailableReason: proofSubjectIds?.["close.run"]
        ? null
        : ownerText("No close run is visible in this period.", locale),
    },
  ]
}
type OwnerMorningBriefBuilderInput = {
  input: ComposeOwnerWarRoomInput
  cards: OwnerWarRoomMetricCard[]
  strips: OwnerWarRoomStrip[]
  proofSubjects: OwnerWarRoomProofSubject[]
  summary: OwnerWarRoomData["summary"]
}

const ACTION_MODULE_BY_SIGNAL_TYPE: Record<ActionItem["signalType"], CommercialModuleSlug> = {
  cash_drawer_variance: "cash_drawer",
  open_payment_suspense: "payment_reconciliation",
  duplicate_provider_reference: "payment_reconciliation",
  refund_void_spike: "pos",
  stockout_risk: "inventory",
  dead_stock_cash_exposure: "inventory",
  inventory_loss_review: "inventory",
  purchase_order_receiving_delay: "purchasing",
  payroll_exposure: "payroll",
  close_blocker: "close_assurance",
}

const PROOF_MODULE_BY_SUBJECT: Record<ProofTrailSubjectType, CommercialModuleSlug> = {
  "journal.entry": "accounting",
  "reconciliation.run": "payment_reconciliation",
  "close.run": "close_assurance",
  "payment.transaction": "payment_reconciliation",
}

function buildOwnerMorningBrief({
  input,
  cards,
  strips,
  proofSubjects,
  summary,
}: OwnerMorningBriefBuilderInput): OwnerWarRoomData["morningBrief"] {
  const { tenantOperating, paymentTruth, inventoryCash, closeReadiness } = input.snapshots
  const generatedDate = normalizeNow(input.generatedAt)
  const since = new Date(generatedDate.getTime() - ONE_DAY_MS)
  const signalById = new Map(input.actionQueue.signals.map((signal) => [signal.id, signal]))
  const proofLinkedActionItems = input.actionQueue.actionItems
    .filter((item) => {
      const signal = signalById.get(item.signalId)
      return Boolean(signal?.proofLink && isOnOrAfter(item.createdAt, since))
    })
    .sort(sortActionItems)
    .slice(0, OWNER_BRIEF_MAX_ACTIONS)
  const priorityActions = proofLinkedActionItems.map((item) =>
    priorityActionFromItem({ locale: input.locale, item, signal: signalById.get(item.signalId) ?? null, generatedAt: input.generatedAt }),
  )
  const headlineMetrics = {
    cashAtRisk: paymentTruth.metrics.openSuspenseAmount,
    payrollForecastTotal: tenantOperating.metrics.payrollFinanceForecast.totalUpcomingAmount,
    blockedCloseItems:
      closeReadiness.metrics.blockedCloseRunCount +
      closeReadiness.metrics.criticalOpenFindingCount +
      closeReadiness.metrics.unavailableEvidenceCount,
    staleEvidenceItems: summary.staleCount + input.actionQueue.summary.stale,
    proofLinkedActionCount: proofLinkedActionItems.length,
  }
  const freshness = aggregateBriefFreshness(input.generatedAt, [tenantOperating, paymentTruth, inventoryCash, closeReadiness])
  const evidenceGrade = strongestVisibleGrade([
    ...cards.map((item) => item.evidenceGrade),
    ...priorityActions.map((item) => item.evidenceGrade),
  ])
  const state = morningBriefState({
    summary,
    blockedCloseItems: headlineMetrics.blockedCloseItems,
    staleEvidenceItems: headlineMetrics.staleEvidenceItems,
  })
  const blockers = uniqueById([
    ...cards.flatMap((item) => item.blockers),
    ...strips.flatMap((item) => item.blockers),
    ...priorityActions.flatMap((item) => item.blockers),
  ])
  const redactions = uniqueById([
    ...cards.flatMap((item) => item.redactions),
    ...strips.flatMap((item) => item.redactions),
    ...priorityActions.flatMap((item) => item.redactions),
  ])
  const recommendation = buildMorningBriefRecommendation(headlineMetrics, input.actorPermissions, input.locale)
  const proofDrawerSubjects = proofSubjects.map((subject) => proofSubjectToBI(input.organizationId, subject, input.locale))
  const zones = buildOwnerMorningBriefZones(input)

  return {
    id: `owner-morning-brief:${input.organizationId}`,
    organizationId: input.organizationId,
    audienceRole: "owner",
    generatedAt: input.generatedAt,
    periodStart: tenantOperating.periodStart,
    periodEnd: tenantOperating.periodEnd,
    freshness,
    commandBrief: {
      id: `owner-command-brief:${input.organizationId}`,
      organizationId: input.organizationId,
      title: ownerText("Owner morning brief", input.locale),
      summary: buildMorningBriefSummary(headlineMetrics, input.locale),
      conclusion: recommendation.conclusion,
      mode: "brief",
      generatedAt: input.generatedAt,
      periodStart: tenantOperating.periodStart,
      periodEnd: tenantOperating.periodEnd,
      state,
      evidenceGrade,
      trustState: evidenceGradeToBITrustState(evidenceGrade),
      freshness,
      provenance: provenanceFromSnapshot(tenantOperating),
      sourceModules: uniqueModules(cards.flatMap((item) => item.sourceModules)),
      blockers,
      redactions,
      primaryAction: recommendation.action,
      drillThrough: null,
      reviewState: {
        organizationId: input.organizationId,
        reviewerId: null,
        reviewerRole: "owner",
        state: state === "blocked" ? "blocked" : state === "stale" ? "stale" : "not_started",
        reviewedAt: null,
        previousReviewedAt: null,
        nextReviewDueAt: new Date(generatedDate.getTime() + ONE_DAY_MS).toISOString(),
        freshness,
        blockers,
      },
    },
    changes: buildOwnerMorningBriefChanges({ input, headlineMetrics, freshness, proofLinkedActionItems, signalById }),
    risks: buildOwnerMorningBriefRisks({ input, headlineMetrics, freshness }),
    actions: priorityActions.map((item) => item.actionLink),
    zones,
    blockers,
    redactions,
    priorityActions,
    proofSubjects: proofDrawerSubjects,
    acknowledgement: {
      supported: true,
      state: "not_started",
      acknowledgedAt: null,
      detail:
        ownerText("Acknowledgement is held in the current browser session; no accounting, close, cash, inventory, payroll, or evidence record is mutated.", input.locale),
    },
    headlineMetrics,
  }
}

function buildOwnerMorningBriefChanges(input: {
  input: ComposeOwnerWarRoomInput
  headlineMetrics: OwnerWarRoomData["morningBrief"]["headlineMetrics"]
  freshness: BIFreshness
  proofLinkedActionItems: ActionItem[]
  signalById: Map<string, BusinessSignal>
}): BIChangeEvent[] {
  const { paymentTruth, closeReadiness } = input.input.snapshots
  const changes: BIChangeEvent[] = []

  if (paymentTruth.metrics.openSuspenseCount > 0 || (input.headlineMetrics.cashAtRisk !== null && input.headlineMetrics.cashAtRisk > 0)) {
    changes.push({
      id: "owner-morning-brief-cash-at-risk",
      organizationId: input.input.organizationId,
      moduleSlug: "payment_reconciliation",
      requiredPermission: "payments.reconciliation.read",
      title: ownerText("Cash at risk is visible since yesterday", input.input.locale),
      detail: ownerText("Open suspense value is still present in the payment truth snapshot.", input.input.locale),
      businessImpact: ownerText("Daily cash remains ambiguous until suspense is explained with reconciliation evidence.", input.input.locale),
      direction: "new",
      severity: paymentTruth.metrics.criticalExceptionCount > 0 ? "critical" : "high",
      state: ownerStateToBIState(stateFromSnapshot(paymentTruth)),
      evidenceGrade: paymentTruth.evidenceGrade,
      trustState: evidenceGradeToBITrustState(paymentTruth.evidenceGrade),
      freshness: freshnessFromSnapshot(paymentTruth),
      sourceModules: paymentTruth.sourceModules,
      changedAt: paymentTruth.generatedAt,
      previousValue: null,
      currentValue: input.headlineMetrics.cashAtRisk,
      unit: "XAF",
      format: "currency",
      provenance: provenanceFromSnapshot(paymentTruth),
      blockers: paymentTruth.blockers,
      redactions: paymentTruth.redactions,
      drillThrough: routeDrillThrough(ownerText("Open reconciliation", input.input.locale), "/dashboard/finance/reconciliation", "payments.reconciliation.read"),
      actionLink: actionLink({
        id: "owner-morning-brief-open-cash-risk",
        label: ownerText("Review cash risk", input.input.locale),
        href: "/dashboard/finance/reconciliation",
        requiredPermission: "payments.reconciliation.read",
        moduleSlug: "payment_reconciliation",
        disabled: false,
        disabledReason: null,
      }),
    })
  }
  if (input.headlineMetrics.blockedCloseItems > 0) {
    changes.push({
      id: "owner-morning-brief-close-blocked",
      organizationId: input.input.organizationId,
      moduleSlug: "close_assurance",
      requiredPermission: "accounting.close.read",
      title: ownerText("Close blockers need owner attention", input.input.locale),
      detail: ownerText("The close readiness snapshot still has blocked runs, critical findings, or unavailable evidence.", input.input.locale),
      businessImpact: ownerText("Reporting confidence stays limited until close evidence is cleared.", input.input.locale),
      direction: "new",
      severity: closeReadiness.metrics.blockedCloseRunCount > 0 || closeReadiness.metrics.criticalOpenFindingCount > 0 ? "critical" : "high",
      state: ownerStateToBIState(stateFromSnapshot(closeReadiness)),
      evidenceGrade: closeReadiness.evidenceGrade,
      trustState: evidenceGradeToBITrustState(closeReadiness.evidenceGrade),
      freshness: freshnessFromSnapshot(closeReadiness),
      sourceModules: closeReadiness.sourceModules,
      changedAt: closeReadiness.generatedAt,
      previousValue: null,
      currentValue: input.headlineMetrics.blockedCloseItems,
      unit: "items",
      format: "number",
      provenance: provenanceFromSnapshot(closeReadiness),
      blockers: closeReadiness.blockers,
      redactions: closeReadiness.redactions,
      drillThrough: routeDrillThrough(ownerText("Open close readiness", input.input.locale), "/dashboard/accounting/close", "accounting.close.read"),
      actionLink: actionLink({
        id: "owner-morning-brief-open-close-risk",
        label: ownerText("Review close", input.input.locale),
        href: "/dashboard/accounting/close",
        requiredPermission: "accounting.close.read",
        moduleSlug: "close_assurance",
        disabled: false,
        disabledReason: null,
      }),
    })
  }


  if (input.headlineMetrics.staleEvidenceItems > 0) {
    changes.push({
      id: "owner-morning-brief-stale-evidence",
      organizationId: input.input.organizationId,
      moduleSlug: "dashboard",
      requiredPermission: "dashboard.read",
      title: ownerText("Evidence freshness needs review", input.input.locale),
      detail: ownerText("One or more owner-war-room evidence surfaces are stale or signal-stale.", input.input.locale),
      businessImpact: ownerText("The owner should refresh the underlying workflow before trusting the morning view.", input.input.locale),
      direction: "changed",
      severity: "medium",
      state: "stale",
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      sourceModules: ["dashboard"],
      changedAt: input.input.generatedAt,
      previousValue: null,
      currentValue: input.headlineMetrics.staleEvidenceItems,
      unit: "items",
      format: "number",
      provenance: null,
      blockers: [],
      redactions: [],
      drillThrough: routeDrillThrough(ownerText("Open owner war room", input.input.locale), "/dashboard/owner-war-room", "dashboard.read"),
      actionLink: actionLink({
        id: "owner-morning-brief-open-stale-evidence",
        label: ownerText("Review evidence", input.input.locale),
        href: "/dashboard/owner-war-room",
        requiredPermission: "dashboard.read",
        moduleSlug: "dashboard",
        disabled: false,
        disabledReason: null,
      }),
    })
  }

  for (const item of input.proofLinkedActionItems) {
    const signal = input.signalById.get(item.signalId) ?? null
    changes.push({
      id: `owner-morning-brief-proof-action:${item.id}`,
      organizationId: input.input.organizationId,
      moduleSlug: moduleSlugForAction(item, signal),
      requiredPermission: item.requiredPermission,

      title: item.title,
      detail: item.nextStep,
      businessImpact: signal?.businessImpact ?? ownerText("A proof-linked action is open for owner review.", input.input.locale),
      direction: "new",
      severity: item.severity,
      state: actionItemState(item),
      evidenceGrade: item.evidenceGrade,
      trustState: evidenceGradeToBITrustState(item.evidenceGrade),
      freshness: freshnessFromSignal(signal, item.createdAt, input.input.locale),
      sourceModules: signal ? [signal.sourceModule] : ["dashboard"],
      changedAt: item.createdAt,
      previousValue: null,
      currentValue: item.severityScore,
      unit: "score",
      format: "score",
      provenance: signal ? provenanceFromSignal(signal) : null,
      blockers: item.blockers,
      redactions: item.redactions,
      drillThrough: signal ? proofDrillThrough(signal, input.input.locale) : null,
      actionLink: actionLinkFromItem(item, signal, input.input.locale),
    })
  }

  return changes.slice(0, 5)
}
function buildOwnerMorningBriefRisks(input: {
  input: ComposeOwnerWarRoomInput
  headlineMetrics: OwnerWarRoomData["morningBrief"]["headlineMetrics"]
  freshness: BIFreshness
}): BIRiskRank[] {
  const { paymentTruth, closeReadiness, inventoryCash, tenantOperating } = input.input.snapshots
  const payrollForecast = tenantOperating.metrics.payrollFinanceForecast
  const payrollForecastBlockers = payrollForecastSnapshotBlockers(tenantOperating)
  const risks: Array<Omit<BIRiskRank, "rank">> = []

  if (paymentTruth.metrics.openSuspenseCount > 0 || (input.headlineMetrics.cashAtRisk !== null && input.headlineMetrics.cashAtRisk > 0)) {
    risks.push({
      id: "owner-risk-cash-at-risk",
      organizationId: input.input.organizationId,
      moduleSlug: "payment_reconciliation",
      title: ownerText("Cash at risk", input.input.locale),
      detail: ownerText("Payment suspense value is still open.", input.input.locale),
      businessImpact: ownerText("Unresolved suspense weakens the owner's trust in daily cash.", input.input.locale),
      severity: paymentTruth.metrics.criticalExceptionCount > 0 ? "critical" : "high",
      severityScore: paymentTruth.metrics.criticalExceptionCount > 0 ? 96 : 82,
      moneyImpact: input.headlineMetrics.cashAtRisk,
      urgency: paymentTruth.metrics.criticalExceptionCount > 0 ? "now" : "today",
      state: ownerStateToBIState(stateFromSnapshot(paymentTruth)),
      evidenceGrade: paymentTruth.evidenceGrade,
      trustState: evidenceGradeToBITrustState(paymentTruth.evidenceGrade),
      freshness: freshnessFromSnapshot(paymentTruth),
      sourceModules: paymentTruth.sourceModules,
      blockers: paymentTruth.blockers,
      redactions: paymentTruth.redactions,
      drillThrough: routeDrillThrough(ownerText("Open reconciliation", input.input.locale), "/dashboard/finance/reconciliation", "payments.reconciliation.read"),
      actionLink: actionLink({
        id: "owner-risk-open-cash-at-risk",
        label: ownerText("Open cash risk", input.input.locale),
        href: "/dashboard/finance/reconciliation",
        requiredPermission: "payments.reconciliation.read",
        moduleSlug: "payment_reconciliation",
        disabled: false,
        disabledReason: null,
      }),
    })
  }

  if (input.headlineMetrics.blockedCloseItems > 0) {
    risks.push({
      id: "owner-risk-close-blockers",
      organizationId: input.input.organizationId,
      moduleSlug: "close_assurance",
      title: ownerText("Blocked close items", input.input.locale),
      detail: ownerText("Close readiness still has blocked runs, critical findings, or unavailable evidence.", input.input.locale),
      businessImpact: ownerText("The period cannot become owner-trustworthy until close blockers are cleared.", input.input.locale),
      severity: closeReadiness.metrics.blockedCloseRunCount > 0 || closeReadiness.metrics.criticalOpenFindingCount > 0 ? "critical" : "high",
      severityScore: closeReadiness.metrics.blockedCloseRunCount > 0 || closeReadiness.metrics.criticalOpenFindingCount > 0 ? 94 : 78,
      moneyImpact: null,
      urgency: closeReadiness.metrics.blockedCloseRunCount > 0 ? "now" : "today",
      state: ownerStateToBIState(stateFromSnapshot(closeReadiness)),
      evidenceGrade: closeReadiness.evidenceGrade,
      trustState: evidenceGradeToBITrustState(closeReadiness.evidenceGrade),
      freshness: freshnessFromSnapshot(closeReadiness),
      sourceModules: closeReadiness.sourceModules,
      blockers: closeReadiness.blockers,
      redactions: closeReadiness.redactions,
      drillThrough: routeDrillThrough(ownerText("Open close", input.input.locale), "/dashboard/accounting/close", "accounting.close.read"),
      actionLink: actionLink({
        id: "owner-risk-open-close-blockers",
        label: ownerText("Open close", input.input.locale),
        href: "/dashboard/accounting/close",
        requiredPermission: "accounting.close.read",
        moduleSlug: "close_assurance",
        disabled: false,
        disabledReason: null,
      }),
    })
  }


  if (payrollForecast.blockerCodes.length > 0) {
    risks.push({
      id: "owner-risk-payroll-forecast-proof",
      organizationId: input.input.organizationId,
      moduleSlug: "payroll",
      title: ownerText("Payroll forecast proof", input.input.locale),
      detail: ownerText("Payroll cash obligations are withheld because payroll forecast proof is incomplete.", input.input.locale),
      businessImpact: ownerText("Owner cash planning and profitability should not use payroll estimates until register, ledger, payment, and declaration proof are repaired.", input.input.locale),
      severity: "high",
      severityScore: 88,
      moneyImpact: null,
      urgency: "today",
      state: "blocked",
      evidenceGrade: "blocked",
      trustState: "blocked",
      freshness: freshnessFromSnapshot(tenantOperating),
      sourceModules: ["payroll", "accounting", "finance"],
      blockers: payrollForecastBlockers,
      redactions: tenantOperating.redactions,
      drillThrough: routeDrillThrough(ownerText("Open payroll", input.input.locale), "/dashboard/payroll/payments", "payments.reconciliation.read"),
      actionLink: actionLink({
        id: "owner-risk-open-payroll-forecast-proof",
        label: ownerText("Open payroll", input.input.locale),
        href: "/dashboard/payroll/payments",
        requiredPermission: "payments.reconciliation.read",
        moduleSlug: "payroll",
        disabled: false,
        disabledReason: null,
      }),
    })
  }

  if (input.headlineMetrics.staleEvidenceItems > 0) {
    risks.push({
      id: "owner-risk-stale-evidence",
      organizationId: input.input.organizationId,
      moduleSlug: "dashboard",
      title: ownerText("Stale evidence", input.input.locale),
      detail: ownerText("At least one evidence-backed owner metric is stale.", input.input.locale),
      businessImpact: ownerText("Refresh or investigate before using the brief as today's truth.", input.input.locale),
      severity: "medium",
      severityScore: 62,
      moneyImpact: null,
      urgency: "today",
      state: "stale",
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      sourceModules: ["dashboard"],
      blockers: [],
      redactions: [],
      drillThrough: routeDrillThrough(ownerText("Open owner war room", input.input.locale), "/dashboard/owner-war-room", "dashboard.read"),
      actionLink: actionLink({
        id: "owner-risk-open-stale-evidence",
        label: ownerText("Review evidence", input.input.locale),
        href: "/dashboard/owner-war-room",
        requiredPermission: "dashboard.read",
        moduleSlug: "dashboard",
        disabled: false,
        disabledReason: null,
      }),
    })
  }
  if (inventoryCash.metrics.zeroStockLevelCount > 0 || inventoryCash.metrics.negativeStockLevelCount > 0) {
    const stockAction = ownerStockAction("owner-risk-open-stock-cash-exposure", input.input.actorPermissions, input.input.locale)
    risks.push({
      id: "owner-risk-stock-cash-exposure",
      organizationId: input.input.organizationId,
      moduleSlug: "inventory",
      title: ownerText("Stock-to-cash exposure", input.input.locale),
      detail: ownerText("Zero or negative stock levels can turn working capital into missed sales.", input.input.locale),
      businessImpact: ownerText("Resolve stock pressure before it becomes a cash leakage story.", input.input.locale),
      severity: inventoryCash.metrics.negativeStockLevelCount > 0 ? "high" : "medium",
      severityScore: inventoryCash.metrics.negativeStockLevelCount > 0 ? 74 : 58,
      moneyImpact: inventoryCash.metrics.inventoryValue,
      urgency: inventoryCash.metrics.negativeStockLevelCount > 0 ? "today" : "soon",
      state: ownerStateToBIState(stateFromSnapshot(inventoryCash)),
      evidenceGrade: inventoryCash.evidenceGrade,
      trustState: evidenceGradeToBITrustState(inventoryCash.evidenceGrade),
      freshness: freshnessFromSnapshot(inventoryCash),
      sourceModules: inventoryCash.sourceModules,
      blockers: inventoryCash.blockers,
      redactions: inventoryCash.redactions,
      drillThrough: actionDrillThrough(stockAction),
      actionLink: stockAction,
    })
  }

  return risks
    .sort((left, right) => right.severityScore - left.severityScore)
    .slice(0, 3)
    .map((risk, index) => ({ ...risk, rank: index + 1 }))
}

function buildOwnerMorningBriefZones(input: ComposeOwnerWarRoomInput): BICommandZone[] {
  const { tenantOperating, paymentTruth, inventoryCash, closeReadiness } = input.snapshots
  return [
    zoneFromSnapshot({
      id: "owner-zone-cash-truth",
      organizationId: input.organizationId,
      moduleSlug: "finance",
      title: ownerText("Cash truth", input.locale),
      businessQuestion: ownerText("How much cash is at risk before the owner trusts the day?", input.locale),
      summary:
        paymentTruth.metrics.openSuspenseAmount === null
          ? ownerText("A combined suspense value is unavailable. Review the source currency breakdown.", input.locale)
          : paymentTruth.metrics.openSuspenseAmount > 0
          ? input.locale === "fr"
            ? `${formatBriefAmount(paymentTruth.metrics.openSuspenseAmount, input.locale)} restent en suspens.`
            : `${formatBriefAmount(paymentTruth.metrics.openSuspenseAmount)} remains in suspense.`
          : ownerText("No suspense value is visible in the current payment truth snapshot.", input.locale),
      snapshot: paymentTruth,
      metric: {
        id: "owner-zone-cash-at-risk",
        title: ownerText("Cash at risk", input.locale),
        detail: ownerText("Open suspense amount from payment truth.", input.locale),
        value: paymentTruth.metrics.openSuspenseAmount,
        unit: paymentTruth.metrics.suspenseCurrencyCode ?? "",
        format: "currency",
      },
      action: actionLink({
        id: "owner-zone-open-cash-truth",
        label: ownerText("Open cash", input.locale),
        href: "/dashboard/finance/reconciliation",
        requiredPermission: "payments.reconciliation.read",
        moduleSlug: "payment_reconciliation",
        disabled: false,
        disabledReason: null,
      }),
    }),
    zoneFromSnapshot({
      id: "owner-zone-payroll-finance-forecast",
      organizationId: input.organizationId,
      moduleSlug: "payroll",
      title: ownerText("Payroll finance forecast", input.locale),
      businessQuestion: ownerText("What payroll and statutory cash obligations are coming next?", input.locale),
      summary: tenantOperating.metrics.payrollFinanceForecast.authoritative
        ? input.locale === "fr"
          ? `Les preuves de paie prévoient ${formatBriefAmount(tenantOperating.metrics.payrollFinanceForecast.upcomingNetPayAmount, input.locale)} de salaires nets et ${formatBriefAmount(tenantOperating.metrics.payrollFinanceForecast.upcomingStatutoryLiabilityAmount, input.locale)} d’obligations légales.`
          : `${formatBriefAmount(tenantOperating.metrics.payrollFinanceForecast.upcomingNetPayAmount)} net pay and ${formatBriefAmount(tenantOperating.metrics.payrollFinanceForecast.upcomingStatutoryLiabilityAmount)} statutory liability are forecast from payroll evidence.`
        : presentOwnerForecastMessage(tenantOperating.metrics.payrollFinanceForecast, input.locale),
      snapshot: tenantOperating,
      metric: {
        id: "owner-zone-payroll-forecast-total",
        title: ownerText("Upcoming payroll obligations", input.locale),
        detail: ownerText("Aggregate net-pay plus statutory-liability forecast; person-level payroll amounts are redacted.", input.locale),
        value: tenantOperating.metrics.payrollFinanceForecast.totalUpcomingAmount,
        unit: "XAF",
        format: "currency",
      },
      action: actionLink({
        id: "owner-zone-open-payroll-forecast",
        label: ownerText("Open payroll", input.locale),
        href: "/dashboard/payroll/payments",
        requiredPermission: "payments.reconciliation.read",
        moduleSlug: "payroll",
        disabled: false,
        disabledReason: null,
      }),
    }),
    zoneFromSnapshot({
      id: "owner-zone-stock-to-cash",
      organizationId: input.organizationId,
      moduleSlug: "inventory",
      title: ownerText("Stock-to-cash truth", input.locale),
      businessQuestion: ownerText("Is working capital trapped in stock pressure?", input.locale),
      summary: input.locale === "fr"
        ? `${formatBriefAmount(inventoryCash.metrics.inventoryValue, input.locale)} sont immobilisés en stock ; niveaux de stock nuls : ${inventoryCash.metrics.zeroStockLevelCount}, négatifs : ${inventoryCash.metrics.negativeStockLevelCount}.`
        : `${formatBriefAmount(inventoryCash.metrics.inventoryValue)} is tied up in inventory, with ${inventoryCash.metrics.zeroStockLevelCount} zero-stock levels and ${inventoryCash.metrics.negativeStockLevelCount} negative levels.`,
      snapshot: inventoryCash,
      metric: {
        id: "owner-zone-inventory-value",
        title: ownerText("Inventory value", input.locale),
        detail: ownerText("Current inventory value from the inventory cash snapshot.", input.locale),
        value: inventoryCash.metrics.inventoryValue,
        unit: "XAF",
        format: "currency",
      },
      action: ownerStockAction("owner-zone-open-stock-to-cash", input.actorPermissions, input.locale),
    }),
    zoneFromSnapshot({
      id: "owner-zone-close-readiness",
      organizationId: input.organizationId,
      moduleSlug: "close_assurance",
      title: ownerText("Close readiness", input.locale),
      businessQuestion: ownerText("Can this period be trusted for owner reporting?", input.locale),
      summary: input.locale === "fr"
        ? `Constats encore ouverts : ${closeReadiness.metrics.openFindingCount} ; preuves indisponibles : ${closeReadiness.metrics.unavailableEvidenceCount}.`
        : `${closeReadiness.metrics.openFindingCount} open findings and ${closeReadiness.metrics.unavailableEvidenceCount} unavailable evidence items remain.`,
      snapshot: closeReadiness,
      metric: {
        id: "owner-zone-close-score",
        title: ownerText("Readiness score", input.locale),
        detail: ownerText("Average close readiness score for the active period.", input.locale),
        value: closeReadiness.metrics.averageReadinessScore ?? 0,
        unit: "%",
        format: "score",
      },
      action: actionLink({
        id: "owner-zone-open-close-readiness",
        label: ownerText("Open close", input.locale),
        href: "/dashboard/accounting/close",
        requiredPermission: "accounting.close.read",
        moduleSlug: "close_assurance",
        disabled: false,
        disabledReason: null,
      }),
    }),
    zoneFromSnapshot({
      id: "owner-zone-payment-reconciliation",
      organizationId: input.organizationId,
      moduleSlug: "payment_reconciliation",
      title: ownerText("Payment and reconciliation truth", input.locale),
      businessQuestion: ownerText("Are payment exceptions blocking cash confidence?", input.locale),
      summary: input.locale === "fr"
        ? `Anomalies ouvertes : ${paymentTruth.metrics.openExceptionCount} ; éléments en suspens : ${paymentTruth.metrics.openSuspenseCount} ; transactions en attente : ${paymentTruth.metrics.pendingTransactionCount}.`
        : `${paymentTruth.metrics.openExceptionCount} open exceptions, ${paymentTruth.metrics.openSuspenseCount} suspense items, and ${paymentTruth.metrics.pendingTransactionCount} pending transactions are visible.`,
      snapshot: paymentTruth,
      metric: {
        id: "owner-zone-payment-exceptions",
        title: ownerText("Open payment issues", input.locale),
        detail: ownerText("Exceptions, suspense items, and pending provider transactions.", input.locale),
        value:
          paymentTruth.metrics.openExceptionCount +
          paymentTruth.metrics.openSuspenseCount +
          paymentTruth.metrics.pendingTransactionCount,
        unit: "items",
        format: "number",
      },
      action: actionLink({
        id: "owner-zone-open-payment-reconciliation",
        label: ownerText("Open reconciliation", input.locale),
        href: "/dashboard/finance/reconciliation",
        requiredPermission: "payments.reconciliation.read",
        moduleSlug: "payment_reconciliation",
        disabled: false,
        disabledReason: null,
      }),
    }),
  ]
}

function zoneFromSnapshot(input: {
  id: string
  organizationId: string
  moduleSlug: CommercialModuleSlug
  title: string
  businessQuestion: string
  summary: string
  snapshot: SnapshotResult<unknown>
  metric: Pick<BIKpiCard, "id" | "title" | "detail" | "value" | "unit" | "format">
  action: BIActionLink
}): BICommandZone {
  const state = ownerStateToBIState(stateFromSnapshot(input.snapshot))
  const freshness = freshnessFromSnapshot(input.snapshot)
  const trustState = evidenceGradeToBITrustState(input.snapshot.evidenceGrade)
  const provenance = provenanceFromSnapshot(input.snapshot)
  const primaryMetric: BIKpiCard = {
    id: input.metric.id,
    organizationId: input.organizationId,
    moduleSlug: input.moduleSlug,
    requiredPermission: input.action.requiredPermission,
    title: input.metric.title,
    detail: input.metric.detail,
    value: input.metric.value,
    unit: input.metric.unit,
    format: input.metric.format,
    state,
    evidenceGrade: input.snapshot.evidenceGrade,
    trustState,
    freshness,
    provenance,
    blockers: input.snapshot.blockers,
    redactions: input.snapshot.redactions,
    drillThrough: actionDrillThrough(input.action),
    actionLink: input.action,
  }

  return {
    id: input.id,
    organizationId: input.organizationId,
    moduleSlug: input.moduleSlug,
    title: input.title,
    businessQuestion: input.businessQuestion,
    summary: input.summary,
    state,
    evidenceGrade: input.snapshot.evidenceGrade,
    trustState,
    freshness,
    sourceModules: input.snapshot.sourceModules,
    primaryMetric,
    sections: [],
    cards: [primaryMetric],
    insights: [],
    risks: [],
    flowSteps: [],
    actions: [input.action],
    blockers: input.snapshot.blockers,
    redactions: input.snapshot.redactions,
    drillThrough: primaryMetric.drillThrough,
  }
}

function priorityActionFromItem(input: {
  locale?: OwnerLocale
  item: ActionItem
  signal: BusinessSignal | null
  generatedAt: string
}): OwnerMorningBriefPriorityAction {
  return {
    id: input.item.id,
    title: input.item.title,
    nextStep: input.item.nextStep,
    severity: input.item.severity,
    state: actionItemState(input.item),
    actionLink: actionLinkFromItem(input.item, input.signal, input.locale),
    evidenceGrade: input.item.evidenceGrade,
    trustState: evidenceGradeToBITrustState(input.item.evidenceGrade),
    freshness: freshnessFromSignal(input.signal, input.generatedAt, input.locale),
    dueLabel: dueLabel(input.item.dueAt, input.locale),
    ownerLabel: input.locale === "fr" ? {
      owner: "Dirigeant", accountant: "Comptable", finance: "Finance", stockkeeper: "Gestionnaire de stock",
      purchasing: "Achats", payroll: "Paie", manager: "Responsable",
    }[input.item.assignedRole] : input.item.assignedRole,
    blockers: input.item.blockers,
    redactions: input.item.redactions,
  }
}

function actionLinkFromItem(item: ActionItem, signal: BusinessSignal | null, locale: OwnerLocale = "en"): BIActionLink {
  const disabled = item.status === "expired" || item.status === "resolved" || item.status === "dismissed"
  return actionLink({
    id: `owner-action-link:${item.id}`,
    label: disabled ? ownerText("Unavailable", locale) : ownerText("Open", locale),
    href: item.actionPath,
    requiredPermission: item.requiredPermission,
    additionalRequiredPermissions: item.additionalRequiredPermissions,
    moduleSlug: moduleSlugForAction(item, signal),
    disabled,
    disabledReason: disabled
      ? locale === "fr"
        ? item.status === "expired" ? "Cette action a expiré." : item.status === "resolved" ? "Cette action est résolue." : "Cette action est écartée."
        : `Action is ${item.status}.`
      : null,
  })
}

function actionLink(input: BIActionLink): BIActionLink {
  return input
}

function ownerStockAction(id: string, actorPermissions: readonly string[] = [], locale: OwnerLocale = "en"): BIActionLink {
  const disabled = !["inventory.read", "inventory.items.read"].every(permission =>
    hasRbacPermission(actorPermissions, permission),
  )
  return {
    id,
    label: ownerText("Open stock items", locale),
    href: OWNER_STOCK_WORKSPACE,
    requiredPermission: "inventory.read",
    additionalRequiredPermissions: ["inventory.items.read"],
    moduleSlug: "inventory",
    disabled,
    disabledReason: disabled ? ownerText("Inventory item access is required to open this workspace.", locale) : null,
  }
}

function actionDrillThrough(action: BIActionLink, locale: OwnerLocale = "en"): BIDrillThrough {
  const permissions = {
    requiredPermission: action.requiredPermission,
    ...(action.additionalRequiredPermissions ? { additionalRequiredPermissions: action.additionalRequiredPermissions } : {}),
  }
  if (action.disabled) {
    return { available: false, type: "route", label: action.label, ...permissions, unavailableReason: action.disabledReason ?? ownerText("This workspace is unavailable.", locale) }
  }
  return { available: true, type: "route", label: action.label, href: action.href, ...permissions }
}

function routeDrillThrough(label: string, href: string, requiredPermission: string) {
  return {
    available: true as const,
    type: "route" as const,
    label,
    href,
    requiredPermission,
  }
}

function proofDrillThrough(signal: BusinessSignal, locale: OwnerLocale = "en") {
  if (!signal.proofLink) {
    return routeDrillThrough(ownerText("Open action", locale), signal.actionPath, signal.requiredPermission)
  }
  return {
    available: true as const,
    type: "route_and_proof" as const,
    label: ownerText("Open proof-linked action", locale),
    href: signal.actionPath,
    subjectType: signal.proofLink.subjectType,
    subjectId: signal.proofLink.subjectId,
    requiredPermission: SUBJECT_PERMISSION_MAP[signal.proofLink.subjectType] ?? signal.requiredPermission,
  }
}

function proofSubjectToBI(organizationId: string, subject: OwnerWarRoomProofSubject, locale: OwnerLocale = "en"): BIProofDrawerSubject {
  const moduleSlug = PROOF_MODULE_BY_SUBJECT[subject.subjectType]
  const sourceModules: SnapshotSourceModule[] = [
    moduleSlug === "payment_reconciliation" ? "payments" : moduleSlug === "close_assurance" ? "close" : "accounting",
  ]
  if (subject.enabled && subject.subjectId) {
    return {
      available: true,
      organizationId,
      moduleSlug,
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
      label: subject.label,
      requiredPermission: subject.requiredPermission,
      sourceModules,
    }
  }

  return {
    available: false,
    organizationId,
    moduleSlug,
    label: subject.label,
    requiredPermission: subject.requiredPermission,
    unavailableReason: subject.unavailableReason ?? ownerText("No authorized proof subject is available.", locale),
    sourceModules,
  }
}

function moduleSlugForAction(item: ActionItem, signal: BusinessSignal | null): CommercialModuleSlug {
  return signal?.moduleSlug ?? ACTION_MODULE_BY_SIGNAL_TYPE[item.signalType]
}

function actionItemState(item: ActionItem): BIKpiState {
  if (item.status === "expired") return "stale"
  if (item.blockers.length > 0) return "blocked"
  if (item.redactions.length > 0) return "redacted"
  if (item.status === "assigned") return "partial"
  return "ready"
}

function ownerStateToBIState(state: OwnerWarRoomCardState): BIKpiState {
  if (state === "upgrade_request") return "partial"
  return state
}
function morningBriefState(input: {
  summary: OwnerWarRoomData["summary"]
  blockedCloseItems: number
  staleEvidenceItems: number
}): BIKpiState {
  if (input.summary.blockedCount > 0 || input.blockedCloseItems > 0) return "blocked"
  if (input.staleEvidenceItems > 0) return "stale"
  if (input.summary.criticalCount > 0 || input.summary.highCount > 0) return "partial"
  return "ready"
}

function buildMorningBriefSummary(input: OwnerWarRoomData["morningBrief"]["headlineMetrics"], locale: OwnerLocale = "en") {
  if (locale === "fr") {
    return `Trésorerie à risque : ${formatBriefAmount(input.cashAtRisk, locale)} ; engagements de paie à venir : ${formatBriefAmount(input.payrollForecastTotal, locale)} ; éléments de clôture bloqués : ${input.blockedCloseItems} ; preuves non à jour : ${input.staleEvidenceItems} ; actions liées à des preuves ouvertes depuis hier : ${input.proofLinkedActionCount}.`
  }
  return `${formatBriefAmount(input.cashAtRisk)} cash at risk, ${formatBriefAmount(input.payrollForecastTotal)} upcoming payroll obligations, ${input.blockedCloseItems} blocked close item${input.blockedCloseItems === 1 ? "" : "s"}, ${input.staleEvidenceItems} stale evidence item${input.staleEvidenceItems === 1 ? "" : "s"}, and ${input.proofLinkedActionCount} proof-linked action${input.proofLinkedActionCount === 1 ? "" : "s"} opened since yesterday.`
}

function buildMorningBriefRecommendation(
  input: OwnerWarRoomData["morningBrief"]["headlineMetrics"],
  actorPermissions: readonly string[] = [],
  locale: OwnerLocale = "en",
): { conclusion: string; action: BIActionLink | null } {
  const review = (label: string, frenchLabel: string, href: string, permission: string, moduleSlug: BIActionLink["moduleSlug"]) => {
    const allowed = hasRbacPermission(actorPermissions, permission)
    return actionLink({
      id: "owner-brief-recommended-action",
      label: locale === "fr" ? frenchLabel : label,
      href,
      requiredPermission: permission,
      moduleSlug,
      disabled: !allowed,
      disabledReason: allowed ? null : locale === "fr"
        ? "Vous n’avez pas les droits requis pour consulter cette source. Demandez à un responsable autorisé de l’examiner."
        : "You do not have permission to review this source. Ask an authorized colleague to review it.",
    })
  }
  if (input.cashAtRisk === null || input.cashAtRisk > 0) {
    return {
      conclusion: ownerText("Start with cash risk: suspense must be explained before the owner can trust daily cash.", locale),
      action: review("Review cash suspense", "Examiner les suspens de trésorerie", "/dashboard/finance/reconciliation", "payments.reconciliation.read", "payment_reconciliation"),
    }
  }
  if (input.blockedCloseItems > 0) {
    return {
      conclusion: ownerText("Close evidence is the first blocker: clear missing or critical close items before signoff.", locale),
      action: review("Review close blockers", "Examiner les blocages de clôture", "/dashboard/accounting/close", "accounting.close.read", "close_assurance"),
    }
  }
  if (input.payrollForecastTotal !== null && input.payrollForecastTotal > 0) {
    return {
      conclusion: ownerText("Payroll and statutory obligations are visible: confirm evidence before relying on the owner cash plan.", locale),
      action: review("Review payroll evidence", "Examiner les preuves de paie", "/dashboard/payroll", "payroll.command.read", "payroll"),
    }
  }
  if (input.staleEvidenceItems > 0) {
    return { conclusion: ownerText("Refresh stale evidence before using this view as today's owner truth.", locale), action: null }
  }
  return { conclusion: ownerText("No cash, close, or freshness blocker is visible in the current owner brief.", locale), action: null }
}

function aggregateBriefFreshness(generatedAt: string, snapshots: Array<SnapshotResult<unknown>>): BIFreshness {
  const freshnesses = snapshots.map(freshnessFromSnapshot)
  const state = freshnesses.some((item) => item.state === "blocked")
    ? "blocked"
    : freshnesses.some((item) => item.state === "stale")
      ? "stale"
      : freshnesses.some((item) => item.state === "partial")
        ? "partial"
        : freshnesses.some((item) => item.state === "unknown")
          ? "unknown"
          : "fresh"
  const sourceMaxUpdatedAt = latestDateString(freshnesses.map((item) => item.sourceMaxUpdatedAt).filter(Boolean) as string[])
  const maxAgeMinutes = Math.max(...freshnesses.map((item) => item.maxAgeMinutes ?? 0)) || null
  const stale = freshnesses.some((item) => item.stale)
  const staleReason = freshnesses.find((item) => item.staleReason)?.staleReason ?? null
  return { state, generatedAt, sourceMaxUpdatedAt, maxAgeMinutes, stale, staleReason }
}

function freshnessFromSnapshot(snapshot: SnapshotResult<unknown>): BIFreshness {
  return {
    state: snapshot.freshness.stale ? "stale" : snapshotStatusToFreshnessState(snapshot.status),
    generatedAt: snapshot.freshness.generatedAt,
    sourceMaxUpdatedAt: snapshot.freshness.sourceMaxUpdatedAt,
    maxAgeMinutes: snapshot.freshness.maxAgeMinutes,
    stale: snapshot.freshness.stale,
    staleReason: snapshot.freshness.staleReason,
  }
}

function freshnessFromSignal(signal: BusinessSignal | null, fallbackGeneratedAt: string, locale: OwnerLocale = "en"): BIFreshness {
  if (!signal) {
    return { state: "unknown", generatedAt: fallbackGeneratedAt, sourceMaxUpdatedAt: null, maxAgeMinutes: null, stale: false, staleReason: null }
  }
  return {
    state: signal.status === "expired" ? "stale" : signal.freshness.stale ? "stale" : "fresh",
    generatedAt: signal.freshness.generatedAt,
    sourceMaxUpdatedAt: signal.freshness.sourceMaxUpdatedAt,
    maxAgeMinutes: signal.freshness.maxAgeMinutes,
    stale: signal.status === "expired" || signal.freshness.stale,
    staleReason: signal.status === "expired" ? ownerText("Signal is expired.", locale) : signal.freshness.staleReason,
  }
}

function provenanceFromSnapshot(snapshot: SnapshotResult<unknown>): BIProvenance {
  return {
    organizationId: snapshot.organizationId,
    locationId: snapshot.locationId,
    sourceKind: snapshot.kind,
    sourceId: null,
    sourceHash: snapshot.sourceHash,
    sourceModules: snapshot.sourceModules,
    generatedAt: snapshot.generatedAt,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
  }
}

function provenanceFromSignal(signal: BusinessSignal): BIProvenance {
  return {
    organizationId: signal.organizationId,
    locationId: null,
    sourceKind: signal.sourceSnapshotKind ?? signal.signalType,
    sourceId: signal.id,
    sourceHash: signal.sourceHash ?? null,
    sourceModules: [signal.sourceModule],
    generatedAt: signal.generatedAt,
  }
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function uniqueModules(modules: SnapshotSourceModule[]): SnapshotSourceModule[] {
  return [...new Set(modules)]
}

function latestDateString(values: string[]) {
  let latest: string | null = null
  for (const value of values) {
    if (!latest || new Date(value).getTime() > new Date(latest).getTime()) latest = value
  }
  return latest
}

function sortActionItems(left: ActionItem, right: ActionItem) {
  const score = right.severityScore - left.severityScore
  if (score !== 0) return score
  return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
}

function isOnOrAfter(value: string, cutoff: Date) {
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() >= cutoff.getTime()
}

function dueLabel(value: string, locale: OwnerLocale = "en") {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return `${locale === "fr" ? "Échéance :" : "Due"} ${new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(parsed)}`
}

function formatBriefAmount(value: number | null, locale: OwnerLocale = "en") {
  if (value === null) return locale === "fr" ? "total indisponible" : "total unavailable"
  return `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 0 }).format(value)} XAF`
}

function card(input: {
  id: OwnerWarRoomCardId
  title: string
  detail: string
  value: number | null
  unit: string
  tone: OwnerWarRoomTone
  requiredPermission: string
  href: string
  snapshot: SnapshotResult<unknown>
  sourceModules?: SnapshotSourceModule[]
  blockers?: SnapshotBlocker[]
  redactions?: SnapshotRedaction[]
  state?: OwnerWarRoomCardState
}): OwnerWarRoomMetricCard {
  return {
    id: input.id,
    title: input.title,
    detail: input.detail,
    value: input.value,
    unit: input.unit,
    tone: input.tone,
    state: input.state ?? stateFromSnapshot(input.snapshot),
    evidenceGrade: input.snapshot.evidenceGrade,
    freshness: input.snapshot.freshness,
    sourceModules: input.sourceModules ?? input.snapshot.sourceModules,
    blockers: input.blockers ?? input.snapshot.blockers,
    redactions: input.redactions ?? input.snapshot.redactions,
    requiredPermission: input.requiredPermission,
    href: input.href,
  }
}

function payrollForecastSnapshotBlockers(snapshot: SnapshotResult<unknown>) {
  return snapshot.blockers.filter((blocker) => blocker.gate === "payroll_finance_forecast")
}

function stateFromSnapshot(snapshot: SnapshotResult<unknown>): OwnerWarRoomCardState {
  const mapped = mapUiState(snapshot.uiState)
  if (mapped !== "ready") return mapped
  if (snapshot.redactions.length > 0) return "redacted"
  if (snapshot.blockers.length > 0) return "blocked"
  if (snapshot.freshness.stale) return "stale"
  return "ready"
}

function mapUiState(state: SnapshotUiState): OwnerWarRoomCardState {
  if (state === "fresh") return "ready"
  if (state === "module_unavailable") return "module_unavailable"
  if (state === "safe_error") return "safe_error"
  if (state === "permission_denied") return "permission_denied"
  return state
}

function strongestVisibleGrade(grades: EvidenceGrade[]): EvidenceGrade {
  if (grades.includes("blocked")) return "blocked"
  if (grades.includes("certified")) return "certified"
  if (grades.includes("reconciled")) return "reconciled"
  if (grades.includes("posted")) return "posted"
  if (grades.includes("operational")) return "operational"
  return "raw"
}

function normalizeNow(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

async function getLatestProofSubjectIds(input: {
  organizationId: string
  periodStart: string
  periodEnd: string
}) {
  const periodStart = new Date(input.periodStart)
  const periodEnd = new Date(input.periodEnd)
  const periodWhere = { gte: periodStart, lte: periodEnd }
  const periodOverlap = {
    startDate: { lte: periodEnd },
    endDate: { gte: periodStart },
  }

  const [journalEntry, reconciliationRun, closeRun] = await Promise.all([
    db.journalEntry.findFirst({
      where: {
        organizationId: input.organizationId,
        entryDate: periodWhere,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
    db.reconciliationRun.findFirst({
      where: {
        organizationId: input.organizationId,
        voidedAt: null,
        businessDate: periodWhere,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
    db.closeRun.findFirst({
      where: {
        organizationId: input.organizationId,
        voidedAt: null,
        period: periodOverlap,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
  ])

  return {
    "journal.entry": journalEntry?.id ?? null,
    "reconciliation.run": reconciliationRun?.id ?? null,
    "close.run": closeRun?.id ?? null,
  }
}
