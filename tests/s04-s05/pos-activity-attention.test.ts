import { getPOSActivityAttentionAction } from "@/actions/pos/pos-activity-attention.actions"
import { requirePOSActivity } from "@/actions/pos/pos-activity-access"
import { getOfflineSyncDashboardAction } from "@/actions/pos/sync.actions"
import { canUsePermission } from "@/lib/security/rbac"
import { db } from "@/prisma/db"
import { readPOSActivityAttention } from "@/services/pos/pos-activity-attention.service"

jest.mock("@/actions/pos/pos-activity-access", () => ({
  requirePOSActivity: jest.fn(),
  isPOSActivityManager: (ctx: { permissions: string[] }) => ctx.permissions.includes("finance.read"),
  activityFailure: (error: { status?: number }) => ({ success: false, status: error.status ?? 500 }),
}))
jest.mock("@/lib/security/rbac", () => ({ canUsePermission: jest.fn() }))
jest.mock("@/prisma/db", () => ({ db: { pOSStation: { findFirst: jest.fn() } } }))
jest.mock("@/actions/pos/sync.actions", () => ({ getOfflineSyncDashboardAction: jest.fn() }))
jest.mock("@/services/pos/pos-activity-attention.service", () => ({ readPOSActivityAttention: jest.fn() }))

const requireActivity = requirePOSActivity as jest.Mock
const hasPermission = canUsePermission as jest.Mock
const findRegister = db.pOSStation.findFirst as jest.Mock
const loadAttention = readPOSActivityAttention as jest.Mock
const loadOffline = getOfflineSyncDashboardAction as jest.Mock
const input = { date: "2026-10-25", locationId: "location", terminalId: "register", sessionId: "shift" }

beforeEach(() => {
  jest.resetAllMocks()
  requireActivity.mockResolvedValue({ orgId: "organization", userId: "actor", permissions: ["finance.read"] })
  hasPermission.mockImplementation((_ctx, permission) => permission === "pos.transactions.read")
  findRegister.mockResolvedValue({ id: "register", locationId: "location" })
  loadAttention.mockResolvedValue({ rows: [], nextCursor: null })
})

it("denies callers outside the existing activity manager scope before touching either read", async () => {
  requireActivity.mockResolvedValue({ orgId: "organization", userId: "actor", permissions: [] })
  await expect(getPOSActivityAttentionAction(input)).resolves.toMatchObject({ success: false, status: 403 })
  expect(loadAttention).not.toHaveBeenCalled()
  expect(loadOffline).not.toHaveBeenCalled()
})

it("returns historical exceptions without attempting unauthorized offline access", async () => {
  hasPermission.mockReturnValue(false)
  await expect(getPOSActivityAttentionAction(input)).resolves.toMatchObject({ success: true, data: { offline: null } })
  expect(loadAttention).toHaveBeenCalledWith({ organizationId: "organization", userId: "actor" }, input)
  expect(findRegister).not.toHaveBeenCalled()
  expect(loadOffline).not.toHaveBeenCalled()
})

it("queries eligible offline evidence by current organization register, independently of shift and date", async () => {
  loadOffline.mockResolvedValue({
    success: true,
    data: {
      asOf: "2026-11-18T07:00:00Z",
      summary: { openConflictCount: 1, closeBlockerCount: 2 },
      conflicts: [],
      devices: [{ publicKey: "not surfaced in attention" }],
    },
  })
  const result = await getPOSActivityAttentionAction(input)
  expect(result).toMatchObject({ success: true, data: { offline: {
    state: "ready", conflictCount: 1, closeBlockerCount: 2,
    access: { organizationId: "organization", userId: "actor", canRead: true, canReview: false },
  } } })
  expect(findRegister).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
    id: "register", organizationId: "organization", locationId: "location", location: { organizationId: "organization" },
  }) }))
  expect(loadOffline).toHaveBeenCalledWith({ locationId: "location", terminalId: "register", limit: 10 })
  expect(JSON.stringify(result)).not.toContain("publicKey")
})
