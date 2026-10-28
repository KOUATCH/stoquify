import { render, screen } from "@testing-library/react"

import { getAPWorkbenchAction } from "@/actions/purchasing/ap-control.actions"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import PurchasePayablesPage from "../page"

jest.mock("@/actions/purchasing/ap-control.actions", () => ({
  getAPWorkbenchAction: jest.fn(),
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

jest.mock("@/components/purchasing/APControlWorkbench", () => ({
  __esModule: true,
  default: ({ locale }: { locale: string }) => <div>AP workbench rendered for {locale}</div>,
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
      <a href={primaryHref}>Back to purchases</a>
    </main>
  ),
}))

const mockGetAPWorkbenchAction = getAPWorkbenchAction as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

describe("PurchasePayablesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["purchasing.ap.invoice.view"],
    })
    mockObserveModuleAccess.mockResolvedValue({
      allowed: false,
      wouldBlock: true,
      result: "would_block",
      mode: "observe",
      moduleSlug: "purchasing",
    })
    mockGetAPWorkbenchAction.mockResolvedValue({
      success: true,
      data: { summary: { invoiceCount: 1 } },
    })
  })

  it("enforces AP RBAC, observes purchasing module access, and renders the workbench", async () => {
    const ui = await PurchasePayablesPage({ params: Promise.resolve({ locale: "en" }) })
    render(ui)

    expect(mockRequirePermission).toHaveBeenCalledWith("purchasing.ap.invoice.view", {
      resource: "APWorkbench",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["purchasing.ap.invoice.view"],
      moduleSlug: "purchasing",
      surfaceType: "page",
      surface: "/dashboard/purchases/payables",
      accessIntent: "read",
      mode: "observe",
    }))
    expect(mockGetAPWorkbenchAction).toHaveBeenCalledWith({ limit: 25 })
    expect(screen.getByText("AP workbench rendered for en")).toBeInTheDocument()
  })

  it("renders the shared dashboard fallback when the AP read model fails", async () => {
    mockGetAPWorkbenchAction.mockResolvedValue({
      success: false,
      error: "raw supplier AP SQL failure",
    })

    const ui = await PurchasePayablesPage({ params: Promise.resolve({ locale: "en" }) })
    render(ui)

    expect(screen.getByRole("heading", { name: "AP workbench data is unavailable" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "error")
    expect(screen.getByText(/read-only AP source failed safely/)).toBeInTheDocument()
    expect(screen.queryByText(/raw supplier AP SQL failure/)).not.toBeInTheDocument()
    expect(screen.queryByText(/AP workbench rendered/)).not.toBeInTheDocument()
  })

  it("fails closed before AP read-model access when RBAC denies the page", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const ui = await PurchasePayablesPage({ params: Promise.resolve({ locale: "fr" }) })
    render(ui)

    expect(screen.getByRole("heading", { name: "L'atelier AP n'est pas disponible pour ce rôle" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "permission_denied")
    expect(screen.getByRole("link", { name: "Back to purchases" })).toHaveAttribute("href", "/fr/dashboard/purchases")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetAPWorkbenchAction).not.toHaveBeenCalled()
  })

  it("fails closed before AP read-model access when no active organization is available", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("No active organization", "NO_ACTIVE_ORG", 403))

    const ui = await PurchasePayablesPage({ params: Promise.resolve({ locale: "en" }) })
    render(ui)

    expect(screen.getByRole("heading", { name: "AP workbench needs an active organization" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "no_active_org")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetAPWorkbenchAction).not.toHaveBeenCalled()
  })
})
