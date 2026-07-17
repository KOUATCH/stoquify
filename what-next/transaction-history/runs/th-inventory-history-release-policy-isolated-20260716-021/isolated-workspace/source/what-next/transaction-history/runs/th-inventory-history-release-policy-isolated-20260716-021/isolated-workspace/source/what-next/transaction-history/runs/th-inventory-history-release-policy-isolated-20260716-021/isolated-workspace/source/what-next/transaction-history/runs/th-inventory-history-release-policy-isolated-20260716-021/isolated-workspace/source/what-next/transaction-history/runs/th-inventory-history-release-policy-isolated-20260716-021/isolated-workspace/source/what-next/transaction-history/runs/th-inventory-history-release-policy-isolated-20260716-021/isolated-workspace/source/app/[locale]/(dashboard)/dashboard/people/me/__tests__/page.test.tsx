import { render, screen } from "@testing-library/react"

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getHrisEmployeeSelfService } from "@/services/hris/self-service.service"

import EmployeeSelfServicePage from "../page"

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }
  return { RbacError: MockRbacError, requireAnyPermission: jest.fn() }
})

jest.mock("@/services/hris/self-service.service", () => ({
  getHrisEmployeeSelfService: jest.fn(),
}))

jest.mock("@/components/hris/HrisEmployeeSelfService", () => ({
  HrisEmployeeSelfService: ({ model, payslipsHref }: any) => (
    <section>
      <h1>My HR</h1>
      <p>{model.profile.displayName}</p>
      <a href={payslipsHref}>Payslips</a>
    </section>
  ),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({ title, message, primaryHref }: any) => (
    <main><h1>{title}</h1><p>{message}</p><a href={primaryHref}>Back</a></main>
  ),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockGetSelfService = getHrisEmployeeSelfService as jest.Mock

describe("EmployeeSelfServicePage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "employee-user-1",
      permissions: ["hris.self_service.read", "payroll.payslips.self.read"],
    })
    mockGetSelfService.mockResolvedValue({
      profile: { displayName: "Alice Ngono" },
    })
  })

  it("derives tenant and employee identity from the session guard", async () => {
    render(await EmployeeSelfServicePage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(
      ["hris.self_service.read"],
      { resource: "HrisEmployeeSelfService" },
    )
    expect(mockGetSelfService).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "employee-user-1",
      actorPermissions: ["hris.self_service.read", "payroll.payslips.self.read"],
    })
    expect(screen.getByRole("heading", { name: "My HR" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Payslips" })).toHaveAttribute(
      "href",
      "/en/dashboard/payroll/payslips",
    )
  })

  it("does not load HR data when the own-record permission is denied", async () => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await EmployeeSelfServicePage({ params: Promise.resolve({ locale: "en" }) }))

    expect(screen.getByRole("heading", { name: "Employee self-service is not available" })).toBeInTheDocument()
    expect(mockGetSelfService).not.toHaveBeenCalled()
  })

  it("fails closed for missing or duplicate employee mappings", async () => {
    mockGetSelfService.mockRejectedValueOnce(new NotFoundError("missing"))
    const missing = render(await EmployeeSelfServicePage({ params: Promise.resolve({ locale: "fr" }) }))
    expect(screen.getByRole("heading", { name: "Employee profile is not linked" })).toBeInTheDocument()
    missing.unmount()

    mockGetSelfService.mockRejectedValueOnce(new ConflictError("duplicate"))
    render(await EmployeeSelfServicePage({ params: Promise.resolve({ locale: "en" }) }))
    expect(screen.getByRole("heading", { name: "Employee profile needs HR review" })).toBeInTheDocument()
  })
})
