import { render, screen } from "@testing-library/react"

import { requirePermission } from "@/lib/security/rbac"

import POSPage from "../page"

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class MockRbacError extends Error {},
  requireAllPermissions: jest.fn(),
  requireAnyPermission: jest.fn(),
  requirePermission: jest.fn(),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: () => <main />,
}))

const mockProfessionalPOSSystem = jest.fn(() => <section>POS shell rendered</section>)

jest.mock("@/components/pos/ProfessionalPOSSystem", () => ({
  __esModule: true,
  default: () => mockProfessionalPOSSystem(),
}))

const mockRequirePermission = requirePermission as jest.Mock

describe("POSPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ orgId: "org-1" })
  })

  it("requires POS operation permission before rendering the POS shell", async () => {
    render(await POSPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockRequirePermission).toHaveBeenCalledWith("OPERATE_POS", {
      resource: "POSPage",
      resourceId: undefined,
      auditAllowed: true,
    })
    expect(mockProfessionalPOSSystem).toHaveBeenCalledTimes(1)
    expect(screen.getByText("POS shell rendered")).toBeInTheDocument()
  })

  it("stops before rendering the POS shell when the permission guard denies access", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"))

    await expect(POSPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("Forbidden")

    expect(mockRequirePermission).toHaveBeenCalledWith("OPERATE_POS", expect.objectContaining({
      resource: "POSPage",
    }))
    expect(mockProfessionalPOSSystem).not.toHaveBeenCalled()
  })
})
