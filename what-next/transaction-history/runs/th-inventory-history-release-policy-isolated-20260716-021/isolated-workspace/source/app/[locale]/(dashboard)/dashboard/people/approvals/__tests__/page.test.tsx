import { render, screen } from "@testing-library/react"

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { getHrisApprovalInbox } from "@/services/hris/approval-inbox.service"

import PeopleApprovalsPage from "../page"

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

jest.mock("@/services/hris/approval-inbox.service", () => ({
  getHrisApprovalInbox: jest.fn(),
}))

jest.mock("@/components/hris/HrisApprovalInbox", () => ({
  HrisApprovalInboxView: ({ inbox }: { inbox: { items: unknown[] } }) => (
    <div>Queue items: {inbox.items.length}</div>
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
const mockGetInbox = getHrisApprovalInbox as jest.Mock

function params(locale = "en") {
  return Promise.resolve({ locale })
}

describe("PeopleApprovalsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "manager-1",
      permissions: ["hris.people.read"],
    })
    mockGetInbox.mockResolvedValue({
      organizationId: "org-1",
      asOf: "2026-07-15T00:00:00.000Z",
      items: [{ id: "LIFECYCLE:request-1" }],
      accessScope: {
        authority: { label: "Managed-location responsibility" },
      },
    })
  })

  it("loads the scoped inbox behind HRIS read permission", async () => {
    render(await PeopleApprovalsPage({ params: params() }))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["hris.people.read"], {
      resource: "HrisApprovalInbox",
    })
    expect(mockGetInbox).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      limit: 100,
    })
    expect(screen.getByRole("heading", { name: "Approval inbox" })).toBeInTheDocument()
    expect(screen.getByText("Queue items: 1")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "People" })).toHaveAttribute(
      "href",
      "/en/dashboard/people",
    )
  })

  it("returns a safe denied state before inbox data is loaded", async () => {
    mockRequireAnyPermission.mockRejectedValue(
      new RbacError("Forbidden", "FORBIDDEN", 403),
    )

    render(await PeopleApprovalsPage({ params: params("fr") }))

    expect(screen.getByRole("heading", {
      name: "Approval inbox is not available for this role",
    })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/fr/dashboard/people",
    )
    expect(mockGetInbox).not.toHaveBeenCalled()
  })
})
