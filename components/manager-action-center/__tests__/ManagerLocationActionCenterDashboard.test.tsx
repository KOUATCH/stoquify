import type { SVGProps } from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"

import type { ManagerLocationActionCenterData } from "@/services/manager-action-center/manager-location-action-center-contracts"
import type { BranchOperatingMetrics, SnapshotResult } from "@/services/snapshots/snapshot-contracts"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
}))

import { ManagerLocationActionCenterDashboard } from "../ManagerLocationActionCenterDashboard"

const generatedAt = "2026-06-20T10:00:00.000Z"

describe("ManagerLocationActionCenterDashboard", () => {
  it("keeps blocked and fresh branch evidence in separate accessible tab views", async () => {
    const { container } = renderDashboard(buildData(), "en")

    const centralTab = screen.getByRole("tab", { name: /Central Store.*BR-01/ })
    const coastalTab = screen.getByRole("tab", { name: /Coastal Outlet.*BR-02/ })
    expect(centralTab).toHaveAttribute("aria-selected", "true")
    expect(coastalTab).toHaveAttribute("aria-selected", "false")

    const centralView = getLocationView(container, "location-central")
    expect(centralView).toBeVisible()
    expect(queryLocationView(container, "location-coastal")).not.toBeInTheDocument()
    expect(within(centralView).getByRole("heading", { name: "Branch evidence is blocked" })).toBeInTheDocument()
    expect(within(centralView).getByText("POS shift evidence is incomplete")).toBeInTheDocument()
    expect(within(centralView).getByText("metrics.payrollNetPayAmount")).toBeInTheDocument()
    expect(within(centralView).getByText("Provider refresh is overdue.")).toBeInTheDocument()
    expect(within(centralView).getByText("Amounts are shown as source values. No currency is inferred.")).toBeInTheDocument()
    expect(within(centralView).getByRole("link", { name: "Open action: Review cash variance" })).toHaveAttribute(
      "href",
      "/dashboard/finance/payments/reconciliation",
    )
    expect(within(centralView).getByText("1 hidden by permission")).toBeInTheDocument()
    const centralDailyCloseLink = within(centralView).getByRole("link", { name: "Open daily close: Central Store" })
    expect(centralDailyCloseLink).toHaveAttribute(
      "href",
      "/en/dashboard/manager-action-center/daily-close?locationId=location-central",
    )
    expect(centralDailyCloseLink.getAttribute("href")).not.toContain("businessDate")
    expect(within(centralView).getAllByRole("link", { name: /Open daily close/ })).toHaveLength(1)

    fireEvent.mouseDown(coastalTab, { button: 0, ctrlKey: false })

    expect(centralTab).toHaveAttribute("aria-selected", "false")
    expect(coastalTab).toHaveAttribute("aria-selected", "true")
    expect(queryLocationView(container, "location-central")).not.toBeInTheDocument()
    const coastalView = getLocationView(container, "location-coastal")
    expect(coastalView).toBeVisible()
    expect(within(coastalView).getAllByText("Fresh").length).toBeGreaterThan(0)
    expect(within(coastalView).getByText("No visible action is available for this branch and permission set.")).toBeInTheDocument()
    expect(within(coastalView).getByText("No blocker is reported for this branch snapshot.")).toBeInTheDocument()
    expect(within(coastalView).getByRole("link", { name: "Open daily close: Coastal Outlet" })).toHaveAttribute(
      "href",
      "/en/dashboard/manager-action-center/daily-close?locationId=location-coastal",
    )
  })

  it("renders blocked, redacted, hidden-work, and no-action states in French", async () => {
    const { container } = renderDashboard(buildData(), "fr")

    const centralView = getLocationView(container, "location-central")
    expect(within(centralView).getByRole("heading", { name: "Les preuves du site sont bloquees" })).toBeInTheDocument()
    expect(within(centralView).getByRole("heading", { name: "Les preuves du site contiennent des masquages" })).toBeInTheDocument()
    expect(within(centralView).getByText("1 masquees par permission")).toBeInTheDocument()
    expect(within(centralView).getByText("Les montants sont affiches comme valeurs sources. Aucune devise n'est deduite.")).toBeInTheDocument()
    expect(within(centralView).getByRole("link", { name: "Ouvrir la cloture quotidienne: Central Store" })).toHaveAttribute(
      "href",
      "/fr/dashboard/manager-action-center/daily-close?locationId=location-central",
    )

    fireEvent.mouseDown(screen.getByRole("tab", { name: /Coastal Outlet.*BR-02/ }), { button: 0, ctrlKey: false })

    const coastalView = getLocationView(container, "location-coastal")
    expect(coastalView).toBeVisible()
    expect(within(coastalView).getByText("Aucune action visible n'est disponible pour ce site et ces permissions.")).toBeInTheDocument()
  })

  it.each([
    ["en" as const, "No managed location is available"],
    ["fr" as const, "Aucun site gere n'est disponible"],
  ])("renders the explicit empty scope state for %s", (locale, heading) => {
    renderDashboard({ ...buildData(), scope: { kind: "LOCATIONS", locationIds: [] }, bundles: [] }, locale)

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument()
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
  })
})

function renderDashboard(data: ManagerLocationActionCenterData, locale: "en" | "fr") {
  return render(
    <ManagerLocationActionCenterDashboard
      data={data}
      locale={locale}
      title={locale === "fr" ? "Centre d'actions manager" : "Manager Action Center"}
      subtitle={locale === "fr" ? "Travail quotidien par site." : "Daily work by location."}
    />,
  )
}

function queryLocationView(container: HTMLElement, locationId: string) {
  return container.querySelector<HTMLElement>(`[data-location-id="${locationId}"]`)
}

function getLocationView(container: HTMLElement, locationId: string) {
  const view = queryLocationView(container, locationId)
  if (!view) throw new Error(`Missing location view: ${locationId}`)
  return view
}

function buildData(): ManagerLocationActionCenterData {
  return {
    organizationId: "org-1",
    actorId: "manager-1",
    generatedAt,
    periodStart: "2026-06-20T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    authority: {
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
    },
    scope: {
      kind: "LOCATIONS",
      locationIds: ["location-central", "location-coastal"],
    },
    bundles: [
      {
        location: { id: "location-central", name: "Central Store", code: "BR-01" },
        snapshot: branchSnapshot("location-central", "blocked", "blocked", 11),
        actionQueue: {
          organizationId: "org-1",
          generatedAt,
          signals: [],
          filteredOutCount: 1,
          summary: queueSummary(1),
          actionItems: [
            {
              id: "action-central",
              organizationId: "org-1",
              signalId: "signal-central",
              signalType: "cash_drawer_variance",
              title: "Review cash variance",
              nextStep: "Open the reconciliation evidence and resolve the branch exception.",
              actionPath: "/dashboard/finance/payments/reconciliation",
              requiredPermission: "payments.reconciliation.read",
              status: "open",
              severity: "critical",
              severityScore: 98,
              assignedRole: "manager",
              assigneeId: null,
              createdAt: generatedAt,
              updatedAt: generatedAt,
              dueAt: "2026-06-20T12:00:00.000Z",
              resolvedAt: null,
              dismissedAt: null,
              evidenceGrade: "blocked",
              blockers: [],
              redactions: [],
            },
          ],
        },
      },
      {
        location: { id: "location-coastal", name: "Coastal Outlet", code: "BR-02" },
        snapshot: branchSnapshot("location-coastal", "fresh", "fresh", 29),
        actionQueue: {
          organizationId: "org-1",
          generatedAt,
          signals: [],
          actionItems: [],
          filteredOutCount: 0,
          summary: queueSummary(0),
        },
      },
    ],
  }
}

function branchSnapshot(
  locationId: string,
  status: "blocked" | "fresh",
  uiState: "blocked" | "fresh",
  completedSalesCount: number,
): SnapshotResult<BranchOperatingMetrics> {
  const blocked = status === "blocked"
  return {
    kind: "branch.operating",
    organizationId: "org-1",
    locationId,
    periodStart: "2026-06-20T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    status,
    uiState,
    evidenceGrade: blocked ? "blocked" : "operational",
    freshness: {
      generatedAt,
      sourceMaxUpdatedAt: blocked ? "2026-06-19T08:00:00.000Z" : generatedAt,
      maxAgeMinutes: 1440,
      stale: blocked,
      staleReason: blocked ? "Provider refresh is overdue." : null,
    },
    sourceHash: `source-${locationId}`,
    generatedAt,
    sourceModules: ["pos", "inventory", "payroll"],
    metrics: branchMetrics(completedSalesCount),
    blockers: blocked
      ? [
          {
            id: "blocker-central",
            severity: "critical",
            gate: "pos-shift-close",
            title: "POS shift evidence is incomplete",
            detail: "The current shift does not have complete close evidence.",
            sourceTables: ["POSShift"],
            nextAction: "Close or investigate the affected shift.",
          },
        ]
      : [],
    redactions: blocked
      ? [
          {
            id: "redaction-central",
            field: "metrics.payrollNetPayAmount",
            reason: "Payroll amount is restricted for this role.",
            policy: "payroll.manager.redaction",
          },
        ]
      : [],
  }
}

function branchMetrics(completedSalesCount: number): BranchOperatingMetrics {
  return {
    locationActive: true,
    completedSalesCount,
    completedSalesRevenue: completedSalesCount * 100,
    cashCollected: completedSalesCount * 80,
    inventoryValue: 4500,
    inventoryTransactionCount: 17,
    pendingPurchaseOrderCount: 2,
    openTransferCount: 1,
    postedJournalLineCount: 14,
    posShiftCount: 3,
    closedPosShiftCount: 2,
    payrollEmployeeAtLocationCount: 8,
    frozenAttendanceSnapshotCount: 1,
    approvedPayrollRunLineCount: 7,
    unallocatedPayrollRunLineCount: 1,
    payrollGrossAmount: 1200,
    payrollEmployerChargeAmount: 240,
    payrollNetPayAmount: 960,
    payrollAllocatedCostAmount: 1440,
    payrollProfitContribution: null,
  }
}

function queueSummary(total: number) {
  return {
    total,
    open: total,
    assigned: 0,
    stale: 0,
    expired: 0,
    redacted: 0,
    bySeverity: {
      info: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: total,
    },
    byRole: total ? { manager: total } : {},
  }
}
