jest.mock("server-only", () => ({}));

jest.mock("@/prisma/db", () => ({
  db: {
    location: { findFirst: jest.fn() },
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
    auditLog: { create: jest.fn() },
    businessEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/services/operating-access/operating-access-scope.service", () => ({
  resolveOperatingAccessScope: jest.fn(),
}));

import { PaymentMethod, PaymentStatus } from "@prisma/client";

import { db } from "@/prisma/db";
import { ForbiddenError } from "@/services/_shared/action-errors";
import type {
  AllowedOperatingAccessScope,
  OperatingAccessContext,
} from "@/services/operating-access/operating-access-scope-contracts";
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service";

import {
  getBranchPaymentAttribution,
  readBranchPaymentAttributionForVerifiedCloseContext,
} from "../branch-payment-attribution.service";

const mockResolveOperatingAccessScope =
  resolveOperatingAccessScope as jest.Mock;
const mockDb = db as unknown as {
  location: { findFirst: jest.Mock };
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
  auditLog: { create: jest.Mock };
  businessEvent: { create: jest.Mock };
  $transaction: jest.Mock;
};

const now = "2026-07-18T21:00:00.000Z";

describe("branch payment attribution service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveOperatingAccessScope.mockResolvedValue(tenantAccessDecision());
    mockDb.location.findFirst.mockResolvedValue({
      id: "location-1",
      name: "Central Store",
      code: "BR-01",
    });
    mockDb.payment.findMany.mockResolvedValue([
      paymentRow({
        id: "payment-1",
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        createdAt: new Date("2026-07-18T09:00:00.000Z"),
        updatedAt: new Date("2026-07-18T20:30:00.000Z"),
      }),
      paymentRow({
        id: "payment-2",
        method: PaymentMethod.MOBILE_MONEY,
        status: PaymentStatus.PENDING,
        createdAt: new Date("2026-07-18T10:00:00.000Z"),
        updatedAt: new Date("2026-07-18T20:45:00.000Z"),
      }),
    ]);
  });

  it("returns one tenant-authorized branch's directly attributed payment captures", async () => {
    const context = tenantAccessContext();
    const result = await getBranchPaymentAttribution({
      accessContext: context,
      locationId: " location-1 ",
      businessDate: "2026-07-18",
      now,
      maxAgeMinutes: 1440,
    });

    expect(mockResolveOperatingAccessScope).toHaveBeenCalledWith(context);
    expect(
      mockResolveOperatingAccessScope.mock.invocationCallOrder[0],
    ).toBeLessThan(mockDb.location.findFirst.mock.invocationCallOrder[0]);
    expect(mockDb.location.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      mockDb.payment.findMany.mock.invocationCallOrder[0],
    );
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
      },
    });
    expect(mockDb.payment.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        deletedAt: null,
        purchaseOrderId: null,
        createdAt: {
          gte: new Date("2026-07-18T00:00:00.000Z"),
          lte: new Date("2026-07-18T23:59:59.999Z"),
        },
        salesOrder: {
          organizationId: "org-1",
          locationId: "location-1",
          deletedAt: null,
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        organizationId: true,
        salesOrderId: true,
        method: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        salesOrder: {
          select: {
            id: true,
            organizationId: true,
            locationId: true,
          },
        },
      },
    });
    expect(result).toMatchObject({
      kind: "BRANCH_PAYMENT_CAPTURE_ATTRIBUTION",
      organizationId: "org-1",
      actorId: "user-1",
      businessDate: "2026-07-18",
      periodStart: "2026-07-18T00:00:00.000Z",
      periodEnd: "2026-07-18T23:59:59.999Z",
      authority: { kind: "TENANT_WIDE", basis: "RBAC_ROLE" },
      scope: { kind: "LOCATION", locationId: "location-1" },
      location: { id: "location-1", name: "Central Store", code: "BR-01" },
      state: "AVAILABLE_WITH_LIMITATIONS",
      attribution: {
        basis: "PAYMENT_SALES_ORDER_LOCATION",
        dateBasis: "PAYMENT_CREATED_AT_UTC",
        returnedRecordsDirectlyAttributed: true,
      },
      coverage: {
        state: "PARTIAL",
        complete: false,
        directSalesOrderCapture: "SUPPORTED",
        unlinkedPaymentBranchCoverage: {
          state: "UNAVAILABLE",
          count: null,
          reasonCode: "UNLINKED_PAYMENTS_HAVE_NO_BRANCH_OWNER",
        },
        externalProviderReconciliation: {
          state: "UNSUPPORTED",
          sourceIds: [],
          sourceHash: null,
          reasonCode: "NO_BRANCH_OWNED_EXTERNAL_RECONCILIATION_SOURCE",
        },
      },
      facts: {
        paymentCount: 2,
        statusCounts: {
          PENDING: 1,
          PARTIAL: 0,
          PAID: 1,
          REFUNDED: 0,
          CANCELLED: 0,
        },
        methodCounts: {
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
      evidence: {
        sourceType: "PAYMENT_CAPTURE",
        sourceIds: ["payment-1", "payment-2"],
        observedAt: "2026-07-18T20:45:00.000Z",
        evidenceGrade: "operational",
      },
    });
    expect(result.evidence.sourceHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.blockers.map((blocker) => blocker.code)).toEqual([
      "UNLINKED_PAYMENT_BRANCH_COVERAGE_UNAVAILABLE",
      "BRANCH_PROVIDER_RECONCILIATION_UNSUPPORTED",
    ]);
    expect(
      prohibitedSelectorKeys(mockDb.payment.findMany.mock.calls[0][0].select),
    ).toEqual([]);
    expect(prohibitedResultKeys(result)).toEqual([]);
    expectNoDomainWrites();
  });

  it("returns no activity for one assigned branch without querying tenant fallback evidence", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue(locationAccessDecision());
    mockDb.payment.findMany.mockResolvedValue([]);

    const result = await getBranchPaymentAttribution({
      accessContext: managerAccessContext(),
      locationId: "location-1",
      businessDate: "2026-07-18",
      now,
    });

    expect(result).toMatchObject({
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        basis: "Location.managerId",
      },
      state: "NO_ACTIVITY_WITH_LIMITATIONS",
      facts: { paymentCount: 0 },
      evidence: {
        sourceIds: [],
        observedAt: null,
        evidenceGrade: "raw",
        freshness: {
          sourceMaxUpdatedAt: null,
          stale: false,
        },
      },
    });
    expect(mockDb.payment.findMany).toHaveBeenCalledTimes(1);
    expect(mockDb.payment.findMany.mock.calls[0][0].where.organizationId).toBe(
      "org-1",
    );
    expect(mockDb.providerEvent.findMany).not.toHaveBeenCalled();
    expect(mockDb.statementLine.findMany).not.toHaveBeenCalled();
    expect(mockDb.paymentTransaction.findMany).not.toHaveBeenCalled();
    expect(mockDb.reconciliationRun.findMany).not.toHaveBeenCalled();
    expectNoDomainWrites();
  });

  it("marks directly attributed captures stale without changing their attribution basis", async () => {
    const result = await getBranchPaymentAttribution({
      accessContext: tenantAccessContext(),
      locationId: "location-1",
      businessDate: "2026-07-18",
      now,
      maxAgeMinutes: 10,
    });

    expect(result.state).toBe("STALE_WITH_LIMITATIONS");
    expect(result.attribution.basis).toBe("PAYMENT_SALES_ORDER_LOCATION");
    expect(result.evidence.freshness).toMatchObject({
      sourceMaxUpdatedAt: "2026-07-18T20:45:00.000Z",
      maxAgeMinutes: 10,
      stale: true,
    });
    expect(result.blockers.map((blocker) => blocker.code)).toContain(
      "BRANCH_PAYMENT_CAPTURE_EVIDENCE_STALE",
    );
  });

  it("denies an unassigned location before any location or payment read", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue(locationAccessDecision());

    await expect(
      getBranchPaymentAttribution({
        accessContext: managerAccessContext(),
        locationId: "location-2",
        businessDate: "2026-07-18",
        now,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Branch payment attribution is not available for this location.",
      }),
    );

    expect(mockDb.location.findFirst).not.toHaveBeenCalled();
    expect(mockDb.payment.findMany).not.toHaveBeenCalled();
  });

  it("denies a rejected operating scope before location or payment reads", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue({
      allowed: false,
      organizationId: "org-1",
      actorId: "user-1",
      requiredPermission: "dashboard.read",
      authority: { kind: "DENIED", basis: "RBAC_PERMISSION" },
      reason: "MISSING_DAILY_TRUTH_PERMISSION",
      scope: null,
    });

    await expect(
      getBranchPaymentAttribution(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(mockDb.location.findFirst).not.toHaveBeenCalled();
    expect(mockDb.payment.findMany).not.toHaveBeenCalled();
  });

  it("uses the same non-enumerating denial for missing, inactive, deleted, or cross-tenant locations", async () => {
    mockDb.location.findFirst.mockResolvedValue(null);

    await expect(getBranchPaymentAttribution(defaultInput())).rejects.toEqual(
      expect.objectContaining({
        message:
          "Branch payment attribution is not available for this location.",
      }),
    );

    expect(mockDb.payment.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ["payment organization", { organizationId: "org-2" }],
    ["missing sales order link", { salesOrderId: null }],
    ["missing sales order", { salesOrder: null }],
    [
      "sales order id",
      {
        salesOrder: {
          id: "sale-2",
          organizationId: "org-1",
          locationId: "location-1",
        },
      },
    ],
    [
      "sales order organization",
      {
        salesOrder: {
          id: "sale-1",
          organizationId: "org-2",
          locationId: "location-1",
        },
      },
    ],
    [
      "sales order location",
      {
        salesOrder: {
          id: "sale-1",
          organizationId: "org-1",
          locationId: "location-2",
        },
      },
    ],
    ["payment date", { createdAt: new Date("2026-07-19T00:00:00.000Z") }],
  ])("fails closed on inconsistent %s evidence", async (_label, override) => {
    mockDb.payment.findMany.mockResolvedValue([paymentRow(override)]);

    await expect(
      getBranchPaymentAttribution(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expectNoDomainWrites();
  });

  it.each(["2026-02-30", "18-07-2026", "", "2026-7-18"])(
    "rejects malformed business date %s before resolving access",
    async (businessDate) => {
      await expect(
        getBranchPaymentAttribution({
          ...defaultInput(),
          businessDate,
        }),
      ).rejects.toThrow();

      expect(mockResolveOperatingAccessScope).not.toHaveBeenCalled();
      expect(mockDb.location.findFirst).not.toHaveBeenCalled();
      expect(mockDb.payment.findMany).not.toHaveBeenCalled();
    },
  );

  it("rejects operating authority and scope disagreement before evidence reads", async () => {
    mockResolveOperatingAccessScope.mockResolvedValue({
      ...tenantAccessDecision(),
      scope: { kind: "LOCATIONS", locationIds: ["location-1"] },
    });

    await expect(
      getBranchPaymentAttribution(defaultInput()),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(mockDb.location.findFirst).not.toHaveBeenCalled();
    expect(mockDb.payment.findMany).not.toHaveBeenCalled();
  });

  it("reads verified close context without resolving access or querying location again", async () => {
    const result =
      await readBranchPaymentAttributionForVerifiedCloseContext(
        internalReadInput(),
      );

    expect(result).toMatchObject({
      organizationId: "org-1",
      actorId: "user-1",
      businessDate: "2026-07-18",
      scope: { kind: "LOCATION", locationId: "location-1" },
      location: { id: "location-1", name: "Central Store", code: "BR-01" },
      facts: { paymentCount: 2 },
    });
    expect(mockResolveOperatingAccessScope).not.toHaveBeenCalled();
    expect(mockDb.location.findFirst).not.toHaveBeenCalled();
    expect(mockDb.payment.findMany).toHaveBeenCalledTimes(1);
    expectNoDomainWrites();
  });

  it.each([
    ["organization", { organizationId: "org-2" }],
    ["actor", { actorId: "user-2" }],
    [
      "verified location",
      { location: { id: "location-2", name: "Other", code: "BR-02" } },
    ],
    ["business date", { businessDate: "2026-07-17" }],
    ["period start", { periodStart: new Date("2026-07-17T00:00:00.000Z") }],
    ["period end", { periodEnd: new Date("2026-07-19T23:59:59.999Z") }],
  ])(
    "internal reader fails closed on inconsistent %s context",
    async (_label, override) => {
      await expect(
        readBranchPaymentAttributionForVerifiedCloseContext(
          internalReadInput(override),
        ),
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(mockResolveOperatingAccessScope).not.toHaveBeenCalled();
      expect(mockDb.location.findFirst).not.toHaveBeenCalled();
      expect(mockDb.payment.findMany).not.toHaveBeenCalled();
    },
  );

  it("internal reader rejects authority and scope disagreement before payment reads", async () => {
    await expect(
      readBranchPaymentAttributionForVerifiedCloseContext(
        internalReadInput({
          access: {
            ...tenantAccessDecision(),
            scope: { kind: "LOCATIONS", locationIds: ["location-1"] },
          } as AllowedOperatingAccessScope,
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(mockResolveOperatingAccessScope).not.toHaveBeenCalled();
    expect(mockDb.location.findFirst).not.toHaveBeenCalled();
    expect(mockDb.payment.findMany).not.toHaveBeenCalled();
  });

  it("does not read or claim provider reconciliation evidence", async () => {
    const result = await getBranchPaymentAttribution(defaultInput());

    expect(result.coverage.externalProviderReconciliation).toEqual({
      state: "UNSUPPORTED",
      sourceIds: [],
      sourceHash: null,
      reasonCode: "NO_BRANCH_OWNED_EXTERNAL_RECONCILIATION_SOURCE",
    });
    expect(mockDb.providerEvent.findMany).not.toHaveBeenCalled();
    expect(mockDb.statementLine.findMany).not.toHaveBeenCalled();
    expect(mockDb.paymentTransaction.findMany).not.toHaveBeenCalled();
    expect(mockDb.reconciliationRun.findMany).not.toHaveBeenCalled();
  });
});

type InternalReadInput = Parameters<
  typeof readBranchPaymentAttributionForVerifiedCloseContext
>[0];

function internalReadInput(
  overrides: Partial<InternalReadInput> = {},
): InternalReadInput {
  return {
    access: tenantAccessDecision(),
    organizationId: "org-1",
    actorId: "user-1",
    locationId: "location-1",
    location: {
      id: "location-1",
      name: "Central Store",
      code: "BR-01",
    },
    businessDate: "2026-07-18",
    periodStart: new Date("2026-07-18T00:00:00.000Z"),
    periodEnd: new Date("2026-07-18T23:59:59.999Z"),
    now: new Date(now),
    maxAgeMinutes: 1440,
    ...overrides,
  };
}

function defaultInput(): Parameters<typeof getBranchPaymentAttribution>[0] {
  return {
    accessContext: tenantAccessContext(),
    locationId: "location-1",
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
    scope: {
      kind: "TENANT",
      locationIds: null,
    },
  };
}

function locationAccessDecision(): AllowedOperatingAccessScope {
  return {
    allowed: true,
    organizationId: "org-1",
    actorId: "user-1",
    requiredPermission: "dashboard.read",
    authority: {
      kind: "LOCATION_RESPONSIBILITY",
      basis: "Location.managerId",
      managedLocations: [
        {
          id: "location-1",
          name: "Central Store",
          code: "BR-01",
        },
      ],
    },
    scope: {
      kind: "LOCATIONS",
      locationIds: ["location-1"],
    },
  };
}

function paymentRow(override: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    organizationId: "org-1",
    salesOrderId: "sale-1",
    method: PaymentMethod.CASH,
    status: PaymentStatus.PAID,
    createdAt: new Date("2026-07-18T09:00:00.000Z"),
    updatedAt: new Date("2026-07-18T20:30:00.000Z"),
    salesOrder: {
      id: "sale-1",
      organizationId: "org-1",
      locationId: "location-1",
    },
    ...override,
  };
}

function prohibitedSelectorKeys(value: unknown, path = "select"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      prohibitedSelectorKeys(item, `${path}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") return [];

  const prohibited = new Set([
    "amount",
    "feeAmount",
    "cashTendered",
    "changeGiven",
    "currencyCode",
    "mobileMoneyPhoneNumber",
    "mobileMoneyReference",
    "bankReference",
    "bankName",
    "cardType",
    "cardLast4",
    "authorizationCode",
    "transactionId",
    "processorResponse",
    "customer",
  ]);

  return Object.entries(value).flatMap(([key, item]) => {
    const current = `${path}.${key}`;
    return [
      ...(prohibited.has(key) ? [current] : []),
      ...prohibitedSelectorKeys(item, current),
    ];
  });
}

function prohibitedResultKeys(value: unknown, path = "result"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      prohibitedResultKeys(item, `${path}[${index}]`),
    );
  }
  if (!value || typeof value !== "object") return [];

  const prohibited = new Set([
    "amount",
    "balance",
    "variance",
    "currency",
    "feeAmount",
    "cashTendered",
    "changeGiven",
    "mobileMoneyPhoneNumber",
    "mobileMoneyReference",
    "bankReference",
    "bankName",
    "cardType",
    "cardLast4",
    "authorizationCode",
    "transactionId",
    "processorResponse",
    "customer",
  ]);

  return Object.entries(value).flatMap(([key, item]) => {
    const current = `${path}.${key}`;
    return [
      ...(prohibited.has(key) ? [current] : []),
      ...prohibitedResultKeys(item, current),
    ];
  });
}

function expectNoDomainWrites() {
  expect(mockDb.payment.create).not.toHaveBeenCalled();
  expect(mockDb.payment.update).not.toHaveBeenCalled();
  expect(mockDb.payment.delete).not.toHaveBeenCalled();
  expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  expect(mockDb.businessEvent.create).not.toHaveBeenCalled();
  expect(mockDb.$transaction).not.toHaveBeenCalled();
}
