jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}))

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/pos/pos.service", () => ({
  closePOSShift: jest.fn(),
  getActivePOSSession: jest.fn(),
  openPOSShift: jest.fn(),
}))

import { revalidateTag } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { closePOSShift } from "@/services/pos/pos.service"
import { closePOSShiftAction } from "../session.actions"

const mockRevalidateTag = revalidateTag as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockClosePOSShift = closePOSShift as jest.Mock

const context = {
  orgId: "org-1",
  userId: "cashier-1",
  permissions: ["pos.session.end"],
}

const closeResult = {
  sessionId: "session-1",
  terminalId: "terminal-1",
  locationId: "location-1",
  cashDrawerId: "drawer-1",
  closingTransactionId: "closing-transaction-1",
  eventId: "event-1",
  evidenceHash: "a".repeat(64),
  variance: 0,
  varianceDirection: "BALANCED",
  closedAt: "2026-07-19T17:00:00.000Z",
  replayed: false,
}

describe("closePOSShiftAction", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(context)
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockClosePOSShift.mockResolvedValue(closeResult)
  })

  it("uses audited RBAC, observe-mode module evidence, and trusted tenant and actor scope", async () => {
    const response = await closePOSShiftAction({
      sessionId: "session-1",
      actualBalance: 0,
    })

    expect(response).toEqual({ success: true, data: closeResult, error: null })
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.session.end", {
      resource: "POSSession",
      resourceId: "session-1",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "cashier-1",
      actorPermissions: ["pos.session.end"],
      moduleSlug: "pos",
      surfaceType: "action",
      surface: "actions/pos/session.actions.ts:closePOSShiftAction",
      accessIntent: "write",
      mode: "observe",
      audit: true,
    })
    expect(mockClosePOSShift).toHaveBeenCalledWith({
      sessionId: "session-1",
      actualBalance: "0",
      organizationId: "org-1",
      userId: "cashier-1",
    })
    expect(mockRevalidateTag).toHaveBeenNthCalledWith(1, "pos-sessions")
    expect(mockRevalidateTag).toHaveBeenNthCalledWith(2, "pos-terminal-terminal-1")
    expect(mockRequirePermission.mock.invocationCallOrder[0]).toBeLessThan(
      mockObserveModuleAccess.mock.invocationCallOrder[0],
    )
    expect(mockObserveModuleAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockClosePOSShift.mock.invocationCallOrder[0],
    )
  })

  it("stops before the service when module observation cannot be recorded", async () => {
    mockObserveModuleAccess.mockRejectedValueOnce(new Error("module observation unavailable"))

    const response = await closePOSShiftAction({ sessionId: "session-1", actualBalance: "100.00" })

    expect(response.success).toBe(false)
    expect(mockClosePOSShift).not.toHaveBeenCalled()
    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })

  it("rejects a blank closing count before authorization or service access", async () => {
    const response = await closePOSShiftAction({ sessionId: "session-1", actualBalance: " " })

    expect(response.success).toBe(false)
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockClosePOSShift).not.toHaveBeenCalled()
  })
})
