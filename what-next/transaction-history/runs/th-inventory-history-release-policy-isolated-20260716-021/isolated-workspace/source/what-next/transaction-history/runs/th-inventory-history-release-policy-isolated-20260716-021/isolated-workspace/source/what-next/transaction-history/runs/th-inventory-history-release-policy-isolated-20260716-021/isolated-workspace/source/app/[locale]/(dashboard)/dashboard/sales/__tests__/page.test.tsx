import { render, screen } from "@testing-library/react"

import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import SalesPage from "../page"

jest.mock("next-intl/server", () => ({
  getLocale: jest.fn(),
}))

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "EMAIL_NOT_VERIFIED" | "ACCOUNT_LOCKED" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    requirePermission: jest.fn(),
  }
})

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({
    kind,
    title,
    message,
    primaryHref,
  }: {
    kind: string
    title: string
    message: string
    primaryHref: string
  }) => (
    <main data-kind={kind}>
      <h1>{title}</h1>
      <p>{message}</p>
      <a href={primaryHref}>Back to dashboard</a>
    </main>
  ),
}))

jest.mock("../SalesClientPage", () => ({
  __esModule: true,
  default: () => <section aria-label="sales-dashboard">Sales dashboard client</section>,
}))

const { getLocale } = jest.requireMock("next-intl/server") as { getLocale: jest.Mock }
const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

describe("Sales route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getLocale.mockResolvedValue("en")
    mockRequirePermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["sales.read"],
    })
    mockObserveModuleAccess.mockResolvedValue({
      allowed: false,
      wouldBlock: true,
      result: "would_block",
      mode: "observe",
      moduleSlug: "sales",
    })
  })

  it("enforces sales RBAC and observes sales module access before rendering the dashboard", async () => {
    render(await SalesPage())

    expect(mockRequirePermission).toHaveBeenCalledWith("sales.read", {
      resource: "SalesDashboard",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["sales.read"],
      moduleSlug: "sales",
      surfaceType: "page",
      surface: "/dashboard/sales",
      accessIntent: "read",
      mode: "observe",
    }))
    expect(screen.getByLabelText("sales-dashboard")).toBeInTheDocument()
  })

  it("fails closed before module observation when RBAC denies sales access", async () => {
    getLocale.mockResolvedValue("fr")
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await SalesPage())

    expect(screen.getByRole("heading", { name: "Sales dashboard is not available for this role" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "permission_denied")
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/fr/dashboard")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(screen.queryByLabelText("sales-dashboard")).not.toBeInTheDocument()
  })

  it("fails closed before module observation when no active organization is available", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("No active organization", "NO_ACTIVE_ORG", 403))

    render(await SalesPage())

    expect(screen.getByRole("heading", { name: "Sales dashboard needs an active organization" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "no_active_org")
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/en/dashboard")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(screen.queryByLabelText("sales-dashboard")).not.toBeInTheDocument()
  })
})
