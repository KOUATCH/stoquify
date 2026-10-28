import { render, screen } from "@testing-library/react"

import { requirePermission } from "@/lib/security/rbac"

import ReportsPage from "../page"

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class MockRbacError extends Error {},
  requireAllPermissions: jest.fn(),
  requireAnyPermission: jest.fn(),
  requirePermission: jest.fn(),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn().mockResolvedValue({ allowed: true }),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: () => <main />,
}))

jest.mock("../ReportsClient", () => ({
  __esModule: true,
  default: ({
    organizationId,
    locationId,
    initialReport,
    initialPeriod,
    focusItemId,
  }: {
    organizationId: string
    locationId: string
    initialReport?: string
    initialPeriod?: string
    focusItemId?: string
  }) => (
    <section>
      <h1>Analytics reports client</h1>
      <span>organization:{organizationId}</span>
      <span>location:{locationId}</span>
      <span>report:{initialReport || "none"}</span>
      <span>period:{initialPeriod || "none"}</span>
      <span>item:{focusItemId || "none"}</span>
    </section>
  ),
}))

const mockRequirePermission = requirePermission as jest.Mock

describe("ReportsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      orgId: "org-rbac",
    })
  })

  it("requires reports read permission before rendering analytics reports", async () => {
    render(await ReportsPage({}))

    expect(mockRequirePermission).toHaveBeenCalledWith("reports.read", {
      resource: "AnalyticsReports",
      resourceId: undefined,
      auditAllowed: true,
    })
    expect(screen.getByRole("heading", { name: "Analytics reports client" })).toBeInTheDocument()
    expect(screen.getByText("organization:org-rbac")).toBeInTheDocument()
    expect(screen.getByText("location:all")).toBeInTheDocument()
  })

  it("passes sanitized first search params to the reports client after permission succeeds", async () => {
    render(
      await ReportsPage({
        searchParams: Promise.resolve({
          locationId: ["loc-1", "loc-ignored"],
          report: "items",
          period: ["month", "year"],
          itemId: "item-1",
        }),
      }),
    )

    expect(mockRequirePermission).toHaveBeenCalledWith("reports.read", {
      resource: "AnalyticsReports",
      resourceId: undefined,
      auditAllowed: true,
    })
    expect(screen.getByText("organization:org-rbac")).toBeInTheDocument()
    expect(screen.getByText("location:loc-1")).toBeInTheDocument()
    expect(screen.getByText("report:items")).toBeInTheDocument()
    expect(screen.getByText("period:month")).toBeInTheDocument()
    expect(screen.getByText("item:item-1")).toBeInTheDocument()
  })

  it("stops before rendering analytics reports when reports read permission is denied", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"))

    await expect(ReportsPage({})).rejects.toThrow("Forbidden")

    expect(mockRequirePermission).toHaveBeenCalledWith("reports.read", {
      resource: "AnalyticsReports",
      resourceId: undefined,
      auditAllowed: true,
    })
  })
})
