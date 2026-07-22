jest.mock("server-only", () => ({}));

const tx = {
  branchDailyCloseRun: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  businessEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("@/prisma/db", () => ({
  db: {
    branchDailyCloseRun: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("../end-of-day-close-readiness.service", () => ({
  getEndOfDayCloseReadiness: jest.fn(),
}));

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
} from "@/services/_shared/action-errors";
import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts";

import type { EndOfDayCloseReadinessResult } from "../end-of-day-close-readiness-contracts";
import { getEndOfDayCloseReadiness } from "../end-of-day-close-readiness.service";
import { startBranchDailyCloseReview } from "../end-of-day-close-review.service";

const mockGetReadiness = getEndOfDayCloseReadiness as jest.Mock;
const mockDb = db as unknown as {
  branchDailyCloseRun: { findFirst: jest.Mock };
  auditLog: { create: jest.Mock };
  $transaction: jest.Mock;
};

const now = new Date("2026-07-18T21:00:00.000Z");

describe("branch daily-close review service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetReadiness.mockResolvedValue(readinessFixture());
    mockDb.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    tx.branchDailyCloseRun.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tx.branchDailyCloseRun.create.mockImplementation(async ({ data }) => ({
      id: "daily-close-1",
      ...data,
      createdAt: now,
      updatedAt: now,
    }));
    tx.auditLog.create.mockResolvedValue({ id: "audit-1" });
    tx.businessEvent.findUnique.mockResolvedValue(null);
    tx.businessEvent.create.mockImplementation(async ({ data }) => ({
      id: "event-1",
      ...data,
      outboxMessages: data.outboxMessages.create,
    }));
    mockDb.auditLog.create.mockResolvedValue({ id: "conflict-audit-1" });
    mockDb.branchDailyCloseRun.findFirst.mockResolvedValue(null);
  });

  it("starts one tenant-authorized non-final review with atomic audit and event proof", async () => {
    const input = defaultInput();
    const result = await startBranchDailyCloseReview(input);

    expect(mockGetReadiness).toHaveBeenCalledWith({
      accessContext: input.accessContext,
      locationId: "location-1",
      businessDate: "2026-07-18",
      now,
      maxAgeMinutes: 1440,
    });
    expect(mockGetReadiness.mock.invocationCallOrder[0]).toBeLessThan(
      mockDb.$transaction.mock.invocationCallOrder[0],
    );
    expect(result).toMatchObject({
      kind: "BRANCH_DAILY_CLOSE_REVIEW",
      created: true,
      replayed: false,
      run: {
        id: "daily-close-1",
        organizationId: "org-1",
        locationId: "location-1",
        businessDate: "2026-07-18",
        status: "IN_REVIEW",
        readinessState: "READY_FOR_REVIEW",
        evidenceCoverageState: "PARTIAL",
        supportedItemCount: 5,
        unsupportedItemCount: 2,
        blockerCount: 2,
        evidenceObservedAt: "2026-07-18T20:45:00.000Z",
        startedById: "user-1",
        startedAt: now.toISOString(),
        idempotencyKey: "close-review-1",
        correlationId: "correlation-1",
      },
    });
    expect(result.run.evidenceHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.run.readinessSourceHash).toBe(readinessFixture().sourceHash);

    const createData = tx.branchDailyCloseRun.create.mock.calls[0][0].data;
    expect(createData).toMatchObject({
      organizationId: "org-1",
      locationId: "location-1",
      businessDate: new Date("2026-07-18T00:00:00.000Z"),
      status: "IN_REVIEW",
      readinessState: "READY_FOR_REVIEW",
      evidenceCoverageState: "PARTIAL",
      startedById: "user-1",
      idempotencyKey: "close-review-1",
      correlationId: "correlation-1",
    });
    expect(createData.evidenceManifest).toMatchObject({
      kind: "BRANCH_DAILY_CLOSE_REVIEW_EVIDENCE",
      observedAt: "2026-07-18T20:45:00.000Z",
      unsupportedChecklistKeys: ["MANAGER_SIGN_OFF", "PAYMENT_RECONCILIATION"],
      controls: {
        monetaryFieldsIncluded: false,
        paymentLocationOwnershipClaimed: false,
        managerSignOffIncluded: false,
        finalCloseClaimed: false,
      },
    });
    expect(createData.evidenceManifest.supportedSources).toHaveLength(5);
    expect(createData.evidenceManifest.supportedSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checklistKey: "PAYMENT_CAPTURE_ATTRIBUTION",
          sourceType: "PAYMENT_CAPTURE",
          sourceIds: ["payment_capture_attribution-1"],
        }),
      ]),
    );
    expect(
      createData.evidenceManifest.blockers.map(
        (item: { code: string }) => item.code,
      ),
    ).toEqual(
      expect.arrayContaining([
        "UNLINKED_PAYMENT_BRANCH_COVERAGE_UNAVAILABLE",
        "BRANCH_PROVIDER_RECONCILIATION_UNSUPPORTED",
      ]),
    );
    expect(sensitiveFinancialKeys(createData.evidenceManifest)).toEqual([]);
    expect(createData).not.toHaveProperty("signedAt");
    expect(createData).not.toHaveProperty("signedById");
    expect(createData).not.toHaveProperty("completedAt");
    expect(createData).not.toHaveProperty("certificateHash");

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "BranchDailyCloseRun",
        entityId: "daily-close-1",
        action: "BRANCH_DAILY_CLOSE_REVIEW_STARTED",
        userId: "user-1",
        organizationId: "org-1",
      }),
    });
    expect(tx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "branch.daily-close.review-started",
          eventSource: "INTERNAL",
          idempotencyKey: "branch-daily-close-review:close-review-1",
          actorId: "user-1",
          locationId: "location-1",
          sourceId: "daily-close-1",
          documentHash: result.run.evidenceHash,
          outboxMessages: { create: [] },
        }),
      }),
    );
    const eventPayload = tx.businessEvent.create.mock.calls[0][0].data.payload;
    expect(eventPayload.controls).toEqual({
      nonFinalReviewOnly: true,
      paymentLocationOwnershipClaimed: false,
      managerSignOffIncluded: false,
    });
    expect(sensitiveFinancialKeys(eventPayload)).toEqual([]);
    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  });

  it("stores action-required readiness as a blocked non-final review", async () => {
    mockGetReadiness.mockResolvedValue(
      readinessFixture({
        readiness: "ACTION_REQUIRED",
        blockers: [
          {
            code: "OPEN_POS_SESSION",
            severity: "high",
            gate: "end_of_day.pos_session_closure",
            title: "POS session remains open",
            detail: "One session remains open.",
            sourceTables: ["pos_sessions"],
            nextAction: "Close the session.",
          },
        ],
      }),
    );

    const result = await startBranchDailyCloseReview(defaultInput());

    expect(result.run.status).toBe("BLOCKED");
    expect(result.run.readinessState).toBe("ACTION_REQUIRED");
    expect(result.run.blockerCount).toBe(1);
    expect(
      tx.branchDailyCloseRun.create.mock.calls[0][0].data.evidenceManifest
        .blockers,
    ).toEqual([
      {
        code: "OPEN_POS_SESSION",
        severity: "high",
        gate: "end_of_day.pos_session_closure",
        sourceTables: ["pos_sessions"],
      },
    ]);
  });

  it("accepts readiness already constrained to one managed location", async () => {
    mockGetReadiness.mockResolvedValue(
      readinessFixture({
        authority: {
          kind: "LOCATION_RESPONSIBILITY",
          basis: "Location.managerId",
        },
      }),
    );

    const result = await startBranchDailyCloseReview(
      defaultInput({ accessContext: managerAccessContext() }),
    );

    expect(result.run.locationId).toBe("location-1");
    expect(
      tx.branchDailyCloseRun.create.mock.calls[0][0].data.evidenceManifest
        .authority,
    ).toEqual({
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
    });
  });

  it("rejects actor identity mismatch before readiness or mutation", async () => {
    await expect(
      startBranchDailyCloseReview(defaultInput({ actorId: "user-2" })),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(mockGetReadiness).not.toHaveBeenCalled();
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["organization", { organizationId: "org-2" }],
    ["actor", { actorId: "user-2" }],
    [
      "location scope",
      { scope: { kind: "LOCATION", locationId: "location-2" } },
    ],
    [
      "location record",
      { location: { id: "location-2", name: "Other", code: "BR-02" } },
    ],
    ["business date", { businessDate: "2026-07-17" }],
  ])(
    "fails closed on inconsistent %s readiness evidence",
    async (_label, override) => {
      mockGetReadiness.mockResolvedValue(readinessFixture(override));

      await expect(
        startBranchDailyCloseReview(defaultInput()),
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(mockDb.$transaction).not.toHaveBeenCalled();
    },
  );

  it("rejects readiness that omits the supported payment-capture source", async () => {
    const readiness = readinessFixture();
    mockGetReadiness.mockResolvedValue(
      readinessFixture({
        checklist: readiness.checklist.filter(
          (item) => item.key !== "PAYMENT_CAPTURE_ATTRIBUTION",
        ),
      }),
    );

    await expect(
      startBranchDailyCloseReview(defaultInput()),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("propagates cross-tenant readiness denial without opening a transaction", async () => {
    mockGetReadiness.mockRejectedValue(
      new ForbiddenError(
        "End-of-day close readiness is not available for this location.",
      ),
    );

    await expect(
      startBranchDailyCloseReview(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("returns the original run for deterministic same-key same-evidence replay without duplicate writes", async () => {
    const first = await startBranchDailyCloseReview(defaultInput());
    const stored = await tx.branchDailyCloseRun.create.mock.results[0].value;

    jest.clearAllMocks();
    mockGetReadiness.mockResolvedValue(readinessFixture());
    mockDb.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    tx.branchDailyCloseRun.findUnique.mockResolvedValueOnce(stored);

    const replay = await startBranchDailyCloseReview(defaultInput());

    expect(replay).toEqual({ ...first, created: false, replayed: true });
    expect(replay.run.evidenceHash).toBe(first.run.evidenceHash);
    expect(tx.branchDailyCloseRun.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.businessEvent.create).not.toHaveBeenCalled();
    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects same-key changed-evidence replay and persists conflict audit separately", async () => {
    await startBranchDailyCloseReview(defaultInput());
    const stored = await tx.branchDailyCloseRun.create.mock.results[0].value;

    jest.clearAllMocks();
    mockGetReadiness.mockResolvedValue(
      readinessFixture({ sourceHash: `sha256:${"b".repeat(64)}` }),
    );
    mockDb.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    tx.branchDailyCloseRun.findUnique.mockResolvedValueOnce(stored);
    mockDb.auditLog.create.mockResolvedValue({ id: "conflict-audit-1" });

    await expect(
      startBranchDailyCloseReview(defaultInput()),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(tx.branchDailyCloseRun.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.businessEvent.create).not.toHaveBeenCalled();
    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "BRANCH_DAILY_CLOSE_REVIEW_CONFLICT",
        organizationId: "org-1",
        changes: expect.objectContaining({
          after: expect.objectContaining({
            reason: "IDEMPOTENCY_PAYLOAD_MISMATCH",
          }),
        }),
      }),
    });
  });

  it("enforces one review per organization, location, and business date", async () => {
    const existing = storedRun({
      idempotencyKey: "original-key",
      requestHash: `sha256:${"c".repeat(64)}`,
    });
    tx.branchDailyCloseRun.findUnique.mockReset();
    tx.branchDailyCloseRun.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);

    await expect(
      startBranchDailyCloseReview(defaultInput()),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(tx.branchDailyCloseRun.create).not.toHaveBeenCalled();
    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityId: "daily-close-1",
        changes: expect.objectContaining({
          after: expect.objectContaining({
            reason: "LOCATION_DAY_ALREADY_HAS_REVIEW",
          }),
        }),
      }),
    });
  });

  it("surfaces a safe typed transactional event failure instead of returning a partial success", async () => {
    tx.businessEvent.create.mockRejectedValue(new Error("event write failed"));

    await expect(startBranchDailyCloseReview(defaultInput())).rejects.toMatchObject({
      name: "BusinessRuleError",
      message: "Branch daily-close review could not be started safely.",
    });

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.branchDailyCloseRun.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.businessEvent.create).toHaveBeenCalledTimes(1);
    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  });

  it.each([
    ["2026-02-30", "close-review-1"],
    ["18-07-2026", "close-review-1"],
    ["2026-07-18", "   "],
  ])(
    "rejects malformed command input before evidence reads",
    async (businessDate, idempotencyKey) => {
      await expect(
        startBranchDailyCloseReview(
          defaultInput({ businessDate, idempotencyKey }),
        ),
      ).rejects.toThrow();

      expect(mockGetReadiness).not.toHaveBeenCalled();
      expect(mockDb.$transaction).not.toHaveBeenCalled();
    },
  );
});

function defaultInput(
  override: Partial<Parameters<typeof startBranchDailyCloseReview>[0]> = {},
): Parameters<typeof startBranchDailyCloseReview>[0] {
  return {
    accessContext: tenantAccessContext(),
    actorId: "user-1",
    locationId: " location-1 ",
    businessDate: "2026-07-18",
    idempotencyKey: "close-review-1",
    correlationId: "correlation-1",
    now,
    maxAgeMinutes: 1440,
    ...override,
  };
}

function tenantAccessContext(): OperatingAccessContext {
  return {
    orgId: "org-1",
    userId: "user-1",
    isSuperUser: false,
    roles: [
      {
        id: "role-admin",
        name: "Administrator",
        code: "admin",
        permissions: ["dashboard.read"],
      },
    ],
    permissions: ["dashboard.read"],
  };
}

function managerAccessContext(): OperatingAccessContext {
  return {
    orgId: "org-1",
    userId: "user-1",
    isSuperUser: false,
    roles: [
      {
        id: "role-manager",
        name: "Manager",
        code: "manager",
        permissions: ["dashboard.read"],
      },
    ],
    permissions: ["dashboard.read"],
  };
}

function readinessFixture(
  override: Partial<EndOfDayCloseReadinessResult> = {},
): EndOfDayCloseReadinessResult {
  return {
    kind: "BRANCH_END_OF_DAY_CLOSE_READINESS",
    organizationId: "org-1",
    actorId: "user-1",
    generatedAt: now.toISOString(),
    businessDate: "2026-07-18",
    periodStart: "2026-07-18T00:00:00.000Z",
    periodEnd: "2026-07-18T23:59:59.999Z",
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
    checklist: [
      checklist(
        "LOCATION_ACTIVE",
        "READY",
        "LOCATION",
        "2026-07-18T18:00:00.000Z",
      ),
      checklist(
        "BRANCH_OPERATING_SNAPSHOT",
        "READY",
        "BRANCH_OPERATING_SNAPSHOT",
        "2026-07-18T20:00:00.000Z",
      ),
      checklist(
        "POS_SESSION_CLOSURE",
        "READY",
        "POS_SESSION",
        "2026-07-18T20:30:00.000Z",
      ),
      checklist(
        "CASH_DRAWER_CLOSURE",
        "READY",
        "CASH_DRAWER",
        "2026-07-18T20:45:00.000Z",
      ),
      checklist(
        "PAYMENT_CAPTURE_ATTRIBUTION",
        "READY",
        "PAYMENT_CAPTURE",
        "2026-07-18T20:40:00.000Z",
      ),
      checklist(
        "PAYMENT_RECONCILIATION",
        "UNSUPPORTED",
        "PAYMENT_RECONCILIATION",
        null,
      ),
      checklist("MANAGER_SIGN_OFF", "UNSUPPORTED", "MANAGER_SIGN_OFF", null),
    ],
    blockers: [
      {
        code: "UNLINKED_PAYMENT_BRANCH_COVERAGE_UNAVAILABLE",
        severity: "medium",
        gate: "branch_payment_attribution",
        title: "Unlinked payment branch coverage is unavailable",
        detail: "Unlinked captures are excluded.",
        sourceTables: ["payments", "sales_orders"],
        nextAction: "Define branch ownership.",
      },
      {
        code: "BRANCH_PROVIDER_RECONCILIATION_UNSUPPORTED",
        severity: "high",
        gate: "branch_payment_attribution",
        title: "Provider reconciliation is unsupported",
        detail: "Provider evidence is not branch-owned.",
        sourceTables: ["provider_accounts"],
        nextAction: "Define provider-account location ownership.",
      },
    ],
    sourceHash: `sha256:${"a".repeat(64)}`,
    ...override,
  };
}

function checklist(
  key: EndOfDayCloseReadinessResult["checklist"][number]["key"],
  status: EndOfDayCloseReadinessResult["checklist"][number]["status"],
  sourceType: EndOfDayCloseReadinessResult["checklist"][number]["evidence"]["sourceType"],
  observedAt: string | null,
): EndOfDayCloseReadinessResult["checklist"][number] {
  const supported = status !== "UNSUPPORTED";
  return {
    key,
    status,
    title: key,
    detail: key,
    evidence: {
      sourceType,
      sourceIds: supported ? [`${key.toLowerCase()}-1`] : [],
      sourceHash: supported
        ? `sha256:${key.charCodeAt(0).toString(16).padStart(2, "0").repeat(32)}`
        : null,
      observedAt,
      freshness: supported
        ? {
            generatedAt: now.toISOString(),
            sourceMaxUpdatedAt: observedAt,
            maxAgeMinutes: 1440,
            stale: false,
            staleReason: null,
          }
        : null,
      evidenceGrade: supported ? "operational" : "blocked",
    },
  };
}

function storedRun(override: Record<string, unknown> = {}) {
  return {
    id: "daily-close-1",
    organizationId: "org-1",
    locationId: "location-1",
    businessDate: new Date("2026-07-18T00:00:00.000Z"),
    periodStart: new Date("2026-07-18T00:00:00.000Z"),
    periodEnd: new Date("2026-07-18T23:59:59.999Z"),
    status: "IN_REVIEW",
    readinessState: "READY_FOR_REVIEW",
    evidenceCoverageState: "PARTIAL",
    supportedItemCount: 5,
    unsupportedItemCount: 2,
    blockerCount: 2,
    evidenceObservedAt: new Date("2026-07-18T20:45:00.000Z"),
    readinessSourceHash: `sha256:${"a".repeat(64)}`,
    evidenceHash: `sha256:${"d".repeat(64)}`,
    startedById: "user-1",
    startedAt: now,
    idempotencyKey: "close-review-1",
    requestHash: `sha256:${"e".repeat(64)}`,
    correlationId: "correlation-1",
    createdAt: now,
    updatedAt: now,
    ...override,
  };
}

function sensitiveFinancialKeys(value: unknown, path = "root"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      sensitiveFinancialKeys(item, `${path}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, item]) => {
    const current = `${path}.${key}`;
    const match = ["amount", "balance", "variance", "currency", "total"].some(
      (part) => key.toLowerCase().includes(part),
    );
    return [
      ...(match ? [current] : []),
      ...sensitiveFinancialKeys(item, current),
    ];
  });
}

