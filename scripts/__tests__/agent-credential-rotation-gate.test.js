const {
  evaluateRotationRegister,
  renderMarkdown,
} = require("../agent-credential-rotation-gate");

const NOW = new Date("2026-07-25T13:30:30.000Z");
const COMMIT_SHA = "a".repeat(40);
const ARTIFACT_DIGEST = `sha256:${"1".repeat(64)}`;

describe("agent credential rotation gate", () => {
  it("fails closed while security classification is unresolved", () => {
    const register = sampleRegister();

    const result = evaluateRotationRegister(register, { now: NOW });

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "credential-one:SECURITY_CLASSIFICATION_UNRESOLVED",
        "register:SECURITY_OWNER_MISSING",
        "register:SECURITY_APPROVAL_REFERENCE_MISSING",
      ]),
    );
    expect(result.secretValuesPrinted).toBe(false);
  });

  it("accepts complete rotation, revocation, restart, and rejection evidence", () => {
    const register = sampleRegister();
    register.declaredStatus = "READY";
    register.securityOwnerDirectoryId = "directory://security-owner";
    register.securityApprovalReference = "approval://security/123";
    register.entries[0].disposition = "ROTATED_AND_REVOKED";
    register.entries[0].rotationEvidence = completeRotationEvidence();

    const result = evaluateRotationRegister(register, { now: NOW });

    expect(result).toEqual(
      expect.objectContaining({
        ready: true,
        status: "READY",
        blockerCount: 0,
        secretValuesPrinted: false,
      }),
    );
  });

  it("requires evidence even when security confirms a test-only credential", () => {
    const register = sampleRegister();
    register.entries[0].disposition = "TEST_ONLY_CONFIRMED";

    const result = evaluateRotationRegister(register, { now: NOW });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain(
      "credential-one:EVIDENCE_EVIDENCEREFERENCE_MISSING",
    );
  });

  it("rejects credential values and raw environment snapshots structurally", () => {
    const register = sampleRegister();
    register.entries[0].rotationEvidence.secretValue = "must-never-be-stored";

    expect(() => evaluateRotationRegister(register, { now: NOW })).toThrow(
      "forbidden value field",
    );
  });

  it("rejects synthetic owners and raw values in evidence-reference fields", () => {
    const register = sampleRegister();
    register.declaredStatus = "READY";
    register.securityOwnerDirectoryId = "directory://test-security";
    register.securityApprovalReference = "approval://security/123";
    register.entries[0].disposition = "ROTATED_AND_REVOKED";
    register.entries[0].rotationEvidence = {
      ...completeRotationEvidence(),
      rotationOwnerDirectoryId: "directory://e2e-security",
      evidenceReference: "raw-evidence-value",
      secretManagerReference: "raw-secret-value",
    };

    const result = evaluateRotationRegister(register, { now: NOW });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "register:SECURITY_OWNER_INVALID",
        "credential-one:EVIDENCE_ROTATIONOWNERDIRECTORYID_INVALID",
        "credential-one:EVIDENCE_EVIDENCEREFERENCE_INVALID",
        "credential-one:EVIDENCE_SECRETMANAGERREFERENCE_INVALID",
      ]),
    );
  });

  it("rejects out-of-order rotation timestamps", () => {
    const register = sampleRegister();
    register.declaredStatus = "READY";
    register.securityOwnerDirectoryId = "directory://security-owner";
    register.securityApprovalReference = "approval://security/123";
    register.entries[0].disposition = "ROTATED_AND_REVOKED";
    register.entries[0].rotationEvidence = {
      ...completeRotationEvidence(),
      oldVersionRevokedAt: "2026-07-25T09:00:00.000Z",
      newVersionVerifiedAt: "2026-07-25T10:00:00.000Z",
    };

    const result = evaluateRotationRegister(register, { now: NOW });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain(
      "credential-one:EVIDENCE_TIMESTAMP_ORDER_INVALID",
    );
  });

  it("renders only credential names, disposition, and blocker references", () => {
    const register = sampleRegister();
    const markdown = renderMarkdown(
      register,
      evaluateRotationRegister(register, { now: NOW }),
    );

    expect(markdown).toContain("Credential response remains blocked");
    expect(markdown).toContain("SECRET_ONE");
    expect(markdown).not.toContain("must-never-be-stored");
  });

  it("rejects stale authority evidence and frozen-release drift", () => {
    const register = sampleRegister();
    register.declaredStatus = "READY";
    register.securityOwnerDirectoryId = "directory://security-owner";
    register.securityApprovalReference = "approval://security/123";
    register.entries[0].disposition = "ROTATED_AND_REVOKED";
    register.entries[0].rotationEvidence = completeRotationEvidence();
    register.authority.attestedAt = "2026-07-23T13:25:00.000Z";

    const result = evaluateRotationRegister(register, {
      now: NOW,
      expectedRelease: {
        ...register.releaseBinding,
        commitSha: "b".repeat(40),
      },
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "authority:ATTESTED_AT_INVALID_OR_STALE",
        "releaseBinding:COMMIT_SHA_MISMATCH",
      ]),
    );
  });
});

function sampleRegister() {
  return {
    schemaVersion: 1,
    registerId: "rotation-register-test",
    incidentReference: "incident-test",
    declaredStatus: "BLOCKED",
    securityOwnerDirectoryId: null,
    securityApprovalReference: null,
    authority: {
      environment: "INTERNAL_PILOT",
      sourceSystemReference: "security-system://stoquify/credential-rotation",
      attestationReference: "attestation://security/credential-rotation-123",
      attestationDigest: `sha256:${"8".repeat(64)}`,
      attestedAt: "2026-07-25T13:25:00.000Z",
      evidenceSha256: `sha256:${"9".repeat(64)}`,
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
        id: "credential-one",
        purpose: "Test credential class",
        environmentVariables: ["SECRET_ONE"],
        dependentWorkloads: ["worker-one"],
        disposition: "UNRESOLVED",
        rotationEvidence: {},
      },
    ],
  };
}

function completeRotationEvidence() {
  return {
    secretManagerReference: "secret-manager://credential-one/version/new",
    rotationOwnerDirectoryId: "directory://security-owner",
    rotationStartedAt: "2026-07-25T08:00:00.000Z",
    newVersionActivatedAt: "2026-07-25T08:10:00.000Z",
    dependentWorkloadsRestartedAt: "2026-07-25T08:20:00.000Z",
    newVersionVerifiedAt: "2026-07-25T08:30:00.000Z",
    oldVersionRevokedAt: "2026-07-25T08:40:00.000Z",
    oldVersionRejectedAt: "2026-07-25T08:50:00.000Z",
    evidenceReference: "evidence://rotation/credential-one",
    securityApprovalReference: "approval://security/123",
    reviewedAt: "2026-07-25T09:00:00.000Z",
  };
}
