jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    pOSOfflineDevice: { findMany: jest.fn() },
    pOSOfflineEvent: { count: jest.fn(), findFirst: jest.fn() },
    pOSOfflineSyncConflict: { count: jest.fn(), findMany: jest.fn() },
    pOSOfflineSyncCertificate: { count: jest.fn(), findMany: jest.fn() },
    salesOrder: { findFirst: jest.fn() },
    journalEntry: { findFirst: jest.fn() },
  },
}))

jest.mock("../pos.service", () => ({
  commitPOSSale: jest.fn(),
}))

jest.mock("../receipt.service", () => ({
  getSalesReceipt: jest.fn(),
}))

import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { commitPOSSale } from "../pos.service"
import { getSalesReceipt } from "../receipt.service"
import {
  buildOfflineEventEntryHash,
  getOfflineSyncDashboard,
  ingestOfflineSyncBatch,
  replayPendingOfflineSaleEnvelope,
} from "../offline-sync.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  pOSOfflineDevice: { findMany: jest.Mock }
  pOSOfflineEvent: { count: jest.Mock; findFirst: jest.Mock }
  pOSOfflineSyncConflict: { count: jest.Mock; findMany: jest.Mock }
  pOSOfflineSyncCertificate: { count: jest.Mock; findMany: jest.Mock }
  salesOrder: { findFirst: jest.Mock }
  journalEntry: { findFirst: jest.Mock }
}
const mockCommitPOSSale = commitPOSSale as jest.Mock
const mockGetSalesReceipt = getSalesReceipt as jest.Mock

const mockTx = {
  pOSStation: { findFirst: jest.fn() },
  pOSOfflineDevice: { findFirst: jest.fn(), update: jest.fn() },
  pOSOfflineSyncBatch: { create: jest.fn(), update: jest.fn() },
  pOSOfflineEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  pOSOfflineSyncConflict: { create: jest.fn(), count: jest.fn() },
  pOSOfflineSyncCertificate: { upsert: jest.fn() },
  businessEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  auditLog: { create: jest.fn() },
}

const activeDevice = {
  id: "device-1",
  organizationId: "org-1",
  locationId: "loc-1",
  terminalId: "terminal-1",
  deviceLabel: "Register tablet",
  deviceFingerprintHash: "fingerprint-hash-value-123456",
  publicKeyFingerprint: "public-key-fingerprint",
  status: "ACTIVE",
  lastSequence: 0,
  highWaterHash: null,
  lastSeenAt: null,
  enrolledAt: new Date("2026-06-15T08:00:00.000Z"),
}

function resetMockTx() {
  for (const value of Object.values(mockTx)) {
    for (const fn of Object.values(value)) {
      ;(fn as jest.Mock).mockReset()
    }
  }
}

function buildEvent(input: { seq: number; prevHash?: string | null; payload?: Record<string, unknown> }) {
  const payload = input.payload ?? {
    provisionalReference: `LOCAL-${input.seq}`,
    total: "1000",
    currency: "XAF",
  }
  const payloadHash = hashBusinessPayload(payload)
  const entryHash = buildOfflineEventEntryHash({
    deviceId: activeDevice.id,
    deviceSeq: input.seq,
    eventType: "OFFLINE_SALE_CAPTURED",
    schemaVersion: 1,
    payloadHash,
    prevHash: input.prevHash ?? null,
  })

  return {
    eventType: "OFFLINE_SALE_CAPTURED" as const,
    schemaVersion: 1,
    deviceSeq: input.seq,
    idempotencyKey: `offline-sale-${input.seq}`,
    provisionalReference: `LOCAL-${input.seq}`,
    payloadHash,
    prevHash: input.prevHash ?? null,
    entryHash,
    signature: "signature-placeholder",
    capturedAtDevice: new Date("2026-06-15T09:00:00.000Z"),
    payload,
  }
}

function replayPayload(overrides: Record<string, unknown> = {}) {
  return {
    commitSale: {
      salesOrderId: "sale-1",
      locationId: "loc-1",
      terminalId: "terminal-1",
      sessionId: "session-1",
      tenders: [{ method: "CASH", amount: 118 }],
      receipt: { channel: "NONE" },
      ...overrides,
    },
  }
}

function offlineReplayEvent(overrides: Record<string, unknown> = {}) {
  const payload = replayPayload()
  return {
    id: "offline-event-1",
    organizationId: "org-1",
    deviceId: "device-1",
    terminalId: "terminal-1",
    locationId: "loc-1",
    sessionId: "session-1",
    syncBatchId: "batch-1",
    eventType: "OFFLINE_SALE_CAPTURED",
    schemaVersion: 1,
    deviceSeq: 1,
    idempotencyKey: "offline-sale-1",
    provisionalReference: "LOCAL-1",
    payloadHash: hashBusinessPayload(payload),
    prevHash: null,
    entryHash: "entry-hash",
    signature: "signature-placeholder",
    capturedAtDevice: new Date("2026-06-15T09:00:00.000Z"),
    receivedAtServer: new Date("2026-06-15T09:01:00.000Z"),
    status: "PENDING_REPLAY",
    payload,
    policySnapshotHash: null,
    sourceSnapshotHash: null,
    postingBatchId: null,
    documentHash: null,
    blockerCode: "UNPOSTED_ACCEPTED_EVENT",
    blockerMessage: "Accepted offline event is pending POS replay and server certification.",
    metadata: null,
    device: {
      id: "device-1",
      lastSequence: 1,
    },
    ...overrides,
  }
}

function receiptFixture(overrides: Record<string, unknown> = {}) {
  return {
    receipt: {
      id: "sale-1",
      orderNumber: "POS-20260615-0001",
      customerName: "Walk-In Customer",
      customerEmail: "",
      customerPhone: "",
      total: 118,
      subtotal: 100,
      tax: 18,
      taxRate: 18,
      discount: 0,
      paymentMethod: "CASH",
      paymentStatus: "PAID",
      cashier: "Cashier",
      terminal: "Terminal 1",
      sessionNumber: "session-1",
      locale: "EN",
      createdAt: "2026-06-15T09:02:00.000Z",
      items: [],
      payments: [],
    },
    certification: {
      fiscalDocumentId: "fiscal-doc-1",
      documentType: "POS_RECEIPT",
      fiscalDocumentStatus: "QUEUED",
      submissionId: "submission-1",
      submissionStatus: "PENDING",
      authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
      authorityReference: null,
      legalNumber: null,
      provisionalNumber: "CM-POS-2026-000001",
      certifiedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      certificationArtifactHash: "fiscal-artifact-hash",
      countryCode: "CM",
      countryPackVersion: "CM-2026.1",
      countryPackVerificationStatus: "REQUIRES_EXPERT_REVIEW",
      legalDeliveryStatus: "ALLOWED_WITH_STATUS",
      legalDeliveryBlocked: false,
      legalDeliveryBlockReason: null,
    },
    business: {
      name: "Demo",
      address: "",
      city: "",
      phone: "",
      email: "",
      website: "",
      taxId: "",
      currency: "XAF",
    },
    location: {
      name: "Main",
      address: "",
      city: "",
      phone: "",
    },
    generatedAt: "2026-06-15T09:02:00.000Z",
    digitalReceiptUrl: "/digital-receipt/sale-1",
    ...overrides,
  }
}

function commitResult(overrides: Record<string, unknown> = {}) {
  return {
    saleId: "sale-1",
    orderNumber: "POS-20260615-0001",
    status: "COMPLETED",
    paymentStatus: "PAID",
    total: 118,
    amountPaid: 118,
    onAccountAmount: 0,
    changeDue: 0,
    accountingMovements: {
      saleJournalEntry: {
        id: "sale-je-1",
        entryNumber: "VT-20260615-0001",
        postingBatchId: "posting-batch-1",
      },
      paymentJournalEntries: [],
      entries: [],
      totalDebits: 118,
      totalCredits: 118,
    },
    fiscalDocument: {
      id: "fiscal-doc-1",
      status: "QUEUED",
      authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
    },
    receipt: receiptFixture(),
    delivery: null,
    ...overrides,
  }
}

describe("offline POS sync service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetMockTx()
    mockDb.$transaction.mockImplementation((callback: (tx: typeof mockTx) => unknown) => callback(mockTx))
    mockDb.pOSOfflineDevice.findMany.mockResolvedValue([])
    mockDb.pOSOfflineEvent.count.mockResolvedValue(0)
    mockDb.pOSOfflineEvent.findFirst.mockResolvedValue(null)
    mockDb.pOSOfflineSyncConflict.count.mockResolvedValue(0)
    mockDb.pOSOfflineSyncConflict.findMany.mockResolvedValue([])
    mockDb.pOSOfflineSyncCertificate.count.mockResolvedValue(0)
    mockDb.pOSOfflineSyncCertificate.findMany.mockResolvedValue([])
    mockDb.salesOrder.findFirst.mockResolvedValue(null)
    mockDb.journalEntry.findFirst.mockResolvedValue(null)
    mockCommitPOSSale.mockReset()
    mockCommitPOSSale.mockResolvedValue(commitResult())
    mockGetSalesReceipt.mockReset()
    mockGetSalesReceipt.mockResolvedValue(receiptFixture())
    mockTx.pOSStation.findFirst.mockResolvedValue({ id: "terminal-1" })
    mockTx.pOSOfflineDevice.findFirst.mockResolvedValue(activeDevice)
    mockTx.pOSOfflineSyncBatch.create.mockResolvedValue({
      id: "batch-1",
      organizationId: "org-1",
      deviceId: "device-1",
      terminalId: "terminal-1",
      locationId: "loc-1",
    })
    mockTx.pOSOfflineEvent.findUnique.mockResolvedValue(null)
    mockTx.pOSOfflineEvent.create.mockImplementation(async ({ data }) => ({
      id: `offline-event-${data.deviceSeq}`,
      ...data,
      createdAt: new Date("2026-06-15T09:01:00.000Z"),
      updatedAt: new Date("2026-06-15T09:01:00.000Z"),
    }))
    mockTx.pOSOfflineEvent.update.mockResolvedValue({ id: "offline-event-1" })
    mockTx.pOSOfflineEvent.count.mockResolvedValue(1)
    mockTx.pOSOfflineSyncConflict.count.mockResolvedValue(0)
    mockTx.pOSOfflineDevice.update.mockImplementation(async ({ data }) => ({
      ...activeDevice,
      ...data,
    }))
    mockTx.pOSOfflineSyncCertificate.upsert.mockImplementation(async ({ create, update }) => ({
      id: "certificate-1",
      ...create,
      ...update,
      deviceId: create.deviceId,
      terminalId: create.terminalId,
      locationId: create.locationId,
      updatedAt: new Date("2026-06-15T09:02:00.000Z"),
    }))
    mockTx.pOSOfflineSyncBatch.update.mockResolvedValue({ id: "batch-1" })
    mockTx.pOSOfflineSyncConflict.create.mockImplementation(async ({ data }) => ({
      id: `conflict-${mockTx.pOSOfflineSyncConflict.create.mock.calls.length}`,
      ...data,
      eventId: data.eventId ?? null,
      expectedSequence: data.expectedSequence ?? null,
      actualSequence: data.actualSequence ?? null,
      status: "OPEN",
      createdAt: new Date("2026-06-15T09:03:00.000Z"),
    }))
    mockTx.businessEvent.findUnique.mockResolvedValue(null)
    mockTx.businessEvent.create.mockImplementation(async ({ data }) => ({
      id: `business-event-${mockTx.businessEvent.create.mock.calls.length}`,
      organizationId: data.organizationId,
      eventSource: data.eventSource,
      idempotencyKey: data.idempotencyKey,
      payloadHash: data.payloadHash,
      outboxMessages: data.outboxMessages?.create ?? [],
    }))
    mockTx.auditLog.create.mockResolvedValue({ id: "audit-1" })
  })

  it("records an accepted offline event as pending replay without touching POS sale truth", async () => {
    const event = buildEvent({ seq: 1 })

    const result = await ingestOfflineSyncBatch({
      organizationId: "org-1",
      userId: "user-1",
      deviceId: "device-1",
      terminalId: "terminal-1",
      locationId: "loc-1",
      events: [event],
    })

    expect(result.acceptedCount).toBe(1)
    expect(result.conflictCount).toBe(0)
    expect(mockTx.pOSOfflineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING_REPLAY",
          blockerCode: "UNPOSTED_ACCEPTED_EVENT",
          payloadHash: event.payloadHash,
          entryHash: event.entryHash,
        }),
      }),
    )
    expect(mockTx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "pos.offline.event.captured",
          eventSource: "OFFLINE_POS",
        }),
      }),
    )
    expect(mockTx.pOSOfflineDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastSequence: 1,
          highWaterHash: event.entryHash,
        }),
      }),
    )
  })

  it("rejects an idempotency key reused with a different payload hash", async () => {
    const event = buildEvent({ seq: 1, payload: { total: "2000", currency: "XAF" } })
    mockTx.pOSOfflineEvent.findUnique.mockResolvedValueOnce({
      id: "existing-event",
      deviceSeq: 1,
      payloadHash: "old-payload-hash",
      entryHash: "old-entry-hash",
    })
    mockTx.pOSOfflineEvent.count.mockResolvedValue(0)

    const result = await ingestOfflineSyncBatch({
      organizationId: "org-1",
      userId: "user-1",
      deviceId: "device-1",
      terminalId: "terminal-1",
      locationId: "loc-1",
      events: [event],
    })

    expect(result.acceptedCount).toBe(0)
    expect(result.conflictCount).toBe(1)
    expect(mockTx.pOSOfflineEvent.create).not.toHaveBeenCalled()
    expect(mockTx.pOSOfflineSyncConflict.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conflictType: "IDEMPOTENCY_PAYLOAD_MISMATCH",
          severity: "CRITICAL",
        }),
      }),
    )
  })

  it("treats duplicate replay with the same payload as idempotent", async () => {
    const event = buildEvent({ seq: 1 })
    mockTx.pOSOfflineEvent.findUnique.mockResolvedValueOnce({
      id: "existing-event",
      deviceSeq: 1,
      payloadHash: event.payloadHash,
      entryHash: event.entryHash,
    })

    const result = await ingestOfflineSyncBatch({
      organizationId: "org-1",
      userId: "user-1",
      deviceId: "device-1",
      terminalId: "terminal-1",
      locationId: "loc-1",
      events: [event],
    })

    expect(result.acceptedCount).toBe(0)
    expect(result.duplicateCount).toBe(1)
    expect(result.conflictCount).toBe(0)
    expect(mockTx.pOSOfflineEvent.create).not.toHaveBeenCalled()
    expect(mockTx.businessEvent.create).not.toHaveBeenCalled()
    expect(mockTx.pOSOfflineSyncConflict.create).not.toHaveBeenCalled()
  })

  it("quarantines a device sequence gap", async () => {
    const event = buildEvent({ seq: 2 })
    mockTx.pOSOfflineEvent.count.mockResolvedValue(0)

    const result = await ingestOfflineSyncBatch({
      organizationId: "org-1",
      userId: "user-1",
      deviceId: "device-1",
      terminalId: "terminal-1",
      locationId: "loc-1",
      events: [event],
    })

    expect(result.acceptedCount).toBe(0)
    expect(result.conflictCount).toBe(1)
    expect(mockTx.pOSOfflineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "QUARANTINED",
          blockerCode: "SEQUENCE_GAP",
        }),
      }),
    )
    expect(mockTx.pOSOfflineSyncConflict.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conflictType: "SEQUENCE_GAP",
          expectedSequence: 1,
          actualSequence: 2,
        }),
      }),
    )
  })

  it("quarantines a hash-chain fork", async () => {
    const forkedPrevHash = "f".repeat(64)
    const event = buildEvent({ seq: 1, prevHash: forkedPrevHash })
    mockTx.pOSOfflineEvent.count.mockResolvedValue(0)

    const result = await ingestOfflineSyncBatch({
      organizationId: "org-1",
      userId: "user-1",
      deviceId: "device-1",
      terminalId: "terminal-1",
      locationId: "loc-1",
      events: [event],
    })

    expect(result.acceptedCount).toBe(0)
    expect(result.conflictCount).toBe(1)
    expect(mockTx.pOSOfflineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "QUARANTINED",
          blockerCode: "HASH_CHAIN_FORK",
        }),
      }),
    )
    expect(mockTx.pOSOfflineSyncConflict.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conflictType: "HASH_CHAIN_FORK",
          severity: "CRITICAL",
        }),
      }),
    )
  })

  it("quarantines sync from a revoked device", async () => {
    mockTx.pOSOfflineDevice.findFirst.mockResolvedValue({
      ...activeDevice,
      status: "REVOKED",
    })
    const event = buildEvent({ seq: 1 })

    const result = await ingestOfflineSyncBatch({
      organizationId: "org-1",
      userId: "user-1",
      deviceId: "device-1",
      terminalId: "terminal-1",
      locationId: "loc-1",
      events: [event],
    })

    expect(result.status).toBe("REJECTED")
    expect(result.acceptedCount).toBe(0)
    expect(result.conflictCount).toBe(1)
    expect(mockTx.pOSOfflineEvent.create).not.toHaveBeenCalled()
    expect(mockTx.pOSOfflineSyncConflict.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conflictType: "DEVICE_REVOKED",
          severity: "CRITICAL",
        }),
      }),
    )
  })

  it("replays an accepted pending offline sale through POS finalization", async () => {
    const event = offlineReplayEvent()
    mockDb.pOSOfflineEvent.findFirst.mockResolvedValue(event)
    mockTx.pOSOfflineEvent.count.mockResolvedValue(0)

    const result = await replayPendingOfflineSaleEnvelope({
      organizationId: "org-1",
      userId: "user-1",
      offlineEventId: event.id,
    })

    expect(result).toMatchObject({
      offlineEventId: event.id,
      status: "REPLAYED",
      saleId: "sale-1",
      postingBatchId: "posting-batch-1",
      fiscalDocumentId: "fiscal-doc-1",
      fiscalDocumentStatus: "QUEUED",
      legalDeliveryBlocked: false,
    })
    expect(mockCommitPOSSale).toHaveBeenCalledWith({
      salesOrderId: "sale-1",
      locationId: "loc-1",
      terminalId: "terminal-1",
      sessionId: "session-1",
      tenders: [{ method: "CASH", amount: 118 }],
      receipt: { channel: "NONE" },
      organizationId: "org-1",
      userId: "user-1",
    })
    expect(mockTx.pOSOfflineEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: event.id },
        data: expect.objectContaining({
          status: "REPLAYED",
          postingBatchId: "posting-batch-1",
          documentHash: "fiscal-artifact-hash",
          blockerCode: null,
          blockerMessage: null,
          metadata: expect.objectContaining({
            offlineReplay: expect.objectContaining({
              saleId: "sale-1",
              postingBatchId: "posting-batch-1",
              fiscalDocumentId: "fiscal-doc-1",
              fiscalDocumentStatus: "QUEUED",
            }),
          }),
        }),
      }),
    )
    expect(mockTx.pOSOfflineSyncConflict.create).not.toHaveBeenCalled()
  })

  it("does not finalize a duplicate replay that already has replay evidence", async () => {
    const event = offlineReplayEvent({
      status: "REPLAYED",
      postingBatchId: "posting-batch-1",
      metadata: {
        offlineReplay: {
          saleId: "sale-1",
          orderNumber: "POS-20260615-0001",
          postingBatchId: "posting-batch-1",
          fiscalDocumentId: "fiscal-doc-1",
          fiscalDocumentStatus: "QUEUED",
          legalDeliveryBlocked: false,
        },
      },
    })
    mockDb.pOSOfflineEvent.findFirst.mockResolvedValue(event)

    const result = await replayPendingOfflineSaleEnvelope({
      organizationId: "org-1",
      userId: "user-1",
      offlineEventId: event.id,
    })

    expect(result).toMatchObject({
      status: "DUPLICATE_REPLAY",
      saleId: "sale-1",
      postingBatchId: "posting-batch-1",
    })
    expect(mockCommitPOSSale).not.toHaveBeenCalled()
    expect(mockTx.pOSOfflineEvent.update).not.toHaveBeenCalled()
    expect(mockTx.pOSOfflineSyncConflict.create).not.toHaveBeenCalled()
  })

  it("blocks replay when POS finalization rolls back", async () => {
    const event = offlineReplayEvent()
    mockDb.pOSOfflineEvent.findFirst.mockResolvedValue(event)
    mockCommitPOSSale.mockRejectedValueOnce(new Error("Insufficient stock at this location"))

    const result = await replayPendingOfflineSaleEnvelope({
      organizationId: "org-1",
      userId: "user-1",
      offlineEventId: event.id,
    })

    expect(result).toMatchObject({
      status: "BLOCKED",
      blockerCode: "OFFLINE_REPLAY_STOCK_BLOCKED",
      blockerMessage: "Insufficient stock at this location",
    })
    expect(mockTx.pOSOfflineEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: event.id },
        data: expect.objectContaining({
          status: "BLOCKED",
          blockerCode: "OFFLINE_REPLAY_STOCK_BLOCKED",
        }),
      }),
    )
    expect(mockTx.pOSOfflineSyncConflict.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: event.id,
          conflictType: "UNPOSTED_ACCEPTED_EVENT",
          severity: "HIGH",
          message: "Insufficient stock at this location",
        }),
      }),
    )
  })

  it("blocks replay when accepted payload hash evidence no longer matches", async () => {
    const event = offlineReplayEvent({
      payloadHash: "different-accepted-payload-hash",
    })
    mockDb.pOSOfflineEvent.findFirst.mockResolvedValue(event)

    const result = await replayPendingOfflineSaleEnvelope({
      organizationId: "org-1",
      userId: "user-1",
      offlineEventId: event.id,
    })

    expect(result).toMatchObject({
      status: "BLOCKED",
      blockerCode: "OFFLINE_REPLAY_PAYLOAD_HASH_MISMATCH",
    })
    expect(mockCommitPOSSale).not.toHaveBeenCalled()
    expect(mockTx.pOSOfflineSyncConflict.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: event.id,
          conflictType: "UNPOSTED_ACCEPTED_EVENT",
          severity: "CRITICAL",
        }),
      }),
    )
  })

  it("blocks replay when sale envelope scope does not match the accepted device event", async () => {
    const payload = replayPayload({ terminalId: "terminal-2" })
    const event = offlineReplayEvent({
      payload,
      payloadHash: hashBusinessPayload(payload),
    })
    mockDb.pOSOfflineEvent.findFirst.mockResolvedValue(event)

    const result = await replayPendingOfflineSaleEnvelope({
      organizationId: "org-1",
      userId: "user-1",
      offlineEventId: event.id,
    })

    expect(result).toMatchObject({
      status: "BLOCKED",
      blockerCode: "OFFLINE_REPLAY_SCOPE_MISMATCH",
    })
    expect(mockCommitPOSSale).not.toHaveBeenCalled()
    expect(mockTx.pOSOfflineSyncConflict.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: event.id,
          conflictType: "UNPOSTED_ACCEPTED_EVENT",
          severity: "HIGH",
        }),
      }),
    )
  })

  it("redacts low-level system details when replay finalization fails", async () => {
    const event = offlineReplayEvent()
    mockDb.pOSOfflineEvent.findFirst.mockResolvedValue(event)
    mockCommitPOSSale.mockRejectedValueOnce(new Error("Prisma foreign key constraint failed"))

    const result = await replayPendingOfflineSaleEnvelope({
      organizationId: "org-1",
      userId: "user-1",
      offlineEventId: event.id,
    })

    expect(result).toMatchObject({
      status: "BLOCKED",
      blockerCode: "OFFLINE_REPLAY_BLOCKED",
      blockerMessage: "Offline sale replay could not complete. Review the operator conflict evidence for remediation.",
    })
    expect(mockTx.pOSOfflineSyncConflict.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          message: "Offline sale replay could not complete. Review the operator conflict evidence for remediation.",
        }),
      }),
    )
  })

  it("marks an already completed sale as duplicate replay instead of finalizing again", async () => {
    const event = offlineReplayEvent()
    mockDb.pOSOfflineEvent.findFirst.mockResolvedValue(event)
    mockDb.salesOrder.findFirst.mockResolvedValue({
      id: "sale-1",
      orderNumber: "POS-20260615-0001",
    })
    mockDb.journalEntry.findFirst.mockResolvedValue({ postingBatchId: "posting-batch-1" })
    mockTx.pOSOfflineEvent.count.mockResolvedValue(0)

    const result = await replayPendingOfflineSaleEnvelope({
      organizationId: "org-1",
      userId: "user-1",
      offlineEventId: event.id,
    })

    expect(result).toMatchObject({
      status: "DUPLICATE_REPLAY",
      saleId: "sale-1",
      postingBatchId: "posting-batch-1",
    })
    expect(mockCommitPOSSale).not.toHaveBeenCalled()
    expect(mockGetSalesReceipt).toHaveBeenCalledWith({
      salesOrderId: "sale-1",
      organizationId: "org-1",
    })
    expect(mockTx.pOSOfflineEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REPLAYED",
          postingBatchId: "posting-batch-1",
        }),
      }),
    )
  })

  it("preserves fiscal-document ineligibility from the normal receipt payload", async () => {
    const event = offlineReplayEvent()
    const receipt = receiptFixture({
      certification: {
        fiscalDocumentId: null,
        documentType: null,
        fiscalDocumentStatus: "NOT_CREATED",
        submissionId: null,
        submissionStatus: null,
        authorityChannel: null,
        authorityReference: null,
        legalNumber: null,
        provisionalNumber: null,
        certifiedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        certificationArtifactHash: null,
        countryCode: null,
        countryPackVersion: null,
        countryPackVerificationStatus: null,
        legalDeliveryStatus: "NOT_CREATED",
        legalDeliveryBlocked: false,
        legalDeliveryBlockReason: null,
      },
    })
    mockDb.pOSOfflineEvent.findFirst.mockResolvedValue(event)
    mockCommitPOSSale.mockResolvedValueOnce(commitResult({
      fiscalDocument: null,
      receipt,
    }))

    const result = await replayPendingOfflineSaleEnvelope({
      organizationId: "org-1",
      userId: "user-1",
      offlineEventId: event.id,
    })

    expect(result).toMatchObject({
      status: "REPLAYED",
      fiscalDocumentId: null,
      fiscalDocumentStatus: "NOT_CREATED",
      legalDeliveryBlocked: false,
    })
    expect(mockTx.pOSOfflineEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REPLAYED",
          postingBatchId: "posting-batch-1",
          metadata: expect.objectContaining({
            offlineReplay: expect.objectContaining({
              fiscalDocumentId: null,
              fiscalDocumentStatus: "NOT_CREATED",
              legalDeliveryBlocked: false,
              legalDeliveryStatus: "NOT_CREATED",
            }),
          }),
        }),
      }),
    )
  })

  it("preserves fiscal-document legal delivery blockers from the receipt payload", async () => {
    const event = offlineReplayEvent()
    const receipt = receiptFixture({
      certification: {
        fiscalDocumentId: "fiscal-doc-1",
        documentType: "POS_RECEIPT",
        fiscalDocumentStatus: "QUEUED",
        submissionId: "submission-1",
        submissionStatus: "QUEUED",
        authorityChannel: "CM_DGI_E_SERVICES_PORTAL",
        authorityReference: null,
        legalNumber: null,
        provisionalNumber: "PROV-1",
        certifiedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        certificationArtifactHash: "fiscal-artifact-hash",
        countryCode: "CM",
        countryPackVersion: "2026.1",
        countryPackVerificationStatus: "VERIFIED",
        legalDeliveryStatus: "BLOCKED_UNTIL_CERTIFIED",
        legalDeliveryBlocked: true,
        legalDeliveryBlockReason:
          "Country-pack policy blocks legal receipt delivery until certification or approved fallback evidence exists.",
      },
    })
    mockDb.pOSOfflineEvent.findFirst.mockResolvedValue(event)
    mockCommitPOSSale.mockResolvedValueOnce(commitResult({ receipt }))

    const result = await replayPendingOfflineSaleEnvelope({
      organizationId: "org-1",
      userId: "user-1",
      offlineEventId: event.id,
    })

    expect(result).toMatchObject({
      status: "REPLAYED",
      fiscalDocumentId: "fiscal-doc-1",
      fiscalDocumentStatus: "QUEUED",
      legalDeliveryBlocked: true,
    })
    expect(mockTx.pOSOfflineEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            offlineReplay: expect.objectContaining({
              fiscalDocumentId: "fiscal-doc-1",
              legalDeliveryBlocked: true,
              legalDeliveryStatus: "BLOCKED_UNTIL_CERTIFIED",
            }),
          }),
        }),
      }),
    )
  })

  it("keeps persisted open conflicts visible as close blockers", async () => {
    mockDb.pOSOfflineDevice.findMany.mockResolvedValue([
      {
        ...activeDevice,
        lastSeenAt: new Date("2026-06-15T09:00:00.000Z"),
      },
    ])
    mockDb.pOSOfflineEvent.count.mockResolvedValue(2)
    mockDb.pOSOfflineSyncConflict.count.mockResolvedValue(1)
    mockDb.pOSOfflineSyncCertificate.count.mockResolvedValue(1)
    mockDb.pOSOfflineSyncConflict.findMany.mockResolvedValue([
      {
        id: "conflict-1",
        deviceId: "device-1",
        eventId: "event-1",
        conflictType: "HASH_CHAIN_FORK",
        severity: "CRITICAL",
        status: "OPEN",
        expectedSequence: 2,
        actualSequence: 2,
        message: "Offline event previous hash does not match the server high-water mark.",
        createdAt: new Date("2026-06-15T09:05:00.000Z"),
      },
    ])
    mockDb.pOSOfflineSyncCertificate.findMany.mockResolvedValue([
      {
        id: "certificate-1",
        deviceId: "device-1",
        terminalId: "terminal-1",
        locationId: "loc-1",
        status: "BLOCKED",
        lastCertifiedSequence: 0,
        eventCount: 2,
        acceptedCount: 1,
        conflictCount: 1,
        pendingReplayCount: 1,
        closeBlocker: true,
        blockerCode: "OFFLINE_SYNC_CONFLICT",
        blockerMessage: "Offline sync conflicts must be resolved before close/certification.",
        certificateHash: "certificate-hash",
        updatedAt: new Date("2026-06-15T09:06:00.000Z"),
      },
    ])

    const result = await getOfflineSyncDashboard({
      organizationId: "org-1",
      terminalId: "terminal-1",
      locationId: "loc-1",
    })

    expect(result.summary).toMatchObject({
      deviceCount: 1,
      pendingEventCount: 2,
      openConflictCount: 1,
      closeBlockerCount: 1,
    })
    expect(result.conflicts).toEqual([
      expect.objectContaining({
        conflictType: "HASH_CHAIN_FORK",
        severity: "CRITICAL",
      }),
    ])
    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: "OFFLINE_SYNC_CONFLICT",
        severity: "critical",
      }),
    ])
  })
})
