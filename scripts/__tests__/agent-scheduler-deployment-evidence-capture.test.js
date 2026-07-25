const {
  applyCaptureToOperationalRegister,
  captureAgentSchedulerDeploymentEvidence,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeEvidencePayload,
} = require("../agent-scheduler-deployment-evidence-capture");

const SECRET = "0123456789abcdef0123456789abcdef";
const NOW = new Date("2026-07-25T13:30:30.000Z");
const COMMIT_SHA = "a".repeat(40);
const ARTIFACT_DIGEST = `sha256:${"1".repeat(64)}`;

describe("agent scheduler deployment evidence capture", () => {
  it("captures release-bound deployment proof without retaining values", async () => {
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

    const capture = await captureAgentSchedulerDeploymentEvidence({
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
    });
    expect(capture.operationalRegisterPatch).toEqual(
      expect.objectContaining({
        provider: "managed-scheduler",
        intervalMinutes: 5,
        singleConcurrency: true,
        missingConfigEvidenceReference:
          "evidence://scheduler/missing-config-503",
        deploymentEvidenceSha256: capture.evidenceHash,
        deploymentAuthorityInvalidAuthEvidenceReference: expect.stringMatching(
          /^evidence:\/\/agent-scheduler-deployment\/[a-f0-9]{64}\/invalid-auth-401$/,
        ),
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
      "SCHEDULER_EVIDENCE_INVALID_AUTH_NOT_REJECTED",
    );
  });

  it("rejects environment and frozen release drift", async () => {
    const payload = readyPayload();
    payload.data.environment = "production";
    payload.data.release.commitSha = "b".repeat(40);

    const capture = await captureWithResponses(
      jsonResponse(401, { ok: false }),
      jsonResponse(200, payload),
    );

    expect(capture.ready).toBe(false);
    expect(capture.blockers).toEqual(
      expect.arrayContaining([
        "SCHEDULER_EVIDENCE_ENVIRONMENT_MISMATCH",
        "SCHEDULER_EVIDENCE_RELEASE_COMMIT_MISMATCH",
      ]),
    );
  });

  it("rejects forbidden raw credential value fields structurally", () => {
    const payload = readyPayload();
    payload.data.scheduler.accessToken = "must-never-be-retained";

    expect(() => sanitizeEvidencePayload(payload)).toThrow(
      expect.objectContaining({
        code: "SCHEDULER_EVIDENCE_FORBIDDEN_VALUE_FIELD",
      }),
    );
  });

  it("rejects stale or misordered deployment attestations", async () => {
    const payload = readyPayload();
    payload.data.attestedAt = "2026-07-23T13:25:00.000Z";
    payload.data.scheduler.deployedAt = "2026-07-25T13:29:00.000Z";

    const capture = await captureWithResponses(
      jsonResponse(401, { ok: false }),
      jsonResponse(200, payload),
    );

    expect(capture.ready).toBe(false);
    expect(capture.blockers).toEqual(
      expect.arrayContaining([
        "SCHEDULER_EVIDENCE_ATTESTATION_INVALID_OR_STALE",
        "SCHEDULER_EVIDENCE_DEPLOYED_AFTER_ATTESTATION",
      ]),
    );
  });

  it("rejects unsafe scheduler policy and missing-config behavior", async () => {
    const payload = readyPayload();
    payload.data.scheduler.intervalMinutes = 10;
    payload.data.scheduler.singleConcurrency = false;
    payload.data.scheduler.leaseSafe = false;
    payload.data.scheduler.missingConfigHttpStatus = 200;

    const capture = await captureWithResponses(
      jsonResponse(401, { ok: false }),
      jsonResponse(200, payload),
    );

    expect(capture.ready).toBe(false);
    expect(capture.blockers).toEqual(
      expect.arrayContaining([
        "SCHEDULER_EVIDENCE_INTERVAL_INVALID",
        "SCHEDULER_EVIDENCE_CONCURRENCY_CONTROL_MISSING",
        "SCHEDULER_EVIDENCE_MISSING_CONFIG_STATUS_NOT_503",
      ]),
    );
  });

  it("updates scheduler deployment metadata only", async () => {
    const capture = await readyCapture();
    const register = operationalRegister();
    const readiness = {
      readinessStatus: "PENDING",
      readinessCheckedAt: null,
      readinessEvidenceReference: null,
      readinessEvidenceSha256: null,
      heartbeatFreshUntil: null,
      invalidAuthEvidenceReference: null,
      windows: [{ runId: null, status: "PENDING" }],
    };
    register.scheduler = { ...readiness };

    const applied = applyCaptureToOperationalRegister(register, capture, {
      now: NOW,
    });

    expect(applied.scheduler).toEqual(
      expect.objectContaining({
        ...readiness,
        provider: "managed-scheduler",
        deployedCommitSha: COMMIT_SHA,
        deploymentEvidenceSha256: capture.evidenceHash,
      }),
    );
    expect(applied.release).toEqual(register.release);
    expect(applied.governance).toEqual(register.governance);
    expect(applied.credentialRotation).toEqual(register.credentialRotation);
    expect(applied.declaredStatus).toBe("BLOCKED");
    expect(applied.activation).toEqual({
      requested: false,
      authorized: false,
      activatedAt: null,
    });
  });

  it("rejects blocked capture, activation drift, and existing deployment drift", async () => {
    const capture = await readyCapture();

    expect(() =>
      applyCaptureToOperationalRegister(
        operationalRegister(),
        { ...capture, ready: false },
        { now: NOW },
      ),
    ).toThrow(
      expect.objectContaining({
        code: "SCHEDULER_EVIDENCE_CAPTURE_NOT_READY",
      }),
    );

    const activationDrift = operationalRegister();
    activationDrift.activation.requested = true;
    expect(() =>
      applyCaptureToOperationalRegister(activationDrift, capture, {
        now: NOW,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "SCHEDULER_EVIDENCE_ACTIVATION_BOUNDARY_INVALID",
      }),
    );

    const deploymentDrift = operationalRegister();
    deploymentDrift.scheduler.provider = "other-scheduler";
    expect(() =>
      applyCaptureToOperationalRegister(deploymentDrift, capture, {
        now: NOW,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "SCHEDULER_EVIDENCE_EXISTING_PROVIDER_DRIFT",
      }),
    );
  });

  it("requires query-free HTTPS and renders a value-free report", async () => {
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_SCHEDULER_EVIDENCE_URL:
          "http://example.invalid/evidence",
        STOQUIFY_AGENT_SCHEDULER_EVIDENCE_SECRET: SECRET,
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "SCHEDULER_EVIDENCE_HTTPS_REQUIRED",
      }),
    );
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_SCHEDULER_EVIDENCE_URL:
          "https://example.invalid/evidence?token=unsafe",
        STOQUIFY_AGENT_SCHEDULER_EVIDENCE_SECRET: SECRET,
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "SCHEDULER_EVIDENCE_HTTPS_REQUIRED",
      }),
    );
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_SCHEDULER_EVIDENCE_URL:
          "https://example.invalid/evidence",
        STOQUIFY_AGENT_SCHEDULER_EVIDENCE_SECRET: "too-short",
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "SCHEDULER_EVIDENCE_SECRET_INVALID",
      }),
    );

    const markdown = renderMarkdown(await readyCapture());
    expect(markdown).toContain("Ready:** Yes");
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
  return captureAgentSchedulerDeploymentEvidence({
    operationalRegister: operationalRegister(),
    environment: captureEnvironment(),
    fetchImpl,
    now: NOW,
  });
}

function captureEnvironment() {
  return {
    NODE_ENV: "production",
    STOQUIFY_AGENT_SCHEDULER_EVIDENCE_URL:
      "https://scheduler.example.test/evidence/deployment",
    STOQUIFY_AGENT_SCHEDULER_EVIDENCE_SECRET: SECRET,
    STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
  };
}

function readyPayload() {
  return {
    ok: true,
    data: {
      ready: true,
      environment: "internal_pilot",
      sourceSystemReference:
        "scheduler-control-plane://stoquify/internal-pilot",
      attestationReference: "attestation://agent-runtime/scheduler/release-1",
      attestationDigest: `sha256:${"9".repeat(64)}`,
      attestedAt: "2026-07-25T13:25:00.000Z",
      release: {
        packageId: "package-123",
        releaseVersion: "release-1",
        packageState: "PILOT_CERTIFIED",
        commitSha: COMMIT_SHA,
        artifactDigest: ARTIFACT_DIGEST,
        deploymentReference: "deployment://internal-pilot/release-1",
        activatedAt: null,
      },
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
        deployedAt: "2026-07-25T12:00:00.000Z",
        missingConfigHttpStatus: 503,
        missingConfigEvidenceReference:
          "evidence://scheduler/missing-config-503",
        failureAlertReference: "alert://scheduler/failure-policy",
      },
    },
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
      deploymentReference: "deployment://internal-pilot/release-1",
      activatedAt: null,
    },
    ci: {},
    governance: { marker: "preserved" },
    approvals: {},
    owners: [],
    scheduler: {},
    alerting: {},
    credentialRotation: { marker: "preserved" },
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
