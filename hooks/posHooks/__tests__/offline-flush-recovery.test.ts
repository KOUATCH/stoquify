import { renderHook } from "@testing-library/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { syncOfflineEventsAction } from "@/actions/pos/sync.actions"
import { useNotifications } from "@/components/notifications/NotificationProvider"
import { claimOfflineLocalQueueBatch, settleOfflineLocalQueueBatch } from "@/lib/pos/offline-local-queue"
import { useFlushOfflinePOSQueue } from "../useOfflineSync"

jest.mock("@tanstack/react-query", () => ({ useMutation: jest.fn(), useQueryClient: jest.fn() }))
jest.mock("@/actions/pos/sync.actions", () => ({ syncOfflineEventsAction: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: jest.fn() }))
jest.mock("@/lib/pos/offline-local-queue", () => ({ claimOfflineLocalQueueBatch: jest.fn(), settleOfflineLocalQueueBatch: jest.fn() }))

const config = { organizationKey: "org", deviceId: "device", terminalId: "terminal", locationId: "location" }
const claim = { skipped: false, attemptId: "attempt", queueIds: ["original-id"], envelope: { events: [{ idempotencyKey: "original-id" }] } }
const notifications = { info: jest.fn(), warning: jest.fn(), error: jest.fn(), success: jest.fn() }
const acknowledged = { batchId: "server-batch", device: { id: "device" }, acceptedCount: 0, duplicateCount: 1, conflictCount: 0 }
function mutation() { return (useMutation as jest.Mock).mock.calls.at(-1)![0] }

describe("offline flush recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries: jest.fn() })
    ;(useNotifications as jest.Mock).mockReturnValue(notifications)
    ;(claimOfflineLocalQueueBatch as jest.Mock).mockResolvedValue(claim)
    ;(settleOfflineLocalQueueBatch as jest.Mock).mockResolvedValue({})
    ;(syncOfflineEventsAction as jest.Mock).mockResolvedValue({ success: true, data: acknowledged })
  })

  it("awaits a durable claim before transport, then accepts same-identity duplicate acknowledgement", async () => {
    let resolveClaim!: (value: unknown) => void
    ;(claimOfflineLocalQueueBatch as jest.Mock).mockReturnValue(new Promise(resolve => { resolveClaim = resolve }))
    renderHook(() => useFlushOfflinePOSQueue(config))
    const flush = mutation().mutationFn()
    expect(syncOfflineEventsAction).not.toHaveBeenCalled()
    resolveClaim(claim)
    await expect(flush).resolves.toMatchObject({ syncedQueueIds: ["original-id"], duplicateCount: 1 })
    expect(syncOfflineEventsAction).toHaveBeenCalledWith(claim.envelope)
    expect(settleOfflineLocalQueueBatch).toHaveBeenCalledWith(expect.anything(), claim, { status: "SYNCED", serverBatchId: "server-batch" })
  })

  it.each(["throw", "failed action"])("retains uncertain evidence after %s without inventing another identity", async failure => {
    if (failure === "throw") (syncOfflineEventsAction as jest.Mock).mockRejectedValue(new Error("Transport lost"))
    else (syncOfflineEventsAction as jest.Mock).mockResolvedValue({ success: false, error: "Transport lost" })
    renderHook(() => useFlushOfflinePOSQueue(config))
    await expect(mutation().mutationFn()).rejects.toThrow("Transport lost")
    expect(settleOfflineLocalQueueBatch).toHaveBeenCalledWith(expect.anything(), claim, { status: "UNCERTAIN" })
    expect(syncOfflineEventsAction).toHaveBeenCalledTimes(1)
  })

  it.each([
    { ...acknowledged, duplicateCount: 0 },
    { ...acknowledged, device: { id: "other-device" } },
    { ...acknowledged, acceptedCount: -1 },
    { ...acknowledged, batchId: "" },
  ])("retains evidence when acknowledgement is incomplete or mismatched", async data => {
    ;(syncOfflineEventsAction as jest.Mock).mockResolvedValue({ success: true, data })
    renderHook(() => useFlushOfflinePOSQueue(config))
    await expect(mutation().mutationFn()).rejects.toThrow(/acknowledgement is incomplete/i)
    expect(settleOfflineLocalQueueBatch).toHaveBeenCalledWith(expect.anything(), claim, { status: "UNCERTAIN" })
  })

  it("retains partial or rejected batches for review instead of claiming all were synced", async () => {
    ;(syncOfflineEventsAction as jest.Mock).mockResolvedValue({ success: true, data: { ...acknowledged, conflictCount: 1 } })
    renderHook(() => useFlushOfflinePOSQueue(config))
    await expect(mutation().mutationFn()).resolves.toMatchObject({ syncedQueueIds: [], conflictCount: 1 })
    expect(settleOfflineLocalQueueBatch).toHaveBeenCalledWith(expect.anything(), claim, { status: "CONFLICT", serverBatchId: "server-batch" })
  })

  it.each(["LEASE_ACTIVE", "CONFLICT_REVIEW"])("shows %s without reporting an empty queue or calling transport", async reason => {
    const skipped = { skipped: true, reason, pendingCount: 1 }
    ;(claimOfflineLocalQueueBatch as jest.Mock).mockResolvedValue(skipped)
    renderHook(() => useFlushOfflinePOSQueue(config))
    await expect(mutation().mutationFn()).resolves.toEqual(skipped)
    mutation().onSuccess(skipped)
    expect(syncOfflineEventsAction).not.toHaveBeenCalled()
    expect(notifications.info).not.toHaveBeenCalledWith("Offline queue empty", expect.anything())
    expect(notifications.success).not.toHaveBeenCalled()
  })

  it("does not report sync success when local acknowledgement persistence fails", async () => {
    ;(settleOfflineLocalQueueBatch as jest.Mock).mockRejectedValue(new Error("Storage quota exceeded"))
    renderHook(() => useFlushOfflinePOSQueue(config))
    await expect(mutation().mutationFn()).rejects.toThrow("Storage quota exceeded")
    expect(notifications.success).not.toHaveBeenCalled()
  })
})
