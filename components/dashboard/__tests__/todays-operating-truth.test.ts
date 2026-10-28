jest.mock("lucide-react", () => {
  const Icon = () => null

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return Icon
      },
    },
  )
})
import { buildTodaysOperatingTruthModel } from "@/components/dashboard/todays-operating-truth"
import type { DashboardData } from "@/actions/dashboard/getDashboardData"
import type { TenantOperatingCommandCard } from "@/services/snapshots/snapshot-contracts"

function buildDashboard(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    organization: {
      id: "org-1",
      name: "Tenant One",
      slug: "tenant-one",
      country: "Cameroon",
      countryCode: "CM",
      taxIdentifier: "M012345678901A",
      currency: "XAF",
    },
    period: {
      key: "30d",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-26T23:59:59.000Z",
      previousFrom: "2026-05-01T00:00:00.000Z",
      previousTo: "2026-05-31T23:59:59.000Z",
    },
    filters: {},
    generatedAt: "2026-06-26T08:00:00.000Z",
    kpis: {
      revenue: { current: 1250000, previous: 1000000, change: 25 },
      orders: { current: 42, previous: 40, change: 5 },
      customers: { current: 18, previous: 18, change: 0 },
      inventoryValue: { current: 560000, previous: 600000, change: -6.7 },
      averageOrderValue: { current: 29762, previous: 25000, change: 19 },
      cashCollected: { current: 980000, previous: 900000, change: 8.9 },
    },
    stockHealth: {
      trackedItems: 22,
      inStock: 18,
      lowStock: 2,
      outOfStock: 1,
      overstock: 0,
      reorderCandidates: 3,
      availableUnits: 420,
      reservedUnits: 18,
    },
    salesTrend: [],
    topProducts: [],
    locations: [],
    alerts: [
      {
        id: "alert-1",
        type: "critical",
        title: "Low stock needs review",
        description: "One product is out of stock.",
        href: "/dashboard/inventory",
      },
    ],
    activities: [
      {
        id: "activity-1",
        type: "sale",
        title: "Sale posted",
        description: "SO-001 was completed.",
        timestamp: "2026-06-26T07:45:00.000Z",
        status: "success",
        href: "/dashboard/sales",
      },
    ],
    pendingActions: [
      { id: "info-action", label: "Review report", count: 1, href: "/dashboard/analytics", severity: "info" },
      { id: "critical-action", label: "Reorder stock", count: 3, href: "/dashboard/inventory", severity: "critical" },
    ],
    counts: {
      activeLocations: 2,
      activeSessions: 1,
      pendingPurchaseOrders: 2,
      openSalesOrders: 4,
      totalCustomers: 18,
      totalItems: 22,
    },
    setupProgress: {
      completedRequiredSteps: 6,
      totalRequiredSteps: 7,
      percent: 86,
      steps: [
        { key: "company_profile", status: "complete", href: "/dashboard/settings/company", sourceCount: 4, required: true },
        { key: "locations", status: "complete", href: "/dashboard/settings/locations", sourceCount: 2, required: true },
        { key: "roles_permissions", status: "complete", href: "/dashboard/settings/roles", sourceCount: 5, required: true },
        { key: "inventory_catalog", status: "complete", href: "/dashboard/inventory/items", sourceCount: 22, required: true },
        { key: "pos_setup", status: "complete", href: "/dashboard/settings/terminals", sourceCount: 1, required: true },
        { key: "finance_accounts", status: "in_progress", href: "/dashboard/accounting/setup", sourceCount: 1, required: true },
        { key: "payroll_setup", status: "optional", href: "/dashboard/payroll", sourceCount: 0, required: false },
        { key: "proof_checkpoint", status: "complete", href: "/dashboard/assurance/control-tower", sourceCount: 3, required: true },
      ],
    },
    ...overrides,
  }
}

describe("buildTodaysOperatingTruthModel", () => {
  it("builds a command-center model from trusted dashboard data and localized links", () => {
    const model = buildTodaysOperatingTruthModel({
      dashboard: buildDashboard(),
      locale: "en",
      dashboardBasePath: "/en/dashboard",
      selectedLocationLabel: "All locations",
    })

    expect(model.brief.title).toBe("Daily Business Confidence Brief")
    expect(model.brief.summary).toContain("Tenant One")
    expect(model.brief.actions?.[0].href).toBe("/en/dashboard/owner-war-room")
    expect(model.kpis.map((kpi) => kpi.label)).toEqual([
      "Revenue",
      "Margin",
      "Cash collected",
      "Stock risk",
      "Open obligations",
    ])
    expect(model.status.title).toBe("Trust states")
    expect(model.status.items.map((item) => item.id)).toEqual([
      "pos",
      "stock",
      "cash",
      "ap",
      "close",
      "payroll",
      "compliance",
    ])
    expect(model.status.items.find((item) => item.id === "payroll")?.proof?.state).toBe("unavailable")
    expect(model.actionQueue.items[0].id).toBe("critical-action")
    expect(model.actionQueue.items[0].action?.href).toBe("/en/dashboard/inventory")
    expect(model.evidence.events.map((event) => event.title)).toContain("Low stock needs review")
    expect(model.onboarding.progressLabel).toBe("6/7 required ready - 86%")
    expect(model.onboarding.steps.find((step) => step.id === "finance_accounts")?.stateLabel).toBe("In progress")
    expect(model.onboarding.steps.find((step) => step.id === "company_profile")?.href).toBe("/en/dashboard/settings/company")
  })

  it("marks unavailable metrics as partial instead of inventing business truth", () => {
    const model = buildTodaysOperatingTruthModel({
      dashboard: buildDashboard({ alerts: [], pendingActions: [] }),
      locale: "fr",
      dashboardBasePath: "/fr/dashboard",
      selectedLocationLabel: "Tous les lieux",
    })

    const margin = model.kpis.find((kpi) => kpi.label === "Marge")

    expect(model.actionQueue.items).toEqual([])
    expect(model.brief.state?.tone).toBe("success")
    expect(margin?.value).toBe("Non disponible")
    expect(margin?.proof?.state).toBe("unavailable")
    expect(model.shortcuts.actions.some((action) => action.href === "/fr/dashboard/payroll")).toBe(true)
    expect(model.onboarding.steps.find((step) => step.id === "payroll_setup")?.stateLabel).toBe("Optionnel")
  })

  it("uses command-card contract states for blocked, partial, and unavailable dashboard signals", () => {
    const freshness = {
      generatedAt: "2026-06-26T08:00:00.000Z",
      sourceMaxUpdatedAt: null,
      maxAgeMinutes: 1440,
      stale: false,
      staleReason: null,
    }
    const commandCards: TenantOperatingCommandCard[] = [
      {
        id: "payment",
        label: "Payment reconciliation",
        detail: "Payment proof is blocked.",
        metricLabel: "Open payment issues",
        value: 2,
        valueFormat: "number",
        scope: "tenant_period",
        uiState: "blocked",
        evidenceGrade: "blocked",
        freshness,
        blockerState: "blocked",
        blockerCount: 2,
        actionRoute: "/dashboard/finance/reconciliation",
        proofRoute: "/dashboard/finance/reconciliation",
        requiredPermission: "payments.reconciliation.read",
        sourceModules: ["payments", "finance"],
      },
      {
        id: "ap",
        label: "AP exposure",
        detail: "AP proof is partial.",
        metricLabel: "Pending purchase orders",
        value: 4,
        valueFormat: "number",
        scope: "tenant_period",
        uiState: "partial",
        evidenceGrade: "operational",
        freshness,
        blockerState: "partial",
        blockerCount: 4,
        actionRoute: "/dashboard/purchases/payables",
        proofRoute: "/dashboard/purchases/payables",
        requiredPermission: "finance.payables.read",
        sourceModules: ["purchasing", "finance"],
      },
      {
        id: "security",
        label: "Security posture",
        detail: "Security source is not connected yet.",
        metricLabel: "Proof signals",
        value: null,
        valueFormat: "number",
        scope: "tenant",
        uiState: "module_unavailable",
        evidenceGrade: "raw",
        freshness,
        blockerState: "unavailable",
        blockerCount: 0,
        actionRoute: "/dashboard/settings/security",
        proofRoute: "/dashboard/assurance/control-tower",
        requiredPermission: "PASSWORD_READ",
        sourceModules: ["dashboard", "security"],
      },
    ]

    const model = buildTodaysOperatingTruthModel({
      dashboard: buildDashboard({ alerts: [], operatingCommandCards: commandCards }),
      locale: "en",
      dashboardBasePath: "/en/dashboard",
      selectedLocationLabel: "All locations",
    })

    expect(model.brief.state).toMatchObject({ label: "Blocked proof", tone: "danger" })
    expect(model.brief.proof).toMatchObject({ state: "blocked", sourceCount: 0 })
    expect(model.status.items.map((item) => item.id)).toEqual(["payment", "ap", "security"])
    expect(model.status.items.find((item) => item.id === "payment")).toMatchObject({
      tone: "danger",
      href: "/en/dashboard/finance/reconciliation",
      proof: expect.objectContaining({ state: "blocked" }),
    })
    expect(model.status.items.find((item) => item.id === "ap")).toMatchObject({
      tone: "gold",
      href: "/en/dashboard/purchases/payables",
      proof: expect.objectContaining({ state: "pending" }),
    })
    expect(model.status.items.find((item) => item.id === "security")).toMatchObject({
      value: "Not available",
      tone: "muted",
      href: "/en/dashboard/settings/security",
      proof: expect.objectContaining({ state: "unavailable" }),
    })
  })

  it("renders fresh cash-truth command cards as reconciliation actions with proof links", () => {
    const freshness = {
      generatedAt: "2026-06-14T12:10:00.000Z",
      sourceMaxUpdatedAt: "2026-06-14T12:05:00.000Z",
      maxAgeMinutes: 1440,
      stale: false,
      staleReason: null,
    }
    const commandCards: TenantOperatingCommandCard[] = [
      {
        id: "payment",
        label: "Cash truth",
        detail: "Internal collected 10000.00, external matched 10000.00, variance 0.00, suspense 0.00, issues 0.",
        metricLabel: "External matched",
        value: 10000,
        valueFormat: "currency",
        scope: "tenant_period",
        uiState: "fresh",
        evidenceGrade: "operational",
        freshness,
        blockerState: "none",
        blockerCount: 0,
        actionRoute: "/dashboard/finance/reconciliation",
        proofRoute: "/dashboard/finance/reconciliation",
        requiredPermission: "payments.reconciliation.read",
        sourceModules: ["payments", "finance"],
      },
    ]

    const model = buildTodaysOperatingTruthModel({
      dashboard: buildDashboard({ alerts: [], pendingActions: [], operatingCommandCards: commandCards }),
      locale: "en",
      dashboardBasePath: "/en/dashboard",
      selectedLocationLabel: "All locations",
    })

    const paymentAction = model.status.items.find((item) => item.id === "payment")

    expect(paymentAction).toMatchObject({
      label: "Cash truth",
      detail: "Internal collected 10000.00, external matched 10000.00, variance 0.00, suspense 0.00, issues 0.",
      tone: "success",
      href: "/en/dashboard/finance/reconciliation",
      source: "tenant period",
      proof: {
        state: "operational",
        source: "/dashboard/finance/reconciliation",
        sourceCount: 0,
      },
    })
    expect(paymentAction?.value).toEqual(expect.stringContaining("10,000"))
  })
})
