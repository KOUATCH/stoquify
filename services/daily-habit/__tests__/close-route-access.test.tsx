jest.mock("@/components/dashboard/DashboardRouteState", () => ({ DashboardRouteState: () => null }))
jest.mock("next-intl/routing", () => ({ defineRouting: (routing: unknown) => routing }))
jest.mock("@/lib/security/rbac", () => ({ RbacError: class extends Error {}, requirePermission: jest.fn(), requireAnyPermission: jest.fn(), requireAllPermissions: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))

import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { routeByKey, withAccountingSurfaceAccess } from "@/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access"

describe.each(["accounting-close", "accounting-close-period"])("%s module read boundary", key => {
  beforeEach(() => {
    jest.resetAllMocks()
    ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-session", userId: "reader-session", permissions: ["accounting.close.read"] })
  })

  it.each(["en", "fr"])("denies before loading domain data and provides localized recovery (%s)", async locale => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
    const onAllowed = jest.fn(() => "private data")
    const result = await withAccountingSurfaceAccess({ params: Promise.resolve({ locale }), surface: routeByKey(key)!, onAllowed })
    expect(onAllowed).not.toHaveBeenCalled()
    expect(result).toMatchObject({ props: { kind: "locked_module", title: locale === "fr" ? "L’assurance de clôture est indisponible" : "Close Assurance is not available", primaryHref: `/${locale}/dashboard` } })
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", userId: "reader-session", moduleSlug: "close_assurance", accessIntent: "read", mode: "enforce" }))
  })

  it("preserves an allowed retained read", async () => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true, result: "allow_read_only" })
    const onAllowed = jest.fn(() => "authorized data")
    expect(await withAccountingSurfaceAccess({ params: Promise.resolve({ locale: "fr" }), surface: routeByKey(key)!, onAllowed })).toBe("authorized data")
    expect(onAllowed).toHaveBeenCalledWith(expect.objectContaining({ orgId: "org-session", userId: "reader-session" }), "fr")
  })

  it("propagates failed entitlement reads without calling the domain loader", async () => {
    ;(observeModuleAccess as jest.Mock).mockRejectedValue(new Error("Module read unavailable"))
    const onAllowed = jest.fn()
    await expect(withAccountingSurfaceAccess({ params: Promise.resolve({ locale: "en" }), surface: routeByKey(key)!, onAllowed })).rejects.toThrow("Module read unavailable")
    expect(onAllowed).not.toHaveBeenCalled()
  })
})
