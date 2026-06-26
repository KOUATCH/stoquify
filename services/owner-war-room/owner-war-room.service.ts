import "server-only"

import {
  evidenceGradeToBITrustState,
  snapshotStatusToFreshnessState,
} from "@/services/bi/bi-contracts"
import type {
  BIActionLink,
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
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import { getModuleControlCenterData } from "@/services/modules/module-entitlement.service"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import type { ActionItem, BusinessSignal } from "@/services/signals/business-signal-contracts"
import { buildBusinessSignalsFromSnapshots } from "@/services/signals/business-signal-rules.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import type {
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

type OwnerWarRoomInput = {
  organizationId: string
  actorId?: string | null
  actorPermissions: readonly string[]
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

export async function getOwnerWarRoomData(input: OwnerWarRoomInput): Promise<OwnerWarRoomData> {
  const scope = {
    organizationId: input.organizationId,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    maxAgeMinutes: input.maxAgeMinutes ?? null,
    now: input.now ?? null,
  }

  const [paymentTruth, inventoryCash, closeReadiness, moduleControl] = await Promise.all([
    getPaymentTruthSnapshot(scope),
    getInventoryCashSnapshot(scope),
    getCloseReadinessSnapshot(scope),
    getModuleControlCenterData({
      organizationId: input.organizationId,
      actorId: input.actorId,
      actorPermissions: input.actorPermissions,
      now: input.now ?? null,
    }),
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
  const proofSubjectIds = await getLatestProofSubjectIds({
    organizationId: input.organizationId,
    periodStart: tenantOperating.periodStart,
    periodEnd: tenantOperating.periodEnd,
  })

  return composeOwnerWarRoomData({
    organizationId: input.organizationId,
    organizationName: moduleControl.organizationName,
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

export function composeOwnerWarRoomData(input: ComposeOwnerWarRoomInput): OwnerWarRoomData {
  const { tenantOperating, paymentTruth, inventoryCash, closeReadiness } = input.snapshots
  const cards: OwnerWarRoomMetricCard[] = [
    card({
      id: "cash_at_risk",
      title: "Cash at risk",
      detail: "Unresolved payment suspense value that should be explained before owners trust cash.",
      value: paymentTruth.metrics.openSuspenseAmount,
      unit: "value",
      tone: paymentTruth.metrics.openSuspenseAmount > 0 ? "danger" : "success",
      requiredPermission: "payments.reconciliation.read",
      href: "/dashboard/finance/reconciliation",
      snapshot: paymentTruth,
    }),
    card({
      id: "reconciliation_exceptions",
      title: "Reconciliation exceptions",
      detail: "Open payment exceptions, critical issues, suspense items, and pending provider transactions.",
      value:
        paymentTruth.metrics.openExceptionCount +
        paymentTruth.metrics.openSuspenseCount +
        paymentTruth.metrics.pendingTransactionCount,
      unit: "items",
      tone: paymentTruth.metrics.criticalExceptionCount > 0 ? "danger" : "gold",
      requiredPermission: "payments.reconciliation.read",
      href: "/dashboard/finance/payments",
      snapshot: paymentTruth,
    }),
    card({
      id: "stock_cash_exposure",
      title: "Stock cash exposure",
      detail: "Inventory value tied up in stock, with zero or negative-stock pressure highlighted.",
      value: inventoryCash.metrics.inventoryValue,
      unit: "value",
      tone:
        inventoryCash.metrics.negativeStockLevelCount > 0 || inventoryCash.metrics.zeroStockLevelCount > 0
          ? "gold"
          : "spruce",
      requiredPermission: "inventory.read",
      href: "/dashboard/inventory/stock",
      snapshot: inventoryCash,
    }),
    card({
      id: "supplier_commitments",
      title: "Supplier commitments",
      detail: "Pending purchase orders that may soon become cash obligations or receiving blockers.",
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
      title: "Payroll exposure",
      detail: "Approved or paid payroll runs are counted without exposing person-level amounts.",
      value: tenantOperating.metrics.approvedOrPaidPayrollRunCount,
      unit: "runs",
      tone: tenantOperating.metrics.approvedOrPaidPayrollRunCount > 0 ? "gold" : "muted",
      requiredPermission: "payroll.read",
      href: "/dashboard/payroll",
      snapshot: tenantOperating,
      redactions: [
        ...tenantOperating.redactions,
        {
          id: "owner-war-room-payroll-person-values-redacted",
          field: "payroll.personLevelAmounts",
          reason: "The Owner War Room shows payroll pressure counts only; employee-level values stay inside payroll.",
          policy: "KONTAVA_SENSITIVE_PAYROLL_EVIDENCE",
        },
      ],
      state: tenantOperating.metrics.approvedOrPaidPayrollRunCount > 0 ? "redacted" : undefined,
      sourceModules: ["payroll", "accounting", "finance"],
    }),
    card({
      id: "close_readiness",
      title: "Close readiness",
      detail: "Open findings, unavailable evidence, readiness score, and close blockers for the active period.",
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
      title: "Action queue",
      detail: "Permission-filtered owner actions generated from the current business signals.",
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
      title: "Module observe",
      detail: "Modules that would be blocked under entitlement enforcement, shown only as controlled upgrade pressure.",
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
      requiredPermission: "system.settings.read",
      href: "/dashboard/settings/modules",
    },
  ]

  const strips: OwnerWarRoomStrip[] = [
    {
      id: "cash_leakage_radar",
      title: "Cash Leakage Radar MVP",
      detail:
        paymentTruth.metrics.openSuspenseCount > 0 || paymentTruth.metrics.criticalExceptionCount > 0
          ? "Cash truth has unresolved suspense or critical exceptions. Owners should clear these before trusting daily cash."
          : "No critical cash leakage signal is visible from the current payment snapshot.",
      severity: paymentTruth.metrics.criticalExceptionCount > 0 ? "critical" : paymentTruth.metrics.openSuspenseCount > 0 ? "high" : "info",
      evidenceGrade: paymentTruth.evidenceGrade,
      state: stateFromSnapshot(paymentTruth),
      blockers: paymentTruth.blockers,
      redactions: paymentTruth.redactions,
    },
    {
      id: "close_autopilot",
      title: "Close Autopilot strip",
      detail:
        closeReadiness.metrics.openFindingCount > 0
          ? "The close still has findings or unavailable evidence. Work the blockers before signoff."
          : "Close readiness has no open blocker surfaced by the current snapshot.",
      severity: closeReadiness.metrics.criticalOpenFindingCount > 0 ? "critical" : closeReadiness.metrics.openFindingCount > 0 ? "high" : "info",
      evidenceGrade: closeReadiness.evidenceGrade,
      state: stateFromSnapshot(closeReadiness),
      blockers: closeReadiness.blockers,
      redactions: closeReadiness.redactions,
    },
    {
      id: "module_control",
      title: "Module Control observe strip",
      detail:
        input.moduleControl.summary.wouldBlockCount > 0
          ? "Observe mode is showing modules that would be hidden after enforcement. Owners can request an upgrade from controlled surfaces."
          : "Module observe mode is clean for the current tenant entitlement set.",
      severity: input.moduleControl.summary.wouldBlockCount > 0 ? "medium" : "info",
      evidenceGrade: "operational",
      state: input.moduleControl.summary.wouldBlockCount > 0 ? "upgrade_request" : "ready",
      blockers: [],
      redactions: [],
    },
  ]

  const proofSubjects = buildOwnerProofSubjects(input.proofSubjectIds)
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
): OwnerWarRoomProofSubject[] {
  return [
    {
      subjectType: "journal.entry",
      subjectId: proofSubjectIds?.["journal.entry"] ?? "",
      label: "Ledger proof",
      detail: "Inspect ledger evidence when a posted journal entry is selected from accounting.",
      requiredPermission: SUBJECT_PERMISSION_MAP["journal.entry"],
      enabled: Boolean(proofSubjectIds?.["journal.entry"]),
      unavailableReason: proofSubjectIds?.["journal.entry"]
        ? null
        : "No posted journal entry is visible in this period.",
    },
    {
      subjectType: "reconciliation.run",
      subjectId: proofSubjectIds?.["reconciliation.run"] ?? "",
      label: "Reconciliation proof",
      detail: "Inspect payment reconciliation evidence and blockers for the selected run.",
      requiredPermission: SUBJECT_PERMISSION_MAP["reconciliation.run"],
      enabled: Boolean(proofSubjectIds?.["reconciliation.run"]),
      unavailableReason: proofSubjectIds?.["reconciliation.run"]
        ? null
        : "No reconciliation run is visible in this period.",
    },
    {
      subjectType: "close.run",
      subjectId: proofSubjectIds?.["close.run"] ?? "",
      label: "Close proof",
      detail: "Inspect close evidence, findings, redactions, and readiness blockers.",
      requiredPermission: SUBJECT_PERMISSION_MAP["close.run"],
      enabled: Boolean(proofSubjectIds?.["close.run"]),
      unavailableReason: proofSubjectIds?.["close.run"]
        ? null
        : "No close run is visible in this period.",
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
  const topVisibleAction = [...input.actionQueue.actionItems].sort(sortActionItems)[0] ?? null
  const priorityActions = proofLinkedActionItems.map((item) =>
    priorityActionFromItem({ item, signal: signalById.get(item.signalId) ?? null, generatedAt: input.generatedAt }),
  )
  const headlineMetrics = {
    cashAtRisk: paymentTruth.metrics.openSuspenseAmount,
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
  const primaryAction =
    priorityActions[0]?.actionLink ??
    (topVisibleAction ? actionLinkFromItem(topVisibleAction, signalById.get(topVisibleAction.signalId) ?? null) : null)
  const proofDrawerSubjects = proofSubjects.map((subject) => proofSubjectToBI(input.organizationId, subject))
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
      title: "Owner morning brief",
      summary: buildMorningBriefSummary(headlineMetrics),
      conclusion: buildMorningBriefConclusion(headlineMetrics),
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
      primaryAction,
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
        "Acknowledgement is held in the current browser session; no accounting, close, cash, inventory, payroll, or evidence record is mutated.",
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

  if (input.headlineMetrics.cashAtRisk > 0) {
    changes.push({
      id: "owner-morning-brief-cash-at-risk",
      organizationId: input.input.organizationId,
      moduleSlug: "payment_reconciliation",
      requiredPermission: "payments.reconciliation.read",
      title: "Cash at risk is visible since yesterday",
      detail: "Open suspense value is still present in the payment truth snapshot.",
      businessImpact: "Daily cash remains ambiguous until suspense is explained with reconciliation evidence.",
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
      drillThrough: routeDrillThrough("Open reconciliation", "/dashboard/finance/payments/reconciliation", "payments.reconciliation.read"),
      actionLink: actionLink({
        id: "owner-morning-brief-open-cash-risk",
        label: "Review cash risk",
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
      title: "Close blockers need owner attention",
      detail: "The close readiness snapshot still has blocked runs, critical findings, or unavailable evidence.",
      businessImpact: "Reporting confidence stays limited until close evidence is cleared.",
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
      drillThrough: routeDrillThrough("Open close readiness", "/dashboard/accounting/close", "accounting.close.read"),
      actionLink: actionLink({
        id: "owner-morning-brief-open-close-risk",
        label: "Review close",
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
      title: "Evidence freshness needs review",
      detail: "One or more owner-war-room evidence surfaces are stale or signal-stale.",
      businessImpact: "The owner should refresh the underlying workflow before trusting the morning view.",
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
      drillThrough: routeDrillThrough("Open owner war room", "/dashboard/owner-war-room", "dashboard.read"),
      actionLink: actionLink({
        id: "owner-morning-brief-open-stale-evidence",
        label: "Review evidence",
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
      businessImpact: signal?.businessImpact ?? "A proof-linked action is open for owner review.",
      direction: "new",
      severity: item.severity,
      state: actionItemState(item),
      evidenceGrade: item.evidenceGrade,
      trustState: evidenceGradeToBITrustState(item.evidenceGrade),
      freshness: freshnessFromSignal(signal, item.createdAt),
      sourceModules: signal ? [signal.sourceModule] : ["dashboard"],
      changedAt: item.createdAt,
      previousValue: null,
      currentValue: item.severityScore,
      unit: "score",
      format: "score",
      provenance: signal ? provenanceFromSignal(signal) : null,
      blockers: item.blockers,
      redactions: item.redactions,
      drillThrough: signal ? proofDrillThrough(signal) : null,
      actionLink: actionLinkFromItem(item, signal),
    })
  }

  return changes.slice(0, 5)
}
function buildOwnerMorningBriefRisks(input: {
  input: ComposeOwnerWarRoomInput
  headlineMetrics: OwnerWarRoomData["morningBrief"]["headlineMetrics"]
  freshness: BIFreshness
}): BIRiskRank[] {
  const { paymentTruth, closeReadiness, inventoryCash } = input.input.snapshots
  const risks: Array<Omit<BIRiskRank, "rank">> = []

  if (input.headlineMetrics.cashAtRisk > 0) {
    risks.push({
      id: "owner-risk-cash-at-risk",
      organizationId: input.input.organizationId,
      moduleSlug: "payment_reconciliation",
      title: "Cash at risk",
      detail: "Payment suspense value is still open.",
      businessImpact: "Unresolved suspense weakens the owner's trust in daily cash.",
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
      drillThrough: routeDrillThrough("Open reconciliation", "/dashboard/finance/payments/reconciliation", "payments.reconciliation.read"),
      actionLink: actionLink({
        id: "owner-risk-open-cash-at-risk",
        label: "Open cash risk",
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
      title: "Blocked close items",
      detail: "Close readiness still has blocked runs, critical findings, or unavailable evidence.",
      businessImpact: "The period cannot become owner-trustworthy until close blockers are cleared.",
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
      drillThrough: routeDrillThrough("Open close", "/dashboard/accounting/close", "accounting.close.read"),
      actionLink: actionLink({
        id: "owner-risk-open-close-blockers",
        label: "Open close",
        href: "/dashboard/accounting/close",
        requiredPermission: "accounting.close.read",
        moduleSlug: "close_assurance",
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
      title: "Stale evidence",
      detail: "At least one evidence-backed owner metric is stale.",
      businessImpact: "Refresh or investigate before using the brief as today's truth.",
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
      drillThrough: routeDrillThrough("Open owner war room", "/dashboard/owner-war-room", "dashboard.read"),
      actionLink: actionLink({
        id: "owner-risk-open-stale-evidence",
        label: "Review evidence",
        href: "/dashboard/owner-war-room",
        requiredPermission: "dashboard.read",
        moduleSlug: "dashboard",
        disabled: false,
        disabledReason: null,
      }),
    })
  }
  if (inventoryCash.metrics.zeroStockLevelCount > 0 || inventoryCash.metrics.negativeStockLevelCount > 0) {
    risks.push({
      id: "owner-risk-stock-cash-exposure",
      organizationId: input.input.organizationId,
      moduleSlug: "inventory",
      title: "Stock-to-cash exposure",
      detail: "Zero or negative stock levels can turn working capital into missed sales.",
      businessImpact: "Resolve stock pressure before it becomes a cash leakage story.",
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
      drillThrough: routeDrillThrough("Open stock", "/dashboard/inventory/stock", "inventory.read"),
      actionLink: actionLink({
        id: "owner-risk-open-stock-cash-exposure",
        label: "Open stock",
        href: "/dashboard/inventory/stock",
        requiredPermission: "inventory.read",
        moduleSlug: "inventory",
        disabled: false,
        disabledReason: null,
      }),
    })
  }

  return risks
    .sort((left, right) => right.severityScore - left.severityScore)
    .slice(0, 3)
    .map((risk, index) => ({ ...risk, rank: index + 1 }))
}

function buildOwnerMorningBriefZones(input: ComposeOwnerWarRoomInput): BICommandZone[] {
  const { paymentTruth, inventoryCash, closeReadiness } = input.snapshots
  return [
    zoneFromSnapshot({
      id: "owner-zone-cash-truth",
      organizationId: input.organizationId,
      moduleSlug: "finance",
      title: "Cash truth",
      businessQuestion: "How much cash is at risk before the owner trusts the day?",
      summary:
        paymentTruth.metrics.openSuspenseAmount > 0
          ? `${formatBriefAmount(paymentTruth.metrics.openSuspenseAmount)} remains in suspense.`
          : "No suspense value is visible in the current payment truth snapshot.",
      snapshot: paymentTruth,
      metric: {
        id: "owner-zone-cash-at-risk",
        title: "Cash at risk",
        detail: "Open suspense amount from payment truth.",
        value: paymentTruth.metrics.openSuspenseAmount,
        unit: "XAF",
        format: "currency",
      },
      action: actionLink({
        id: "owner-zone-open-cash-truth",
        label: "Open cash",
        href: "/dashboard/finance/reconciliation",
        requiredPermission: "payments.reconciliation.read",
        moduleSlug: "payment_reconciliation",
        disabled: false,
        disabledReason: null,
      }),
    }),
    zoneFromSnapshot({
      id: "owner-zone-stock-to-cash",
      organizationId: input.organizationId,
      moduleSlug: "inventory",
      title: "Stock-to-cash truth",
      businessQuestion: "Is working capital trapped in stock pressure?",
      summary: `${formatBriefAmount(inventoryCash.metrics.inventoryValue)} is tied up in inventory, with ${inventoryCash.metrics.zeroStockLevelCount} zero-stock levels and ${inventoryCash.metrics.negativeStockLevelCount} negative levels.`,
      snapshot: inventoryCash,
      metric: {
        id: "owner-zone-inventory-value",
        title: "Inventory value",
        detail: "Current inventory value from the inventory cash snapshot.",
        value: inventoryCash.metrics.inventoryValue,
        unit: "XAF",
        format: "currency",
      },
      action: actionLink({
        id: "owner-zone-open-stock-to-cash",
        label: "Open stock",
        href: "/dashboard/inventory/stock",
        requiredPermission: "inventory.read",
        moduleSlug: "inventory",
        disabled: false,
        disabledReason: null,
      }),
    }),
    zoneFromSnapshot({
      id: "owner-zone-close-readiness",
      organizationId: input.organizationId,
      moduleSlug: "close_assurance",
      title: "Close readiness",
      businessQuestion: "Can this period be trusted for owner reporting?",
      summary: `${closeReadiness.metrics.openFindingCount} open findings and ${closeReadiness.metrics.unavailableEvidenceCount} unavailable evidence items remain.`,
      snapshot: closeReadiness,
      metric: {
        id: "owner-zone-close-score",
        title: "Readiness score",
        detail: "Average close readiness score for the active period.",
        value: closeReadiness.metrics.averageReadinessScore ?? 0,
        unit: "%",
        format: "score",
      },
      action: actionLink({
        id: "owner-zone-open-close-readiness",
        label: "Open close",
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
      title: "Payment and reconciliation truth",
      businessQuestion: "Are payment exceptions blocking cash confidence?",
      summary: `${paymentTruth.metrics.openExceptionCount} open exceptions, ${paymentTruth.metrics.openSuspenseCount} suspense items, and ${paymentTruth.metrics.pendingTransactionCount} pending transactions are visible.`,
      snapshot: paymentTruth,
      metric: {
        id: "owner-zone-payment-exceptions",
        title: "Open payment issues",
        detail: "Exceptions, suspense items, and pending provider transactions.",
        value:
          paymentTruth.metrics.openExceptionCount +
          paymentTruth.metrics.openSuspenseCount +
          paymentTruth.metrics.pendingTransactionCount,
        unit: "items",
        format: "number",
      },
      action: actionLink({
        id: "owner-zone-open-payment-reconciliation",
        label: "Open payments",
        href: "/dashboard/finance/payments",
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
    drillThrough: routeDrillThrough(input.action.label, input.action.href, input.action.requiredPermission),
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
    actionLink: actionLinkFromItem(input.item, input.signal),
    evidenceGrade: input.item.evidenceGrade,
    trustState: evidenceGradeToBITrustState(input.item.evidenceGrade),
    freshness: freshnessFromSignal(input.signal, input.generatedAt),
    dueLabel: dueLabel(input.item.dueAt),
    ownerLabel: input.item.assignedRole,
    blockers: input.item.blockers,
    redactions: input.item.redactions,
  }
}

function actionLinkFromItem(item: ActionItem, signal: BusinessSignal | null): BIActionLink {
  const disabled = item.status === "expired" || item.status === "resolved" || item.status === "dismissed"
  return actionLink({
    id: `owner-action-link:${item.id}`,
    label: disabled ? "Unavailable" : "Open",
    href: item.actionPath,
    requiredPermission: item.requiredPermission,
    moduleSlug: moduleSlugForAction(item, signal),
    disabled,
    disabledReason: disabled ? `Action is ${item.status}.` : null,
  })
}

function actionLink(input: BIActionLink): BIActionLink {
  return input
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

function proofDrillThrough(signal: BusinessSignal) {
  if (!signal.proofLink) {
    return routeDrillThrough("Open action", signal.actionPath, signal.requiredPermission)
  }
  return {
    available: true as const,
    type: "route_and_proof" as const,
    label: "Open proof-linked action",
    href: signal.actionPath,
    subjectType: signal.proofLink.subjectType,
    subjectId: signal.proofLink.subjectId,
    requiredPermission: SUBJECT_PERMISSION_MAP[signal.proofLink.subjectType] ?? signal.requiredPermission,
  }
}

function proofSubjectToBI(organizationId: string, subject: OwnerWarRoomProofSubject): BIProofDrawerSubject {
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
    unavailableReason: subject.unavailableReason ?? "No authorized proof subject is available.",
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

function buildMorningBriefSummary(input: OwnerWarRoomData["morningBrief"]["headlineMetrics"]) {
  return `${formatBriefAmount(input.cashAtRisk)} cash at risk, ${input.blockedCloseItems} blocked close item${input.blockedCloseItems === 1 ? "" : "s"}, ${input.staleEvidenceItems} stale evidence item${input.staleEvidenceItems === 1 ? "" : "s"}, and ${input.proofLinkedActionCount} proof-linked action${input.proofLinkedActionCount === 1 ? "" : "s"} opened since yesterday.`
}

function buildMorningBriefConclusion(input: OwnerWarRoomData["morningBrief"]["headlineMetrics"]) {
  if (input.cashAtRisk > 0) {
    return "Start with cash risk: suspense must be explained before the owner can trust daily cash."
  }
  if (input.blockedCloseItems > 0) {
    return "Close evidence is the first blocker: clear missing or critical close items before signoff."
  }
  if (input.staleEvidenceItems > 0) {
    return "Refresh stale evidence before using this view as today's owner truth."
  }
  return "No cash, close, or freshness blocker is visible in the current owner brief."
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

function freshnessFromSignal(signal: BusinessSignal | null, fallbackGeneratedAt: string): BIFreshness {
  if (!signal) {
    return { state: "unknown", generatedAt: fallbackGeneratedAt, sourceMaxUpdatedAt: null, maxAgeMinutes: null, stale: false, staleReason: null }
  }
  return {
    state: signal.status === "expired" ? "stale" : signal.freshness.stale ? "stale" : "fresh",
    generatedAt: signal.freshness.generatedAt,
    sourceMaxUpdatedAt: signal.freshness.sourceMaxUpdatedAt,
    maxAgeMinutes: signal.freshness.maxAgeMinutes,
    stale: signal.status === "expired" || signal.freshness.stale,
    staleReason: signal.status === "expired" ? "Signal is expired." : signal.freshness.staleReason,
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

function dueLabel(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return `Due ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(parsed)}`
}

function formatBriefAmount(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} XAF`
}

function card(input: {
  id: OwnerWarRoomCardId
  title: string
  detail: string
  value: number
  unit: string
  tone: OwnerWarRoomTone
  requiredPermission: string
  href: string
  snapshot: SnapshotResult<unknown>
  sourceModules?: SnapshotSourceModule[]
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
    blockers: input.snapshot.blockers,
    redactions: input.redactions ?? input.snapshot.redactions,
    requiredPermission: input.requiredPermission,
    href: input.href,
  }
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

