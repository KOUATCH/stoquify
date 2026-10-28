import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import {
  createInventoryHistoryExportDownloadGrant,
  enqueueInventoryHistoryBackgroundExport,
  getInventoryHistoryBackgroundExportStatus,
} from "@/services/inventory/inventory-history-background-export.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import {
  createInventoryMovementHistoryBackgroundExportDownloadGrantAction,
  enqueueInventoryMovementHistoryBackgroundExportAction,
  getInventoryMovementHistoryBackgroundExportStatusAction,
} from "../inventoryMovementHistoryBackgroundExportActions"

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }

  return {
    RbacError: MockRbacError,
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
    assertCanUseOrganization: jest.fn(),
  }
})

jest.mock("@/lib/security/auth-session", () => {
  class MockFreshAuthRequiredError extends Error {
    constructor(message = "Fresh authentication required") {
      super(message)
      this.name = "FreshAuthRequiredError"
    }
  }

  return {
    FreshAuthRequiredError: MockFreshAuthRequiredError,
    requireFreshAuth: jest.fn(),
  }
})

jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))
jest.mock("@/services/inventory/inventory-history-background-export.service", () => ({
  INVENTORY_HISTORY_BACKGROUND_EXPORT_MAX_ROWS: 250_000,
  createInventoryHistoryExportDownloadGrant: jest.fn(),
  enqueueInventoryHistoryBackgroundExport: jest.fn(),
  getInventoryHistoryBackgroundExportStatus: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockEnqueue = enqueueInventoryHistoryBackgroundExport as jest.Mock
const mockGetStatus = getInventoryHistoryBackgroundExportStatus as jest.Mock
const mockCreateGrant = createInventoryHistoryExportDownloadGrant as jest.Mock

function rbacContext(permissions: string[], userId = "inventory-controller-1") {
  return {
    userId,
    orgId: "org-1",
    permissions,
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    user: {
      id: userId,
      roles: [],
      permissions,
      organizationId: "org-1",
    },
  }
}

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "inventory-controller-1",
    moduleSlug: "inventory",
    surfaceType: "action",
    surface: "inventory.history.background-export",
    accessIntent: "export",
    mode: "enforce",
    result: "allow",
    allowed: true,
    wouldBlock: false,
    reason: "Tenant module entitlement is available.",
    entitlement: {
      moduleSlug: "inventory",
      status: "active",
      source: "requested_modules",
      startsAt: null,
      endsAt: null,
      readOnly: false,
      trial: false,
    },
    missingDependencies: [],
    rbacWildcardPresent: false,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: true,
    evaluatedAt: "2026-07-15T09:00:00.000Z",
    ...overrides,
  }
}

const status = {
  jobId: "job-1",
  exportId: "export-1",
  status: "PENDING",
  rowCount: 100,
  chunkCount: 1,
  attempts: 0,
  maximumRows: 250_000,
  recordedThrough: "2026-07-15T09:00:00.000Z",
  expiresAt: "2026-07-16T09:00:00.000Z",
  contentHash: null,
  ready: false,
  retryable: true,
  expired: false,
}

describe("inventory movement history background export actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: new Date("2026-07-15T08:59:00.000Z").getTime() },
    })
    mockRequirePermission.mockResolvedValue(
      rbacContext(["reports.export", "inventory.levels.read"]),
    )
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
    mockEnqueue.mockResolvedValue(status)
    mockGetStatus.mockResolvedValue(status)
    mockCreateGrant.mockResolvedValue({
      jobId: "job-1",
      token: "signed-download-token",
      expiresAt: "2026-07-15T09:10:00.000Z",
      fileName: "inventory-history.ndjson",
      fileType: "application/x-ndjson",
      contentHash: "sha256:abc",
      byteLength: 123,
    })
  })

  it("requires fresh authentication before enqueue authorization", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await enqueueInventoryMovementHistoryBackgroundExportAction({
      idempotencyKey: "request-001",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      code: "FRESH_AUTH_REQUIRED",
      status: 403,
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it("derives tenant, actor, permissions, and fresh-auth evidence on enqueue", async () => {
    const result = await enqueueInventoryMovementHistoryBackgroundExportAction({
      organizationId: "client-org",
      actorId: "client-actor",
      actorPermissions: ["*"],
      idempotencyKey: "request-001",
      filters: { locationId: "location-1" },
      maximumRows: 25_000,
      retentionSeconds: 3_600,
      maxAttempts: 3,
    })

    expect(result.success).toBe(true)
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "inventory-controller-1",
      actorPermissions: ["reports.export", "inventory.levels.read"],
      lastAuthAt: new Date("2026-07-15T08:59:00.000Z"),
      now: expect.any(Date),
      idempotencyKey: "request-001",
      filters: { locationId: "location-1" },
      maximumRows: 25_000,
      retentionSeconds: 3_600,
      maxAttempts: 3,
    }))
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      moduleSlug: "inventory",
      surface: "inventory.history.background-export",
      accessIntent: "export",
      mode: "enforce",
    }))
  })

  it("rejects the uncertified one-million-row ceiling at the action boundary", async () => {
    const result = await enqueueInventoryMovementHistoryBackgroundExportAction({
      idempotencyKey: "request-001",
      maximumRows: 1_000_000,
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      code: "VALIDATION_ERROR",
    }))
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it("rejects continuation cursors at the enqueue boundary", async () => {
    const result = await enqueueInventoryMovementHistoryBackgroundExportAction({
      idempotencyKey: "request-001",
      filters: { cursor: "client-controlled-cursor" },
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      code: "VALIDATION_ERROR",
    }))
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it("polls status within the trusted tenant and current permission scope", async () => {
    const result = await getInventoryMovementHistoryBackgroundExportStatusAction({
      organizationId: "client-org",
      jobId: "job-1",
    })

    expect(result.success).toBe(true)
    expect(mockGetStatus).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorPermissions: ["reports.export", "inventory.levels.read"],
      jobId: "job-1",
    })
    expect(mockRequireFreshAuth).not.toHaveBeenCalled()
  })

  it("issues download grants only with fresh trusted actor context", async () => {
    const result = await createInventoryMovementHistoryBackgroundExportDownloadGrantAction({
      organizationId: "client-org",
      actorId: "client-actor",
      jobId: "job-1",
      grantSeconds: 120,
    })

    expect(result.success).toBe(true)
    expect(mockCreateGrant).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "inventory-controller-1",
      actorPermissions: ["reports.export", "inventory.levels.read"],
      lastAuthAt: new Date("2026-07-15T08:59:00.000Z"),
      now: expect.any(Date),
      jobId: "job-1",
      grantSeconds: 120,
    }))
  })

  it("blocks enqueue when the inventory module is not entitled", async () => {
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({
      result: "deny",
      allowed: false,
      wouldBlock: true,
      reason: "Tenant is not entitled to this module.",
      entitlement: null,
    }))

    const result = await enqueueInventoryMovementHistoryBackgroundExportAction({
      idempotencyKey: "request-001",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      code: "FORBIDDEN",
      status: 403,
    }))
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it("returns a client-safe RBAC denial without querying export state", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getInventoryMovementHistoryBackgroundExportStatusAction({ jobId: "job-1" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      code: "FORBIDDEN",
      status: 403,
    }))
    expect(mockGetStatus).not.toHaveBeenCalled()
  })
})
