const {
  applyCaptureToRegisters,
  captureAgentCredentialRotationEvidence,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeEvidencePayload,
} = require("../agent-credential-rotation-evidence-capture");

const SECRET = "0123456789abcdef0123456789abcdef";
const NOW = new Date("2026-07-25T13:30:30.000Z");
const COMMIT_SHA = "a".repeat(40);
const ARTIFACT_DIGEST = `sha256:${"1".repeat(64)}`;
const REGISTER_REFERENCE =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json";

describe("agent credential rotation evidence capture", () => {
  it("captures all configured credential classes without retaining values", async () => {
    const calls = [];
    const fetchImpl = jest.fn(async (_url, init) => {
      calls.push(init.headers.authorization);
      return calls.length === 1
        ? jsonResponse(401, {
            ok: false,
            secretEcho: "must-never-be-retained",
          })
        : jsonResponse(200, readyPayload());
    });

    const capture = await captureAgentCredentialRotationEvidence({
      credentialRegister: credentialRegister(),
      operationalRegister: operationalRegister(),
      environment: captureEnvironment(),
      fetchImpl,
      now: NOW,
    });

    expect(capture).toEqual(
      expect.objectContaining({
        ready: true,
        environment: "internal_pilot",
        blockers: [],
        evidenceHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        rawResponseRetained: false,
        authorizationHeadersRetained: false,
        secretValuesPrinted: false,
        activationAuthorized: false,
      }),
    );
    expect(capture.checks).toEqual({
      evidenceHttpStatus: 200,
      invalidAuthHttpStatus: 401,
      invalidAuthRejected: true,
      environmentMatched: true,
      registerMatched: true,
    });
    expect(capture.credentialRegisterCandidate).toEqual(
      expect.objectContaining({
        declaredStatus: "READY",
        securityOwnerDirectoryId: "directory://person/security-owner",
        authority: expect.objectContaining({
          evidenceSha256: capture.evidenceHash,
          invalidAuthEvidenceReference: expect.stringMatching(
            /^evidence:\/\/agent-credential-rotation\/[a-f0-9]{64}\/invalid-auth-401$/,
          ),
        }),
      }),
    );
    expect(calls).toHaveLength(2);
    expect(calls[0]).not.toBe(`Bearer ${SECRET}`);
    expect(calls[1]).toBe(`Bearer ${SECRET}`);
    expect(JSON.stringify(capture)).not.toContain(SECRET);
    expect(JSON.stringify(capture)).not.toContain("must-never-be-retained");
  });

  it("fails closed when invalid authentication is accepted", async () => {
    const capture = await captureWithResponses(
      jsonResponse(200, readyPayload()),
      jsonResponse(200, readyPayload()),
    );

    expect(capture.ready).toBe(false);
    expect(capture.blockers).toContain(
      "CREDENTIAL_EVIDENCE_INVALID_AUTH_NOT_REJECTED",
    );
  });

  it("requires every configured credential class exactly once", async () => {
    const payload = readyPayload();
    payload.data.entries = [
      payload.data.entries[0],
      payload.data.entries[0],
      {
        ...payload.data.entries[0],
        id: "unexpected-credential",
      },
    ];

    const capture = await captureWithResponses(
      jsonResponse(401, { ok: false }),
      jsonResponse(200, payload),
    );

    expect(capture.ready).toBe(false);
    expect(capture.blockers).toEqual(
      expect.arrayContaining([
        "CREDENTIAL_EVIDENCE_ENTRY_ID_DUPLICATE",
        "CREDENTIAL_EVIDENCE_ENTRY_MISSING:credential-two",
        "CREDENTIAL_EVIDENCE_ENTRY_UNEXPECTED:unexpected-credential",
      ]),
    );
  });

  it("rejects forbidden raw credential value fields structurally", () => {
    const payload = readyPayload();
    payload.data.entries[0].rotationEvidence.accessToken =
      "must-never-be-retained";

    expect(() => sanitizeEvidencePayload(payload)).toThrow(
      expect.objectContaining({
        code: "CREDENTIAL_EVIDENCE_FORBIDDEN_VALUE_FIELD",
      }),
    );
  });

  it("rejects stale attestations and frozen-release drift", async () => {
    const payload = readyPayload();
    payload.data.attestedAt = "2026-07-23T13:25:00.000Z";
    payload.data.release.commitSha = "b".repeat(40);

    const capture = await captureWithResponses(
      jsonResponse(401, { ok: false }),
      jsonResponse(200, payload),
    );

    expect(capture.ready).toBe(false);
    expect(capture.blockers).toEqual(
      expect.arrayContaining([
        "credentialRegister:authority:ATTESTED_AT_INVALID_OR_STALE",
        "credentialRegister:releaseBinding:COMMIT_SHA_MISMATCH",
      ]),
    );
  });

  it("updates only the credential register and its operational binding", async () => {
    const capture = await readyCapture();
    const currentCredentialRegister = credentialRegister();
    const currentOperationalRegister = operationalRegister();

    const applied = applyCaptureToRegisters({
      credentialRegister: currentCredentialRegister,
      operationalRegister: currentOperationalRegister,
      capture,
      registerReference: REGISTER_REFERENCE,
      now: NOW,
    });

    expect(applied.credentialRegister).toEqual(
      expect.objectContaining({
        declaredStatus: "READY",
        securityApprovalReference: "approval://security/rotation-123",
        authority: expect.objectContaining({
          evidenceSha256: capture.evidenceHash,
        }),
      }),
    );
    expect(applied.credentialRegister.entries).toHaveLength(2);
    expect(applied.credentialRegisterSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(applied.operationalRegister.credentialRotation).toEqual({
      registerReference: REGISTER_REFERENCE,
      registerSha256: applied.credentialRegisterSha256,
      securityApprovalReference: "approval://security/rotation-123",
      evidenceSha256: capture.evidenceHash,
      attestationReference: "attestation://security/credential-rotation-123",
    });
    expect(applied.operationalRegister.release).toEqual(
      currentOperationalRegister.release,
    );
    expect(applied.operationalRegister.governance).toEqual(
      currentOperationalRegister.governance,
    );
    expect(applied.operationalRegister.scheduler).toEqual(
      currentOperationalRegister.scheduler,
    );
    expect(applied.operationalRegister.activation).toEqual({
      requested: false,
      authorized: false,
      activatedAt: null,
    });
    expect(applied.operationalRegister.declaredStatus).toBe("BLOCKED");
  });

  it("rejects blocked capture, activation drift, and completed evidence drift", async () => {
    const capture = await readyCapture();

    expect(() =>
      applyCaptureToRegisters({
        credentialRegister: credentialRegister(),
        operationalRegister: operationalRegister(),
        capture: { ...capture, ready: false },
        registerReference: REGISTER_REFERENCE,
        now: NOW,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "CREDENTIAL_EVIDENCE_CAPTURE_NOT_READY",
      }),
    );

    const unsafeOperational = operationalRegister();
    unsafeOperational.activation.requested = true;
    expect(() =>
      applyCaptureToRegisters({
        credentialRegister: credentialRegister(),
        operationalRegister: unsafeOperational,
        capture,
        registerReference: REGISTER_REFERENCE,
        now: NOW,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "CREDENTIAL_EVIDENCE_ACTIVATION_BOUNDARY_INVALID",
      }),
    );

    const completed = capture.credentialRegisterCandidate;
    const changedCapture = {
      ...capture,
      evidenceHash: `sha256:${"f".repeat(64)}`,
    };
    expect(() =>
      applyCaptureToRegisters({
        credentialRegister: completed,
        operationalRegister: operationalRegister(),
        capture: changedCapture,
        registerReference: REGISTER_REFERENCE,
        now: NOW,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "CREDENTIAL_EVIDENCE_COMPLETED_REGISTER_DRIFT",
      }),
    );
  });

  it("requires query-free HTTPS and a strong bearer secret", () => {
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_URL:
          "http://example.invalid/evidence",
        STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_SECRET: SECRET,
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "CREDENTIAL_EVIDENCE_HTTPS_REQUIRED",
      }),
    );
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_URL:
          "https://example.invalid/evidence?token=unsafe",
        STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_SECRET: SECRET,
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "CREDENTIAL_EVIDENCE_HTTPS_REQUIRED",
      }),
    );
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_URL:
          "https://example.invalid/evidence",
        STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_SECRET: "too-short",
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "CREDENTIAL_EVIDENCE_SECRET_INVALID",
      }),
    );
  });

  it("renders a value-free report with activation unauthorized", async () => {
    const markdown = renderMarkdown(await readyCapture());

    expect(markdown).toContain("Ready:** Yes");
    expect(markdown).toContain("Credential classes supplied | 2");
    expect(markdown).toContain("Activation authorized:** No");
    expect(markdown).toContain("Secret values printed or retained:** No");
    expect(markdown).not.toContain(SECRET);
  });
});

async function readyCapture() {
  return captureWithResponses(
    jsonResponse(401, { ok: false }),
    jsonResponse(200, readyPayload()),
  );
}

async function captureWithResponses(first, second) {
  const fetchImpl = jest
    .fn()
    .mockResolvedValueOnce(first)
    .mockResolvedValueOnce(second);
  return captureAgentCredentialRotationEvidence({
    credentialRegister: credentialRegister(),
    operationalRegister: operationalRegister(),
    environment: captureEnvironment(),
    fetchImpl,
    now: NOW,
  });
}

function captureEnvironment() {
  return {
    NODE_ENV: "production",
    STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_URL:
      "https://security.example.test/evidence/credential-rotation",
    STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_SECRET: SECRET,
    STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
  };
}

function readyPayload() {
  return {
    ok: true,
    data: {
      ready: true,
      environment: "internal_pilot",
      registerId: "credential-rotation-test",
      incidentReference: "incident-security-123",
      sourceSystemReference: "security-system://stoquify/credential-rotation",
      attestationReference: "attestation://security/credential-rotation-123",
      attestationDigest: `sha256:${"9".repeat(64)}`,
      attestedAt: "2026-07-25T13:25:00.000Z",
      securityOwnerDirectoryId: "directory://person/security-owner",
      securityApprovalReference: "approval://security/rotation-123",
      release: {
        packageId: "package-123",
        releaseVersion: "release-1",
        packageState: "PILOT_CERTIFIED",
        commitSha: COMMIT_SHA,
        artifactDigest: ARTIFACT_DIGEST,
        deploymentReference: "deployment://internal-pilot/release-1",
        activatedAt: null,
      },
      entries: [
        credentialEntry("credential-one", "SECRET_ONE"),
        credentialEntry("credential-two", "SECRET_TWO"),
      ],
    },
  };
}

function credentialEntry(id) {
  return {
    id,
    disposition: "ROTATED_AND_REVOKED",
    rotationEvidence: {
      secretManagerReference: `secret-manager://${id}/version/current`,
      rotationOwnerDirectoryId: "directory://person/security-owner",
      rotationStartedAt: "2026-07-25T12:00:00.000Z",
      newVersionActivatedAt: "2026-07-25T12:05:00.000Z",
      dependentWorkloadsRestartedAt: "2026-07-25T12:10:00.000Z",
      newVersionVerifiedAt: "2026-07-25T12:15:00.000Z",
      oldVersionRevokedAt: "2026-07-25T12:20:00.000Z",
      oldVersionRejectedAt: "2026-07-25T12:25:00.000Z",
      evidenceReference: `evidence://security/rotation/${id}`,
      securityApprovalReference: "approval://security/rotation-123",
      reviewedAt: "2026-07-25T13:00:00.000Z",
    },
  };
}

function credentialRegister() {
  return {
    schemaVersion: 1,
    registerId: "credential-rotation-test",
    incidentReference: "incident-security-123",
    declaredStatus: "BLOCKED",
    securityOwnerDirectoryId: null,
    securityApprovalReference: null,
    authority: {
      environment: null,
      sourceSystemReference: null,
      attestationReference: null,
      attestationDigest: null,
      attestedAt: null,
      evidenceSha256: null,
      invalidAuthEvidenceReference: null,
    },
    releaseBinding: {
      environment: null,
      packageId: null,
      releaseVersion: null,
      packageState: "PILOT_CERTIFIED",
      commitSha: null,
      artifactDigest: null,
      deploymentReference: null,
      activatedAt: null,
    },
    entries: [
      credentialClass("credential-one", "SECRET_ONE"),
      credentialClass("credential-two", "SECRET_TWO"),
    ],
  };
}

function credentialClass(id, environmentVariable) {
  return {
    id,
    purpose: `${id} purpose`,
    environmentVariables: [environmentVariable],
    dependentWorkloads: [`${id}-worker`],
    disposition: "UNRESOLVED",
    rotationEvidence: {},
  };
}

function operationalRegister() {
  return {
    schemaVersion: 1,
    registerId: "operational-release-test",
    declaredStatus: "BLOCKED",
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
      manifestHash: `sha256:${"2".repeat(64)}`,
      evidenceBundleHash: `sha256:${"3".repeat(64)}`,
      browserReportHash: `sha256:${"4".repeat(64)}`,
      pilotAllowlistReference: "policy://pilot/tenants/v1",
      roleAllowlistReference: "policy://pilot/roles/v1",
      ciEvidenceSha256: `sha256:${"6".repeat(64)}`,
      activatedAt: null,
    },
    ci: {},
    governance: { marker: "preserved" },
    approvals: {},
    owners: [],
    scheduler: { marker: "preserved" },
    alerting: {},
    credentialRotation: {
      registerReference: REGISTER_REFERENCE,
      registerSha256: null,
      securityApprovalReference: null,
      evidenceSha256: null,
      attestationReference: null,
    },
    activation: {
      requested: false,
      authorized: false,
      activatedAt: null,
    },
  };
}

function jsonResponse(status, body) {
  return {
    status,
    async text() {
      return JSON.stringify(body);
    },
  };
}
