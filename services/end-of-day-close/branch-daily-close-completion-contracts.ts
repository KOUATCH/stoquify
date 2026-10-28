import type { BranchDailyCloseSignOffStateResult } from "./branch-daily-close-sign-off-state-contracts"
import type {
  EndOfDayCloseReadinessInput,
  EndOfDayCloseReadinessResult,
} from "./end-of-day-close-readiness-contracts"

export type BranchDailyCloseCompletionInput = EndOfDayCloseReadinessInput

export type BranchDailyCloseCompletionState =
  | "NOT_STARTED"
  | "BLOCKED"
  | "AWAITING_SIGN_OFF"
  | "SIGNED"
  | "EVIDENCE_DRIFTED"

export type BranchDailyCloseCompletionAlignmentReason =
  | "READINESS_SOURCE_HASH_CHANGED"
  | "READINESS_STATE_CHANGED"
  | "SUPPORTED_ITEM_COUNT_CHANGED"
  | "UNSUPPORTED_ITEM_COUNT_CHANGED"
  | "BLOCKER_COUNT_CHANGED"

export type BranchDailyCloseCompletionResult = Readonly<{
  kind: "BRANCH_DAILY_CLOSE_COMPLETION"
  contractVersion: "1.0"
  organizationId: string
  actorId: string
  generatedAt: string
  businessDate: string
  authority: EndOfDayCloseReadinessResult["authority"]
  scope: EndOfDayCloseReadinessResult["scope"]
  location: EndOfDayCloseReadinessResult["location"]
  state: BranchDailyCloseCompletionState
  preSignReadiness: EndOfDayCloseReadinessResult
  postReviewSignOffState: BranchDailyCloseSignOffStateResult
  alignment: {
    state: "NOT_APPLICABLE" | "CURRENT" | "DRIFTED"
    reasons: BranchDailyCloseCompletionAlignmentReason[]
    preSignSourceHash: string
    postReviewProjectionHash: string
  }
  completion: {
    state: BranchDailyCloseCompletionState
    signOffSupported: true
    activeSignOffPresent: boolean
    completionSatisfied: boolean
    reviewId: string | null
    signedOffAt: string | null
    signedOffBy: string | null
    reasonCode:
      | "NO_REVIEW"
      | "REVIEW_BLOCKED"
      | "AWAITING_SIGN_OFF"
      | "SIGNED_EVIDENCE_CURRENT"
      | "REVIEW_EVIDENCE_DRIFTED"
  }
  controls: {
    compositionPurpose: "VERSIONED_COMPLETION_READ_MODEL"
    preSignReadinessPreserved: true
    preSignSourceHashIncludesSignOff: false
    readinessPromoted: false
    paymentReconciliationClaimed: false
    finalCloseClaimed: false
  }
  compositionHash: string
}>
