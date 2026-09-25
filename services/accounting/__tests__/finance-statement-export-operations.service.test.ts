import { db } from "@/prisma/db"

import {
  getFinanceStatementExportOperationsSnapshot,
  listFinanceStatementExportRetentionCandidates,
  readFinanceStatementExportRuntimeConfiguration,
  resolveFinanceStatementExportRuntimeReadiness,
} from "../finance-statement-export-operations.service"

jest.mock("@/prisma/db", () => ({
  db: {
    businessEventOutbox: { findMany: jest.fn() },
  },
}))

const mockDb = db as unknown as {
  businessEventOutbox: { findMany: jest.Mock }
}

describe("finance statement export operations", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.STOQUIFY_FINANCE_EXPORT_RENDERER_ID
    delete process.env.STOQUIFY_FINANCE_EXPORT_ARTIFACT_PROVIDER
    delete process.env.STOQUIFY_FINANCE_EXPORT_ARTIFACT_APPROVAL_REFERENCE
    delete process.env.STOQUIFY_FINANCE_EXPORT_DOWNLOAD_GRANT_POLICY
    delete process.env.STOQUIFY_FINANCE_EXPORT_RETENTION_POLICY
  })

  it("keeps production readiness false until every deployment-owned capability is declared", () => {
    expect(resolveFinanceStatementExportRuntimeReadiness()).toEqual({
      ready: false,
      renderer: { configured: false, id: null },
      artifactStore: { configured: false, provider: null, approvalReference: null },
      downloadGrant: { configured: false, policy: null },
      retention: { configured: false, policy: null },
      missing: ["renderer", "artifactStore", "downloadGrant", "retention"],
    })

    expect(resolveFinanceStatementExportRuntimeReadiness({
      rendererId: "finance-renderer-v1",
      artifactProvider: "approved-provider",
      artifactProviderApprovalReference: "change://controls/finance-export-provider-v1",
      downloadGrantPolicy: "tenant-actor-bound-v1",
      retentionPolicy: "finance-export-7d-v1",
    }).ready).toBe(true)
  })

  it("reads only non-secret deployment capability names from the environment", () => {
    process.env.STOQUIFY_FINANCE_EXPORT_RENDERER_ID = " finance-renderer-v1 "
    process.env.STOQUIFY_FINANCE_EXPORT_ARTIFACT_PROVIDER = "approved-provider"
    process.env.STOQUIFY_FINANCE_EXPORT_ARTIFACT_APPROVAL_REFERENCE = "change://controls/finance-export-provider-v1"
    process.env.STOQUIFY_FINANCE_EXPORT_DOWNLOAD_GRANT_POLICY = "tenant-actor-bound-v1"
    process.env.STOQUIFY_FINANCE_EXPORT_RETENTION_POLICY = "finance-export-7d-v1"

    expect(readFinanceStatementExportRuntimeConfiguration()).toEqual({
      rendererId: "finance-renderer-v1",
      artifactProvider: "approved-provider",
      artifactProviderApprovalReference: "change://controls/finance-export-provider-v1",
      downloadGrantPolicy: "tenant-actor-bound-v1",
      retentionPolicy: "finance-export-7d-v1",
    })
  })

  it("reports tenant-scoped queue and expired-artifact counts without returning export content", async () => {
    mockDb.businessEventOutbox.findMany.mockResolvedValue([
      { status: "PENDING", createdAt: new Date("2026-08-28T10:00:00.000Z"), metadata: {} },
      { status: "LOCKED", createdAt: new Date("2026-08-28T10:01:00.000Z"), metadata: {} },
      { status: "SENT", createdAt: new Date("2026-08-28T10:02:00.000Z"), metadata: { state: "completed", artifact: { provider: "approved-provider", key: "opaque/job-1.csv", contentType: "text/csv", byteLength: 2048, contentHash: `sha256:${"a".repeat(64)}`, expiresAt: "2026-08-28T11:00:00.000Z" } } },
      { status: "DEAD_LETTER", createdAt: new Date("2026-08-28T10:03:00.000Z"), metadata: { state: "failed" } },
    ])

    await expect(getFinanceStatementExportOperationsSnapshot({
      organizationId: "org-1",
      now: new Date("2026-08-28T12:00:00.000Z"),
      client: db as unknown as typeof db,
    })).resolves.toMatchObject({
      organizationId: "org-1",
      queue: {
        pendingCount: 1,
        lockedCount: 1,
        failedCount: 1,
        completedCount: 1,
        expiredArtifactCount: 1,
        oldestPendingAt: "2026-08-28T10:00:00.000Z",
      },
    })
    expect(mockDb.businessEventOutbox.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-1", channel: "REPORT_EXPORT" }),
      select: { status: true, createdAt: true, metadata: true },
    }))
  })

  it("returns only expired completed artifact references for deployment-owned cleanup", async () => {
    mockDb.businessEventOutbox.findMany.mockResolvedValue([
      {
        id: "job-expired",
        metadata: {
          state: "completed",
          artifact: {
            provider: "approved-provider",
            key: "opaque/job-expired.csv",
            contentType: "text/csv",
            byteLength: 2048,
            contentHash: `sha256:${"b".repeat(64)}`,
            expiresAt: "2026-08-28T11:00:00.000Z",
          },
        },
      },
      {
        id: "job-live",
        metadata: {
          state: "completed",
          artifact: {
            provider: "approved-provider",
            key: "opaque/job-live.csv",
            contentType: "text/csv",
            byteLength: 2048,
            contentHash: `sha256:${"c".repeat(64)}`,
            expiresAt: "2026-08-29T11:00:00.000Z",
          },
        },
      },
    ])

    await expect(listFinanceStatementExportRetentionCandidates({
      organizationId: "org-1",
      now: new Date("2026-08-28T12:00:00.000Z"),
      client: db as unknown as typeof db,
    })).resolves.toEqual([{
      organizationId: "org-1",
      jobId: "job-expired",
      provider: "approved-provider",
      key: "opaque/job-expired.csv",
      contentHash: `sha256:${"b".repeat(64)}`,
      byteLength: 2048,
      expiresAt: "2026-08-28T11:00:00.000Z",
    }])
  })
})
