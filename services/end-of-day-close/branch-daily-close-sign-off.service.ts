import "server-only"

import { randomUUID } from "crypto"

import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import {
  ApplicationError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  getPrismaKnownRequest,
} from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
} from "@/services/controls/sensitive-action.service"
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import type { BranchDailyCloseReviewDriftResult } from "./branch-daily-close-review-drift-contracts"
import { getBranchDailyCloseReviewDrift } from "./branch-daily-close-review-drift.service"
import {
  BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL,
  evaluateBranchDailyCloseSignOffControl,
} from "./branch-daily-close-sign-off-control"
import type {
  BranchDailyCloseSignOffCommandRecord,
  SignBranchDailyCloseInput,
  SignBranchDailyCloseResult,
} from "./branch-daily-close-sign-off-contracts"

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/

const RUN_SELECT = {
  id: true,
  organizationId: true,
  locationId: true,
  businessDate: true,
  status: true,
  readinessState: true,
  supportedItemCount: true,
  unsupportedItemCount: true,
  blockerCount: true,
  evidenceObservedAt: true,
  readinessSourceHash: true,
  evidenceHash: true,
  startedById: true,
} satisfies Prisma.BranchDailyCloseRunSelect

const SIGN_OFF_SELECT = {
  id: true,
  organizationId: true,
  branchDailyCloseRunId: true,
  status: true,
  signedReadinessSourceHash: true,
  signedEvidenceHash: true,
  signedEvidenceObservedAt: true,
  signedById: true,
  signedAt: true,
  authAssuranceLevel: true,
  freshAuthAt: true,
  idempotencyKey: true,
  requestHash: true,
  correlationId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BranchDailyCloseSignOffSelect

type StoredRun = Prisma.BranchDailyCloseRunGetPayload<{
  select: typeof RUN_SELECT
}>

type StoredSignOff = Prisma.BranchDailyCloseSignOffGetPayload<{
  select: typeof SIGN_OFF_SELECT
}>

type NormalizedInput = {
  accessContext: SignBranchDailyCloseInput["accessContext"]
  actorId: string
  locationId: string
  businessDate: string
  businessDateValue: Date
  idempotencyKey: string
  correlationId: string
  lastAuthAt: Date | null
  now: Date
  maxAgeMinutes?: number | null
}

type ExpectedSignOffIdentity = {
  organizationId: string
  branchDailyCloseRunId: string
  signedById: string
  signedReadinessSourceHash: string
  signedEvidenceHash: string
  idempotencyKey: string
  requestHash: string
}

type ConflictReason =
  | "IDEMPOTENCY_PAYLOAD_MISMATCH"
  | "ACTIVE_SIGN_OFF_ALREADY_EXISTS"
  | "CONCURRENT_SIGN_OFF_CONFLICT"
  | "BUSINESS_EVENT_IDEMPOTENCY_CONFLICT"

type DeniedOutcome = {
  kind: "DENIED"
  decision: ReturnType<typeof evaluateBranchDailyCloseSignOffControl>
}

type TransactionOutcome =
  | { kind: "CREATED"; signOff: StoredSignOff }
  | { kind: "REPLAY"; signOff: StoredSignOff }
  | { kind: "CONFLICT"; signOff: StoredSignOff | null; reason: ConflictReason }
  | DeniedOutcome

export async function signBranchDailyClose(
  input: SignBranchDailyCloseInput,
): Promise<SignBranchDailyCloseResult> {
  const normalized = normalizeInput(input)
  if (normalized.actorId !== normalized.accessContext.userId) {
    throw new ForbiddenError(
      "Branch daily-close sign-off is not available for this account.",
    )
  }

  const drift = await getBranchDailyCloseReviewDrift({
    accessContext: normalized.accessContext,
    locationId: normalized.locationId,
    businessDate: normalized.businessDate,
    now: normalized.now,
    maxAgeMinutes: normalized.maxAgeMinutes,
  })
  assertCurrentDriftIdentity(drift, normalized)

  const storedEvidence = drift.stored
  if (!storedEvidence || drift.state === "NOT_STARTED") {
    throw new BusinessRuleError(
      "Branch daily-close review must be started before sign-off.",
    )
  }
  if (drift.state !== "CURRENT") {
    throw new BusinessRuleError(
      "Branch daily-close evidence changed after review started. Refresh the review before sign-off.",
    )
  }
  assertCurrentDriftEvidence(drift)

  const requestHash = sha256({
    version: 1,
    command: "SIGN_BRANCH_DAILY_CLOSE",
    organizationId: drift.organizationId,
    actorId: normalized.actorId,
    locationId: normalized.locationId,
    businessDate: normalized.businessDate,
    branchDailyCloseRunId: storedEvidence.sourceId,
    readinessSourceHash: storedEvidence.readinessSourceHash,
    evidenceHash: storedEvidence.evidenceHash,
    idempotencyKey: normalized.idempotencyKey,
  })

  let outcome: TransactionOutcome
  try {
    outcome = await db.$transaction(
      async (tx): Promise<TransactionOutcome> => {
        const run = await tx.branchDailyCloseRun.findUnique({
          where: {
            organizationId_locationId_businessDate: {
              organizationId: drift.organizationId,
              locationId: normalized.locationId,
              businessDate: normalized.businessDateValue,
            },
          },
          select: RUN_SELECT,
        })
        assertTransactionRun(run, drift, normalized)

        const organization = await tx.organization.findFirst({
          where: {
            id: drift.organizationId,
            isActive: true,
            deletedAt: null,
          },
          select: { id: true, requestedModules: true },
        })
        if (!organization || organization.id !== drift.organizationId) {
          throw new ForbiddenError(
            "Branch daily-close sign-off is not available for this organization.",
          )
        }

        const decision = evaluateBranchDailyCloseSignOffControl({
          organizationId: drift.organizationId,
          actorId: normalized.actorId,
          actorPermissions: normalized.accessContext.permissions,
          subjectActorId: run.startedById,
          lastAuthAt: normalized.lastAuthAt,
          now: normalized.now,
          resourceType: "BranchDailyCloseRun",
          resourceId: run.id,
          requestedModules: organization.requestedModules,
          metadata: {
            locationId: normalized.locationId,
            businessDate: normalized.businessDate,
            evidenceHash: run.evidenceHash,
            correlationId: normalized.correlationId,
          },
        })

        if (!decision.allowed) {
          if (!decision.sensitiveAction.allowed) {
            await auditSensitiveActionDecision(tx, decision.sensitiveAction)
          } else {
            await auditModuleDenial(tx, {
              normalized,
              run,
              reason: decision.moduleEntitlement.reason,
              result: decision.moduleEntitlement.result,
            })
          }
          return { kind: "DENIED", decision }
        }

        const existingByKey = await tx.branchDailyCloseSignOff.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId: drift.organizationId,
              idempotencyKey: normalized.idempotencyKey,
            },
          },
          select: SIGN_OFF_SELECT,
        })
        if (existingByKey) {
          return existingByKey.requestHash === requestHash
            ? { kind: "REPLAY", signOff: existingByKey }
            : {
                kind: "CONFLICT",
                signOff: existingByKey,
                reason: "IDEMPOTENCY_PAYLOAD_MISMATCH",
              }
        }

        const existingActive = await tx.branchDailyCloseSignOff.findUnique({
          where: {
            organizationId_activeKey: {
              organizationId: drift.organizationId,
              activeKey: run.id,
            },
          },
          select: SIGN_OFF_SELECT,
        })
        if (existingActive) {
          return {
            kind: "CONFLICT",
            signOff: existingActive,
            reason: "ACTIVE_SIGN_OFF_ALREADY_EXISTS",
          }
        }

        await auditSensitiveActionDecision(tx, decision.sensitiveAction)

        const signedAt = normalized.now
        const created = await tx.branchDailyCloseSignOff.create({
          data: {
            organizationId: drift.organizationId,
            branchDailyCloseRunId: run.id,
            status: "ACTIVE",
            activeKey: run.id,
            signedReadinessSourceHash: run.readinessSourceHash,
            signedEvidenceHash: run.evidenceHash,
            signedEvidenceObservedAt: run.evidenceObservedAt,
            signedById: normalized.actorId,
            signedAt,
            authAssuranceLevel: "L1",
            freshAuthAt: normalized.lastAuthAt as Date,
            idempotencyKey: normalized.idempotencyKey,
            requestHash,
            correlationId: normalized.correlationId,
          },
          select: SIGN_OFF_SELECT,
        })

        await tx.auditLog.create({
          data: {
            entityType: "BranchDailyCloseSignOff",
            entityId: created.id,
            action: "BRANCH_DAILY_CLOSE_SIGNED",
            userId: normalized.actorId,
            organizationId: drift.organizationId,
            changes: {
              after: {
                branchDailyCloseRunId: run.id,
                locationId: normalized.locationId,
                businessDate: normalized.businessDate,
                status: "ACTIVE",
                signedReadinessSourceHash: run.readinessSourceHash,
                signedEvidenceHash: run.evidenceHash,
                signedEvidenceObservedAt:
                  run.evidenceObservedAt.toISOString(),
                signedById: normalized.actorId,
                signedAt: signedAt.toISOString(),
                authAssuranceLevel: "L1",
                correlationId: normalized.correlationId,
              },
            },
          },
        })

        await recordBusinessEventInTx(tx, {
          organizationId: drift.organizationId,
          eventType: "branch.daily-close.signed",
          eventSource: "INTERNAL",
          idempotencyKey: `branch-daily-close-sign-off:${normalized.idempotencyKey}`,
          occurredAt: signedAt,
          actorId: normalized.actorId,
          locationId: normalized.locationId,
          sourceType: "MANUAL",
          sourceId: created.id,
          documentHash: run.evidenceHash,
          payload: {
            version: 1,
            signOffId: created.id,
            branchDailyCloseRunId: run.id,
            organizationId: drift.organizationId,
            locationId: normalized.locationId,
            businessDate: normalized.businessDate,
            status: "ACTIVE",
            signedReadinessSourceHash: run.readinessSourceHash,
            signedEvidenceHash: run.evidenceHash,
            signedEvidenceObservedAt: run.evidenceObservedAt.toISOString(),
            signedById: normalized.actorId,
            signedAt: signedAt.toISOString(),
            authAssuranceLevel: "L1",
            correlationId: normalized.correlationId,
            controls: {
              independentCheckerRequired: true,
              finalCloseClaimed: false,
              readinessPromoted: false,
            },
          },
          metadata: {
            sourceEntityType: "BranchDailyCloseSignOff",
            correlationId: normalized.correlationId,
            requestHash,
          },
          outboxMessages: [],
        })

        return { kind: "CREATED", signOff: created }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  } catch (error) {
    const prismaError = getPrismaKnownRequest(error)
    if (prismaError?.code === "P2002" || prismaError?.code === "P2034") {
      return recoverConcurrentConflict({ normalized, requestHash, drift })
    }
    if (error instanceof ConflictError) {
      await auditSignOffConflict({
        normalized,
        requestHash,
        signOff: null,
        reason: "BUSINESS_EVENT_IDEMPOTENCY_CONFLICT",
      })
    }
    if (error instanceof ApplicationError) throw error
    throw new BusinessRuleError("Branch daily-close sign-off could not be completed safely.")
  }

  if (outcome.kind === "DENIED") {
    if (!outcome.decision.sensitiveAction.allowed) {
      assertSensitiveActionAllowed(outcome.decision.sensitiveAction)
    }
    throw new ForbiddenError(
      "Branch daily-close sign-off is not enabled for this organization.",
    )
  }

  if (outcome.kind === "CONFLICT") {
    await auditSignOffConflict({
      normalized,
      requestHash,
      signOff: outcome.signOff,
      reason: outcome.reason,
    })
    throw conflictFor(outcome.reason)
  }

  return toResult(outcome.signOff, outcome.kind === "CREATED", {
    organizationId: drift.organizationId,
    branchDailyCloseRunId: storedEvidence.sourceId,
    signedById: normalized.actorId,
    signedReadinessSourceHash: storedEvidence.readinessSourceHash,
    signedEvidenceHash: storedEvidence.evidenceHash,
    idempotencyKey: normalized.idempotencyKey,
    requestHash,
  })
}

function normalizeInput(input: SignBranchDailyCloseInput): NormalizedInput {
  const actorId = requiredText(
    input.actorId,
    "An actor is required for branch daily-close sign-off.",
  )
  const locationId = requiredText(
    input.locationId,
    "A location is required for branch daily-close sign-off.",
  )
  const idempotencyKey = requiredText(
    input.idempotencyKey,
    "An idempotency key is required for branch daily-close sign-off.",
    200,
  )
  const businessDate = input.businessDate?.trim()
  if (!BUSINESS_DATE_PATTERN.test(businessDate)) {
    throw new BusinessRuleError(
      "Branch daily-close sign-off businessDate must use YYYY-MM-DD.",
    )
  }
  const businessDateValue = new Date(`${businessDate}T00:00:00.000Z`)
  if (
    Number.isNaN(businessDateValue.getTime()) ||
    businessDateValue.toISOString().slice(0, 10) !== businessDate
  ) {
    throw new BusinessRuleError(
      "Branch daily-close sign-off businessDate must be a valid calendar date.",
    )
  }

  const now = optionalDate(input.now, "Branch daily-close sign-off now") ?? new Date()
  const lastAuthAt = optionalDate(
    input.lastAuthAt,
    "Branch daily-close sign-off lastAuthAt",
  )
  if (lastAuthAt && lastAuthAt.getTime() > now.getTime()) {
    throw new BusinessRuleError(
      "Branch daily-close sign-off authentication time cannot be in the future.",
    )
  }
  const correlationId = input.correlationId
    ? requiredText(
        input.correlationId,
        "Branch daily-close sign-off correlationId cannot be empty.",
        200,
      )
    : randomUUID()

  return {
    accessContext: input.accessContext,
    actorId,
    locationId,
    businessDate,
    businessDateValue,
    idempotencyKey,
    correlationId,
    lastAuthAt,
    now,
    maxAgeMinutes: input.maxAgeMinutes,
  }
}

function requiredText(value: string, message: string, maxLength = 240) {
  const normalized = value?.trim()
  if (!normalized) throw new BusinessRuleError(message)
  if (normalized.length > maxLength) {
    throw new BusinessRuleError(
      `${message.replace(/\.$/, "")} Maximum length is ${maxLength}.`,
    )
  }
  return normalized
}

function optionalDate(
  value: Date | string | number | null | undefined,
  label: string,
) {
  if (value === null || value === undefined) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new BusinessRuleError(`${label} must be a valid date.`)
  }
  return parsed
}

function assertCurrentDriftIdentity(
  drift: BranchDailyCloseReviewDriftResult,
  input: NormalizedInput,
) {
  if (
    drift.kind !== "BRANCH_DAILY_CLOSE_REVIEW_DRIFT" ||
    drift.organizationId !== input.accessContext.orgId ||
    drift.actorId !== input.actorId ||
    drift.scope.kind !== "LOCATION" ||
    drift.scope.locationId !== input.locationId ||
    drift.location.id !== input.locationId ||
    drift.businessDate !== input.businessDate ||
    !validDate(drift.generatedAt) ||
    !SHA256_PATTERN.test(drift.current.readinessSourceHash)
  ) {
    throw new ForbiddenError(
      "Branch daily-close sign-off evidence is inconsistent.",
    )
  }
}

function assertCurrentDriftEvidence(
  drift: BranchDailyCloseReviewDriftResult,
) {
  const stored = drift.stored
  if (
    drift.state !== "CURRENT" ||
    drift.reasons.length !== 0 ||
    !stored ||
    !stored.sourceId.trim() ||
    !validDate(stored.observedAt) ||
    !validDate(drift.current.observedAt) ||
    !SHA256_PATTERN.test(stored.readinessSourceHash) ||
    !SHA256_PATTERN.test(stored.evidenceHash) ||
    stored.readinessState !== drift.current.readinessState ||
    stored.readinessSourceHash !== drift.current.readinessSourceHash ||
    stored.supportedItemCount !== drift.current.supportedItemCount ||
    stored.unsupportedItemCount !== drift.current.unsupportedItemCount ||
    stored.blockerCount !== drift.current.blockerCount ||
    !validCounts(
      stored.supportedItemCount,
      stored.unsupportedItemCount,
      stored.blockerCount,
      drift.current.supportedItemCount,
      drift.current.unsupportedItemCount,
      drift.current.blockerCount,
    )
  ) {
    throw new ForbiddenError(
      "Branch daily-close current review evidence is inconsistent.",
    )
  }
}

function assertTransactionRun(
  run: StoredRun | null,
  drift: BranchDailyCloseReviewDriftResult,
  input: NormalizedInput,
): asserts run is StoredRun {
  if (!run || !drift.stored) {
    throw new BusinessRuleError(
      "Branch daily-close review must be started before sign-off.",
    )
  }
  if (
    run.organizationId !== drift.organizationId ||
    run.locationId !== input.locationId ||
    run.businessDate.toISOString().slice(0, 10) !== input.businessDate
  ) {
    throw new ForbiddenError(
      "Branch daily-close stored review evidence is inconsistent.",
    )
  }
  if (run.status !== "IN_REVIEW") {
    throw new BusinessRuleError(
      "Only an in-review branch daily-close run can be signed.",
    )
  }
  if (
    run.id !== drift.stored.sourceId ||
    run.readinessState !== drift.stored.readinessState ||
    run.supportedItemCount !== drift.stored.supportedItemCount ||
    run.unsupportedItemCount !== drift.stored.unsupportedItemCount ||
    run.blockerCount !== drift.stored.blockerCount ||
    run.evidenceObservedAt.toISOString() !== drift.stored.observedAt ||
    run.readinessSourceHash !== drift.stored.readinessSourceHash ||
    run.evidenceHash !== drift.stored.evidenceHash ||
    run.readinessSourceHash !== drift.current.readinessSourceHash
  ) {
    throw new BusinessRuleError(
      "Branch daily-close evidence changed after review started. Refresh the review before sign-off.",
    )
  }
}

async function auditModuleDenial(
  tx: Pick<Prisma.TransactionClient, "auditLog">,
  input: {
    normalized: NormalizedInput
    run: StoredRun
    reason: string
    result: string
  },
) {
  return tx.auditLog.create({
    data: {
      entityType: "BranchDailyCloseRun",
      entityId: input.run.id,
      action: `${BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.auditAction}_DENIED`,
      organizationId: input.run.organizationId,
      userId: input.normalized.actorId,
      changes: {
        action: BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.action,
        permission: BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.permission,
        riskTier: BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.riskTier,
        requiredAssurance:
          BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.requiredAssurance,
        reasonCode: "MODULE_ENTITLEMENT_DENIED",
        allowed: false,
        moduleSlug: BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.moduleSlug,
        accessIntent: BRANCH_DAILY_CLOSE_SIGN_OFF_CONTROL.accessIntent,
        entitlementResult: input.result,
        entitlementReason: input.reason,
        locationId: input.normalized.locationId,
        businessDate: input.normalized.businessDate,
        correlationId: input.normalized.correlationId,
      },
    },
  })
}

async function recoverConcurrentConflict(input: {
  normalized: NormalizedInput
  requestHash: string
  drift: BranchDailyCloseReviewDriftResult
}): Promise<SignBranchDailyCloseResult> {
  const existing = await db.branchDailyCloseSignOff.findFirst({
    where: {
      organizationId: input.drift.organizationId,
      OR: [
        { idempotencyKey: input.normalized.idempotencyKey },
        { activeKey: input.drift.stored?.sourceId ?? "" },
      ],
    },
    select: SIGN_OFF_SELECT,
  })

  if (
    existing?.idempotencyKey === input.normalized.idempotencyKey &&
    existing.requestHash === input.requestHash
  ) {
    return toResult(existing, false, {
      organizationId: input.drift.organizationId,
      branchDailyCloseRunId: input.drift.stored?.sourceId ?? "",
      signedById: input.normalized.actorId,
      signedReadinessSourceHash: input.drift.stored?.readinessSourceHash ?? "",
      signedEvidenceHash: input.drift.stored?.evidenceHash ?? "",
      idempotencyKey: input.normalized.idempotencyKey,
      requestHash: input.requestHash,
    })
  }

  await auditSignOffConflict({
    normalized: input.normalized,
    requestHash: input.requestHash,
    signOff: existing,
    reason: "CONCURRENT_SIGN_OFF_CONFLICT",
  })
  throw conflictFor("CONCURRENT_SIGN_OFF_CONFLICT")
}

async function auditSignOffConflict(input: {
  normalized: NormalizedInput
  requestHash: string
  signOff: StoredSignOff | null
  reason: ConflictReason
}) {
  return db.auditLog.create({
    data: {
      entityType: "BranchDailyCloseSignOff",
      entityId: input.signOff?.id ?? input.normalized.idempotencyKey,
      action: "BRANCH_DAILY_CLOSE_SIGN_OFF_CONFLICT",
      userId: input.normalized.actorId,
      organizationId: input.normalized.accessContext.orgId,
      changes: {
        before: input.signOff
          ? {
              branchDailyCloseRunId: input.signOff.branchDailyCloseRunId,
              idempotencyKey: input.signOff.idempotencyKey,
              requestHash: input.signOff.requestHash,
              status: input.signOff.status,
            }
          : null,
        after: {
          locationId: input.normalized.locationId,
          businessDate: input.normalized.businessDate,
          idempotencyKey: input.normalized.idempotencyKey,
          requestHash: input.requestHash,
          reason: input.reason,
          correlationId: input.normalized.correlationId,
        },
      },
    },
  })
}

function conflictFor(reason: ConflictReason) {
  switch (reason) {
    case "IDEMPOTENCY_PAYLOAD_MISMATCH":
      return new ConflictError(
        "Branch daily-close sign-off idempotency key was reused with different evidence.",
      )
    case "ACTIVE_SIGN_OFF_ALREADY_EXISTS":
      return new ConflictError(
        "This branch daily-close review already has an active sign-off.",
      )
    case "BUSINESS_EVENT_IDEMPOTENCY_CONFLICT":
      return new ConflictError(
        "Branch daily-close sign-off event evidence conflicts with an existing event.",
      )
    default:
      return new ConflictError(
        "A concurrent branch daily-close sign-off could not be completed safely.",
      )
  }
}

function toResult(
  stored: StoredSignOff,
  created: boolean,
  expected: ExpectedSignOffIdentity,
): SignBranchDailyCloseResult {
  if (
    stored.organizationId !== expected.organizationId ||
    stored.branchDailyCloseRunId !== expected.branchDailyCloseRunId ||
    stored.signedById !== expected.signedById ||
    stored.status !== "ACTIVE" ||
    stored.authAssuranceLevel !== "L1" ||
    stored.signedReadinessSourceHash !== expected.signedReadinessSourceHash ||
    stored.signedEvidenceHash !== expected.signedEvidenceHash ||
    stored.idempotencyKey !== expected.idempotencyKey ||
    stored.requestHash !== expected.requestHash ||
    !SHA256_PATTERN.test(stored.signedReadinessSourceHash) ||
    !SHA256_PATTERN.test(stored.signedEvidenceHash) ||
    !validDate(stored.signedEvidenceObservedAt) ||
    !validDate(stored.signedAt) ||
    !validDate(stored.freshAuthAt) ||
    !validDate(stored.createdAt) ||
    !validDate(stored.updatedAt) ||
    stored.freshAuthAt.getTime() > stored.signedAt.getTime()
  ) {
    throw new ForbiddenError(
      "Branch daily-close sign-off evidence is inconsistent.",
    )
  }

  const signOff: BranchDailyCloseSignOffCommandRecord = {
    id: stored.id,
    organizationId: stored.organizationId,
    branchDailyCloseRunId: stored.branchDailyCloseRunId,
    status: "ACTIVE",
    signedReadinessSourceHash: stored.signedReadinessSourceHash,
    signedEvidenceHash: stored.signedEvidenceHash,
    signedEvidenceObservedAt: stored.signedEvidenceObservedAt.toISOString(),
    signedById: stored.signedById,
    signedAt: stored.signedAt.toISOString(),
    authAssuranceLevel: "L1",
    freshAuthAt: stored.freshAuthAt.toISOString(),
    idempotencyKey: stored.idempotencyKey,
    correlationId: stored.correlationId,
    createdAt: stored.createdAt.toISOString(),
    updatedAt: stored.updatedAt.toISOString(),
  }

  return {
    kind: "BRANCH_DAILY_CLOSE_SIGN_OFF",
    created,
    replayed: !created,
    signOff,
  }
}

function sha256(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`
}

function validDate(value: Date | string | number) {
  const parsed = value instanceof Date ? value : new Date(value)
  return !Number.isNaN(parsed.getTime())
}

function validCounts(...values: number[]) {
  return values.every((value) => Number.isInteger(value) && value >= 0)
}

