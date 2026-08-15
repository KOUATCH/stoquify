import { render, screen } from "@testing-library/react"

const mockRequireAnyPermission = jest.fn()
const mockGetDashboard = jest.fn()

jest.mock("@/lib/security/rbac", () => ({
  requireAnyPermission: (...args: unknown[]) => mockRequireAnyPermission(...args),
  hasRbacPermission: (permissions: string[], permission: string) => permissions.includes(permission),
}))
jest.mock("@/services/onboarding/master-data-import.service", () => ({
  getMasterDataOnboardingDashboard: (...args: unknown[]) => mockGetDashboard(...args),
}))
jest.mock("@/components/onboarding/MasterDataOnboardingWorkbench", () => ({
  MasterDataOnboardingWorkbench: ({ initialData }: { initialData: { organizationId: string } }) => (
    <div data-testid="onboarding-workbench">{initialData.organizationId}</div>
  ),
}))

import Page from "../page"

describe("master-data onboarding dashboard route", () => {
  beforeEach(() => jest.clearAllMocks())

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
    render(await Page())
    expect(mockGetDashboard).toHaveBeenCalledWith("org-session", ["CUSTOMER", "SUPPLIER", "ITEM"])
    expect(screen.getByTestId("onboarding-workbench")).toHaveTextContent("org-session")
  })

  it("limits the readiness query to domains the actor can read", async () => {
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-session",
      userId: "user-1",
      permissions: ["customers.read"],
    })
    mockGetDashboard.mockResolvedValue({ organizationId: "org-session" })
    render(await Page())
    expect(mockGetDashboard).toHaveBeenCalledWith("org-session", ["CUSTOMER"])
  })
})
