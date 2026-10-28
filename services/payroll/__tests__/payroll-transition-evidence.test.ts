import {
  PayrollRunStatus,
  PayrollRunTransitionEvidenceStatus,
  PayrollRunTransitionOrigin,
} from "@prisma/client";

import {
  classifyPayrollTransitionEvidence,
  summarizePayrollTransitionEvidence,
  type PayrollTransitionEvidenceRow,
} from "../payroll-transition-evidence";

function runtimeTransition(
  toStatus: PayrollRunStatus,
  fromVersion: number,
): PayrollTransitionEvidenceRow {
  return {
    toStatus,
    fromVersion,
    toVersion: fromVersion + 1,
    actorId: `actor-${toStatus}`,
    transitionedAt: new Date("2026-08-22T10:00:00.000Z"),
    businessEventId: `event-${toStatus}`,
    origin: PayrollRunTransitionOrigin.RUNTIME,
    evidenceStatus: PayrollRunTransitionEvidenceStatus.VERIFIED,
  };
}

const completeRuntimeLedger = [
  runtimeTransition(PayrollRunStatus.REVIEWED, 1),
  runtimeTransition(PayrollRunStatus.APPROVED, 2),
  runtimeTransition(PayrollRunStatus.EMITTED, 3),
  runtimeTransition(PayrollRunStatus.POSTED, 4),
];

describe("payroll transition evidence", () => {
  it("verifies a posted run only when every required runtime stage has complete evidence", () => {
    expect(
      classifyPayrollTransitionEvidence({
        status: PayrollRunStatus.POSTED,
        transitions: completeRuntimeLedger,
      }),
    ).toBe("VERIFIED");
  });

  it("fails a post-cutover run when an intermediate stage or event link is missing", () => {
    expect(
      classifyPayrollTransitionEvidence({
        status: PayrollRunStatus.POSTED,
        transitions: completeRuntimeLedger.filter(
          (row) => row.toStatus !== PayrollRunStatus.APPROVED,
        ),
      }),
    ).toBe("MISSING_POST_CUTOVER");

    expect(
      classifyPayrollTransitionEvidence({
        status: PayrollRunStatus.POSTED,
        transitions: completeRuntimeLedger.map((row) =>
          row.toStatus === PayrollRunStatus.POSTED
            ? { ...row, businessEventId: null }
            : row,
        ),
      }),
    ).toBe("MISSING_POST_CUTOVER");
  });

  it("discloses any mixed legacy/runtime ledger as legacy partial evidence", () => {
    expect(
      classifyPayrollTransitionEvidence({
        status: PayrollRunStatus.POSTED,
        transitions: [
          ...completeRuntimeLedger,
          {
            ...runtimeTransition(PayrollRunStatus.POSTED, 4),
            origin: PayrollRunTransitionOrigin.LEGACY_BACKFILL,
            evidenceStatus:
              PayrollRunTransitionEvidenceStatus.LEGACY_PARTIAL_EVIDENCE,
          },
        ],
      }),
    ).toBe("LEGACY_PARTIAL");
  });

  it("summarizes emitted-unposted, missing modern proof, legacy disclosure, and verified runs", () => {
    expect(
      summarizePayrollTransitionEvidence([
        {
          status: PayrollRunStatus.EMITTED,
          transitions: completeRuntimeLedger.slice(0, 3),
        },
        {
          status: PayrollRunStatus.POSTED,
          transitions: completeRuntimeLedger.slice(0, 3),
        },
        {
          status: PayrollRunStatus.POSTED,
          transitions: [
            {
              ...runtimeTransition(PayrollRunStatus.POSTED, 4),
              origin: PayrollRunTransitionOrigin.LEGACY_BACKFILL,
              evidenceStatus:
                PayrollRunTransitionEvidenceStatus.LEGACY_PARTIAL_EVIDENCE,
            },
          ],
        },
        {
          status: PayrollRunStatus.POSTED,
          transitions: completeRuntimeLedger,
        },
      ]),
    ).toEqual({
      emittedUnpostedCount: 1,
      missingPostCutoverProofCount: 1,
      legacyPartialEvidenceCount: 1,
      verifiedCount: 2,
    });
  });
});
