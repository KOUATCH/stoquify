jest.mock("server-only", () => ({}));

jest.mock("@/prisma/db", () => ({
  db: {
    branchDailyCloseRun: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    businessEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../end-of-day-close-readiness.service", () => ({
  getEndOfDayCloseReadiness: jest.fn(),
}));

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors";
import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts";

import { getBranchDailyCloseReviewDrift } from "../branch-daily-close-review-drift.service";
import type { EndOfDayCloseReadinessResult } from "../end-of-day-close-readiness-contracts";
import { getEndOfDayCloseReadiness } from "../end-of-day-close-readiness.service";

const mockGetReadiness = getEndOfDayCloseReadiness as jest.Mock;
const mockDb = db as unknown as {
  branchDailyCloseRun: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  auditLog: { create: jest.Mock };
  businessEvent: { create: jest.Mock };
  $transaction: jest.Mock;
};

const now = new Date("2026-07-18T21:00:00.000Z");
const currentSourceHash = `sha256:${"a".repeat(64)}`;
const storedEvidenceHash = `sha256:${"b".repeat(64)}`;

describe("branch daily-close review drift service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetReadiness.mockResolvedValue(readinessFixture());
    mockDb.branchDailyCloseRun.findUnique.mockResolvedValue(storedReviewRow());
  });

  it("returns CURRENT from one authorized current-readiness read and one minimal stored review read", async () => {
    const input = defaultInput();
    const result = await getBranchDailyCloseReviewDrift(input);

    expect(mockGetReadiness).toHaveBeenCalledTimes(1);
    expect(mockGetReadiness).toHaveBeenCalledWith({
      accessContext: input.accessContext,
      locationId: "location-1",
      businessDate: "2026-07-18",
      now,
      maxAgeMinutes: 1440,
    });
    expect(mockGetReadiness.mock.invocationCallOrder[0]).toBeLessThan(
      mockDb.branchDailyCloseRun.findUnique.mock.invocationCallOrder[0],
    );
    expect(mockDb.branchDailyCloseRun.findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_locationId_businessDate: {
          organizationId: "org-1",
          locationId: "location-1",
          businessDate: new Date("2026-07-18T00:00:00.000Z"),
        },
      },
      select: {
        id: true,
        organizationId: true,
        locationId: true,
        businessDate: true,
        readinessState: true,
        supportedItemCount: true,
        unsupportedItemCount: true,
        blockerCount: true,
        evidenceObservedAt: true,
        readinessSourceHash: true,
        evidenceHash: true,
      },
    });
    expect(result).toEqual({
      kind: "BRANCH_DAILY_CLOSE_REVIEW_DRIFT",
      organizationId: "org-1",
      actorId: "user-1",
      generatedAt: now.toISOString(),
      businessDate: "2026-07-18",
      authority: { kind: "TENANT_WIDE", basis: "RBAC_ROLE" },
      scope: { kind: "LOCATION", locationId: "location-1" },
      location: { id: "location-1", name: "Central Store", code: "BR-01" },
      state: "CURRENT",
      reasons: [],
      stored: {
        sourceId: "daily-close-1",
        observedAt: "2026-07-18T20:45:00.000Z",
        readinessState: "READY_FOR_REVIEW",
        readinessSourceHash: currentSourceHash,
        evidenceHash: storedEvidenceHash,
        supportedItemCount: 5,
        unsupportedItemCount: 2,
        blockerCount: 2,
      },
      current: {
        observedAt: "2026-07-18T20:45:00.000Z",
        readinessState: "READY_FOR_REVIEW",
        readinessSourceHash: currentSourceHash,
        supportedItemCount: 5,
        unsupportedItemCount: 2,
        blockerCount: 2,
      },
    });
    expect(prohibitedResultKeys(result)).toEqual([]);
    expectNoDomainWrites();
  });

  it("returns NOT_STARTED without inventing stored evidence", async () => {
    mockDb.branchDailyCloseRun.findUnique.mockResolvedValue(null);

    const result = await getBranchDailyCloseReviewDrift(defaultInput());

    expect(result.state).toBe("NOT_STARTED");
    expect(result.reasons).toEqual([]);
    expect(result.stored).toBeNull();
    expect(result.current.readinessSourceHash).toBe(currentSourceHash);
    expectNoDomainWrites();
  });

  it("returns every drift reason in deterministic order", async () => {
    mockDb.branchDailyCloseRun.findUnique.mockResolvedValue(
      storedReviewRow({
        readinessSourceHash: `sha256:${"c".repeat(64)}`,
        readinessState: "ACTION_REQUIRED",
        supportedItemCount: 4,
        unsupportedItemCount: 3,
        blockerCount: 1,
      }),
    );

    const result = await getBranchDailyCloseReviewDrift(defaultInput());

    expect(result.state).toBe("DRIFTED");
    expect(result.reasons).toEqual([
      "READINESS_SOURCE_HASH_CHANGED",
      "READINESS_STATE_CHANGED",
      "SUPPORTED_ITEM_COUNT_CHANGED",
      "UNSUPPORTED_ITEM_COUNT_CHANGED",
      "BLOCKER_COUNT_CHANGED",
    ]);
    expect(result).not.toHaveProperty("evidenceManifest");
    expect(prohibitedResultKeys(result)).toEqual([]);
    expectNoDomainWrites();
  });

  it("never reports CURRENT when only the readiness source hash changed", async () => {
    mockDb.branchDailyCloseRun.findUnique.mockResolvedValue(
      storedReviewRow({ readinessSourceHash: `sha256:${"d".repeat(64)}` }),
    );

    const result = await getBranchDailyCloseReviewDrift(defaultInput());

    expect(result.state).toBe("DRIFTED");
    expect(result.reasons).toEqual(["READINESS_SOURCE_HASH_CHANGED"]);
  });

  it("preserves one managed-location authority from current readiness", async () => {
    mockGetReadiness.mockResolvedValue(
      readinessFixture({
        authority: {
          kind: "LOCATION_RESPONSIBILITY",
          basis: "Location.managerId",
        },
      }),
    );

    const result = await getBranchDailyCloseReviewDrift({
      ...defaultInput(),
      accessContext: managerAccessContext(),
    });

    expect(result.authority).toEqual({
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
    });
    expect(result.scope).toEqual({
      kind: "LOCATION",
      locationId: "location-1",
    });
  });

  it.each(["cross-tenant", "unassigned-location"])(
    "propagates %s readiness denial before stored review reads",
    async () => {
      mockGetReadiness.mockRejectedValue(
        new ForbiddenError(
          "End-of-day close readiness is not available for this location.",
        ),
      );

      await expect(
        getBranchDailyCloseReviewDrift(defaultInput()),
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(mockDb.branchDailyCloseRun.findUnique).not.toHaveBeenCalled();
      expectNoDomainWrites();
    },
  );

  it.each(["2026-02-30", "18-07-2026", "", "2026-7-18"])(
    "rejects malformed business date %s before readiness or stored review reads",
    async (businessDate) => {
      await expect(
        getBranchDailyCloseReviewDrift({
          ...defaultInput(),
          businessDate,
        }),
      ).rejects.toBeInstanceOf(BusinessRuleError);

      expect(mockGetReadiness).not.toHaveBeenCalled();
      expect(mockDb.branchDailyCloseRun.findUnique).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["organization", { organizationId: "org-2" }],
    ["actor", { actorId: "user-2" }],
    ["scope", { scope: { kind: "LOCATION", locationId: "location-2" } }],
    [
      "location",
      { location: { id: "location-2", name: "Other", code: "BR-02" } },
    ],
    ["business date", { businessDate: "2026-07-17" }],
    ["source hash", { sourceHash: "invalid" }],
  ])(
    "fails closed on inconsistent current %s evidence before stored review reads",
    async (_label, override) => {
      mockGetReadiness.mockResolvedValue(readinessFixture(override));

      await expect(
        getBranchDailyCloseReviewDrift(defaultInput()),
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(mockDb.branchDailyCloseRun.findUnique).not.toHaveBeenCalled();
    },
  );

  it("requires capture-aware readiness while reconciliation and sign-off remain unsupported", async () => {
    const readiness = readinessFixture();
    mockGetReadiness.mockResolvedValue(
      readinessFixture({
        checklist: readiness.checklist.filter(
          (item) => item.key !== "PAYMENT_CAPTURE_ATTRIBUTION",
        ),
      }),
    );

    await expect(
      getBranchDailyCloseReviewDrift(defaultInput()),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(mockDb.branchDailyCloseRun.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["organization", { organizationId: "org-2" }],
    ["location", { locationId: "location-2" }],
    ["business date", { businessDate: new Date("2026-07-17T00:00:00.000Z") }],
    ["readiness state", { readinessState: "SIGNED_OFF" }],
    ["negative count", { blockerCount: -1 }],
    ["readiness hash", { readinessSourceHash: "invalid" }],
    ["evidence hash", { evidenceHash: "invalid" }],
  ])(
    "fails closed on inconsistent stored %s evidence",
    async (_label, override) => {
      mockDb.branchDailyCloseRun.findUnique.mockResolvedValue(
        storedReviewRow(override),
      );

      await expect(
        getBranchDailyCloseReviewDrift(defaultInput()),
      ).rejects.toBeInstanceOf(ForbiddenError);

      expectNoDomainWrites();
    },
  );
});

function defaultInput() {
  return {
    accessContext: tenantAccessContext(),
    locationId: " location-1 ",
    businessDate: "2026-07-18",
    now,
    maxAgeMinutes: 1440,
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

function storedReviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "daily-close-1",
    organizationId: "org-1",
    locationId: "location-1",
    businessDate: new Date("2026-07-18T00:00:00.000Z"),
    readinessState: "READY_FOR_REVIEW",
    supportedItemCount: 5,
    unsupportedItemCount: 2,
    blockerCount: 2,
    evidenceObservedAt: new Date("2026-07-18T20:45:00.000Z"),
    readinessSourceHash: currentSourceHash,
    evidenceHash: storedEvidenceHash,
    ...overrides,
  };
}

function readinessFixture(
  overrides: Partial<EndOfDayCloseReadinessResult> = {},
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
    sourceHash: currentSourceHash,
    ...overrides,
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
      evidenceGrade: supported ? "operational" : "raw",
    },
  };
}

function prohibitedResultKeys(value: unknown, path = "result"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      prohibitedResultKeys(item, `${path}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") return [];

  const prohibited = [
    "amount",
    "balance",
    "variance",
    "currency",
    "total",
    "manifest",
    "customer",
    "provider",
    "requesthash",
    "idempotencykey",
    "correlationid",
  ];
  return Object.entries(value).flatMap(([key, item]) => {
    const current = `${path}.${key}`;
    const match = prohibited.some((part) => key.toLowerCase().includes(part));
    return [
      ...(match ? [current] : []),
      ...prohibitedResultKeys(item, current),
    ];
  });
}

function expectNoDomainWrites() {
  expect(mockDb.branchDailyCloseRun.create).not.toHaveBeenCalled();
  expect(mockDb.branchDailyCloseRun.update).not.toHaveBeenCalled();
  expect(mockDb.branchDailyCloseRun.delete).not.toHaveBeenCalled();
  expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  expect(mockDb.businessEvent.create).not.toHaveBeenCalled();
  expect(mockDb.$transaction).not.toHaveBeenCalled();
}
