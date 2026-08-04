const {
  buildEnterpriseBlockerStatus,
  gateResultForReport,
  renderMarkdown,
} = require("../enterprise-release-blocker-status");

function completeDocuments() {
  return {
    build: { status: "passed", exitCode: 0, timedOut: false },
    immutability: {
      status: "ready",
      summary: {
        presentTriggers: 9,
        requiredTriggers: 9,
        blockedMutations: 14,
        allowedLifecycleMutations: 3,
        blockerCount: 0,
      },
    },
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

