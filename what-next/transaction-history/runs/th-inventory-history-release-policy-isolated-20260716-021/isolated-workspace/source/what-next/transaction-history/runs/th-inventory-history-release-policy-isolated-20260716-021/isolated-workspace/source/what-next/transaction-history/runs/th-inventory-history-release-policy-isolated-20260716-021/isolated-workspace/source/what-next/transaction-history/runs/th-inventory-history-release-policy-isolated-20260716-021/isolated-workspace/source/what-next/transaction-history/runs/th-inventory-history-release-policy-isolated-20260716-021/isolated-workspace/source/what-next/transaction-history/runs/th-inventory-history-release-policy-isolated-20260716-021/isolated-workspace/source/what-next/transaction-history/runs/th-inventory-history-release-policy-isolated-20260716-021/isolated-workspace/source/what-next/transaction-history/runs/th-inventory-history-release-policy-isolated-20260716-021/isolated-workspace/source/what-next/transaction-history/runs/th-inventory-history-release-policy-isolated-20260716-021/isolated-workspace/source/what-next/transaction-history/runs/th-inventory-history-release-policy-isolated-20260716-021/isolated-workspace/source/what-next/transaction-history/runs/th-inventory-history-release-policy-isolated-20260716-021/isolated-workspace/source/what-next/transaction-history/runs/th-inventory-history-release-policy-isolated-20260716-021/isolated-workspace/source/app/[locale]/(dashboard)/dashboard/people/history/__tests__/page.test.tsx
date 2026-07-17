import { render, screen } from "@testing-library/react"

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { getHrisMovementHistory } from "@/services/hris/movement-history.service"

import PeopleHistoryPage from "../page"

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }
  return { RbacError: MockRbacError, requireAnyPermission: jest.fn() }
})

jest.mock("@/services/hris/movement-history.service", () => ({
  getHrisMovementHistory: jest.fn(),
}))

jest.mock("@/components/hris/HrisMovementHistory", () => ({
  HrisMovementHistoryView: ({ history }: { history: { items: unknown[] } }) => (
    <div>History items: {history.items.length}</div>
  ),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({
    title,
    message,
    primaryHref,
  }: {
    title: string
    message: string
    primaryHref: string
  }) => (
    <main>
      <h1>{title}</h1>
      <p>{message}</p>
      <a href={primaryHref}>Back</a>
    </main>
  ),
}))

jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  )
  MockLink.displayName = "MockLink"
  return MockLink
})

jest.mock("lucide-react", () => {
  const React = require("react")
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props })
    Icon.displayName = name
    return Icon
  }
  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockGetHistory = getHrisMovementHistory as jest.Mock

function params(locale = "en") {
  return Promise.resolve({ locale })
}

describe("PeopleHistoryPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "manager-1",
      permissions: ["hris.people.read"],
    })
    mockGetHistory.mockResolvedValue({
      organizationId: "org-1",
      asOf: "2026-07-15T00:00:00.000Z",
      items: [{ id: "event-1:emp-1" }],
      accessScope: {
        authority: { label: "Managed-location responsibility" },
      },
    })
  })

  it("loads tenant and actor scope behind HRIS read permission", async () => {
    render(await PeopleHistoryPage({ params: params() }))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["hris.people.read"], {
      resource: "HrisMovementHistory",
    })
    expect(mockGetHistory).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      limit: 100,
    })
    expect(screen.getByRole("heading", { name: "Movement history" })).toBeInTheDocument()
    expect(screen.getByText("History items: 1")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "People" })).toHaveAttribute(
      "href",
      "/en/dashboard/people",
    )
  })

  it("returns a safe denied state before history is queried", async () => {
    mockRequireAnyPermission.mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    )

    render(await PeopleHistoryPage({ params: params("fr") }))

    expect(screen.getByRole("heading", {
      name: "People history is not available for this role",
    })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/fr/dashboard/people",
    )
    expect(mockGetHistory).not.toHaveBeenCalled()
  })
})
