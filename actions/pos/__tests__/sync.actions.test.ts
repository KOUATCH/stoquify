jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((_options, handler) => {
    return async (input: unknown) => {
      if (
        input &&
        typeof input === "object" &&
        "__deny" in input
      ) {
        return { success: false, data: null, error: "Forbidden", status: 403 }
      }

      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["pos.use", "pos.transactions.read", "pos.session.start"],
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/pos/offline-sync.service", () => ({
  getOfflineSyncDashboard: jest.fn(),
  ingestOfflineSyncBatch: jest.fn(),
  registerOfflineDevice: jest.fn(),
  replayPendingOfflineSaleEnvelope: jest.fn(),
}))

import {
  getOfflineSyncDashboard,
  ingestOfflineSyncBatch,
  registerOfflineDevice,
  replayPendingOfflineSaleEnvelope,
} from "@/services/pos/offline-sync.service"
import { protect } from "@/services/_shared/protect"
import {
  getOfflineSyncDashboardAction,
  registerOfflineDeviceAction,
  replayOfflineSaleEnvelopeAction,
  syncOfflineEventsAction,
} from "../sync.actions"

const mockGetDashboard = getOfflineSyncDashboard as jest.Mock
const mockRegisterDevice = registerOfflineDevice as jest.Mock
const mockIngestBatch = ingestOfflineSyncBatch as jest.Mock
const mockReplaySale = replayPendingOfflineSaleEnvelope as jest.Mock
const mockProtect = protect as jest.Mock

describe("POS offline sync actions", () => {
  beforeEach(() => {
    mockGetDashboard.mockClear()
    mockRegisterDevice.mockClear()
    mockIngestBatch.mockClear()
    mockReplaySale.mockClear()
    mockGetDashboard.mockResolvedValue({ asOf: "2026-06-15T00:00:00.000Z", summary: {} })
    mockRegisterDevice.mockResolvedValue({ id: "device-1" })
    mockIngestBatch.mockResolvedValue({ batchId: "batch-1", acceptedCount: 1, conflictCount: 0 })
    mockReplaySale.mockResolvedValue({ offlineEventId: "event-1", status: "REPLAYED" })
  })

  it("derives dashboard tenant scope from RBAC context", async () => {
    const result = await getOfflineSyncDashboardAction({
      organizationId: "attacker-org",
      locationId: "loc-1",
    })

    expect(result.success).toBe(true)
    expect(mockGetDashboard).toHaveBeenCalledWith({
      organizationId: "org-session",
      locationId: "loc-1",
    })
  })

  it("derives device enrollment actor and tenant from RBAC context", async () => {
    await registerOfflineDeviceAction({
      organizationId: "attacker-org",
      userId: "attacker-user",
      terminalId: "terminal-1",
      locationId: "loc-1",
      deviceLabel: "Register tablet",
      deviceFingerprintHash: "fingerprint-hash-value-123456",
    })

    expect(mockRegisterDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        userId: "user-session",
        terminalId: "terminal-1",
      }),
    )
  })

  it("derives sync actor and tenant from RBAC context", async () => {
    await syncOfflineEventsAction({
      organizationId: "attacker-org",
      userId: "attacker-user",
      deviceId: "device-1",
      terminalId: "terminal-1",
      locationId: "loc-1",
      events: [],
    })

    expect(mockIngestBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        userId: "user-session",
        deviceId: "device-1",
      }),
    )
  })

  it("derives replay actor and tenant from RBAC context", async () => {
    await replayOfflineSaleEnvelopeAction({
      organizationId: "attacker-org",
      userId: "attacker-user",
      offlineEventId: "event-1",
    })

    expect(mockReplaySale).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        userId: "user-session",
        offlineEventId: "event-1",
      }),
    )
  })

  it("wires the expected RBAC permissions into protected sync actions", () => {
    expect(mockProtect).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "pos.transactions.read" }),
      expect.any(Function),
    )
    expect(mockProtect).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "pos.session.start" }),
      expect.any(Function),
    )
    expect(mockProtect).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "pos.use" }),
      expect.any(Function),
    )
  })

  it("returns a safe forbidden result when RBAC denies sync access", async () => {
    const result = await syncOfflineEventsAction({ __deny: true })

    expect(result).toEqual({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
    })
    expect(mockIngestBatch).not.toHaveBeenCalled()
  })
})
