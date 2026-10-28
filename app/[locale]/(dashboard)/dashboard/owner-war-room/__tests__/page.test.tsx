import { render, screen } from "@testing-library/react"

jest.mock("@/components/dashboard/DashboardRouteState", () => ({
  DashboardRouteState: ({ kind }: { kind: string }) => <div>{`route:${kind}`}</div>,
}))

jest.mock("@/components/owner-war-room/OwnerWarRoomDashboard", () => ({
  OwnerWarRoomDashboard: ({
    data,
    locale,
  }: {
    data: { organizationId: string }
    locale: string
  }) => <div>{`${data.organizationId}:${locale}`}</div>,
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
  requirePermission: jest.fn(),
}))

jest.mock("@/services/owner-war-room/owner-war-room.service", () => ({
  getOwnerWarRoomData: jest.fn(),
}))

import { RbacError, requirePermission } from "@/lib/security/rbac"
import { getOwnerWarRoomData } from "@/services/owner-war-room/owner-war-room.service"
import OwnerWarRoomPage from "../page"

const mockRequirePermission = requirePermission as jest.Mock
const mockGetOwnerWarRoomData = getOwnerWarRoomData as jest.Mock

describe("OwnerWarRoomPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      orgId: "org-session",
      userId: "user-session",
      permissions: ["dashboard.read", "inventory.levels.read"],
      roles: [{ code: "administrator" }],
      isSuperUser: false,
    })
    mockGetOwnerWarRoomData.mockResolvedValue({ organizationId: "org-session" })
  })

  it("passes server-owned role and superuser evidence to the service", async () => {
    render(await OwnerWarRoomPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(mockRequirePermission).toHaveBeenCalledWith("dashboard.read", {
      resource: "KontavaOwnerWarRoom",
      auditAllowed: true,
    })
    expect(mockGetOwnerWarRoomData).toHaveBeenCalledWith({
      organizationId: "org-session",
      actorId: "user-session",
      actorPermissions: ["dashboard.read", "inventory.levels.read"],
      actorRoleCodes: ["administrator"],
      isSuperUser: false,
    })
    expect(screen.getByText("org-session:en")).toBeInTheDocument()
  })

  it("renders permission denied when tenant-wide authority is rejected", async () => {
    mockGetOwnerWarRoomData.mockRejectedValue(
      new RbacError(
        "Forbidden: Owner War Room requires tenant-wide operating authority",
        "FORBIDDEN",
        403,
      ),
    )

    render(await OwnerWarRoomPage({ params: Promise.resolve({ locale: "en" }) }))

    expect(screen.getByText("route:permission_denied")).toBeInTheDocument()
    expect(screen.queryByText("org-session:en")).not.toBeInTheDocument()
  })
})
