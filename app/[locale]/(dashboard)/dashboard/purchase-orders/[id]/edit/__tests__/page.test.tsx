import { render, screen } from "@testing-library/react"

import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  getPurchaseOrderById,
  getPurchaseOrderFormOptions,
} from "@/services/purchase-order/purchase-order.service"
import { notFound } from "next/navigation"

import PurchaseOrderEditPage from "../page"

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
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

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/purchase-order/purchase-order.service", () => ({
  getPurchaseOrderById: jest.fn(),
  getPurchaseOrderFormOptions: jest.fn(),
}))

jest.mock("@/components/purchase-orders/ModernEditPurchaseOrderForm", () => ({
  ModernEditPurchaseOrderForm: ({
    purchaseOrder,
    suppliers,
    locations,
    items,
    organizationId,
  }: {
    purchaseOrder: { id: string; status: string }
    suppliers: Array<{ id: string }>
    locations: Array<{ id: string }>
    items: Array<{ id: string }>
    organizationId: string
  }) => (
    <section>
      <h1>Purchase order edit form rendered</h1>
      <p>{purchaseOrder.id}</p>
      <p>{purchaseOrder.status}</p>
      <p>{organizationId}</p>
      <p>{suppliers.length} suppliers</p>
      <p>{locations.length} locations</p>
      <p>{items.length} items</p>
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

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetPurchaseOrderById = getPurchaseOrderById as jest.Mock
const mockGetPurchaseOrderFormOptions = getPurchaseOrderFormOptions as jest.Mock
const mockNotFound = notFound as unknown as jest.Mock

function params(locale = "en", id = "po-1") {
  return Promise.resolve({ locale, id })
}

describe("PurchaseOrderEditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["purchases.orders.update"],
    })
    mockObserveModuleAccess.mockResolvedValue({
      allowed: false,
      wouldBlock: true,
      result: "would_block",
      mode: "observe",
      moduleSlug: "purchasing",
    })
    mockGetPurchaseOrderById.mockResolvedValue({ id: "po-1", status: "DRAFT" })
    mockGetPurchaseOrderFormOptions.mockResolvedValue({
      suppliers: [{ id: "supplier-1" }],
      locations: [{ id: "location-1" }],
      items: [{ id: "item-1" }, { id: "item-2" }],
    })
  })

  it("enforces update RBAC, observes purchasing write access, and loads tenant-scoped edit data", async () => {
    render(await PurchaseOrderEditPage({ params: params("en", "po-1") }))

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.update", {
      resource: "PurchaseOrder",
      resourceId: "po-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "user-1",
        actorPermissions: ["purchases.orders.update"],
        moduleSlug: "purchasing",
        surfaceType: "page",
        surface: "/dashboard/purchase-orders/[id]/edit",
        accessIntent: "write",
        mode: "observe",
      }),
    )
    expect(mockGetPurchaseOrderById).toHaveBeenCalledWith("po-1", "org-1")
    expect(mockGetPurchaseOrderFormOptions).toHaveBeenCalledWith("org-1")
    expect(screen.getByRole("heading", { name: "Purchase order edit form rendered" })).toBeInTheDocument()
    expect(screen.getByText("org-1")).toBeInTheDocument()
    expect(screen.getByText("2 items")).toBeInTheDocument()
  })

  it("stops before module observation and edit services when RBAC denies access", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await PurchaseOrderEditPage({ params: params("fr", "po-1") }))

    expect(screen.getByRole("heading", { name: "Edit purchase order is not available for this role" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "permission_denied")
    expect(screen.getByRole("link", { name: "Back to purchase orders" })).toHaveAttribute("href", "/fr/dashboard")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrderById).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrderFormOptions).not.toHaveBeenCalled()
    expect(screen.queryByRole("heading", { name: "Purchase order edit form rendered" })).not.toBeInTheDocument()
  })

  it("fails closed before module observation and edit services when no active organization is available", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("No active organization", "NO_ACTIVE_ORG", 403))

    render(await PurchaseOrderEditPage({ params: params("en", "po-1") }))

    expect(screen.getByRole("heading", { name: "Edit purchase order needs an active organization" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "no_active_org")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrderById).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrderFormOptions).not.toHaveBeenCalled()
  })

  it("returns notFound before RBAC when the route id is missing", async () => {
    await expect(PurchaseOrderEditPage({ params: params("en", "") })).rejects.toThrow("NEXT_NOT_FOUND")

    expect(mockNotFound).toHaveBeenCalled()
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })

  it("returns notFound after tenant-scoped lookup when the purchase order is not editable", async () => {
    mockGetPurchaseOrderById.mockResolvedValue({ id: "po-1", status: "APPROVED" })

    await expect(PurchaseOrderEditPage({ params: params("en", "po-1") })).rejects.toThrow("NEXT_NOT_FOUND")

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.update", expect.objectContaining({ resourceId: "po-1" }))
    expect(mockObserveModuleAccess).toHaveBeenCalled()
    expect(mockGetPurchaseOrderById).toHaveBeenCalledWith("po-1", "org-1")
    expect(mockGetPurchaseOrderFormOptions).not.toHaveBeenCalled()
  })
})
