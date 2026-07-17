import "server-only"

import {
  createSnapshotKpi,
  normalizeSnapshotFreshness,
} from "@/services/bi/bi-evidence-adapter.service"
import { evidenceGradeToBITrustState } from "@/services/bi/bi-contracts"
import type {
  BIActionLink,
  BIBlocker,
  BIChangeEvent,
  BIFreshness,
  BIKpiCard,
  BIKpiState,
  BIProofDrawerSubject,
  BIRedaction,
  BIRiskRank,
  BISeverity,
} from "@/services/bi/bi-contracts"
import type { EvidenceGrade, ProofTrailSubjectType } from "@/services/evidence/evidence-contracts"
import { SUBJECT_PERMISSION_MAP } from "@/services/evidence/evidence-contracts"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import { getModuleControlCenterData } from "@/services/modules/module-entitlement.service"
import { getCashDrawerDashboard } from "@/services/pos/drawer-dashboard.service"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import type {
  ActionItem,
  BusinessSignal,
} from "@/services/signals/business-signal-contracts"
import {
  buildBusinessSignalsFromSnapshots,
  createBusinessSignalFromFact,
} from "@/services/signals/business-signal-rules.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import type {
  PaymentTruthMetrics,
  PayrollFinanceForecastMetrics,
  SnapshotBlocker,
  SnapshotRedaction,
  SnapshotResult,
  SnapshotSourceModule,
} from "@/services/snapshots/snapshot-contracts"
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service"
import { db } from "@/prisma/db"

import type {
  CashCommandActionItem,
  CashCommandData,
  CashCommandDrawerState,
  CashCommandSummary,
  CashCommandTrustSignal,
  ComposeCashCommandInput,
} from "./cash-command-contracts"

type CashCommandInput = {
  organizationId: string
  actorId?: string | null
  actorPermissions: readonly string[]
  periodStart?: Date | string | null
  periodEnd?: Date | string | null
  maxAgeMinutes?: number | null
  now?: Date | string | null
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

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

export async function getCashCommandData(input: CashCommandInput): Promise<CashCommandData> {
  const scope = {
    organizationId: input.organizationId,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    maxAgeMinutes: input.maxAgeMinutes ?? null,
    now: input.now ?? null,
  }
  const drawerScope = drawerScopeFromInput(input)

  const [tenantOperating, paymentTruth, inventoryCash, closeReadiness, drawerDashboard, moduleControl] =
    await Promise.all([
      getTenantOperatingSnapshot(scope),
      getPaymentTruthSnapshot(scope),
      getInventoryCashSnapshot(scope),
      getCloseReadinessSnapshot(scope),
      getCashDrawerDashboard({
        organizationId: input.organizationId,
        ...drawerScope,
      }),
      getModuleControlCenterData({
        organizationId: input.organizationId,
        actorId: input.actorId,
        actorPermissions: input.actorPermissions,
        now: input.now ?? null,
      }),
    ])

  const signals = [
    ...buildBusinessSignalsFromSnapshots({
      organizationId: input.organizationId,
      snapshots: [tenantOperating, paymentTruth, inventoryCash, closeReadiness],
      now: input.now ?? null,
    }),
    ...buildCashDrawerSignals({
      organizationId: input.organizationId,
      drawerDashboard,
      now: input.now ?? null,
    }),
  ]
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

  return composeCashCommandData({
    organizationId: input.organizationId,
    organizationName: moduleControl.organizationName,
    generatedAt: normalizeNow(input.now).toISOString(),
    currency: drawerDashboard.organization.currency || "XAF",
    snapshots: {
      tenantOperating,
      paymentTruth,
      inventoryCash,
      closeReadiness,
    },
    drawerDashboard,
    actionQueue,
    moduleControl,
    proofSubjectIds,
  })
}

export function composeCashCommandData(input: ComposeCashCommandInput): CashCommandData {
  const { tenantOperating, paymentTruth, inventoryCash, closeReadiness } = input.snapshots
  const payrollForecast = tenantOperating.metrics.payrollFinanceForecast
  const drawerState = buildDrawerState(input.drawerDashboard)
  const proofSubjects = buildProofSubjects(input)
  const paymentTransactionProofSubject = proofSubject(proofSubjects, "payment.transaction")
  const reconciliationProofSubject = proofSubject(proofSubjects, "reconciliation.run")
  const closeProofSubject = proofSubject(proofSubjects, "close.run")
  const journalProofSubject = proofSubject(proofSubjects, "journal.entry")
  const cashAction = actionLink({
    id: "cash-command-open-payments",
    label: "Open payments",
    href: "/dashboard/finance/payments",
    requiredPermission: "finance.read",
    moduleSlug: "finance",
  })
  const reconciliationAction = actionLink({
    id: "cash-command-open-reconciliation",
    label: "Open reconciliation",
    href: "/dashboard/finance/reconciliation",
    requiredPermission: "payments.reconciliation.read",
    moduleSlug: "payment_reconciliation",
  })
  const drawerAction = actionLink({
    id: "cash-command-open-drawers",
    label: "Open drawers",
    href: "/dashboard/finance/cash-drawer",
    requiredPermission: "CASH_DRAWER_READ",
    moduleSlug: "cash_drawer",
  })
  const inventoryAction = actionLink({
    id: "cash-command-open-stock",
    label: "Open stock",
    href: "/dashboard/inventory/stock",
    requiredPermission: "inventory.read",
    moduleSlug: "inventory",
  })
  const payrollAction = actionLink({
    id: "cash-command-open-payroll-balances",
    label: "Open payroll payments",
    href: "/dashboard/payroll/payments",
    requiredPermission: "payroll.payments.reconcile",
    moduleSlug: "payroll",
  })

  const cards: BIKpiCard[] = [
    createSnapshotKpi({
      id: "cash_collected",
      title: "Cash collected",
      detail: "Collected payment value in the selected operating period.",
      value: tenantOperating.metrics.cashCollected,
      unit: input.currency,
      format: "currency",
      moduleSlug: "finance",
      requiredPermission: "finance.read",
      snapshot: tenantOperating,
      href: "/dashboard/finance/payments",
      actionLink: cashAction,
      proofSubject: availableProof(journalProofSubject),
      drillThroughLabel: "Open cash collection proof",
    }),
    createSnapshotKpi({
      id: "unreconciled_cash",
      title: "Unreconciled cash",
      detail: "Unresolved suspense value that should be explained before daily cash is trusted.",
      value: paymentTruth.metrics.openSuspenseAmount,
      unit: input.currency,
      format: "currency",
      moduleSlug: "payment_reconciliation",
      requiredPermission: "payments.reconciliation.read",
      snapshot: paymentTruth,
      href: "/dashboard/finance/reconciliation",
      actionLink: reconciliationAction,
      proofSubject: availableProof(reconciliationProofSubject),
      drillThroughLabel: "Open reconciliation proof",
    }),
    createSnapshotKpi({
      id: "open_suspense",
      title: "Open suspense",
      detail: "Suspense items still waiting for classification, match, posting, or resolution.",
      value: paymentTruth.metrics.openSuspenseCount,
      unit: "items",
      format: "number",
      moduleSlug: "payment_reconciliation",
      requiredPermission: "payments.reconciliation.read",
      snapshot: paymentTruth,
      href: "/dashboard/finance/reconciliation",
      actionLink: reconciliationAction,
      proofSubject: availableProof(reconciliationProofSubject),
      drillThroughLabel: "Open suspense proof",
    }),
    drawerRiskCard({
      input,
      drawerState,
      drawerAction,
    }),
    createSnapshotKpi({
      id: "provider_risk",
      title: "Provider risk",
      detail:
        "Pending provider transactions, critical exceptions, and inactive provider accounts that weaken cash confidence.",
      value: providerRiskCount(paymentTruth),
      unit: "issues",
      format: "number",
      moduleSlug: "payment_reconciliation",
      requiredPermission: "payments.reconciliation.read",
      snapshot: paymentTruth,
      href: "/dashboard/finance/reconciliation",
      actionLink: reconciliationAction,
      proofSubject: availableProof(paymentTransactionProofSubject) ?? availableProof(reconciliationProofSubject),
      drillThroughLabel: "Open provider proof",
    }),
    createSnapshotKpi({
      id: "employee_balance_recovery",
      title: "Employee balance recovery",
      detail: "Open payroll recovery or refund cases that affect net-pay clearing and cash planning.",
      value: tenantOperating.metrics.employeeBalanceOutstandingAmount,
      unit: input.currency,
      format: "currency",
      moduleSlug: "payroll",
      requiredPermission: "payroll.payments.reconcile",
      snapshot: tenantOperating,
      href: "/dashboard/payroll/payments",
      actionLink: payrollAction,
      drillThroughLabel: "Open employee balance proof",
    }),
    payrollForecastCard(
      createSnapshotKpi({
        id: "upcoming_payroll_net_pay",
        title: "Upcoming net pay",
        detail: payrollForecast.nextPayDate
          ? `Aggregate payroll payment batch value due ${dateLabel(payrollForecast.nextPayDate)}; person-level amounts stay redacted.`
          : payrollForecast.message,
        value: payrollForecast.upcomingNetPayAmount,
        unit: input.currency,
        format: "currency",
        moduleSlug: "payroll",
        requiredPermission: "payroll.payments.reconcile",
        snapshot: tenantOperating,
        href: "/dashboard/payroll/payments",
        actionLink: payrollAction,
        drillThroughLabel: "Open payroll payment forecast proof",
      }),
      payrollForecast,
    ),
    payrollForecastCard(
      createSnapshotKpi({
        id: "upcoming_statutory_liability",
        title: "Upcoming statutory liability",
        detail: payrollForecast.nextDeclarationDueDate
          ? `Aggregate payroll declaration liability due ${dateLabel(payrollForecast.nextDeclarationDueDate)}; person-level amounts stay redacted.`
          : payrollForecast.message,
        value: payrollForecast.upcomingStatutoryLiabilityAmount,
        unit: input.currency,
        format: "currency",
        moduleSlug: "payroll",
        requiredPermission: "payroll.declarations.manage",
        snapshot: tenantOperating,
        href: "/dashboard/payroll/declarations",
        actionLink: actionLink({
          id: "cash-command-open-payroll-declarations",
          label: "Open declarations",
          href: "/dashboard/payroll/declarations",
          requiredPermission: "payroll.declarations.manage",
          moduleSlug: "payroll",
        }),
        drillThroughLabel: "Open payroll declaration forecast proof",
      }),
      payrollForecast,
    ),
    createSnapshotKpi({
      id: "stock_cash_buffer",
      title: "Stock cash buffer",
      detail: "Inventory value currently tying cash to stock, including zero or negative-stock pressure.",
      value: inventoryCash.metrics.inventoryValue,
      unit: input.currency,
      format: "currency",
      moduleSlug: "inventory",
      requiredPermission: "inventory.read",
      snapshot: inventoryCash,
      href: "/dashboard/inventory/stock",
      actionLink: inventoryAction,
      drillThroughLabel: "Open stock-to-cash view",
    }),
  ]

  const summary = buildSummary(input, cards, drawerState)
  const freshness = aggregateFreshness(input.generatedAt, cards.map((card) => card.freshness))
  const evidenceGrade = strongestVisibleGrade(cards.map((card) => card.evidenceGrade))
  const state = commandState(cards, input.actionQueue.summary.total)
  const primaryAction =
    summary.unreconciledCash > 0 || summary.openSuspenseCount > 0
      ? reconciliationAction
      : drawerState.highRiskAlertCount > 0
        ? drawerAction
        : summary.employeeBalanceOutstandingAmount > 0
          ? payrollAction
          : cashAction
  const changes = buildChanges({ input, cards, drawerState, reconciliationAction, drawerAction, payrollAction })
  const actionsToday = buildActionsToday(input.actionQueue, input.generatedAt)
  const risks = buildRisks({ input, cards, drawerState, reconciliationAction, drawerAction, payrollAction })
  const blockers = uniqueById(cards.flatMap((card) => card.blockers))
  const redactions = uniqueById(cards.flatMap((card) => card.redactions))

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    generatedAt: input.generatedAt,
    periodStart: tenantOperating.periodStart,
    periodEnd: tenantOperating.periodEnd,
    currency: input.currency,
    commandBrief: {
      id: `cash-command-brief:${input.organizationId}`,
      organizationId: input.organizationId,
      title: "Cash command brief",
      summary: buildBriefSummary(summary, input.currency),
      conclusion: buildBriefConclusion(summary),
      mode: "brief",
      generatedAt: input.generatedAt,
      periodStart: tenantOperating.periodStart,
      periodEnd: tenantOperating.periodEnd,
      state,
      evidenceGrade,
      trustState: evidenceGradeToBITrustState(evidenceGrade),
      freshness,
      provenance: cards[0]?.provenance ?? null,
      sourceModules: uniqueModules(cards.flatMap((card) => card.provenance.sourceModules)),
      blockers,
      redactions,
      primaryAction,
      drillThrough: primaryAction
        ? {
            available: true,
            type: "route",
            label: primaryAction.label,
            href: primaryAction.href,
            requiredPermission: primaryAction.requiredPermission,
          }
        : null,
      reviewState: {
        organizationId: input.organizationId,
        reviewerId: null,
        reviewerRole: "owner",
        state: state === "blocked" ? "blocked" : freshness.stale ? "stale" : "not_started",
        reviewedAt: null,
        previousReviewedAt: null,
        nextReviewDueAt: new Date(new Date(input.generatedAt).getTime() + ONE_DAY_MS).toISOString(),
        freshness,
        blockers,
      },
    },
    cards,
    trustSignals: buildTrustSignals({ input, drawerState, freshness }),
    changes,
    actionsToday,
    risks,
    proofSubjects,
    drawerState,
    actionQueue: {
      summary: input.actionQueue.summary,
      filteredOutCount: input.actionQueue.filteredOutCount,
    },
    moduleControl: {
      mode: input.moduleControl.mode,
      hardEnforcementEnabled: input.moduleControl.hardEnforcementEnabled,
      summary: input.moduleControl.summary,
      generatedAt: input.moduleControl.generatedAt,
      unknownRequestedModules: input.moduleControl.unknownRequestedModules,
    },
    summary,
  }
}

function payrollForecastCard(card: BIKpiCard, forecast: PayrollFinanceForecastMetrics): BIKpiCard {
  const blockers = payrollForecastBlockers(card)
  const blocked = !forecast.authoritative || forecast.blockerCodes.length > 0
  const nextAction = blockers.find((blocker) => blocker.nextAction)?.nextAction

  return {
    ...card,
    state: blocked ? "blocked" : card.freshness.stale ? "stale" : "ready",
    evidenceGrade: blocked ? "blocked" : "posted",
    trustState: blocked ? "blocked" : "posted",
    detail: blocked ? `${forecast.message}${nextAction ? ` ${nextAction}` : ""}` : card.detail,
    blockers,
    redactions: uniqueById([
      ...card.redactions,
      {
        id: `cash-command-${card.id}-person-values-redacted`,
        field: "payroll.personLevelAmounts",
        reason: "Cash Command exposes aggregate payroll forecast amounts only; person-level payroll values stay inside payroll.",
        policy: "KONTAVA_SENSITIVE_PAYROLL_EVIDENCE",
      },
    ]),
  }
}

function payrollForecastBlockers(card: BIKpiCard): BIBlocker[] {
  return card.blockers.filter((blocker) => blocker.gate === "payroll_finance_forecast")
}
function buildCashDrawerSignals(input: {
  organizationId: string
  drawerDashboard: ComposeCashCommandInput["drawerDashboard"]
  now?: Date | string | null
}): BusinessSignal[] {
  const summary = input.drawerDashboard.summary
  const highAlertCount = input.drawerDashboard.alerts.filter((item) => item.severity === "critical").length
  const activeAlertCount = input.drawerDashboard.alerts.filter((item) => item.code !== "READY").length
  const variance = Math.abs(summary.liveVariance) + Math.abs(summary.sessionVariance)

  if (activeAlertCount === 0 && variance < input.drawerDashboard.thresholds.mediumVariance) return []

  return [
    createBusinessSignalFromFact(
      {
        organizationId: input.organizationId,
        signalType: "cash_drawer_variance",
        moduleSlug: "cash_drawer",
        sourceModule: "pos",
        subjectType: "cash.drawer",
        subjectId: "drawer-risk",
        title: "Review drawer risk",
        detail: `${activeAlertCount} drawer alert(s) and ${variance.toFixed(2)} in variance are visible.`,
        evidenceGrade: highAlertCount > 0 ? "blocked" : "operational",
        severity: highAlertCount > 0 ? "critical" : activeAlertCount > 0 ? "high" : "medium",
        generatedAt: input.drawerDashboard.generatedAt,
        freshness: {
          generatedAt: input.drawerDashboard.generatedAt,
          sourceMaxUpdatedAt: input.drawerDashboard.generatedAt,
          maxAgeMinutes: 24 * 60,
          stale: false,
          staleReason: null,
        },
        suggestedAction: "Review drawer variance and stale session evidence.",
        actionPath: "/dashboard/finance/cash-drawer",
        requiredPermission: "CASH_DRAWER_READ",
        assignedRole: "manager",
        payload: {
          alertCount: activeAlertCount,
          liveVariance: summary.liveVariance,
          sessionVariance: summary.sessionVariance,
          confidenceScore: summary.confidenceScore,
        },
      },
      input.now,
    ),
  ]
}

function drawerRiskCard(input: {
  input: ComposeCashCommandInput
  drawerState: CashCommandDrawerState
  drawerAction: BIActionLink
}): BIKpiCard {
  const { drawerState } = input
  const severity = drawerState.highRiskAlertCount > 0 ? "critical" : drawerState.alertCount > 0 ? "high" : "info"
  const evidenceGrade: EvidenceGrade = severity === "critical" ? "blocked" : "operational"
  const freshness = drawerFreshness(input.input.drawerDashboard.generatedAt)
  const blockers = drawerBlockers(input.input.drawerDashboard)
  const value = Math.abs(drawerState.liveVariance) + Math.abs(drawerState.sessionVariance)

  return {
    id: "drawer_risk",
    organizationId: input.input.organizationId,
    moduleSlug: "cash_drawer",
    requiredPermission: "CASH_DRAWER_READ",
    title: "Drawer risk",
    detail: `${drawerState.alertCount} alert(s), ${drawerState.openDrawerCount} open drawer(s), and ${drawerState.confidenceScore}% confidence.`,
    value,
    unit: input.input.currency,
    format: "currency",
    state: blockers.length > 0 ? (severity === "critical" ? "blocked" : "partial") : "ready",
    evidenceGrade,
    trustState: evidenceGradeToBITrustState(evidenceGrade),
    freshness,
    provenance: {
      organizationId: input.input.organizationId,
      locationId: input.input.drawerDashboard.filters.locationId,
      sourceKind: "cash.drawer",
      sourceId: null,
      sourceHash: `cash-drawer:${input.input.drawerDashboard.generatedAt}:${drawerState.drawerCount}:${drawerState.liveVariance}:${drawerState.sessionVariance}`,
      sourceModules: ["pos", "finance"],
      generatedAt: input.input.drawerDashboard.generatedAt,
      periodStart: input.input.drawerDashboard.filters.startDate,
      periodEnd: input.input.drawerDashboard.filters.endDate,
    },
    blockers,
    redactions: [],
    drillThrough: {
      available: true,
      type: "route",
      label: "Open drawers",
      href: input.drawerAction.href,
      requiredPermission: input.drawerAction.requiredPermission,
    },
    actionLink: input.drawerAction,
  }
}

function buildChanges(input: {
  input: ComposeCashCommandInput
  cards: BIKpiCard[]
  drawerState: CashCommandDrawerState
  reconciliationAction: BIActionLink
  drawerAction: BIActionLink
  payrollAction: BIActionLink
}): BIChangeEvent[] {
  const { paymentTruth, tenantOperating } = input.input.snapshots
  const cashCollected = cardById(input.cards, "cash_collected")
  const suspense = cardById(input.cards, "unreconciled_cash")
  const drawer = cardById(input.cards, "drawer_risk")
  const provider = cardById(input.cards, "provider_risk")
  const payrollRecovery = cardById(input.cards, "employee_balance_recovery")
  const payrollNetPay = cardById(input.cards, "upcoming_payroll_net_pay")
  const payrollForecast = tenantOperating.metrics.payrollFinanceForecast
  const changes = [
    cashCollected
      ? changeFromCard({
          card: cashCollected,
          title: "Cash collected moved today",
          detail: `${formatAmount(tenantOperating.metrics.cashCollected, input.input.currency)} is visible in collected cash.`,
          businessImpact: "Owners can see today's collected cash before checking unresolved exceptions.",
          direction: "changed",
          severity: tenantOperating.metrics.cashCollected > 0 ? "info" : "low",
          currentValue: tenantOperating.metrics.cashCollected,
        })
      : null,
    suspense && paymentTruth.metrics.openSuspenseAmount > 0
      ? changeFromCard({
          card: suspense,
          title: "Unreconciled cash remains open",
          detail: `${formatAmount(paymentTruth.metrics.openSuspenseAmount, input.input.currency)} remains in suspense.`,
          businessImpact: "Cash cannot be treated as fully trusted until suspense is cleared or explained.",
          direction: "worsened",
          severity: paymentTruth.metrics.criticalExceptionCount > 0 ? "critical" : "high",
          currentValue: paymentTruth.metrics.openSuspenseAmount,
          actionLink: input.reconciliationAction,
        })
      : null,
    drawer && input.drawerState.alertCount > 0
      ? changeFromCard({
          card: drawer,
          title: "Drawer risk needs review",
          detail: `${input.drawerState.alertCount} drawer alert(s) are visible today.`,
          businessImpact: "Drawer variance or stale sessions can hide leakage before cash is deposited or posted.",
          direction: "new",
          severity: input.drawerState.highRiskAlertCount > 0 ? "critical" : "high",
          currentValue: Math.abs(input.drawerState.liveVariance) + Math.abs(input.drawerState.sessionVariance),
          actionLink: input.drawerAction,
        })
      : null,
    provider && providerRiskCount(paymentTruth) > 0
      ? changeFromCard({
          card: provider,
          title: "Provider risk is visible",
          detail: `${providerRiskCount(paymentTruth)} provider issue(s) are affecting payment confidence.`,
          businessImpact: "Provider evidence should be reviewed before daily cash or close reporting is trusted.",
          direction: "changed",
          severity: paymentTruth.metrics.criticalExceptionCount > 0 ? "critical" : "medium",
          currentValue: providerRiskCount(paymentTruth),
          actionLink: input.reconciliationAction,
        })
      : null,
    payrollRecovery && tenantOperating.metrics.activeEmployeeBalanceCaseCount > 0
      ? changeFromCard({
          card: payrollRecovery,
          title: "Employee balance recovery is open",
          detail: `${formatAmount(
            tenantOperating.metrics.employeeBalanceOutstandingAmount,
            input.input.currency,
          )} remains outstanding across ${tenantOperating.metrics.activeEmployeeBalanceCaseCount} case(s).`,
          businessImpact: "Net-pay clearing and cash planning remain incomplete until recovery cases are settled or reviewed.",
          direction: "new",
          severity:
            tenantOperating.metrics.employeeBalanceOutstandingAmount >= 500_000 ||
            tenantOperating.metrics.activeEmployeeBalanceCaseCount >= 3
              ? "high"
              : "medium",
          currentValue: tenantOperating.metrics.employeeBalanceOutstandingAmount,
          actionLink: input.payrollAction,
        })
      : null,
    payrollNetPay && payrollForecast.blockerCodes.length > 0
      ? changeFromCard({
          card: payrollNetPay,
          title: "Payroll forecast proof is blocked",
          detail: `${payrollForecast.blockerCodes.length} payroll forecast blocker(s) are withholding aggregate payroll cash obligations.`,
          businessImpact: "Cash planning and profitability views must not rely on payroll obligations until payroll proof is complete.",
          direction: "new",
          severity: "high",
          currentValue: payrollForecast.blockerCodes.length,
          actionLink: input.payrollAction,
        })
      : null,
  ]

  return changes.filter(Boolean) as BIChangeEvent[]
}

function buildActionsToday(actionQueue: ComposeCashCommandInput["actionQueue"], generatedAt: string): CashCommandActionItem[] {
  const signalById = new Map(actionQueue.signals.map((signal) => [signal.id, signal]))
  return [...actionQueue.actionItems]
    .sort(sortActionItems)
    .map((item) => {
      const signal = signalById.get(item.signalId) ?? null
      return {
        id: item.id,
        title: item.title,
        nextStep: item.nextStep,
        severity: item.severity,
        state: actionItemState(item),
        actionLink: actionLinkFromItem(item, signal),
        evidenceGrade: item.evidenceGrade,
        trustState: evidenceGradeToBITrustState(item.evidenceGrade),
        freshness: signal ? freshnessFromSignal(signal, generatedAt) : fallbackFreshness(generatedAt),
        dueLabel: dueLabel(item.dueAt),
        ownerLabel: item.assignedRole,
        blockers: item.blockers.map(toBIBlocker),
        redactions: item.redactions.map(toBIRedaction),
      }
    })
}

function buildRisks(input: {
  input: ComposeCashCommandInput
  cards: BIKpiCard[]
  drawerState: CashCommandDrawerState
  reconciliationAction: BIActionLink
  drawerAction: BIActionLink
  payrollAction: BIActionLink
}): BIRiskRank[] {
  const paymentTruth = input.input.snapshots.paymentTruth
  const tenantOperating = input.input.snapshots.tenantOperating
  const payrollForecast = tenantOperating.metrics.payrollFinanceForecast
  const risks = [
    riskFromCard({
      rank: 1,
      card: cardById(input.cards, "unreconciled_cash"),
      title: "Unreconciled cash",
      detail: "Suspense value is the first cash-trust blocker.",
      businessImpact: "Unresolved suspense weakens daily cash, owner reporting, and close readiness.",
      severity: paymentTruth.metrics.openSuspenseAmount > 0 ? "high" : "info",
      severityScore: paymentTruth.metrics.openSuspenseAmount > 0 ? 86 : 10,
      moneyImpact: paymentTruth.metrics.openSuspenseAmount,
      urgency: paymentTruth.metrics.openSuspenseAmount > 0 ? "today" : "watch",
      actionLink: input.reconciliationAction,
    }),
    riskFromCard({
      rank: 2,
      card: cardById(input.cards, "drawer_risk"),
      title: "Drawer risk",
      detail: "Drawer variance and stale-session alerts show cash-control pressure.",
      businessImpact: "Drawer issues should be reviewed before cash is deposited or posted.",
      severity: input.drawerState.highRiskAlertCount > 0 ? "critical" : input.drawerState.alertCount > 0 ? "high" : "info",
      severityScore: input.drawerState.highRiskAlertCount > 0 ? 95 : input.drawerState.alertCount > 0 ? 76 : 10,
      moneyImpact: Math.abs(input.drawerState.liveVariance) + Math.abs(input.drawerState.sessionVariance),
      urgency: input.drawerState.alertCount > 0 ? "today" : "watch",
      actionLink: input.drawerAction,
    }),
    riskFromCard({
      rank: 3,
      card: cardById(input.cards, "provider_risk"),
      title: "Provider risk",
      detail: "Provider pending transactions, critical exceptions, or inactive accounts are visible.",
      businessImpact: "Provider issues can make cash look collected before settlement evidence is trustworthy.",
      severity: paymentTruth.metrics.criticalExceptionCount > 0 ? "critical" : providerRiskCount(paymentTruth) > 0 ? "medium" : "info",
      severityScore: paymentTruth.metrics.criticalExceptionCount > 0 ? 92 : providerRiskCount(paymentTruth) > 0 ? 58 : 10,
      moneyImpact: null,
      urgency: providerRiskCount(paymentTruth) > 0 ? "today" : "watch",
      actionLink: input.reconciliationAction,
    }),
    riskFromCard({
      rank: 4,
      card: cardById(input.cards, "employee_balance_recovery"),
      title: "Employee balance recovery",
      detail: "Open payroll recovery or refund balances affect net-pay clearing and cash planning.",
      businessImpact: "Unsettled employee balances can leave payroll clearing, cash forecasts, and close readiness incomplete.",
      severity: tenantOperating.metrics.activeEmployeeBalanceCaseCount > 0 ? "high" : "info",
      severityScore: tenantOperating.metrics.activeEmployeeBalanceCaseCount > 0 ? 74 : 10,
      moneyImpact: tenantOperating.metrics.employeeBalanceOutstandingAmount,
      urgency: tenantOperating.metrics.activeEmployeeBalanceCaseCount > 0 ? "today" : "watch",
      actionLink: input.payrollAction,
    }),
    payrollForecast.blockerCodes.length > 0
      ? riskFromCard({
          rank: 5,
          card: cardById(input.cards, "upcoming_payroll_net_pay"),
          title: "Payroll forecast proof",
          detail: "Payroll net-pay or statutory obligation forecasts are withheld until payroll-owned proof is complete.",
          businessImpact: "Cash planning, profitability, and owner decisions must not use payroll estimates when the register, ledger, payment, or declaration proof is incomplete.",
          severity: "high",
          severityScore: 80,
          moneyImpact: null,
          urgency: "today",
          actionLink: input.payrollAction,
        })
      : null,
  ].filter((risk): risk is BIRiskRank => Boolean(risk))

  return risks.sort((left, right) => right.severityScore - left.severityScore).map((risk, index) => ({
    ...risk,
    rank: index + 1,
  }))
}

function buildTrustSignals(input: {
  input: ComposeCashCommandInput
  drawerState: CashCommandDrawerState
  freshness: BIFreshness
}): CashCommandTrustSignal[] {
  const { paymentTruth, closeReadiness } = input.input.snapshots
  const paymentFreshness = normalizeSnapshotFreshness(paymentTruth.freshness, paymentTruth.status)
  const closeFreshness = normalizeSnapshotFreshness(closeReadiness.freshness, closeReadiness.status)
  const paymentBlockers = paymentTruth.blockers.map(toBIBlocker)
  const paymentRedactions = paymentTruth.redactions.map(toBIRedaction)
  const activeProviders = paymentTruth.metrics.activeProviderAccountCount
  const inactiveProviders = Math.max(paymentTruth.metrics.providerAccountCount - activeProviders, 0)
  const closeBlockers =
    closeReadiness.metrics.blockedCloseRunCount +
    closeReadiness.metrics.criticalOpenFindingCount +
    closeReadiness.metrics.unavailableEvidenceCount

  return [
    {
      id: "provider_evidence",
      label: "Provider evidence",
      value: `${activeProviders}/${paymentTruth.metrics.providerAccountCount}`,
      detail: inactiveProviders > 0 ? `${inactiveProviders} provider account(s) are inactive.` : null,
      tone: activeProviders > 0 && inactiveProviders === 0 ? "success" : "gold",
      requiredPermission: "payments.reconciliation.read",
      evidenceGrade: paymentTruth.evidenceGrade,
      trustState: evidenceGradeToBITrustState(paymentTruth.evidenceGrade),
      freshness: paymentFreshness,
      blockers: paymentBlockers,
      redactions: paymentRedactions,
    },
    {
      id: "reconciliation_signoff",
      label: "Signed runs",
      value: String(paymentTruth.metrics.signedRunCount),
      detail: paymentTruth.metrics.readyForSignoffCount > 0 ? `${paymentTruth.metrics.readyForSignoffCount} ready for signoff.` : null,
      tone: paymentTruth.metrics.signedRunCount > 0 ? "success" : "info",
      requiredPermission: "payments.reconciliation.read",
      evidenceGrade: paymentTruth.evidenceGrade,
      trustState: evidenceGradeToBITrustState(paymentTruth.evidenceGrade),
      freshness: paymentFreshness,
      blockers: paymentBlockers,
      redactions: paymentRedactions,
    },
    {
      id: "open_suspense",
      label: "Open suspense",
      value: String(paymentTruth.metrics.openSuspenseCount),
      detail:
        paymentTruth.metrics.openSuspenseAmount > 0
          ? formatAmount(paymentTruth.metrics.openSuspenseAmount, input.input.currency)
          : null,
      tone: paymentTruth.metrics.openSuspenseCount > 0 ? "gold" : "success",
      requiredPermission: "payments.reconciliation.read",
      evidenceGrade: paymentTruth.evidenceGrade,
      trustState: evidenceGradeToBITrustState(paymentTruth.evidenceGrade),
      freshness: paymentFreshness,
      blockers: paymentBlockers,
      redactions: paymentRedactions,
    },
    {
      id: "drawer_confidence",
      label: "Drawer confidence",
      value: `${input.drawerState.confidenceScore}%`,
      detail: input.drawerState.alertCount > 0 ? `${input.drawerState.alertCount} drawer alert(s).` : null,
      tone: input.drawerState.highRiskAlertCount > 0 ? "danger" : input.drawerState.alertCount > 0 ? "gold" : "success",
      requiredPermission: "CASH_DRAWER_READ",
      evidenceGrade: input.drawerState.highRiskAlertCount > 0 ? "blocked" : "operational",
      trustState: input.drawerState.highRiskAlertCount > 0 ? "blocked" : "operational",
      freshness: drawerFreshness(input.input.drawerDashboard.generatedAt),
      blockers: drawerBlockers(input.input.drawerDashboard),
      redactions: [],
    },
    {
      id: "close_readiness",
      label: "Close blockers",
      value: String(closeBlockers),
      detail: closeReadiness.metrics.averageReadinessScore === null ? null : `${closeReadiness.metrics.averageReadinessScore}% readiness.`,
      tone: closeBlockers > 0 ? "danger" : "success",
      requiredPermission: "accounting.close.read",
      evidenceGrade: closeReadiness.evidenceGrade,
      trustState: evidenceGradeToBITrustState(closeReadiness.evidenceGrade),
      freshness: closeFreshness,
      blockers: closeReadiness.blockers.map(toBIBlocker),
      redactions: closeReadiness.redactions.map(toBIRedaction),
    },
    {
      id: "freshness",
      label: "Freshness",
      value: input.freshness.stale ? "Stale" : "Fresh",
      detail: input.freshness.staleReason,
      tone: input.freshness.stale ? "gold" : "success",
      requiredPermission: "dashboard.read",
      evidenceGrade: "operational",
      trustState: "operational",
      freshness: input.freshness,
      blockers: [],
      redactions: [],
    },
  ]
}

function buildSummary(input: ComposeCashCommandInput, cards: BIKpiCard[], drawerState: CashCommandDrawerState): CashCommandSummary {
  const paymentTruth = input.snapshots.paymentTruth
  return {
    cashCollected: input.snapshots.tenantOperating.metrics.cashCollected,
    unreconciledCash: paymentTruth.metrics.openSuspenseAmount,
    openSuspenseCount: paymentTruth.metrics.openSuspenseCount,
    drawerVariance: drawerState.liveVariance + drawerState.sessionVariance,
    drawerAlertCount: drawerState.alertCount,
    providerRiskCount: providerRiskCount(paymentTruth),
    activeEmployeeBalanceCaseCount: input.snapshots.tenantOperating.metrics.activeEmployeeBalanceCaseCount,
    employeeBalanceOutstandingAmount: input.snapshots.tenantOperating.metrics.employeeBalanceOutstandingAmount,
    upcomingPayrollNetPayAmount: input.snapshots.tenantOperating.metrics.payrollFinanceForecast.upcomingNetPayAmount,
    upcomingStatutoryLiabilityAmount: input.snapshots.tenantOperating.metrics.payrollFinanceForecast.upcomingStatutoryLiabilityAmount,
    payrollForecastTotalAmount: input.snapshots.tenantOperating.metrics.payrollFinanceForecast.totalUpcomingAmount,
    actionCountToday: input.actionQueue.summary.total,
    staleCount: cards.filter((card) => card.freshness.stale || card.state === "stale").length,
    blockedCount: cards.filter((card) => card.state === "blocked" || card.blockers.length > 0).length,
    redactedCount: cards.filter((card) => card.redactions.length > 0 || card.state === "redacted").length,
  }
}

function buildDrawerState(drawerDashboard: ComposeCashCommandInput["drawerDashboard"]): CashCommandDrawerState {
  const activeAlerts = drawerDashboard.alerts.filter((item) => item.code !== "READY")
  return {
    drawerCount: drawerDashboard.summary.drawerCount,
    openDrawerCount: drawerDashboard.summary.openDrawerCount,
    confidenceScore: drawerDashboard.summary.confidenceScore,
    liveVariance: drawerDashboard.summary.liveVariance,
    sessionVariance: drawerDashboard.summary.sessionVariance,
    alertCount: activeAlerts.length,
    highRiskAlertCount: activeAlerts.filter((item) => item.severity === "critical").length,
  }
}

function providerRiskCount(paymentTruth: SnapshotResult<PaymentTruthMetrics>) {
  return (
    paymentTruth.metrics.pendingTransactionCount +
    paymentTruth.metrics.criticalExceptionCount +
    Math.max(paymentTruth.metrics.providerAccountCount - paymentTruth.metrics.activeProviderAccountCount, 0) +
    (paymentTruth.metrics.providerAccountCount === 0 ? 1 : 0)
  )
}

function drawerBlockers(drawerDashboard: ComposeCashCommandInput["drawerDashboard"]): BIBlocker[] {
  return drawerDashboard.alerts
    .filter((alert) => alert.code !== "READY")
    .map((alert) => ({
      id: `cash-command-drawer-${alert.id}`,
      severity: alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "high" : "medium",
      gate: "cash_drawer",
      title: drawerAlertTitle(alert.code),
      detail: `${alert.count} drawer item(s) require review${alert.amount ? ` for ${alert.amount.toFixed(2)}` : ""}.`,
      sourceTables: ["cash_drawers", "cash_drawer_transactions", "pos_sessions"],
      nextAction: "Open cash drawer controls and review variance evidence.",
    }))
}

function drawerAlertTitle(code: string) {
  if (code === "HIGH_VARIANCE") return "High drawer variance"
  if (code === "MEDIUM_VARIANCE") return "Drawer variance"
  if (code === "STALE_SESSION") return "Stale drawer session"
  if (code === "OPEN_DRAWER_WITHOUT_SESSION") return "Open drawer without session"
  return "Drawer ready"
}

function buildProofSubjects(input: ComposeCashCommandInput): BIProofDrawerSubject[] {
  return [
    proofSubjectFromId({
      organizationId: input.organizationId,
      moduleSlug: "payment_reconciliation",
      subjectType: "payment.transaction",
      subjectId: input.proofSubjectIds?.paymentTransactionId ?? null,
      label: "Payment transaction proof",
      requiredPermission: SUBJECT_PERMISSION_MAP["payment.transaction"],
      sourceModules: ["payments", "finance"],
      unavailableReason: "No payment transaction is visible in this cash-command period.",
    }),
    proofSubjectFromId({
      organizationId: input.organizationId,
      moduleSlug: "payment_reconciliation",
      subjectType: "reconciliation.run",
      subjectId: input.proofSubjectIds?.reconciliationRunId ?? null,
      label: "Reconciliation proof",
      requiredPermission: SUBJECT_PERMISSION_MAP["reconciliation.run"],
      sourceModules: ["payments", "finance", "accounting"],
      unavailableReason: "No reconciliation run is visible in this cash-command period.",
    }),
    proofSubjectFromId({
      organizationId: input.organizationId,
      moduleSlug: "close_assurance",
      subjectType: "close.run",
      subjectId: input.proofSubjectIds?.closeRunId ?? null,
      label: "Close proof",
      requiredPermission: SUBJECT_PERMISSION_MAP["close.run"],
      sourceModules: ["close", "accounting"],
      unavailableReason: "No close run is visible in this cash-command period.",
    }),
    proofSubjectFromId({
      organizationId: input.organizationId,
      moduleSlug: "accounting",
      subjectType: "journal.entry",
      subjectId: input.proofSubjectIds?.journalEntryId ?? null,
      label: "Ledger proof",
      requiredPermission: SUBJECT_PERMISSION_MAP["journal.entry"],
      sourceModules: ["accounting"],
      unavailableReason: "No posted journal entry is visible in this cash-command period.",
    }),
  ]
}

function proofSubjectFromId(input: {
  organizationId: string
  moduleSlug: CommercialModuleSlug
  subjectType: ProofTrailSubjectType
  subjectId: string | null
  label: string
  requiredPermission: string
  sourceModules: SnapshotSourceModule[]
  unavailableReason: string
}): BIProofDrawerSubject {
  if (input.subjectId) {
    return {
      available: true,
      organizationId: input.organizationId,
      moduleSlug: input.moduleSlug,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      label: input.label,
      requiredPermission: input.requiredPermission,
      sourceModules: input.sourceModules,
    }
  }

  return {
    available: false,
    organizationId: input.organizationId,
    moduleSlug: input.moduleSlug,
    label: input.label,
    requiredPermission: input.requiredPermission,
    unavailableReason: input.unavailableReason,
    sourceModules: input.sourceModules,
  }
}

function proofSubject(proofSubjects: BIProofDrawerSubject[], subjectType: ProofTrailSubjectType) {
  return proofSubjects.find((subject) => subject.available && subject.subjectType === subjectType) ?? null
}

function availableProof(subject: BIProofDrawerSubject | null) {
  if (!subject?.available) return null
  return {
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
  }
}

function changeFromCard(input: {
  card: BIKpiCard
  title: string
  detail: string
  businessImpact: string
  direction: BIChangeEvent["direction"]
  severity: BISeverity
  currentValue: number | string | null
  actionLink?: BIActionLink | null
}): BIChangeEvent {
  return {
    id: `cash-command-change:${input.card.id}`,
    organizationId: input.card.organizationId,
    moduleSlug: input.card.moduleSlug,
    requiredPermission: input.card.requiredPermission,
    title: input.title,
    detail: input.detail,
    businessImpact: input.businessImpact,
    direction: input.direction,
    severity: input.severity,
    state: input.card.state,
    evidenceGrade: input.card.evidenceGrade,
    trustState: input.card.trustState,
    freshness: input.card.freshness,
    sourceModules: input.card.provenance.sourceModules,
    changedAt: input.card.freshness.sourceMaxUpdatedAt ?? input.card.freshness.generatedAt,
    previousValue: null,
    currentValue: input.currentValue,
    unit: input.card.unit,
    format: input.card.format,
    provenance: input.card.provenance,
    blockers: input.card.blockers,
    redactions: input.card.redactions,
    drillThrough: input.card.drillThrough,
    actionLink: input.actionLink ?? input.card.actionLink,
  }
}

function riskFromCard(input: {
  rank: number
  card: BIKpiCard | null
  title: string
  detail: string
  businessImpact: string
  severity: BISeverity
  severityScore: number
  moneyImpact: number | null
  urgency: BIRiskRank["urgency"]
  actionLink: BIActionLink
}): BIRiskRank | null {
  if (!input.card) return null
  return {
    id: `cash-command-risk:${input.card.id}`,
    organizationId: input.card.organizationId,
    moduleSlug: input.card.moduleSlug,
    rank: input.rank,
    title: input.title,
    detail: input.detail,
    businessImpact: input.businessImpact,
    severity: input.severity,
    severityScore: input.severityScore,
    moneyImpact: input.moneyImpact,
    urgency: input.urgency,
    state: input.card.state,
    evidenceGrade: input.card.evidenceGrade,
    trustState: input.card.trustState,
    freshness: input.card.freshness,
    sourceModules: input.card.provenance.sourceModules,
    blockers: input.card.blockers,
    redactions: input.card.redactions,
    drillThrough: input.card.drillThrough,
    actionLink: input.actionLink,
  }
}

function cardById(cards: BIKpiCard[], id: string) {
  return cards.find((card) => card.id === id) ?? null
}

function actionLink(input: Omit<BIActionLink, "disabled" | "disabledReason">): BIActionLink {
  return { ...input, disabled: false, disabledReason: null }
}

function actionLinkFromItem(item: ActionItem, signal: BusinessSignal | null): BIActionLink {
  const disabled = item.status === "expired" || item.status === "resolved" || item.status === "dismissed"
  return {
    id: `cash-command-action:${item.id}`,
    label: disabled ? "Unavailable" : "Open",
    href: item.actionPath,
    requiredPermission: item.requiredPermission,
    moduleSlug: signal?.moduleSlug ?? ACTION_MODULE_BY_SIGNAL_TYPE[item.signalType],
    disabled,
    disabledReason: disabled ? `Action is ${item.status}.` : null,
  }
}

function actionItemState(item: ActionItem): BIKpiState {
  if (item.status === "expired") return "stale"
  if (item.blockers.length > 0) return "blocked"
  if (item.redactions.length > 0) return "redacted"
  if (item.status === "assigned") return "partial"
  return "ready"
}

function freshnessFromSignal(signal: BusinessSignal, fallbackGeneratedAt: string): BIFreshness {
  return {
    state: signal.status === "expired" ? "stale" : signal.freshness.stale ? "stale" : "fresh",
    generatedAt: signal.freshness.generatedAt ?? fallbackGeneratedAt,
    sourceMaxUpdatedAt: signal.freshness.sourceMaxUpdatedAt,
    maxAgeMinutes: signal.freshness.maxAgeMinutes,
    stale: signal.status === "expired" || signal.freshness.stale,
    staleReason: signal.status === "expired" ? "Signal is expired." : signal.freshness.staleReason,
  }
}

function fallbackFreshness(generatedAt: string): BIFreshness {
  return { state: "unknown", generatedAt, sourceMaxUpdatedAt: null, maxAgeMinutes: null, stale: false, staleReason: null }
}

function drawerFreshness(generatedAt: string): BIFreshness {
  return {
    state: "fresh",
    generatedAt,
    sourceMaxUpdatedAt: generatedAt,
    maxAgeMinutes: 24 * 60,
    stale: false,
    staleReason: null,
  }
}

function aggregateFreshness(generatedAt: string, freshnesses: BIFreshness[]): BIFreshness {
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

function commandState(cards: BIKpiCard[], actionCount: number): BIKpiState {
  if (cards.some((card) => card.state === "blocked" || card.blockers.length > 0)) return "blocked"
  if (cards.some((card) => card.state === "stale" || card.freshness.stale)) return "stale"
  if (actionCount > 0 || cards.some((card) => card.state === "partial")) return "partial"
  return "ready"
}

function strongestVisibleGrade(grades: EvidenceGrade[]): EvidenceGrade {
  if (grades.includes("blocked")) return "blocked"
  if (grades.includes("certified")) return "certified"
  if (grades.includes("reconciled")) return "reconciled"
  if (grades.includes("posted")) return "posted"
  if (grades.includes("operational")) return "operational"
  return "raw"
}

function buildBriefSummary(summary: CashCommandSummary, currency: string) {
  return `${formatAmount(summary.cashCollected, currency)} collected, ${formatAmount(summary.unreconciledCash, currency)} unreconciled, ${formatAmount(summary.payrollForecastTotalAmount, currency)} upcoming payroll obligations, ${formatAmount(summary.employeeBalanceOutstandingAmount, currency)} payroll balance outstanding, ${summary.openSuspenseCount} suspense item(s), ${summary.drawerAlertCount} drawer alert(s), and ${summary.providerRiskCount} provider issue(s).`
}

function buildBriefConclusion(summary: CashCommandSummary) {
  if (summary.unreconciledCash > 0 || summary.openSuspenseCount > 0) {
    return "Start with suspense: unreconciled cash must be explained before today can be trusted."
  }
  if (summary.drawerAlertCount > 0) {
    return "Review drawer evidence before deposit or posting claims rely on the day."
  }
  if (summary.providerRiskCount > 0) {
    return "Review provider evidence before treating collected cash as settled."
  }
  if (summary.employeeBalanceOutstandingAmount > 0 || summary.activeEmployeeBalanceCaseCount > 0) {
    return "Review employee balance recovery before treating payroll clearing and cash planning as complete."
  }
  if (summary.payrollForecastTotalAmount > 0) {
    return "Review upcoming payroll and statutory obligations before finalizing the cash plan."
  }
  return "No suspense, drawer, provider, payroll recovery, or upcoming payroll cash blocker is visible in the current command view."
}

function dateLabel(value: string | null) {
  if (!value) return "the forecast horizon"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "the forecast horizon"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(parsed)
}
function formatAmount(value: number, currency: string) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ${currency}`
}

function dueLabel(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return `Due ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(parsed)}`
}

function sortActionItems(left: ActionItem, right: ActionItem) {
  const score = right.severityScore - left.severityScore
  if (score !== 0) return score
  return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
}

function toBIBlocker(blocker: SnapshotBlocker): BIBlocker {
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

function toBIRedaction(redaction: SnapshotRedaction): BIRedaction {
  return {
    id: redaction.id,
    field: redaction.field,
    reason: redaction.reason,
    policy: redaction.policy,
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

function normalizeNow(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function drawerScopeFromInput(input: CashCommandInput) {
  if (input.periodStart || input.periodEnd) {
    return {
      period: "custom" as const,
      startDate: input.periodStart ? normalizeNow(input.periodStart) : undefined,
      endDate: input.periodEnd ? normalizeNow(input.periodEnd) : undefined,
    }
  }

  return { period: "today" as const }
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

  const [paymentTransaction, journalEntry, reconciliationRun, closeRun] = await Promise.all([
    db.paymentTransaction.findFirst({
      where: {
        organizationId: input.organizationId,
        OR: [
          { occurredAt: periodWhere },
          { confirmedAt: periodWhere },
          { settledAt: periodWhere },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
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
    paymentTransactionId: paymentTransaction?.id ?? null,
    journalEntryId: journalEntry?.id ?? null,
    reconciliationRunId: reconciliationRun?.id ?? null,
    closeRunId: closeRun?.id ?? null,
  }
}
