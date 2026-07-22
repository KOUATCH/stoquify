jest.mock("server-only", () => ({}));

jest.mock("@/prisma/db", () => ({
  db: {
    location: { findFirst: jest.fn() },
    pOSSession: { findMany: jest.fn(), update: jest.fn() },
    cashDrawer: { findMany: jest.fn(), update: jest.fn() },
    payment: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    providerEvent: { findMany: jest.fn() },
    statementLine: { findMany: jest.fn() },
    paymentTransaction: { findMany: jest.fn() },
    reconciliationRun: { findMany: jest.fn() },
    closeRun: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
    businessEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/services/operating-access/operating-access-scope.service", () => ({
  resolveOperatingAccessScope: jest.fn(),
}));

jest.mock("@/services/snapshots/branch-operating-snapshot.service", () => ({
  getBranchOperatingSnapshot: jest.fn(),
}));

import { PaymentMethod, PaymentStatus, POSSessionStatus } from "@prisma/client";

import { db } from "@/prisma/db";
import type {
  AllowedOperatingAccessScope,
  OperatingAccessContext,
} from "@/services/operating-access/operating-access-scope-contracts";
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service";
import { getBranchOperatingSnapshot } from "@/services/snapshots/branch-operating-snapshot.service";
import type {
  BranchOperatingMetrics,
  SnapshotResult,
  SnapshotStatus,
} from "@/services/snapshots/snapshot-contracts";

import { getEndOfDayCloseReadiness } from "../end-of-day-close-readiness.service";

const mockResolveOperatingAccessScope =
  resolveOperatingAccessScope as jest.Mock;
const mockGetBranchOperatingSnapshot = getBranchOperatingSnapshot as jest.Mock;
const mockDb = db as unknown as {
  location: { findFirst: jest.Mock };
  pOSSession: { findMany: jest.Mock; update: jest.Mock };
  cashDrawer: { findMany: jest.Mock; update: jest.Mock };
  payment: {
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  providerEvent: { findMany: jest.Mock };
  statementLine: { findMany: jest.Mock };
  paymentTransaction: { findMany: jest.Mock };
  reconciliationRun: { findMany: jest.Mock };
  closeRun: { findFirst: jest.Mock };
  auditLog: { create: jest.Mock };
  businessEvent: { create: jest.Mock };
  $transaction: jest.Mock;
};

const now = "2026-07-17T21:00:00.000Z";

describe("end-of-day close readiness service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupNominalEvidence();
  });

  it("builds one tenant-authorized branch readiness result without claiming completion", async () => {
    const context = accessContext({
      roles: [
        {
          id: "role-admin",
          name: "Administrator",
          code: "admin",
          permissions: ["dashboard.read"],
        },
      ],
    });
    mockResolveOperatingAccessScope.mockResolvedValue(tenantAccessDecision());

    const result = await getEndOfDayCloseReadiness({
      accessContext: context,
      locationId: " location-1 ",
      businessDate: "2026-07-17",
      now,
      maxAgeMinutes: 1440,
    });

    expect(mockResolveOperatingAccessScope).toHaveBeenCalledWith(context);
    expect(mockResolveOperatingAccessScope).toHaveBeenCalledTimes(1);
    expect(mockDb.location.findFirst).toHaveBeenCalledTimes(1);
    expect(
      mockResolveOperatingAccessScope.mock.invocationCallOrder[0],
    ).toBeLessThan(mockDb.location.findFirst.mock.invocationCallOrder[0]);
    expect(mockDb.location.findFirst).toHaveBeenCalledWith({
      where: {
        id: "location-1",
        organizationId: "org-1",
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        updatedAt: true,
      },
    });
    expect(mockGetBranchOperatingSnapshot).toHaveBeenCalledWith({
      organizationId: "org-1",
      locationId: "location-1",
      periodStart: new Date("2026-07-17T00:00:00.000Z"),
      periodEnd: new Date("2026-07-17T23:59:59.999Z"),
      now: new Date(now),
      maxAgeMinutes: 1440,
    });
    expect(mockDb.pOSSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          locationId: "location-1",
          startTime: { lte: new Date("2026-07-17T23:59:59.999Z") },
          OR: [
            { endTime: null },
            { endTime: { gte: new Date("2026-07-17T00:00:00.000Z") } },
          ],
        },
      }),
    );
    expect(mockDb.cashDrawer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          locationId: "location-1",
          location: { organizationId: "org-1" },
        },
      }),
    );
    expect(mockDb.payment.findMany).toHaveBeenCalledTimes(1);
    expect(mockDb.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          deletedAt: null,
          purchaseOrderId: null,
          createdAt: {
            gte: new Date("2026-07-17T00:00:00.000Z"),
            lte: new Date("2026-07-17T23:59:59.999Z"),
          },
          salesOrder: {
            organizationId: "org-1",
            locationId: "location-1",
            deletedAt: null,
          },
        },
      }),
    );
    expect(result).toMatchObject({
      kind: "BRANCH_END_OF_DAY_CLOSE_READINESS",
      organizationId: "org-1",
      actorId: "user-1",
      generatedAt: now,
      businessDate: "2026-07-17",
      periodStart: "2026-07-17T00:00:00.000Z",
      periodEnd: "2026-07-17T23:59:59.999Z",
      authority: { kind: "TENANT_WIDE", basis: "RBAC_ROLE" },
      scope: { kind: "LOCATION", locationId: "location-1" },
      location: { id: "location-1", name: "Central Store", code: "BR-01" },
      readiness: "READY_FOR_REVIEW",
      evidenceCoverage: {
        state: "PARTIAL",
        supportedItemCount: 5,
        unsupportedItemCount: 2,
        complete: false,
      },
      completion: {
        state: "NOT_AVAILABLE",
        signOffSupported: false,
        signedOff: false,
        signedOffAt: null,
        signedOffBy: null,
        reasonCode: "NO_DURABLE_DAILY_CLOSE_SIGN_OFF_SOURCE",
      },
      facts: {
        branchSnapshotStatus: "fresh",
        posSessionCount: 2,
        closedOrReconciledSessionCount: 2,
        activeSessionCount: 0,
        suspendedSessionCount: 0,
        inconsistentSessionCount: 0,
        cashDrawerCount: 2,
        openCashDrawerCount: 0,
        attributedPaymentCount: 2,
        attributedPaymentStatusCounts: {
          PENDING: 1,
          PARTIAL: 0,
          PAID: 1,
          REFUNDED: 0,
          CANCELLED: 0,
        },
        attributedPaymentMethodCounts: {
          CASH: 1,
          CARD: 0,
          MOBILE_MONEY: 1,
          BANK_TRANSFER: 0,
          CREDIT: 0,
          STORE_CREDIT: 0,
          CHEQUE: 0,
          MIXED: 0,
        },
      },
    });
    expect(result.checklist.map((item) => [item.key, item.status])).toEqual([
      ["LOCATION_ACTIVE", "READY"],
      ["BRANCH_OPERATING_SNAPSHOT", "READY"],
      ["POS_SESSION_CLOSURE", "READY"],
      ["CASH_DRAWER_CLOSURE", "READY"],
      ["PAYMENT_CAPTURE_ATTRIBUTION", "READY"],
      ["PAYMENT_RECONCILIATION", "UNSUPPORTED"],
      ["MANAGER_SIGN_OFF", "UNSUPPORTED"],
    ]);
    expect(
      result.checklist.find(
        (item) => item.key === "PAYMENT_CAPTURE_ATTRIBUTION",
      ),
    ).toMatchObject({
      evidence: {
        sourceType: "PAYMENT_CAPTURE",
        sourceIds: ["payment-1", "payment-2"],
        observedAt: "2026-07-17T20:45:00.000Z",
        evidenceGrade: "operational",
      },
    });
    expect(
      result.checklist.find((item) => item.key === "PAYMENT_RECONCILIATION"),
    ).toMatchObject({
      evidence: { sourceIds: [], sourceHash: null, observedAt: null },
    });
    expect(
      result.checklist.find((item) => item.key === "MANAGER_SIGN_OFF"),
    ).toMatchObject({
      evidence: { sourceIds: [], sourceHash: null, observedAt: null },
    });
    expect(result.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "UNLINKED_PAYMENT_BRANCH_COVERAGE_UNAVAILABLE",
        "BRANCH_PROVIDER_RECONCILIATION_UNSUPPORTED",
      ]),
    );
    expect(result.sourceHash).toMatch(/^sha256:/);
    expect(sensitiveFinancialKeys(result)).toEqual([]);
    expectDomainWritesNotCalled();
  });

  it("allows a manager to read exactly one assigned branch and preserves no-activity truth", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue(locationAccessDecision());
    mockGetBranchOperatingSnapshot.mockResolvedValue(
      branchSnapshot({ status: "empty" }),
    );
    mockDb.pOSSession.findMany.mockResolvedValue([]);
    mockDb.cashDrawer.findMany.mockResolvedValue([]);
    mockDb.payment.findMany.mockResolvedValue([]);

    const result = await getEndOfDayCloseReadiness(defaultInput());

    expect(result.authority).toEqual({
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
    });
    expect(result.scope).toEqual({
      kind: "LOCATION",
      locationId: "location-1",
    });
    expect(result.readiness).toBe("NO_ACTIVITY");
    expect(result.facts).toMatchObject({
      posSessionCount: 0,
      cashDrawerCount: 0,
      attributedPaymentCount: 0,
    });
    expect(
      result.checklist.find(
        (item) => item.key === "PAYMENT_CAPTURE_ATTRIBUTION",
      ),
    ).toMatchObject({
      status: "NO_ACTIVITY",
      evidence: {
        sourceIds: [],
        observedAt: null,
        evidenceGrade: "raw",
      },
    });
    expect(result).not.toHaveProperty("locations");
    expect(result).not.toHaveProperty("bundles");
    expect(result).not.toHaveProperty("totals");
  });

  it("maps stale payment captures to stale readiness evidence without promoting reconciliation", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue(tenantAccessDecision());
    mockDb.payment.findMany.mockResolvedValue([
      paymentRow({ updatedAt: new Date("2026-07-15T20:00:00.000Z") }),
    ]);

    const result = await getEndOfDayCloseReadiness(defaultInput());
    const capture = result.checklist.find(
      (item) => item.key === "PAYMENT_CAPTURE_ATTRIBUTION",
    );
    const reconciliation = result.checklist.find(
      (item) => item.key === "PAYMENT_RECONCILIATION",
    );

    expect(result.readiness).toBe("ACTION_REQUIRED");
    expect(capture).toMatchObject({
      status: "STALE",
      evidence: {
        sourceIds: ["payment-1"],
        observedAt: "2026-07-15T20:00:00.000Z",
        freshness: { stale: true },
      },
    });
    expect(result.blockers.map((item) => item.code)).toContain(
      "BRANCH_PAYMENT_CAPTURE_EVIDENCE_STALE",
    );
    expect(reconciliation).toMatchObject({
      status: "UNSUPPORTED",
      evidence: { sourceIds: [], sourceHash: null },
    });
    expect(sensitiveFinancialKeys(result)).toEqual([]);
    expectDomainWritesNotCalled();
  });

  it("produces deterministic readiness and capture hashes for unchanged evidence", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue(tenantAccessDecision());

    const first = await getEndOfDayCloseReadiness(defaultInput());
    const second = await getEndOfDayCloseReadiness(defaultInput());

    expect(second.sourceHash).toBe(first.sourceHash);
    expect(
      second.checklist.find(
        (item) => item.key === "PAYMENT_CAPTURE_ATTRIBUTION",
      )?.evidence.sourceHash,
    ).toBe(
      first.checklist.find((item) => item.key === "PAYMENT_CAPTURE_ATTRIBUTION")
        ?.evidence.sourceHash,
    );
    expect(mockResolveOperatingAccessScope).toHaveBeenCalledTimes(2);
    expect(mockDb.location.findFirst).toHaveBeenCalledTimes(2);
  });

  it("denies an unassigned branch before location or branch evidence reads", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue(locationAccessDecision());

    await expect(
      getEndOfDayCloseReadiness({
        ...defaultInput(),
        locationId: "location-2",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        code: "FORBIDDEN",
        message:
          "End-of-day close readiness is not available for this location.",
      }),
    );

    expect(mockDb.location.findFirst).not.toHaveBeenCalled();
    expectEvidenceReadsNotCalled();
  });

  it("fails closed on denied or identity-inconsistent access before branch reads", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue({
      allowed: false,
      organizationId: "org-1",
      actorId: "user-1",
      requiredPermission: "dashboard.read",
      authority: { kind: "DENIED", basis: "RBAC_PERMISSION" },
      reason: "MISSING_DAILY_TRUTH_PERMISSION",
      scope: null,
    });

    await expect(getEndOfDayCloseReadiness(defaultInput())).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        message:
          "End-of-day close readiness is not available for this account.",
      }),
    );
    expect(mockDb.location.findFirst).not.toHaveBeenCalled();
    expectEvidenceReadsNotCalled();

    jest.clearAllMocks();
    mockResolveOperatingAccessScope.mockResolvedValue({
      ...tenantAccessDecision(),
      organizationId: "another-org",
    });

    await expect(getEndOfDayCloseReadiness(defaultInput())).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        message: "End-of-day close operating scope evidence is inconsistent.",
      }),
    );
    expect(mockDb.location.findFirst).not.toHaveBeenCalled();
    expectEvidenceReadsNotCalled();
  });

  it("fails closed when authority and scope forms disagree", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue({
      ...tenantAccessDecision(),
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        basis: "Location.managerId",
        managedLocations: [
          { id: "location-1", name: "Central Store", code: "BR-01" },
        ],
      },
    });

    await expect(getEndOfDayCloseReadiness(defaultInput())).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        message: "End-of-day close operating scope evidence is inconsistent.",
      }),
    );
    expect(mockDb.location.findFirst).not.toHaveBeenCalled();
    expectEvidenceReadsNotCalled();
  });

  it("uses one non-enumerating denial for missing, inactive, deleted, or cross-tenant locations", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue(tenantAccessDecision());
    mockDb.location.findFirst.mockResolvedValue(null);

    await expect(getEndOfDayCloseReadiness(defaultInput())).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        message:
          "End-of-day close readiness is not available for this location.",
      }),
    );

    expect(mockDb.location.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          isActive: true,
          deletedAt: null,
        }),
      }),
    );
    expectEvidenceReadsNotCalled();
  });

  it("requires action for open sessions, inconsistent close evidence, and open drawers", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue(tenantAccessDecision());
    mockGetBranchOperatingSnapshot.mockResolvedValue(
      branchSnapshot({ status: "partial" }),
    );
    mockDb.pOSSession.findMany.mockResolvedValue([
      session("session-active", POSSessionStatus.ACTIVE, null),
      session("session-suspended", POSSessionStatus.SUSPENDED, null),
      session("session-inconsistent", POSSessionStatus.CLOSED, null),
    ]);
    mockDb.cashDrawer.findMany.mockResolvedValue([
      drawer("drawer-open", true),
      drawer("drawer-closed", false),
    ]);

    const result = await getEndOfDayCloseReadiness(defaultInput());

    expect(result.readiness).toBe("ACTION_REQUIRED");
    expect(result.facts).toMatchObject({
      posSessionCount: 3,
      closedOrReconciledSessionCount: 1,
      activeSessionCount: 1,
      suspendedSessionCount: 1,
      inconsistentSessionCount: 1,
      openCashDrawerCount: 1,
    });
    expect(result.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "ACTIVE_POS_SESSIONS",
        "SUSPENDED_POS_SESSIONS",
        "INCONSISTENT_POS_SESSION_CLOSE_EVIDENCE",
        "OPEN_CASH_DRAWERS",
      ]),
    );
    expect(
      result.checklist.find((item) => item.key === "POS_SESSION_CLOSURE")
        ?.status,
    ).toBe("ACTION_REQUIRED");
    expect(
      result.checklist.find((item) => item.key === "CASH_DRAWER_CLOSURE")
        ?.status,
    ).toBe("ACTION_REQUIRED");
    expect(sensitiveFinancialKeys(result)).toEqual([]);
    expectDomainWritesNotCalled();
  });

  it.each([
    ["stale" as const, "STALE", "BRANCH_SNAPSHOT_STALE", "ACTION_REQUIRED"],
    [
      "blocked" as const,
      "BLOCKED",
      "BRANCH_SNAPSHOT:source-blocked",
      "ACTION_REQUIRED",
    ],
    [
      "failed" as const,
      "UNAVAILABLE",
      "BRANCH_SNAPSHOT_UNAVAILABLE",
      "UNAVAILABLE",
    ],
  ])(
    "preserves %s branch snapshot evidence without promoting it",
    async (snapshotStatus, checklistStatus, blockerCode, readiness) => {
      mockResolveOperatingAccessScope.mockResolvedValue(tenantAccessDecision());
      mockGetBranchOperatingSnapshot.mockResolvedValue(
        branchSnapshot({ status: snapshotStatus }),
      );

      const result = await getEndOfDayCloseReadiness(defaultInput());

      expect(
        result.checklist.find(
          (item) => item.key === "BRANCH_OPERATING_SNAPSHOT",
        )?.status,
      ).toBe(checklistStatus);
      expect(result.blockers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: blockerCode }),
        ]),
      );
      expect(result.readiness).toBe(readiness);
      expect(result.completion.signedOff).toBe(false);
    },
  );

  it("rejects malformed calendar dates before operating access or evidence reads", async () => {
    await expect(
      getEndOfDayCloseReadiness({
        ...defaultInput(),
        businessDate: "2026-02-30",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "BusinessRuleError",
        message: "End-of-day businessDate must be a valid calendar date.",
      }),
    );

    expect(mockResolveOperatingAccessScope).not.toHaveBeenCalled();
    expect(mockDb.location.findFirst).not.toHaveBeenCalled();
    expectEvidenceReadsNotCalled();
  });

  it("fails closed when branch snapshot identity does not match the verified location", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue(tenantAccessDecision());
    mockGetBranchOperatingSnapshot.mockResolvedValue(
      branchSnapshot({ organizationId: "another-org" }),
    );

    await expect(getEndOfDayCloseReadiness(defaultInput())).rejects.toEqual(
      expect.objectContaining({
        name: "ForbiddenError",
        message: "End-of-day close branch evidence is inconsistent.",
      }),
    );

    expectDomainWritesNotCalled();
  });
});

function setupNominalEvidence() {
  mockDb.location.findFirst.mockResolvedValue({
    id: "location-1",
    name: "Central Store",
    code: "BR-01",
    updatedAt: new Date("2026-07-17T20:00:00.000Z"),
  });
  mockGetBranchOperatingSnapshot.mockResolvedValue(branchSnapshot());
  mockDb.pOSSession.findMany.mockResolvedValue([
    session(
      "session-closed",
      POSSessionStatus.CLOSED,
      "2026-07-17T18:00:00.000Z",
    ),
    session(
      "session-reconciled",
      POSSessionStatus.RECONCILED,
      "2026-07-17T19:00:00.000Z",
    ),
  ]);
  mockDb.cashDrawer.findMany.mockResolvedValue([
    drawer("drawer-1", false),
    drawer("drawer-2", false),
  ]);
  mockDb.payment.findMany.mockResolvedValue([
    paymentRow({
      id: "payment-1",
      salesOrderId: "sale-1",
      salesOrder: {
        id: "sale-1",
        organizationId: "org-1",
        locationId: "location-1",
      },
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
    }),
    paymentRow({
      id: "payment-2",
      salesOrderId: "sale-2",
      salesOrder: {
        id: "sale-2",
        organizationId: "org-1",
        locationId: "location-1",
      },
      method: PaymentMethod.MOBILE_MONEY,
      status: PaymentStatus.PENDING,
      createdAt: new Date("2026-07-17T10:00:00.000Z"),
      updatedAt: new Date("2026-07-17T20:45:00.000Z"),
    }),
  ]);
}

function defaultInput() {
  return {
    accessContext: accessContext(),
    locationId: "location-1",
    businessDate: "2026-07-17",
    now,
    maxAgeMinutes: 1440,
  };
}

function accessContext(
  overrides: Partial<OperatingAccessContext> = {},
): OperatingAccessContext {
  return {
    orgId: "org-1",
    userId: "user-1",
    roles: [],
    permissions: ["dashboard.read"],
    isSuperUser: false,
    ...overrides,
  };
}

function tenantAccessDecision(): AllowedOperatingAccessScope {
  return {
    allowed: true,
    organizationId: "org-1",
    actorId: "user-1",
    requiredPermission: "dashboard.read",
    authority: {
      kind: "TENANT_WIDE",
      basis: "RBAC_ROLE",
      matchedRoleCode: "admin",
    },
    scope: { kind: "TENANT", locationIds: null },
  };
}

function locationAccessDecision(): AllowedOperatingAccessScope {
  const managedLocations = [
    { id: "location-1", name: "Central Store", code: "BR-01" },
  ];
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
      locationIds: managedLocations.map((location) => location.id),
    },
  };
}

function session(id: string, status: POSSessionStatus, endTime: string | null) {
  return {
    id,
    status,
    startTime: new Date("2026-07-17T08:00:00.000Z"),
    endTime: endTime ? new Date(endTime) : null,
    updatedAt: new Date(endTime ?? "2026-07-17T20:00:00.000Z"),
  };
}

function drawer(id: string, isOpen: boolean) {
  return {
    id,
    isOpen,
    updatedAt: new Date("2026-07-17T19:05:00.000Z"),
  };
}

function paymentRow(override: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    organizationId: "org-1",
    salesOrderId: "sale-1",
    method: PaymentMethod.CASH,
    status: PaymentStatus.PAID,
    createdAt: new Date("2026-07-17T09:00:00.000Z"),
    updatedAt: new Date("2026-07-17T20:30:00.000Z"),
    salesOrder: {
      id: "sale-1",
      organizationId: "org-1",
      locationId: "location-1",
    },
    ...override,
  };
}

function branchSnapshot(
  overrides: {
    status?: SnapshotStatus;
    organizationId?: string;
    locationId?: string;
  } = {},
): SnapshotResult<BranchOperatingMetrics> {
  const status = overrides.status ?? "fresh";
  const stale = status === "stale";
  const blocked = status === "blocked";
  return {
    kind: "branch.operating",
    organizationId: overrides.organizationId ?? "org-1",
    locationId: overrides.locationId ?? "location-1",
    periodStart: "2026-07-17T00:00:00.000Z",
    periodEnd: "2026-07-17T23:59:59.999Z",
    status,
    uiState:
      status === "failed"
        ? "safe_error"
        : blocked
          ? "blocked"
          : stale
            ? "stale"
            : status === "partial"
              ? "partial"
              : status === "empty"
                ? "empty"
                : "fresh",
    evidenceGrade: blocked ? "blocked" : "operational",
    freshness: {
      generatedAt: now,
      sourceMaxUpdatedAt: stale
        ? "2026-07-15T10:00:00.000Z"
        : "2026-07-17T20:00:00.000Z",
      maxAgeMinutes: 1440,
      stale,
      staleReason: stale ? "Source data is 3540 minutes old." : null,
    },
    sourceHash: "sha256:branch-source",
    generatedAt: now,
    sourceModules: ["dashboard", "sales", "pos", "inventory"],
    metrics: {
      locationActive: true,
      completedSalesCount: status === "empty" ? 0 : 4,
      completedSalesRevenue: status === "empty" ? 0 : 1000,
      cashCollected: status === "empty" ? 0 : 800,
      inventoryValue: 0,
      inventoryTransactionCount: 0,
      pendingPurchaseOrderCount: 0,
      openTransferCount: 0,
      postedJournalLineCount: 0,
      posShiftCount: status === "empty" ? 0 : 2,
      closedPosShiftCount: status === "empty" ? 0 : 2,
      payrollEmployeeAtLocationCount: 0,
      frozenAttendanceSnapshotCount: 0,
      approvedPayrollRunLineCount: 0,
      unallocatedPayrollRunLineCount: 0,
      payrollGrossAmount: 0,
      payrollEmployerChargeAmount: 0,
      payrollNetPayAmount: 0,
      payrollAllocatedCostAmount: 0,
      payrollProfitContribution: null,
    },
    blockers: blocked
      ? [
          {
            id: "source-blocked",
            severity: "high",
            gate: "branch_operating_snapshot",
            title: "Branch source evidence is blocked",
            detail: "A required branch source is unavailable.",
            sourceTables: ["pos_sessions"],
            nextAction: "Restore the source evidence.",
          },
        ]
      : [],
    redactions: [],
  };
}

function sensitiveFinancialKeys(value: unknown) {
  const prohibited = new Set([
    "openingBalance",
    "closingBalance",
    "expectedBalance",
    "variance",
    "cashTotal",
    "cardTotal",
    "mobileMoneyTotal",
    "bankTransferTotal",
    "creditTotal",
    "amount",
    "currency",
  ]);
  const found = new Set<string>();

  function visit(current: unknown) {
    if (!current || typeof current !== "object") return;
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(current)) {
      if (prohibited.has(key)) found.add(key);
      visit(child);
    }
  }

  visit(value);
  return [...found].sort();
}

function expectEvidenceReadsNotCalled() {
  expect(mockGetBranchOperatingSnapshot).not.toHaveBeenCalled();
  expect(mockDb.pOSSession.findMany).not.toHaveBeenCalled();
  expect(mockDb.cashDrawer.findMany).not.toHaveBeenCalled();
  expect(mockDb.payment.findMany).not.toHaveBeenCalled();
}

function expectDomainWritesNotCalled() {
  expect(mockDb.pOSSession.update).not.toHaveBeenCalled();
  expect(mockDb.cashDrawer.update).not.toHaveBeenCalled();
  expect(mockDb.payment.create).not.toHaveBeenCalled();
  expect(mockDb.payment.update).not.toHaveBeenCalled();
  expect(mockDb.payment.delete).not.toHaveBeenCalled();
  expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  expect(mockDb.businessEvent.create).not.toHaveBeenCalled();
  expect(mockDb.$transaction).not.toHaveBeenCalled();
  expect(mockDb.closeRun.findFirst).not.toHaveBeenCalled();
  expect(mockDb.providerEvent.findMany).not.toHaveBeenCalled();
  expect(mockDb.statementLine.findMany).not.toHaveBeenCalled();
  expect(mockDb.paymentTransaction.findMany).not.toHaveBeenCalled();
  expect(mockDb.reconciliationRun.findMany).not.toHaveBeenCalled();
}
