import { render, screen } from "@testing-library/react"

import DashboardLayout from "../layout"
import { getSession } from "@/lib/auth-server"
import { RbacError, requireRbacContext } from "@/lib/security/rbac"
import { redirect } from "next/navigation"

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/components/dashboard/Sidebar", () => ({
  __esModule: true,
  default: jest.fn(({ session }) => <aside data-testid="sidebar">{session.user.organizationId}</aside>),
}))

jest.mock("@/components/dashboard/Navbar", () => ({
  __esModule: true,
  default: jest.fn(({ session }) => <header data-testid="navbar">{session.user.organizationName}</header>),
}))

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "EMAIL_NOT_VERIFIED" | "ACCOUNT_LOCKED" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    requireRbacContext: jest.fn(),
  }
})

jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
}))

const mockGetSession = getSession as jest.Mock
const mockRequireRbacContext = requireRbacContext as jest.Mock
const mockRedirect = redirect as unknown as jest.Mock

function session() {
  return {
    user: {
      id: "user-1",
      name: "Raw Session User",
      email: "raw@example.test",
      organizationId: "raw-org",
      permissions: ["*"],
    },
  }
}

function rbacContext() {
  return {
    user: {
      id: "user-1",
      name: "RBAC User",
      email: "rbac@example.test",
      firstName: "RBAC",
      lastName: "User",
      phone: "",
      roles: [{ id: "role-1", name: "Operator", code: "operator", permissions: ["dashboard.read"] }],
      permissions: ["dashboard.read"],
      organizationId: "org-1",
      organizationName: "RBAC Org",
    },
    userId: "user-1",
    orgId: "org-1",
    organizationName: "RBAC Org",
    roles: [{ id: "role-1", name: "Operator", code: "operator", permissions: ["dashboard.read"] }],
    permissions: ["dashboard.read"],
    isSuperUser: false,
    source: "better-auth",
    fetchedAt: 1,
  }
}

describe("dashboard layout RBAC shell", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("redirects unauthenticated requests to the localized login page", async () => {
    mockGetSession.mockResolvedValue(null)

    await expect(
      DashboardLayout({ children: <div>child</div>, params: Promise.resolve({ locale: "fr" }) }),
    ).rejects.toThrow("REDIRECT:/fr/login")

    expect(mockRequireRbacContext).not.toHaveBeenCalled()
  })

  it("fails closed when a raw session exists but RBAC context is unavailable", async () => {
    mockGetSession.mockResolvedValue(session())
    mockRequireRbacContext.mockRejectedValue(new RbacError("No active organization", "NO_ACTIVE_ORG", 403))

    await expect(
      DashboardLayout({ children: <div>protected child</div>, params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow("REDIRECT:/en/unauthorized")

    expect(mockRedirect).toHaveBeenCalledWith("/en/unauthorized")
    expect(screen.queryByText("protected child")).not.toBeInTheDocument()
  })

  it("renders the shell from RBAC context instead of raw BetterAuth claims", async () => {
    mockGetSession.mockResolvedValue(session())
    mockRequireRbacContext.mockResolvedValue(rbacContext())

    render(await DashboardLayout({ children: <div>protected child</div>, params: Promise.resolve({ locale: "en" }) }))

    expect(screen.getByTestId("sidebar")).toHaveTextContent("org-1")
    expect(screen.getByTestId("navbar")).toHaveTextContent("RBAC Org")
    expect(screen.getByText("protected child")).toBeInTheDocument()
    expect(screen.queryByText("raw-org")).not.toBeInTheDocument()
  })
})