import { render, screen } from "@testing-library/react"
import { withAnalyticsSurfaceAccess } from "../analytics-route-access"
import { analyticsRouteCatalog } from "../analytics-route-data-access"
import { RbacError, requirePermission, requireAnyPermission, requireAllPermissions } from "@/lib/security/rbac"
import type { RbacErrorCode } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("lucide-react", () => {
  const Icon = () => <svg aria-hidden="true" />
  return { AlertTriangle: Icon, Building2: Icon, Clock3: Icon, LockKeyhole: Icon, PackageX: Icon, SearchX: Icon }
})
jest.mock("@/lib/security/rbac", () => ({
  RbacError: class extends Error { constructor(message: string, public code: string, public status: number) { super(message) } },
  requirePermission: jest.fn(), requireAnyPermission: jest.fn(), requireAllPermissions: jest.fn(),
}))
jest.mock("next-intl/server", () => ({ getTranslations: async ({ locale }: { locale: string }) => (key: string) => {
  const copy = (locale === "fr" ? fr : en).analyticsAccess
  return key.split(".").reduce<unknown>((value, segment) => (value as Record<string, unknown>)[segment], copy)
} }))
const single = jest.mocked(requirePermission), any = jest.mocked(requireAnyPermission), all = jest.mocked(requireAllPermissions)
beforeEach(() => {
  jest.clearAllMocks()
  single.mockReset()
  any.mockReset()
  all.mockReset()
  ;(observeModuleAccess as jest.Mock).mockReset().mockResolvedValue({ allowed: true })
})

describe.each(["en", "fr"] as const)("analytics access recovery in %s", locale => {
  it("denies unavailable module reads before loading analytics", async () => {
    any.mockResolvedValue({ orgId: "owned-org", userId: "owned-user", permissions: ["reports.read"] } as Awaited<ReturnType<typeof requirePermission>>)
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
    const onAllowed = jest.fn()
    render(await withAnalyticsSurfaceAccess({ params: Promise.resolve({ locale }), surface: analyticsRouteCatalog[0]!, onAllowed }))
    expect(onAllowed).not.toHaveBeenCalled()
    expect(screen.getByRole("heading")).toHaveTextContent((locale === "fr" ? fr : en).analyticsAccess.MODULE_UNAVAILABLE.title)
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "owned-org", userId: "owned-user", moduleSlug: "analytics", mode: "enforce", accessIntent: "read" }))
  })
  it.each(["UNAUTHENTICATED", "NO_ACTIVE_ORG", "EMAIL_NOT_VERIFIED", "ACCOUNT_LOCKED", "FORBIDDEN"] as RbacErrorCode[])("explains %s without reading protected data", async code => {
    any.mockRejectedValue(new RbacError("PRIVATE_ACCESS_DETAIL", code, code === "UNAUTHENTICATED" ? 401 : 403))
    const onAllowed = jest.fn(), surface = analyticsRouteCatalog[0]!
    render(await withAnalyticsSurfaceAccess({ params: Promise.resolve({ locale }), surface, onAllowed }))
    expect(onAllowed).not.toHaveBeenCalled()
    expect(screen.getByRole("heading")).toHaveTextContent((locale === "fr" ? fr : en).analyticsAccess[code].title)
    expect(screen.queryByText(/PRIVATE_ACCESS_DETAIL/)).not.toBeInTheDocument()
    const signIn = code === "UNAUTHENTICATED" || code === "EMAIL_NOT_VERIFIED"
    expect(screen.getByRole("link")).toHaveAttribute("href", signIn ? `/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}${surface.route}`)}` : `/${locale}/dashboard`)
    if (signIn) expect(screen.getByRole("link")).toHaveAccessibleName((locale === "fr" ? fr : en).analyticsAccess.signIn)
  })
})

it.each(analyticsRouteCatalog)("keeps $key behind its authoritative permission check", async surface => {
  const context = { orgId: "owned-org", permissions: ["reports.read"] }
  const guard = surface.permissionMode === "any" ? any : single
  guard.mockResolvedValue(context as Awaited<ReturnType<typeof requirePermission>>)
  const onAllowed = jest.fn(() => <p>Authorized report</p>)
  render(await withAnalyticsSurfaceAccess({ params: Promise.resolve({ locale: "fr" }), surface, onAllowed }))
  expect(onAllowed).toHaveBeenCalledWith(context, "fr")
  expect(guard).toHaveBeenCalledWith(surface.permissionMode === "any" ? surface.permissions : surface.permissions[0], expect.objectContaining({ resource: surface.resource }))
  expect(screen.getByText("Authorized report")).toBeVisible()
})
it("preserves all-permission checks and object scope", async () => {
  all.mockRejectedValue(new RbacError("denied", "FORBIDDEN", 403))
  const onAllowed = jest.fn()
  await withAnalyticsSurfaceAccess({ params: Promise.resolve({ locale: "en" }), surface: { ...analyticsRouteCatalog[0]!, permissionMode: "all" }, permissionOptions: { resourceId: "owned-object" }, onAllowed })
  expect(all).toHaveBeenCalledWith(analyticsRouteCatalog[0]!.permissions, { resource: "BusinessPulseAnalytics", resourceId: "owned-object" })
  expect(onAllowed).not.toHaveBeenCalled()
})
it("propagates source failures instead of rendering denial or empty data", async () => {
  const failure = new Error("source unavailable"), onAllowed = jest.fn()
  any.mockRejectedValue(failure)
  await expect(withAnalyticsSurfaceAccess({ params: Promise.resolve({ locale: "en" }), surface: analyticsRouteCatalog[0]!, onAllowed })).rejects.toBe(failure)
  expect(onAllowed).not.toHaveBeenCalled()
})
it("does not load analytics when the module lookup fails", async () => {
  any.mockResolvedValue({ orgId: "owned-org", userId: "owned-user", permissions: ["reports.read"] } as Awaited<ReturnType<typeof requirePermission>>)
  const failure = new Error("module lookup unavailable"), onAllowed = jest.fn()
  ;(observeModuleAccess as jest.Mock).mockRejectedValue(failure)
  await expect(withAnalyticsSurfaceAccess({ params: Promise.resolve({ locale: "en" }), surface: analyticsRouteCatalog[0]!, onAllowed })).rejects.toBe(failure)
  expect(onAllowed).not.toHaveBeenCalled()
})
