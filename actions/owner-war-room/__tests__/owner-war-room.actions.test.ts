import { protect } from "@/services/_shared/protect"
import { getOwnerWarRoomData } from "@/services/owner-war-room/owner-war-room.service"

jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((_options, handler) => async (input: unknown) => ({
    success: true,
    data: await handler(input, {
      orgId: "org-session",
      userId: "user-session",
      permissions: ["DASHBOARD_READ", "payments.reconciliation.read"],
    }),
    error: null,
    status: 200,
  })),
}))

jest.mock("@/services/owner-war-room/owner-war-room.service", () => ({
  getOwnerWarRoomData: jest.fn(),
}))

import { getOwnerWarRoomAction } from "../owner-war-room.actions"

const mockProtect = protect as jest.Mock
const mockGetOwnerWarRoomData = getOwnerWarRoomData as jest.Mock

describe("owner war room action", () => {
  beforeEach(() => {
    mockGetOwnerWarRoomData.mockReset()
    mockGetOwnerWarRoomData.mockResolvedValue({ organizationId: "org-session", cards: [] })
  })

  it("registers the action with the dashboard read guard and audit resource", () => {
    expect(mockProtect).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: "dashboard.read",
        auditResource: "KontavaOwnerWarRoom",
        auditAllowed: true,
      }),
      expect.any(Function),
    )
  })

  it("loads the command center with RBAC tenant and actor context", async () => {
    const result = await getOwnerWarRoomAction({ maxAgeMinutes: 60 })

    expect(mockGetOwnerWarRoomData).toHaveBeenCalledWith({
      organizationId: "org-session",
      actorId: "user-session",
      actorPermissions: ["DASHBOARD_READ", "payments.reconciliation.read"],
      periodStart: null,
      periodEnd: null,
      maxAgeMinutes: 60,
    })
    expect(result).toMatchObject({
      success: true,
      data: { organizationId: "org-session" },
    })
  })
})
