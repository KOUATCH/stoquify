const template = require("../../docs/blockers/enterprise-release-external-evidence-intake-2026-07-27.json");
const {
  EXPECTED_SECRET_NAMES,
  evaluateEnterpriseExternalIntake,
  renderMarkdown,
} = require("../enterprise-release-external-evidence-intake");

const NOW = new Date("2026-07-27T18:00:00.000Z");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function authoritativeStatus(overrides = {}) {
  return {
    blockers: ["B03", "B04", "B05", "B06", "B07", "B08"].map((id) => ({
      id,
      ready: overrides[id]?.ready ?? true,
      status: overrides[id]?.status ?? "READY",
      blockers: overrides[id]?.blockers ?? [],
    })),
  };
}

function owner(slug) {
  return {
    ownerDirectoryId: `directory://people/${slug}`,
    acceptanceReference: `approval://workstreams/${slug}/2026-07-27`,
    acceptedAt: "2026-07-27T16:00:00.000Z",
  };
}

function completeInput() {
  const input = clone(template);
  input.database = {
    owner: owner("database-owner"),
    targetAttestationReference: "evidence://database/target/production",
    managedDatabaseReference: "provider://database/stoquify-production",
    migrationIdentityReference: "identity://workloads/migration-runner",
    runtimeIdentityReference: "identity://workloads/application-runtime",
    backupReference: "evidence://database/backups/2026-07-27",
    restoreTestReference: "evidence://database/restore-tests/2026-07-27",
    changeReference: "change://platform/2026-07-27-database",
    migrationExecutionReference: "execution://migrations/2026-07-27",
  };
  input.managedSecrets.owner = owner("security-platform-owner");
  input.managedSecrets.entries = EXPECTED_SECRET_NAMES.map((name, index) => ({
    name,
    managedSecretReference: `secret-manager://production/stoquify/purpose-${index + 1}`,
    versionReference: `version://secret-manager/stoquify/purpose-${index + 1}/2026-07-27`,
    operatorDirectoryId: `directory://people/security-operator-${index + 1}`,
    activatedAt: `2026-07-27T16:0${index}:00.000Z`,
    changeReference: `change://security/release-secret-${index + 1}`,
  }));
  input.managedSecrets.deploymentReference =
    "deployment://production/stoquify/2026-07-27";
  input.managedSecrets.redactedGateEvidenceReference =
    "evidence://release-secret-preflight/2026-07-27";
  input.statutory = {
    owner: owner("compliance-legal-owner"),
    reviewPackageReference:
      "repository://docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package",
    reviewerDirectoryId: "directory://people/cameroon-payroll-reviewer",
    checkerDirectoryId: "directory://people/statutory-checker",
    reviewerAppointmentReference: "appointment://statutory/reviewer/2026-07-27",
    checkerAppointmentReference: "appointment://statutory/checker/2026-07-27",
    qualificationReference: "qualification://payroll/cameroon/current",
    conflictDeclarationReference: "declaration://conflicts/reviewer/2026-07-27",
    sourceHashVerificationReference:
      "evidence://statutory/source-hashes/2026-07-27",
    fixtureTieOutReference: "evidence://statutory/tie-outs/2026-07-27",
    signedApprovalArtifactReference: "artifact://statutory/approval/2026-07-27",
    signatureValidationReference: "evidence://signature-validation/2026-07-27",
    checkerVerificationReference: "evidence://checker-verification/2026-07-27",
    runtimeAuthorityPromotionReference:
      "change://statutory/runtime-authority/2026-07-27",
    reviewedAt: "2026-07-27T17:00:00.000Z",
  };
  input.credentialRotation = {
    owner: owner("credential-rotation-owner"),
    securityAuthorityDirectoryId: "directory://people/security-authority",
    serviceOwnerRosterReference: "roster://service-owners/production",
    credentialInventoryReference: "inventory://credentials/production",
    rotationExecutionReference: "execution://credential-rotation/2026-07-27",
    oldVersionRejectionReference: "evidence://credential-rejection/2026-07-27",
    securityApprovalReference:
      "approval://security/credential-rotation/2026-07-27",
  };
  input.operations = {
    owner: owner("release-operations-owner"),
    releaseManagerDirectoryId: "directory://people/release-manager",
    operationalOwnerRosterReference: "roster://operations/production",
    protectedCiReference: "evidence://ci/protected-release/2026-07-27",
    schedulerDeploymentReference:
      "deployment://scheduler/production/2026-07-27",
    schedulerWindowEvidenceReference: "evidence://scheduler/windows/2026-07-27",
    invalidAuthRejectionReference:
      "evidence://scheduler/invalid-auth/2026-07-27",
    alertLifecycleEvidenceReference: "evidence://alerts/lifecycle/2026-07-27",
    independentReviewReference: "review://operations/independent/2026-07-27",
    activationAuthorized: false,
  };
  return input;
}

describe("enterprise release external evidence intake", () => {
  test("accepts complete redacted references only when B03-B08 authoritative gates are ready", () => {
    const result = evaluateEnterpriseExternalIntake(completeInput(), {
      now: NOW,
      authoritativeStatus: authoritativeStatus(),
    });

    expect(result.ready).toBe(true);
    expect(result.summary.passed).toBe(6);
    expect(result.decisions.authoritativePromotionApproved).toBe(false);
    expect(result.decisions.activationAuthorized).toBe(false);
    expect(result.handling.secretValuesAccepted).toBe(false);
    expect(result.handling.databaseUrlAccepted).toBe(false);
  });

  test("turns the empty intake into a deterministic owner handoff", () => {
    const result = evaluateEnterpriseExternalIntake(clone(template), {
      now: NOW,
      authoritativeStatus: authoritativeStatus({
        B03: {
          ready: false,
          status: "BLOCKED_EXTERNAL_CONFIG",
          blockers: ["database_url_missing"],
        },
      }),
    });

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.id === "SAFETY").ready).toBe(
      true,
    );
    expect(result.checks.find((check) => check.id === "B03").blockers).toEqual(
      expect.arrayContaining([
        "DATABASE_OWNER_IDENTITY_INVALID",
        "AUTHORITATIVE_B03_BLOCKED_EXTERNAL_CONFIG",
      ]),
    );
  });

  test("rejects secret-bearing fields before evaluating readiness", () => {
    const input = completeInput();
    input.managedSecrets.entries[0].secretValue = "must-not-be-accepted";

    expect(() =>
      evaluateEnterpriseExternalIntake(input, {
        now: NOW,
        authoritativeStatus: authoritativeStatus(),
      }),
    ).toThrow("forbidden secret-bearing field");
  });

  test("requires distinct real reviewer and checker identities", () => {
    const input = completeInput();
    input.statutory.reviewerDirectoryId =
      "directory://people/placeholder-reviewer";
    input.statutory.checkerDirectoryId =
      "directory://people/placeholder-reviewer";
    const result = evaluateEnterpriseExternalIntake(input, {
      now: NOW,
      authoritativeStatus: authoritativeStatus(),
    });
    const check = result.checks.find((item) => item.id === "B05_B06");

    expect(check.blockers).toEqual(
      expect.arrayContaining([
        "STATUTORY_REVIEWER_IDENTITY_INVALID",
        "STATUTORY_CHECKER_IDENTITY_INVALID",
      ]),
    );
  });

  test("requires three distinct managed secret and version references", () => {
    const input = completeInput();
    input.managedSecrets.entries[1].managedSecretReference =
      input.managedSecrets.entries[0].managedSecretReference;
    input.managedSecrets.entries[1].versionReference =
      input.managedSecrets.entries[0].versionReference;
    const result = evaluateEnterpriseExternalIntake(input, {
      now: NOW,
      authoritativeStatus: authoritativeStatus(),
    });
    const check = result.checks.find((item) => item.id === "B04");

    expect(check.blockers).toEqual(
      expect.arrayContaining([
        "MANAGED_SECRET_REFERENCES_MUST_BE_DISTINCT",
        "SECRET_VERSION_REFERENCES_MUST_BE_DISTINCT",
      ]),
    );
  });

  test("renders exact workstream status without granting promotion", () => {
    const result = evaluateEnterpriseExternalIntake(completeInput(), {
      now: NOW,
      authoritativeStatus: authoritativeStatus(),
    });
    const markdown = renderMarkdown(result);

    expect(markdown).toContain("Authoritative B03-B08 snapshot");
    expect(markdown).toContain("Activation authorized by this validator:** No");
    expect(markdown).toContain("authoritative release-gate reruns");
  });
});
