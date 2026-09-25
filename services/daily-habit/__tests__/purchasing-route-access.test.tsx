jest.mock("@/components/dashboard/DashboardRouteState", () => ({ DashboardRouteState: () => null }))
jest.mock("next-intl/routing", () => ({ defineRouting: (value: unknown) => value }))
jest.mock("@/lib/security/rbac", () => ({ RbacError: class extends Error {}, requirePermission: jest.fn(), requireAnyPermission: jest.fn(), requireAllPermissions: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { routeByKey, withPurchaseOrdersSurfaceAccess } from "@/app/[locale]/(dashboard)/dashboard/purchase-orders/purchase-orders-route-access"

describe.each(["purchase-orders-dashboard", "purchase-orders-detail", "purchase-orders-analytics"])("%s enforced reads", key => {
  beforeEach(() => {
    jest.resetAllMocks()
    ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "session-org", userId: "session-user", permissions: ["purchases.orders.read"] })
  })
  it.each(["en", "fr"])("denies before domain loading with localized guidance (%s)", async locale => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
    const onAllowed = jest.fn()
    const result = await withPurchaseOrdersSurfaceAccess({ params: Promise.resolve({ locale }), surface: routeByKey(key)!, onAllowed })
    expect(onAllowed).not.toHaveBeenCalled()
    expect(result).toMatchObject({ props: { kind: "locked_module", title: locale === "fr" ? "Les achats sont indisponibles" : "Purchasing is not available", primaryHref: `/${locale}/dashboard` } })
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "session-org", userId: "session-user", moduleSlug: "purchasing", accessIntent: "read", mode: "enforce" }))
  })
  it("permits retained reads and rejects query failure without domain loading", async () => {
    const onAllowed = jest.fn(() => "retained record")
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true, result: "allow_read_only" })
    expect(await withPurchaseOrdersSurfaceAccess({ params: Promise.resolve({ locale: "en" }), surface: routeByKey(key)!, onAllowed })).toBe("retained record")
    onAllowed.mockClear()
    ;(observeModuleAccess as jest.Mock).mockRejectedValue(new Error("Grant unavailable"))
    await expect(withPurchaseOrdersSurfaceAccess({ params: Promise.resolve({ locale: "en" }), surface: routeByKey(key)!, onAllowed })).rejects.toThrow("Grant unavailable")
    expect(onAllowed).not.toHaveBeenCalled()
  })
})
