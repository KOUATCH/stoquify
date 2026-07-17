import { render, screen } from "@testing-library/react"

import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import SupplierSystemAnalyticsPage from "../[id]/page"
import EditSupplierSystemPage from "../[id]/edit/page"
import CreateSupplierSystemPage from "../new/page"
import SuppliersSystemPage from "../page"

const mockSupplierManagementDashboard = jest.fn((props: Record<string, unknown>) => (
  <div data-testid="supplier-system-dashboard">
    Supplier system dashboard {String(props.locale)} {String(props.organizationId)}
  </div>
))

jest.mock("@/components/suppliers/SupplierManagementDashboard", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockSupplierManagementDashboard(props),
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
    <main data-kind={kind} data-primary-href={primaryHref}>
      <h1>{title}</h1>
      <p>{message}</p>
    </main>
  ),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

function allow(permission: string) {
  mockRequirePermission.mockResolvedValue({
    orgId: "org-1",
    userId: "user-1",
    permissions: [permission],
  })
  mockObserveModuleAccess.mockResolvedValue({
    allowed: false,
    wouldBlock: true,
    result: "would_block",
    mode: "observe",
    moduleSlug: "purchasing",
  })
}

describe("legacy supplier system route boundaries", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("guards the legacy supplier list page with read permission and module observation", async () => {
    allow("purchases.suppliers.read")

    render(await SuppliersSystemPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.suppliers.read", {
      resource: "SupplierManagement",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["purchases.suppliers.read"],
      moduleSlug: "purchasing",
      surfaceType: "page",
      surface: "/dashboard/suppliersSystem",
      accessIntent: "read",
      mode: "observe",
    }))
    expect(mockSupplierManagementDashboard).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      locale: "en",
      basePath: "/en/dashboard/suppliersSystem",
    }))
    expect(screen.getByTestId("supplier-system-dashboard")).toBeInTheDocument()
  })

  it("guards the legacy supplier create page with create permission and module observation", async () => {
    allow("purchases.suppliers.create")

    render(await CreateSupplierSystemPage({ params: Promise.resolve({ locale: "fr" }) }))

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.suppliers.create", {
      resource: "SupplierManagement",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      actorPermissions: ["purchases.suppliers.create"],
      moduleSlug: "purchasing",
      surface: "/dashboard/suppliersSystem/new",
      accessIntent: "write",
    }))
    expect(mockSupplierManagementDashboard).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      locale: "fr",
      basePath: "/fr/dashboard/suppliersSystem",
      initialAction: "create",
    }))
  })

  it("guards the legacy supplier analytics page with read permission, resource id, and module observation", async () => {
    allow("purchases.suppliers.read")

    render(await SupplierSystemAnalyticsPage({ params: Promise.resolve({ locale: "en", id: "supplier-1" }) }))

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.suppliers.read", {
      resource: "SupplierManagement",
      resourceId: "supplier-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      actorPermissions: ["purchases.suppliers.read"],
      moduleSlug: "purchasing",
      surface: "/dashboard/suppliersSystem/[id]",
      accessIntent: "read",
    }))
    expect(mockSupplierManagementDashboard).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      initialAnalyticsId: "supplier-1",
    }))
  })

  it("guards the legacy supplier edit page with update permission, resource id, and module observation", async () => {
    allow("purchases.suppliers.update")

    render(await EditSupplierSystemPage({ params: Promise.resolve({ locale: "fr", id: "supplier-2" }) }))

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.suppliers.update", {
      resource: "SupplierManagement",
      resourceId: "supplier-2",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      actorPermissions: ["purchases.suppliers.update"],
      moduleSlug: "purchasing",
      surface: "/dashboard/suppliersSystem/[id]/edit",
      accessIntent: "write",
    }))
    expect(mockSupplierManagementDashboard).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      initialEditId: "supplier-2",
    }))
  })

  it.each([
    ["list", SuppliersSystemPage, { locale: "en" }, "Supplier system is not available for this role", "/en/dashboard/purchases"],
    ["create", CreateSupplierSystemPage, { locale: "en" }, "Supplier creation is not available for this role", "/en/dashboard/purchases/suppliers"],
    ["analytics", SupplierSystemAnalyticsPage, { locale: "en", id: "supplier-1" }, "Supplier analytics are not available for this role", "/en/dashboard/purchases/suppliers"],
    ["edit", EditSupplierSystemPage, { locale: "fr", id: "supplier-2" }, "Supplier editing is not available for this role", "/fr/dashboard/purchases/suppliers"],
  ])("fails closed before rendering the %s legacy supplier surface when RBAC denies access", async (_name, Page, params, title, href) => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await Page({ params: Promise.resolve(params) } as never))

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "permission_denied")
    expect(screen.getByRole("main")).toHaveAttribute("data-primary-href", href)
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockSupplierManagementDashboard).not.toHaveBeenCalled()
  })

  it("fails closed before rendering the legacy supplier system when no active organization is available", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("No active organization", "NO_ACTIVE_ORG", 403))

    render(await SuppliersSystemPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(screen.getByRole("heading", { name: "Supplier system needs an active organization" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "no_active_org")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockSupplierManagementDashboard).not.toHaveBeenCalled()
  })
})
