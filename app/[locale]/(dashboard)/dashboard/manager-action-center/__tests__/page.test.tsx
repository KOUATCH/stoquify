import { render, screen } from "@testing-library/react"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { getManagerActionCenterQuery } from "@/services/manager-action-center/manager-action-center-query.service"

import ManagerActionCenterPage from "../page"

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
    requirePermission: jest.fn(),
  }
})

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
}))

jest.mock("@/services/manager-action-center/manager-action-center-query.service", () => ({
  getManagerActionCenterQuery: jest.fn(),
}))

jest.mock("@/components/manager-action-center/ManagerActionCenterDashboard", () => ({
  ManagerActionCenterDashboard: () => <div>Manager action center rendered</div>,
}))

jest.mock("@/components/manager-action-center/ManagerLocationActionCenterDashboard", () => ({
  ManagerLocationActionCenterDashboard: () => <div>Location action center rendered</div>,
}))

jest.mock("@/components/dashboard/DashboardErrorState", () => ({
  DashboardErrorState: jest.fn(({ title, message, dashboardHref }) => (
    <main>
      <h1>{title}</h1>
      <p>{message}</p>
      <a href={dashboardHref}>Open command center</a>
      <button type="button">Try again</button>
    </main>
  )),
}))

const mockGetManagerActionCenterQuery = getManagerActionCenterQuery as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock

const context = {
  orgId: "org-1",
  userId: "user-1",
  roles: [
    {
      id: "role-admin",
      name: "Administrator",
      code: "admin",
      permissions: ["dashboard.read"],
    },
  ],
  permissions: ["dashboard.read"],
  isSuperUser: false,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetManagerActionCenterQuery.mockResolvedValue({
    kind: "TENANT",
    organizationId: "org-1",
    actorId: "user-1",
    data: {},
  })
})

describe("ManagerActionCenterPage", () => {
  it("uses the shared dashboard error page when no active organization is available", async () => {
    mockRequirePermission.mockRejectedValue(
      new RbacError("Active organization required", "NO_ACTIVE_ORG", 403),
    )

    const ui = await ManagerActionCenterPage({
      params: Promise.resolve({ locale: "en" }),
    })
    render(ui)

    expect(DashboardErrorState).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Active organization required",
        title: "Manager Action Center needs an active organization",
        dashboardHref: "/en/dashboard",
      }),
      undefined,
    )
    expect(
      screen.getByRole("heading", {
        name: "Manager Action Center needs an active organization",
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
    expect(screen.queryByText("Manager action center rendered")).not.toBeInTheDocument()
    expect(screen.queryByText("Location action center rendered")).not.toBeInTheDocument()
    expect(mockGetManagerActionCenterQuery).not.toHaveBeenCalled()
  })

  it("passes trusted RBAC context once and preserves the tenant dashboard branch", async () => {
    mockRequirePermission.mockResolvedValue(context)

    const ui = await ManagerActionCenterPage({
      params: Promise.resolve({ locale: "en" }),
    })
    render(ui)

    expect(mockGetManagerActionCenterQuery).toHaveBeenCalledWith({
      accessContext: context,
    })
    expect(mockGetManagerActionCenterQuery).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Manager action center rendered")).toBeInTheDocument()
    expect(screen.queryByText("Location action center rendered")).not.toBeInTheDocument()
  })

  it("renders the dedicated location dashboard for managed-location access", async () => {
    mockRequirePermission.mockResolvedValue(context)
    mockGetManagerActionCenterQuery.mockResolvedValue({
      kind: "LOCATIONS",
      organizationId: "org-1",
      actorId: "user-1",
      data: {
        organizationId: "org-1",
        actorId: "user-1",
        generatedAt: "2026-06-20T10:00:00.000Z",
        periodStart: "2026-06-01T00:00:00.000Z",
        periodEnd: "2026-06-20T23:59:59.999Z",
        authority: { kind: "LOCATION_RESPONSIBILITY", basis: "Location.managerId" },
        scope: { kind: "LOCATIONS", locationIds: ["location-1"] },
        bundles: [],
      },
    })

    const ui = await ManagerActionCenterPage({
      params: Promise.resolve({ locale: "fr" }),
    })
    render(ui)

    expect(mockGetManagerActionCenterQuery).toHaveBeenCalledWith({ accessContext: context })
    expect(mockGetManagerActionCenterQuery).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Location action center rendered")).toBeInTheDocument()
    expect(screen.queryByText("Manager action center rendered")).not.toBeInTheDocument()
  })

  it("renders an explicit unavailable state for a fail-closed operating scope", async () => {
    mockRequirePermission.mockResolvedValue(context)
    mockGetManagerActionCenterQuery.mockRejectedValue(
      new ForbiddenError("Manager Action Center operating scope evidence is inconsistent."),
    )

    const ui = await ManagerActionCenterPage({
      params: Promise.resolve({ locale: "en" }),
    })
    render(ui)

    expect(DashboardErrorState).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Manager Action Center operating scope evidence is inconsistent.",
        title: "Manager Action Center is unavailable for this operating scope",
        dashboardHref: "/en/dashboard",
      }),
      undefined,
    )
    expect(
      screen.getByRole("heading", {
        name: "Manager Action Center is unavailable for this operating scope",
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Manager action center rendered")).not.toBeInTheDocument()
    expect(screen.queryByText("Location action center rendered")).not.toBeInTheDocument()
  })
})
