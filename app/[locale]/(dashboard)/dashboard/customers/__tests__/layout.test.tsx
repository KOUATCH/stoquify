import { render, screen } from "@testing-library/react"

import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import CustomersLayout from "../layout"

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("next-intl/server", () => ({
  getLocale: jest.fn().mockResolvedValue("en"),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (path: string, locale: string) => `/${locale}${path}`,
  pickLocale: (locale: string) => locale,
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({
    kind,
    title,
  }: {
    kind: string
    title: string
  }) => <div>{`${kind}:${title}`}</div>,
}))

const mockCheckPermission = checkPermission as jest.Mock
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

describe("CustomersLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetAuthenticatedUser.mockResolvedValue({
      id: "user-1",
      organizationId: "org-1",
      permissions: ["customers.read"],
    })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
  })

  it("renders customer routes only after tenant and Sales entitlement checks", async () => {
    render(await CustomersLayout({ children: <div>Customer content</div> }))

    expect(screen.getByText("Customer content")).toBeInTheDocument()
    expect(mockCheckPermission).toHaveBeenCalledWith("customers.read")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["customers.read"],
      moduleSlug: "sales",
      surfaceType: "page",
      surface: "/dashboard/customers",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    })
  })

  it("shows an audited locked-module state when Sales is disabled", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })

    render(await CustomersLayout({ children: <div>Customer content</div> }))

    expect(screen.queryByText("Customer content")).not.toBeInTheDocument()
    expect(
      screen.getByText(
        "locked_module:Customer workflows are not enabled for this organization",
      ),
    ).toBeInTheDocument()
  })
})
