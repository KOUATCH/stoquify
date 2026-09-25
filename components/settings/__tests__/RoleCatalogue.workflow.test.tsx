import { render, screen } from "@testing-library/react"
import RolesPage from "@/app/[locale]/(dashboard)/dashboard/settings/roles/page"
import getOrgRoles from "@/actions/roles/getOrgRoles"
import { requirePermission } from "@/lib/security/rbac"

jest.mock("@/actions/roles/getOrgRoles", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/config/useAuth", () => ({ getAuthenticatedUser: jest.fn(async () => ({ organizationId: "org-1", organizationName: "Synthetic workspace" })) }))
jest.mock("@/i18n/routing", () => ({ pickLocale: (value: string) => value === "fr" ? "fr" : "en", localizePath: (value: string, locale: string) => "/" + locale + value }))
jest.mock("lucide-react", () => ({ LayoutGrid: () => null, Plus: () => null, ShieldCheck: () => null, UsersRound: () => null }))
jest.mock("@/components/dashboard/DashboardRouteState", () => ({ DashboardRouteState: ({ title, message, primaryHref, primaryLabel }: any) => <section><h1>{title}</h1><p>{message}</p><a href={primaryHref}>{primaryLabel}</a></section> }))
jest.mock("@/app/[locale]/(dashboard)/dashboard/settings/settings-route-access", () => ({ routeByKey: () => ({ key: "roles" }), withSettingsSurfaceAccess: ({ onAllowed }: any) => onAllowed() }))
jest.mock("@/app/[locale]/(dashboard)/dashboard/settings/roles/columns", () => ({ RoleTable: ({ data, canUpdate, locale }: any) => <div data-testid="role-table" data-can-update={String(canUpdate)} data-locale={locale}>{data.map((role: any) => <span key={role.id}>{role.name}</span>)}</div> }))

beforeEach(() => {
  jest.clearAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", userId: "reader", permissions: ["roles.read"] })
  ;(getOrgRoles as jest.Mock).mockResolvedValue({ success: true, data: [{ id: "role-1", name: "Reviewer", description: null, createdAt: new Date() }] })
})
it("does not show false zero totals when the scoped query fails", async () => {
  ;(getOrgRoles as jest.Mock).mockResolvedValue({ success: false, data: null, code: "DATABASE_UNAVAILABLE" })
  render(await RolesPage({ params: Promise.resolve({ locale: "en" }) }))
  expect(screen.getByRole("heading", { name: "Role catalogue could not load" })).toBeVisible()
  expect(screen.queryByText("Total roles")).not.toBeInTheDocument()
  expect(screen.queryByTestId("role-table")).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Refresh roles" })).toHaveAttribute("href", "/en/dashboard/settings/roles")
})
it("hides creation and passes read-only authority to the table", async () => {
  render(await RolesPage({ params: Promise.resolve({ locale: "en" }) }))
  expect(screen.queryByRole("link", { name: "Add Role" })).not.toBeInTheDocument()
  expect(screen.getByTestId("role-table")).toHaveAttribute("data-can-update", "false")
  expect(getOrgRoles).toHaveBeenCalledWith("org-1")
})
it("preserves French navigation and current editor authority", async () => {
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", userId: "editor", permissions: ["roles.read", "roles.create", "roles.update"] })
  render(await RolesPage({ params: Promise.resolve({ locale: "fr" }) }))
  expect(screen.getByRole("heading", { name: "Gestion des rôles" })).toBeVisible()
  expect(screen.getByRole("link", { name: "Ajouter un rôle" })).toHaveAttribute("href", "/fr/dashboard/settings/roles/new")
  expect(screen.getByTestId("role-table")).toHaveAttribute("data-locale", "fr")
  expect(screen.getByTestId("role-table")).toHaveAttribute("data-can-update", "true")
})
