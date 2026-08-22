import { render, screen } from "@testing-library/react"

import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  getPurchaseOrderCurrency,
  getPurchaseOrderFormOptions,
  getSummary,
  listPurchaseOrders,
} from "@/services/purchase-order/purchase-order.service"

import PurchaseOrdersPage from "../page"

jest.mock("lucide-react", () => {
  const React = jest.requireActual("react")
  const Icon = (props: Record<string, unknown>) => React.createElement("svg", props)

  return {
    BarChart3: Icon,
    CheckCircle2: Icon,
    Clock: Icon,
    FileText: Icon,
    Package: Icon,
    Plus: Icon,
    ShoppingCart: Icon,
    Truck: Icon,
  }
})
jest.mock("next-intl/server", () => ({
  getLocale: jest.fn(),
  getTranslations: jest.fn(),
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

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/purchase-order/purchase-order.service", () => ({
  listPurchaseOrders: jest.fn(),
  getPurchaseOrderCurrency: jest.fn(),
  getPurchaseOrderFormOptions: jest.fn(),
  getSummary: jest.fn(),
}))

jest.mock("@/services/purchase-order/purchase-order-capabilities", () => ({
  derivePurchaseOrderCreateCapability: jest.fn((permissions: string[]) => ({
    allowed: permissions.includes("purchases.orders.create"),
    reason: null,
  })),
  projectPurchaseOrderForActor: jest.fn((
    order: Record<string, unknown>,
    _actor: Record<string, unknown>,
    currency: string,
  ) => ({
    ...order,
    currency,
    capabilities: {},
  })),
}))

jest.mock("@/components/ui/groups/purchase-orders/PurchaseOrderManagement", () => ({
  __esModule: true,
  default: ({
    organizationId,
    initialPurchaseOrderData,
    initialSupplierData,
    initialLocationData,
    currency,
    canCreate,
  }: {
    organizationId: string
    initialPurchaseOrderData: Array<{ id: string }>
    initialSupplierData: Array<{ id: string }>
    initialLocationData: Array<{ id: string }>
    currency: string
    canCreate: boolean
  }) => (
    <section>
      <h2>Purchase order management rendered</h2>
      <p>{organizationId}</p>
      <p>{initialPurchaseOrderData.length} purchase orders</p>
      <p>{initialSupplierData.length} suppliers</p>
      <p>{initialLocationData.length} locations</p>
      <p>currency:{currency}</p>
      <p>can-create:{String(canCreate)}</p>
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
      <a href={primaryHref}>Back to dashboard</a>
    </main>
  ),
}))

const { getLocale, getTranslations } = jest.requireMock("next-intl/server") as {
  getLocale: jest.Mock
  getTranslations: jest.Mock
}

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockListPurchaseOrders = listPurchaseOrders as jest.Mock
const mockGetPurchaseOrderFormOptions = getPurchaseOrderFormOptions as jest.Mock
const mockGetSummary = getSummary as jest.Mock
const mockGetPurchaseOrderCurrency = getPurchaseOrderCurrency as jest.Mock

describe("PurchaseOrdersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getLocale.mockResolvedValue("en")
    getTranslations.mockResolvedValue((key: string, params?: Record<string, string | number>) => {
      if (!params) {
        return key
      }

      return `${key}:${Object.values(params).join(",")}`
    })
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
    mockListPurchaseOrders.mockResolvedValue([{ id: "po-1" }])
    mockGetPurchaseOrderFormOptions.mockResolvedValue({
      suppliers: [{ id: "supplier-1" }],
      locations: [{ id: "location-1" }],
    })
    mockGetSummary.mockResolvedValue({
      totalValue: 1200,
      overdueOrders: 0,
      totalOrders: 1,
      statusBreakdown: {
        draft: 1,
        received: 0,
      },
    })
    mockGetPurchaseOrderCurrency.mockResolvedValue("XAF")
  })

  it("enforces purchasing RBAC, observes module access in report mode, and loads tenant-scoped purchase-order data", async () => {
    render(await PurchaseOrdersPage())

    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.read", {
      resource: "PurchaseOrder",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "user-1",
        actorPermissions: ["purchases.orders.read"],
        moduleSlug: "purchasing",
        surfaceType: "page",
        surface: "/dashboard/purchase-orders",
        accessIntent: "read",
        mode: "observe",
      }),
    )
    expect(mockListPurchaseOrders).toHaveBeenCalledWith("org-1")
    expect(mockGetPurchaseOrderFormOptions).toHaveBeenCalledWith("org-1")
    expect(mockGetSummary).toHaveBeenCalledWith("org-1")
    expect(mockGetPurchaseOrderCurrency).toHaveBeenCalledWith("org-1")
    expect(screen.getByRole("heading", { name: "Purchase order management rendered" })).toBeInTheDocument()
    expect(screen.getByText("org-1")).toBeInTheDocument()
  })

  it("uses the organization-owned currency and server-derived create capability", async () => {
    mockRequirePermission.mockResolvedValue({
      orgId: "org-1",
      userId: "buyer-1",
      permissions: ["purchases.orders.read", "purchases.orders.create"],
    })
    mockGetPurchaseOrderCurrency.mockResolvedValue("XOF")

    render(await PurchaseOrdersPage())

    expect(screen.getByText("currency:XOF")).toBeInTheDocument()
    expect(screen.getByText("can-create:true")).toBeInTheDocument()
    expect(screen.getAllByText(/en:XOF:1200/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/USD/)).not.toBeInTheDocument()
  })

  it("stops before module observation and purchase-order services when RBAC denies access", async () => {
    getLocale.mockResolvedValue("fr")
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await PurchaseOrdersPage())

    expect(screen.getByRole("heading", { name: "Purchase order dashboard is not available for this role" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "permission_denied")
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/fr/dashboard")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListPurchaseOrders).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrderFormOptions).not.toHaveBeenCalled()
    expect(mockGetSummary).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrderCurrency).not.toHaveBeenCalled()
  })

  it("fails closed without purchase-order service access when no active organization is available", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("No active organization", "NO_ACTIVE_ORG", 403))

    render(await PurchaseOrdersPage())

    expect(screen.getByRole("heading", { name: "Purchase order dashboard needs an active organization" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "no_active_org")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListPurchaseOrders).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrderFormOptions).not.toHaveBeenCalled()
    expect(mockGetSummary).not.toHaveBeenCalled()
    expect(mockGetPurchaseOrderCurrency).not.toHaveBeenCalled()
  })
})
