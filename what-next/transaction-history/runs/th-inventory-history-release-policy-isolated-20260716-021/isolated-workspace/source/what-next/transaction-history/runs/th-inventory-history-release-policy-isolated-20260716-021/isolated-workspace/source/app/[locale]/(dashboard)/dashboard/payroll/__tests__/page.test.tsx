import { render, screen } from "@testing-library/react"

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getPayrollCommandReadModelAction } from "@/actions/payroll/payroll-command-read-model.actions"

import PayrollWorkbenchPage from "../page"

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
    requireAnyPermission: jest.fn(),
  }
})

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/actions/payroll/payroll-command-read-model.actions", () => ({
  getPayrollCommandReadModelAction: jest.fn(),
}))

jest.mock("@/components/payroll/PayrollCommandCenter", () => ({
  __esModule: true,
  default: ({ data, error, locale }: { data: { marker?: string } | null; error: string | null; locale: string }) => (
    <section>
      <h1>Payroll command rendered</h1>
      <p>{locale}</p>
      <p>{data?.marker ?? error ?? "empty"}</p>
    </section>
  ),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({ title, message, primaryHref }: { title: string; message: string; primaryHref: string }) => (
    <main>
      <h1>{title}</h1>
      <p>{message}</p>
      <a href={primaryHref}>Back to dashboard</a>
    </main>
  ),
}))

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetPayrollCommandReadModelAction = getPayrollCommandReadModelAction as jest.Mock

function params(locale = "en") {
  return Promise.resolve({ locale })
}

describe("PayrollWorkbenchPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["payroll.command.read"],
    })
    mockObserveModuleAccess.mockResolvedValue({
      allowed: false,
      wouldBlock: true,
      result: "would_block",
      mode: "observe",
      moduleSlug: "payroll",
    })
    mockGetPayrollCommandReadModelAction.mockResolvedValue({
      success: true,
      data: { marker: "command-data" },
      error: null,
    })
  })

  it("enforces RBAC while keeping payroll module entitlement report-only", async () => {
    render(await PayrollWorkbenchPage({ params: params("en") }))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["payroll.command.read"], {
      resource: "PayrollCommandReadModel",
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["payroll.command.read"],
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll",
      accessIntent: "read",
      mode: "observe",
    }))
    expect(mockGetPayrollCommandReadModelAction).toHaveBeenCalledWith({ limit: 25 })
    expect(screen.getByRole("heading", { name: "Payroll command rendered" })).toBeInTheDocument()
    expect(screen.getByText("command-data")).toBeInTheDocument()
  })

  it("stops before module observation and command data access when RBAC denies", async () => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await PayrollWorkbenchPage({ params: params("fr") }))

    expect(screen.getByRole("heading", { name: "HR and Payroll is not available for this role" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/fr/dashboard")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetPayrollCommandReadModelAction).not.toHaveBeenCalled()
  })
})