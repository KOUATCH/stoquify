jest.mock("server-only", () => ({}))

jest.mock("@/services/customer/customer.service", () => ({ createCustomer: jest.fn() }))
jest.mock("@/services/supplier/supplier.service", () => ({ createSupplier: jest.fn() }))
jest.mock("@/services/item/item.service", () => ({ createItem: jest.fn() }))

jest.mock("@/prisma/db", () => {
  const delegate = () => ({
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  })
  return {
    db: {
      onboardingImportBatch: delegate(),
      onboardingImportMapping: { ...delegate(), aggregate: jest.fn() },
      onboardingImportRow: delegate(),
      onboardingReadinessMilestone: delegate(),
      customer: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
      supplier: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
      item: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    },
  }
})

import {
  buildMasterDataApprovalDigest,
  buildMasterDataEvidenceManifest,
  commitMasterDataImport,
  createMasterDataImportMapping,
} from "../master-data-import.service"
import { defaultFieldMap } from "../master-data-csv"

const mockDb = (jest.requireMock("@/prisma/db") as {
  db: {
    onboardingImportBatch: { findFirst: jest.Mock }
    onboardingImportMapping: { aggregate: jest.Mock; create: jest.Mock }
  }
}).db
const mockBatchDelegate = mockDb.onboardingImportBatch
const mockCreateCustomer = (jest.requireMock("@/services/customer/customer.service") as { createCustomer: jest.Mock }).createCustomer
const mockCreateSupplier = (jest.requireMock("@/services/supplier/supplier.service") as { createSupplier: jest.Mock }).createSupplier
const mockCreateItem = (jest.requireMock("@/services/item/item.service") as { createItem: jest.Mock }).createItem

function batch(overrides: Record<string, unknown> = {}) {
  const value = {
    id: "batch-1",
    organizationId: "org-1",
    target: "CUSTOMER",
    status: "VALIDATED",
    sourceFilename: "customers.csv",
    sourceMimeType: "text/csv",
    sourceByteSize: 100,
    contentHash: `sha256:${"a".repeat(64)}`,
    mappingId: "mapping-1",
    mappingVersion: 1,
    schemaVersion: "1",
    sourceRecordCount: 1,
    validRecordCount: 1,
    errorRecordCount: 0,
    duplicateRecordCount: 0,
    sourceRequiredFieldTotals: { code: 1, name: 1 },
    preCommitRecordCount: null,
    postCommitRecordCount: null,
    destinationRequiredTotals: null,
    committedRecordCount: 0,
    uploadedById: "maker-1",
    uploadedAt: new Date("2026-08-15T10:00:00.000Z"),
    validatedAt: new Date("2026-08-15T10:00:00.000Z"),
    approvedById: null,
    approvedAt: null,
    approvalDigest: "",
    commitStartedAt: null,
    committedAt: null,
    replayCount: 0,
    lastReplayedAt: null,
    evidenceManifest: null,
    evidenceHash: null,
    lastSafeErrorCode: null,
    retentionExpiresAt: new Date("2026-09-14T10:00:00.000Z"),
    createdAt: new Date("2026-08-15T10:00:00.000Z"),
    updatedAt: new Date("2026-08-15T10:00:00.000Z"),
    mapping: { id: "mapping-1", requiredFields: ["code", "name"] },
    rows: [],
    issues: [],
    ...overrides,
  }
  value.approvalDigest = typeof overrides.approvalDigest === "string"
    ? overrides.approvalDigest
    : buildMasterDataApprovalDigest(value as never)
  return value
}

describe("master-data approval and replay guards", () => {
  beforeEach(() => jest.clearAllMocks())

  it("refuses commit without a recorded explicit approval", async () => {
    const record = batch()
    mockBatchDelegate.findFirst.mockResolvedValue(record)
    await expect(commitMasterDataImport({
      organizationId: "org-1",
      batchId: "batch-1",
      expectedTarget: "CUSTOMER",
      actorId: "approver-1",
      expectedApprovalDigest: record.approvalDigest,
    })).rejects.toThrow("Commit requires the current explicit approval")
    expect(mockCreateCustomer).not.toHaveBeenCalled()
  })

  it("refuses a batch target outside the permission-scoped command", async () => {
    const record = batch({
      approvedById: "approver-1",
      approvedAt: new Date("2026-08-15T10:05:00.000Z"),
    })
    mockBatchDelegate.findFirst.mockResolvedValue(record)
    await expect(commitMasterDataImport({
      organizationId: "org-1",
      batchId: "batch-1",
      expectedTarget: "ITEM",
      actorId: "approver-1",
      expectedApprovalDigest: record.approvalDigest,
    })).rejects.toThrow("batch target does not match")
    expect(mockCreateCustomer).not.toHaveBeenCalled()
  })

  it("returns a committed batch on replay without calling a domain writer", async () => {
    const record = batch({
      status: "COMMITTED",
      approvedById: "approver-1",
      approvedAt: new Date("2026-08-15T10:05:00.000Z"),
      committedAt: new Date("2026-08-15T10:06:00.000Z"),
      committedRecordCount: 1,
      rows: [{ committedRecordId: "customer-1" }],
    })
    mockBatchDelegate.findFirst.mockResolvedValue(record)
    const result = await commitMasterDataImport({
      organizationId: "org-1",
      batchId: "batch-1",
      expectedTarget: "CUSTOMER",
      actorId: "approver-1",
      expectedApprovalDigest: record.approvalDigest,
    })
    expect(result).toMatchObject({ status: "COMMITTED", replayed: true, committedRecordIds: ["customer-1"] })
    expect(mockCreateCustomer).not.toHaveBeenCalled()
    expect(mockCreateSupplier).not.toHaveBeenCalled()
    expect(mockCreateItem).not.toHaveBeenCalled()
  })

  it("creates an immutable next mapping version for the tenant and target", async () => {
    const mappingDelegate = mockDb.onboardingImportMapping
    mappingDelegate.aggregate.mockResolvedValue({ _max: { version: 2 } })
    mappingDelegate.create.mockImplementation(async ({ data }: { data: unknown }) => data)
    const result = await createMasterDataImportMapping({
      organizationId: "org-1",
      actorId: "user-1",
      target: "ITEM",
      fieldMap: defaultFieldMap("ITEM"),
    })
    expect(result).toMatchObject({ organizationId: "org-1", target: "ITEM", version: 3, schemaVersion: "1" })
  })

  it("builds an evidence manifest with controls and result ids but no staged row values", () => {
    const record = batch({
      status: "COMMITTED",
      preCommitRecordCount: 4,
      postCommitRecordCount: 5,
      destinationRequiredTotals: { code: 1, name: 1 },
      committedRecordCount: 1,
      rows: [{ committedRecordId: "customer-1", normalizedData: { name: "private customer name" } }],
    })
    const manifest = buildMasterDataEvidenceManifest(record as never)
    expect(manifest).toMatchObject({
      validation: { dryRunBusinessWrites: 0, sourceRecordCount: 1 },
      controls: { preCommitRecordCount: 4, postCommitRecordCount: 5, committedRecordCount: 1 },
      result: { committedRecordIds: ["customer-1"], readiness: "RECONCILED" },
    })
    expect(JSON.stringify(manifest)).not.toContain("private customer name")
  })
})
