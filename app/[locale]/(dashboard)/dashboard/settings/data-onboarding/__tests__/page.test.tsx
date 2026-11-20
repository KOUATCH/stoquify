import { render, screen } from "@testing-library/react"

const mockRequireAnyPermission = jest.fn()
const mockGetDashboard = jest.fn()
const mockObserveModuleAccess = jest.fn()

jest.mock("@/lib/security/rbac", () => ({
  requireAnyPermission: (...args: unknown[]) => mockRequireAnyPermission(...args),
  hasRbacPermission: (permissions: string[], permission: string) => permissions.includes(permission),
}))
jest.mock("@/services/onboarding/master-data-import.service", () => ({
  getMasterDataOnboardingDashboard: (...args: unknown[]) => mockGetDashboard(...args),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: (...args: unknown[]) => mockObserveModuleAccess(...args),
}))
jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({ kind }: { kind: string }) => <div>{`route:${kind}`}</div>,
}))
jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))
jest.mock("@/components/onboarding/MasterDataOnboardingWorkbench", () => ({
  MasterDataOnboardingWorkbench: ({ initialData }: { initialData: { organizationId: string } }) => (
    <div data-testid="onboarding-workbench">{initialData.organizationId}</div>
  ),
}))

import Page from "../page"

describe("master-data onboarding dashboard route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
  })

  it("derives the tenant from RBAC context and renders the readiness surface", async () => {
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-session",
      userId: "user-1",
      permissions: [
        "customers.read",
        "purchases.suppliers.read",
        "inventory.items.read",
        "customers.create",
        "purchases.suppliers.create",
        "inventory.items.create",
      ],
    })
    mockGetDashboard.mockResolvedValue({ organizationId: "org-session" })
    render(await Page({ params: Promise.resolve({ locale: "en" }) }))
    expect(mockRequireAnyPermission).toHaveBeenCalledWith(
      ["customers.read", "purchases.suppliers.read", "inventory.items.read"],
      { resource: "MasterDataOnboarding" },
    )
    expect(mockGetDashboard).toHaveBeenCalledWith("org-session", ["CUSTOMER", "SUPPLIER", "ITEM"], "user-1")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-session",
      userId: "user-1",
      moduleSlug: "settings",
      mode: "enforce",
      surfaceType: "page",
    }))
    expect(screen.getByTestId("onboarding-workbench")).toHaveTextContent("org-session")
  })

  it("limits the readiness query to domains the actor can read", async () => {
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-session",
      userId: "user-1",
      permissions: ["customers.read"],
    })
    mockGetDashboard.mockResolvedValue({ organizationId: "org-session" })
    render(await Page({ params: Promise.resolve({ locale: "fr" }) }))
    expect(mockGetDashboard).toHaveBeenCalledWith("org-session", ["CUSTOMER"], "user-1")
  })
})
