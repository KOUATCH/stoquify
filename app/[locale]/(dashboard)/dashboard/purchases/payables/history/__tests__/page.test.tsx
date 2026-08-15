import { render, screen } from "@testing-library/react"

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import SupplierAPHistoryPage from "../page"

jest.mock("@/components/purchasing/APHistoryWorkbench", () => ({
  APHistoryWorkbench: () => <div data-testid="ap-history-workbench" />,
}))

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  },
  requireAnyPermission: jest.fn(),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({ kind, title, message, primaryHref }: { kind: string; title: string; message: string; primaryHref: string }) => (
    <main data-kind={kind}>
      <h1>{title}</h1>
      <p>{message}</p>
      <a href={primaryHref}>back</a>
    </main>
  ),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

describe("supplier AP history page boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("accepts the established AP or supplier read permissions and enforces purchasing entitlement", async () => {
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["purchases.suppliers.read"],
    })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })

    render(await SupplierAPHistoryPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith([
      "purchasing.ap.invoice.view",
      "finance.payables.read",
      "purchases.suppliers.read",
    ], {
      resource: "SupplierAPHistory",
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorPermissions: ["purchases.suppliers.read"],
      moduleSlug: "purchasing",
      mode: "enforce",
    }))
    const workbench = screen.getByTestId("ap-history-workbench")
    expect(workbench).toBeInTheDocument()
    expect(workbench.closest(".dashboard-landing-theme")).toHaveClass(
      "dark",
      "min-h-screen",
    )
  })

  it("renders a localized safe denial before loading history", async () => {
    mockRequireAnyPermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    render(await SupplierAPHistoryPage({ params: Promise.resolve({ locale: "fr" }) }))

    expect(screen.getByRole("main")).toHaveAttribute("data-kind", "permission_denied")
    expect(screen.getByRole("heading", { name: "L'historique AP n'est pas disponible pour ce rôle" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "back" })).toHaveAttribute("href", "/fr/dashboard/purchases/payables")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })
})
