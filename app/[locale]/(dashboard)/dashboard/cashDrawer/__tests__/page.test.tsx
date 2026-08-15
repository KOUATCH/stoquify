import { redirect } from "next/navigation"

import { requireAnyPermission } from "@/lib/security/rbac"

import LegacyLocaleCashDrawerPage from "../page"

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

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn().mockResolvedValue({ allowed: true }),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: () => <main />,
}))

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockRedirect = redirect as unknown as jest.Mock

describe("LegacyLocaleCashDrawerPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-rbac",
    })
  })

  it("requires cash drawer read access before redirecting to the canonical finance cash drawer route", async () => {
    await expect(
      LegacyLocaleCashDrawerPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/en/dashboard/finance/cash-drawer")

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["finance.cash-drawer.read", "finance.read"], {
      resource: "LegacyCashDrawerRedirect",
    })
    expect(mockRedirect).toHaveBeenCalledWith("/en/dashboard/finance/cash-drawer")
  })

  it("stops before redirect when cash drawer access is denied", async () => {
    mockRequireAnyPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(
      LegacyLocaleCashDrawerPage({ params: Promise.resolve({ locale: "fr" }) }),
    ).rejects.toThrow("Forbidden")

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["finance.cash-drawer.read", "finance.read"], {
      resource: "LegacyCashDrawerRedirect",
    })
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
