import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import type {
  EvidenceGrade,
  ProofTrailBlockerSeverity,
} from "@/services/evidence/evidence-contracts";
import type { OperatingAccessContext } from "@/services/operating-access/operating-access-scope-contracts";
import type {
  SnapshotFreshness,
  SnapshotStatus,
} from "@/services/snapshots/snapshot-contracts";

export type EndOfDayCloseReadinessInput = {
  accessContext: OperatingAccessContext;
  locationId: string;
  businessDate: string;
  now?: Date | string | null;
  maxAgeMinutes?: number | null;
};

export type EndOfDayCloseReadinessState =
  | "READY_FOR_REVIEW"
  | "ACTION_REQUIRED"
  | "NO_ACTIVITY"
  | "UNAVAILABLE";

export type EndOfDayCloseEvidenceStatus =
  | "READY"
  | "ACTION_REQUIRED"
  | "NO_ACTIVITY"
  | "STALE"
  | "BLOCKED"
  | "UNAVAILABLE"
  | "UNSUPPORTED";

export type EndOfDayCloseChecklistKey =
  | "LOCATION_ACTIVE"
  | "BRANCH_OPERATING_SNAPSHOT"
  | "POS_SESSION_CLOSURE"
  | "CASH_DRAWER_CLOSURE"
  | "PAYMENT_CAPTURE_ATTRIBUTION"
  | "PAYMENT_RECONCILIATION"
  | "MANAGER_SIGN_OFF";

export type EndOfDayCloseEvidenceSourceType =
  | "LOCATION"
  | "BRANCH_OPERATING_SNAPSHOT"
  | "POS_SESSION"
  | "CASH_DRAWER"
  | "PAYMENT_CAPTURE"
  | "PAYMENT_RECONCILIATION"
  | "MANAGER_SIGN_OFF";

export type EndOfDayCloseEvidenceReference = {
  sourceType: EndOfDayCloseEvidenceSourceType;
  sourceIds: string[];
  sourceHash: string | null;
  observedAt: string | null;
  freshness: SnapshotFreshness | null;
  evidenceGrade: EvidenceGrade;
};

export type EndOfDayCloseChecklistItem = {
  key: EndOfDayCloseChecklistKey;
  status: EndOfDayCloseEvidenceStatus;
  title: string;
  detail: string;
  evidence: EndOfDayCloseEvidenceReference;
};

export type EndOfDayCloseReadinessBlocker = {
  code: string;
  severity: ProofTrailBlockerSeverity;
  gate: string;
  title: string;
  detail: string;
  sourceTables: string[];
  nextAction: string | null;
};

export type EndOfDayCloseReadinessResult = {
  kind: "BRANCH_END_OF_DAY_CLOSE_READINESS";
  organizationId: string;
  actorId: string;
  generatedAt: string;
  businessDate: string;
  periodStart: string;
  periodEnd: string;
  authority:
    | {
        kind: "TENANT_WIDE";
        basis: "RBAC_SUPER_USER" | "RBAC_ROLE";
      }
    | {
        kind: "LOCATION_RESPONSIBILITY";
        basis: "Location.managerId";
      };
  scope: {
    kind: "LOCATION";
    locationId: string;
  };
  location: {
    id: string;
    name: string;
    code: string;
  };
  readiness: EndOfDayCloseReadinessState;
  evidenceCoverage: {
    state: "PARTIAL" | "COMPLETE";
    supportedItemCount: number;
    unsupportedItemCount: number;
    complete: boolean;
  };
  completion: {
    state: "NOT_AVAILABLE";
    signOffSupported: false;
    signedOff: false;
    signedOffAt: null;
    signedOffBy: null;
    reasonCode: "NO_DURABLE_DAILY_CLOSE_SIGN_OFF_SOURCE";
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
    attributedPaymentStatusCounts: Record<PaymentStatus, number>;
    attributedPaymentMethodCounts: Record<PaymentMethod, number>;
  };
  checklist: EndOfDayCloseChecklistItem[];
  blockers: EndOfDayCloseReadinessBlocker[];
  sourceHash: string;
};
