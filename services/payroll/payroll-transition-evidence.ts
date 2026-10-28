import {
  PayrollRunStatus,
  PayrollRunTransitionEvidenceStatus,
  PayrollRunTransitionOrigin,
} from "@prisma/client";

export type PayrollTransitionEvidenceRow = {
  toStatus: PayrollRunStatus;
  fromVersion: number | null;
  toVersion: number | null;
  actorId: string | null;
  transitionedAt: Date | null;
  businessEventId: string | null;
  origin: PayrollRunTransitionOrigin;
  evidenceStatus: PayrollRunTransitionEvidenceStatus;
};

export type PayrollTransitionEvidenceRun = {
  status: PayrollRunStatus;
  transitions: readonly PayrollTransitionEvidenceRow[];
};

export type PayrollTransitionEvidenceClassification =
  | "NOT_APPLICABLE"
  | "VERIFIED"
  | "LEGACY_PARTIAL"
  | "MISSING_POST_CUTOVER";

const requiredTransitionStages: Partial<
  Record<PayrollRunStatus, readonly PayrollRunStatus[]>
> = {
  [PayrollRunStatus.REVIEWED]: [PayrollRunStatus.REVIEWED],
  [PayrollRunStatus.APPROVED]: [
    PayrollRunStatus.REVIEWED,
    PayrollRunStatus.APPROVED,
  ],
  [PayrollRunStatus.EMITTED]: [
    PayrollRunStatus.REVIEWED,
    PayrollRunStatus.APPROVED,
    PayrollRunStatus.EMITTED,
  ],
  [PayrollRunStatus.POSTED]: [
    PayrollRunStatus.REVIEWED,
    PayrollRunStatus.APPROVED,
    PayrollRunStatus.EMITTED,
    PayrollRunStatus.POSTED,
  ],
  [PayrollRunStatus.PAID]: [
    PayrollRunStatus.REVIEWED,
    PayrollRunStatus.APPROVED,
    PayrollRunStatus.EMITTED,
    PayrollRunStatus.POSTED,
  ],
  [PayrollRunStatus.ARCHIVED]: [
    PayrollRunStatus.REVIEWED,
    PayrollRunStatus.APPROVED,
    PayrollRunStatus.EMITTED,
    PayrollRunStatus.POSTED,
  ],
};

function isVerifiedRuntimeTransition(row: PayrollTransitionEvidenceRow) {
  return (
    row.origin === PayrollRunTransitionOrigin.RUNTIME &&
    row.evidenceStatus === PayrollRunTransitionEvidenceStatus.VERIFIED &&
    Boolean(row.actorId) &&
    Boolean(row.transitionedAt) &&
    Boolean(row.businessEventId) &&
    row.fromVersion !== null &&
    row.toVersion !== null &&
    row.toVersion === row.fromVersion + 1
  );
}

export function classifyPayrollTransitionEvidence(
  run: PayrollTransitionEvidenceRun,
): PayrollTransitionEvidenceClassification {
  const requiredStages = requiredTransitionStages[run.status];
  if (!requiredStages) return "NOT_APPLICABLE";

  if (
    run.transitions.some(
      (row) =>
        row.origin === PayrollRunTransitionOrigin.LEGACY_BACKFILL ||
        row.evidenceStatus ===
          PayrollRunTransitionEvidenceStatus.LEGACY_PARTIAL_EVIDENCE,
    )
  ) {
    return "LEGACY_PARTIAL";
  }

  const byStage = new Map(run.transitions.map((row) => [row.toStatus, row]));
  return requiredStages.every((stage) => {
    const row = byStage.get(stage);
    return row ? isVerifiedRuntimeTransition(row) : false;
  })
    ? "VERIFIED"
    : "MISSING_POST_CUTOVER";
}

export function summarizePayrollTransitionEvidence(
  runs: readonly PayrollTransitionEvidenceRun[],
) {
  const summary = {
    emittedUnpostedCount: 0,
    missingPostCutoverProofCount: 0,
    legacyPartialEvidenceCount: 0,
    verifiedCount: 0,
  };

  for (const run of runs) {
    if (run.status === PayrollRunStatus.EMITTED) {
      summary.emittedUnpostedCount += 1;
    }
    const classification = classifyPayrollTransitionEvidence(run);
    if (classification === "MISSING_POST_CUTOVER") {
      summary.missingPostCutoverProofCount += 1;
    } else if (classification === "LEGACY_PARTIAL") {
      summary.legacyPartialEvidenceCount += 1;
    } else if (classification === "VERIFIED") {
      summary.verifiedCount += 1;
    }
  }

  return summary;
}
