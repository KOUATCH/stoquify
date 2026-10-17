import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import DashboardPage from "@/app/[locale]/(dashboard)/dashboard/page"
import { getAllDashboardData } from "@/actions/dashboard/getDashboardData"
import { RbacError, requireRbacContext } from "@/lib/security/rbac"

jest.mock("@/actions/dashboard/getDashboardData", () => ({ getAllDashboardData: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({
  RbacError: class extends Error {
    constructor(message: string, public code: string, public status: number) { super(message) }
  },
  requireRbacContext: jest.fn(),
}))
jest.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) } }))
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("lucide-react", () => ({
  AlertTriangle: () => null, Building2: () => null, Clock3: () => null,
  LockKeyhole: () => null, PackageX: () => null, SearchX: () => null,
}))
jest.mock("@/components/dashboard/EnhancedEnterpriseDashboard", () => ({
  __esModule: true,
  default: ({ organizationId, locale }: { organizationId: string; locale: string }) => <div data-testid="dashboard">{organizationId}:{locale}</div>,
}))
jest.mock("@/components/dashboard/SessionRecoverySignOutButton", () => ({
  SessionRecoverySignOutButton: ({ label }: { label: string }) => <button>{label}</button>,
}))
jest.mock("@/components/dashboard/DashboardErrorState", () => ({
  DashboardErrorState: ({ title, message, locale, actions }: any) => <section data-testid="session-recovery" lang={locale}><h1>{title}</h1><p>{message}</p>{actions}</section>,
}))
jest.mock("@/config/error-boundary", () => ({ ErrorBoundary: ({ children }: any) => children }))

const context = jest.mocked(requireRbacContext)
const data = jest.mocked(getAllDashboardData)
const page = (locale: string) => DashboardPage({ params: Promise.resolve({ locale }) })
const rejectAt = (stage: "context" | "data", error: Error) => (stage === "context" ? context : data).mockRejectedValueOnce(error)

beforeEach(() => {
  jest.resetAllMocks()
  context.mockResolvedValue({ user: { organizationId: "org-current" } } as any)
  data.mockResolvedValue({ organization: { id: "org-current" } } as any)
})

describe.each(["en", "fr"])("dashboard access in %s", locale => {
  it.each(["context", "data"] as const)("shows permission denial from %s without claiming deleted organization", async stage => {
    rejectAt(stage, new RbacError("Forbidden: missing permission dashboard.read", "FORBIDDEN", 403))
    render(await page(locale))
    expect(screen.getByRole("heading", { name: locale === "fr" ? "Accès au tableau de bord limité" : "Dashboard access is limited" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: locale === "fr" ? "Examiner mes accès" : "Review my access" })).toHaveAttribute("href", `/${locale}/dashboard/access-requests`)
    expect(screen.queryByTestId("session-recovery")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /sign out|déconnecter/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId("dashboard")).not.toBeInTheDocument()
    if (stage === "context") expect(data).not.toHaveBeenCalled()
  })

  it.each(["context", "data"] as const)("retains stale-session recovery from %s", async stage => {
    rejectAt(stage, new RbacError("Session organization is stale", "FORBIDDEN", 403))
    render(await page(locale))
    expect(screen.getByTestId("session-recovery")).toHaveAttribute("lang", locale)
    expect(screen.getByRole("button", { name: locale === "fr" ? "Se déconnecter" : "Sign out" })).toBeInTheDocument()
    expect(screen.queryByTestId("dashboard")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Review my access|Examiner mes accès/ })).not.toBeInTheDocument()
  })

  it("keeps inactive-organization recovery accurate", async () => {
    context.mockRejectedValueOnce(new RbacError("Active organization required", "NO_ACTIVE_ORG", 403))
    render(await page(locale))
    expect(screen.getByTestId("session-recovery")).not.toHaveTextContent(/no longer exists|n'existe plus/)
    expect(data).not.toHaveBeenCalled()
  })

  it.each(["context", "data"] as const)("redirects expired authentication from %s to localized login", async stage => {
    rejectAt(stage, new RbacError("Authentication required", "UNAUTHENTICATED", 401))
    await expect(page(locale)).rejects.toThrow(`REDIRECT:/${locale}/login`)
  })

  it("passes unexpected failures to the error boundary", async () => {
    const failure = new Error("Service unavailable")
    data.mockRejectedValueOnce(failure)
    await expect(page(locale)).rejects.toBe(failure)
  })

  it("renders authorized data using the current organization", async () => {
    render(await page(locale))
    expect(data).toHaveBeenCalledWith("org-current")
    expect(screen.getByTestId("dashboard")).toHaveTextContent(`org-current:${locale}`)
  })
})

it("retains recovery for a missing organization returned by the service", async () => {
  data.mockRejectedValueOnce(new Error("Organization not found"))
  render(await page("en"))
  expect(screen.getByTestId("session-recovery")).toBeInTheDocument()
})

it("does not fetch business data without an organization", async () => {
  context.mockResolvedValueOnce({ user: { organizationId: null } } as any)
  render(await page("en"))
  expect(screen.getByTestId("session-recovery")).toBeInTheDocument()
  expect(data).not.toHaveBeenCalled()
})
