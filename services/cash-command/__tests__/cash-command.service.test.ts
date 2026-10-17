import { localizeCashCommandNavigation } from "../cash-command-navigation"
import { presentCashCommand } from "../cash-command-presentation"
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
import type { ModuleControlCenterData } from "@/services/modules/module-control-contracts"
import type { CashDrawerDashboardData } from "@/services/pos/drawer-dashboard.service"
import type { ActionQueueResult } from "@/services/signals/business-signal-contracts"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  InventoryLossMetrics,
  PaymentTruthMetrics,
  SnapshotFreshness,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"

jest.mock("@/prisma/db", () => ({
  db: {
    organization: { findFirst: jest.fn() },
    payment: { aggregate: jest.fn() },
    payrollEmployeeBalanceCase: { groupBy: jest.fn() },
    purchaseOrder: { groupBy: jest.fn() },
    paymentTransaction: { findFirst: jest.fn() },
    journalEntry: { findFirst: jest.fn() },
    reconciliationRun: { findFirst: jest.fn() },
    closeRun: { findFirst: jest.fn() },
  },
}))

jest.mock("@/lib/security/rbac", () => ({
  auditRbacDecision: jest.fn(),
  RbacError: class RbacError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly status: number,
    ) {
      super(message)
      this.name = "RbacError"
    }
  },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  getModuleControlCenterData: jest.fn(),
  observeModuleAccess: jest.fn(),
}))
// Keep these read-model fixtures' per-module decisions; the batch's persisted
// authority and audit equivalence are exercised by its own service tests.
jest.mock("@/services/modules/module-access-batch.service", () => ({
  observeModuleReadAccessBatch: async ({ moduleSlugs, ...input }: { moduleSlugs: string[] }) => {
    const { observeModuleAccess: observe } = jest.requireMock("@/services/modules/module-entitlement.service")
    return new Map(await Promise.all([...new Set(moduleSlugs)].map(async moduleSlug =>
      [moduleSlug, await observe({ ...input, moduleSlug, accessIntent: "read", mode: "enforce" })] as const)))
  },
}))
jest.mock("@/services/pos/drawer-dashboard.service", () => ({
  getCashDrawerDashboard: jest.fn(),
}))
jest.mock("@/services/signals/action-queue.service", () => ({
  buildActionQueue: jest.fn(),
}))
jest.mock("@/services/signals/business-signal-rules.service", () => ({
  ...jest.requireActual("@/services/signals/business-signal-rules.service"),
  buildBusinessSignalsFromSnapshots: jest.fn(),
  createBusinessSignalFromFact: jest.fn(),
}))
jest.mock("@/services/snapshots/close-readiness-snapshot.service", () => ({
  getCloseReadinessSnapshot: jest.fn(),
}))
jest.mock("@/services/snapshots/inventory-cash-snapshot.service", () => ({
  getInventoryCashSnapshot: jest.fn(),
}))
jest.mock("@/services/snapshots/inventory-loss-snapshot.service", () => ({
  getInventoryLossSnapshot: jest.fn(),
}))
jest.mock("@/services/snapshots/payment-truth-snapshot.service", () => ({
  getPaymentTruthSnapshot: jest.fn(),
}))
jest.mock("@/services/payroll/payroll-finance-forecast.service", () => ({
  ...jest.requireActual("@/services/payroll/payroll-finance-forecast.service"),
  getPayrollFinanceForecast: jest.fn(),
}))

import { auditRbacDecision } from "@/lib/security/rbac"
import {
  getModuleControlCenterData,
  observeModuleAccess,
} from "@/services/modules/module-entitlement.service"
import { getCashDrawerDashboard } from "@/services/pos/drawer-dashboard.service"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import {
  buildBusinessSignalsFromSnapshots,
  createBusinessSignalFromFact,
} from "@/services/signals/business-signal-rules.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getInventoryLossSnapshot } from "@/services/snapshots/inventory-loss-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import { getPayrollFinanceForecast } from "@/services/payroll/payroll-finance-forecast.service"
import { db } from "@/prisma/db"

import {
  composeCashCommandData,
  getCashCommandData,
} from "../cash-command.service"

const generatedAt = "2026-06-24T08:00:00.000Z"

const mockAuditRbacDecision = auditRbacDecision as jest.Mock
const mockGetModuleControlCenterData = getModuleControlCenterData as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetCashDrawerDashboard = getCashDrawerDashboard as jest.Mock
const mockBuildActionQueue = buildActionQueue as jest.Mock
const mockBuildBusinessSignalsFromSnapshots =
  buildBusinessSignalsFromSnapshots as jest.Mock
const mockCreateBusinessSignalFromFact = createBusinessSignalFromFact as jest.Mock
const mockGetCloseReadinessSnapshot = getCloseReadinessSnapshot as jest.Mock
const mockGetInventoryCashSnapshot = getInventoryCashSnapshot as jest.Mock
const mockGetInventoryLossSnapshot = getInventoryLossSnapshot as jest.Mock
const mockGetPaymentTruthSnapshot = getPaymentTruthSnapshot as jest.Mock
const mockGetPayrollFinanceForecast = getPayrollFinanceForecast as jest.Mock
const mockFindPaymentTransaction = db.paymentTransaction.findFirst as jest.Mock
const mockFindJournalEntry = db.journalEntry.findFirst as jest.Mock
const mockFindReconciliationRun = db.reconciliationRun.findFirst as jest.Mock
const mockFindCloseRun = db.closeRun.findFirst as jest.Mock

describe("cash command service", () => {
  it.each(["blocked", "operational", "raw", "certified"] as const)("does not turn a zero close counter into an unsupported success (%s)", grade => {
    const close = closeSnapshot({ blockedCloseRunCount: 0, criticalOpenFindingCount: 0, unavailableEvidenceCount: 0 })
    close.evidenceGrade = grade
    close.blockers = []
    const data = composeCashCommandData({ organizationId: "org-1", organizationName: "Owned", generatedAt, currency: "XAF",
      snapshots: { tenantOperating: tenantSnapshot(), paymentTruth: paymentSnapshot(), inventoryCash: inventorySnapshot(), closeReadiness: close },
      drawerDashboard: drawerDashboard(), actionQueue: actionQueue(), moduleControl: moduleControl() })
    expect(data.trustSignals.find(signal => signal.id === "close_readiness")).toMatchObject({
      value: grade === "blocked" ? "Review required" : "0",
      tone: grade === "blocked" ? "danger" : grade === "certified" ? "success" : "info",
      evidenceGrade: grade,
    })
    expect(presentCashCommand(data, "fr").trustSignals.find(signal => signal.id === "close_readiness")?.value)
      .toBe(grade === "blocked" ? "Examen requis" : "0")
  })
  it("keeps missing close setup visible when legacy issue counts are zero", () => {
    const close = closeSnapshot({ blockedCloseRunCount: 0, criticalOpenFindingCount: 0, unavailableEvidenceCount: 0 })
    close.evidenceGrade = "raw"
    close.blockers = [{ id: "close-periods-missing", gate: "close_readiness", severity: "medium", title: "No accounting period covers this snapshot", detail: "Close readiness is partial until accounting periods exist for the selected date range.", sourceTables: ["accounting_periods"] }]
    const data = composeCashCommandData({ organizationId: "org-1", organizationName: "Owned", generatedAt, currency: "XAF",
      snapshots: { tenantOperating: tenantSnapshot(), paymentTruth: paymentSnapshot(), inventoryCash: inventorySnapshot(), closeReadiness: close },
      drawerDashboard: drawerDashboard(), actionQueue: actionQueue(), moduleControl: moduleControl() })
    expect(data.trustSignals.find(signal => signal.id === "close_readiness")).toMatchObject({ value: "Review required", tone: "gold" })
  })
  it("formats action and forecast dates in UTC even when the server default differs", () => {
    const OriginalDateTimeFormat = Intl.DateTimeFormat
    const formatter = jest.spyOn(Intl, "DateTimeFormat").mockImplementation((locale, options) => new OriginalDateTimeFormat(locale, { timeZone: "Pacific/Honolulu", ...options }))
    try {
      const queue = actionQueue()
      queue.actionItems[0].dueAt = "2026-07-01T00:30:00.000Z"
      const data = composeCashCommandData({ organizationId: "org-1", organizationName: "Owned", generatedAt, currency: "XAF",
        snapshots: { tenantOperating: tenantSnapshot({ payrollFinanceForecast: payrollForecastMetrics({ nextPayDate: "2026-07-01T00:30:00.000Z" }) }), paymentTruth: paymentSnapshot(), inventoryCash: inventorySnapshot(), closeReadiness: closeSnapshot() },
        drawerDashboard: drawerDashboard(), actionQueue: queue, moduleControl: moduleControl() })
      expect(data.actionsToday.find(item => item.id === queue.actionItems[0].id)?.dueLabel).toBe("Due Jul 1 (UTC)")
      expect(data.cards.find(card => card.id === "upcoming_payroll_net_pay")?.detail).toContain("Jul 1 (UTC)")
      const fr = presentCashCommand(data, "fr")
      expect(fr.actionsToday.find(item => item.id === queue.actionItems[0].id)?.dueLabel).toBe("Échéance : 1 juil. (UTC)")
      expect(fr.cards.find(card => card.id === "upcoming_payroll_net_pay")?.detail).toContain("1 juil. (UTC)")
    } finally { formatter.mockRestore() }
  })
  it("keeps suspense risk visible when the combined currency total is unavailable", () => {
    const data = composeCashCommandData({ organizationId: "org-1", organizationName: "Owned", generatedAt, currency: "XAF", snapshots: { tenantOperating: tenantSnapshot(), paymentTruth: paymentSnapshot({ openSuspenseAmount: null, openSuspenseCount: 2 }), inventoryCash: inventorySnapshot(), closeReadiness: closeSnapshot() }, drawerDashboard: drawerDashboard(), actionQueue: actionQueue(), moduleControl: moduleControl() })
    expect(data.summary.unreconciledCash).toBeNull()
    expect(data.cards.find(card => card.id === "unreconciled_cash")?.value).toBeNull()
    expect(data.risks).toContainEqual(expect.objectContaining({ title: "Unreconciled cash", moneyImpact: null, severity: "high" }))
    expect(data.commandBrief.summary).toContain("total unavailable")
  })
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
        "Cash collected in this period",
        "Unreconciled cash remains open",
        "Drawer risk needs review",
        "Provider risk is visible",
      ]),
    )
    expect(data.changes.length).toBeGreaterThan(0)
    expect(data.changes.every(change => change.direction === "observed" && change.previousValue === null)).toBe(true)
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

  it.each([
    { reasonCode: "PAYROLL_FORECAST_NO_UPCOMING_PERIODS", amount: 0, grade: "operational", state: "empty" },
    { reasonCode: "PAYROLL_FORECAST_SOURCE_LINKED", amount: 350000, grade: "posted", state: "ready" },
    { reasonCode: "UNRECOGNIZED_FORECAST_BASIS", amount: 350000, grade: "operational", state: "ready" },
  ])("derives forecast evidence from its basis: $reasonCode", ({ reasonCode, amount, grade, state }) => {
    const empty = amount === 0
    const forecast = payrollForecastMetrics({ reasonCode, upcomingNetPayAmount: amount, upcomingStatutoryLiabilityAmount: amount,
      totalUpcomingAmount: amount * 2, ...(empty ? { payrollPeriodCount: 0, payrollRunCount: 0, paymentBatchCount: 0, declarationCount: 0,
        sourceLinkCount: 0, evidenceHashCount: 0, nextPayDate: null, nextDeclarationDueDate: null } : {}) })
    const data = composeCashCommandData({ organizationId: "org-1", organizationName: "Owned", generatedAt, currency: "XAF",
      snapshots: { tenantOperating: tenantSnapshot({ payrollFinanceForecast: forecast }), paymentTruth: paymentSnapshot(), inventoryCash: inventorySnapshot(), closeReadiness: closeSnapshot() },
      drawerDashboard: drawerDashboard(), actionQueue: actionQueue(), moduleControl: moduleControl() })
    for (const id of ["upcoming_payroll_net_pay", "upcoming_statutory_liability"]) {
      expect(data.cards.find(card => card.id === id)).toMatchObject({ value: amount, state, evidenceGrade: grade, trustState: grade })
    }
    expect(data.summary.payrollForecastTotalAmount).toBe(amount * 2)
  })

  it("keeps blocked payroll forecast proof specific to payroll cash planning", () => {
    const tenant = tenantSnapshot({
      payrollFinanceForecast: payrollForecastMetrics({
        status: "NON_AUTHORITATIVE",
        authoritative: false,
        reasonCode: "PAYROLL_FORECAST_PROOF_INCOMPLETE",
        message: "Upcoming payroll finance forecasts are withheld because payroll proof is incomplete.",
        upcomingNetPayAmount: null,
        upcomingStatutoryLiabilityAmount: null,
        totalUpcomingAmount: null,
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
      value: null,
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
      value: null,
      state: "blocked",
      blockers: [expect.objectContaining({ gate: "payroll_finance_forecast" })],
    })
    expect(data.changes.map((change) => change.title)).toEqual(
      expect.arrayContaining(["Payroll forecast proof is blocked"]),
    )
    expect(data.changes.find(change => change.id === "cash-command-change:upcoming_payroll_net_pay")).toMatchObject({
      direction: "observed", previousValue: null, currentValue: tenant.metrics.payrollFinanceForecast.blockerCodes.length,
      unit: "blockers", format: "number",
    })
    expect(data.risks.map((risk) => risk.title)).toEqual(
      expect.arrayContaining(["Payroll forecast proof"]),
    )
    expect(data.summary.payrollForecastTotalAmount).toBeNull()
    expect(data.commandBrief.summary).toContain("total unavailable")
  })

  it.each([27500, null])("promotes employee balance recovery when its total is %s", amount => {
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
          employeeBalanceOutstandingAmount: amount,
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
      employeeBalanceOutstandingAmount: amount,
    })
    expect(data.cards.find((card) => card.id === "employee_balance_recovery")).toMatchObject({
      value: amount,
      requiredPermission: "payroll.payments.reconcile",
    })
    expect(data.commandBrief.primaryAction).toMatchObject({ href: "/dashboard/payroll/payments" })
    expect(data.changes.map((change) => change.title)).toEqual(
      expect.arrayContaining(["Employee balance recovery is open"]),
    )
  })
})

describe("getCashCommandData tenant authority", () => {
  const sourceMocks = (): jest.Mock[] => [
    db.organization.findFirst as jest.Mock,
    db.payment.aggregate as jest.Mock,
    db.payrollEmployeeBalanceCase.groupBy as jest.Mock,
    db.purchaseOrder.groupBy as jest.Mock,
    mockGetPayrollFinanceForecast,
    mockGetPaymentTruthSnapshot,
    mockGetInventoryCashSnapshot,
    mockGetInventoryLossSnapshot,
    mockGetCloseReadinessSnapshot,
    mockGetCashDrawerDashboard,
    mockGetModuleControlCenterData,
    mockObserveModuleAccess,
    mockBuildBusinessSignalsFromSnapshots,
    mockCreateBusinessSignalFromFact,
    mockBuildActionQueue,
    mockFindPaymentTransaction,
    mockFindJournalEntry,
    mockFindReconciliationRun,
    mockFindCloseRun,
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuditRbacDecision.mockResolvedValue(undefined)
    ;(db.organization.findFirst as jest.Mock).mockResolvedValue({ name: "Owned", currency: "XAF" })
    mockGetPayrollFinanceForecast.mockResolvedValue({ metrics: payrollForecastMetrics(), sourceMaxUpdatedAt: new Date(generatedAt), sourceEvidenceHash: "payroll-hash" })
    ;(db.payment.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 180000 }, _count: { _all: 1 }, _max: { updatedAt: new Date(generatedAt) } })
    ;(db.payrollEmployeeBalanceCase.groupBy as jest.Mock).mockResolvedValue([{ currency: "XAF", _sum: { outstandingAmount: 120000 }, _count: { _all: 2 }, _max: { updatedAt: new Date(generatedAt) } }])
    ;(db.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([])
    mockGetPaymentTruthSnapshot.mockResolvedValue(paymentSnapshot())
    mockGetInventoryCashSnapshot.mockResolvedValue(inventorySnapshot())
    mockGetCloseReadinessSnapshot.mockResolvedValue(closeSnapshot())
    mockGetCashDrawerDashboard.mockResolvedValue(drawerDashboard())
    mockGetModuleControlCenterData.mockResolvedValue(moduleControl())
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockGetInventoryLossSnapshot.mockResolvedValue(inventoryLossSnapshot())
    mockBuildBusinessSignalsFromSnapshots.mockReturnValue([])
    mockCreateBusinessSignalFromFact.mockImplementation(jest.requireActual("@/services/signals/business-signal-rules.service").createBusinessSignalFromFact)
    mockBuildActionQueue.mockReturnValue(actionQueue())
    mockFindPaymentTransaction.mockResolvedValue(null)
    mockFindJournalEntry.mockResolvedValue(null)
    mockFindReconciliationRun.mockResolvedValue(null)
    mockFindCloseRun.mockResolvedValue(null)
  })

  it.each([[], ["finance.read"], ["finance.read", "payments.reconciliation.read", "payroll.payments.reconcile", "payroll.command.read", "payroll.declarations.manage", "CASH_DRAWER_READ", "inventory.read", "inventory.items.read", "accounting.close.read", "accounting.journal.read", "purchases.orders.read"]])("localizes only disclosed display fields for permissions %j", async (...permissions) => {
    const data = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], actorPermissions: ["dashboard.read", ...permissions], now: generatedAt })
    const original = JSON.stringify(data)
    const fr = presentCashCommand(localizeCashCommandNavigation(data, "fr"), "fr")
    expect(presentCashCommand(data, "en")).toBe(data)
    expect(JSON.stringify(data)).toBe(original)
    expect(fr.commandBrief.title).toBe("Synthèse de trésorerie")
    expect(fr.commandBrief.conclusion).toContain("Un indicateur indisponible")
    expect(fr.summary).toEqual(data.summary)
    const localized = localizeCashCommandNavigation(data, "fr")
    // Every changed leaf must be a display string. No identifiers, arrays, values,
    // permission decisions, source hashes, timestamps or evidence grades may change.
    function compare(before: unknown, after: unknown, key = "") {
      if (before === after) return
      if (typeof before === "string" && typeof after === "string") {
        expect(["title", "detail", "summary", "conclusion", "label", "disabledReason", "unavailableReason", "nextAction", "nextStep", "reason", "staleReason", "businessImpact", "dueLabel", "ownerLabel", "unit", "value"]).toContain(key)
        return
      }
      expect(typeof after).toBe(typeof before)
      expect(Object.keys(after as object)).toEqual(Object.keys(before as object))
      for (const name of Object.keys(before as object)) compare((before as Record<string, unknown>)[name], (after as Record<string, unknown>)[name], name)
    }
    compare(localized, fr)
    for (const card of fr.cards) {
      expect(card.value).toEqual(data.cards.find(row => row.id === card.id)?.value)
      expect(card.title).not.toEqual(data.cards.find(row => row.id === card.id)?.title)
    }
    if (!data.cards.length) expect(fr.commandBrief.summary).toBe("Aucun indicateur de trésorerie n’est accessible avec vos droits actuels.")
    else expect(fr.commandBrief.summary).not.toContain("unavailable")
  })

  it("preserves custom copy and denied proof identity while translating canonical warnings", async () => {
    const data = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], actorPermissions: ["dashboard.read", "finance.read", "payroll.payments.reconcile", "payroll.command.read"], now: generatedAt })
    data.cards[0].detail = "PRIVATE CUSTOM TEXT: do not replace this caveat"
    data.cards[0].freshness = { ...data.cards[0].freshness, state: "stale", stale: true, staleReason: "Source data is 180 minutes old." }
    data.commandBrief.summary = "Custom source statement"
    const fr = presentCashCommand(data, "fr")
    expect(fr.cards[0].detail).toBe(data.cards[0].detail)
    expect(fr.cards[0].freshness).toEqual({ ...data.cards[0].freshness, staleReason: "Les données sources datent de 180 minutes." })
    expect(fr.commandBrief.summary).toBe(data.commandBrief.summary)
    expect(fr.proofSubjects.every(subject => !subject.available && !Object.hasOwn(subject, "subjectId"))).toBe(true)
    expect(fr.proofSubjects[0]).toMatchObject({ unavailableReason: "Vous n’avez pas l’autorisation de consulter cette preuve." })
    const before = data.cards.find(card => card.id === "upcoming_payroll_net_pay")!.redactions[0]
    const after = fr.cards.find(card => card.id === "upcoming_payroll_net_pay")!.redactions[0]
    expect(after).toMatchObject({ id: before.id, field: before.field, policy: before.policy, reason: expect.stringContaining("Vos droits") })
  })

  it.each([
    { name: "missing permission", permissions: ["finance.read"], moduleAllowed: true, expectedRead: false },
    { name: "suspended module", permissions: ["finance.read", "CASH_DRAWER_READ"], moduleAllowed: false, expectedRead: false },
    { name: "current read permission", permissions: ["finance.read", "CASH_DRAWER_READ"], moduleAllowed: true, expectedRead: true },
  ])("admits drawer queries before reading: $name", async ({ permissions, moduleAllowed, expectedRead }) => {
    mockObserveModuleAccess.mockImplementation(async ({ moduleSlug }) => ({ allowed: moduleSlug !== "cash_drawer" || moduleAllowed, readOnly: true }))
    const result = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["admin"], actorPermissions: permissions, now: generatedAt })
    expect(mockGetCashDrawerDashboard).toHaveBeenCalledTimes(expectedRead ? 1 : 0)
    expect(mockGetModuleControlCenterData).not.toHaveBeenCalled()
    expect(db.organization.findFirst).toHaveBeenCalledWith({ where: { id: "org-1", isActive: true, deletedAt: null }, select: { name: true, currency: true } })
    if (permissions.includes("CASH_DRAWER_READ")) {
      const gateIndex = mockObserveModuleAccess.mock.calls.findIndex(([args]) => args.surface === "cash-command.drawer-source")
      expect(gateIndex).toBeGreaterThanOrEqual(0)
      expect(mockObserveModuleAccess.mock.calls[gateIndex][0]).toMatchObject({ organizationId: "org-1", userId: "actor-1", accessIntent: "read", mode: "enforce", audit: true })
      if (expectedRead) expect(mockObserveModuleAccess.mock.invocationCallOrder[gateIndex]).toBeLessThan(mockGetCashDrawerDashboard.mock.invocationCallOrder[0])
    }
    if (!expectedRead) {
      expect(result.drawerState).toBeNull()
      expect(result.summary.drawerVariance).toBeNull()
      expect(result.summary.drawerAlertCount).toBeNull()
      expect(result.cards.some(card => card.id === "drawer_risk")).toBe(false)
      expect(result.trustSignals.some(signal => signal.id === "drawer_confidence")).toBe(false)
      expect(result.restrictedCapabilities).toContainEqual({ id: "drawer_risk", title: "Drawer risk", reason: permissions.includes("CASH_DRAWER_READ") ? "module_unavailable" : "permission_denied" })
    } else expect(result.drawerState?.drawerCount).toBe(drawerDashboard().summary.drawerCount)
  })

  it("does not query any sources for an unavailable organization", async () => {
    ;(db.organization.findFirst as jest.Mock).mockResolvedValueOnce(null)
    await expect(getCashCommandData({ organizationId: "missing-org", actorId: "actor-1", actorRoleCodes: ["admin"], actorPermissions: ["finance.read", "CASH_DRAWER_READ", "MANAGE_SYSTEM_SETTINGS"] })).rejects.toThrow("Organization is unavailable")
    for (const query of sourceMocks().filter(query => query !== db.organization.findFirst)) expect(query).not.toHaveBeenCalled()
  })

  it("keeps a failed drawer or module gate as a failure and retries with fresh admission", async () => {
    const input = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["admin"], actorPermissions: ["finance.read", "CASH_DRAWER_READ"], now: generatedAt }
    mockObserveModuleAccess.mockRejectedValueOnce(new Error("module unavailable"))
    await expect(getCashCommandData(input)).rejects.toThrow("module unavailable")
    expect(mockGetCashDrawerDashboard).not.toHaveBeenCalled()
    mockGetCashDrawerDashboard.mockRejectedValueOnce(new Error("drawer source unavailable"))
    await expect(getCashCommandData(input)).rejects.toThrow("drawer source unavailable")
    await expect(getCashCommandData(input)).resolves.toMatchObject({ drawerState: { drawerCount: drawerDashboard().summary.drawerCount } })
    mockGetCashDrawerDashboard.mockClear()
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })
    expect((await getCashCommandData(input)).drawerState).toBeNull()
    expect(mockGetCashDrawerDashboard).not.toHaveBeenCalled()
  })

  it("only queries module diagnostics with the settings permission and never converts their failure to success", async () => {
    const input = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["admin"], actorPermissions: ["finance.read", "MANAGE_SYSTEM_SETTINGS"], now: generatedAt }
    const allowed = await getCashCommandData(input)
    expect(mockGetModuleControlCenterData).toHaveBeenCalledTimes(1)
    expect(allowed.moduleControl).toMatchObject({ summary: moduleControl().summary })
    mockGetModuleControlCenterData.mockRejectedValueOnce(new Error("diagnostics unavailable"))
    await expect(getCashCommandData(input)).rejects.toThrow("diagnostics unavailable")
    mockGetModuleControlCenterData.mockClear()
    expect((await getCashCommandData({ ...input, actorPermissions: ["finance.read"] })).moduleControl).toBeNull()
    expect(mockGetModuleControlCenterData).not.toHaveBeenCalled()
  })

  it("loads each permitted source once and uses its own provenance", async () => {
    const payment = paymentSnapshot({ openSuspenseAmount: 456789 })
    const inventory = inventorySnapshot({ inventoryValue: 234567 })
    const close = closeSnapshot()
    mockGetPaymentTruthSnapshot.mockResolvedValueOnce(payment)
    mockGetInventoryCashSnapshot.mockResolvedValueOnce(inventory)
    mockGetCloseReadinessSnapshot.mockResolvedValueOnce(close)
    const result = await getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"],
      actorPermissions: ["finance.read", "payments.reconciliation.read", "inventory.read", "accounting.close.read"], now: generatedAt,
    })
    for (const source of [mockGetPaymentTruthSnapshot, mockGetInventoryCashSnapshot, mockGetCloseReadinessSnapshot]) {
      expect(source).toHaveBeenCalledTimes(1)
      expect(source).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", now: new Date(generatedAt) }))
    }
    expect(mockGetPayrollFinanceForecast).not.toHaveBeenCalled()
    expect(result.cards.find(card => card.id === "unreconciled_cash")?.value).toBe(456789)
    expect(result.cards.find(card => card.id === "stock_cash_buffer")?.value).toBe(234567)
  })

  it.each([
    ["payment", mockGetPaymentTruthSnapshot, "payments.reconciliation.read"],
    ["inventory", mockGetInventoryCashSnapshot, "inventory.read"],
    ["close", mockGetCloseReadinessSnapshot, "accounting.close.read"],
  ])("rejects a failed %s source before aggregate construction and permits a fresh retry", async (_name, source, permission) => {
    const failure = new Error("controlled related source failure")
    const input = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], actorPermissions: ["finance.read", permission as string], now: generatedAt }
    ;(source as jest.Mock).mockRejectedValueOnce(failure)
    await expect(getCashCommandData(input)).rejects.toBe(failure)
    expect(mockGetPayrollFinanceForecast).not.toHaveBeenCalled()
    expect(mockBuildBusinessSignalsFromSnapshots).not.toHaveBeenCalled()
    expect(mockFindPaymentTransaction).not.toHaveBeenCalled()
    await expect(getCashCommandData(input)).resolves.toMatchObject({ organizationId: "org-1" })
    expect(source).toHaveBeenCalledTimes(2)
  })

  it("does not discover or disclose proof identifiers without their read permissions", async () => {
    mockFindPaymentTransaction.mockResolvedValue({ id: "private-payment-proof" })
    mockFindJournalEntry.mockResolvedValue({ id: "private-journal-proof" })
    mockFindReconciliationRun.mockResolvedValue({ id: "private-reconciliation-proof" })
    mockFindCloseRun.mockResolvedValue({ id: "private-close-proof" })
    const result = await getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorPermissions: ["finance.read"],
      actorRoleCodes: ["administrator"], now: generatedAt,
    })
    for (const query of [mockFindPaymentTransaction, mockFindJournalEntry, mockFindReconciliationRun, mockFindCloseRun]) {
      expect(query).not.toHaveBeenCalled()
    }
    expect(JSON.stringify(result)).not.toContain("private-")
    expect(result.proofSubjects.every(subject => !subject.available)).toBe(true)
  })

  it("checks each proof module before discovery and retains authorized period and tenant scope", async () => {
    mockObserveModuleAccess.mockImplementation(async ({ moduleSlug }) => ({ allowed: moduleSlug === "accounting" }))
    mockFindJournalEntry.mockResolvedValue({ id: "posted-owned-journal" })
    const actorPermissions = ["finance.read", "accounting.journal.read", "payments.reconciliation.read", "accounting.close.read"]
    const result = await getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorPermissions,
      actorRoleCodes: ["administrator"], now: generatedAt,
    })
    expect(mockFindPaymentTransaction).not.toHaveBeenCalled()
    expect(mockFindReconciliationRun).not.toHaveBeenCalled()
    expect(mockFindCloseRun).not.toHaveBeenCalled()
    expect(mockFindJournalEntry).toHaveBeenCalledWith({
      where: { organizationId: "org-1", status: "POSTED", entryDate: {
        gte: new Date("2026-06-24T00:00:00.000Z"), lte: new Date("2026-06-24T23:59:59.999Z"),
      } }, orderBy: { updatedAt: "desc" }, select: { id: true },
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1", userId: "actor-1", actorPermissions, moduleSlug: "accounting",
      accessIntent: "read", mode: "enforce", audit: true,
    }))
    expect(result.proofSubjects.filter(subject => subject.available)).toEqual([
      expect.objectContaining({ subjectType: "journal.entry", subjectId: "posted-owned-journal" }),
    ])
  })

  it("discovers only owned in-period proofs after read admission, including read-only modules", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, readOnly: true })
    mockFindPaymentTransaction.mockResolvedValue({ id: "payment-owned" })
    mockFindJournalEntry.mockResolvedValue({ id: "journal-owned" })
    mockFindReconciliationRun.mockResolvedValue({ id: "reconciliation-owned" })
    mockFindCloseRun.mockResolvedValue({ id: "close-owned" })
    const result = await getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "accounting.journal.read", "payments.reconciliation.read", "accounting.close.read"],
    })
    expect(result.proofSubjects.filter(subject => subject.available)).toHaveLength(4)
    expect(mockObserveModuleAccess.mock.calls.filter(([args]) => args.surface === "cash-command.proof-discovery")).toHaveLength(3)
    for (const [args] of mockObserveModuleAccess.mock.calls) expect(args.accessIntent).toBe("read")
    const range = { gte: new Date("2026-06-24T00:00:00.000Z"), lte: new Date("2026-06-24T23:59:59.999Z") }
    expect(mockFindPaymentTransaction).toHaveBeenCalledWith(expect.objectContaining({ where: {
      organizationId: "org-1", OR: [{ occurredAt: range }, { confirmedAt: range }, { settledAt: range }],
    } }))
    expect(mockFindReconciliationRun).toHaveBeenCalledWith(expect.objectContaining({ where: {
      organizationId: "org-1", voidedAt: null, businessDate: range,
    } }))
    expect(mockFindCloseRun).toHaveBeenCalledWith(expect.objectContaining({ where: {
      organizationId: "org-1", period: { organizationId: "org-1", startDate: { lte: range.lte }, endDate: { gte: range.gte } },
    }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }))
  })

  it("discovers the latest assessment without filtering adverse states or promoting recently updated history", async () => {
    mockFindCloseRun.mockResolvedValue({ id: "latest-voided-assessment" })
    const result = await getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "accounting.close.read"],
    })
    expect(mockFindCloseRun).toHaveBeenCalledTimes(1)
    expect(mockFindCloseRun).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        period: { organizationId: "org-1", startDate: { lte: new Date("2026-06-24T23:59:59.999Z") }, endDate: { gte: new Date("2026-06-24T00:00:00.000Z") } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    })
    expect(result.proofSubjects).toContainEqual(expect.objectContaining({
      subjectType: "close.run", subjectId: "latest-voided-assessment", available: true,
    }))
  })

  it("does not cache a previous module admission across requests", async () => {
    mockFindJournalEntry.mockResolvedValue({ id: "previously-visible-journal" })
    const input = {
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "accounting.journal.read"],
    }
    expect(JSON.stringify(await getCashCommandData(input))).toContain("previously-visible-journal")
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })
    mockFindJournalEntry.mockClear()
    const denied = await getCashCommandData(input)
    expect(mockFindJournalEntry).not.toHaveBeenCalled()
    expect(JSON.stringify(denied)).not.toContain("previously-visible-journal")
    expect(denied.proofSubjects.find(subject => subject.moduleSlug === "accounting")).toMatchObject({
      available: false, unavailableReason: "This workspace does not currently allow reading this proof.",
    })
  })

  it("does not convert a proof-query exception into an empty or successful result", async () => {
    mockFindJournalEntry.mockRejectedValue(new Error("controlled proof lookup failure"))
    await expect(getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "accounting.journal.read"],
    })).rejects.toThrow("controlled proof lookup failure")
  })

  it("waits for authoritative module admission before touching proof records", async () => {
    let resolveAdmission!: (value: { allowed: boolean }) => void
    let admissionStarted!: () => void
    const started = new Promise<void>(resolve => { admissionStarted = resolve })
    mockObserveModuleAccess.mockImplementation(({ surface }) => {
      if (surface !== "cash-command.proof-discovery") return Promise.resolve({ allowed: true })
      admissionStarted()
      return new Promise(resolve => { resolveAdmission = resolve })
    })
    const pending = getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "accounting.journal.read"],
    })
    await started
    expect(mockFindJournalEntry).not.toHaveBeenCalled()
    resolveAdmission({ allowed: true })
    await pending
    expect(mockFindJournalEntry).toHaveBeenCalledTimes(1)
  })

  it("fails closed when module admission fails", async () => {
    mockObserveModuleAccess.mockRejectedValue(new Error("controlled module lookup failure"))
    await expect(getCashCommandData({
      organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "accounting.journal.read"],
    })).rejects.toThrow("controlled module lookup failure")
    expect(mockFindJournalEntry).not.toHaveBeenCalled()
  })

  it.each([
    { id: "stock_cash_buffer", source: "inventory.read", route: "/dashboard/inventory/items", destination: ["inventory.items.read"] },
    { id: "employee_balance_recovery", source: "payroll.payments.reconcile", route: "/dashboard/payroll/payments", destination: ["payments.reconciliation.read", "payroll.command.read"] },
    { id: "upcoming_statutory_liability", source: "payroll.declarations.manage", route: "/dashboard/payroll/declarations", destination: ["payroll.command.read"] },
  ])("preserves $id aggregate while enforcing destination authority on every representation", async ({ id, source, route, destination }) => {
    const request = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["admin"], now: generatedAt }
    const denied = await getCashCommandData({ ...request, actorPermissions: ["finance.read", source] })
    const card = denied.cards.find(row => row.id === id)!
    expect(card).toBeDefined()
    expect(card.actionLink).toMatchObject({ href: route, disabled: true, disabledReason: expect.any(String) })
    expect(card.drillThrough).toMatchObject({ available: false, unavailableReason: expect.any(String) })
    for (const row of [...denied.changes, ...denied.risks].filter(row => row.actionLink?.href === route)) {
      expect(row.actionLink?.disabled).toBe(true)
      expect(row.drillThrough?.available).toBe(false)
    }
    expect(denied.commandBrief.primaryAction?.href).not.toBe(route)
    expect(denied.actionsToday.some(row => row.actionLink.href === route)).toBe(false)
    const allowed = await getCashCommandData({ ...request, actorPermissions: ["finance.read", source, ...destination] })
    const admitted = allowed.cards.find(row => row.id === id)!
    expect(admitted.value).toBe(card.value)
    expect(admitted.actionLink).toMatchObject({ href: route, disabled: false })
    // Each required destination permission matters independently.
    for (const missing of destination) {
      const again = await getCashCommandData({ ...request, actorPermissions: ["finance.read", source, ...destination.filter(value => value !== missing)] })
      expect(again.cards.find(row => row.id === id)?.actionLink?.disabled).toBe(true)
    }
    for (const locale of ["en", "fr"] as const) {
      const localized = localizeCashCommandNavigation(allowed, locale)
      const localizedCard = localized.cards.find(row => row.id === id)!
      expect(localizedCard.actionLink?.href).toBe("/" + locale + route)
      expect(localizedCard.provenance).toEqual(admitted.provenance)
      expect(localized.summary).toEqual(allowed.summary)
      for (const row of [...localized.changes, ...localized.risks]) {
        if (row.actionLink) expect(row.actionLink.href).toMatch(new RegExp("^/" + locale + "/"))
        if (row.drillThrough?.available && row.drillThrough.href) expect(row.drillThrough.href).toMatch(new RegExp("^/" + locale + "/"))
      }
      const localizedDenied = localizeCashCommandNavigation(denied, locale).cards.find(row => row.id === id)!
      expect(localizedDenied.actionLink?.disabledReason).toContain(locale === "fr" ? "vos droits actuels" : "your current access")
    }
  })

  it.each(["finance.cash-drawer.read", "CASH_DRAWER_READ"])("preserves canonical and legacy drawer read access: %s", async destination => {
    const request = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["admin"], now: generatedAt }
    const sourcePermissions = ["dashboard.read"]
    const route = "/dashboard/finance/cash-drawer"
    const denied = await getCashCommandData({ ...request, actorPermissions: sourcePermissions })
    expect(denied.cards.some(row => row.id === "drawer_risk")).toBe(false)
    expect(denied.commandBrief.primaryAction?.href).not.toBe(route)
    expect(denied.actionsToday.some(row => row.actionLink.href === route)).toBe(false)
    expect([...denied.changes, ...denied.risks].some(row => row.actionLink?.href === route)).toBe(false)
    const admitted = await getCashCommandData({ ...request, actorPermissions: [...sourcePermissions, destination] })
    expect(admitted.cards.find(row => row.id === "drawer_risk")).toMatchObject({ actionLink: { href: route, disabled: false } })
    expect(admitted.drawerState).not.toBeNull()
    const revoked = await getCashCommandData({ ...request, actorPermissions: sourcePermissions })
    expect(revoked.cards.some(row => row.id === "drawer_risk")).toBe(false)
  })

  it("withholds every denied aggregate representation, not just its action link", async () => {
    const result = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1",
      actorRoleCodes: ["administrator"], actorPermissions: ["finance.read"], now: generatedAt })
    expect(result.summary.upcomingPayrollNetPayAmount).toBeNull()
    expect(result.summary.upcomingStatutoryLiabilityAmount).toBeNull()
    expect(result.summary.payrollForecastTotalAmount).toBeNull()
    expect(result.summary.openSuspenseCount).toBeNull()
    expect(result.summary.activeEmployeeBalanceCaseCount).toBeNull()
    expect(result.summary.cashCollected).toBe(180000)
    expect(result.cards.map(card => card.id)).toEqual(["cash_collected"])
    expect(result.drawerState).toBeNull()
    expect(result.moduleControl).toBeNull()
    expect(result.actionQueue.filteredOutCount).toBeNull()
    const encoded = JSON.stringify(result)
    for (const privateValue of ["350000", "90000", "440000", "tenant-hash", "payment-hash", "inventory-hash", "close-hash", "suspense_items"]) {
      expect(encoded).not.toContain(privateValue)
    }
    expect(result.commandBrief.state).toBe("partial")
  })

  it("keeps payment and declaration payroll permissions separate", async () => {
    const result = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1",
      actorRoleCodes: ["administrator"], actorPermissions: ["dashboard.read", "payroll.payments.reconcile"], now: generatedAt })
    expect(result.summary.upcomingPayrollNetPayAmount).toBe(350000)
    expect(result.summary.upcomingStatutoryLiabilityAmount).toBeNull()
    expect(result.summary.payrollForecastTotalAmount).toBeNull()
    expect(JSON.stringify(result)).not.toContain("90000")
    expect(JSON.stringify(result)).not.toContain("440000")
  })

  it("withholds aggregates when their module read admission is denied", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })
    const result = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1",
      actorRoleCodes: ["administrator"], actorPermissions: ["finance.read"], now: generatedAt })
    expect(result.cards).toEqual([])
    expect(result.summary.cashCollected).toBeNull()
    expect(result.commandBrief.summary).not.toContain("180000")
    expect(result.commandBrief.state).toBe("partial")
  })

  it("does not let changes in denied sources alter the disclosed response", async () => {
    const input = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], actorPermissions: ["finance.read"], now: generatedAt }
    const before = await getCashCommandData(input)
    const hidden = tenantSnapshot({ activeEmployeeBalanceCaseCount: 98765, employeeBalanceOutstandingAmount: 778899,
      payrollFinanceForecast: payrollForecastMetrics({ upcomingNetPayAmount: 1234567, upcomingStatutoryLiabilityAmount: 7654321, totalUpcomingAmount: 8888888,
        nextPayDate: "2099-01-01", nextDeclarationDueDate: "2099-02-01", message: "PRIVATE FORECAST MESSAGE" }) })
    hidden.sourceHash = "PRIVATE SOURCE HASH"
    hidden.status = "blocked"
    hidden.evidenceGrade = "blocked"
    hidden.freshness = freshness({ sourceMaxUpdatedAt: "2099-01-01", stale: true, staleReason: "PRIVATE TIMING" })
    hidden.blockers = [{ id: "private-blocker", gate: "payroll_finance_forecast", severity: "critical", title: "PRIVATE TITLE", detail: "PRIVATE DETAIL", sourceTables: ["private_table"] }]
    mockGetPayrollFinanceForecast.mockResolvedValue({ metrics: hidden.metrics.payrollFinanceForecast, sourceMaxUpdatedAt: new Date("2099-01-01"), sourceEvidenceHash: hidden.sourceHash })
    mockGetPaymentTruthSnapshot.mockResolvedValue(paymentSnapshot({ openSuspenseAmount: 332211, openSuspenseCount: 93, pendingTransactionCount: 44 }))
    mockGetInventoryCashSnapshot.mockResolvedValue(inventorySnapshot({ inventoryValue: 554433 }))
    const queue = actionQueue(); queue.summary.total = 54321; queue.filteredOutCount = 87654
    mockBuildActionQueue.mockReturnValue(queue)
    expect(await getCashCommandData(input)).toEqual(before)
  })

  it("preserves explicitly permitted full-domain values and source evidence", async () => {
    const result = await getCashCommandData({ organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt,
      actorPermissions: ["finance.read", "payments.reconciliation.read", "CASH_DRAWER_READ", "inventory.read", "payroll.payments.reconcile", "payroll.declarations.manage", "accounting.close.read", "accounting.journal.read", "MANAGE_SYSTEM_SETTINGS"] })
    expect(result.summary.upcomingPayrollNetPayAmount).toBe(350000)
    expect(result.summary.upcomingStatutoryLiabilityAmount).toBe(90000)
    expect(result.summary.payrollForecastTotalAmount).toBe(440000)
    expect(result.cards).toHaveLength(9)
    expect(result.cards.find(card => card.id === "cash_collected")?.provenance).toMatchObject({ sourceKind: "cash.collected", sourceHash: expect.any(String), sourceModules: ["finance"] })
    expect(result.drawerState).not.toBeNull()
    expect(result.moduleControl).not.toBeNull()
  })

  it("re-evaluates domain permissions after a previously allowed response", async () => {
    const input = { organizationId: "org-1", actorId: "actor-1", actorRoleCodes: ["administrator"], now: generatedAt }
    expect((await getCashCommandData({ ...input, actorPermissions: ["finance.read", "payroll.payments.reconcile"] })).summary.upcomingPayrollNetPayAmount).toBe(350000)
    const denied = await getCashCommandData({ ...input, actorPermissions: ["finance.read"] })
    expect(denied.summary.upcomingPayrollNetPayAmount).toBeNull()
    expect(JSON.stringify(denied)).not.toContain("350000")
  })

  it.each([
    {
      label: "missing actor",
      overrides: { actorId: "   " },
      reason: "Missing actor identity",
    },
    {
      label: "missing permission",
      overrides: { actorPermissions: [] },
      reason: "Missing permission",
    },
    {
      label: "manager",
      overrides: { actorRoleCodes: ["manager"] },
      reason: "Tenant-wide operating authority required",
    },
    {
      label: "literal owner",
      overrides: { actorRoleCodes: ["owner"] },
      reason: "Tenant-wide operating authority required",
    },
    {
      label: "org admin",
      overrides: { actorRoleCodes: ["org_admin"] },
      reason: "Tenant-wide operating authority required",
    },
  ])("denies $label before every source read", async ({ overrides, reason }) => {
    const input = {
      organizationId: "org-1",
      actorId: "actor-1" as string | null,
      actorPermissions: ["finance.read"] as readonly string[],
      actorRoleCodes: ["administrator"] as readonly string[],
      isSuperUser: false,
      ...overrides,
    }

    await expect(getCashCommandData(input)).rejects.toMatchObject({
      name: "RbacError",
      code: "FORBIDDEN",
      status: 403,
    })

    const actorId = input.actorId?.trim()
    expect(mockAuditRbacDecision).toHaveBeenCalledWith({
      ctx: actorId
        ? {
            userId: actorId,
            orgId: "org-1",
          }
        : null,
      permission: "finance.read",
      result: "denied",
      resource: "KontavaCashCommand",
      reason,
    })
    for (const sourceMock of sourceMocks()) {
      expect(sourceMock).not.toHaveBeenCalled()
    }
  })

  it.each([
    {
      label: "administrator",
      actorPermissions: ["finance.read"],
      actorRoleCodes: [" AdMiNiStrAtOr "],
      isSuperUser: false,
    },
    {
      label: "super-user",
      actorPermissions: ["dashboard.read"],
      actorRoleCodes: [],
      isSuperUser: true,
    },
  ])("allows $label authority to load Cash Command", async ({
    actorPermissions,
    actorRoleCodes,
    isSuperUser,
  }) => {
    const result = await getCashCommandData({
      organizationId: "org-1",
      actorId: "actor-1",
      actorPermissions,
      actorRoleCodes,
      isSuperUser,
      now: generatedAt,
    })

    expect(result.organizationId).toBe("org-1")
    expect(mockAuditRbacDecision).not.toHaveBeenCalled()
    expect(mockGetPayrollFinanceForecast).not.toHaveBeenCalled()
    expect(mockGetPaymentTruthSnapshot).not.toHaveBeenCalled()
    expect(mockGetInventoryCashSnapshot).not.toHaveBeenCalled()
    expect(mockGetCloseReadinessSnapshot).not.toHaveBeenCalled()
    expect(mockGetCashDrawerDashboard).not.toHaveBeenCalled()
    expect(mockGetModuleControlCenterData).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess.mock.calls.filter(([args]) => args.surface === "cash-command.source")).toHaveLength(actorPermissions.includes("finance.read") ? 1 : 0)
    expect(mockGetInventoryLossSnapshot).not.toHaveBeenCalled()
    expect(mockFindPaymentTransaction).not.toHaveBeenCalled()
    expect(mockFindJournalEntry).not.toHaveBeenCalled()
    expect(mockFindReconciliationRun).not.toHaveBeenCalled()
    expect(mockFindCloseRun).not.toHaveBeenCalled()
  })

  it("adds one tenant-wide Inventory Loss action for an entitled administrator", async () => {
    const actualSignalRules = jest.requireActual(
      "@/services/signals/business-signal-rules.service",
    ) as typeof import("@/services/signals/business-signal-rules.service")
    const actualActionQueue = jest.requireActual(
      "@/services/signals/action-queue.service",
    ) as typeof import("@/services/signals/action-queue.service")
    const actorPermissions = ["finance.read", "inventory.levels.read"]

    mockBuildBusinessSignalsFromSnapshots.mockImplementation(
      actualSignalRules.buildBusinessSignalsFromSnapshots,
    )
    mockCreateBusinessSignalFromFact.mockImplementation(
      actualSignalRules.createBusinessSignalFromFact,
    )
    mockBuildActionQueue.mockImplementation(actualActionQueue.buildActionQueue)

    const result = await getCashCommandData({
      organizationId: "org-1",
      actorId: "actor-1",
      actorPermissions,
      actorRoleCodes: [" Administrator "],
      isSuperUser: false,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-20",
      maxAgeMinutes: 45,
      now: generatedAt,
    })

    expect(mockObserveModuleAccess.mock.calls.filter(([args]) => args.surface === "cash-command.inventory-loss")).toHaveLength(1)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "actor-1",
      actorPermissions,
      moduleSlug: "inventory",
      surfaceType: "report",
      surface: "cash-command.inventory-loss",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
      now: generatedAt,
    })
    expect(mockGetInventoryLossSnapshot).toHaveBeenCalledTimes(1)
    expect(mockGetInventoryLossSnapshot).toHaveBeenCalledWith({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-20",
      maxAgeMinutes: 45,
      now: generatedAt,
    })
    expect(mockBuildBusinessSignalsFromSnapshots).toHaveBeenCalledWith({
      organizationId: "org-1",
      snapshots: expect.arrayContaining([
        expect.objectContaining({
          kind: "inventory.loss",
          organizationId: "org-1",
          locationId: null,
        }),
      ]),
      now: generatedAt,
    })
    expect(result.actionsToday).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Recorded inventory loss needs review",
          actionLink: expect.objectContaining({
            href: "/dashboard/inventory/loss-control",
            requiredPermission: "inventory.levels.read",
            moduleSlug: "inventory",
          }),
        }),
      ]),
    )
    expect(result).not.toHaveProperty("inventoryLoss")
  })

  it("keeps Cash Command available when inventory entitlement denies", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })

    const result = await getCashCommandData({
      organizationId: "org-1",
      actorId: "actor-1",
      actorPermissions: ["finance.read", "inventory.levels.read"],
      actorRoleCodes: ["administrator"],
      isSuperUser: false,
      now: generatedAt,
    })

    expect(result.organizationId).toBe("org-1")
    expect(mockObserveModuleAccess.mock.calls.filter(([args]) => args.surface === "cash-command.inventory-loss")).toHaveLength(1)
    expect(mockGetInventoryLossSnapshot).not.toHaveBeenCalled()
    expect(result.actionsToday).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionLink: expect.objectContaining({
            href: "/dashboard/inventory/loss-control",
          }),
        }),
      ]),
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

function inventoryLossSnapshot(
  overrides: Partial<InventoryLossMetrics> = {},
): SnapshotResult<InventoryLossMetrics> {
  return {
    kind: "inventory.loss",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    status: "fresh",
    uiState: "redacted",
    evidenceGrade: "operational",
    freshness: freshness(),
    sourceHash: "inventory-loss-hash",
    generatedAt,
    sourceModules: ["inventory"],
    metrics: {
      lossLineCount: 2,
      adjustmentCount: 1,
      totalLossValue: 45000,
      currency: "XAF",
      countVarianceLineCount: 0,
      damagedLineCount: 2,
      expiredLineCount: 0,
      recordedTheftCategoryLineCount: 0,
      writeOffLineCount: 0,
      evidenceCoveredLineCount: 2,
      evidenceCoveragePercent: 100,
      valuationCoveredLineCount: 2,
      valuationCoveragePercent: 100,
      approvalAttributedLineCount: 2,
      approvalCoveragePercent: 100,
      missingEvidenceLineCount: 0,
      missingValuationLineCount: 0,
      missingApprovalAttributionLineCount: 0,
      sourceTruncated: false,
      ...overrides,
    },
    blockers: [],
    redactions: [
      {
        id: "inventory-loss-evidence-hashes-redacted",
        field: "records.evidence.*Hash",
        reason: "Source evidence hashes remain server-side.",
        policy: "INVENTORY_LOSS_EVIDENCE_REDACTION",
      },
    ],
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
