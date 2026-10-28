import { render, screen } from "@testing-library/react"

import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getPurchaseOrderFormOptions } from "@/services/purchase-order/purchase-order.service"

import CreatePurchaseOrderPage from "../page"

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

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/i18n/server-routing", () => ({
  localizedRedirect: jest.fn(),
}))

jest.mock("@/config/useAuth", () => ({
  getAuthenticatedUser: jest.fn(),
}))

jest.mock("@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction", () => ({
  createPurchaseOrder: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/purchase-order/purchase-order.service", () => ({
  getPurchaseOrderFormOptions: jest.fn(),
}))

jest.mock("@/components/purchase-orders/ModernCreatePurchaseOrderForm", () => ({
  ModernCreatePurchaseOrderForm: ({
    organizationId,
    suppliers,
    locations,
    items,
    action,
  }: {
    organizationId: string
    suppliers: Array<{ id: string }>
    locations: Array<{ id: string }>
    items: Array<{ id: string }>
    action: (formData: FormData) => Promise<void>
  }) => (
    <section>
      <h1>Purchase order create form rendered</h1>
      <p>{organizationId}</p>
      <p>{suppliers.length} suppliers</p>
      <p>{locations.length} locations</p>
      <p>{items.length} items</p>
      <p>{typeof action}</p>
    </section>
  ),
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
      <a href={primaryHref}>Back to purchase orders</a>
    </main>
  ),
}))

const { getLocale } = jest.requireMock("next-intl/server") as {
  getLocale: jest.Mock
}

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetPurchaseOrderFormOptions = getPurchaseOrderFormOptions as jest.Mock

describe("CreatePurchaseOrderPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getLocale.mockResolvedValue("en")
    mockRequirePermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["purchases.orders.create"],
    })
    mockObserveModuleAccess.mockResolvedValue({
      allowed: false,
      wouldBlock: true,
      result: "would_block",
      mode: "observe",
      moduleSlug: "purchasing",
    })
    mockGetPurchaseOrderFormOptions.mockResolvedValue({
      suppliers: [{ id: "supplier-1" }],
      locations: [{ id: "location-1" }],
      items: [{ id: "item-1" }, { id: "item-2" }],
    })
  })

  it("enforces create RBAC, observes purchasing in report mode, and loads tenant-scoped form options", async () => {
    render(await CreatePurchaseOrderPage())

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.create", {
      resource: "PurchaseOrder",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "user-1",
        actorPermissions: ["purchases.orders.create"],
        moduleSlug: "purchasing",
        surfaceType: "page",
        surface: "/dashboard/purchase-orders/new",
        accessIntent: "write",
        mode: "observe",
      }),
    )
    expect(mockGetPurchaseOrderFormOptions).toHaveBeenCalledWith("org-1")
    expect(screen.getByRole("heading", { name: "Purchase order create form rendered" })).toBeInTheDocument()
    expect(screen.getByText("org-1")).toBeInTheDocument()
    expect(screen.getByText("2 items")).toBeInTheDocument()
  })

  it("stops before module observation and form-option service access when RBAC denies access", async () => {
    getLocale.mockResolvedValue("fr")
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await CreatePurchaseOrderPage())

    expect(screen.getByRole("heading", { name: "Create purchase order is not available for this role" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "permission_denied")
    expect(screen.getByRole("link", { name: "Back to purchase orders" })).toHaveAttribute("href", "/fr/dashboard")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrderFormOptions).not.toHaveBeenCalled()
  })

  it("fails closed without form-option service access when no active organization is available", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("No active organization", "NO_ACTIVE_ORG", 403))

    render(await CreatePurchaseOrderPage())

    expect(screen.getByRole("heading", { name: "Create purchase order needs an active organization" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "no_active_org")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrderFormOptions).not.toHaveBeenCalled()
  })
})
