import { render, screen } from "@testing-library/react"

import { requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import SupplierAPHistoryPage from "../page"

jest.mock("@/components/purchasing/APHistoryWorkbench", () => ({
  APHistoryWorkbench: () => <div data-testid="ap-history-workbench" />,
}))

jest.mock("@/lib/security/rbac", () => ({
  requireAnyPermission: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

describe("supplier AP history page boundary", () => {
  it("accepts the established AP or supplier read permissions and enforces purchasing entitlement", async () => {
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      permissions: ["purchases.suppliers.read"],
    })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })

    render(await SupplierAPHistoryPage())

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
    expect(screen.getByTestId("ap-history-workbench")).toBeInTheDocument()
  })
})
