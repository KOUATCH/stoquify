import "server-only"

import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"

import type {
  BranchDailyCloseCompletionAlignmentReason,
  BranchDailyCloseCompletionInput,
  BranchDailyCloseCompletionResult,
  BranchDailyCloseCompletionState,
} from "./branch-daily-close-completion-contracts"
import type { BranchDailyCloseSignOffStateResult } from "./branch-daily-close-sign-off-state-contracts"
import { getBranchDailyCloseSignOffState } from "./branch-daily-close-sign-off-state.service"
import type { EndOfDayCloseReadinessResult } from "./end-of-day-close-readiness-contracts"
import { getEndOfDayCloseReadiness } from "./end-of-day-close-readiness.service"

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/
const PRE_SIGN_READINESS_STATES = new Set([
  "READY_FOR_REVIEW",
  "ACTION_REQUIRED",
  "NO_ACTIVITY",
  "UNAVAILABLE",
])
const POST_REVIEW_STATES = new Set([
  "NOT_STARTED",
  "BLOCKED",
  "AWAITING_SIGN_OFF",
  "SIGNED",
])

const COMPOSITION_CONTROLS = {
  compositionPurpose: "VERSIONED_COMPLETION_READ_MODEL",
  preSignReadinessPreserved: true,
  preSignSourceHashIncludesSignOff: false,
  readinessPromoted: false,
  paymentReconciliationClaimed: false,
  finalCloseClaimed: false,
} as const

type NormalizedInput = {
  accessContext: BranchDailyCloseCompletionInput["accessContext"]
  locationId: string
  businessDate: string
  now: Date
  maxAgeMinutes?: number | null
}

export async function getBranchDailyCloseCompletion(
  input: BranchDailyCloseCompletionInput,
): Promise<BranchDailyCloseCompletionResult> {
  const normalized = normalizeInput(input)
  const [readiness, signOffState] = await Promise.all([
    getEndOfDayCloseReadiness({
      accessContext: normalized.accessContext,
      locationId: normalized.locationId,
      businessDate: normalized.businessDate,
      now: normalized.now,
      maxAgeMinutes: normalized.maxAgeMinutes,
    }),
    getBranchDailyCloseSignOffState({
      accessContext: normalized.accessContext,
      locationId: normalized.locationId,
      businessDate: normalized.businessDate,
      now: normalized.now,
    }),
  ])

  assertReadinessBoundary(readiness, normalized)
  assertSignOffBoundary(signOffState, normalized)
  assertSharedIdentity(readiness, signOffState)

  const alignment = evidenceAlignment(readiness, signOffState)
  const state = completionState(signOffState, alignment.state)
  const completion = completionRecord(state, signOffState)
  const compositionFacts = {
    version: "1.0",
    kind: "BRANCH_DAILY_CLOSE_COMPLETION",
    organizationId: readiness.organizationId,
    locationId: normalized.locationId,
    businessDate: normalized.businessDate,
    state,
    preSignSourceHash: readiness.sourceHash,
    postReviewProjectionHash: signOffState.projectionHash,
    alignment,
    completion,
    controls: COMPOSITION_CONTROLS,
  }

  return {
    kind: "BRANCH_DAILY_CLOSE_COMPLETION",
    contractVersion: "1.0",
    organizationId: readiness.organizationId,
    actorId: readiness.actorId,
    generatedAt: normalized.now.toISOString(),
    businessDate: normalized.businessDate,
    authority: readiness.authority,
    scope: readiness.scope,
    location: readiness.location,
    state,
    preSignReadiness: readiness,
    postReviewSignOffState: signOffState,
    alignment,
    completion,
    controls: COMPOSITION_CONTROLS,
    compositionHash: `sha256:${hashBusinessPayload(compositionFacts)}`,
  }
}

function normalizeInput(input: BranchDailyCloseCompletionInput): NormalizedInput {
  const locationId = input.locationId?.trim()
  if (!locationId) {
    throw new BusinessRuleError(
      "A location is required for branch daily-close completion.",
    )
  }
  if (locationId.length > 240) {
    throw new BusinessRuleError(
      "Branch daily-close completion location is too long.",
    )
  }

  const businessDate = input.businessDate?.trim()
  if (!BUSINESS_DATE_PATTERN.test(businessDate)) {
    throw new BusinessRuleError(
      "Branch daily-close completion businessDate must use YYYY-MM-DD.",
    )
  }
  const parsedDate = new Date(`${businessDate}T00:00:00.000Z`)
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== businessDate
  ) {
    throw new BusinessRuleError(
      "Branch daily-close completion businessDate must be a valid calendar date.",
    )
  }

  const now = input.now === null || input.now === undefined
    ? new Date()
    : new Date(input.now)
  if (Number.isNaN(now.getTime())) {
    throw new BusinessRuleError(
      "Branch daily-close completion now must be a valid date.",
    )
  }
  if (
    input.maxAgeMinutes !== null &&
    input.maxAgeMinutes !== undefined &&
    (!Number.isInteger(input.maxAgeMinutes) || input.maxAgeMinutes <= 0)
  ) {
    throw new BusinessRuleError(
      "Branch daily-close completion maxAgeMinutes must be a positive integer.",
    )
  }

  return {
    accessContext: input.accessContext,
    locationId,
    businessDate,
    now,
    maxAgeMinutes: input.maxAgeMinutes,
  }
}

function assertReadinessBoundary(
  readiness: EndOfDayCloseReadinessResult,
  input: NormalizedInput,
) {
  const managerSignOff = readiness.checklist.find(
    (item) => item.key === "MANAGER_SIGN_OFF",
  )
  const paymentReconciliation = readiness.checklist.find(
    (item) => item.key === "PAYMENT_RECONCILIATION",
  )
  if (
    readiness.kind !== "BRANCH_END_OF_DAY_CLOSE_READINESS" ||
    readiness.organizationId !== input.accessContext.orgId ||
    readiness.actorId !== input.accessContext.userId ||
    readiness.generatedAt !== input.now.toISOString() ||
    readiness.businessDate !== input.businessDate ||
    readiness.scope.kind !== "LOCATION" ||
    readiness.scope.locationId !== input.locationId ||
    readiness.location.id !== input.locationId ||
    !readiness.location.name.trim() ||
    !readiness.location.code.trim() ||
    !validDate(readiness.periodStart) ||
    !validDate(readiness.periodEnd) ||
    !PRE_SIGN_READINESS_STATES.has(readiness.readiness) ||
    !SHA256_PATTERN.test(readiness.sourceHash) ||
    !validCounts(
      readiness.evidenceCoverage.supportedItemCount,
      readiness.evidenceCoverage.unsupportedItemCount,
      readiness.blockers.length,
    ) ||
    readiness.evidenceCoverage.supportedItemCount +
      readiness.evidenceCoverage.unsupportedItemCount !==
      readiness.checklist.length ||
    readiness.evidenceCoverage.complete !==
      (readiness.evidenceCoverage.unsupportedItemCount === 0) ||
    readiness.completion.state !== "NOT_AVAILABLE" ||
    readiness.completion.signOffSupported !== false ||
    readiness.completion.signedOff !== false ||
    readiness.completion.signedOffAt !== null ||
    readiness.completion.signedOffBy !== null ||
    readiness.completion.reasonCode !==
      "NO_DURABLE_DAILY_CLOSE_SIGN_OFF_SOURCE" ||
    managerSignOff?.status !== "UNSUPPORTED" ||
    managerSignOff.evidence.sourceIds.length !== 0 ||
    managerSignOff.evidence.sourceHash !== null ||
    paymentReconciliation?.status !== "UNSUPPORTED" ||
    paymentReconciliation.evidence.sourceIds.length !== 0 ||
    paymentReconciliation.evidence.sourceHash !== null
  ) {
    throw inconsistentEvidence()
  }
}

function assertSignOffBoundary(
  signOffState: BranchDailyCloseSignOffStateResult,
  input: NormalizedInput,
) {
  const review = signOffState.review
  const signOff = signOffState.signOff
  const history = signOffState.history
  if (
    signOffState.kind !== "BRANCH_DAILY_CLOSE_SIGN_OFF_STATE" ||
    signOffState.organizationId !== input.accessContext.orgId ||
    signOffState.actorId !== input.accessContext.userId ||
    signOffState.generatedAt !== input.now.toISOString() ||
    signOffState.businessDate !== input.businessDate ||
    signOffState.scope.kind !== "LOCATION" ||
    signOffState.scope.locationId !== input.locationId ||
    signOffState.location.id !== input.locationId ||
    !signOffState.location.name.trim() ||
    !signOffState.location.code.trim() ||
    !POST_REVIEW_STATES.has(signOffState.state) ||
    !SHA256_PATTERN.test(signOffState.projectionHash) ||
    signOffState.controls.projectionPurpose !== "SIGN_OFF_STATE_ONLY" ||
    signOffState.controls.preSignReadinessSourceHashIncludesSignOff !== false ||
    signOffState.controls.readinessPromoted !== false ||
    signOffState.controls.finalCloseClaimed !== false ||
    !validCounts(
      history.totalCount,
      history.activeCount,
      history.revokedCount,
      history.supersededCount,
      history.terminalCount,
    ) ||
    history.terminalCount !==
      history.revokedCount + history.supersededCount ||
    history.totalCount !== history.activeCount + history.terminalCount ||
    (history.latestTerminalAt !== null &&
      !validDate(history.latestTerminalAt))
  ) {
    throw inconsistentEvidence()
  }

  const validShape =
    (signOffState.state === "NOT_STARTED" &&
      review === null &&
      signOff === null &&
      history.totalCount === 0) ||
    (signOffState.state === "BLOCKED" &&
      review?.status === "BLOCKED" &&
      signOff === null &&
      history.activeCount === 0) ||
    (signOffState.state === "AWAITING_SIGN_OFF" &&
      review?.status === "IN_REVIEW" &&
      signOff === null &&
      history.activeCount === 0) ||
    (signOffState.state === "SIGNED" &&
      review?.status === "IN_REVIEW" &&
      signOff?.status === "ACTIVE" &&
      history.activeCount === 1 &&
      signOff.signedReadinessSourceHash === review.readinessSourceHash &&
      signOff.signedEvidenceHash === review.evidenceHash &&
      signOff.signedEvidenceObservedAt === review.evidenceObservedAt)

  if (!validShape) throw inconsistentEvidence()
}

function assertSharedIdentity(
  readiness: EndOfDayCloseReadinessResult,
  signOffState: BranchDailyCloseSignOffStateResult,
) {
  if (
    readiness.organizationId !== signOffState.organizationId ||
    readiness.actorId !== signOffState.actorId ||
    readiness.generatedAt !== signOffState.generatedAt ||
    readiness.businessDate !== signOffState.businessDate ||
    readiness.scope.locationId !== signOffState.scope.locationId ||
    readiness.location.id !== signOffState.location.id ||
    readiness.location.name !== signOffState.location.name ||
    readiness.location.code !== signOffState.location.code ||
    readiness.authority.kind !== signOffState.authority.kind ||
    readiness.authority.basis !== signOffState.authority.basis
  ) {
    throw inconsistentEvidence()
  }
}

function evidenceAlignment(
  readiness: EndOfDayCloseReadinessResult,
  signOffState: BranchDailyCloseSignOffStateResult,
): BranchDailyCloseCompletionResult["alignment"] {
  const review = signOffState.review
  if (!review) {
    return {
      state: "NOT_APPLICABLE",
      reasons: [],
      preSignSourceHash: readiness.sourceHash,
      postReviewProjectionHash: signOffState.projectionHash,
    }
  }

  const reasons: BranchDailyCloseCompletionAlignmentReason[] = []
  if (review.readinessSourceHash !== readiness.sourceHash) {
    reasons.push("READINESS_SOURCE_HASH_CHANGED")
  }
  if (review.readinessState !== readiness.readiness) {
    reasons.push("READINESS_STATE_CHANGED")
  }
  if (
    review.supportedItemCount !==
    readiness.evidenceCoverage.supportedItemCount
  ) {
    reasons.push("SUPPORTED_ITEM_COUNT_CHANGED")
  }
  if (
    review.unsupportedItemCount !==
    readiness.evidenceCoverage.unsupportedItemCount
  ) {
    reasons.push("UNSUPPORTED_ITEM_COUNT_CHANGED")
  }
  if (review.blockerCount !== readiness.blockers.length) {
    reasons.push("BLOCKER_COUNT_CHANGED")
  }

  return {
    state: reasons.length === 0 ? "CURRENT" : "DRIFTED",
    reasons,
    preSignSourceHash: readiness.sourceHash,
    postReviewProjectionHash: signOffState.projectionHash,
  }
}

function completionState(
  signOffState: BranchDailyCloseSignOffStateResult,
  alignmentState: BranchDailyCloseCompletionResult["alignment"]["state"],
): BranchDailyCloseCompletionState {
  if (alignmentState === "DRIFTED") return "EVIDENCE_DRIFTED"
  return signOffState.state
}

function completionRecord(
  state: BranchDailyCloseCompletionState,
  signOffState: BranchDailyCloseSignOffStateResult,
): BranchDailyCloseCompletionResult["completion"] {
  const activeSignOffPresent = signOffState.signOff !== null
  const base = {
    state,
    signOffSupported: true as const,
    activeSignOffPresent,
    completionSatisfied: state === "SIGNED",
    reviewId: signOffState.review?.id ?? null,
    signedOffAt: signOffState.signOff?.signedAt ?? null,
    signedOffBy: signOffState.signOff?.signedById ?? null,
  }

  switch (state) {
    case "NOT_STARTED":
      return { ...base, reasonCode: "NO_REVIEW" }
    case "BLOCKED":
      return { ...base, reasonCode: "REVIEW_BLOCKED" }
    case "AWAITING_SIGN_OFF":
      return { ...base, reasonCode: "AWAITING_SIGN_OFF" }
    case "SIGNED":
      return { ...base, reasonCode: "SIGNED_EVIDENCE_CURRENT" }
    default:
      return { ...base, reasonCode: "REVIEW_EVIDENCE_DRIFTED" }
  }
}

function inconsistentEvidence() {
  return new ForbiddenError(
    "Branch daily-close completion evidence is inconsistent.",
  )
}

function validDate(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value)
  return !Number.isNaN(parsed.getTime())
}

function validCounts(...values: number[]) {
  return values.every((value) => Number.isInteger(value) && value >= 0)
}
