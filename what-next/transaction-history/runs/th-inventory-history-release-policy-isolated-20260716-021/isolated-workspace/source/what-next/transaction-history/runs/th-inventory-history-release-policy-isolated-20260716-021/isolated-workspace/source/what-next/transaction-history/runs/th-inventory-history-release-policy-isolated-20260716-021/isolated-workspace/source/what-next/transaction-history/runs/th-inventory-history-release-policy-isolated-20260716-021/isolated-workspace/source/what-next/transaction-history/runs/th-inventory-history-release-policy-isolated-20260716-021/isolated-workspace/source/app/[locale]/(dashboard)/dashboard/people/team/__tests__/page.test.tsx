import { render, screen } from "@testing-library/react"

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getHrisManagerSelfService } from "@/services/hris/manager-self-service.service"

import ManagedWorkforcePage from "../page"

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

jest.mock("@/services/hris/manager-self-service.service", () => ({
  getHrisManagerSelfService: jest.fn(),
}))

jest.mock("@/components/hris/HrisManagerSelfService", () => ({
  HrisManagerSelfService: ({ model, approvalsHref }: any) => (
    <section>
      <h1>Managed workforce</h1>
      <p>{model.scope.authority.label}</p>
      <a href={approvalsHref}>Approval inbox</a>
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
const mockGetManagerSelfService = getHrisManagerSelfService as jest.Mock

describe("ManagedWorkforcePage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "manager-user-1",
      permissions: ["hris.people.read"],
    })
    mockGetManagerSelfService.mockResolvedValue({
      scope: { authority: { label: "Managed-location responsibility" } },
    })
  })

  it("derives organization, actor, and permission scope from the session guard", async () => {
    render(await ManagedWorkforcePage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(
      ["hris.people.read"],
      { resource: "HrisManagerSelfService" },
    )
    expect(mockGetManagerSelfService).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "manager-user-1",
      actorPermissions: ["hris.people.read"],
      limit: 100,
    })
    expect(screen.getByRole("heading", { name: "Managed workforce" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Approval inbox" })).toHaveAttribute(
      "href",
      "/en/dashboard/people/approvals",
    )
  })

  it("does not load workforce data when the route permission is denied", async () => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await ManagedWorkforcePage({ params: Promise.resolve({ locale: "en" }) }))

    expect(screen.getByRole("heading", { name: "Managed workforce is not available" })).toBeInTheDocument()
    expect(mockGetManagerSelfService).not.toHaveBeenCalled()
  })

  it("fails closed when no tenant or current managed-location scope is proven", async () => {
    mockGetManagerSelfService.mockRejectedValue(new ForbiddenError("No location scope"))

    render(await ManagedWorkforcePage({ params: Promise.resolve({ locale: "fr" }) }))

    expect(screen.getByRole("heading", { name: "No managed workforce scope is available" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/fr/dashboard/people",
    )
  })
})
