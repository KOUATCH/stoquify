jest.mock("server-only", () => ({}))

jest.mock("@/services/operating-access/operating-access-scope.service", () => ({
  resolveOperatingAccessScope: jest.fn(),
}))

jest.mock("@/services/snapshots/branch-operating-snapshot.service", () => ({
  getBranchOperatingSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/inventory-loss-snapshot.service", () => ({
  getInventoryLossSnapshot: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

import type {
  AllowedOperatingAccessScope,
  OperatingAccessContext,
} from "@/services/operating-access/operating-access-scope-contracts"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type {
  BranchOperatingMetrics,
  InventoryLossMetrics,
  SnapshotBlocker,
  SnapshotResult,
} from "@/services/snapshots/snapshot-contracts"
import { getBranchOperatingSnapshot } from "@/services/snapshots/branch-operating-snapshot.service"
import { getInventoryLossSnapshot } from "@/services/snapshots/inventory-loss-snapshot.service"

import {
  getManagerLocationActionCenterData,
  getManagerLocationActionCenterDataFromResolvedAccess,
} from "../manager-location-action-center.service"

const mockResolveOperatingAccessScope = resolveOperatingAccessScope as jest.Mock
const mockGetBranchOperatingSnapshot = getBranchOperatingSnapshot as jest.Mock
const now = "2026-06-30T12:00:00.000Z"
const mockGetInventoryLossSnapshot = getInventoryLossSnapshot as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock

describe("manager location action center service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockGetInventoryLossSnapshot.mockImplementation(
      async (input: { locationId: string }) =>
        inventoryLossSnapshot(input.locationId),
    )
  })

  it("fails closed on a denied operating scope before branch reads", async () => {
    const context = accessContext()
    mockResolveOperatingAccessScope.mockResolvedValue({
      allowed: false,
      organizationId: context.orgId,
      actorId: context.userId,
      requiredPermission: "dashboard.read",
      authority: { kind: "DENIED", basis: "LOCATION_ASSIGNMENT" },
      reason: "NO_MANAGED_LOCATIONS",
      scope: null,
    })

    await expect(
      getManagerLocationActionCenterData({ accessContext: context, now }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        code: "FORBIDDEN",
        message: "Managed-location action bundles are not available for this account.",
      }),
    )

    expect(mockResolveOperatingAccessScope).toHaveBeenCalledWith(context)
    expect(mockGetBranchOperatingSnapshot).not.toHaveBeenCalled()
    expectNoInventoryLossReads()
  })

  it("keeps tenant-wide authority out of the location-responsibility builder", async () => {
    const context = accessContext({
      roles: [
        {
          id: "role-admin",
          name: "Administrator",
          code: "admin",
          permissions: ["dashboard.read"],
        },
      ],
    })
    mockResolveOperatingAccessScope.mockResolvedValue({
      allowed: true,
      organizationId: context.orgId,
      actorId: context.userId,
      requiredPermission: "dashboard.read",
      authority: {
        kind: "TENANT_WIDE",
        basis: "RBAC_ROLE",
        matchedRoleCode: "admin",
      },
      scope: { kind: "TENANT", locationIds: null },
    })

    await expect(
      getManagerLocationActionCenterData({ accessContext: context, now }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        message:
          "Managed-location action bundles require location-responsibility access.",
      }),
    )

    expect(mockGetBranchOperatingSnapshot).not.toHaveBeenCalled()
    expectNoInventoryLossReads()
  })

  it("fails closed when authority and location scope evidence disagree", async () => {
    const context = accessContext()
    mockResolveOperatingAccessScope.mockResolvedValue(
      locationAccessDecision([
        { id: "location-b", name: "Branch B", code: "B" },
      ], ["location-a"]),
    )

    await expect(
      getManagerLocationActionCenterData({ accessContext: context, now }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        message: "Managed-location scope evidence is inconsistent.",
      }),
    )

    expect(mockGetBranchOperatingSnapshot).not.toHaveBeenCalled()
    expectNoInventoryLossReads()
  })

  it("keeps Inventory Loss actions isolated to each authorized location", async () => {
    const context = accessContext({
      permissions: [
        "dashboard.read",
        "purchases.orders.read",
        "finance.reports.read",
        "inventory.levels.read",
      ],
    })
    const locations = [
      { id: "location-b", name: "Branch B", code: "B" },
      { id: "location-a", name: "Branch A", code: "A" },
    ]
    const access = locationAccessDecision(locations)
    mockBranchSnapshots()
    mockGetInventoryLossSnapshot.mockImplementation(
      async (input: { locationId: string }) =>
        input.locationId === "location-b"
          ? inventoryLossSnapshot("location-b", {
              lossLineCount: 2,
              adjustmentCount: 1,
              totalLossValue: 45000,
              damagedLineCount: 2,
              evidenceCoveredLineCount: 2,
              evidenceCoveragePercent: 100,
              valuationCoveredLineCount: 2,
              valuationCoveragePercent: 100,
              approvalAttributedLineCount: 2,
              approvalCoveragePercent: 100,
            })
          : inventoryLossSnapshot(input.locationId),
    )

    const result = await getManagerLocationActionCenterDataFromResolvedAccess(
      {
        accessContext: context,
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        now,
        maxAgeMinutes: 60,
      },
      access,
    )

    expect(mockObserveModuleAccess).toHaveBeenCalledTimes(1)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: context.permissions,
      moduleSlug: "inventory",
      surfaceType: "page",
      surface: "manager-location-action-center.inventory-loss",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
      now: new Date(now),
    })
    expect(mockGetInventoryLossSnapshot).toHaveBeenNthCalledWith(1, {
      organizationId: "org-1",
      locationId: "location-b",
      periodStart: new Date("2026-06-01T00:00:00.000Z"),
      periodEnd: new Date("2026-06-30T23:59:59.999Z"),
      now: new Date(now),
      maxAgeMinutes: 60,
    })
    expect(mockGetInventoryLossSnapshot).toHaveBeenNthCalledWith(2, {
      organizationId: "org-1",
      locationId: "location-a",
      periodStart: new Date("2026-06-01T00:00:00.000Z"),
      periodEnd: new Date("2026-06-30T23:59:59.999Z"),
      now: new Date(now),
      maxAgeMinutes: 60,
    })
    expect(result.bundles[0].actionQueue.signals).toEqual([
      expect.objectContaining({
        signalType: "inventory_loss_review",
        subjectId: "location-b:recorded-loss",
        sourceSnapshotKind: "inventory.loss",
        sourceHash: "inventory-loss:location-b",
        actionPath: "/dashboard/inventory/losses",
      }),
    ])
    expect(result.bundles[0].actionQueue.actionItems).toEqual([
      expect.objectContaining({
        signalType: "inventory_loss_review",
        actionPath: "/dashboard/inventory/losses",
      }),
    ])
    expect(result.bundles[1].actionQueue.signals).toEqual([])
    expect(result.bundles[0]).not.toHaveProperty("inventoryLoss")
    expect(result.bundles[1]).not.toHaveProperty("inventoryLoss")
  })

  it("keeps branch bundles available without Inventory Loss RBAC", async () => {
    const context = accessContext()
    const access = locationAccessDecision([
      { id: "location-a", name: "Branch A", code: "A" },
    ])
    mockBranchSnapshots()

    const result = await getManagerLocationActionCenterDataFromResolvedAccess(
      { accessContext: context, now },
      access,
    )

    expect(mockGetBranchOperatingSnapshot).toHaveBeenCalledTimes(1)
    expectNoInventoryLossReads()
    expect(result.bundles[0].actionQueue.signals).toEqual([])
  })

  it("does not read location losses when inventory entitlement denies", async () => {
    const context = accessContext({
      permissions: ["dashboard.read", "inventory.levels.read"],
    })
    const access = locationAccessDecision([
      { id: "location-a", name: "Branch A", code: "A" },
    ])
    mockBranchSnapshots()
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })

    const result = await getManagerLocationActionCenterDataFromResolvedAccess(
      { accessContext: context, now },
      access,
    )

    expect(mockObserveModuleAccess).toHaveBeenCalledTimes(1)
    expect(mockGetInventoryLossSnapshot).not.toHaveBeenCalled()
    expect(mockGetBranchOperatingSnapshot).toHaveBeenCalledTimes(1)
    expect(result.bundles[0].actionQueue.signals).toEqual([])
  })

  it("keeps managed-location snapshots and queues separate in resolver order", async () => {
    const context = accessContext()
    const locations = [
      { id: "location-b", name: "Branch B", code: "B" },
      { id: "location-a", name: "Branch A", code: "A" },
    ]
    const branchBlocker: SnapshotBlocker = {
      id: "branch-b-source-blocked",
      severity: "high",
      gate: "branch_operating_snapshot",
      title: "Branch B evidence is blocked",
      detail: "Branch B is missing required source evidence.",
      sourceTables: ["locations", "purchase_orders"],
    }
    const access = locationAccessDecision(locations)
    mockGetBranchOperatingSnapshot.mockImplementation(
      async (input: { locationId: string }) =>
        input.locationId === "location-b"
          ? branchSnapshot("location-b", {
              status: "blocked",
              blockers: [branchBlocker],
              metrics: { pendingPurchaseOrderCount: 2 },
            })
          : branchSnapshot("location-a", {
              metrics: {
                payrollAllocatedCostAmount: 200000,
                payrollProfitContribution: 300000,
              },
            }),
    )

    const result = await getManagerLocationActionCenterDataFromResolvedAccess(
      {
        accessContext: context,
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        now,
        maxAgeMinutes: 60,
      },
      access,
    )

    expect(mockResolveOperatingAccessScope).not.toHaveBeenCalled()
    expect(mockGetBranchOperatingSnapshot).toHaveBeenNthCalledWith(1, {
      organizationId: "org-1",
      locationId: "location-b",
      periodStart: new Date("2026-06-01T00:00:00.000Z"),
      periodEnd: new Date("2026-06-30T23:59:59.999Z"),
      now: new Date(now),
      maxAgeMinutes: 60,
    })
    expect(mockGetBranchOperatingSnapshot).toHaveBeenNthCalledWith(2, {
      organizationId: "org-1",
      locationId: "location-a",
      periodStart: new Date("2026-06-01T00:00:00.000Z"),
      periodEnd: new Date("2026-06-30T23:59:59.999Z"),
      now: new Date(now),
      maxAgeMinutes: 60,
    })
    expect(result).toMatchObject({
      organizationId: "org-1",
      actorId: "user-1",
      generatedAt: now,
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-30T23:59:59.999Z",
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        basis: "Location.managerId",
      },
      scope: {
        kind: "LOCATIONS",
        locationIds: ["location-b", "location-a"],
      },
    })
    expect(result.bundles.map((bundle) => bundle.location.id)).toEqual([
      "location-b",
      "location-a",
    ])
    expect(result.bundles[0]).toMatchObject({
      location: locations[0],
      snapshot: {
        locationId: "location-b",
        status: "blocked",
        sourceHash: "sha256:location-b",
        blockers: [branchBlocker],
      },
      actionQueue: {
        organizationId: "org-1",
        filteredOutCount: 0,
        summary: { total: 1 },
      },
    })
    expect(result.bundles[0].actionQueue.signals).toEqual([
      expect.objectContaining({
        subjectId: "location-b:pending-receiving",
        requiredPermission: "purchases.orders.read",
        blockers: [branchBlocker],
      }),
    ])
    expect(result.bundles[1]).toMatchObject({
      location: locations[1],
      snapshot: {
        locationId: "location-a",
        status: "fresh",
        sourceHash: "sha256:location-a",
        blockers: [],
      },
      actionQueue: {
        organizationId: "org-1",
        filteredOutCount: 0,
        summary: { total: 1 },
      },
    })
    expect(result.bundles[1].actionQueue.signals).toEqual([
      expect.objectContaining({
        subjectId: "location-a:payroll-allocation",
        requiredPermission: "finance.reports.read",
        blockers: [],
      }),
    ])
    expect(result).not.toHaveProperty("metrics")
    expect(result).not.toHaveProperty("actionQueue")
    expect(result).not.toHaveProperty("summary")
  })
})

function accessContext(
  overrides: Partial<OperatingAccessContext> = {},
): OperatingAccessContext {
  return {
    orgId: "org-1",
    userId: "user-1",
    roles: [],
    permissions: [
      "dashboard.read",
      "purchases.orders.read",
      "finance.reports.read",
    ],
    isSuperUser: false,
    ...overrides,
  }
}

function locationAccessDecision(
  managedLocations: Array<{ id: string; name: string; code: string }>,
  locationIds = managedLocations.map((location) => location.id),
): AllowedOperatingAccessScope {
  return {
    allowed: true,
    organizationId: "org-1",
    actorId: "user-1",
    requiredPermission: "dashboard.read",
    authority: {
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
      managedLocations,
    },
    scope: {
      kind: "LOCATIONS",
      locationIds,
    },
  }
}

function expectNoInventoryLossReads() {
  expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  expect(mockGetInventoryLossSnapshot).not.toHaveBeenCalled()
}

function mockBranchSnapshots() {
  mockGetBranchOperatingSnapshot.mockImplementation(
    async (input: { locationId: string }) => branchSnapshot(input.locationId),
  )
}

function inventoryLossSnapshot(
  locationId: string,
  overrides: Partial<InventoryLossMetrics> = {},
): SnapshotResult<InventoryLossMetrics> {
  const metrics: InventoryLossMetrics = {
    lossLineCount: 0,
    adjustmentCount: 0,
    totalLossValue: 0,
    currency: "XAF",
    countVarianceLineCount: 0,
    damagedLineCount: 0,
    expiredLineCount: 0,
    recordedTheftCategoryLineCount: 0,
    writeOffLineCount: 0,
    evidenceCoveredLineCount: 0,
    evidenceCoveragePercent: 100,
    valuationCoveredLineCount: 0,
    valuationCoveragePercent: 100,
    approvalAttributedLineCount: 0,
    approvalCoveragePercent: 100,
    missingEvidenceLineCount: 0,
    missingValuationLineCount: 0,
    missingApprovalAttributionLineCount: 0,
    sourceTruncated: false,
    ...overrides,
  }

  return {
    kind: "inventory.loss",
    organizationId: "org-1",
    locationId,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-30T23:59:59.999Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "operational",
    freshness: {
      generatedAt: now,
      sourceMaxUpdatedAt: "2026-06-30T11:00:00.000Z",
      maxAgeMinutes: 60,
      stale: false,
      staleReason: null,
    },
    sourceHash: `inventory-loss:${locationId}`,
    generatedAt: now,
    sourceModules: ["inventory"],
    metrics,
    blockers: [],
    redactions: [],
  }
}

function branchSnapshot(
  locationId: string,
  overrides: {
    status?: SnapshotResult<BranchOperatingMetrics>["status"]
    metrics?: Partial<BranchOperatingMetrics>
    blockers?: SnapshotBlocker[]
  } = {},
): SnapshotResult<BranchOperatingMetrics> {
  const status = overrides.status ?? "fresh"
  return {
    kind: "branch.operating",
    organizationId: "org-1",
    locationId,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-30T23:59:59.999Z",
    status,
    uiState: status === "blocked" ? "blocked" : "fresh",
    evidenceGrade: status === "blocked" ? "blocked" : "operational",
    freshness: {
      generatedAt: now,
      sourceMaxUpdatedAt: "2026-06-30T11:00:00.000Z",
      maxAgeMinutes: 60,
      stale: false,
      staleReason: null,
    },
    sourceHash: `sha256:${locationId}`,
    generatedAt: now,
    sourceModules: [
      "dashboard",
      "sales",
      "payments",
      "inventory",
      "purchasing",
      "pos",
      "payroll",
      "accounting",
    ],
    metrics: {
      locationActive: true,
      completedSalesCount: 0,
      completedSalesRevenue: 0,
      cashCollected: 0,
      inventoryValue: 0,
      inventoryTransactionCount: 0,
      pendingPurchaseOrderCount: 0,
      openTransferCount: 0,
      postedJournalLineCount: 0,
      posShiftCount: 0,
      closedPosShiftCount: 0,
      payrollEmployeeAtLocationCount: 0,
      frozenAttendanceSnapshotCount: 0,
      approvedPayrollRunLineCount: 0,
      unallocatedPayrollRunLineCount: 0,
      payrollGrossAmount: 0,
      payrollEmployerChargeAmount: 0,
      payrollNetPayAmount: 0,
      payrollAllocatedCostAmount: 0,
      payrollProfitContribution: null,
      ...overrides.metrics,
    },
    blockers: overrides.blockers ?? [],
    redactions: [],
  }
}
