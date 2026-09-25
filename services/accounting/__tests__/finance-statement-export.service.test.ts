import { db } from "@/prisma/db"
import {
  buildFinanceStatementExportManifest,
  financeStatementExportJobReceiptSchema,
} from "@/components/DataTableComponents/finance-accounting-contracts"
import {
  completeFinanceStatementExportJob,
  enqueueFinanceStatementExport,
  getFinanceStatementExportJobStatus,
  runFinanceStatementExportWorker,
} from "../finance-statement-export.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    businessEvent: { findUnique: jest.fn() },
    businessEventOutbox: { findFirst: jest.fn() },
  },
}))

jest.mock("@/services/controls/sensitive-action.service", () => ({
  evaluateAndAuditSensitiveAction: jest.fn(async () => ({ allowed: true, decisionId: "decision-1" })),
  assertSensitiveActionAllowed: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "payload-hash"),
  recordBusinessEventInTx: jest.fn(),
}))

const mockDb = db as unknown as {
  $transaction: jest.Mock
  businessEvent: { findUnique: jest.Mock }
  businessEventOutbox: { findFirst: jest.Mock }
}

function manifest() {
  return buildFinanceStatementExportManifest({
    contract: undefined,
    organizationId: "org-1",
    query: { search: "", filters: {}, sort: [], pageIndex: 0, pageSize: 25 },
    selection: { kind: "all-matching", excludedRowIds: [], queryFingerprint: "fingerprint", resultCount: { kind: "known", total: 1500 } },
    columns: ["paymentNumber", "amount"],
    locale: "en",
    timeZone: "UTC",
    format: "csv",
    financeContext: {
      entityId: "org-1",
      entityName: "Demo organization",
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-28T23:59:59.999Z",
      currency: "XAF",
      sourceReadModel: "finance-dashboard.recent-payments",
      evidenceRoute: "/dashboard/finance/payments",
    },
    matchingRows: 1500,
    clientRequestId: "request-1",
    requestedAt: "2026-08-28T10:00:00.000Z",
  })
}

describe("finance statement export queue", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("queues a large manifest as an audited tenant-scoped receipt", async () => {
    const job = {
      id: "job-1",
      organizationId: "org-1",
      channel: "REPORT_EXPORT",
      eventName: "finance.statement.export.requested",
      idempotencyKey: "request-1:job",
      payloadHash: "payload-hash",
      payload: manifest(),
      metadata: { schemaVersion: 1, state: "accepted", acceptedAt: "2026-08-28T10:00:00.000Z" },
      status: "PENDING",
      attempts: 0,
      maxAttempts: 5,
      availableAt: new Date("2026-08-28T10:00:00.000Z"),
      lockedAt: null,
      lockedBy: null,
      processedAt: null,
    }
    const tx = {
      businessEvent: { findUnique: jest.fn().mockResolvedValue(null) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    }
    mockDb.$transaction.mockImplementation(async (callback) => callback(tx))
    const events = require("@/services/events/business-event.service") as { recordBusinessEventInTx: jest.Mock }
    events.recordBusinessEventInTx.mockResolvedValue({ event: { outboxMessages: [job] }, created: true })

    const receipt = await enqueueFinanceStatementExport({
      organizationId: "org-1",
      actorId: "controller-1",
      actorPermissions: ["accounting.exports.create"],
      lastAuthAt: new Date("2026-08-28T09:59:00.000Z"),
      manifest: manifest(),
      now: new Date("2026-08-28T10:00:00.000Z"),
    })

    expect(receipt).toEqual({ schemaVersion: 1, clientRequestId: "request-1", jobId: "job-1", status: "accepted", acceptedAt: "2026-08-28T10:00:00.000Z" })
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "FINANCE_STATEMENT_EXPORT_QUEUED", organizationId: "org-1" }) }))
    expect(financeStatementExportJobReceiptSchema.parse(receipt)).toEqual(receipt)
    const controls = require("@/services/controls/sensitive-action.service") as { evaluateAndAuditSensitiveAction: jest.Mock }
    expect(controls.evaluateAndAuditSensitiveAction).toHaveBeenCalledWith(tx, expect.objectContaining({
      exportContext: expect.objectContaining({ watermarkId: "stoquify:org-1:finance-statement-export:request-1" }),
    }))
    expect(events.recordBusinessEventInTx).toHaveBeenCalledWith(tx, expect.objectContaining({
      metadata: expect.objectContaining({ watermarkId: "stoquify:org-1:finance-statement-export:request-1" }),
    }))
  })

  it("reads only a matching tenant job and maps queue failure state safely", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue({
      id: "job-2",
      organizationId: "org-1",
      channel: "REPORT_EXPORT",
      eventName: "finance.statement.export.requested",
      payload: manifest(),
      metadata: { schemaVersion: 1, state: "failed", acceptedAt: "2026-08-28T10:00:00.000Z", failureCode: "WORKER_FAILED" },
      status: "DEAD_LETTER",
      availableAt: new Date("2026-08-28T10:00:00.000Z"),
    })

    await expect(getFinanceStatementExportJobStatus({ organizationId: "org-1", jobId: "job-2" })).resolves.toMatchObject({ jobId: "job-2", status: "failed" })
    expect(mockDb.businessEventOutbox.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", id: "job-2" }) }))
  })

  it.each([
    ["csv", "text/csv"],
    ["json", "application/json"],
  ])("completes a worker-owned %s export with its matching content type", async (format, contentType) => {
    const job = {
      id: "job-3",
      organizationId: "org-1",
      channel: "REPORT_EXPORT",
      eventName: "finance.statement.export.requested",
      payload: { ...manifest(), format },
      metadata: { schemaVersion: 1, state: "accepted", acceptedAt: "2026-08-28T10:00:00.000Z" },
      status: "LOCKED",
      attempts: 1,
      maxAttempts: 5,
      availableAt: new Date("2026-08-28T10:00:00.000Z"),
      lockedAt: new Date("2026-08-28T10:01:00.000Z"),
      lockedBy: "worker-1",
      processedAt: null,
    }
    const tx = {
      businessEventOutbox: {
        findFirst: jest.fn().mockResolvedValue(job),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    }
    mockDb.$transaction.mockImplementation(async (callback) => callback(tx))

    const receipt = await completeFinanceStatementExportJob({
      organizationId: "org-1",
      jobId: "job-3",
      workerId: "worker-1",
      completedAt: new Date("2026-08-28T10:02:00.000Z"),
      artifact: {
        provider: "azure-blob",
        key: `org-1/exports/job-3.${format}`,
        contentType,
        byteLength: 2048,
        contentHash: `sha256:${"a".repeat(64)}`,
        expiresAt: "2026-09-04T10:02:00.000Z",
      },
    })

    expect(receipt).toMatchObject({ jobId: "job-3", status: "completed", completedAt: "2026-08-28T10:02:00.000Z" })
    expect(receipt.artifact).toMatchObject({ provider: "azure-blob", key: `org-1/exports/job-3.${format}`, contentHash: `sha256:${"a".repeat(64)}` })
    expect(tx.businessEventOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-1", lockedBy: "worker-1", status: "LOCKED" }),
      data: expect.objectContaining({ metadata: expect.objectContaining({ state: "completed" }) }),
    }))
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "FINANCE_STATEMENT_EXPORT_COMPLETED", organizationId: "org-1" }) }))
    expect(financeStatementExportJobReceiptSchema.parse(receipt)).toEqual(receipt)
  })

  it("rejects completion from a worker that does not own the lease", async () => {
    const tx = {
      businessEventOutbox: {
        findFirst: jest.fn().mockResolvedValue({
          id: "job-4",
          organizationId: "org-1",
          channel: "REPORT_EXPORT",
          eventName: "finance.statement.export.requested",
          payload: manifest(),
          metadata: { schemaVersion: 1, state: "accepted", acceptedAt: "2026-08-28T10:00:00.000Z" },
          status: "LOCKED",
          attempts: 1,
          maxAttempts: 5,
          availableAt: new Date("2026-08-28T10:00:00.000Z"),
          lockedAt: new Date("2026-08-28T10:01:00.000Z"),
          lockedBy: "worker-1",
          processedAt: null,
        }),
        updateMany: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    }
    mockDb.$transaction.mockImplementation(async (callback) => callback(tx))

    await expect(completeFinanceStatementExportJob({
      organizationId: "org-1",
      jobId: "job-4",
      workerId: "worker-2",
      artifact: {
        provider: "azure-blob",
        key: "org-1/exports/job-4.csv",
        contentType: "text/csv",
        byteLength: 2048,
        contentHash: `sha256:${"b".repeat(64)}`,
        expiresAt: "2026-09-04T10:02:00.000Z",
      },
    })).rejects.toThrow("not owned by this worker lease")
    expect(tx.businessEventOutbox.updateMany).not.toHaveBeenCalled()
  })

  it("runs only the finance export event through render, completion, and delivery acknowledgement", async () => {
    const queuedJob = {
      id: "job-5",
      organizationId: "org-1",
      businessEventId: "event-5",
      channel: "REPORT_EXPORT",
      eventName: "finance.statement.export.requested",
      destination: null,
      idempotencyKey: "request-5:job",
      payloadHash: "payload-hash",
      payload: manifest(),
      status: "PENDING",
      attempts: 0,
      maxAttempts: 5,
      availableAt: new Date("2026-08-28T10:00:00.000Z"),
      lockedAt: null,
      lockedBy: null,
      correlationId: null,
    }
    const claimedJob = {
      ...queuedJob,
      status: "LOCKED",
      attempts: 1,
      lockedAt: new Date("2026-08-28T10:01:00.000Z"),
      lockedBy: "worker-1",
      metadata: { schemaVersion: 1, state: "accepted", acceptedAt: "2026-08-28T10:00:00.000Z" },
      processedAt: null,
      businessEvent: { eventSource: "SYSTEM", payloadHash: "event-hash", correlationId: null },
    }
    const tx = {
      businessEventOutbox: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(claimedJob)
          .mockResolvedValueOnce(claimedJob),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      businessEventAudit: { create: jest.fn().mockResolvedValue({}) },
    }
    const workerClient = {
      businessEventOutbox: {
        findMany: jest.fn().mockResolvedValue([queuedJob]),
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        groupBy: jest.fn(),
      },
      businessEventAudit: { create: jest.fn() },
      $transaction: jest.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
    }
    const buildArtifact = jest.fn().mockResolvedValue({
      provider: "azure-blob",
      key: "org-1/exports/job-5.csv",
      contentType: "text/csv",
      byteLength: 2048,
      contentHash: `sha256:${"c".repeat(64)}`,
      expiresAt: "2026-09-04T10:02:00.000Z",
    })

    const results = await runFinanceStatementExportWorker({
      organizationId: "org-1",
      workerId: "worker-1",
      now: new Date("2026-08-28T10:02:00.000Z"),
      buildArtifact,
    }, { client: workerClient as unknown as typeof db })

    expect(results).toHaveLength(1)
    expect(buildArtifact).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", jobId: "job-5", manifest: manifest() }))
    expect(workerClient.businessEventOutbox.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ eventName: { in: ["finance.statement.export.requested"] } }) }))
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "FINANCE_STATEMENT_EXPORT_COMPLETED" }) }))
    expect(tx.businessEventAudit.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "OUTBOX_DELIVERED" }) }))
  })
})
