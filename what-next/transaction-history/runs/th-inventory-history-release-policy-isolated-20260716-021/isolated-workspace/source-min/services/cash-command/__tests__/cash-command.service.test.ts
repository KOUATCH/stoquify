import type { ModuleControlCenterData } from "@/services/modules/module-control-contracts"
import type { CashDrawerDashboardData } from "@/services/pos/drawer-dashboard.service"
import type { ActionQueueResult } from "@/services/signals/business-signal-contracts"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotFreshness,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"

jest.mock("@/prisma/db", () => ({
  db: {
    paymentTransaction: { findFirst: jest.fn() },
    journalEntry: { findFirst: jest.fn() },
    reconciliationRun: { findFirst: jest.fn() },
    closeRun: { findFirst: jest.fn() },
  },
}))

import { composeCashCommandData } from "../cash-command.service"

const generatedAt = "2026-06-24T08:00:00.000Z"

describe("cash command service", () => {
  it("composes read-only cash command metrics with evidence, redaction, freshness, actions, and proof links", () => {
    const data = composeCashCommandData({
      organizationId: "org-1",
      organizationName: "Kontava Demo",
      generatedAt,
      currency: "XAF",
      snapshots: {
        tenantOperating: tenantSnapshot(),
        paymentTruth: paymentSnapshot(),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      drawerDashboard: drawerDashboard(),
      actionQueue: actionQueue(),
      moduleControl: moduleControl(),
      proofSubjectIds: {
        paymentTransactionId: "pt-1",
        journalEntryId: "je-1",
        reconciliationRunId: "rr-1",
        closeRunId: "cr-1",
      },
    })

    expect(data.cards.map((card) => card.id)).toEqual([
      "cash_collected",
      "unreconciled_cash",
      "open_suspense",
      "drawer_risk",
      "provider_risk",
      "employee_balance_recovery",
      "upcoming_payroll_net_pay",
      "upcoming_statutory_liability",
      "stock_cash_buffer",
    ])
    expect(data.summary).toMatchObject({
      cashCollected: 180000,
      unreconciledCash: 125000,
      openSuspenseCount: 2,
      drawerAlertCount: 2,
      providerRiskCount: 6,
      activeEmployeeBalanceCaseCount: 0,
      employeeBalanceOutstandingAmount: 0,
      upcomingPayrollNetPayAmount: 350000,
      upcomingStatutoryLiabilityAmount: 90000,
      payrollForecastTotalAmount: 440000,
      actionCountToday: 2,
      redactedCount: 5,
    })
    expect(data.cards.find((card) => card.id === "provider_risk")).toMatchObject({
      requiredPermission: "payments.reconciliation.read",
      redactions: [expect.objectContaining({ field: "providerAccount.externalAccountHash" })],
    })
    expect(data.cards.find((card) => card.id === "employee_balance_recovery")).toMatchObject({
      requiredPermission: "payroll.payments.reconcile",
      value: 0,
      drillThrough: expect.objectContaining({ href: "/dashboard/payroll/payments" }),
    })
    expect(data.cards.find((card) => card.id === "upcoming_payroll_net_pay")).toMatchObject({
      value: 350000,
      requiredPermission: "payroll.payments.reconcile",
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
    })
    expect(data.cards.find((card) => card.id === "upcoming_statutory_liability")).toMatchObject({
      value: 90000,
      requiredPermission: "payroll.declarations.manage",
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
    })
    expect(data.cards.find((card) => card.id === "drawer_risk")).toMatchObject({
      requiredPermission: "CASH_DRAWER_READ",
      state: "blocked",
    })
    expect(data.cards.find((card) => card.id === "drawer_risk")?.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ gate: "cash_drawer" })]),
    )
    expect(data.commandBrief).toMatchObject({
      title: "Cash command brief",
      state: "blocked",
      primaryAction: expect.objectContaining({ href: "/dashboard/finance/reconciliation" }),
    })
    expect(data.changes.map((change) => change.title)).toEqual(
      expect.arrayContaining([
        "Cash collected moved today",
        "Unreconciled cash remains open",
        "Drawer risk needs review",
        "Provider risk is visible",
      ]),
    )
    expect(data.actionsToday.map((item) => item.title)).toEqual([
      "Resolve payment suspense",
      "Review drawer risk",
    ])
    expect(data.proofSubjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ available: true, subjectType: "payment.transaction", subjectId: "pt-1" }),
        expect.objectContaining({ available: true, subjectType: "reconciliation.run", subjectId: "rr-1" }),
        expect.objectContaining({ available: true, subjectType: "close.run", subjectId: "cr-1" }),
        expect.objectContaining({ available: true, subjectType: "journal.entry", subjectId: "je-1" }),
      ]),
    )
  })

  it("keeps blocked payroll forecast proof specific to payroll cash planning", () => {
    const tenant = tenantSnapshot({
      payrollFinanceForecast: payrollForecastMetrics({
        status: "NON_AUTHORITATIVE",
        authoritative: false,
        reasonCode: "PAYROLL_FORECAST_PROOF_INCOMPLETE",
        message: "Upcoming payroll finance forecasts are withheld because payroll proof is incomplete.",
        upcomingNetPayAmount: 0,
        upcomingStatutoryLiabilityAmount: 0,
        totalUpcomingAmount: 0,
        blockerCodes: ["PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING"],
      }),
    })
    tenant.status = "blocked"
    tenant.uiState = "blocked"
    tenant.evidenceGrade = "blocked"
    tenant.blockers = [
      {
        id: "tenant-payroll-finance-forecast-payment-evidence-missing",
        severity: "high",
        gate: "payroll_finance_forecast",
        title: "Payroll payment proof is missing",
        detail: "Upcoming net-pay forecast is withheld until released payment batches include immutable payment and ledger evidence.",
        sourceTables: ["payroll_runs", "payroll_payment_batches"],
        nextAction: "Open payroll payments and complete payment release evidence.",
      },
      {
        id: "tenant-unrelated-close-blocker",
        severity: "high",
        gate: "close_readiness",
        title: "Close blocker",
        detail: "Close is blocked.",
        sourceTables: ["close_runs"],
      },
    ]

    const data = composeCashCommandData({
      organizationId: "org-1",
      organizationName: "Kontava Demo",
      generatedAt,
      currency: "XAF",
      snapshots: {
        tenantOperating: tenant,
        paymentTruth: paymentSnapshot(),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      drawerDashboard: drawerDashboard(),
      actionQueue: actionQueue(),
      moduleControl: moduleControl(),
    })

    const netPay = data.cards.find((card) => card.id === "upcoming_payroll_net_pay")
    const statutory = data.cards.find((card) => card.id === "upcoming_statutory_liability")

    expect(netPay).toMatchObject({
      value: 0,
      state: "blocked",
      evidenceGrade: "blocked",
      trustState: "blocked",
      blockers: [expect.objectContaining({ gate: "payroll_finance_forecast" })],
      redactions: [expect.objectContaining({ field: "payroll.personLevelAmounts" })],
    })
    expect(netPay?.detail).toContain("Open payroll payments")
    expect(netPay?.blockers).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ gate: "close_readiness" })]),
    )
    expect(statutory).toMatchObject({
      value: 0,
      state: "blocked",
      blockers: [expect.objectContaining({ gate: "payroll_finance_forecast" })],
    })
    expect(data.changes.map((change) => change.title)).toEqual(
      expect.arrayContaining(["Payroll forecast proof is blocked"]),
    )
    expect(data.risks.map((risk) => risk.title)).toEqual(
      expect.arrayContaining(["Payroll forecast proof"]),
    )
  })

  it("promotes employee balance recovery when payroll balances affect cash planning", () => {
    const drawer = drawerDashboard()
    drawer.alerts = []
    drawer.summary.liveVariance = 0
    drawer.summary.sessionVariance = 0
    const data = composeCashCommandData({
      organizationId: "org-1",
      organizationName: "Kontava Demo",
      generatedAt,
      currency: "XAF",
      snapshots: {
        tenantOperating: tenantSnapshot({
          activeEmployeeBalanceCaseCount: 2,
          openEmployeeBalanceCaseCount: 1,
          partiallySettledEmployeeBalanceCaseCount: 1,
          employeeBalanceOutstandingAmount: 27500,
          periodEmployeeBalanceSettlementCount: 3,
          periodEmployeeBalanceSettlementAmount: 12500,
        }),
        paymentTruth: paymentSnapshot({
          providerAccountCount: 1,
          activeProviderAccountCount: 1,
          openExceptionCount: 0,
          criticalExceptionCount: 0,
          openSuspenseCount: 0,
          openSuspenseAmount: 0,
          pendingTransactionCount: 0,
        }),
        inventoryCash: inventorySnapshot(),
        closeReadiness: closeSnapshot(),
      },
      drawerDashboard: drawer,
      actionQueue: actionQueue(),
      moduleControl: moduleControl(),
    })

    expect(data.summary).toMatchObject({
      activeEmployeeBalanceCaseCount: 2,
      employeeBalanceOutstandingAmount: 27500,
    })
    expect(data.cards.find((card) => card.id === "employee_balance_recovery")).toMatchObject({
      value: 27500,
      requiredPermission: "payroll.payments.reconcile",
    })
    expect(data.commandBrief.primaryAction).toMatchObject({ href: "/dashboard/payroll/payments" })
    expect(data.changes.map((change) => change.title)).toEqual(
      expect.arrayContaining(["Employee balance recovery is open"]),
    )
  })
})

function freshness(overrides: Partial<SnapshotFreshness> = {}): SnapshotFreshness {
  return {
    generatedAt,
    sourceMaxUpdatedAt: generatedAt,
    maxAgeMinutes: 1440,
    stale: false,
    staleReason: null,
    ...overrides,
  }
}

function tenantSnapshot(overrides: Partial<TenantOperatingMetrics> = {}): SnapshotResult<TenantOperatingMetrics> {
  return {
    kind: "tenant.operating",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-24T00:00:00.000Z",
    periodEnd: "2026-06-24T23:59:59.999Z",
    status: "partial",
    uiState: "partial",
    evidenceGrade: "operational",
    freshness: freshness(),
    sourceHash: "tenant-hash",
    generatedAt,
    sourceModules: ["dashboard", "sales", "payments", "accounting"],
    metrics: {
      activeLocationCount: 1,
      completedSalesCount: 12,
      completedSalesRevenue: 250000,
      cashCollected: 180000,
      pendingPurchaseOrderCount: 0,
      approvedOrPaidPayrollRunCount: 0,
      activeEmployeeBalanceCaseCount: 0,
      openEmployeeBalanceCaseCount: 0,
      partiallySettledEmployeeBalanceCaseCount: 0,
      employeeBalanceOutstandingAmount: 0,
      periodEmployeeBalanceSettlementCount: 0,
      periodEmployeeBalanceSettlementAmount: 0,
      postedJournalEntryCount: 1,
      sourceLinkCount: 1,
      payrollFinanceForecast: payrollForecastMetrics(),
      paymentTruth: paymentMetrics(),
      inventoryCash: inventoryMetrics(),
      closeReadiness: closeMetrics(),
      ...overrides,
    },
    blockers: [],
    redactions: [],
  }
}

function payrollForecastMetrics(
  overrides: Partial<TenantOperatingMetrics["payrollFinanceForecast"]> = {},
): TenantOperatingMetrics["payrollFinanceForecast"] {
  return {
    status: "AUTHORITATIVE",
    authoritative: true,
    reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED",
    message: "Forecast is source linked.",
    horizonStart: "2026-06-24T00:00:00.000Z",
    horizonEnd: "2026-07-24T23:59:59.999Z",
    upcomingNetPayAmount: 350000,
    upcomingStatutoryLiabilityAmount: 90000,
    totalUpcomingAmount: 440000,
    payrollPeriodCount: 1,
    payrollRunCount: 1,
    paymentBatchCount: 1,
    declarationCount: 1,
    sourceLinkCount: 2,
    evidenceHashCount: 4,
    nextPayDate: "2026-06-30T00:00:00.000Z",
    nextDeclarationDueDate: "2026-07-15T00:00:00.000Z",
    personLevelAmountsRedacted: true,
    blockerCodes: [],
    ...overrides,
  }
}
function paymentSnapshot(overrides: Partial<PaymentTruthMetrics> = {}): SnapshotResult<PaymentTruthMetrics> {
  return {
    kind: "payment.truth",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-24T00:00:00.000Z",
    periodEnd: "2026-06-24T23:59:59.999Z",
    status: "blocked",
    uiState: "blocked",
    evidenceGrade: "blocked",
    freshness: freshness(),
    sourceHash: "payment-hash",
    generatedAt,
    sourceModules: ["payments", "finance", "accounting"],
    metrics: paymentMetrics(overrides),
    blockers: [
      {
        id: "payment-suspense-open",
        severity: "high",
        gate: "payment_truth",
        title: "Payment suspense queue is not empty",
        detail: "Suspense remains open.",
        sourceTables: ["suspense_items"],
      },
    ],
    redactions: [
      {
        id: "provider-id-redacted",
        field: "providerAccount.externalAccountHash",
        reason: "Provider identifiers remain server-side.",
        policy: "KONTAVA_SENSITIVE_PAYMENT_EVIDENCE",
      },
    ],
  }
}

function inventorySnapshot(overrides: Partial<InventoryCashMetrics> = {}): SnapshotResult<InventoryCashMetrics> {
  return {
    kind: "inventory.cash",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-24T00:00:00.000Z",
    periodEnd: "2026-06-24T23:59:59.999Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "operational",
    freshness: freshness(),
    sourceHash: "inventory-hash",
    generatedAt,
    sourceModules: ["inventory", "finance"],
    metrics: inventoryMetrics(overrides),
    blockers: [],
    redactions: [],
  }
}

function closeSnapshot(overrides: Partial<CloseReadinessMetrics> = {}): SnapshotResult<CloseReadinessMetrics> {
  return {
    kind: "close.readiness",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-24T00:00:00.000Z",
    periodEnd: "2026-06-24T23:59:59.999Z",
    status: "partial",
    uiState: "partial",
    evidenceGrade: "operational",
    freshness: freshness(),
    sourceHash: "close-hash",
    generatedAt,
    sourceModules: ["accounting", "close"],
    metrics: closeMetrics(overrides),
    blockers: [],
    redactions: [],
  }
}

function paymentMetrics(overrides: Partial<PaymentTruthMetrics> = {}): PaymentTruthMetrics {
  return {
    providerAccountCount: 3,
    activeProviderAccountCount: 2,
    recentRunCount: 1,
    readyForSignoffCount: 0,
    signedRunCount: 0,
    openExceptionCount: 2,
    criticalExceptionCount: 1,
    openSuspenseCount: 2,
    openSuspenseAmount: 125000,
    pendingTransactionCount: 4,
    ...overrides,
  }
}

function inventoryMetrics(overrides: Partial<InventoryCashMetrics> = {}): InventoryCashMetrics {
  return {
    trackedItemCount: 30,
    inventoryLevelCount: 42,
    quantityOnHand: 100,
    quantityAvailable: 78,
    quantityReserved: 12,
    quantityInTransit: 3,
    quantityOnOrder: 8,
    inventoryValue: 450000,
    zeroStockLevelCount: 2,
    negativeStockLevelCount: 0,
    periodTransactionCount: 24,
    periodAdjustmentCount: 1,
    periodTransferCount: 3,
    ...overrides,
  }
}

function closeMetrics(overrides: Partial<CloseReadinessMetrics> = {}): CloseReadinessMetrics {
  return {
    accountingPeriodCount: 1,
    openPeriodCount: 1,
    recentCloseRunCount: 1,
    certifiedCloseRunCount: 0,
    blockedCloseRunCount: 0,
    averageReadinessScore: 72,
    openFindingCount: 2,
    criticalOpenFindingCount: 0,
    unavailableEvidenceCount: 1,
    ...overrides,
  }
}

function drawerDashboard(): CashDrawerDashboardData {
  return {
    generatedAt,
    organization: {
      id: "org-1",
      name: "Kontava Demo",
      currency: "XAF",
    },
    filters: {
      locationId: null,
      period: "today",
      startDate: "2026-06-24T00:00:00.000Z",
      endDate: "2026-06-24T23:59:59.999Z",
    },
    thresholds: {
      mediumVariance: 5000,
      highVariance: 20000,
    },
    locations: [],
    summary: {
      drawerCount: 2,
      openDrawerCount: 1,
      closedDrawerCount: 1,
      activeSessionCount: 1,
      closedSessionCount: 1,
      currentBalance: 250000,
      expectedBalance: 220000,
      liveVariance: 30000,
      openingFloat: 10000,
      cashSales: 160000,
      cashIn: 10000,
      cashOut: 5000,
      refunds: 0,
      closingCounts: 0,
      netMovement: 175000,
      sessionVariance: 7000,
      transactionCount: 12,
      saleCount: 8,
      totalSales: 210000,
      nonCashTenderTotal: 50000,
      accuracyRate: 80,
      confidenceScore: 71,
    },
    drawers: [],
    sessions: [],
    journal: [],
    trend: [],
    alerts: [
      { id: "high-variance", code: "HIGH_VARIANCE", severity: "critical", count: 1, amount: 30000 },
      { id: "stale-session", code: "STALE_SESSION", severity: "warning", count: 1 },
    ],
  }
}

function actionQueue(): ActionQueueResult {
  return {
    organizationId: "org-1",
    generatedAt,
    signals: [
      {
        id: "sig-1",
        organizationId: "org-1",
        moduleSlug: "payment_reconciliation",
        sourceModule: "payments",
        sourceSnapshotKind: "payment.truth",
        sourceHash: "payment-hash",
        signalType: "open_payment_suspense",
        title: "Resolve payment suspense",
        detail: "Suspense remains open.",
        businessImpact: "Unresolved suspense weakens cash truth.",
        subjectType: "payment.suspense",
        subjectId: "open-suspense",
        evidenceGrade: "blocked",
        severity: "critical",
        severityScore: 98,
        status: "active",
        dedupeKey: "org-1:open_payment_suspense",
        generatedAt,
        expiresAt: generatedAt,
        freshness: freshness(),
        suggestedAction: "Classify or match suspense items.",
        actionPath: "/dashboard/finance/reconciliation",
        requiredPermission: "payments.reconciliation.read",
        assignedRole: "finance",
        assigneeId: null,
        blockers: [],
        redactions: [],
        payload: { openSuspenseAmount: 125000 },
        proofLink: { subjectType: "reconciliation.run", subjectId: "rr-1" },
      },
      {
        id: "sig-2",
        organizationId: "org-1",
        moduleSlug: "cash_drawer",
        sourceModule: "pos",
        sourceSnapshotKind: "cash.drawer",
        sourceHash: "drawer-hash",
        signalType: "cash_drawer_variance",
        title: "Review drawer risk",
        detail: "Drawer variance remains open.",
        businessImpact: "Cash variance can hide leakage.",
        subjectType: "cash.drawer",
        subjectId: "drawer-risk",
        evidenceGrade: "blocked",
        severity: "high",
        severityScore: 80,
        status: "active",
        dedupeKey: "org-1:cash_drawer_variance",
        generatedAt,
        expiresAt: generatedAt,
        freshness: freshness(),
        suggestedAction: "Review drawer variance.",
        actionPath: "/dashboard/finance/cash-drawer",
        requiredPermission: "CASH_DRAWER_READ",
        assignedRole: "manager",
        assigneeId: null,
        blockers: [],
        redactions: [],
        payload: { liveVariance: 30000 },
        proofLink: null,
      },
    ],
    actionItems: [
      {
        id: "act-1",
        organizationId: "org-1",
        signalId: "sig-1",
        signalType: "open_payment_suspense",
        title: "Resolve payment suspense",
        nextStep: "Classify or match suspense items.",
        actionPath: "/dashboard/finance/reconciliation",
        requiredPermission: "payments.reconciliation.read",
        status: "open",
        severity: "critical",
        severityScore: 98,
        assignedRole: "finance",
        assigneeId: null,
        createdAt: generatedAt,
        updatedAt: generatedAt,
        dueAt: generatedAt,
        resolvedAt: null,
        dismissedAt: null,
        evidenceGrade: "blocked",
        redactions: [],
        blockers: [],
      },
      {
        id: "act-2",
        organizationId: "org-1",
        signalId: "sig-2",
        signalType: "cash_drawer_variance",
        title: "Review drawer risk",
        nextStep: "Review drawer variance.",
        actionPath: "/dashboard/finance/cash-drawer",
        requiredPermission: "CASH_DRAWER_READ",
        status: "open",
        severity: "high",
        severityScore: 80,
        assignedRole: "manager",
        assigneeId: null,
        createdAt: generatedAt,
        updatedAt: generatedAt,
        dueAt: generatedAt,
        resolvedAt: null,
        dismissedAt: null,
        evidenceGrade: "blocked",
        redactions: [],
        blockers: [],
      },
    ],
    filteredOutCount: 0,
    summary: {
      total: 2,
      open: 2,
      assigned: 0,
      stale: 0,
      expired: 0,
      redacted: 0,
      bySeverity: {
        info: 0,
        low: 0,
        medium: 0,
        high: 1,
        critical: 1,
      },
      byRole: { finance: 1, manager: 1 },
    },
  }
}

function moduleControl(): ModuleControlCenterData {
  return {
    organizationId: "org-1",
    organizationName: "Kontava Demo",
    mode: "observe",
    hardEnforcementEnabled: false,
    requestedModules: ["finance", "payment_reconciliation", "cash_drawer"],
    normalizedRequestedModules: ["finance", "payment_reconciliation", "cash_drawer"],
    unknownRequestedModules: [],
    generatedAt,
    summary: {
      catalogCount: 20,
      entitledCount: 8,
      trialCount: 0,
      readOnlyCount: 0,
      suspendedCount: 0,
      wouldBlockCount: 0,
      dependencyGapCount: 0,
    },
    items: [],
  }
}
