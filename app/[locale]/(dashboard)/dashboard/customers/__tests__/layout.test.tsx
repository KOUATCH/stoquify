import { render, screen } from "@testing-library/react"

import {
  RbacError,
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
} from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import CustomersLayout from "../layout"

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class RbacError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly status: number,
    ) {
      super(message)
    }
  },
  requirePermission: jest.fn(),
  requireAllPermissions: jest.fn(),
  requireAnyPermission: jest.fn(),
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

const mockRequireAllPermissions = requireAllPermissions as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const MockedRbacError = RbacError as unknown as typeof RbacError

describe("CustomersLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAllPermissions.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      permissions: ["customers.read"],
    })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
  })

  it("renders customer routes only after tenant and Sales entitlement checks", async () => {
    render(
      await CustomersLayout({
        children: <div>Customer content</div>,
        params: Promise.resolve({ locale: "en" }),
      }),
    )

    expect(screen.getByText("Customer content")).toBeInTheDocument()
    expect(mockRequireAllPermissions).toHaveBeenCalledWith(
      ["customers.read"],
      expect.objectContaining({ resource: "CustomerManagement" }),
    )
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["customers.read"],
      moduleSlug: "sales",
      surfaceType: "page",
      surface: "/dashboard/customers",
      accessIntent: "read",
      mode: "observe",
      audit: true,
    })
  })

  it("shows an audited locked-module state when Sales is disabled", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })

    render(
      await CustomersLayout({
        children: <div>Customer content</div>,
        params: Promise.resolve({ locale: "en" }),
      }),
    )

    expect(screen.queryByText("Customer content")).not.toBeInTheDocument()
    expect(
      screen.getByText(
        "locked_module:Customer management dashboard is not enabled for this tenant",
      ),
    ).toBeInTheDocument()
  })

  it("shows a permission denied state when the customer workspace permission is missing", async () => {
    mockRequireAllPermissions.mockRejectedValue(
      new MockedRbacError("Forbidden", "FORBIDDEN", 403),
    )

    render(
      await CustomersLayout({
        children: <div>Customer content</div>,
        params: Promise.resolve({ locale: "en" }),
      }),
    )

    expect(screen.queryByText("Customer content")).not.toBeInTheDocument()
    expect(
      screen.getByText(
        "permission_denied:Customer management dashboard is not available for this role",
      ),
    ).toBeInTheDocument()
  })
})
