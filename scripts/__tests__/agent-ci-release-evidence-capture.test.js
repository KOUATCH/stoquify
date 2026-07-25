const {
  applyCaptureToOperationalRegister,
  captureAgentCiReleaseEvidence,
  evaluateCiReleaseEvidence,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeEvidencePayload,
} = require("../agent-ci-release-evidence-capture")

const SECRET = "0123456789abcdef0123456789abcdef"
const NOW = new Date("2026-07-25T13:30:30.000Z")
const COMMIT_SHA = "a".repeat(40)
const ARTIFACT_DIGEST = `sha256:${"1".repeat(64)}`
const MANIFEST_HASH = `sha256:${"2".repeat(64)}`
const EVIDENCE_BUNDLE_HASH = `sha256:${"3".repeat(64)}`
const BROWSER_HASH = `sha256:${"4".repeat(64)}`

describe("agent CI release evidence capture", () => {
  it("captures a clean certified release without retaining secrets", async () => {
    const calls = []
    const fetchImpl = jest.fn(async (_url, init) => {
      calls.push(init.headers.authorization)
      return calls.length === 1
        ? jsonResponse(401, {
            ok: false,
            secretEcho: "must-never-be-retained",
          })
        : jsonResponse(200, readyPayload())
    })

    const capture = await captureAgentCiReleaseEvidence({
      environment: captureEnvironment(),
      fetchImpl,
      now: NOW,
    })

    expect(capture).toEqual(
      expect.objectContaining({
        ready: true,
        environment: "internal_pilot",
        blockers: [],
        evidenceHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        rawResponseRetained: false,
        authorizationHeadersRetained: false,
        secretValuesPrinted: false,
      }),
    )
    expect(capture.checks).toEqual({
      evidenceHttpStatus: 200,
      invalidAuthHttpStatus: 401,
      invalidAuthRejected: true,
      environmentMatched: true,
    })
    expect(capture.operationalRegisterPatch.release).toEqual(
      expect.objectContaining({
        packageState: "PILOT_CERTIFIED",
        commitSha: COMMIT_SHA,
        ciEvidenceSha256: capture.evidenceHash,
        activatedAt: null,
      }),
    )
    expect(capture.operationalRegisterPatch.ci).toEqual(
      expect.objectContaining({
        status: "PASSED",
        sourceTreeClean: true,
        evidenceSha256: capture.evidenceHash,
        invalidAuthEvidenceReference: expect.stringMatching(
          /^evidence:\/\/agent-ci-release\/[a-f0-9]{64}\/invalid-auth-401$/,
        ),
      }),
    )
    expect(calls).toHaveLength(2)
    expect(calls[0]).not.toBe(`Bearer ${SECRET}`)
    expect(calls[1]).toBe(`Bearer ${SECRET}`)
    expect(JSON.stringify(capture)).not.toContain(SECRET)
    expect(JSON.stringify(capture)).not.toContain(
      "must-never-be-retained",
    )
  })

  it("fails readiness when invalid authentication is accepted", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, readyPayload()))
      .mockResolvedValueOnce(jsonResponse(200, readyPayload()))

    const capture = await captureAgentCiReleaseEvidence({
      environment: captureEnvironment(),
      fetchImpl,
      now: NOW,
    })

    expect(capture.ready).toBe(false)
    expect(capture.checks.invalidAuthRejected).toBe(false)
  })

  it("fails readiness when the attested environment differs", async () => {
    const payload = readyPayload()
    payload.data.environment = "other_pilot"
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { ok: false }))
      .mockResolvedValueOnce(jsonResponse(200, payload))

    const capture = await captureAgentCiReleaseEvidence({
      environment: captureEnvironment(),
      fetchImpl,
      now: NOW,
    })

    expect(capture.ready).toBe(false)
    expect(capture.checks.environmentMatched).toBe(false)
  })

  it("discards unknown fields and rejects query-bearing references", () => {
    const payload = readyPayload()
    Object.assign(payload.data, {
      secretValue: "must-never-be-retained",
      rawArtifact: "must-never-be-retained",
      sourceSystemReference:
        "https://ci.example.test/evidence?token=unsafe",
    })

    const evidence = sanitizeEvidencePayload(payload)
    const blockers = evaluateCiReleaseEvidence(evidence, NOW)

    expect(evidence.sourceSystemReference).toBeNull()
    expect(blockers).toContain("CI_RELEASE_SOURCE_REFERENCE_INVALID")
    expect(JSON.stringify(evidence)).not.toContain(
      "must-never-be-retained",
    )
  })

  it("rejects dirty, stale, or activated release evidence", () => {
    const payload = readyPayload()
    payload.data.ci.sourceTreeClean = false
    payload.data.ci.completedAt = "2026-07-23T13:00:00.000Z"
    payload.data.release.activatedAt =
      "2026-07-25T13:00:00.000Z"

    const blockers = evaluateCiReleaseEvidence(
      sanitizeEvidencePayload(payload),
      NOW,
    )

    expect(blockers).toEqual(
      expect.arrayContaining([
        "CI_RELEASE_SOURCE_TREE_NOT_CLEAN",
        "CI_RELEASE_CI_COMPLETION_INVALID_OR_STALE",
        "CI_RELEASE_PACKAGE_ACTIVATION_PRESENT",
      ]),
    )
  })

  it("updates only release and CI evidence", async () => {
    const capture = await readyCapture()
    const register = operationalRegister()

    const updated = applyCaptureToOperationalRegister(register, capture)

    expect(updated.release).toEqual(
      capture.operationalRegisterPatch.release,
    )
    expect(updated.ci).toEqual(capture.operationalRegisterPatch.ci)
    expect(updated.governance).toEqual(register.governance)
    expect(updated.approvals).toEqual(register.approvals)
    expect(updated.owners).toEqual(register.owners)
    expect(updated.scheduler).toEqual(register.scheduler)
    expect(updated.alerting).toEqual(register.alerting)
    expect(updated.credentialRotation).toEqual(
      register.credentialRotation,
    )
    expect(updated.activation).toEqual({
      requested: false,
      authorized: false,
      activatedAt: null,
    })
    expect(updated.declaredStatus).toBe("BLOCKED")
  })

  it("rejects blocked capture, activation drift, and existing identity drift", async () => {
    const capture = await readyCapture()

    expect(() =>
      applyCaptureToOperationalRegister(operationalRegister(), {
        ...capture,
        ready: false,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "CI_RELEASE_EVIDENCE_CAPTURE_NOT_READY",
      }),
    )

    const unsafeRegister = operationalRegister()
    unsafeRegister.activation.requested = true
    expect(() =>
      applyCaptureToOperationalRegister(unsafeRegister, capture),
    ).toThrow(
      expect.objectContaining({
        code: "CI_RELEASE_EVIDENCE_REGISTER_ACTIVATION_BOUNDARY_INVALID",
      }),
    )

    const driftedRegister = operationalRegister()
    driftedRegister.release.packageId = "package-other"
    expect(() =>
      applyCaptureToOperationalRegister(driftedRegister, capture),
    ).toThrow(
      expect.objectContaining({
        code: "CI_RELEASE_EVIDENCE_EXISTING_PACKAGE_ID_DRIFT",
      }),
    )
  })

  it("requires query-free HTTPS outside local development and a strong secret", () => {
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_URL:
          "http://example.invalid/evidence",
        STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_SECRET: SECRET,
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "CI_RELEASE_EVIDENCE_HTTPS_REQUIRED",
      }),
    )
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_URL:
          "https://example.invalid/evidence?token=unsafe",
        STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_SECRET: SECRET,
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "CI_RELEASE_EVIDENCE_HTTPS_REQUIRED",
      }),
    )
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_URL:
          "https://example.invalid/evidence",
        STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_SECRET: "too-short",
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "CI_RELEASE_EVIDENCE_SECRET_INVALID",
      }),
    )
  })

  it("renders a value-free report with activation still unauthorized", async () => {
    const capture = await readyCapture()
    const markdown = renderMarkdown(capture)

    expect(markdown).toContain("Ready:** Yes")
    expect(markdown).toContain("Source tree clean | Yes")
    expect(markdown).toContain("Activation authorized:** No")
    expect(markdown).toContain("Secret values printed or retained:** No")
    expect(markdown).not.toContain(SECRET)
  })
})

async function readyCapture() {
  const fetchImpl = jest
    .fn()
    .mockResolvedValueOnce(jsonResponse(401, { ok: false }))
    .mockResolvedValueOnce(jsonResponse(200, readyPayload()))
  return captureAgentCiReleaseEvidence({
    environment: captureEnvironment(),
    fetchImpl,
    now: NOW,
  })
}

function captureEnvironment() {
  return {
    NODE_ENV: "production",
    STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_URL:
      "https://ci.example.test/evidence/agent-runtime",
    STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_SECRET: SECRET,
    STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
  }
}

function readyPayload() {
  return {
    ok: true,
    data: {
      ready: true,
      environment: "internal_pilot",
      sourceSystemReference: "ci-system://stoquify/internal-pilot",
      attestationReference:
        "attestation://agent-runtime/ci/release-1",
      attestationDigest: `sha256:${"9".repeat(64)}`,
      attestedAt: "2026-07-25T13:25:00.000Z",
      release: releaseEvidence(),
      ci: ciEvidence(),
    },
  }
}

function releaseEvidence() {
  return {
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
    evidenceBundleHash: EVIDENCE_BUNDLE_HASH,
    browserReportHash: BROWSER_HASH,
    pilotAllowlistReference: "policy://pilot/tenants/v1",
    roleAllowlistReference: "policy://pilot/roles/v1",
    activatedAt: null,
  }
}

function ciEvidence() {
  return {
    status: "PASSED",
    sourceTreeClean: true,
    commitSha: COMMIT_SHA,
    branchReference: "git://stoquify/codex-agent-pilot",
    runReference: "ci://stoquify/runs/123",
    artifactDigest: ARTIFACT_DIGEST,
    artifactReference: "artifact://stoquify/release-1",
    browserReportHash: BROWSER_HASH,
    completedAt: "2026-07-25T13:20:00.000Z",
  }
}

function operationalRegister() {
  return {
    schemaVersion: 1,
    registerId: "operational-release-test",
    declaredStatus: "BLOCKED",
    release: {
      environment: "INTERNAL_PILOT",
      packageId: null,
      releaseVersion: null,
      packageState: "PILOT_CERTIFIED",
      commitSha: null,
      artifactDigest: null,
      artifactReference: null,
      deploymentReference: null,
      packageCertificationReference: null,
      packageCertificationHash: null,
      manifestHash: null,
      evidenceBundleHash: null,
      browserReportHash: null,
      pilotAllowlistReference: null,
      roleAllowlistReference: null,
      ciEvidenceSha256: null,
      activatedAt: null,
    },
    ci: {},
    governance: {},
    approvals: {},
    owners: [],
    scheduler: {},
    alerting: {},
    credentialRotation: {},
    activation: {
      requested: false,
      authorized: false,
      activatedAt: null,
    },
  }
}

function jsonResponse(status, body) {
  return {
    status,
    async text() {
      return JSON.stringify(body)
    },
  }
}
