import {
  PayrollRunStatus,
  PayrollRunTransitionEvidenceStatus,
  PayrollRunTransitionOrigin,
} from "@prisma/client";

import { buildPayrollRunLifecycleReadModel } from "../payroll-run-lifecycle-read-model";

function transition(
  toStatus: PayrollRunStatus,
  fromVersion: number,
  actorId = `actor-${toStatus.toLowerCase()}`,
) {
  return {
    toStatus,
    fromVersion,
    toVersion: fromVersion + 1,
    actorId,
    transitionedAt: new Date(`2026-08-22T10:0${fromVersion}:00.000Z`),
    businessEventId: `event-${toStatus.toLowerCase()}`,
    origin: PayrollRunTransitionOrigin.RUNTIME,
    evidenceStatus: PayrollRunTransitionEvidenceStatus.VERIFIED,
  };
}

describe("payroll run lifecycle read model", () => {
  it("publishes review as the next legal stage for a calculated run", () => {
    const result = buildPayrollRunLifecycleReadModel({
      status: PayrollRunStatus.CALCULATED,
      version: 1,
      transitions: [],
      writeEnabled: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        transitionEvidence: "NOT_APPLICABLE",
        blockerCodes: [],
        complete: false,
        nextAction: expect.objectContaining({
          id: "review",
          requiredPermission: "payroll.runs.review",
          requiresFreshAuth: true,
          requiresSeparateApprover: true,
        }),
      }),
    );
  });

  it("publishes emission only when reviewed and approved runtime proof is complete", () => {
    const result = buildPayrollRunLifecycleReadModel({
      status: PayrollRunStatus.APPROVED,
      version: 3,
      transitions: [
        transition(PayrollRunStatus.REVIEWED, 1, "reviewer-secret-id"),
        transition(PayrollRunStatus.APPROVED, 2, "approver-secret-id"),
      ],
      writeEnabled: true,
    });

    expect(result.transitionEvidence).toBe("VERIFIED");
    expect(result.nextAction).toEqual(
      expect.objectContaining({
        id: "emit",
        requiredPermission: "payroll.payslips.emit",
      }),
    );
    expect(result.stages[0]).toEqual(
      expect.objectContaining({
        stage: PayrollRunStatus.REVIEWED,
        actorPresent: true,
        businessEventId: "event-reviewed",
        fromVersion: 1,
        toVersion: 2,
      }),
    );
    expect(JSON.stringify(result)).not.toContain("reviewer-secret-id");
    expect(JSON.stringify(result)).not.toContain("approver-secret-id");
  });

  it("blocks the next stage when post-cutover transition proof is missing", () => {
    const result = buildPayrollRunLifecycleReadModel({
      status: PayrollRunStatus.APPROVED,
      version: 3,
      transitions: [transition(PayrollRunStatus.REVIEWED, 1)],
      writeEnabled: true,
    });

    expect(result.transitionEvidence).toBe("MISSING_POST_CUTOVER");
    expect(result.blockerCodes).toContain("PAYROLL_TRANSITION_PROOF_MISSING");
    expect(result.nextAction?.id).toBe("emit");
  });

  it("keeps legacy partial evidence explicit and non-upgradable", () => {
    const legacy = {
      ...transition(PayrollRunStatus.REVIEWED, 1),
      actorId: null,
      transitionedAt: null,
      businessEventId: null,
      fromVersion: null,
      toVersion: null,
      origin: PayrollRunTransitionOrigin.LEGACY_BACKFILL,
      evidenceStatus:
        PayrollRunTransitionEvidenceStatus.LEGACY_PARTIAL_EVIDENCE,
    };
    const result = buildPayrollRunLifecycleReadModel({
      status: PayrollRunStatus.REVIEWED,
      version: 2,
      transitions: [legacy],
      writeEnabled: true,
    });

    expect(result.transitionEvidence).toBe("LEGACY_PARTIAL");
    expect(result.blockerCodes).toContain(
      "PAYROLL_TRANSITION_PROOF_LEGACY_PARTIAL",
    );
    expect(result.stages[0].actorPresent).toBe(false);
  });

  it("marks a posted run complete only with all four verified stages", () => {
    const result = buildPayrollRunLifecycleReadModel({
      status: PayrollRunStatus.POSTED,
      version: 5,
      transitions: [
        transition(PayrollRunStatus.REVIEWED, 1),
        transition(PayrollRunStatus.APPROVED, 2),
        transition(PayrollRunStatus.EMITTED, 3),
        transition(PayrollRunStatus.POSTED, 4),
      ],
      writeEnabled: true,
    });

    expect(result.transitionEvidence).toBe("VERIFIED");
    expect(result.complete).toBe(true);
    expect(result.nextAction).toBeNull();
    expect(result.blockerCodes).toEqual([]);
  });
});
