import { render, screen } from "@testing-library/react"
import UsersPage from "@/app/[locale]/(dashboard)/dashboard/settings/users/page"
import getOrgUsers from "@/actions/users/getOrgUsers"
import { requirePermission } from "@/lib/security/rbac"

jest.mock("@/actions/users/getOrgUsers", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/actions/users/getOrgInvites", () => ({ getOrgInvites: jest.fn(async () => ({ data: { rows: [], asOf: "2026-09-06T10:00:00.000Z" } })) }))
jest.mock("@/services/users/user-invitation-options.service", () => ({ readInvitationRoleOptions: jest.fn(async () => ({ state: "denied", roles: [] })) }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/config/useAuth", () => ({ getAuthenticatedUser: jest.fn(async () => ({ id: "reader", organizationId: "org-1", permissions: ["users.read"] })) }))
jest.mock("@/i18n/routing", () => ({ pickLocale: (value: string) => value === "fr" ? "fr" : "en" }))
jest.mock("lucide-react", () => ({ AlertTriangle: () => null, Settings: () => null, UserPlus: () => null, UsersRound: () => null }))
jest.mock("@/components/Forms/users/userInvitationForm", () => () => null)
jest.mock("@/components/dashboard/DashboardRouteState", () => ({ DashboardRouteState: ({ title, message, primaryHref, primaryLabel }: any) => <section><h1>{title}</h1><p>{message}</p><a href={primaryHref}>{primaryLabel}</a></section> }))
jest.mock("@/app/[locale]/(dashboard)/dashboard/settings/settings-route-access", () => ({ routeByKey: () => ({ key: "users" }), withSettingsSurfaceAccess: ({ onAllowed }: any) => onAllowed() }))
jest.mock("@/app/[locale]/(dashboard)/dashboard/settings/users/UsersPageClient", () => ({ __esModule: true, default: ({ users, canDeactivate, locale }: any) => <div data-testid="directory" data-deactivate={String(canDeactivate)} data-locale={locale}>{users.map((user: any) => <span key={user.id}>{user.roleNames}</span>)}</div> }))
beforeEach(() => {
  jest.clearAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", userId: "reader", permissions: ["users.read"] })
  ;(getOrgUsers as jest.Mock).mockResolvedValue({ success: true, asOf: "2026-09-06T10:00:00.000Z", data: [{ id: "member", firstName: "Synthetic", lastName: "Member", email: "member@example.invalid", roles: [{ nameEn: "Viewer", nameFr: "Lecteur" }] }] })
})
it("shows a retry instead of zero members when the directory fails", async () => {
  ;(getOrgUsers as jest.Mock).mockResolvedValue({ success: false, data: null, code: "DATABASE_UNAVAILABLE" })
  render(await UsersPage({ params: Promise.resolve({ locale: "en" }) }))
  expect(screen.getByRole("heading", { name: "Member directory could not load" })).toBeVisible()
  expect(screen.queryByTestId("directory")).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Refresh members" })).toHaveAttribute("href", "/en/dashboard/settings/users")
})
it("passes read-only authority and localized role names", async () => {
  render(await UsersPage({ params: Promise.resolve({ locale: "fr" }) }))
  expect(screen.getByRole("heading", { name: "Utilisateurs et invitations" })).toBeVisible()
  expect(screen.getByText("Lecteur")).toBeVisible()
  expect(screen.getByTestId("directory")).toHaveAttribute("data-deactivate", "false")
})
it("recognizes explicit deactivation grants while rejecting wildcard-only controls", async () => {
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", userId: "editor", permissions: ["users.read", "users.deactivate"] })
  const { unmount } = render(await UsersPage({ params: Promise.resolve({ locale: "en" }) }))
  expect(screen.getByTestId("directory")).toHaveAttribute("data-deactivate", "true")
  unmount()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", userId: "editor", permissions: ["*"] })
  render(await UsersPage({ params: Promise.resolve({ locale: "en" }) }))
  expect(screen.getByTestId("directory")).toHaveAttribute("data-deactivate", "false")
})
