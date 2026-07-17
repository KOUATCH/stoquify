import { createHash } from "node:crypto"

import type {
  InventoryMovementHistoryResult,
  InventoryMovementHistoryRow,
} from "@/services/inventory/inventory-read.service"
import { readInventoryMovementHistory } from "@/services/inventory/inventory-read.service"

import { hashBusinessPayload } from "@/services/events/business-event.service"
import {
  createInventoryHistoryExportDownloadGrant,
  enqueueInventoryHistoryBackgroundExport,
  expireInventoryHistoryBackgroundExports,
  getInventoryHistoryBackgroundExportStatus,
  processInventoryHistoryBackgroundExportJob,
  streamInventoryHistoryExportDownload,
} from "../inventory-history-background-export.service"

jest.mock("@/services/inventory/inventory-read.service", () => {
  const actual = jest.requireActual("@/services/inventory/inventory-read.service")
  return { ...actual, readInventoryMovementHistory: jest.fn() }
})

const mockedReadHistory = jest.mocked(readInventoryMovementHistory)
const SECRET = "stoquify-history-export-test-secret-2026"
const NOW = new Date("2026-07-15T09:00:00.000Z")

type MutableRecord = Record<string, unknown>

function asRecord(value: unknown): MutableRecord {
  return value as MutableRecord
}

function fieldMatches(actual: unknown, expected: unknown): boolean {
  if (!expected || typeof expected !== "object" || expected instanceof Date) {
    return actual === expected
  }
  const condition = asRecord(expected)
  if (Array.isArray(condition.in)) return condition.in.includes(actual)
  if (typeof condition.startsWith === "string" && !String(actual).startsWith(condition.startsWith)) return false
  if (typeof condition.gt === "string" && !(String(actual) > condition.gt)) return false
  const actualTime = actual instanceof Date ? actual.getTime() : Number.NaN
  if (condition.lte instanceof Date && !(actualTime <= condition.lte.getTime())) return false
  if (condition.lt instanceof Date && !(actualTime < condition.lt.getTime())) return false
  return true
}

function recordMatches(record: MutableRecord, where: MutableRecord = {}): boolean {
  for (const [key, expected] of Object.entries(where)) {
    if (key === "OR") {
      const branches = expected as MutableRecord[]
      if (!branches.some((branch) => recordMatches(record, branch))) return false
      continue
    }
    if (!fieldMatches(record[key], expected)) return false
  }
  return true
}

function applyData(record: MutableRecord, data: MutableRecord) {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    if (value && typeof value === "object" && "increment" in value) {
      record[key] = Number(record[key] ?? 0) + Number(asRecord(value).increment)
    } else {
      record[key] = value
    }
  }
  return record
}

class ExportStore {
  readonly events: MutableRecord[] = []
  readonly outboxes: MutableRecord[] = []
  readonly audits: MutableRecord[] = []
  private eventSequence = 0
  private outboxSequence = 0
  readonly artifacts = new Map<string, Buffer>()
  failArtifactDeletes = false
  artifactReads = 0
  maxArtifactReadsInFlight = 0
  private artifactReadsInFlight = 0

  readonly artifactStore = {
    putEncryptedChunk: async (input: {
      exportId: string
      sequence: number
      ciphertext: Buffer
    }) => {
      const key = `artifact:${input.exportId}:${input.sequence}`
      const ciphertext = Buffer.from(input.ciphertext)
      this.artifacts.set(key, ciphertext)
      return {
        provider: "uploadthing" as const,
        key,
        customId: key,
        byteLength: ciphertext.length,
        ciphertextHash: `sha256:${createHash("sha256").update(ciphertext).digest("hex")}`,
      }
    },
    readEncryptedChunk: async (reference: { key: string }) => {
      this.artifactReads += 1
      this.artifactReadsInFlight += 1
      this.maxArtifactReadsInFlight = Math.max(
        this.maxArtifactReadsInFlight,
        this.artifactReadsInFlight,
      )
      try {
        const content = this.artifacts.get(reference.key)
        if (!content) throw new Error("artifact not found")
        return Buffer.from(content)
      } finally {
        this.artifactReadsInFlight -= 1
      }
    },
    deleteEncryptedChunks: async (references: readonly { key: string }[]) => {
      if (this.failArtifactDeletes) throw new Error("provider delete unavailable")
      for (const reference of references) this.artifacts.delete(reference.key)
      return { deletedCount: references.length }
    },
  }

  readonly client = {
    $transaction: async <T>(callback: (tx: ExportStore["client"]) => Promise<T>) => callback(this.client),
    businessEvent: {
      findUnique: async (args: unknown) => {
        const where = asRecord(asRecord(args).where)
        const key = asRecord(where.organizationId_eventSource_idempotencyKey)
        if (!Object.keys(key).length) return null
        return this.events.find((event) =>
          event.organizationId === key.organizationId &&
          event.eventSource === key.eventSource &&
          event.idempotencyKey === key.idempotencyKey
        ) ?? null
      },
      findMany: async (args: unknown) => {
        const input = asRecord(args)
        const where = asRecord(input.where)
        let events = this.events.filter((event) => recordMatches(event, where))
        if (asRecord(input.orderBy).idempotencyKey === "asc") {
          events = [...events].sort((left, right) =>
            String(left.idempotencyKey).localeCompare(String(right.idempotencyKey)),
          )
        }
        const take = typeof input.take === "number" ? input.take : events.length
        return events.slice(0, take)
      },
      create: async (args: unknown) => {
        const data = asRecord(asRecord(args).data)
        const outboxEnvelope = asRecord(data.outboxMessages)
        const requestedMessages = Array.isArray(outboxEnvelope.create)
          ? outboxEnvelope.create as MutableRecord[]
          : []
        const event: MutableRecord = {
          ...data,
          id: `event-${++this.eventSequence}`,
          actorId: data.actorId ?? null,
          outboxMessages: [],
        }
        delete event.outboxMessages
        const messages = requestedMessages.map((message) => {
          const outbox: MutableRecord = {
            ...message,
            id: `job-${++this.outboxSequence}`,
            businessEventId: event.id,
            organizationId: data.organizationId,
            status: "PENDING",
            attempts: 0,
            maxAttempts: message.maxAttempts ?? 5,
            availableAt: message.availableAt ?? NOW,
            lockedAt: null,
            lockedBy: null,
            processedAt: null,
            failedAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            createdAt: NOW,
          }
          this.outboxes.push(outbox)
          return outbox
        })
        event.outboxMessages = messages
        this.events.push(event)
        return event
      },
      update: async (args: unknown) => {
        const input = asRecord(args)
        const where = asRecord(input.where)
        const event = this.events.find((candidate) => candidate.id === where.id)
        if (!event) throw new Error("event not found")
        return applyData(event, asRecord(input.data))
      },
    },
    businessEventOutbox: {
      findFirst: async (args: unknown) => {
        const input = asRecord(args)
        const where = asRecord(input.where)
        const record = this.outboxes.find((candidate) => recordMatches(candidate, where)) ?? null
        if (!record) return null
        return input.select ? { id: record.id } : record
      },
      findMany: async (args: unknown) => {
        const input = asRecord(args)
        const where = asRecord(input.where)
        const take = typeof input.take === "number" ? input.take : this.outboxes.length
        return this.outboxes.filter((record) => recordMatches(record, where)).slice(0, take)
      },
      update: async (args: unknown) => {
        const input = asRecord(args)
        const where = asRecord(input.where)
        const record = this.outboxes.find((candidate) => candidate.id === where.id)
        if (!record) throw new Error("outbox not found")
        return applyData(record, asRecord(input.data))
      },
      updateMany: async (args: unknown) => {
        const input = asRecord(args)
        const where = asRecord(input.where)
        const matches = this.outboxes.filter((candidate) => recordMatches(candidate, where))
        for (const record of matches) applyData(record, asRecord(input.data))
        return { count: matches.length }
      },
    },
    auditLog: {
      create: async (args: unknown) => {
        const data = asRecord(asRecord(args).data)
        const audit = { id: `audit-${this.audits.length + 1}`, ...data }
        this.audits.push(audit)
        return audit
      },
    },
  }
}

function row(id: string): InventoryMovementHistoryRow {
  return {
    id,
    type: "PURCHASE_RECEIPT",
    quantity: "2.0000",
    unitCost: "5.00",
    totalCost: "10.00",
    currency: "XAF",
    effectiveAt: "2026-07-14T09:00:00.000Z",
    recordedAt: "2026-07-14T09:00:01.000Z",
    timeProvenance: "explicit",
    item: { id: "item-1", name: "Rice", sku: "RICE-1", unit: "kg" },
    location: { id: "location-1", name: "Main warehouse" },
    actor: { id: "user-1", name: "Warehouse manager" },
    reference: { type: "PurchaseReceipt", id: "receipt-1", number: "GRN-1" },
    correction: { reversalOfTransactionId: null, reversedByTransactionId: null },
    notes: null,
    batchNumber: null,
    serialNumbers: [],
    expiryDate: null,
  }
}

function page(
  rows: InventoryMovementHistoryRow[],
  nextCursor: string | null,
  overrides: Partial<InventoryMovementHistoryResult> = {},
): InventoryMovementHistoryResult {
  return {
    rows,
    pageInfo: { nextCursor, hasMore: Boolean(nextCursor) },
    appliedFilters: {
      itemId: null,
      locationId: null,
      type: null,
      dateFrom: "2026-07-01",
      dateTo: "2026-07-14",
      effectiveAsOf: null,
      timezone: "Africa/Douala",
      pageSize: 100,
    },
    summary: {
      transactionCount: rows.length,
      totalInbound: "2.0000",
      totalOutbound: "0.0000",
      totalTransfers: "0.0000",
      totalAdjustments: "0.0000",
      totalReservations: "0.0000",
      netMovement: "2.0000",
      valueChange: "10.00",
      currency: "XAF",
      unit: "kg",
    },
    snapshot: {
      recordedThrough: "2026-07-15T09:00:00.000Z",
      generatedAt: "2026-07-15T09:00:00.000Z",
      timezone: "Africa/Douala",
    },
    completeness: {
      state: "complete",
      sources: [{ source: "inventory_transactions", state: "complete" }],
    },
    ...overrides,
  }
}

function options(store: ExportStore, exportId = "export-1") {
  return {
    client: store.client as never,
    auditClient: store.client as never,
    secret: SECRET,
    exportIdFactory: () => exportId,
    dataKeyFactory: () => Buffer.alloc(32, 7),
    artifactStore: store.artifactStore,
  }
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    actorId: "controller-1",
    actorPermissions: ["reports.export", "inventory.levels.read"],
    idempotencyKey: "request-001",
    filters: {},
    maximumRows: 25_000,
    retentionSeconds: 3_600,
    maxAttempts: 5,
    lastAuthAt: "2026-07-15T08:59:00.000Z",
    now: NOW,
    ...overrides,
  }
}

describe("inventory history background export service", () => {
  beforeEach(() => {
    mockedReadHistory.mockReset()
  })

  it("replays an identical request without rereading and rejects conflicting key reuse", async () => {
    const store = new ExportStore()
    mockedReadHistory.mockResolvedValue(page([row("tx-1")], null))

    const first = await enqueueInventoryHistoryBackgroundExport(request(), options(store))
    const replay = await enqueueInventoryHistoryBackgroundExport(request(), options(store))

    expect(replay).toEqual(first)
    expect(mockedReadHistory).toHaveBeenCalledTimes(1)
    expect(store.events.filter((event) => event.eventType === "inventory.history.export.requested")).toHaveLength(1)
    expect(store.events.filter((event) => event.eventType === "inventory.history.export.chunk.persisted")).toHaveLength(0)

    await expect(enqueueInventoryHistoryBackgroundExport(
      request({ filters: { locationId: "location-2" } }),
      options(store),
    )).rejects.toThrow("idempotency key was reused with a different request")
    expect(mockedReadHistory).toHaveBeenCalledTimes(1)
  })

  it("resumes from persisted cursors, finalizes once, and streams verified content", async () => {
    const store = new ExportStore()
    mockedReadHistory.mockImplementation(async (input) => {
      const cursor = input.filters?.cursor
      if (!cursor) return page([row("tx-1")], "cursor-1")
      if (cursor === "cursor-1") return page([row("tx-2")], "cursor-2")
      return page([row("tx-3")], null)
    })

    const queued = await enqueueInventoryHistoryBackgroundExport(
      request({ maxAttempts: 1 }),
      options(store),
    )
    const checkpoint = await processInventoryHistoryBackgroundExportJob(
      { organizationId: "org-1", jobId: queued.jobId, workerId: "worker-a", maxPagesPerLease: 1, now: NOW },
      options(store),
    )
    expect(checkpoint).toMatchObject({
      claimed: true,
      status: { status: "PENDING", rowCount: 1, chunkCount: 1 },
    })
    const firstCheckpoint = asRecord(store.outboxes[0].metadata)
    expect(firstCheckpoint).toMatchObject({
      schemaVersion: 2,
      pageState: "STARTED",
      chunkCount: 1,
      lastChunkSequence: 0,
    })
    expect(firstCheckpoint.chunkReferences).toBeUndefined()

    const completedAt = new Date("2026-07-15T09:01:00.000Z")
    const completed = await processInventoryHistoryBackgroundExportJob(
      { organizationId: "org-1", jobId: queued.jobId, workerId: "worker-b", maxPagesPerLease: 2, now: completedAt },
      options(store),
    )
    expect(completed).toMatchObject({
      claimed: true,
      status: { status: "SENT", rowCount: 3, chunkCount: 3, attempts: 0, ready: true },
    })
    const persistedChunks = store.events.filter(
      (event) => event.eventType === "inventory.history.export.chunk.persisted",
    )
    expect(persistedChunks).toHaveLength(3)
    for (const event of persistedChunks) {
      expect(asRecord(asRecord(event.payload).encrypted).ciphertext).toBeUndefined()
    }
    expect(store.artifacts.size).toBe(3)
    expect(store.maxArtifactReadsInFlight).toBe(1)

    const duplicate = await processInventoryHistoryBackgroundExportJob(
      { organizationId: "org-1", jobId: queued.jobId, workerId: "worker-c", now: completedAt },
      options(store),
    )
    expect(duplicate.claimed).toBe(false)
    expect(store.events.filter((event) => event.eventType === "inventory.history.export.completed")).toHaveLength(1)

    const grant = await createInventoryHistoryExportDownloadGrant(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["reports.export", "inventory.levels.read"],
        jobId: queued.jobId,
        lastAuthAt: NOW,
        now: completedAt,
      },
      options(store),
    )
    const download = await streamInventoryHistoryExportDownload(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["reports.export", "inventory.levels.read"],
        token: grant.token,
        now: completedAt,
      },
      options(store),
    )
    let content = ""
    for await (const chunk of download.stream) content += chunk
    const lines = content.trimEnd().split("\n").map((line) => JSON.parse(line))
    const contentHash = `sha256:${createHash("sha256").update(content).digest("hex")}`

    expect(lines[0]).toMatchObject({
      type: "stoquify.inventory-history-export",
      rowCount: 3,
      organizationId: "org-1",
    })
    expect(lines.slice(1).map((value) => value.id)).toEqual(["tx-1", "tx-2", "tx-3"])
    expect(contentHash).toBe(download.contentHash)
    expect(Buffer.byteLength(content, "utf8")).toBe(download.byteLength)
    expect(store.artifactReads).toBe(6)
    expect(store.maxArtifactReadsInFlight).toBe(1)

    await expect(streamInventoryHistoryExportDownload(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["reports.export", "inventory.levels.read"],
        token: `${grant.token}tampered`,
        now: completedAt,
      },
      options(store),
    )).rejects.toThrow("token is invalid")
  })

  it("keeps checkpoint metadata constant-sized across one hundred persisted chunks", async () => {
    const store = new ExportStore()
    mockedReadHistory.mockImplementation(async (input) => {
      const cursor = input.filters?.cursor
      const index = cursor ? Number(cursor.replace("cursor-", "")) : 0
      return page(
        [row("tx-" + index)],
        index < 100 ? "cursor-" + (index + 1) : null,
      )
    })

    const queued = await enqueueInventoryHistoryBackgroundExport(request(), options(store))
    await processInventoryHistoryBackgroundExportJob(
      {
        organizationId: "org-1",
        jobId: queued.jobId,
        workerId: "worker-1",
        maxPagesPerLease: 1,
        now: NOW,
      },
      options(store),
    )
    const oneChunkMetadata = JSON.stringify(store.outboxes[0].metadata)

    const hundredChunkCheckpoint = await processInventoryHistoryBackgroundExportJob(
      {
        organizationId: "org-1",
        jobId: queued.jobId,
        workerId: "worker-2",
        maxPagesPerLease: 99,
        now: NOW,
      },
      options(store),
    )
    expect(hundredChunkCheckpoint).toMatchObject({
      status: { status: "PENDING", rowCount: 100, chunkCount: 100 },
    })
    const hundredChunkMetadata = JSON.stringify(store.outboxes[0].metadata)
    expect(asRecord(store.outboxes[0].metadata).chunkReferences).toBeUndefined()
    expect(Math.abs(Buffer.byteLength(hundredChunkMetadata) - Buffer.byteLength(oneChunkMetadata)))
      .toBeLessThan(256)

    const completed = await processInventoryHistoryBackgroundExportJob(
      {
        organizationId: "org-1",
        jobId: queued.jobId,
        workerId: "worker-3",
        maxPagesPerLease: 1,
        now: new Date("2026-07-15T09:01:00.000Z"),
      },
      options(store),
    )
    expect(completed).toMatchObject({
      status: { status: "SENT", rowCount: 101, chunkCount: 101, ready: true },
    })
    expect(store.artifacts.size).toBe(101)
    expect(store.events.filter(
      (event) => event.eventType === "inventory.history.export.chunk.persisted",
    )).toHaveLength(101)
    expect(store.maxArtifactReadsInFlight).toBe(1)
  })

  it("dead-letters a job when snapshot continuity fails on its final attempt", async () => {
    const store = new ExportStore()
    mockedReadHistory.mockImplementation(async (input) => {
      if (!input.filters?.cursor) return page([row("tx-1")], "cursor-1")
      return page([row("tx-2")], null, {
        snapshot: {
          recordedThrough: "2026-07-15T09:02:00.000Z",
          generatedAt: "2026-07-15T09:02:00.000Z",
          timezone: "Africa/Douala",
        },
      })
    })

    const queued = await enqueueInventoryHistoryBackgroundExport(
      request({ maxAttempts: 1 }),
      options(store),
    )
    const result = await processInventoryHistoryBackgroundExportJob(
      { organizationId: "org-1", jobId: queued.jobId, workerId: "worker-a", now: NOW },
      options(store),
    )

    expect(result).toMatchObject({
      claimed: true,
      status: { status: "DEAD_LETTER", attempts: 1, ready: false, retryable: false },
    })
    expect(store.events.filter((event) => event.eventType === "inventory.history.export.completed")).toHaveLength(0)
    expect(store.audits).toContainEqual(expect.objectContaining({
      action: "INVENTORY_HISTORY_BACKGROUND_EXPORT_DEAD_LETTERED",
    }))
  })

  it("crypto-shreds immediately and retries failed artifact deletion", async () => {
    const store = new ExportStore()
    mockedReadHistory.mockResolvedValue(page([row("tx-1")], null))
    const queued = await enqueueInventoryHistoryBackgroundExport(
      request({ retentionSeconds: 300 }),
      options(store),
    )
    const completedAt = new Date("2026-07-15T09:01:00.000Z")
    await processInventoryHistoryBackgroundExportJob(
      { organizationId: "org-1", jobId: queued.jobId, workerId: "worker-a", now: completedAt },
      options(store),
    )
    const grant = await createInventoryHistoryExportDownloadGrant(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["reports.export", "inventory.levels.read"],
        jobId: queued.jobId,
        lastAuthAt: NOW,
        now: completedAt,
      },
      options(store),
    )

    const expiredAt = new Date("2026-07-15T09:06:00.000Z")
    store.failArtifactDeletes = true
    await expect(expireInventoryHistoryBackgroundExports(
      { organizationId: "org-1", workerId: "expiry-worker", now: expiredAt },
      options(store),
    )).resolves.toEqual({ scannedCount: 1, expiredCount: 1 })
    expect(store.outboxes[0].status).toBe("FAILED")
    expect(asRecord(store.outboxes[0].metadata)).toMatchObject({
      state: "EXPIRED",
      wrappedDataKey: null,
      cryptoShreddedAt: expiredAt.toISOString(),
      artifactDeletionState: "PENDING",
      artifactDeletedAt: null,
    })
    expect(store.artifacts.size).toBe(1)

    store.failArtifactDeletes = false
    const cleanupAt = new Date("2026-07-15T09:11:00.000Z")
    await expect(expireInventoryHistoryBackgroundExports(
      { organizationId: "org-1", workerId: "cleanup-worker", now: cleanupAt },
      options(store),
    )).resolves.toEqual({ scannedCount: 1, expiredCount: 1 })
    expect(store.outboxes[0].status).toBe("CANCELLED")
    expect(asRecord(store.outboxes[0].metadata)).toMatchObject({
      state: "EXPIRED",
      wrappedDataKey: null,
      artifactDeletionState: "COMPLETE",
      artifactDeletedAt: cleanupAt.toISOString(),
    })
    expect(store.artifacts.size).toBe(0)

    await expect(streamInventoryHistoryExportDownload(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["reports.export", "inventory.levels.read"],
        token: grant.token,
        now: expiredAt,
      },
      options(store),
    )).rejects.toThrow("expired or out of scope")
  })

  it("audits dual-permission and fresh-auth denials before reading history", async () => {
    const store = new ExportStore()

    await expect(enqueueInventoryHistoryBackgroundExport(
      request({ actorPermissions: ["reports.export"] }),
      options(store),
    )).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(store.audits).toContainEqual(expect.objectContaining({
      action: "INVENTORY_HISTORY_EXPORT_CONTROL_DENIED",
      changes: expect.objectContaining({
        reasonCode: "MISSING_INVENTORY_HISTORY_READ_PERMISSION",
      }),
    }))

    await expect(enqueueInventoryHistoryBackgroundExport(
      request({ idempotencyKey: "request-002", lastAuthAt: null }),
      options(store),
    )).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
    expect(mockedReadHistory).not.toHaveBeenCalled()

    await expect(getInventoryHistoryBackgroundExportStatus(
      {
        organizationId: "org-1",
        actorPermissions: ["reports.export"],
        jobId: "job-1",
        now: NOW,
      },
      options(store),
    )).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("detects persisted payload tampering before exposing status", async () => {
    const store = new ExportStore()
    mockedReadHistory.mockResolvedValue(page([row("tx-1")], null))
    const queued = await enqueueInventoryHistoryBackgroundExport(request(), options(store))
    const job = store.outboxes[0]
    job.payload = { ...asRecord(job.payload), maximumRows: 999_999 }

    await expect(getInventoryHistoryBackgroundExportStatus(
      {
        organizationId: "org-1",
        actorPermissions: ["reports.export", "inventory.levels.read"],
        jobId: queued.jobId,
        now: NOW,
      },
      options(store),
    )).rejects.toThrow("payload integrity check failed")
    expect(job.payloadHash).not.toBe(hashBusinessPayload(job.payload))
  })
})
