jest.mock("@/components/dashboard/DashboardRouteState", () => ({ DashboardRouteState: () => null }))
jest.mock("next-intl/routing", () => ({ defineRouting: (value: unknown) => value }))
jest.mock("next-intl/server", () => ({ getTranslations: async ({ locale, namespace }: { locale: string; namespace: "operatingWorkspaceAccess" | "ownerWorkspaceAccess" }) => (key: string) => ((locale === "fr" ? fr : en)[namespace] as Record<string, string>)[key] }))
jest.mock("@/lib/security/rbac", () => ({ RbacError: class extends Error { constructor(message: string, public code: string, public status: number) { super(message) } }, requirePermission: jest.fn(), requireAnyPermission: jest.fn(), requireAllPermissions: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { routeByKey as ownerRoute, withOwnerWarRoomSurfaceAccess } from "@/app/[locale]/(dashboard)/dashboard/owner-war-room/owner-war-room-route-access"
import { routeByKey as managerRoute, withManagerActionSurfaceAccess } from "@/app/[locale]/(dashboard)/dashboard/manager-action-center/manager-action-route-access"

describe.each(["owner-war-room", "manager-action-center", "manager-action-center-daily-close"])("%s read admission", key => {
  const render = (locale: string, onAllowed: jest.Mock) => key === "owner-war-room"
    ? withOwnerWarRoomSurfaceAccess({ params: Promise.resolve({ locale }), surface: ownerRoute(key)!, onAllowed })
    : withManagerActionSurfaceAccess({ params: Promise.resolve({ locale }), surface: managerRoute(key)!, onAllowed, onDenied: jest.fn() })
  beforeEach(() => {
    jest.resetAllMocks()
    ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "session-org", userId: "session-user", permissions: ["dashboard.read"] })
  })
  it.each(["en", "fr"])("denies unavailable access before loading operating evidence (%s)", async locale => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
    const onAllowed = jest.fn()
    expect(await render(locale, onAllowed)).toMatchObject({ props: { kind: "locked_module", locale, title: (locale === "fr" ? fr : en).operatingWorkspaceAccess.title, primaryHref: `/${locale}/dashboard` } })
    expect(onAllowed).not.toHaveBeenCalled()
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "session-org", userId: "session-user", actorPermissions: ["dashboard.read"], moduleSlug: "dashboard", accessIntent: "read", mode: "enforce" }))
  })
  it("preserves retained reads and propagates failed access queries", async () => {
    const onAllowed = jest.fn(() => "retained evidence")
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true, result: "allow_read_only" })
    expect(await render("en", onAllowed)).toBe("retained evidence")
    onAllowed.mockClear()
    ;(observeModuleAccess as jest.Mock).mockRejectedValue(new Error("Grant unavailable"))
    await expect(render("en", onAllowed)).rejects.toThrow("Grant unavailable")
    expect(onAllowed).not.toHaveBeenCalled()
  })
})

describe.each(["en", "fr"])("Owner recovery messages (%s)", locale => {
  const copy = (locale === "fr" ? fr : en).ownerWorkspaceAccess
  beforeEach(() => {
    jest.resetAllMocks()
    ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "session-org", userId: "session-user", permissions: ["dashboard.read"] })
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  })
  it.each(["NO_ACTIVE_ORG", "FORBIDDEN"])("explains %s without reading workspace evidence", async code => {
    ;(requirePermission as jest.Mock).mockRejectedValue(new RbacError("Private internal reason", code, 403))
    const onAllowed = jest.fn()
    const result = await withOwnerWarRoomSurfaceAccess({ params: Promise.resolve({ locale }), surface: ownerRoute("owner-war-room")!, onAllowed })
    expect(result).toMatchObject({ props: { kind: code === "NO_ACTIVE_ORG" ? "no_active_org" : "permission_denied", title: code === "NO_ACTIVE_ORG" ? copy.noActiveOrgTitle : copy.deniedTitle, message: code === "NO_ACTIVE_ORG" ? copy.noActiveOrgMessage : copy.deniedMessage, primaryHref: `/${locale}/dashboard` } })
    expect(onAllowed).not.toHaveBeenCalled()
    expect(observeModuleAccess).not.toHaveBeenCalled()
  })
  it("localizes an authority rejection from the destination service and preserves its denied callback", async () => {
    const onDenied = jest.fn(denial => denial)
    await withOwnerWarRoomSurfaceAccess({ params: Promise.resolve({ locale }), surface: ownerRoute("owner-war-room")!, onAllowed: () => { throw new RbacError("Private scope details", "FORBIDDEN", 403) }, onDenied })
    expect(onDenied).toHaveBeenCalledWith({ noActiveOrg: false, title: copy.deniedTitle, message: copy.deniedMessage, href: `/${locale}/dashboard` })
  })
})
