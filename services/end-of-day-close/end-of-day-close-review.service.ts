import "server-only";

import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import { db } from "@/prisma/db";
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  getPrismaKnownRequest,
} from "@/services/_shared/action-errors";
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service";

import type {
  BranchDailyCloseEvidenceManifest,
  BranchDailyCloseRunRecord,
  BranchDailyCloseRunStatus,
  StartBranchDailyCloseReviewInput,
  StartBranchDailyCloseReviewResult,
} from "./end-of-day-close-review-contracts";
import type { EndOfDayCloseReadinessResult } from "./end-of-day-close-readiness-contracts";
import { getEndOfDayCloseReadiness } from "./end-of-day-close-readiness.service";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FORBIDDEN_MANIFEST_KEY_PARTS = [
  "amount",
  "balance",
  "variance",
  "currency",
  "total",
];

const RUN_SELECT = {
  id: true,
  organizationId: true,
  locationId: true,
  businessDate: true,
  periodStart: true,
  periodEnd: true,
  status: true,
  readinessState: true,
  evidenceCoverageState: true,
  supportedItemCount: true,
  unsupportedItemCount: true,
  blockerCount: true,
  evidenceObservedAt: true,
  readinessSourceHash: true,
  evidenceHash: true,
  startedById: true,
  startedAt: true,
  idempotencyKey: true,
  requestHash: true,
  correlationId: true,
  createdAt: true,
  updatedAt: true,
} as const;

type StoredRun = {
  id: string;
  organizationId: string;
  locationId: string;
  businessDate: Date;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  readinessState: string;
  evidenceCoverageState: string;
  supportedItemCount: number;
  unsupportedItemCount: number;
  blockerCount: number;
  evidenceObservedAt: Date;
  readinessSourceHash: string;
  evidenceHash: string;
  startedById: string;
  startedAt: Date;
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
};

type ReviewConflictReason =
  | "IDEMPOTENCY_PAYLOAD_MISMATCH"
  | "LOCATION_DAY_ALREADY_HAS_REVIEW"
  | "UNIQUE_CONSTRAINT_RACE"
  | "BUSINESS_EVENT_IDEMPOTENCY_CONFLICT";

type TransactionOutcome =
  | { kind: "CREATED"; run: StoredRun }
  | { kind: "REPLAY"; run: StoredRun }
  | { kind: "CONFLICT"; run: StoredRun | null; reason: ReviewConflictReason };

type NormalizedInput = {
  accessContext: StartBranchDailyCloseReviewInput["accessContext"];
  actorId: string;
  locationId: string;
  businessDate: string;
  businessDateValue: Date;
  idempotencyKey: string;
  correlationId: string;
  now: Date;
  maxAgeMinutes?: number | null;
};

export async function startBranchDailyCloseReview(
  input: StartBranchDailyCloseReviewInput,
): Promise<StartBranchDailyCloseReviewResult> {
  const normalized = normalizeInput(input);
  if (normalized.actorId !== normalized.accessContext.userId) {
    throw new ForbiddenError(
      "Branch daily-close review is not available for this account.",
    );
  }

  const readiness = await getEndOfDayCloseReadiness({
    accessContext: normalized.accessContext,
    locationId: normalized.locationId,
    businessDate: normalized.businessDate,
    now: normalized.now,
    maxAgeMinutes: normalized.maxAgeMinutes,
  });
  assertReadinessIdentity(readiness, normalized);

  const manifest = buildEvidenceManifest(readiness);
  assertDataMinimizedManifest(manifest);
  const evidenceHash = sha256(manifest);
  const requestHash = sha256({
    version: 1,
    command: "START_BRANCH_DAILY_CLOSE_REVIEW",
    organizationId: readiness.organizationId,
    actorId: normalized.actorId,
    locationId: normalized.locationId,
    businessDate: normalized.businessDate,
    idempotencyKey: normalized.idempotencyKey,
    evidenceHash,
  });
  const status = runStatusFor(readiness);
  const evidenceObservedAt = new Date(manifest.observedAt);
  const periodStart = new Date(readiness.periodStart);
  const periodEnd = new Date(readiness.periodEnd);

  let outcome: TransactionOutcome;
  try {
    outcome = await db.$transaction(async (tx): Promise<TransactionOutcome> => {
      const existingByKey = await tx.branchDailyCloseRun.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: readiness.organizationId,
            idempotencyKey: normalized.idempotencyKey,
          },
        },
        select: RUN_SELECT,
      });

      if (existingByKey) {
        return existingByKey.requestHash === requestHash
          ? { kind: "REPLAY", run: existingByKey }
          : {
              kind: "CONFLICT",
              run: existingByKey,
              reason: "IDEMPOTENCY_PAYLOAD_MISMATCH",
            };
      }

      const existingForDay = await tx.branchDailyCloseRun.findUnique({
        where: {
          organizationId_locationId_businessDate: {
            organizationId: readiness.organizationId,
            locationId: normalized.locationId,
            businessDate: normalized.businessDateValue,
          },
        },
        select: RUN_SELECT,
      });

      if (existingForDay) {
        return {
          kind: "CONFLICT",
          run: existingForDay,
          reason: "LOCATION_DAY_ALREADY_HAS_REVIEW",
        };
      }

      const startedAt = normalized.now;
      const created = await tx.branchDailyCloseRun.create({
        data: {
          organizationId: readiness.organizationId,
          locationId: normalized.locationId,
          businessDate: normalized.businessDateValue,
          periodStart,
          periodEnd,
          status,
          readinessState: readiness.readiness,
          evidenceCoverageState: readiness.evidenceCoverage.state,
          supportedItemCount: readiness.evidenceCoverage.supportedItemCount,
          unsupportedItemCount: readiness.evidenceCoverage.unsupportedItemCount,
          blockerCount: readiness.blockers.length,
          evidenceObservedAt,
          readinessSourceHash: readiness.sourceHash,
          evidenceHash,
          evidenceManifest: manifest as unknown as Prisma.InputJsonValue,
          startedById: normalized.actorId,
          startedAt,
          idempotencyKey: normalized.idempotencyKey,
          requestHash,
          correlationId: normalized.correlationId,
        },
        select: RUN_SELECT,
      });

      await tx.auditLog.create({
        data: {
          entityType: "BranchDailyCloseRun",
          entityId: created.id,
          action: "BRANCH_DAILY_CLOSE_REVIEW_STARTED",
          userId: normalized.actorId,
          organizationId: readiness.organizationId,
          changes: {
            after: {
              locationId: normalized.locationId,
              businessDate: normalized.businessDate,
              status,
              readinessState: readiness.readiness,
              evidenceCoverageState: readiness.evidenceCoverage.state,
              supportedItemCount: readiness.evidenceCoverage.supportedItemCount,
              unsupportedItemCount:
                readiness.evidenceCoverage.unsupportedItemCount,
              blockerCount: readiness.blockers.length,
              evidenceHash,
              readinessSourceHash: readiness.sourceHash,
              correlationId: normalized.correlationId,
            },
          },
        },
      });

      await recordBusinessEventInTx(tx, {
        organizationId: readiness.organizationId,
        eventType: "branch.daily-close.review-started",
        eventSource: "INTERNAL",
        idempotencyKey: `branch-daily-close-review:${normalized.idempotencyKey}`,
        occurredAt: startedAt,
        actorId: normalized.actorId,
        locationId: normalized.locationId,
        sourceId: created.id,
        documentHash: evidenceHash,
        payload: {
          version: 1,
          runId: created.id,
          organizationId: readiness.organizationId,
          locationId: normalized.locationId,
          businessDate: normalized.businessDate,
          status,
          readinessState: readiness.readiness,
          evidenceCoverageState: readiness.evidenceCoverage.state,
          blockerCount: readiness.blockers.length,
          evidenceObservedAt: manifest.observedAt,
          evidenceHash,
          readinessSourceHash: readiness.sourceHash,
          actorId: normalized.actorId,
          correlationId: normalized.correlationId,
          controls: {
            nonFinalReviewOnly: true,
            paymentLocationOwnershipClaimed: false,
            managerSignOffIncluded: false,
          },
        },
        metadata: {
          correlationId: normalized.correlationId,
          requestHash,
        },
        outboxMessages: [],
      });

      return { kind: "CREATED", run: created };
    });
  } catch (error) {
    const prismaError = getPrismaKnownRequest(error);
    if (prismaError?.code === "P2002") {
      return recoverUniqueRace({ normalized, requestHash });
    }
    if (error instanceof ConflictError) {
      await auditReviewConflict({
        normalized,
        requestHash,
        existing: null,
        reason: "BUSINESS_EVENT_IDEMPOTENCY_CONFLICT",
      });
    }
    if (error instanceof ApplicationError) throw error;
    throw new BusinessRuleError("Branch daily-close review could not be started safely.");
  }

  if (outcome.kind === "CONFLICT") {
    await auditReviewConflict({
      normalized,
      requestHash,
      existing: outcome.run,
      reason: outcome.reason,
    });
    throw conflictFor(outcome.reason);
  }

  return toResult(outcome.run, outcome.kind === "CREATED");
}

function normalizeInput(
  input: StartBranchDailyCloseReviewInput,
): NormalizedInput {
  const actorId = requiredText(
    input.actorId,
    "An actor is required for branch daily-close review.",
  );
  const locationId = requiredText(
    input.locationId,
    "A location is required for branch daily-close review.",
  );
  const idempotencyKey = requiredText(
    input.idempotencyKey,
    "An idempotency key is required for branch daily-close review.",
    200,
  );
  const businessDate = input.businessDate?.trim();
  if (!BUSINESS_DATE_PATTERN.test(businessDate)) {
    throw new BusinessRuleError(
      "Branch daily-close businessDate must use YYYY-MM-DD.",
    );
  }
  const businessDateValue = new Date(`${businessDate}T00:00:00.000Z`);
  if (
    Number.isNaN(businessDateValue.getTime()) ||
    businessDateValue.toISOString().slice(0, 10) !== businessDate
  ) {
    throw new BusinessRuleError(
      "Branch daily-close businessDate must be a valid calendar date.",
    );
  }

  const now =
    optionalDate(input.now, "Branch daily-close review now") ?? new Date();
  const correlationId = input.correlationId
    ? requiredText(
        input.correlationId,
        "Branch daily-close correlationId cannot be empty.",
        200,
      )
    : randomUUID();

  return {
    accessContext: input.accessContext,
    actorId,
    locationId,
    businessDate,
    businessDateValue,
    idempotencyKey,
    correlationId,
    now,
    maxAgeMinutes: input.maxAgeMinutes,
  };
}

function requiredText(value: string, message: string, maxLength = 240) {
  const normalized = value?.trim();
  if (!normalized) throw new BusinessRuleError(message);
  if (normalized.length > maxLength) {
    throw new BusinessRuleError(
      `${message.replace(/\.$/, "")} Maximum length is ${maxLength}.`,
    );
  }
  return normalized;
}

function optionalDate(value: Date | string | null | undefined, label: string) {
  if (value === null || value === undefined) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BusinessRuleError(`${label} must be a valid date.`);
  }
  return parsed;
}

function assertReadinessIdentity(
  readiness: EndOfDayCloseReadinessResult,
  input: NormalizedInput,
) {
  if (
    readiness.organizationId !== input.accessContext.orgId ||
    readiness.actorId !== input.actorId ||
    readiness.scope.kind !== "LOCATION" ||
    readiness.scope.locationId !== input.locationId ||
    readiness.location.id !== input.locationId ||
    readiness.businessDate !== input.businessDate
  ) {
    throw new ForbiddenError(
      "Branch daily-close readiness evidence is inconsistent.",
    );
  }

  const capture = readiness.checklist.find(
    (item) => item.key === "PAYMENT_CAPTURE_ATTRIBUTION",
  );
  const payment = readiness.checklist.find(
    (item) => item.key === "PAYMENT_RECONCILIATION",
  );
  const signOff = readiness.checklist.find(
    (item) => item.key === "MANAGER_SIGN_OFF",
  );
  if (
    readiness.completion.state !== "NOT_AVAILABLE" ||
    readiness.completion.signOffSupported ||
    readiness.completion.signedOff ||
    !capture ||
    capture.status === "UNSUPPORTED" ||
    capture.evidence.sourceType !== "PAYMENT_CAPTURE" ||
    !capture.evidence.sourceHash ||
    payment?.status !== "UNSUPPORTED" ||
    signOff?.status !== "UNSUPPORTED"
  ) {
    throw new BusinessRuleError(
      "Branch daily-close review requires the non-final Slice 8 readiness contract.",
    );
  }
}

function buildEvidenceManifest(
  readiness: EndOfDayCloseReadinessResult,
): BranchDailyCloseEvidenceManifest {
  const supportedSources = readiness.checklist
    .filter((item) => item.status !== "UNSUPPORTED")
    .map((item) => ({
      checklistKey: item.key,
      status: item.status as Exclude<typeof item.status, "UNSUPPORTED">,
      sourceType: item.evidence.sourceType,
      sourceIds: [...item.evidence.sourceIds].sort(),
      sourceHash: item.evidence.sourceHash,
      observedAt: item.evidence.observedAt,
      freshness: item.evidence.freshness,
      evidenceGrade: item.evidence.evidenceGrade,
    }))
    .sort((left, right) => left.checklistKey.localeCompare(right.checklistKey));
  const observedAt =
    supportedSources
      .map((source) => source.observedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? readiness.generatedAt;

  return {
    version: 1,
    kind: "BRANCH_DAILY_CLOSE_REVIEW_EVIDENCE",
    organizationId: readiness.organizationId,
    locationId: readiness.scope.locationId,
    businessDate: readiness.businessDate,
    periodStart: readiness.periodStart,
    periodEnd: readiness.periodEnd,
    observedAt,
    authority: readiness.authority,
    readiness: readiness.readiness,
    readinessSourceHash: readiness.sourceHash,
    evidenceCoverage: { ...readiness.evidenceCoverage },
    facts: { ...readiness.facts },
    supportedSources,
    unsupportedChecklistKeys: readiness.checklist
      .filter((item) => item.status === "UNSUPPORTED")
      .map((item) => item.key)
      .sort(),
    blockers: readiness.blockers
      .map((blocker) => ({
        code: blocker.code,
        severity: blocker.severity,
        gate: blocker.gate,
        sourceTables: [...blocker.sourceTables].sort(),
      }))
      .sort((left, right) =>
        `${left.code}:${left.gate}`.localeCompare(
          `${right.code}:${right.gate}`,
        ),
      ),
    controls: {
      monetaryFieldsIncluded: false,
      paymentLocationOwnershipClaimed: false,
      managerSignOffIncluded: false,
      finalCloseClaimed: false,
    },
  };
}

function assertDataMinimizedManifest(value: unknown, path = "manifest") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertDataMinimizedManifest(item, `${path}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (
      FORBIDDEN_MANIFEST_KEY_PARTS.some((part) => normalizedKey.includes(part))
    ) {
      throw new BusinessRuleError(
        `Branch daily-close evidence contains prohibited field ${path}.${key}.`,
      );
    }
    assertDataMinimizedManifest(item, `${path}.${key}`);
  }
}

function runStatusFor(
  readiness: EndOfDayCloseReadinessResult,
): BranchDailyCloseRunStatus {
  return readiness.readiness === "READY_FOR_REVIEW" ||
    readiness.readiness === "NO_ACTIVITY"
    ? "IN_REVIEW"
    : "BLOCKED";
}

function sha256(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`;
}

async function recoverUniqueRace(input: {
  normalized: NormalizedInput;
  requestHash: string;
}): Promise<StartBranchDailyCloseReviewResult> {
  const existing = await db.branchDailyCloseRun.findFirst({
    where: {
      organizationId: input.normalized.accessContext.orgId,
      OR: [
        { idempotencyKey: input.normalized.idempotencyKey },
        {
          locationId: input.normalized.locationId,
          businessDate: input.normalized.businessDateValue,
        },
      ],
    },
    select: RUN_SELECT,
  });

  if (
    existing &&
    existing.idempotencyKey === input.normalized.idempotencyKey &&
    existing.requestHash === input.requestHash
  ) {
    return toResult(existing, false);
  }

  await auditReviewConflict({
    normalized: input.normalized,
    requestHash: input.requestHash,
    existing,
    reason: "UNIQUE_CONSTRAINT_RACE",
  });
  throw conflictFor("UNIQUE_CONSTRAINT_RACE");
}

async function auditReviewConflict(input: {
  normalized: NormalizedInput;
  requestHash: string;
  existing: StoredRun | null;
  reason: ReviewConflictReason;
}) {
  await db.auditLog.create({
    data: {
      entityType: "BranchDailyCloseRun",
      entityId:
        input.existing?.id ??
        `${input.normalized.locationId}:${input.normalized.businessDate}`,
      action: "BRANCH_DAILY_CLOSE_REVIEW_CONFLICT",
      userId: input.normalized.actorId,
      organizationId: input.normalized.accessContext.orgId,
      changes: {
        before: input.existing
          ? {
              locationId: input.existing.locationId,
              businessDate: input.existing.businessDate
                .toISOString()
                .slice(0, 10),
              idempotencyKey: input.existing.idempotencyKey,
              requestHash: input.existing.requestHash,
              evidenceHash: input.existing.evidenceHash,
            }
          : null,
        after: {
          locationId: input.normalized.locationId,
          businessDate: input.normalized.businessDate,
          idempotencyKey: input.normalized.idempotencyKey,
          requestHash: input.requestHash,
          reason: input.reason,
        },
      },
    },
  });
}

function conflictFor(reason: ReviewConflictReason) {
  if (reason === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
    return new ConflictError(
      "Branch daily-close review idempotency key was reused with different evidence.",
    );
  }
  if (reason === "LOCATION_DAY_ALREADY_HAS_REVIEW") {
    return new ConflictError(
      "A branch daily-close review already exists for this location and business date.",
    );
  }
  return new ConflictError(
    "Branch daily-close review conflicted with an existing request.",
  );
}

function toResult(
  run: StoredRun,
  created: boolean,
): StartBranchDailyCloseReviewResult {
  return {
    kind: "BRANCH_DAILY_CLOSE_REVIEW",
    created,
    replayed: !created,
    run: toRunRecord(run),
  };
}

function toRunRecord(run: StoredRun): BranchDailyCloseRunRecord {
  if (
    (run.status !== "IN_REVIEW" && run.status !== "BLOCKED") ||
    ![
      "READY_FOR_REVIEW",
      "ACTION_REQUIRED",
      "NO_ACTIVITY",
      "UNAVAILABLE",
    ].includes(run.readinessState) ||
    (run.evidenceCoverageState !== "PARTIAL" &&
      run.evidenceCoverageState !== "COMPLETE")
  ) {
    throw new BusinessRuleError(
      "Stored branch daily-close review state is invalid.",
    );
  }

  return {
    id: run.id,
    organizationId: run.organizationId,
    locationId: run.locationId,
    businessDate: run.businessDate.toISOString().slice(0, 10),
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    status: run.status,
    readinessState:
      run.readinessState as BranchDailyCloseRunRecord["readinessState"],
    evidenceCoverageState: run.evidenceCoverageState,
    supportedItemCount: run.supportedItemCount,
    unsupportedItemCount: run.unsupportedItemCount,
    blockerCount: run.blockerCount,
    evidenceObservedAt: run.evidenceObservedAt.toISOString(),
    readinessSourceHash: run.readinessSourceHash,
    evidenceHash: run.evidenceHash,
    startedById: run.startedById,
    startedAt: run.startedAt.toISOString(),
    idempotencyKey: run.idempotencyKey,
    correlationId: run.correlationId,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

