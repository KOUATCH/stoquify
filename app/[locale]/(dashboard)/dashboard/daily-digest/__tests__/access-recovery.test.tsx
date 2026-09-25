import { render, screen } from "@testing-library/react"
import { withDailyDigestSurfaceAccess } from "../daily-digest-route-access"
import { dailyDigestRouteCatalog } from "../daily-digest-route-data-access"
import { RbacError, requirePermission, requireAnyPermission, requireAllPermissions } from "@/lib/security/rbac"
import type { RbacErrorCode } from "@/lib/security/rbac"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("lucide-react", () => {
  const Icon = () => <svg aria-hidden="true" />
  return { AlertTriangle: Icon, Building2: Icon, Clock3: Icon, LockKeyhole: Icon, PackageX: Icon, SearchX: Icon }
})
jest.mock("@/lib/security/rbac", () => ({
  RbacError: class extends Error { constructor(message: string, public code: string, public status: number) { super(message) } },
  requirePermission: jest.fn(), requireAnyPermission: jest.fn(), requireAllPermissions: jest.fn(),
}))
jest.mock("next-intl/server", () => ({ getTranslations: async ({ locale }: { locale: string }) => (key: string) => {
  const copy = (locale === "fr" ? fr : en).dailyDigestAccess
  return key.split(".").reduce<unknown>((value, segment) => (value as Record<string, unknown>)[segment], copy)
} }))
const single = jest.mocked(requirePermission), any = jest.mocked(requireAnyPermission), all = jest.mocked(requireAllPermissions)
beforeEach(() => {
  jest.clearAllMocks()
  single.mockReset()
  any.mockReset()
  all.mockReset()
})

describe.each(["en", "fr"] as const)("dailyDigest access recovery in %s", locale => {
  it.each(["UNAUTHENTICATED", "NO_ACTIVE_ORG", "EMAIL_NOT_VERIFIED", "ACCOUNT_LOCKED", "FORBIDDEN"] as RbacErrorCode[])("explains %s without reading protected data", async code => {
    any.mockRejectedValue(new RbacError("PRIVATE_ACCESS_DETAIL", code, code === "UNAUTHENTICATED" ? 401 : 403))
    const onAllowed = jest.fn(), surface = dailyDigestRouteCatalog[0]!
    render(await withDailyDigestSurfaceAccess({ params: Promise.resolve({ locale }), surface, onAllowed }))
    expect(onAllowed).not.toHaveBeenCalled()
    expect(screen.getByRole("heading")).toHaveTextContent((locale === "fr" ? fr : en).dailyDigestAccess[code].title)
    expect(screen.queryByText(/PRIVATE_ACCESS_DETAIL/)).not.toBeInTheDocument()
    const signIn = code === "UNAUTHENTICATED" || code === "EMAIL_NOT_VERIFIED"
    expect(screen.getByRole("link")).toHaveAttribute("href", signIn ? `/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}${surface.route}`)}` : `/${locale}/dashboard`)
    if (signIn) expect(screen.getByRole("link")).toHaveAccessibleName((locale === "fr" ? fr : en).dailyDigestAccess.signIn)
  })
})

it.each(dailyDigestRouteCatalog)("keeps $key behind its authoritative permission check", async surface => {
  const context = { orgId: "owned-org", permissions: ["reports.read"] }
  const guard = surface.permissionMode === "any" ? any : single
  guard.mockResolvedValue(context as Awaited<ReturnType<typeof requirePermission>>)
  const onAllowed = jest.fn(() => <p>Authorized report</p>)
  render(await withDailyDigestSurfaceAccess({ params: Promise.resolve({ locale: "fr" }), surface, onAllowed }))
  expect(onAllowed).toHaveBeenCalledWith(context, "fr")
  expect(guard).toHaveBeenCalledWith(surface.permissionMode === "any" ? surface.permissions : surface.permissions[0], expect.objectContaining({ resource: surface.resource }))
  expect(screen.getByText("Authorized report")).toBeVisible()
})
it("preserves all-permission checks and object scope", async () => {
  all.mockRejectedValue(new RbacError("denied", "FORBIDDEN", 403))
  const onAllowed = jest.fn()
  await withDailyDigestSurfaceAccess({ params: Promise.resolve({ locale: "en" }), surface: { ...dailyDigestRouteCatalog[0]!, permissionMode: "all" }, permissionOptions: { resourceId: "owned-object" }, onAllowed })
  expect(all).toHaveBeenCalledWith(dailyDigestRouteCatalog[0]!.permissions, { resource: "KontavaDailyHabitDigest", resourceId: "owned-object" })
  expect(onAllowed).not.toHaveBeenCalled()
})
it("propagates source failures instead of rendering denial or empty data", async () => {
  const failure = new Error("source unavailable"), onAllowed = jest.fn()
  any.mockRejectedValue(failure)
  await expect(withDailyDigestSurfaceAccess({ params: Promise.resolve({ locale: "en" }), surface: dailyDigestRouteCatalog[0]!, onAllowed })).rejects.toBe(failure)
  expect(onAllowed).not.toHaveBeenCalled()
})
