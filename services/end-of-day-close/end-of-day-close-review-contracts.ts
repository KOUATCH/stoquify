import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts";
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts";
import type {
  SnapshotFreshness,
  SnapshotStatus,
} from "@/services/snapshots/snapshot-contracts";

import type {
  EndOfDayCloseChecklistKey,
  EndOfDayCloseEvidenceSourceType,
  EndOfDayCloseEvidenceStatus,
  EndOfDayCloseReadinessBlocker,
  EndOfDayCloseReadinessState,
} from "./end-of-day-close-readiness-contracts";

export type StartBranchDailyCloseReviewInput = {
  accessContext: OperatingAccessContext;
  actorId: string;
  locationId: string;
  businessDate: string;
  idempotencyKey: string;
  correlationId?: string | null;
  now?: Date | string | null;
  maxAgeMinutes?: number | null;
};

export type BranchDailyCloseRunStatus = "IN_REVIEW" | "BLOCKED";

export type BranchDailyCloseEvidenceSource = {
  checklistKey: EndOfDayCloseChecklistKey;
  status: Exclude<EndOfDayCloseEvidenceStatus, "UNSUPPORTED">;
  sourceType: EndOfDayCloseEvidenceSourceType;
  sourceIds: string[];
  sourceHash: string | null;
  observedAt: string | null;
  freshness: SnapshotFreshness | null;
  evidenceGrade: EvidenceGrade;
};

export type BranchDailyCloseEvidenceBlocker = Pick<
  EndOfDayCloseReadinessBlocker,
  "code" | "severity" | "gate" | "sourceTables"
>;

export type BranchDailyCloseEvidenceManifest = {
  version: 1;
  kind: "BRANCH_DAILY_CLOSE_REVIEW_EVIDENCE";
  organizationId: string;
  locationId: string;
  businessDate: string;
  periodStart: string;
  periodEnd: string;
  observedAt: string;
  authority: {
    kind: "TENANT_WIDE" | "LOCATION_RESPONSIBILITY";
    basis: "RBAC_SUPER_USER" | "RBAC_ROLE" | "Location.managerId";
  };
  readiness: EndOfDayCloseReadinessState;
  readinessSourceHash: string;
  evidenceCoverage: {
    state: "PARTIAL" | "COMPLETE";
    supportedItemCount: number;
    unsupportedItemCount: number;
    complete: boolean;
  };
  facts: {
    branchSnapshotStatus: SnapshotStatus;
    posSessionCount: number;
    closedOrReconciledSessionCount: number;
    activeSessionCount: number;
    suspendedSessionCount: number;
    inconsistentSessionCount: number;
    cashDrawerCount: number;
    openCashDrawerCount: number;
    attributedPaymentCount: number;
    attributedPaymentStatusCounts: Record<string, number>;
    attributedPaymentMethodCounts: Record<string, number>;
  };
  supportedSources: BranchDailyCloseEvidenceSource[];
  unsupportedChecklistKeys: EndOfDayCloseChecklistKey[];
  blockers: BranchDailyCloseEvidenceBlocker[];
  controls: {
    monetaryFieldsIncluded: false;
    paymentLocationOwnershipClaimed: false;
    managerSignOffIncluded: false;
    finalCloseClaimed: false;
  };
};

export type BranchDailyCloseRunRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  businessDate: string;
  periodStart: string;
  periodEnd: string;
  status: BranchDailyCloseRunStatus;
  readinessState: EndOfDayCloseReadinessState;
  evidenceCoverageState: "PARTIAL" | "COMPLETE";
  supportedItemCount: number;
  unsupportedItemCount: number;
  blockerCount: number;
  evidenceObservedAt: string;
  readinessSourceHash: string;
  evidenceHash: string;
  startedById: string;
  startedAt: string;
  idempotencyKey: string;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
};

export type StartBranchDailyCloseReviewResult = {
  kind: "BRANCH_DAILY_CLOSE_REVIEW";
  created: boolean;
  replayed: boolean;
  run: BranchDailyCloseRunRecord;
};
