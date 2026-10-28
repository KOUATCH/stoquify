import { render, screen } from "@testing-library/react"

import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { notFound } from "next/navigation"

import PurchaseOrderDetailPage from "../page"

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

jest.mock("@/components/purchase-orders/ModernPurchaseOrderDetailPage", () => ({
  __esModule: true,
  default: ({ id, organizationId }: { id: string; organizationId?: string }) => (
    <section>
      <h1>Purchase order detail rendered</h1>
      <p>{id}</p>
      <p>{organizationId}</p>
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
const mockNotFound = notFound as unknown as jest.Mock

function params(locale = "en", id = "po-1") {
  return Promise.resolve({ locale, id })
}

describe("PurchaseOrderDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["purchases.orders.read"],
    })
    mockObserveModuleAccess.mockResolvedValue({
      allowed: false,
      wouldBlock: true,
      result: "would_block",
      mode: "observe",
      moduleSlug: "purchasing",
    })
  })

  it("enforces detail read RBAC, observes purchasing in report mode, and passes tenant scope to the detail component", async () => {
    render(await PurchaseOrderDetailPage({ params: params("en", "po-1") }))

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.read", {
      resource: "PurchaseOrder",
      resourceId: "po-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["purchases.orders.read"],
      moduleSlug: "purchasing",
      surfaceType: "page",
      surface: "/dashboard/purchase-orders/[id]",
      accessIntent: "read",
      mode: "observe",
    }))
    expect(screen.getByRole("heading", { name: "Purchase order detail rendered" })).toBeInTheDocument()
    expect(screen.getByText("po-1")).toBeInTheDocument()
    expect(screen.getByText("org-1")).toBeInTheDocument()
  })

  it("ignores searchParams organizationId and keeps tenant scope server-resolved", async () => {
    render(await PurchaseOrderDetailPage({
      params: params("en", "po-1"),
      searchParams: Promise.resolve({ organizationId: "attacker-org" }),
    }))

    expect(screen.getByText("org-1")).toBeInTheDocument()
    expect(screen.queryByText("attacker-org")).not.toBeInTheDocument()
  })

  it("stops before module observation and detail rendering when RBAC denies access", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await PurchaseOrderDetailPage({ params: params("fr", "po-1") }))

    expect(screen.getByRole("heading", { name: "Purchase order details are not available for this role" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "permission_denied")
    expect(screen.getByRole("link", { name: "Back to purchase orders" })).toHaveAttribute("href", "/fr/dashboard/purchase-orders")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(screen.queryByRole("heading", { name: "Purchase order detail rendered" })).not.toBeInTheDocument()
  })

  it("fails closed before module observation and detail rendering when no active organization is available", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("No active organization", "NO_ACTIVE_ORG", 403))

    render(await PurchaseOrderDetailPage({ params: params("en", "po-1") }))

    expect(screen.getByRole("heading", { name: "Purchase order details need an active organization" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "no_active_org")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(screen.queryByRole("heading", { name: "Purchase order detail rendered" })).not.toBeInTheDocument()
  })

  it("returns notFound before RBAC when the route id is missing", async () => {
    await expect(PurchaseOrderDetailPage({ params: params("en", "") })).rejects.toThrow("NEXT_NOT_FOUND")

    expect(mockNotFound).toHaveBeenCalled()
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })
})