const {
  buildEnterpriseBlockerStatus,
  gateResultForReport,
  renderMarkdown,
} = require("../enterprise-release-blocker-status");

const IMMUTABILITY_TRIGGER_COUNT = 9;
const IMMUTABILITY_BLOCKED_MUTATION_COUNT = 14;
const IMMUTABILITY_ALLOWED_LIFECYCLE_COUNT = 3;

function immutabilityProof(overrides = {}) {
  return {
    generatedAt: "2026-08-12T19:21:43.961Z",
    mode: "fail",
    status: "ready",
    safety: {
      dbName: "stockflow_immutability_test",
      host: "localhost",
    },
    migration: { applied: false, exitCode: null },
    summary: {
      presentTriggers: IMMUTABILITY_TRIGGER_COUNT,
      requiredTriggers: IMMUTABILITY_TRIGGER_COUNT,
      blockedMutations: IMMUTABILITY_BLOCKED_MUTATION_COUNT,
      expectedBlockedMutations: IMMUTABILITY_BLOCKED_MUTATION_COUNT,
      allowedLifecycleMutations: IMMUTABILITY_ALLOWED_LIFECYCLE_COUNT,
      expectedAllowedLifecycleMutations: IMMUTABILITY_ALLOWED_LIFECYCLE_COUNT,
      blockerCount: 0,
    },
    triggers: Array.from(
      { length: IMMUTABILITY_TRIGGER_COUNT },
      (_, index) => ({
        tableName: `payroll_table_${index + 1}`,
        triggerName: `payroll_trigger_${index + 1}`,
        present: true,
      }),
    ),
    blockedChecks: Array.from(
      { length: IMMUTABILITY_BLOCKED_MUTATION_COUNT },
      (_, index) => ({ label: `blocked_${index + 1}`, passed: true }),
    ),
    allowedChecks: Array.from(
      { length: IMMUTABILITY_ALLOWED_LIFECYCLE_COUNT },
      (_, index) => ({ label: `allowed_${index + 1}`, passed: true }),
    ),
    blockers: [],
    ...overrides,
  };
}

function completeDocuments() {
  return {
    build: { status: "passed", exitCode: 0, timedOut: false },
    immutability: immutabilityProof(),
    migrationPreflight: {
      summary: { status: "ready", readyCount: 9, checkCount: 9 },
      deployment: { databaseConfigured: true, databaseTargetSafe: true },
      blockers: [],
    },
    migrationHistory: {
      summary: { status: "ready", readyCount: 8, checkCount: 8 },
      database: { targetClass: "remote" },
    },
    secrets: {
      summary: {
        status: "ready",
        releaseEnforced: true,
        readyCount: 8,
        checkCount: 8,
        secretValuePrinted: false,
      },
      blockers: [],
    },
    review: { checks: [{ passed: true }], blockers: [] },
    statutory: {
      summary: { status: "ready" },
      sourceEvidence: {
        hashesVerified: true,
        declaredSourceHashCount: 7,
        validDeclaredSourceHashCount: 7,
        boundDeclaredSourceHashCount: 7,
        approvalArtifactVerified: true,
        expertApprovalComplete: true,
      },
    },
    credential: {},
    operational: {},
    freeze: {
      status: "FROZEN_COMMIT_VERIFIED",
      freezeVerified: true,
      cleanReleaseReady: true,
      sourceTreeClean: true,
      summary: {
        contentMismatches: 0,
        phase2aRuntimeDrift: 0,
        verifiedFiles: 207,
        manifestFiles: 207,
      },
      blockers: [],
    },
    phase2b: {
      eligible: true,
      summary: { passed: 23, checks: 23, blockers: 0 },
      blockers: [],
    },
    phase3: {
      eligible: true,
      recordedPhase3AuthorityPresent: true,
      summary: { passed: 34, checks: 34, blockers: 0 },
      blockers: [],
    },
    external: { summary: { passed: 13, checks: 13, blockers: 0 } },
    intervention: { summary: { humanInterventionRequired: 0 } },
  };
}

function readyEvaluations() {
  return {
    credentialEvaluation: {
      ready: true,
      status: "READY",
      blockerCount: 0,
      blockers: [],
    },
    operationalEvaluation: {
      ready: true,
      status: "READY_FOR_INDEPENDENT_REVIEW",
      blockerCount: 0,
      blockers: [],
    },
  };
}

describe("enterprise release blocker status", () => {
  test("reports 12/12 without authorizing activation", () => {
    const report = buildEnterpriseBlockerStatus(process.cwd(), {
      documents: completeDocuments(),
      ...readyEvaluations(),
    });

    expect(report.status).toBe("READY_FOR_AUTHORIZED_PROMOTION_DECISION");
    expect(report.summary.readyCount).toBe(12);
    expect(Object.values(report.decisions).slice(0, 4)).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(report.decisions.activationAuthorizedByThisGate).toBe(false);
    expect(report.safety.activationAttempted).toBe(false);
    expect(gateResultForReport(report, "fail").exitCode).toBe(0);
  });

  test("fails closed when evidence is missing", () => {
    const report = buildEnterpriseBlockerStatus(
      `${process.cwd()}/definitely-missing-enterprise-evidence-root`,
      {
        ...readyEvaluations(),
      },
    );

    expect(report.status).toBe("BLOCKED");
    expect(report.summary.evidenceErrorCount).toBeGreaterThan(0);
    expect(gateResultForReport(report, "fail").exitCode).toBe(1);
  });

  test("requires remote post-deploy migration history health", () => {
    const documents = completeDocuments();
    documents.migrationHistory.database.targetClass = "local";
    const report = buildEnterpriseBlockerStatus(process.cwd(), {
      documents,
      ...readyEvaluations(),
    });

    expect(report.blockers.find((item) => item.id === "B03")).toMatchObject({
      ready: false,
      status: "BLOCKED_EXTERNAL_CONFIG",
    });
  });

  test("uses newer direct PostgreSQL proof and invalidates a conflicting stale aggregate", () => {
    const documents = completeDocuments();
    const staleProof = immutabilityProof({
      generatedAt: "2026-08-11T12:00:00.000Z",
      status: "blocked",
      summary: {
        ...immutabilityProof().summary,
        presentTriggers: 0,
        blockedMutations: 0,
        blockerCount: 1,
      },
      triggers: immutabilityProof().triggers.map((trigger) => ({
        ...trigger,
        present: false,
      })),
      blockedChecks: immutabilityProof().blockedChecks.map((check) => ({
        ...check,
        passed: false,
      })),
      blockers: [{ area: "stale_fixture", detail: "not verified" }],
    });
    const currentProof = immutabilityProof({
      generatedAt: "2026-08-12T19:21:43.961Z",
    });
    const report = buildEnterpriseBlockerStatus(process.cwd(), {
      documents,
      ...readyEvaluations(),
      immutabilityCandidates: [
        {
          document: staleProof,
          sourcePath:
            "what-next/payroll/payroll-immutability-runtime-check.json",
          sourceKind: "canonical_runtime_proof",
        },
        {
          document: currentProof,
          sourcePath:
            "what-next/payroll/payroll-immutability-runtime-check-run-2.json",
          sourceKind: "direct_isolated_postgresql_proof",
        },
      ],
      priorReleaseAggregate: {
        generatedAt: "2026-08-11T13:31:31.345Z",
        blockers: [{ id: "B02", ready: false, status: "ENGINEERING_BLOCKED" }],
      },
    });

    expect(report.blockers.find((item) => item.id === "B02")).toMatchObject({
      ready: true,
      status: "READY",
    });
    expect(report.evidenceProvenance.immutability).toMatchObject({
      selectedSource:
        "what-next/payroll/payroll-immutability-runtime-check-run-2.json",
      sourceKind: "direct_isolated_postgresql_proof",
      aggregateConflictDetected: true,
      staleAggregateInvalidated: true,
    });
    expect(report.claims.payrollImmutability).toEqual({
      status: "ISOLATED_POSTGRESQL_RUNTIME_CONTROL_VERIFIED",
      scope: "ISOLATED_NON_PRODUCTION_POSTGRESQL_RUNTIME_CONTROL",
      productionDatabaseVerified: false,
      productionReleaseAuthorized: false,
    });
  });

  test("fails closed when the newest direct proof conflicts with an older ready proof", () => {
    const documents = completeDocuments();
    const newestBlockedProof = immutabilityProof({
      generatedAt: "2026-08-13T08:00:00.000Z",
      summary: {
        ...immutabilityProof().summary,
        blockedMutations: 13,
        blockerCount: 1,
      },
      blockedChecks: immutabilityProof().blockedChecks.map((check, index) => ({
        ...check,
        passed: index !== 0,
      })),
      blockers: [{ area: "mutation_not_blocked", detail: "blocked_1" }],
    });
    const report = buildEnterpriseBlockerStatus(process.cwd(), {
      documents,
      ...readyEvaluations(),
      immutabilityCandidates: [
        {
          document: immutabilityProof({
            generatedAt: "2026-08-12T19:21:43.961Z",
          }),
          sourcePath:
            "what-next/payroll/payroll-immutability-runtime-check-run-2.json",
          sourceKind: "direct_isolated_postgresql_proof",
        },
        {
          document: newestBlockedProof,
          sourcePath:
            "what-next/payroll/payroll-immutability-runtime-check-run-3.json",
          sourceKind: "direct_isolated_postgresql_proof",
        },
      ],
    });

    expect(report.blockers.find((item) => item.id === "B02")).toMatchObject({
      ready: false,
      status: "ENGINEERING_BLOCKED",
    });
    expect(
      report.blockers.find((item) => item.id === "B02").blockers,
    ).toContain("proof_forbidden_mutations_not_blocked");
    expect(report.claims.payrollImmutability.status).toBe("NOT_VERIFIED");
    expect(report.status).toBe("BLOCKED");
  });

  test("keeps country and operator production claims fail closed after immutability passes", () => {
    const documents = completeDocuments();
    documents.statutory.sourceEvidence.hashesVerified = false;
    documents.statutory.sourceEvidence.expertApprovalComplete = false;
    const operationalEvaluation = {
      ready: false,
      status: "BLOCKED",
      blockerCount: 2,
      blockers: [
        "approvals:PRODUCT_NOT_APPROVED",
        "owners:ROLLOUT_PRIMARY_INVALID",
      ],
    };
    const report = buildEnterpriseBlockerStatus(process.cwd(), {
      documents,
      credentialEvaluation: readyEvaluations().credentialEvaluation,
      operationalEvaluation,
    });

    expect(report.blockers.find((item) => item.id === "B02").ready).toBe(true);
    expect(report.blockers.find((item) => item.id === "B05").ready).toBe(false);
    expect(report.blockers.find((item) => item.id === "B08").ready).toBe(false);
    expect(report.blockers.find((item) => item.id === "B10").ready).toBe(false);
    expect(report.claims.countryPackProduction.status).toBe("FAIL_CLOSED");
    expect(report.claims.operatorReadiness.status).toBe("FAIL_CLOSED");
    expect(report.claims.overallRelease).toEqual({
      status: "NOT_READY",
      activationAuthorized: false,
    });
    expect(report.decisions.activationAuthorizedByThisGate).toBe(false);
  });

  test("does not infer source hashes or expert approval", () => {
    const documents = completeDocuments();
    documents.statutory.sourceEvidence.hashesVerified = false;
    documents.statutory.sourceEvidence.boundDeclaredSourceHashCount = 0;
    documents.statutory.sourceEvidence.approvalArtifactVerified = false;
    documents.statutory.sourceEvidence.expertApprovalComplete = false;
    const report = buildEnterpriseBlockerStatus(process.cwd(), {
      documents,
      ...readyEvaluations(),
    });

    expect(report.blockers.find((item) => item.id === "B05").ready).toBe(false);
    expect(report.blockers.find((item) => item.id === "B06").ready).toBe(false);
    expect(report.safety.externalAuthorityInferred).toBe(false);
    expect(report.safety.approvalInferred).toBe(false);
  });

  test("keeps freeze and downstream phases blocked when the tree drifts", () => {
    const documents = completeDocuments();
    documents.freeze.status = "BLOCKED";
    documents.freeze.sourceTreeClean = false;
    documents.freeze.summary.phase2aRuntimeDrift = 2;
    const operationalEvaluation = {
      ready: false,
      status: "BLOCKED",
      blockerCount: 2,
      blockers: ["approvals:product_missing", "owners:security_missing"],
    };
    const report = buildEnterpriseBlockerStatus(process.cwd(), {
      documents,
      credentialEvaluation: readyEvaluations().credentialEvaluation,
      operationalEvaluation,
    });

    expect(report.blockers.find((item) => item.id === "B09").ready).toBe(false);
    expect(report.blockers.find((item) => item.id === "B10").ready).toBe(false);
    expect(report.decisions.readyToRequestGate017).toBe(false);
  });

  test("rejects a non-canonical ready freeze status", () => {
    const documents = completeDocuments();
    documents.freeze.status = "READY";
    const report = buildEnterpriseBlockerStatus(process.cwd(), {
      documents,
      ...readyEvaluations(),
    });

    expect(report.blockers.find((item) => item.id === "B09").ready).toBe(false);
    expect(report.decisions.readyToRequestGate017).toBe(false);
  });

  test("renders facts but never source documents or secret values", () => {
    const documents = completeDocuments();
    documents.secrets.fixtureSecret = "DO_NOT_PRINT_THIS_SECRET";
    documents.migrationPreflight.databaseUrl =
      "postgresql://private-user:private-password@example.invalid/db";
    const report = buildEnterpriseBlockerStatus(process.cwd(), {
      documents,
      ...readyEvaluations(),
    });
    const markdown = renderMarkdown(report);

    expect(markdown).not.toContain("DO_NOT_PRINT_THIS_SECRET");
    expect(markdown).not.toContain("private-password");
    expect(markdown).toContain("Secret values printed: no");
  });
});
