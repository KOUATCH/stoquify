import "server-only"

import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import type { AllowedOperatingAccessScope } from "@/services/operating-access/operating-access-scope-contracts"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"

import type {
  BranchDailyCloseActiveSignOffStateRecord,
  BranchDailyCloseReviewStateRecord,
  BranchDailyCloseSignOffHistorySummary,
  BranchDailyCloseSignOffStateInput,
  BranchDailyCloseSignOffStateResult,
} from "./branch-daily-close-sign-off-state-contracts"

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/
const FRESH_AUTH_MAX_AGE_MS = 300_000
const RUN_STATUSES = new Set(["IN_REVIEW", "BLOCKED"])
const READINESS_STATES = new Set([
  "READY_FOR_REVIEW",
  "ACTION_REQUIRED",
  "NO_ACTIVITY",
  "UNAVAILABLE",
])
const EVIDENCE_COVERAGE_STATES = new Set(["PARTIAL", "COMPLETE"])
const SIGN_OFF_STATUSES = new Set(["ACTIVE", "REVOKED", "SUPERSEDED"])

const RUN_SELECT = {
  id: true,
  organizationId: true,
  locationId: true,
  businessDate: true,
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
  startedBy: {
    select: {
      id: true,
      organizationId: true,
    },
  },
} satisfies Prisma.BranchDailyCloseRunSelect

const ACTIVE_SIGN_OFF_SELECT = {
  id: true,
  organizationId: true,
  branchDailyCloseRunId: true,
  status: true,
  activeKey: true,
  signedReadinessSourceHash: true,
  signedEvidenceHash: true,
  signedEvidenceObservedAt: true,
  signedById: true,
  signedAt: true,
  authAssuranceLevel: true,
  freshAuthAt: true,
  invalidatedById: true,
  invalidatedAt: true,
  invalidationReason: true,
  supersedesSignOffId: true,
  createdAt: true,
  updatedAt: true,
  signedBy: {
    select: {
      id: true,
      organizationId: true,
    },
  },
} satisfies Prisma.BranchDailyCloseSignOffSelect

type StoredRun = Prisma.BranchDailyCloseRunGetPayload<{
  select: typeof RUN_SELECT
}>

type StoredActiveSignOff = Prisma.BranchDailyCloseSignOffGetPayload<{
  select: typeof ACTIVE_SIGN_OFF_SELECT
}>

type NormalizedInput = {
  accessContext: BranchDailyCloseSignOffStateInput["accessContext"]
  locationId: string
  businessDate: string
  businessDateValue: Date
  now: Date
}

type LifecycleCountRow = {
  status: string
  _count: { _all: number }
  _max: { invalidatedAt: Date | null }
}

const PROJECTION_CONTROLS = {
  projectionPurpose: "SIGN_OFF_STATE_ONLY",
  preSignReadinessSourceHashIncludesSignOff: false,
  readinessPromoted: false,
  finalCloseClaimed: false,
} as const

const EMPTY_HISTORY: BranchDailyCloseSignOffHistorySummary = {
  totalCount: 0,
  activeCount: 0,
  revokedCount: 0,
  supersededCount: 0,
  terminalCount: 0,
  latestTerminalAt: null,
}

export async function getBranchDailyCloseSignOffState(
  input: BranchDailyCloseSignOffStateInput,
): Promise<BranchDailyCloseSignOffStateResult> {
  const normalized = normalizeInput(input)
  const access = await resolveOperatingAccessScope(normalized.accessContext)
  if (!access.allowed) {
    throw new ForbiddenError(
      "Branch daily-close sign-off state is not available for this account.",
    )
  }
  assertAccessIdentity(access, normalized)
  assertLocationAuthority(access, normalized.locationId)

  const location = await db.location.findFirst({
    where: {
      id: normalized.locationId,
      organizationId: access.organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      code: true,
    },
  })
  assertLocationIdentity(location, access.organizationId, normalized.locationId)

  const projection = await db.$transaction(
    async (tx) => {
      const run = await tx.branchDailyCloseRun.findUnique({
        where: {
          organizationId_locationId_businessDate: {
            organizationId: access.organizationId,
            locationId: normalized.locationId,
            businessDate: normalized.businessDateValue,
          },
        },
        select: RUN_SELECT,
      })

      if (!run) {
        return {
          run: null,
          activeSignOffs: [] as StoredActiveSignOff[],
          lifecycleCounts: [] as LifecycleCountRow[],
        }
      }
      assertRunIdentity(run, access.organizationId, normalized)

      const [activeSignOffs, lifecycleCounts] = await Promise.all([
        tx.branchDailyCloseSignOff.findMany({
          where: {
            organizationId: access.organizationId,
            branchDailyCloseRunId: run.id,
            status: "ACTIVE",
          },
          orderBy: [{ signedAt: "desc" }, { id: "asc" }],
          take: 2,
          select: ACTIVE_SIGN_OFF_SELECT,
        }),
        tx.branchDailyCloseSignOff.groupBy({
          by: ["status"],
          where: {
            organizationId: access.organizationId,
            branchDailyCloseRunId: run.id,
          },
          _count: { _all: true },
          _max: { invalidatedAt: true },
        }),
      ])

      return {
        run,
        activeSignOffs,
        lifecycleCounts,
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  )

  const authority = authoritySummary(access)
  const locationRecord = {
    id: location.id,
    name: location.name,
    code: location.code,
  }

  if (!projection.run) {
    return buildResult({
      access,
      normalized,
      authority,
      location: locationRecord,
      state: "NOT_STARTED",
      review: null,
      signOff: null,
      history: EMPTY_HISTORY,
    })
  }

  const review = reviewRecord(projection.run)
  const history = summarizeHistory(
    projection.lifecycleCounts,
    projection.activeSignOffs.length,
    normalized.now,
  )
  const activeSignOff = projection.activeSignOffs[0] ?? null

  if (projection.activeSignOffs.length > 1) {
    throw inconsistentEvidence()
  }
  if (projection.run.status === "BLOCKED" && activeSignOff) {
    throw inconsistentEvidence()
  }

  const signOff = activeSignOff
    ? activeSignOffRecord(activeSignOff, projection.run, normalized.now)
    : null
  const state =
    projection.run.status === "BLOCKED"
      ? "BLOCKED"
      : signOff
        ? "SIGNED"
        : "AWAITING_SIGN_OFF"

  return buildResult({
    access,
    normalized,
    authority,
    location: locationRecord,
    state,
    review,
    signOff,
    history,
  })
}

function normalizeInput(input: BranchDailyCloseSignOffStateInput): NormalizedInput {
  const locationId = input.locationId?.trim()
  if (!locationId) {
    throw new BusinessRuleError(
      "A location is required for branch daily-close sign-off state.",
    )
  }
  if (locationId.length > 240) {
    throw new BusinessRuleError(
      "Branch daily-close sign-off state location is too long.",
    )
  }

  const businessDate = input.businessDate?.trim()
  if (!BUSINESS_DATE_PATTERN.test(businessDate)) {
    throw new BusinessRuleError(
      "Branch daily-close sign-off state businessDate must use YYYY-MM-DD.",
    )
  }
  const businessDateValue = new Date(`${businessDate}T00:00:00.000Z`)
  if (
    Number.isNaN(businessDateValue.getTime()) ||
    businessDateValue.toISOString().slice(0, 10) !== businessDate
  ) {
    throw new BusinessRuleError(
      "Branch daily-close sign-off state businessDate must be a valid calendar date.",
    )
  }

  const now = input.now === null || input.now === undefined
    ? new Date()
    : new Date(input.now)
  if (Number.isNaN(now.getTime())) {
    throw new BusinessRuleError(
      "Branch daily-close sign-off state now must be a valid date.",
    )
  }

  return {
    accessContext: input.accessContext,
    locationId,
    businessDate,
    businessDateValue,
    now,
  }
}

function assertAccessIdentity(
  access: AllowedOperatingAccessScope,
  input: NormalizedInput,
) {
  if (
    access.organizationId !== input.accessContext.orgId ||
    access.actorId !== input.accessContext.userId
  ) {
    throw new ForbiddenError(
      "Branch daily-close sign-off operating scope evidence is inconsistent.",
    )
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
    return
  }

  if (
    access.scope.kind === "LOCATIONS" &&
    access.authority.kind === "LOCATION_RESPONSIBILITY"
  ) {
    const managedLocationIds = access.authority.managedLocations.map(
      (location) => location.id,
    )
    const scopedLocationIds = access.scope.locationIds
    if (
      managedLocationIds.length === scopedLocationIds.length &&
      managedLocationIds.every(
        (id, index) => id === scopedLocationIds[index],
      ) &&
      managedLocationIds.includes(locationId)
    ) {
      return
    }
  }

  throw new ForbiddenError(
    "Branch daily-close sign-off operating scope evidence is inconsistent.",
  )
}

function assertLocationIdentity(
  location: {
    id: string
    organizationId: string
    name: string
    code: string
  } | null,
  organizationId: string,
  locationId: string,
): asserts location is {
  id: string
  organizationId: string
  name: string
  code: string
} {
  if (
    !location ||
    location.id !== locationId ||
    location.organizationId !== organizationId ||
    !location.name.trim() ||
    !location.code.trim()
  ) {
    throw new ForbiddenError(
      "Branch daily-close sign-off state is not available for this location.",
    )
  }
}

function assertRunIdentity(
  run: StoredRun,
  organizationId: string,
  input: NormalizedInput,
) {
  if (
    !run.id.trim() ||
    run.organizationId !== organizationId ||
    run.locationId !== input.locationId ||
    !validDate(run.businessDate) ||
    run.businessDate.toISOString().slice(0, 10) !== input.businessDate ||
    !RUN_STATUSES.has(run.status) ||
    !READINESS_STATES.has(run.readinessState) ||
    !EVIDENCE_COVERAGE_STATES.has(run.evidenceCoverageState) ||
    !validCounts(
      run.supportedItemCount,
      run.unsupportedItemCount,
      run.blockerCount,
    ) ||
    (run.evidenceCoverageState === "COMPLETE") !==
      (run.unsupportedItemCount === 0) ||
    (run.status === "IN_REVIEW") !==
      (run.readinessState === "READY_FOR_REVIEW" ||
        run.readinessState === "NO_ACTIVITY") ||
    !validDate(run.evidenceObservedAt) ||
    !validDate(run.startedAt) ||
    run.evidenceObservedAt.getTime() > run.startedAt.getTime() ||
    run.startedAt.getTime() > input.now.getTime() ||
    !SHA256_PATTERN.test(run.readinessSourceHash) ||
    !SHA256_PATTERN.test(run.evidenceHash) ||
    !run.startedById.trim() ||
    run.startedBy.id !== run.startedById ||
    run.startedBy.organizationId !== organizationId
  ) {
    throw inconsistentEvidence()
  }
}

function reviewRecord(run: StoredRun): BranchDailyCloseReviewStateRecord {
  return {
    id: run.id,
    status: run.status as BranchDailyCloseReviewStateRecord["status"],
    readinessState:
      run.readinessState as BranchDailyCloseReviewStateRecord["readinessState"],
    evidenceCoverageState:
      run.evidenceCoverageState as BranchDailyCloseReviewStateRecord["evidenceCoverageState"],
    supportedItemCount: run.supportedItemCount,
    unsupportedItemCount: run.unsupportedItemCount,
    blockerCount: run.blockerCount,
    evidenceObservedAt: run.evidenceObservedAt.toISOString(),
    readinessSourceHash: run.readinessSourceHash,
    evidenceHash: run.evidenceHash,
    startedById: run.startedById,
    startedAt: run.startedAt.toISOString(),
  }
}

function summarizeHistory(
  rows: LifecycleCountRow[],
  activeRowsFound: number,
  now: Date,
): BranchDailyCloseSignOffHistorySummary {
  const seen = new Set<string>()
  let activeCount = 0
  let revokedCount = 0
  let supersededCount = 0
  let latestTerminalAt: Date | null = null

  for (const row of rows) {
    if (
      !SIGN_OFF_STATUSES.has(row.status) ||
      seen.has(row.status) ||
      !Number.isInteger(row._count._all) ||
      row._count._all <= 0
    ) {
      throw inconsistentEvidence()
    }
    seen.add(row.status)

    if (row.status === "ACTIVE") {
      activeCount = row._count._all
      if (row._max.invalidatedAt !== null) throw inconsistentEvidence()
      continue
    }

    const invalidatedAt = row._max.invalidatedAt
    if (
      !invalidatedAt ||
      !validDate(invalidatedAt) ||
      invalidatedAt.getTime() > now.getTime()
    ) {
      throw inconsistentEvidence()
    }
    if (!latestTerminalAt || invalidatedAt > latestTerminalAt) {
      latestTerminalAt = invalidatedAt
    }
    if (row.status === "REVOKED") revokedCount = row._count._all
    if (row.status === "SUPERSEDED") supersededCount = row._count._all
  }

  if (activeCount !== activeRowsFound || activeCount > 1) {
    throw inconsistentEvidence()
  }
  const terminalCount = revokedCount + supersededCount

  return {
    totalCount: activeCount + terminalCount,
    activeCount: activeCount as 0 | 1,
    revokedCount,
    supersededCount,
    terminalCount,
    latestTerminalAt: latestTerminalAt?.toISOString() ?? null,
  }
}

function activeSignOffRecord(
  signOff: StoredActiveSignOff,
  run: StoredRun,
  now: Date,
): BranchDailyCloseActiveSignOffStateRecord {
  const signedAt = signOff.signedAt.getTime()
  const freshAuthAt = signOff.freshAuthAt.getTime()
  if (
    !signOff.id.trim() ||
    signOff.organizationId !== run.organizationId ||
    signOff.branchDailyCloseRunId !== run.id ||
    signOff.status !== "ACTIVE" ||
    signOff.activeKey !== run.id ||
    signOff.signedReadinessSourceHash !== run.readinessSourceHash ||
    signOff.signedEvidenceHash !== run.evidenceHash ||
    signOff.signedEvidenceObservedAt.getTime() !==
      run.evidenceObservedAt.getTime() ||
    signOff.signedById === run.startedById ||
    signOff.signedBy.id !== signOff.signedById ||
    signOff.signedBy.organizationId !== run.organizationId ||
    !signOff.signedById.trim() ||
    signOff.authAssuranceLevel !== "L1" ||
    signOff.invalidatedById !== null ||
    signOff.invalidatedAt !== null ||
    signOff.invalidationReason !== null ||
    !SHA256_PATTERN.test(signOff.signedReadinessSourceHash) ||
    !SHA256_PATTERN.test(signOff.signedEvidenceHash) ||
    !validDate(signOff.signedEvidenceObservedAt) ||
    !validDate(signOff.signedAt) ||
    !validDate(signOff.freshAuthAt) ||
    !validDate(signOff.createdAt) ||
    !validDate(signOff.updatedAt) ||
    signOff.signedEvidenceObservedAt.getTime() > signedAt ||
    run.startedAt.getTime() > signedAt ||
    signedAt > now.getTime() ||
    freshAuthAt > signedAt ||
    freshAuthAt < signedAt - FRESH_AUTH_MAX_AGE_MS ||
    signOff.createdAt.getTime() > signOff.updatedAt.getTime() ||
    signOff.createdAt.getTime() > now.getTime() ||
    signOff.updatedAt.getTime() > now.getTime()
  ) {
    throw inconsistentEvidence()
  }

  return {
    id: signOff.id,
    status: "ACTIVE",
    signedReadinessSourceHash: signOff.signedReadinessSourceHash,
    signedEvidenceHash: signOff.signedEvidenceHash,
    signedEvidenceObservedAt: signOff.signedEvidenceObservedAt.toISOString(),
    signedById: signOff.signedById,
    signedAt: signOff.signedAt.toISOString(),
    authAssuranceLevel: "L1",
    freshAuthAt: signOff.freshAuthAt.toISOString(),
  }
}

function buildResult(input: {
  access: AllowedOperatingAccessScope
  normalized: NormalizedInput
  authority: BranchDailyCloseSignOffStateResult["authority"]
  location: BranchDailyCloseSignOffStateResult["location"]
  state: BranchDailyCloseSignOffStateResult["state"]
  review: BranchDailyCloseReviewStateRecord | null
  signOff: BranchDailyCloseActiveSignOffStateRecord | null
  history: BranchDailyCloseSignOffHistorySummary
}): BranchDailyCloseSignOffStateResult {
  const projectionFacts = {
    version: 1,
    kind: "BRANCH_DAILY_CLOSE_SIGN_OFF_STATE",
    organizationId: input.access.organizationId,
    locationId: input.normalized.locationId,
    businessDate: input.normalized.businessDate,
    state: input.state,
    review: input.review,
    signOff: input.signOff,
    history: input.history,
    controls: PROJECTION_CONTROLS,
  }

  return {
    kind: "BRANCH_DAILY_CLOSE_SIGN_OFF_STATE",
    organizationId: input.access.organizationId,
    actorId: input.access.actorId,
    generatedAt: input.normalized.now.toISOString(),
    businessDate: input.normalized.businessDate,
    authority: input.authority,
    scope: {
      kind: "LOCATION",
      locationId: input.normalized.locationId,
    },
    location: input.location,
    state: input.state,
    review: input.review,
    signOff: input.signOff,
    history: input.history,
    controls: PROJECTION_CONTROLS,
    projectionHash: `sha256:${hashBusinessPayload(projectionFacts)}`,
  }
}

function authoritySummary(
  access: AllowedOperatingAccessScope,
): BranchDailyCloseSignOffStateResult["authority"] {
  return access.authority.kind === "TENANT_WIDE"
    ? {
        kind: access.authority.kind,
        basis: access.authority.basis,
      }
    : {
        kind: access.authority.kind,
        basis: access.authority.basis,
      }
}

function inconsistentEvidence() {
  return new ForbiddenError(
    "Branch daily-close sign-off state evidence is inconsistent.",
  )
}

function validDate(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value)
  return !Number.isNaN(parsed.getTime())
}

function validCounts(...values: number[]) {
  return values.every((value) => Number.isInteger(value) && value >= 0)
}
