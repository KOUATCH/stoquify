import { render, screen } from "@testing-library/react"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import { RbacError, requirePermission } from "@/lib/security/rbac"

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

jest.mock("@/services/manager-action-center/manager-action-center.service", () => ({
  getManagerActionCenterData: jest.fn(),
}))

jest.mock("@/components/manager-action-center/ManagerActionCenterDashboard", () => ({
  ManagerActionCenterDashboard: () => <div>Manager action center rendered</div>,
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

const mockRequirePermission = requirePermission as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe("ManagerActionCenterPage", () => {
  it("uses the shared dashboard error page when no active organization is available", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Active organization required", "NO_ACTIVE_ORG", 403))

    const ui = await ManagerActionCenterPage({ params: Promise.resolve({ locale: "en" }) })
    render(ui)

    expect(DashboardErrorState).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Active organization required",
        title: "Manager Action Center needs an active organization",
        dashboardHref: "/en/dashboard",
      }),
      undefined,
    )
    expect(screen.getByRole("heading", { name: "Manager Action Center needs an active organization" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
    expect(screen.queryByText("Manager action center rendered")).not.toBeInTheDocument()
  })
})