import { webcrypto } from "crypto"
import { TextEncoder } from "util"

import {
  buildOfflineSyncBatchEnvelope,
  enqueueOfflineLocalEvent,
  loadOfflineLocalQueue,
  markOfflineLocalQueueEntries,
  offlineLocalQueuePendingEntries,
  pruneSyncedOfflineLocalQueue,
  stableOfflineJson,
  type OfflineLocalQueueConfig,
} from "../offline-local-queue"

function memoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear: jest.fn(() => values.clear()),
    getItem: jest.fn((key: string) => values.get(key) ?? null),
    key: jest.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: jest.fn((key: string) => values.delete(key)),
    setItem: jest.fn((key: string, value: string) => {
      values.set(key, value)
    }),
  }
}

function queueConfig(storage = memoryStorage()): OfflineLocalQueueConfig {
  return {
    organizationKey: "org-1",
    deviceId: "device-1",
    terminalId: "terminal-1",
    locationId: "loc-1",
    sessionId: "session-1",
    storage,
    now: () => new Date("2026-06-15T09:00:00.000Z"),
  }
}

describe("offline local POS queue", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: webcrypto,
    })
    Object.defineProperty(globalThis, "TextEncoder", {
      configurable: true,
      value: TextEncoder,
    })
  })

  it("queues provisional events with deterministic payload hashes and hash-chain continuity", async () => {
    const config = queueConfig()

    const first = await enqueueOfflineLocalEvent(config, {
      eventType: "OFFLINE_SALE_CAPTURED",
      provisionalReference: "LOCAL-1",
      payload: {
        total: "118",
        currency: "XAF",
        lines: [{ sku: "A", qty: 1 }],
      },
    })
    const second = await enqueueOfflineLocalEvent(config, {
      eventType: "OFFLINE_RECEIPT_PROVISIONED",
      provisionalReference: "LOCAL-2",
      payload: {
        receiptStatus: "PROVISIONAL",
        provisionalNumber: "LOCAL-2",
      },
    })

    const state = loadOfflineLocalQueue(config)
    const envelope = buildOfflineSyncBatchEnvelope(config, state)

    expect(state.nextSequence).toBe(3)
    expect(state.highWaterHash).toBe(second.event.entryHash)
    expect(second.event.prevHash).toBe(first.event.entryHash)
    expect(first.event.payloadHash).toHaveLength(64)
    expect(first.event.payloadHash).toBe(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableOfflineJson(first.event.payload))).then((digest) =>
        Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join(""),
      ),
    )
    expect(envelope).toMatchObject({
      deviceId: "device-1",
      terminalId: "terminal-1",
      locationId: "loc-1",
      sessionId: "session-1",
      events: [
        expect.objectContaining({ deviceSeq: 1, entryHash: first.event.entryHash }),
        expect.objectContaining({ deviceSeq: 2, prevHash: first.event.entryHash }),
      ],
      metadata: expect.objectContaining({
        source: "browser_offline_queue",
        queuedEventCount: 2,
      }),
    })
  })

  it("blocks final fiscal numbering claims unless country policy explicitly permits them", async () => {
    const config = queueConfig()

    await expect(
      enqueueOfflineLocalEvent(config, {
        eventType: "OFFLINE_RECEIPT_PROVISIONED",
        payload: {
          legalNumber: "CM-FINAL-0001",
          provisionalNumber: "LOCAL-1",
        },
      }),
    ).rejects.toThrow(/provisional receipt evidence/i)

    expect(loadOfflineLocalQueue(config).entries).toHaveLength(0)

    const permitted = await enqueueOfflineLocalEvent(config, {
      eventType: "OFFLINE_RECEIPT_PROVISIONED",
      allowFinalFiscalNumbering: true,
      payload: {
        legalNumber: "CM-FINAL-0001",
        provisionalNumber: "LOCAL-1",
      },
    })

    expect(permitted.event.metadata).toEqual(
      expect.objectContaining({
        offlineReceiptPolicy: expect.objectContaining({
          finalFiscalNumberingPermitted: true,
          receiptStatus: "COUNTRY_POLICY_PERMITTED",
        }),
      }),
    )
  })

  it("marks queued entries through sync lifecycle without mutating the event envelope", async () => {
    const config = queueConfig()
    const entry = await enqueueOfflineLocalEvent(config, {
      eventType: "OFFLINE_SALE_CAPTURED",
      payload: { total: "118", currency: "XAF" },
    })
    const originalEvent = entry.event

    let state = markOfflineLocalQueueEntries(config, [entry.queueId], "SYNCING")
    expect(state.entries[0]).toMatchObject({
      status: "SYNCING",
      syncAttempts: 1,
      event: expect.objectContaining({
        deviceSeq: originalEvent.deviceSeq,
        entryHash: originalEvent.entryHash,
        payloadHash: originalEvent.payloadHash,
        payload: originalEvent.payload,
      }),
    })

    state = markOfflineLocalQueueEntries(config, [entry.queueId], "SYNCED")
    expect(state.entries[0]).toMatchObject({
      status: "SYNCED",
      event: expect.objectContaining({
        deviceSeq: originalEvent.deviceSeq,
        entryHash: originalEvent.entryHash,
        payloadHash: originalEvent.payloadHash,
        payload: originalEvent.payload,
      }),
    })

    state = pruneSyncedOfflineLocalQueue(config)
    expect(state.entries).toHaveLength(0)
    expect(offlineLocalQueuePendingEntries(state)).toHaveLength(0)
  })
})
