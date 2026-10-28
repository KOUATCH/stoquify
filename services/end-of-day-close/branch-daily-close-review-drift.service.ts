import "server-only";

import { Prisma } from "@prisma/client";

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors";

import type {
  BranchDailyCloseReviewCurrentEvidence,
  BranchDailyCloseReviewDriftInput,
  BranchDailyCloseReviewDriftReason,
  BranchDailyCloseReviewDriftResult,
  BranchDailyCloseReviewStoredEvidence,
} from "./branch-daily-close-review-drift-contracts";
import type {
  EndOfDayCloseReadinessResult,
  EndOfDayCloseReadinessState,
} from "./end-of-day-close-readiness-contracts";
import { getEndOfDayCloseReadiness } from "./end-of-day-close-readiness.service";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;
const READINESS_STATES = new Set<EndOfDayCloseReadinessState>([
  "READY_FOR_REVIEW",
  "ACTION_REQUIRED",
  "NO_ACTIVITY",
  "UNAVAILABLE",
]);

const RUN_SELECT = {
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
} satisfies Prisma.BranchDailyCloseRunSelect;

type StoredReviewRow = Prisma.BranchDailyCloseRunGetPayload<{
  select: typeof RUN_SELECT;
}>;

export async function getBranchDailyCloseReviewDrift(
  input: BranchDailyCloseReviewDriftInput,
): Promise<BranchDailyCloseReviewDriftResult> {
  const locationId = normalizeLocationId(input.locationId);
  const businessDateValue = parseBusinessDate(input.businessDate);
  const businessDate = businessDateValue.toISOString().slice(0, 10);

  const readiness = await getEndOfDayCloseReadiness({
    accessContext: input.accessContext,
    locationId,
    businessDate,
    now: input.now,
    maxAgeMinutes: input.maxAgeMinutes,
  });
  assertCurrentReadinessIdentity(readiness, {
    organizationId: input.accessContext.orgId,
    actorId: input.accessContext.userId,
    locationId,
    businessDate,
  });

  const storedRow = await db.branchDailyCloseRun.findUnique({
    where: {
      organizationId_locationId_businessDate: {
        organizationId: readiness.organizationId,
        locationId,
        businessDate: businessDateValue,
      },
    },
    select: RUN_SELECT,
  });

  if (storedRow) {
    assertStoredReviewIdentity(storedRow, {
      organizationId: readiness.organizationId,
      locationId,
      businessDate,
    });
  }

  const current = currentEvidence(readiness);
  const stored = storedRow ? storedEvidence(storedRow) : null;
  const reasons = stored ? driftReasons(stored, current) : [];

  return {
    kind: "BRANCH_DAILY_CLOSE_REVIEW_DRIFT",
    organizationId: readiness.organizationId,
    actorId: readiness.actorId,
    generatedAt: readiness.generatedAt,
    businessDate,
    authority: { ...readiness.authority },
    scope: {
      kind: "LOCATION",
      locationId,
    },
    location: { ...readiness.location },
    state: !stored ? "NOT_STARTED" : reasons.length > 0 ? "DRIFTED" : "CURRENT",
    reasons,
    stored,
    current,
  };
}

function normalizeLocationId(value: string) {
  const locationId = value?.trim();
  if (!locationId) {
    throw new BusinessRuleError(
      "A location is required for branch daily-close drift assessment.",
    );
  }
  return locationId;
}

function parseBusinessDate(value: string) {
  const businessDate = value?.trim();
  if (!BUSINESS_DATE_PATTERN.test(businessDate)) {
    throw new BusinessRuleError(
      "Branch daily-close drift businessDate must use YYYY-MM-DD.",
    );
  }

  const parsed = new Date(`${businessDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== businessDate
  ) {
    throw new BusinessRuleError(
      "Branch daily-close drift businessDate must be a valid calendar date.",
    );
  }
  return parsed;
}

function assertCurrentReadinessIdentity(
  readiness: EndOfDayCloseReadinessResult,
  input: {
    organizationId: string;
    actorId: string;
    locationId: string;
    businessDate: string;
  },
) {
  if (
    readiness.kind !== "BRANCH_END_OF_DAY_CLOSE_READINESS" ||
    readiness.organizationId !== input.organizationId ||
    readiness.actorId !== input.actorId ||
    readiness.scope.kind !== "LOCATION" ||
    readiness.scope.locationId !== input.locationId ||
    readiness.location.id !== input.locationId ||
    readiness.businessDate !== input.businessDate ||
    !validDate(readiness.generatedAt) ||
    !SHA256_PATTERN.test(readiness.sourceHash) ||
    !validCounts(
      readiness.evidenceCoverage.supportedItemCount,
      readiness.evidenceCoverage.unsupportedItemCount,
      readiness.blockers.length,
    )
  ) {
    throw new ForbiddenError(
      "Branch daily-close current readiness evidence is inconsistent.",
    );
  }

  const capture = readiness.checklist.find(
    (item) => item.key === "PAYMENT_CAPTURE_ATTRIBUTION",
  );
  const reconciliation = readiness.checklist.find(
    (item) => item.key === "PAYMENT_RECONCILIATION",
  );
  const signOff = readiness.checklist.find(
    (item) => item.key === "MANAGER_SIGN_OFF",
  );
  if (
    !capture ||
    capture.status === "UNSUPPORTED" ||
    capture.evidence.sourceType !== "PAYMENT_CAPTURE" ||
    !capture.evidence.sourceHash ||
    reconciliation?.status !== "UNSUPPORTED" ||
    reconciliation.evidence.sourceIds.length !== 0 ||
    reconciliation.evidence.sourceHash !== null ||
    signOff?.status !== "UNSUPPORTED" ||
    signOff.evidence.sourceIds.length !== 0 ||
    signOff.evidence.sourceHash !== null ||
    readiness.completion.signOffSupported ||
    readiness.completion.signedOff
  ) {
    throw new BusinessRuleError(
      "Branch daily-close drift requires the non-final capture-aware readiness contract.",
    );
  }
}

function assertStoredReviewIdentity(
  stored: StoredReviewRow,
  input: {
    organizationId: string;
    locationId: string;
    businessDate: string;
  },
) {
  if (
    !stored.id?.trim() ||
    stored.organizationId !== input.organizationId ||
    stored.locationId !== input.locationId ||
    !validDate(stored.businessDate) ||
    stored.businessDate.toISOString().slice(0, 10) !== input.businessDate ||
    !READINESS_STATES.has(
      stored.readinessState as EndOfDayCloseReadinessState,
    ) ||
    !validCounts(
      stored.supportedItemCount,
      stored.unsupportedItemCount,
      stored.blockerCount,
    ) ||
    !validDate(stored.evidenceObservedAt) ||
    !SHA256_PATTERN.test(stored.readinessSourceHash) ||
    !SHA256_PATTERN.test(stored.evidenceHash)
  ) {
    throw new ForbiddenError(
      "Branch daily-close stored review evidence is inconsistent.",
    );
  }
}

function currentEvidence(
  readiness: EndOfDayCloseReadinessResult,
): BranchDailyCloseReviewCurrentEvidence {
  const observedAt = readiness.checklist
    .filter((item) => item.status !== "UNSUPPORTED" && item.evidence.observedAt)
    .map((item) => item.evidence.observedAt as string)
    .sort()
    .at(-1);

  return {
    observedAt: observedAt ?? readiness.generatedAt,
    readinessState: readiness.readiness,
    readinessSourceHash: readiness.sourceHash,
    supportedItemCount: readiness.evidenceCoverage.supportedItemCount,
    unsupportedItemCount: readiness.evidenceCoverage.unsupportedItemCount,
    blockerCount: readiness.blockers.length,
  };
}

function storedEvidence(
  stored: StoredReviewRow,
): BranchDailyCloseReviewStoredEvidence {
  return {
    sourceId: stored.id,
    observedAt: stored.evidenceObservedAt.toISOString(),
    readinessState: stored.readinessState as EndOfDayCloseReadinessState,
    readinessSourceHash: stored.readinessSourceHash,
    evidenceHash: stored.evidenceHash,
    supportedItemCount: stored.supportedItemCount,
    unsupportedItemCount: stored.unsupportedItemCount,
    blockerCount: stored.blockerCount,
  };
}

function driftReasons(
  stored: BranchDailyCloseReviewStoredEvidence,
  current: BranchDailyCloseReviewCurrentEvidence,
): BranchDailyCloseReviewDriftReason[] {
  const reasons: BranchDailyCloseReviewDriftReason[] = [];
  if (stored.readinessSourceHash !== current.readinessSourceHash) {
    reasons.push("READINESS_SOURCE_HASH_CHANGED");
  }
  if (stored.readinessState !== current.readinessState) {
    reasons.push("READINESS_STATE_CHANGED");
  }
  if (stored.supportedItemCount !== current.supportedItemCount) {
    reasons.push("SUPPORTED_ITEM_COUNT_CHANGED");
  }
  if (stored.unsupportedItemCount !== current.unsupportedItemCount) {
    reasons.push("UNSUPPORTED_ITEM_COUNT_CHANGED");
  }
  if (stored.blockerCount !== current.blockerCount) {
    reasons.push("BLOCKER_COUNT_CHANGED");
  }
  return reasons;
}

function validCounts(...values: number[]) {
  return values.every((value) => Number.isInteger(value) && value >= 0);
}

function validDate(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(parsed.getTime());
}
