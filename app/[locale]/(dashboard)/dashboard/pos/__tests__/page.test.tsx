import { render, screen } from "@testing-library/react"

import { requirePermission } from "@/lib/security/rbac"
import { isPOSG0CashOnlyPilot } from "@/services/pos/pos-g0-pilot"

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

jest.mock("@/services/pos/pos-g0-pilot", () => ({
  isPOSG0CashOnlyPilot: jest.fn((organizationId: string) => organizationId === "pilot-org"),
}))

const mockProfessionalPOSSystem = jest.fn((_props: { cashOnlyPilot: boolean }) => <section>POS shell rendered</section>)

jest.mock("@/components/pos/ProfessionalPOSSystem", () => ({
  __esModule: true,
  default: (props: { cashOnlyPilot: boolean }) => mockProfessionalPOSSystem(props),
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
    expect(isPOSG0CashOnlyPilot).toHaveBeenCalledWith("org-1")
    expect(mockProfessionalPOSSystem).toHaveBeenCalledWith({ cashOnlyPilot: false })
    expect(screen.getByText("POS shell rendered")).toBeInTheDocument()
  })

  it("passes cash-only checkout to the authenticated pilot organization", async () => {
    mockRequirePermission.mockResolvedValue({ orgId: "pilot-org" })

    render(await POSPage({ params: Promise.resolve({ locale: "fr" }) }))

    expect(isPOSG0CashOnlyPilot).toHaveBeenCalledWith("pilot-org")
    expect(mockProfessionalPOSSystem).toHaveBeenCalledWith({ cashOnlyPilot: true })
  })

  it("stops before rendering the POS shell when the permission guard denies access", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"))

    await expect(POSPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("Forbidden")

    expect(mockRequirePermission).toHaveBeenCalledWith("OPERATE_POS", expect.objectContaining({
      resource: "POSPage",
    }))
    expect(isPOSG0CashOnlyPilot).not.toHaveBeenCalled()
    expect(mockProfessionalPOSSystem).not.toHaveBeenCalled()
  })
})
