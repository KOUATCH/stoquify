import { render, screen } from "@testing-library/react"

jest.mock("@/components/cash-command/CashCommandDashboard", () => ({
  CashCommandDashboard: ({
    data,
    locale,
  }: {
    data: { organizationId: string }
    locale: string
  }) => <div>{`${data.organizationId}:${locale}`}</div>,
}))

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({ kind }: { kind: string }) => <div>{`route:${kind}`}</div>,
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string) => href,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class RbacError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly status: number,
    ) {
      super(message)
      this.name = "RbacError"
    }
  },
  requireAnyPermission: jest.fn(),
}))

jest.mock("@/services/cash-command/cash-command.service", () => ({
  getCashCommandData: jest.fn(),
}))

import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { getCashCommandData } from "@/services/cash-command/cash-command.service"
import CashCommandPage from "../page"

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockGetCashCommandData = getCashCommandData as jest.Mock

describe("CashCommandPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-session",
      userId: "user-session",
      permissions: ["finance.read", "dashboard.read"],
      roles: [{ code: "administrator" }],
      isSuperUser: false,
    })
    mockGetCashCommandData.mockResolvedValue({ organizationId: "org-session" })
  })

  it("passes tenant context to the service and renders dashboard content", async () => {
    render(await CashCommandPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockRequireAnyPermission).toHaveBeenCalledWith(["finance.read", "dashboard.read"], {
      resource: "KontavaCashCommand",
    })
    expect(mockGetCashCommandData).toHaveBeenCalledWith({
      organizationId: "org-session",
      actorId: "user-session",
      actorPermissions: ["finance.read", "dashboard.read"],
      actorRoleCodes: ["administrator"],
      isSuperUser: false,
    })
    expect(screen.getByText("org-session:en")).toBeInTheDocument()
  })

  it("renders permission denied when tenant-wide authority is rejected", async () => {
    mockRequireAnyPermission.mockRejectedValue(
      new RbacError("Forbidden: Cash Command requires tenant-wide operating authority", "FORBIDDEN", 403),
    )

    render(await CashCommandPage({ params: Promise.resolve({ locale: "en" }) }) )

    expect(screen.getByText("route:permission_denied")).toBeInTheDocument()
    expect(mockGetCashCommandData).not.toHaveBeenCalled()
  })
})
