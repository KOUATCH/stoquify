const {
  PHASE2B_EXPECTED_STEPS,
  evaluatePromotion,
  outputPaths,
  parseArgs,
  renderMarkdown,
} = require("../agent-phase-promotion-gate");

describe("Agent phase promotion gate", () => {
  it("fails closed on the current external-authority blocker classes", () => {
    const input = readyInput();
    input.freezeAttestation.cleanReleaseReady = false;
    input.releaseIndex.summary.status = "blocked";
    input.releaseIndex.summary.releaseBlockerCount = 6;
    input.secretPreflight.summary.status = "blocked";
    input.secretPreflight.summary.blockerCount = 6;
    input.migrationReadiness.summary.status = "blocked";
    input.migrationReadiness.summary.blockerCount = 2;
    input.statutoryReadiness.summary.status = "blocked";
    input.statutoryReadiness.summary.blockerCount = 2;
    input.credentialRegister.declaredStatus = "BLOCKED";
    input.operationalEvidence.declaredStatus = "BLOCKED";
    input.promotionLedger.gateSnapshot.enterpriseReleaseDecision =
      "REJECTED_NO_GO";
    input.promotionLedger.steps[0].status =
      "REPOSITORY_VERIFIED_REVIEW_PENDING";

    const result = evaluatePromotion(input, "phase2b");

    expect(result.status).toBe("BLOCKED");
    expect(result.eligible).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "CLEAN_RELEASE_READY",
        "GLOBAL_RELEASE_READY",
        "PRODUCTION_SECRETS_READY",
        "MIGRATION_TARGET_READY",
        "STATUTORY_AUTHORITY_READY",
        "CREDENTIAL_ROTATION_READY",
        "OPERATIONAL_RELEASE_READY",
        "PROMOTION_POINT_1_REVIEW_ACCEPTED",
        "ENTERPRISE_GATE_017_GO",
      ]),
    );
    expect(result.activationAuthorizedByGate).toBe(false);
  });

  it("reports Phase 2B eligibility without granting activation", () => {
    const result = evaluatePromotion(readyInput(), "phase2b");

    expect(result).toEqual(
      expect.objectContaining({
        status: "ELIGIBLE_FOR_PHASE2B_ACTIVATION_REVIEW",
        eligible: true,
        activationAuthorizedByGate: false,
        phase3AuthorizedByGate: false,
        blockers: [],
      }),
    );
  });

  it("blocks Phase 2B if activation authority is pre-populated", () => {
    const input = readyInput();
    input.operationalEvidence.activation.authorized = true;

    const result = evaluatePromotion(input, "phase2b");

    expect(result.blockers).toContain("PRE_ACTIVATION_BOUNDARY");
    expect(result.safety.activationAttempted).toBe(false);
  });

  it("blocks Phase 3 when pilot exit evidence is incomplete", () => {
    const input = readyInput();
    input.promotionLedger.phase3Authorized = true;
    input.pilotExitRegister.declaredStatus = "NOT_STARTED";
    input.pilotExitRegister.operations.rollbackExercisePassed = false;

    const result = evaluatePromotion(input, "phase3");

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PILOT_EXIT_STATUS_READY",
        "PILOT_OPERATIONS_EVIDENCE",
      ]),
    );
  });

  it("reports Phase 3 eligibility only with complete pilot exit authority", () => {
    const input = readyInput();
    input.promotionLedger.phase3Authorized = true;

    const result = evaluatePromotion(input, "phase3");

    expect(result).toEqual(
      expect.objectContaining({
        status: "ELIGIBLE_TO_BEGIN_PHASE3_READ_AND_DRAFT",
        eligible: true,
        recordedPhase3AuthorityPresent: true,
        activationAuthorizedByGate: false,
        phase3AuthorizedByGate: false,
        blockers: [],
      }),
    );
  });

  it("enforces four-way pilot exit approver segregation", () => {
    const input = readyInput();
    input.promotionLedger.phase3Authorized = true;
    input.pilotExitRegister.approvals.release.actorDirectoryId =
      input.pilotExitRegister.approvals.security.actorDirectoryId;

    const result = evaluatePromotion(input, "phase3");

    expect(result.blockers).toContain("PILOT_APPROVER_SEGREGATION");
  });

  it("parses explicit targets and resolves deterministic output paths", () => {
    expect(parseArgs(["--target", "phase2b", "--mode", "fail"])).toEqual({
      mode: "fail",
      target: "phase2b",
      jsonOut: null,
      markdownOut: null,
    });
    expect(outputPaths("phase3", { jsonOut: null, markdownOut: null })).toEqual(
      expect.objectContaining({
        jsonOut: expect.stringContaining("PHASE_3_ENTRY_DECISION"),
        markdownOut: expect.stringContaining("PHASE_3_ENTRY_DECISION"),
      }),
    );
    expect(() => parseArgs(["--target", "phase4"])).toThrow(
      "Target must be phase2b or phase3.",
    );
  });

  it("renders a value-free eligibility decision with no authority grant", () => {
    const markdown = renderMarkdown(evaluatePromotion(readyInput(), "phase2b"));

    expect(markdown).toContain("ELIGIBLE_FOR_PHASE2B_ACTIVATION_REVIEW");
    expect(markdown).toContain("Activation authorized by gate:** No");
    expect(markdown).toContain("Phase 3 authorized by gate:** No");
    expect(markdown).toContain("No authority was granted by this gate");
  });
});

function readyInput() {
  const hash = "a".repeat(64);
  const approvals = Object.fromEntries(
    ["product", "security", "financeDomain", "release"].map((key, index) => [
      key,
      {
        decision: "APPROVED",
        actorDirectoryId: `directory-user-${index + 1}`,
        approvalReference: `approval-${index + 1}`,
        decidedAt: "2026-07-25T10:00:00.000Z",
      },
    ]),
  );
  return {
    requirementsAudit: {
      authorizedScopeComplete: true,
      summary: { repositoryBlockers: 0 },
    },
    freezeAttestation: {
      status: "FROZEN_COMMIT_VERIFIED",
      freezeVerified: true,
      cleanReleaseReady: true,
      summary: { contentMismatches: 0, phase2aRuntimeDrift: 0 },
    },
    releaseIndex: {
      summary: { status: "ready", releaseBlockerCount: 0 },
    },
    secretPreflight: {
      summary: { status: "ready", blockerCount: 0 },
    },
    migrationReadiness: {
      summary: { status: "ready", blockerCount: 0 },
    },
    statutoryReadiness: {
      summary: { status: "ready", blockerCount: 0 },
    },
    credentialRegister: { declaredStatus: "READY" },
    operationalEvidence: {
      declaredStatus: "READY_FOR_INDEPENDENT_REVIEW",
      activation: {
        requested: false,
        authorized: false,
        activatedAt: null,
      },
    },
    promotionLedger: {
      activationAuthorized: false,
      phase3Authorized: false,
      gateSnapshot: { enterpriseReleaseDecision: "APPROVED_GO" },
      steps: [
        ...[...PHASE2B_EXPECTED_STEPS].map(([id, status]) => ({
          id,
          status,
        })),
        { id: 12, status: "COMPLETED" },
        { id: 13, status: "APPROVED_GO" },
      ],
    },
    pilotExitRegister: {
      declaredStatus: "READY_FOR_PHASE3_REVIEW",
      releaseBinding: {
        commitSha: "b".repeat(40),
        artifactDigest: `sha256:${hash}`,
        evidenceBundleHash: hash,
      },
      pilot: {
        activationDecisionReference: "activation-decision-1",
        allowlistedTenantScopeHash: hash,
        allowlistedRoleScopeHash: `sha256:${hash}`,
        startedAt: "2026-07-24T08:00:00.000Z",
        endedAt: "2026-07-25T08:00:00.000Z",
        observationWindowHours: 24,
        successfulRunCount: 12,
        failedRunCount: 0,
      },
      safety: {
        businessWriteAuthorityObserved: false,
        crossTenantViolationCount: 0,
        prohibitedExecutionCount: 0,
        secretExposureCount: 0,
      },
      operations: {
        monitoringEvidenceReference: "monitoring-evidence-1",
        supportEvidenceReference: "support-evidence-1",
        rollbackExercisePassed: true,
        rollbackExerciseReference: "rollback-evidence-1",
        incidentEvidenceReference: "incident-evidence-1",
      },
      incidents: {
        criticalCount: 0,
        highCount: 0,
        unresolvedCount: 0,
      },
      approvals,
      phase3Recommendation: true,
      phase3Authorized: false,
    },
    now: new Date("2026-07-25T12:00:00.000Z"),
  };
}
