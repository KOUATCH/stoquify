import "server-only";

import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors";
import type { AllowedOperatingAccessScope } from "@/services/operating-access/operating-access-scope-contracts";
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service";
import {
  createFreshness,
  createSnapshotSourceHash,
  maxDate,
  normalizeSnapshotScope,
} from "@/services/snapshots/snapshot-utils";

import type {
  BranchPaymentAttributionBlocker,
  BranchPaymentAttributionInput,
  BranchPaymentAttributionResult,
  BranchPaymentAttributionState,
} from "./branch-payment-attribution-contracts";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.PARTIAL,
  PaymentStatus.PAID,
  PaymentStatus.REFUNDED,
  PaymentStatus.CANCELLED,
];

const PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.MOBILE_MONEY,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.CREDIT,
  PaymentMethod.STORE_CREDIT,
  PaymentMethod.CHEQUE,
  PaymentMethod.MIXED,
];

const PAYMENT_ATTRIBUTION_SELECT = {
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
} satisfies Prisma.PaymentSelect;

type PaymentAttributionRow = Prisma.PaymentGetPayload<{
  select: typeof PAYMENT_ATTRIBUTION_SELECT;
}>;

export type InternalBranchPaymentAttributionReadInput = {
  access: AllowedOperatingAccessScope;
  organizationId: string;
  actorId: string;
  locationId: string;
  location: {
    id: string;
    name: string;
    code: string;
  };
  businessDate: string;
  periodStart: Date;
  periodEnd: Date;
  now: Date;
  maxAgeMinutes: number;
};

export async function getBranchPaymentAttribution(
  input: BranchPaymentAttributionInput,
): Promise<BranchPaymentAttributionResult> {
  const locationId = normalizeLocationId(input.locationId);
  const businessDate = parseBusinessDate(input.businessDate);
  const now =
    parseOptionalDate(input.now, "Branch payment attribution now") ??
    new Date();

  const access = await resolveOperatingAccessScope(input.accessContext);
  if (!access.allowed) {
    throw new ForbiddenError(
      "Branch payment attribution is not available for this account.",
    );
  }

  assertAccessIdentity(access, input);
  assertLocationAuthority(access, locationId);

  const scope = normalizeSnapshotScope({
    organizationId: access.organizationId,
    locationId,
    periodStart: businessDate,
    periodEnd: businessDate,
    now,
    maxAgeMinutes: input.maxAgeMinutes,
  });

  const location = await db.location.findFirst({
    where: {
      id: locationId,
      organizationId: access.organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  if (!location) {
    throw new ForbiddenError(
      "Branch payment attribution is not available for this location.",
    );
  }

  return readBranchPaymentAttributionForVerifiedCloseContext({
    access,
    organizationId: input.accessContext.orgId,
    actorId: input.accessContext.userId,
    locationId,
    location,
    businessDate: scope.periodStart.toISOString().slice(0, 10),
    periodStart: scope.periodStart,
    periodEnd: scope.periodEnd,
    now: scope.now,
    maxAgeMinutes: scope.maxAgeMinutes,
  });
}

// Internal composition boundary for callers that already resolved access and verified location.
export async function readBranchPaymentAttributionForVerifiedCloseContext(
  input: InternalBranchPaymentAttributionReadInput,
): Promise<BranchPaymentAttributionResult> {
  const scope = assertInternalReadCoherence(input);

  const payments = await db.payment.findMany({
    where: {
      organizationId: input.access.organizationId,
      deletedAt: null,
      purchaseOrderId: null,
      createdAt: {
        gte: scope.periodStart,
        lte: scope.periodEnd,
      },
      salesOrder: {
        organizationId: input.access.organizationId,
        locationId: input.locationId,
        deletedAt: null,
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: PAYMENT_ATTRIBUTION_SELECT,
  });

  payments.forEach((payment) =>
    assertPaymentIdentity(payment, {
      organizationId: input.access.organizationId,
      locationId: input.locationId,
      periodStart: scope.periodStart,
      periodEnd: scope.periodEnd,
    }),
  );

  const sourceMaxUpdatedAt = maxDate(
    payments.map((payment) => payment.updatedAt),
  );
  const freshness = createFreshness({
    generatedAt: scope.now,
    sourceMaxUpdatedAt,
    maxAgeMinutes: scope.maxAgeMinutes,
  });
  const statusCounts = paymentStatusCounts(payments);
  const methodCounts = paymentMethodCounts(payments);
  const state = attributionState(payments.length, freshness.stale);
  const blockers = attributionBlockers(freshness.stale);
  const sourceHash = createSnapshotSourceHash({
    kind: "BRANCH_PAYMENT_CAPTURE_ATTRIBUTION",
    organizationId: input.access.organizationId,
    locationId: input.locationId,
    businessDate: scope.periodStart.toISOString().slice(0, 10),
    attributionBasis: "PAYMENT_SALES_ORDER_LOCATION",
    dateBasis: "PAYMENT_CREATED_AT_UTC",
    payments: payments.map((payment) => ({
      id: payment.id,
      salesOrderId: payment.salesOrderId,
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    })),
    coverage: {
      directSalesOrderCapture: "SUPPORTED",
      unlinkedPaymentBranchCoverage: "UNAVAILABLE",
      externalProviderReconciliation: "UNSUPPORTED",
    },
  });

  return {
    kind: "BRANCH_PAYMENT_CAPTURE_ATTRIBUTION",
    organizationId: input.access.organizationId,
    actorId: input.access.actorId,
    generatedAt: scope.now.toISOString(),
    businessDate: scope.periodStart.toISOString().slice(0, 10),
    periodStart: scope.periodStart.toISOString(),
    periodEnd: scope.periodEnd.toISOString(),
    authority: authoritySummary(input.access),
    scope: {
      kind: "LOCATION",
      locationId: input.locationId,
    },
    location: { ...input.location },
    state,
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
      paymentCount: payments.length,
      statusCounts,
      methodCounts,
    },
    evidence: {
      sourceType: "PAYMENT_CAPTURE",
      sourceIds: payments.map((payment) => payment.id),
      sourceHash,
      observedAt: sourceMaxUpdatedAt?.toISOString() ?? null,
      freshness,
      evidenceGrade: payments.length > 0 ? "operational" : "raw",
    },
    blockers,
  };
}

function assertInternalReadCoherence(
  input: InternalBranchPaymentAttributionReadInput,
) {
  if (
    !input.access.allowed ||
    input.access.organizationId !== input.organizationId ||
    input.access.actorId !== input.actorId
  ) {
    throw new ForbiddenError(
      "Branch payment operating scope evidence is inconsistent.",
    );
  }

  assertLocationAuthority(input.access, input.locationId);
  if (
    input.location.id !== input.locationId ||
    !input.location.name?.trim() ||
    !input.location.code?.trim()
  ) {
    throw new ForbiddenError(
      "Branch payment verified location evidence is inconsistent.",
    );
  }

  const businessDate = parseBusinessDate(input.businessDate);
  const scope = normalizeSnapshotScope({
    organizationId: input.organizationId,
    locationId: input.locationId,
    periodStart: businessDate,
    periodEnd: businessDate,
    now: input.now,
    maxAgeMinutes: input.maxAgeMinutes,
  });
  if (
    !(input.periodStart instanceof Date) ||
    !(input.periodEnd instanceof Date) ||
    Number.isNaN(input.periodStart.getTime()) ||
    Number.isNaN(input.periodEnd.getTime()) ||
    input.periodStart.getTime() !== scope.periodStart.getTime() ||
    input.periodEnd.getTime() !== scope.periodEnd.getTime()
  ) {
    throw new ForbiddenError(
      "Branch payment business-date evidence is inconsistent.",
    );
  }

  return scope;
}

function normalizeLocationId(value: string) {
  const locationId = value?.trim();
  if (!locationId) {
    throw new BusinessRuleError(
      "A location is required for branch payment attribution.",
    );
  }
  return locationId;
}

function parseBusinessDate(value: string) {
  const businessDate = value?.trim();
  if (!BUSINESS_DATE_PATTERN.test(businessDate)) {
    throw new BusinessRuleError(
      "Branch payment businessDate must use YYYY-MM-DD.",
    );
  }

  const parsed = new Date(`${businessDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== businessDate
  ) {
    throw new BusinessRuleError(
      "Branch payment businessDate must be a valid calendar date.",
    );
  }
  return parsed;
}

function parseOptionalDate(
  value: Date | string | null | undefined,
  label: string,
) {
  if (value === null || value === undefined) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BusinessRuleError(`${label} must be a valid date.`);
  }
  return parsed;
}

function assertAccessIdentity(
  access: AllowedOperatingAccessScope,
  input: BranchPaymentAttributionInput,
) {
  if (
    access.organizationId !== input.accessContext.orgId ||
    access.actorId !== input.accessContext.userId
  ) {
    throw new ForbiddenError(
      "Branch payment operating scope evidence is inconsistent.",
    );
  }
}

function assertLocationAuthority(
  access: AllowedOperatingAccessScope,
  locationId: string,
) {
  if (
    access.scope.kind === "TENANT" &&
    access.authority.kind === "TENANT_WIDE"
  ) {
    return;
  }

  if (
    access.scope.kind === "LOCATIONS" &&
    access.authority.kind === "LOCATION_RESPONSIBILITY"
  ) {
    const managedLocationIds = access.authority.managedLocations.map(
      (location) => location.id,
    );
    const scopedLocationIds = access.scope.locationIds;
    if (
      managedLocationIds.length !== scopedLocationIds.length ||
      managedLocationIds.some((id, index) => id !== scopedLocationIds[index])
    ) {
      throw new ForbiddenError(
        "Branch payment operating scope evidence is inconsistent.",
      );
    }
    if (!scopedLocationIds.includes(locationId)) {
      throw new ForbiddenError(
        "Branch payment attribution is not available for this location.",
      );
    }
    return;
  }

  throw new ForbiddenError(
    "Branch payment operating scope evidence is inconsistent.",
  );
}

function authoritySummary(access: AllowedOperatingAccessScope) {
  if (access.authority.kind === "TENANT_WIDE") {
    return {
      kind: access.authority.kind,
      basis: access.authority.basis,
    } as const;
  }

  return {
    kind: access.authority.kind,
    basis: access.authority.basis,
  } as const;
}

function assertPaymentIdentity(
  payment: PaymentAttributionRow,
  input: {
    organizationId: string;
    locationId: string;
    periodStart: Date;
    periodEnd: Date;
  },
) {
  if (
    payment.organizationId !== input.organizationId ||
    !payment.salesOrderId ||
    !payment.salesOrder ||
    payment.salesOrder.id !== payment.salesOrderId ||
    payment.salesOrder.organizationId !== input.organizationId ||
    payment.salesOrder.locationId !== input.locationId ||
    payment.createdAt < input.periodStart ||
    payment.createdAt > input.periodEnd
  ) {
    throw new ForbiddenError(
      "Branch payment capture evidence is inconsistent.",
    );
  }
}

function paymentStatusCounts(payments: PaymentAttributionRow[]) {
  const counts = Object.fromEntries(
    PAYMENT_STATUSES.map((status) => [status, 0]),
  ) as Record<PaymentStatus, number>;
  payments.forEach((payment) => {
    counts[payment.status] += 1;
  });
  return counts;
}

function paymentMethodCounts(payments: PaymentAttributionRow[]) {
  const counts = Object.fromEntries(
    PAYMENT_METHODS.map((method) => [method, 0]),
  ) as Record<PaymentMethod, number>;
  payments.forEach((payment) => {
    counts[payment.method] += 1;
  });
  return counts;
}

function attributionState(
  paymentCount: number,
  stale: boolean,
): BranchPaymentAttributionState {
  if (paymentCount === 0) return "NO_ACTIVITY_WITH_LIMITATIONS";
  if (stale) return "STALE_WITH_LIMITATIONS";
  return "AVAILABLE_WITH_LIMITATIONS";
}

function attributionBlockers(
  stale: boolean,
): BranchPaymentAttributionBlocker[] {
  const blockers: BranchPaymentAttributionBlocker[] = [
    {
      code: "UNLINKED_PAYMENT_BRANCH_COVERAGE_UNAVAILABLE",
      severity: "medium",
      gate: "branch_payment_attribution",
      title: "Unlinked payment branch coverage is unavailable",
      detail:
        "Payments without an organization-owned sales order have no trustworthy branch owner and are not counted.",
      sourceTables: ["payments", "sales_orders"],
      nextAction:
        "Establish a durable payment-to-location ownership rule before including unlinked captures.",
    },
    {
      code: "BRANCH_PROVIDER_RECONCILIATION_UNSUPPORTED",
      severity: "high",
      gate: "branch_payment_attribution",
      title: "External provider reconciliation is not branch-owned",
      detail:
        "Provider events, statements, payment transactions, and reconciliation runs do not currently prove branch ownership.",
      sourceTables: [
        "provider_accounts",
        "provider_events",
        "statement_lines",
        "payment_transactions",
        "reconciliation_runs",
      ],
      nextAction:
        "Define and validate provider-account location ownership before branch reconciliation.",
    },
  ];

  if (stale) {
    blockers.push({
      code: "BRANCH_PAYMENT_CAPTURE_EVIDENCE_STALE",
      severity: "medium",
      gate: "branch_payment_attribution",
      title: "Branch payment capture evidence is stale",
      detail:
        "The latest directly attributed payment capture is older than the allowed evidence age.",
      sourceTables: ["payments", "sales_orders"],
      nextAction:
        "Refresh or review branch payment capture evidence before relying on it.",
    });
  }

  return blockers;
}
