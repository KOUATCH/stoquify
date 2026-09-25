jest.mock("@/components/dashboard/DashboardRouteState", () => ({ DashboardRouteState: () => null }))
jest.mock("next-intl/routing", () => ({ defineRouting: (routing: unknown) => routing }))
jest.mock("@/lib/security/rbac", () => ({ RbacError: class extends Error {}, requirePermission: jest.fn(), requireAnyPermission: jest.fn(), requireAllPermissions: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))

import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { routeByKey, withInventorySurfaceAccess } from "@/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-access"

describe("Inventory item handoff read boundary", () => {
  const surface = routeByKey("inventory-items")!
  beforeEach(() => {
    jest.resetAllMocks()
    ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-session", userId: "reader-session", permissions: ["inventory.items.read"] })
  })
  it.each(["en", "fr"])("denies missing entitlement before loading data (%s)", async locale => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
    const onAllowed = jest.fn()
    const result = await withInventorySurfaceAccess({ params: Promise.resolve({ locale }), surface, onAllowed })
    expect(onAllowed).not.toHaveBeenCalled()
    expect(result).toMatchObject({ props: { kind: "locked_module", title: locale === "fr" ? "L’inventaire est indisponible" : "Inventory is not available", primaryHref: `/${locale}/dashboard` } })
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", userId: "reader-session", moduleSlug: "inventory", accessIntent: "read", mode: "enforce" }))
  })
  it.each(["en", "fr"])("denies missing item permission before entitlement and data queries (%s)", async locale => {
    ;(requirePermission as jest.Mock).mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))
    const onAllowed = jest.fn()
    const result = await withInventorySurfaceAccess({ params: Promise.resolve({ locale }), surface, onAllowed })
    expect(result).toMatchObject({ props: { kind: "permission_denied", primaryHref: `/${locale}/dashboard` } })
    expect(onAllowed).not.toHaveBeenCalled()
    expect(observeModuleAccess).not.toHaveBeenCalled()
  })
  it("preserves allowed retained reads with server-derived identity", async () => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true, result: "allow_read_only" })
    const onAllowed = jest.fn(() => "authorized data")
    expect(await withInventorySurfaceAccess({ params: Promise.resolve({ locale: "fr" }), surface, onAllowed })).toBe("authorized data")
    expect(onAllowed).toHaveBeenCalledWith(expect.objectContaining({ orgId: "org-session", userId: "reader-session" }), "fr")
  })
  it("does not read data when entitlement lookup fails", async () => {
    ;(observeModuleAccess as jest.Mock).mockRejectedValue(new Error("Access lookup unavailable"))
    const onAllowed = jest.fn()
    await expect(withInventorySurfaceAccess({ params: Promise.resolve({ locale: "en" }), surface, onAllowed })).rejects.toThrow("Access lookup unavailable")
    expect(onAllowed).not.toHaveBeenCalled()
  })
})
