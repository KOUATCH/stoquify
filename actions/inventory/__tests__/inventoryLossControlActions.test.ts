import {
  createStockCountSessionAction,
  postStockAdjustmentAction,
  postStockCountAction,
  submitStockCountSessionAction,
} from "../inventoryLossControlActions"

import { requirePermission } from "@/lib/security/rbac"
import { postStockAdjustment } from "@/services/inventory/inventory-adjustment.service"
import {
  createStockCountSession,
  postStockCount,
  submitStockCountSession,
} from "@/services/inventory/inventory-count.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

jest.mock("@/lib/error-handling", () => ({
  inventoryAction: (handler: unknown) => handler,
}))

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/services/inventory/inventory-count.service", () => ({
  createStockCountSession: jest.fn(),
  submitStockCountSession: jest.fn(),
  postStockCount: jest.fn(),
}))

jest.mock("@/services/inventory/inventory-adjustment.service", () => ({
  postStockAdjustment: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockCreateStockCountSession = createStockCountSession as jest.Mock
const mockSubmitStockCountSession = submitStockCountSession as jest.Mock
const mockPostStockCount = postStockCount as jest.Mock
const mockPostStockAdjustment = postStockAdjustment as jest.Mock

const countDate = new Date("2026-08-01T08:00:00.000Z")
const submittedAt = new Date("2026-08-01T09:00:00.000Z")
const approvedAt = new Date("2026-08-01T10:00:00.000Z")

function decimal(value: string) {
  return { toString: () => value }
}

function frozenCountSession() {
  return {
    id: "count-1",
    countNumber: "CNT-20260801-0001",
    status: "FROZEN",
    locationId: "location-1",
    countDate,
    snapshotHash: "sha256:snapshot",
    lines: [{ id: "line-1" }, { id: "line-2" }],
  }
}

function submittedCountSession() {
  return {
    ...frozenCountSession(),
    status: "SUBMITTED",
    submittedAt,
    countSheetHash: "sha256:count-sheet",
    lines: [
      { id: "line-1", varianceQuantity: decimal("2.000") },
      { id: "line-2", varianceQuantity: decimal("0.000") },
    ],
  }
}

function postedCountResult() {
  return {
    countSession: {
      ...submittedCountSession(),
      status: "POSTED",
      approvedAt,
      postedAt: approvedAt,
    },
    eventId: "event-count-1",
    idempotencyKey: "stock-count:count-1:validated",
    countSheetHash: "sha256:count-sheet",
    snapshotHash: "sha256:snapshot",
    varianceLineCount: 1,
    totalVarianceValue: "2500.00",
    generatedAdjustmentId: "adjustment-1",
    generatedAdjustmentEventId: "event-adjustment-1",
    generatedAdjustmentLedgerStatus: "POSTED",
    replayed: false,
  }
}

function postedAdjustmentResult() {
  return {
    adjustment: {
      id: "adjustment-1",
      adjustmentNumber: "ADJ-20260801-0001",
      type: "WRITE_OFF",
      status: "POSTED",
    },
    eventId: "event-adjustment-1",
    idempotencyKey: "inventory-adjustment:adjustment-1:posted",
    documentHash: "sha256:document",
    evidenceHash: "sha256:evidence",
    movementTransactionIds: ["movement-1"],
    ledger: {
      status: "POSTED",
      postingBatchId: "batch-1",
      journalEntryId: "journal-entry-1",
    },
    replayed: false,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequirePermission.mockResolvedValue({
    orgId: "org-session",
    userId: "user-session",
    permissions: ["inventory.stock.adjust"],
  })
  mockObserveModuleAccess.mockResolvedValue({ allowed: true })
  mockCreateStockCountSession.mockResolvedValue(frozenCountSession())
  mockSubmitStockCountSession.mockResolvedValue(submittedCountSession())
  mockPostStockCount.mockResolvedValue(postedCountResult())
  mockPostStockAdjustment.mockResolvedValue(postedAdjustmentResult())
})

function expectProtectedAccess(input: {
  resource: string
  resourceId?: string
  surface: string
}) {
  expect(mockRequirePermission).toHaveBeenCalledWith(
    "inventory.stock.adjust",
    {
      resource: input.resource,
      ...(input.resourceId ? { resourceId: input.resourceId } : {}),
      auditAllowed: true,
    },
  )
  expect(mockObserveModuleAccess).toHaveBeenCalledWith({
    organizationId: "org-session",
    userId: "user-session",
    actorPermissions: ["inventory.stock.adjust"],
    moduleSlug: "inventory",
    surfaceType: "action",
    surface:
      `actions/inventory/inventoryLossControlActions.ts:${input.surface}`,
    accessIntent: "write",
    mode: "enforce",
    audit: true,
  })
}

describe("inventory loss control actions", () => {
  it("creates a frozen stock count with server-owned tenant and actor identity", async () => {
    const result = await createStockCountSessionAction({
      organizationId: "org-session",
      createdById: "caller-user",
      locationId: "location-1",
      countDate,
      notes: "Weekly count",
      itemIds: ["item-1", "item-2"],
    })

    expectProtectedAccess({
      resource: "StockCountSession",
      surface: "createStockCountSessionAction",
    })
    expect(mockCreateStockCountSession).toHaveBeenCalledWith({
      createdById: "user-session",
      locationId: "location-1",
      countDate,
      notes: "Weekly count",
      itemIds: ["item-1", "item-2"],
      organizationId: "org-session",
    })
    expect(result).toEqual({
      success: true,
      data: {
        id: "count-1",
        countNumber: "CNT-20260801-0001",
        status: "FROZEN",
        locationId: "location-1",
        countDate: countDate.toISOString(),
        lineCount: 2,
        snapshotHash: "sha256:snapshot",
      },
    })
  })

  it("submits counted quantities through the service with server-owned submitter identity", async () => {
    const lines = [
      {
        lineId: "line-1",
        countedQuantity: "12.000",
        reasonCode: "COUNTED_HIGH",
        evidenceHash: "sha256:line-1",
      },
      {
        lineId: "line-2",
        countedQuantity: "5.000",
        evidenceHash: "sha256:line-2",
      },
    ]
    const result = await submitStockCountSessionAction({
      organizationId: "org-session",
      submittedById: "caller-user",
      countSessionId: "count-1",
      countSheetHash: "sha256:count-sheet",
      lines,
    })

    expectProtectedAccess({
      resource: "StockCountSession",
      resourceId: "count-1",
      surface: "submitStockCountSessionAction",
    })
    expect(mockSubmitStockCountSession).toHaveBeenCalledWith({
      submittedById: "user-session",
      countSessionId: "count-1",
      countSheetHash: "sha256:count-sheet",
      lines,
      organizationId: "org-session",
    })
    expect(result).toEqual({
      success: true,
      data: {
        id: "count-1",
        countNumber: "CNT-20260801-0001",
        status: "SUBMITTED",
        locationId: "location-1",
        submittedAt: submittedAt.toISOString(),
        countSheetHash: "sha256:count-sheet",
        lineCount: 2,
        varianceLineCount: 1,
      },
    })
  })

  it("posts a stock count through maker-checker service truth with the RBAC approver", async () => {
    const result = await postStockCountAction({
      organizationId: "org-session",
      approvedById: "caller-user",
      countSessionId: "count-1",
      idempotencyKey: "stock-count:count-1:validated",
      countSheetHash: "sha256:count-sheet",
      correlationId: "correlation-1",
    })

    expectProtectedAccess({
      resource: "StockCountSession",
      resourceId: "count-1",
      surface: "postStockCountAction",
    })
    expect(mockPostStockCount).toHaveBeenCalledWith({
      approvedById: "user-session",
      countSessionId: "count-1",
      idempotencyKey: "stock-count:count-1:validated",
      countSheetHash: "sha256:count-sheet",
      correlationId: "correlation-1",
      organizationId: "org-session",
    })
    expect(result).toEqual({
      success: true,
      data: {
        id: "count-1",
        countNumber: "CNT-20260801-0001",
        status: "POSTED",
        locationId: "location-1",
        approvedAt: approvedAt.toISOString(),
        postedAt: approvedAt.toISOString(),
        eventId: "event-count-1",
        idempotencyKey: "stock-count:count-1:validated",
        countSheetHash: "sha256:count-sheet",
        snapshotHash: "sha256:snapshot",
        varianceLineCount: 1,
        totalVarianceValue: "2500.00",
        generatedAdjustmentId: "adjustment-1",
        generatedAdjustmentEventId: "event-adjustment-1",
        generatedAdjustmentLedgerStatus: "POSTED",
        replayed: false,
      },
    })
  })

  it("posts a stock adjustment or write-off with server-owned approver identity", async () => {
    const result = await postStockAdjustmentAction({
      organizationId: "org-session",
      approvedById: "caller-user",
      adjustmentId: "adjustment-1",
      idempotencyKey: "inventory-adjustment:adjustment-1:posted",
      occurredAt: approvedAt,
      evidenceHash: "sha256:evidence",
      documentHash: "sha256:document",
    })

    expectProtectedAccess({
      resource: "StockAdjustment",
      resourceId: "adjustment-1",
      surface: "postStockAdjustmentAction",
    })
    expect(mockPostStockAdjustment).toHaveBeenCalledWith({
      approvedById: "user-session",
      adjustmentId: "adjustment-1",
      idempotencyKey: "inventory-adjustment:adjustment-1:posted",
      occurredAt: approvedAt,
      evidenceHash: "sha256:evidence",
      documentHash: "sha256:document",
      organizationId: "org-session",
    })
    expect(result).toEqual({
      success: true,
      data: {
        id: "adjustment-1",
        adjustmentNumber: "ADJ-20260801-0001",
        type: "WRITE_OFF",
        status: "POSTED",
        eventId: "event-adjustment-1",
        idempotencyKey: "inventory-adjustment:adjustment-1:posted",
        documentHash: "sha256:document",
        evidenceHash: "sha256:evidence",
        movementTransactionIds: ["movement-1"],
        ledgerStatus: "POSTED",
        postingBatchId: "batch-1",
        journalEntryId: "journal-entry-1",
        blockerCode: null,
        replayed: false,
      },
    })
  })

  it("rejects caller tenant mismatch before entitlement or service access", async () => {
    await expect(
      createStockCountSessionAction({
        organizationId: "other-org",
        locationId: "location-1",
      }),
    ).rejects.toThrow("Organization mismatch")

    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockCreateStockCountSession).not.toHaveBeenCalled()
  })

  it("does not evaluate entitlement or call services when RBAC denies access", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("permission denied"))

    await expect(
      postStockAdjustmentAction({ adjustmentId: "adjustment-1" }),
    ).rejects.toThrow("permission denied")

    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockPostStockAdjustment).not.toHaveBeenCalled()
  })

  it.each([
    [
      "create count",
      () => createStockCountSessionAction({ locationId: "location-1" }),
      mockCreateStockCountSession,
    ],
    [
      "submit count",
      () =>
        submitStockCountSessionAction({
          countSessionId: "count-1",
          countSheetHash: "sha256:count-sheet",
          lines: [{ lineId: "line-1", countedQuantity: "1.000" }],
        }),
      mockSubmitStockCountSession,
    ],
    [
      "post count",
      () => postStockCountAction({ countSessionId: "count-1" }),
      mockPostStockCount,
    ],
    [
      "post adjustment",
      () => postStockAdjustmentAction({ adjustmentId: "adjustment-1" }),
      mockPostStockAdjustment,
    ],
  ])(
    "does not invoke the %s service when inventory entitlement is denied",
    async (_label, invoke, serviceMock) => {
      mockObserveModuleAccess.mockResolvedValueOnce({ allowed: false })

      await expect(invoke()).rejects.toThrow(
        "Inventory module is not available for this organization",
      )

      expect(serviceMock).not.toHaveBeenCalled()
    },
  )
})
