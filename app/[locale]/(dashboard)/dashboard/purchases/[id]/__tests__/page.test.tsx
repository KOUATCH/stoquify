import { render, screen } from "@testing-library/react"

import { getOrgPurchaseOrderById } from "@/actions/purchaseOrderWorkflow/newPOActions"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { notFound } from "next/navigation"

import PurchaseOrderPage from "../page"

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)

  return {
    ArrowLeft: Icon,
    AtSign: Icon,
    Building2: Icon,
    Calendar: Icon,
    CreditCard: Icon,
    DollarSign: Icon,
    Edit: Icon,
    FileText: Icon,
    Hash: Icon,
    Mail: Icon,
    MapPin: Icon,
    MoreHorizontal: Icon,
    Package: Icon,
    Phone: Icon,
    User: Icon,
  }
})

jest.mock("next-intl/server", () => ({
  getLocale: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
}))

jest.mock("@/actions/purchaseOrderWorkflow/newPOActions", () => ({
  getOrgPurchaseOrderById: jest.fn(),
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

jest.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/lib/i18n/formatters", () => ({
  formatCurrency: (amount: number, locale: string, currency: string) => `${locale}:${currency}:${amount}`,
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

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

jest.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}))

const { getLocale } = jest.requireMock("next-intl/server") as { getLocale: jest.Mock }
const mockGetPurchaseOrder = getOrgPurchaseOrderById as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockNotFound = notFound as unknown as jest.Mock

function params(locale = "en", id = "po-1") {
  return Promise.resolve({ locale, id })
}

function purchaseOrder() {
  return {
    id: "purchase-order-12345678",
    orderNumber: "PO-1",
    status: "DRAFT",
    createdAt: "2026-07-09T00:00:00.000Z",
    subtotal: 100,
    taxAmount: 0,
    shippingCost: 0,
    discount: 0,
    total: 100,
    supplier: { id: "supplier-1", name: "Supplier One" },
    location: { id: "location-1", name: "Main warehouse" },
    lines: [
      {
        id: "line-1",
        itemId: "item-1",
        orderedQuantity: 2,
        unitCost: 50,
        lineTotal: 100,
        item: { id: "item-1", name: "Widget", sku: "W-1" },
      },
    ],
  }
}

describe("Purchases detail route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getLocale.mockResolvedValue("en")
    mockRequirePermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["purchases.orders.read"],
    })
    mockObserveModuleAccess.mockResolvedValue({
      allowed: true,
      wouldBlock: false,
      result: "allowed",
      mode: "observe",
      moduleSlug: "purchasing",
    })
    mockGetPurchaseOrder.mockResolvedValue(purchaseOrder())
  })

  it("enforces purchasing detail RBAC, observes module access, and passes server tenant scope to the action", async () => {
    render(await PurchaseOrderPage({ params: params("en", "po-1") }))

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
      surface: "/dashboard/purchases/[id]",
      accessIntent: "read",
      mode: "observe",
    }))
    expect(mockGetPurchaseOrder).toHaveBeenCalledWith("po-1", "org-1")
    expect(screen.getByRole("heading", { name: "Purchase Order PO-1" })).toBeInTheDocument()
  })

  it("falls back to the uppercase order id suffix when the order number is missing", async () => {
    mockGetPurchaseOrder.mockResolvedValue({
      ...purchaseOrder(),
      orderNumber: "",
    })

    render(await PurchaseOrderPage({ params: params("en", "po-1") }))

    expect(screen.getByRole("heading", { name: "Purchase Order 12345678" })).toBeInTheDocument()
  })

  it("fails closed before purchase-order access when RBAC denies the detail route", async () => {
    getLocale.mockResolvedValue("fr")
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await PurchaseOrderPage({ params: params("fr", "po-1") }))

    expect(screen.getByRole("heading", { name: "Purchase order detail is not available for this role" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "permission_denied")
    expect(screen.getByRole("link", { name: "Back to purchase orders" })).toHaveAttribute("href", "/fr/dashboard")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrder).not.toHaveBeenCalled()
  })

  it("fails closed before purchase-order access when no active organization is available", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("No active organization", "NO_ACTIVE_ORG", 403))

    render(await PurchaseOrderPage({ params: params("en", "po-1") }))

    expect(screen.getByRole("heading", { name: "Purchase order detail needs an active organization" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "no_active_org")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrder).not.toHaveBeenCalled()
  })

  it("returns notFound before RBAC when the dynamic purchase id is missing", async () => {
    await expect(PurchaseOrderPage({ params: params("en", "") })).rejects.toThrow("NEXT_NOT_FOUND")

    expect(mockNotFound).toHaveBeenCalled()
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrder).not.toHaveBeenCalled()
  })
})
