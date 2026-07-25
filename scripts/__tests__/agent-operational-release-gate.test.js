const {
  READY_STATUS,
  REQUIRED_OWNER_ROLES,
  evaluateOperationalReleaseRegister,
  renderMarkdown,
  sha256Prefixed,
} = require("../agent-operational-release-gate");

const NOW = new Date("2026-07-25T12:30:00.000Z");
const COMMIT_SHA = "a".repeat(40);
const ARTIFACT_DIGEST = `sha256:${"1".repeat(64)}`;
const MANIFEST_HASH = `sha256:${"2".repeat(64)}`;
const EVIDENCE_HASH = `sha256:${"3".repeat(64)}`;
const BROWSER_HASH = `sha256:${"4".repeat(64)}`;
const CI_EVIDENCE_HASH = `sha256:${"6".repeat(64)}`;
const CREDENTIAL_EVIDENCE_HASH = `sha256:${"b".repeat(64)}`;

describe("agent operational release gate", () => {
  it("accepts a fully bound package only for independent review", () => {
    const fixture = completeFixture();

    const result = evaluateOperationalReleaseRegister(fixture.register, {
      now: NOW,
      credentialRegister: fixture.credentialRegister,
      credentialRegisterSha256: fixture.credentialRegisterSha256,
    });

    expect(result).toEqual(
      expect.objectContaining({
        ready: true,
        status: READY_STATUS,
        blockerCount: 0,
        activationAuthorized: false,
        secretValuesPrinted: false,
        ownerRolesPresent: 6,
        successfulSchedulerWindows: 3,
      }),
    );
  });

  it("fails closed when real operational evidence is unresolved", () => {
    const fixture = completeFixture();
    fixture.register.declaredStatus = "BLOCKED";
    fixture.register.ci.status = "PENDING";
    fixture.register.scheduler.readinessStatus = "PENDING";

    const result = evaluateOperationalReleaseRegister(fixture.register, {
      now: NOW,
      credentialRegister: fixture.credentialRegister,
      credentialRegisterSha256: fixture.credentialRegisterSha256,
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "ci:STATUS_NOT_PASSED",
        "scheduler:READINESS_NOT_HEALTHY",
      ]),
    );
    expect(result.activationAuthorized).toBe(false);
  });

  it("rejects secret values and raw request payloads structurally", () => {
    const fixture = completeFixture();
    fixture.register.alerting.secretValue = "must-never-be-stored";

    expect(() =>
      evaluateOperationalReleaseRegister(fixture.register, {
        now: NOW,
        credentialRegister: fixture.credentialRegister,
        credentialRegisterSha256: fixture.credentialRegisterSha256,
      }),
    ).toThrow("forbidden value field");
  });

  it("rejects a raw value placed in a managed-reference field", () => {
    const fixture = completeFixture();
    fixture.register.alerting.managedSecretReference = "must-never-be-stored";

    const result = evaluateFixture(fixture);

    expect(result.blockers).toContain(
      "alerting:MANAGED_SECRET_REFERENCE_INVALID",
    );
  });

  it("rejects commit, artifact, and browser-report drift", () => {
    const fixture = completeFixture();
    fixture.register.ci.commitSha = "b".repeat(40);
    fixture.register.ci.artifactDigest = `sha256:${"5".repeat(64)}`;
    fixture.register.ci.browserReportHash = `sha256:${"6".repeat(64)}`;

    const result = evaluateFixture(fixture);

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "ci:COMMIT_SHA_RELEASE_MISMATCH",
        "ci:ARTIFACT_DIGEST_RELEASE_MISMATCH",
        "ci:BROWSER_REPORT_HASH_RELEASE_MISMATCH",
      ]),
    );
  });

  it("requires certified-package proof", () => {
    const fixture = completeFixture();
    fixture.register.release.packageCertificationReference = null;
    fixture.register.release.packageCertificationHash = null;

    const result = evaluateFixture(fixture);

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "release:PACKAGE_CERTIFICATION_REFERENCE_MISSING",
        "release:PACKAGE_CERTIFICATION_HASH_INVALID",
      ]),
    );
  });

  it("requires CI and release evidence to share a capture hash", () => {
    const fixture = completeFixture();
    fixture.register.release.ciEvidenceSha256 = null;
    fixture.register.ci.evidenceSha256 = null;

    const result = evaluateFixture(fixture);

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "release:CI_EVIDENCE_HASH_INVALID",
        "ci:EVIDENCE_HASH_INVALID",
      ]),
    );
  });

  it("rejects stale CI completion and attestation evidence", () => {
    const fixture = completeFixture();
    fixture.register.ci.completedAt = "2026-07-23T11:30:00.000Z";
    fixture.register.ci.attestedAt = "2026-07-23T11:35:00.000Z";

    const result = evaluateFixture(fixture);

    expect(result.blockers).toEqual(
      expect.arrayContaining(["ci:COMPLETION_STALE", "ci:ATTESTATION_STALE"]),
    );
  });

  it("requires authoritative governance evidence to be hash-bound", () => {
    const fixture = completeFixture();
    fixture.register.governance.evidenceSha256 = null;

    const result = evaluateFixture(fixture);

    expect(result.blockers).toContain("governance:EVIDENCE_HASH_INVALID");
  });

  it("rejects stale governance attestations", () => {
    const fixture = completeFixture();
    fixture.register.governance.attestedAt = "2026-07-23T12:00:00.000Z";

    const result = evaluateFixture(fixture);

    expect(result.blockers).toContain("governance:ATTESTATION_STALE");
  });

  it("rejects governance evidence bound to another release", () => {
    const fixture = completeFixture();
    fixture.register.governance.packageId = "package-other";

    const result = evaluateFixture(fixture);

    expect(result.blockers).toContain("governance:PACKAGE_ID_RELEASE_MISMATCH");
  });

  it("requires distinct real product and security identities", () => {
    const fixture = completeFixture();
    fixture.register.approvals.product.actorDirectoryId =
      "directory://e2e-product";
    fixture.register.approvals.security.actorDirectoryId =
      "directory://e2e-product";

    const result = evaluateFixture(fixture);

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "approvals:PRODUCT_ACTOR_INVALID",
        "approvals:SECURITY_ACTOR_INVALID",
        "approvals:PRODUCT_SECURITY_ACTORS_NOT_DISTINCT",
      ]),
    );
  });

  it("blocks expired owner coverage", () => {
    const fixture = completeFixture();
    fixture.register.owners[0].coverageEndsAt = "2026-07-25T12:20:00.000Z";

    const result = evaluateFixture(fixture);

    expect(result.blockers).toContain("owners:ROLLOUT_EXPIRED");
  });

  it("requires three consecutive five-minute scheduler windows", () => {
    const fixture = completeFixture();
    fixture.register.scheduler.windows[2].scheduledAt =
      "2026-07-25T12:27:00.000Z";

    const result = evaluateFixture(fixture);

    expect(result.blockers).toContain("scheduler:FIVE_MINUTE_CADENCE_INVALID");
  });

  it("requires the readiness evidence file to be hash-bound", () => {
    const fixture = completeFixture();
    fixture.register.scheduler.readinessEvidenceSha256 = null;

    const result = evaluateFixture(fixture);

    expect(result.blockers).toContain(
      "scheduler:READINESS_EVIDENCE_HASH_INVALID",
    );
  });

  it("requires fresh, hash-bound scheduler deployment authority evidence", () => {
    const fixture = completeFixture();
    fixture.register.scheduler.deploymentEvidenceSha256 = null;
    fixture.register.scheduler.deploymentAttestedAt =
      "2026-07-23T12:00:00.000Z";

    const result = evaluateFixture(fixture);

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "scheduler:DEPLOYMENT_EVIDENCE_HASH_INVALID",
        "scheduler:DEPLOYMENT_ATTESTATION_STALE",
      ]),
    );
  });

  it("requires alert acknowledgement within the declared SLO", () => {
    const fixture = completeFixture();
    fixture.register.alerting.acknowledgedAt = "2026-07-25T12:20:00.000Z";

    const result = evaluateFixture(fixture);

    expect(result.blockers).toContain("alerting:ACKNOWLEDGEMENT_OUTSIDE_SLO");
  });

  it("rejects alert delivery evidence older than 24 hours", () => {
    const fixture = completeFixture();
    fixture.register.alerting.deliveredAt = "2026-07-23T12:00:00.000Z";

    const result = evaluateFixture(fixture);

    expect(result.blockers).toContain("alerting:DELIVERY_EVIDENCE_STALE");
  });

  it("requires the alert evidence capture to be hash-bound", () => {
    const fixture = completeFixture();
    fixture.register.alerting.evidenceSha256 = null;

    const result = evaluateFixture(fixture);

    expect(result.blockers).toContain("alerting:EVIDENCE_HASH_INVALID");
  });

  it("cross-checks the independent credential-rotation gate", () => {
    const fixture = completeFixture();
    fixture.credentialRegister.declaredStatus = "BLOCKED";
    fixture.credentialRegister.entries[0].disposition = "UNRESOLVED";
    fixture.credentialRegister.entries[0].rotationEvidence = {};

    const result = evaluateFixture(fixture);

    expect(result.blockers).toContain(
      "credentialRotation:CREDENTIAL_REGISTER_BLOCKED",
    );
  });

  it("never accepts activation fields in the evidence register", () => {
    const fixture = completeFixture();
    fixture.register.activation.requested = true;
    fixture.register.activation.authorized = true;
    fixture.register.activation.activatedAt = "2026-07-25T12:00:00.000Z";

    const result = evaluateFixture(fixture);

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "activation:REQUESTED_MUST_REMAIN_FALSE",
        "activation:AUTHORIZED_MUST_REMAIN_FALSE",
        "activation:ACTIVATED_AT_MUST_REMAIN_NULL",
      ]),
    );
    expect(result.activationAuthorized).toBe(false);
  });

  it("renders a value-free decision that keeps activation separate", () => {
    const fixture = completeFixture();
    const result = evaluateFixture(fixture);
    const markdown = renderMarkdown(fixture.register, result);

    expect(markdown).toContain("READY_FOR_INDEPENDENT_REVIEW");
    expect(markdown).toContain("Activation authorized:** No");
    expect(markdown).toContain("separate protected ceremony");
    expect(markdown).not.toContain("must-never-be-stored");
  });
});

function evaluateFixture(fixture) {
  return evaluateOperationalReleaseRegister(fixture.register, {
    now: NOW,
    credentialRegister: fixture.credentialRegister,
    credentialRegisterSha256: sha256Prefixed(
      Buffer.from(JSON.stringify(fixture.credentialRegister)),
    ),
  });
}

function completeFixture() {
  const credentialRegister = completeCredentialRegister();
  const credentialRegisterSha256 = sha256Prefixed(
    Buffer.from(JSON.stringify(credentialRegister)),
  );
  const owners = REQUIRED_OWNER_ROLES.map((role) => ({
    role,
    primaryDirectoryId: `directory://person/${role.toLowerCase()}/primary`,
    backupDirectoryId: `directory://person/${role.toLowerCase()}/backup`,
    acceptedRunbookVersion: "agent-pilot-runbook-v1",
    acceptedAt: "2026-07-25T11:00:00.000Z",
    coverageStartsAt: "2026-07-25T10:00:00.000Z",
    coverageEndsAt: "2026-07-25T18:00:00.000Z",
    escalationReference: `evidence://owners/${role.toLowerCase()}`,
  }));
  return {
    credentialRegister,
    credentialRegisterSha256,
    register: {
      schemaVersion: 1,
      registerId: "operational-release-test",
      declaredStatus: READY_STATUS,
      release: {
        environment: "INTERNAL_PILOT",
        packageId: "package-123",
        releaseVersion: "release-1",
        packageState: "PILOT_CERTIFIED",
        commitSha: COMMIT_SHA,
        artifactDigest: ARTIFACT_DIGEST,
        artifactReference: "artifact://stoquify/release-1",
        deploymentReference: "deployment://internal-pilot/release-1",
        packageCertificationReference:
          "certification://agent-runtime/package-123",
        packageCertificationHash: `sha256:${"5".repeat(64)}`,
        manifestHash: MANIFEST_HASH,
        evidenceBundleHash: EVIDENCE_HASH,
        browserReportHash: BROWSER_HASH,
        pilotAllowlistReference: "policy://pilot/tenants/v1",
        roleAllowlistReference: "policy://pilot/roles/v1",
        ciEvidenceSha256: CI_EVIDENCE_HASH,
        activatedAt: null,
      },
      ci: {
        status: "PASSED",
        sourceTreeClean: true,
        commitSha: COMMIT_SHA,
        branchReference: "git://stoquify/codex-agent-pilot",
        runReference: "ci://stoquify/runs/123",
        artifactDigest: ARTIFACT_DIGEST,
        artifactReference: "artifact://stoquify/release-1",
        browserReportHash: BROWSER_HASH,
        completedAt: "2026-07-25T11:30:00.000Z",
        sourceSystemReference: "ci-system://stoquify/internal-pilot",
        attestationReference: "attestation://agent-runtime/ci/release-1",
        attestationDigest: `sha256:${"7".repeat(64)}`,
        attestedAt: "2026-07-25T11:35:00.000Z",
        evidenceSha256: CI_EVIDENCE_HASH,
        invalidAuthEvidenceReference:
          "evidence://agent-ci-release/invalid-auth-401",
      },
      governance: {
        environment: "INTERNAL_PILOT",
        sourceSystemReference: "identity-governance://stoquify/internal-pilot",
        attestationReference:
          "attestation://agent-runtime/governance/release-1",
        attestationDigest: `sha256:${"9".repeat(64)}`,
        attestedAt: "2026-07-25T12:20:00.000Z",
        evidenceSha256: `sha256:${"a".repeat(64)}`,
        invalidAuthEvidenceReference:
          "evidence://agent-governance/invalid-auth-401",
        packageId: "package-123",
        releaseVersion: "release-1",
        commitSha: COMMIT_SHA,
        artifactDigest: ARTIFACT_DIGEST,
        manifestHash: MANIFEST_HASH,
        evidenceBundleHash: EVIDENCE_HASH,
      },
      approvals: {
        product: completeApproval("product"),
        security: completeApproval("security"),
      },
      owners,
      scheduler: {
        provider: "managed-scheduler",
        scheduleReference: "scheduler://internal-pilot/reconciler",
        workloadReference: "workload://internal-pilot/stoquify",
        authType: "MANAGED_SECRET",
        managedCredentialReference: "secret-manager://reconciler/current",
        intervalMinutes: 5,
        singleConcurrency: true,
        leaseSafe: true,
        concurrencyEvidenceReference: "evidence://scheduler/single-concurrency",
        timeoutMs: 120000,
        deployedCommitSha: COMMIT_SHA,
        deployedArtifactDigest: ARTIFACT_DIGEST,
        deployedAt: "2026-07-25T11:00:00.000Z",
        deploymentSourceSystemReference:
          "scheduler-control-plane://internal-pilot/provider",
        deploymentAttestationReference:
          "attestation://agent-runtime/scheduler/release-1",
        deploymentAttestationDigest: `sha256:${"c".repeat(64)}`,
        deploymentAttestedAt: "2026-07-25T11:30:00.000Z",
        deploymentEvidenceSha256: `sha256:${"d".repeat(64)}`,
        deploymentAuthorityInvalidAuthEvidenceReference:
          "evidence://agent-scheduler-deployment/invalid-auth-401",
        readinessStatus: "HEALTHY",
        readinessCheckedAt: "2026-07-25T12:25:30.000Z",
        readinessEvidenceReference: "evidence://scheduler/readiness",
        readinessEvidenceSha256: `sha256:${"7".repeat(64)}`,
        heartbeatFreshUntil: "2026-07-25T12:35:00.000Z",
        invalidAuthEvidenceReference: "evidence://scheduler/invalid-auth-401",
        missingConfigEvidenceReference:
          "evidence://scheduler/missing-config-503",
        failureAlertReference: "alert://scheduler/failure-policy",
        windows: [
          schedulerWindow("one", "12:15:00", "12:15:20"),
          schedulerWindow("two", "12:20:00", "12:20:20"),
          schedulerWindow("three", "12:25:00", "12:25:20"),
        ],
      },
      alerting: {
        transportStatus: "HEALTHY",
        evidenceSha256: `sha256:${"8".repeat(64)}`,
        transportReference: "alert-transport://internal-pilot/webhook",
        managedSecretReference: "secret-manager://alerts/current",
        httpsDeliveryReference: "evidence://alerts/https-delivery",
        externalRequestReference: "external-request://alerts/123",
        deliveredAt: "2026-07-25T12:00:00.000Z",
        acknowledgementSloMinutes: 15,
        acknowledgedAt: "2026-07-25T12:05:00.000Z",
        acknowledgedByDirectoryId: owners.find(
          (owner) => owner.role === "SECURITY_INCIDENT",
        ).primaryDirectoryId,
        acknowledgementReference: "evidence://alerts/acknowledgement",
        retryEvidenceReference: "evidence://alerts/retry",
        deadLetterEvidenceReference: "evidence://alerts/dead-letter",
        recoveryEvidenceReference: "evidence://alerts/recovery",
        escalationTestedAt: "2026-07-25T12:10:00.000Z",
        escalatedToDirectoryId: owners.find(
          (owner) => owner.role === "ON_CALL_BACKUP",
        ).primaryDirectoryId,
        escalationEvidenceReference: "evidence://alerts/escalation",
        secretRotationEvidenceReference: "evidence://alerts/secret-rotation",
      },
      credentialRotation: {
        registerReference:
          "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json",
        registerSha256: credentialRegisterSha256,
        securityApprovalReference: "approval://security/rotation-123",
        evidenceSha256: CREDENTIAL_EVIDENCE_HASH,
        attestationReference: "attestation://security/credential-rotation-123",
      },
      activation: {
        requested: false,
        authorized: false,
        activatedAt: null,
      },
    },
  };
}

function completeApproval(kind) {
  return {
    decision: "APPROVED",
    actorDirectoryId: `directory://person/${kind}-approver`,
    approvalReference: `approval://${kind}/123`,
    decidedAt: "2026-07-25T11:45:00.000Z",
    expiresAt: "2026-07-25T18:00:00.000Z",
    manifestHash: MANIFEST_HASH,
    artifactDigest: ARTIFACT_DIGEST,
    evidenceBundleHash: EVIDENCE_HASH,
  };
}

function schedulerWindow(id, scheduledTime, completedTime) {
  return {
    runId: `scheduler-run-${id}`,
    scheduledAt: `2026-07-25T${scheduledTime}.000Z`,
    completedAt: `2026-07-25T${completedTime}.000Z`,
    status: "COMPLETED",
    evidenceReference: `evidence://scheduler/window-${id}`,
  };
}

function completeCredentialRegister() {
  return {
    schemaVersion: 1,
    registerId: "credential-rotation-test",
    incidentReference: "incident://security/123",
    declaredStatus: "READY",
    securityOwnerDirectoryId: "directory://person/security-owner",
    securityApprovalReference: "approval://security/rotation-123",
    authority: {
      environment: "INTERNAL_PILOT",
      sourceSystemReference: "security-system://stoquify/credential-rotation",
      attestationReference: "attestation://security/credential-rotation-123",
      attestationDigest: `sha256:${"c".repeat(64)}`,
      attestedAt: "2026-07-25T12:00:00.000Z",
      evidenceSha256: CREDENTIAL_EVIDENCE_HASH,
      invalidAuthEvidenceReference:
        "evidence://credential-rotation/invalid-auth-401",
    },
    releaseBinding: {
      environment: "INTERNAL_PILOT",
      packageId: "package-123",
      releaseVersion: "release-1",
      packageState: "PILOT_CERTIFIED",
      commitSha: COMMIT_SHA,
      artifactDigest: ARTIFACT_DIGEST,
      deploymentReference: "deployment://internal-pilot/release-1",
      activatedAt: null,
    },
    entries: [
      {
        id: "reconciler",
        purpose: "Reconciler authentication",
        environmentVariables: ["STOQUIFY_AGENT_RECONCILER_SECRET"],
        dependentWorkloads: ["stoquify-web", "agent-reconciler"],
        disposition: "ROTATED_AND_REVOKED",
        rotationEvidence: {
          secretManagerReference: "secret-manager://reconciler/current",
          rotationOwnerDirectoryId: "directory://person/security-owner",
          rotationStartedAt: "2026-07-25T08:00:00.000Z",
          newVersionActivatedAt: "2026-07-25T08:10:00.000Z",
          dependentWorkloadsRestartedAt: "2026-07-25T08:20:00.000Z",
          newVersionVerifiedAt: "2026-07-25T08:30:00.000Z",
          oldVersionRevokedAt: "2026-07-25T08:40:00.000Z",
          oldVersionRejectedAt: "2026-07-25T08:50:00.000Z",
          evidenceReference: "evidence://rotation/reconciler",
          securityApprovalReference: "approval://security/rotation-123",
          reviewedAt: "2026-07-25T09:00:00.000Z",
        },
      },
    ],
  };
}
