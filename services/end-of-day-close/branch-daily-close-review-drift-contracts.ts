import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts";

import type {
  EndOfDayCloseReadinessResult,
  EndOfDayCloseReadinessState,
} from "./end-of-day-close-readiness-contracts";

export type BranchDailyCloseReviewDriftInput = {
  accessContext: OperatingAccessContext;
  locationId: string;
  businessDate: string;
  now?: Date | string | null;
  maxAgeMinutes?: number | null;
};

export type BranchDailyCloseReviewDriftState =
  | "NOT_STARTED"
  | "CURRENT"
  | "DRIFTED";

export type BranchDailyCloseReviewDriftReason =
  | "READINESS_SOURCE_HASH_CHANGED"
  | "READINESS_STATE_CHANGED"
  | "SUPPORTED_ITEM_COUNT_CHANGED"
  | "UNSUPPORTED_ITEM_COUNT_CHANGED"
  | "BLOCKER_COUNT_CHANGED";

export type BranchDailyCloseReviewStoredEvidence = {
  sourceId: string;
  observedAt: string;
  readinessState: EndOfDayCloseReadinessState;
  readinessSourceHash: string;
  evidenceHash: string;
  supportedItemCount: number;
  unsupportedItemCount: number;
  blockerCount: number;
};

export type BranchDailyCloseReviewCurrentEvidence = {
  observedAt: string;
  readinessState: EndOfDayCloseReadinessState;
  readinessSourceHash: string;
  supportedItemCount: number;
  unsupportedItemCount: number;
  blockerCount: number;
};

export type BranchDailyCloseReviewDriftResult = {
  kind: "BRANCH_DAILY_CLOSE_REVIEW_DRIFT";
  organizationId: string;
  actorId: string;
  generatedAt: string;
  businessDate: string;
  authority: EndOfDayCloseReadinessResult["authority"];
  scope: {
    kind: "LOCATION";
    locationId: string;
  };
  location: {
    id: string;
    name: string;
    code: string;
  };
  state: BranchDailyCloseReviewDriftState;
  reasons: BranchDailyCloseReviewDriftReason[];
  stored: BranchDailyCloseReviewStoredEvidence | null;
  current: BranchDailyCloseReviewCurrentEvidence;
};
