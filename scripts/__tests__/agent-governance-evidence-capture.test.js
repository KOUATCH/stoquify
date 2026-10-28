const {
  REQUIRED_OWNER_ROLES,
  applyCaptureToOperationalRegister,
  captureAgentGovernanceEvidence,
  evaluateGovernanceEvidence,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeEvidencePayload,
} = require("../agent-governance-evidence-capture")

const SECRET = "0123456789abcdef0123456789abcdef"
const NOW = new Date("2026-07-25T13:30:30.000Z")
const COMMIT_SHA = "a".repeat(40)
const ARTIFACT_DIGEST = `sha256:${"1".repeat(64)}`
const MANIFEST_HASH = `sha256:${"2".repeat(64)}`
const EVIDENCE_BUNDLE_HASH = `sha256:${"3".repeat(64)}`

describe("agent governance evidence capture", () => {
  it("captures release-bound approvals and owners without retaining secrets", async () => {
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

    const capture = await captureAgentGovernanceEvidence({
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
        localDatabaseIdentitiesAccepted: false,
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
    expect(capture.evidence.owners).toHaveLength(6)
    expect(capture.operationalRegisterPatch.governance).toEqual(
      expect.objectContaining({
        environment: "INTERNAL_PILOT",
        commitSha: COMMIT_SHA,
        evidenceSha256: capture.evidenceHash,
        invalidAuthEvidenceReference: expect.stringMatching(
          /^evidence:\/\/agent-governance\/[a-f0-9]{64}\/invalid-auth-401$/,
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

    const capture = await captureAgentGovernanceEvidence({
      environment: captureEnvironment(),
      fetchImpl,
      now: NOW,
    })

    expect(capture.ready).toBe(false)
    expect(capture.checks.invalidAuthRejected).toBe(false)
  })

  it("fails readiness when the authority environment differs", async () => {
    const payload = readyPayload()
    payload.data.environment = "other_pilot"
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { ok: false }))
      .mockResolvedValueOnce(jsonResponse(200, payload))

    const capture = await captureAgentGovernanceEvidence({
      environment: captureEnvironment(),
      fetchImpl,
      now: NOW,
    })

    expect(capture.ready).toBe(false)
    expect(capture.checks.environmentMatched).toBe(false)
  })

  it("discards unknown fields and rejects query-bearing or synthetic evidence", () => {
    const payload = readyPayload()
    Object.assign(payload.data, {
      secretValue: "must-never-be-retained",
      rawDirectoryExport: "must-never-be-retained",
      sourceSystemReference:
        "https://identity.example.test/evidence?token=unsafe",
    })
    payload.data.approvals.product.actorDirectoryId =
      "directory://person/e2e-approver"

    const evidence = sanitizeEvidencePayload(payload)
    const blockers = evaluateGovernanceEvidence(evidence, NOW)

    expect(evidence.sourceSystemReference).toBeNull()
    expect(evidence.approvals.product.actorDirectoryId).toBeNull()
    expect(blockers).toEqual(
      expect.arrayContaining([
        "GOVERNANCE_SOURCE_REFERENCE_INVALID",
        "GOVERNANCE_PRODUCT_ACTOR_INVALID",
      ]),
    )
    expect(JSON.stringify(evidence)).not.toContain(
      "must-never-be-retained",
    )
  })

  it("rejects stale attestations, expired approvals, and owner gaps", () => {
    const payload = readyPayload()
    payload.data.attestedAt = "2026-07-23T13:00:00.000Z"
    payload.data.approvals.security.expiresAt =
      "2026-07-25T13:20:00.000Z"
    payload.data.owners = payload.data.owners.filter(
      (owner) => owner.role !== "ROLLBACK",
    )

    const blockers = evaluateGovernanceEvidence(
      sanitizeEvidencePayload(payload),
      NOW,
    )

    expect(blockers).toEqual(
      expect.arrayContaining([
        "GOVERNANCE_ATTESTATION_TIMESTAMP_INVALID_OR_STALE",
        "GOVERNANCE_SECURITY_EXPIRED_OR_END_INVALID",
        "GOVERNANCE_OWNER_ROLLBACK_MISSING",
      ]),
    )
  })

  it("updates only governance, approvals, and owners for a frozen release", async () => {
    const capture = await readyCapture()
    const register = operationalRegister()

    const updated = applyCaptureToOperationalRegister(register, capture)

    expect(updated.release).toEqual(register.release)
    expect(updated.ci).toEqual(register.ci)
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
    expect(updated.governance).toEqual(
      capture.operationalRegisterPatch.governance,
    )
    expect(updated.approvals).toEqual(
      capture.operationalRegisterPatch.approvals,
    )
    expect(updated.owners).toEqual(
      capture.operationalRegisterPatch.owners,
    )
  })

  it("rejects blocked capture, activation drift, and release identity drift", async () => {
    const capture = await readyCapture()

    expect(() =>
      applyCaptureToOperationalRegister(operationalRegister(), {
        ...capture,
        ready: false,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "GOVERNANCE_EVIDENCE_CAPTURE_NOT_READY",
      }),
    )

    const unsafeRegister = operationalRegister()
    unsafeRegister.activation.authorized = true
    expect(() =>
      applyCaptureToOperationalRegister(unsafeRegister, capture),
    ).toThrow(
      expect.objectContaining({
        code: "GOVERNANCE_EVIDENCE_REGISTER_ACTIVATION_BOUNDARY_INVALID",
      }),
    )

    const driftedRegister = operationalRegister()
    driftedRegister.release.commitSha = "b".repeat(40)
    expect(() =>
      applyCaptureToOperationalRegister(driftedRegister, capture),
    ).toThrow(
      expect.objectContaining({
        code: "GOVERNANCE_EVIDENCE_RELEASE_COMMIT_SHA_MISMATCH",
      }),
    )
  })

  it("requires query-free HTTPS outside local development and a strong secret", () => {
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_URL:
          "http://example.invalid/evidence",
        STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_SECRET: SECRET,
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "GOVERNANCE_EVIDENCE_HTTPS_REQUIRED",
      }),
    )
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_URL:
          "https://example.invalid/evidence?token=unsafe",
        STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_SECRET: SECRET,
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "GOVERNANCE_EVIDENCE_HTTPS_REQUIRED",
      }),
    )
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_URL:
          "https://example.invalid/evidence",
        STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_SECRET: "too-short",
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "GOVERNANCE_EVIDENCE_SECRET_INVALID",
      }),
    )
  })

  it("renders a value-free report that excludes local database identities", async () => {
    const capture = await readyCapture()
    const markdown = renderMarkdown(capture)

    expect(markdown).toContain("Ready:** Yes")
    expect(markdown).toContain("Invalid authentication rejected")
    expect(markdown).toContain("Local database identities accepted:** No")
    expect(markdown).toContain("Secret values printed or retained:** No")
    expect(markdown).not.toContain(SECRET)
  })
})

async function readyCapture() {
  const fetchImpl = jest
    .fn()
    .mockResolvedValueOnce(jsonResponse(401, { ok: false }))
    .mockResolvedValueOnce(jsonResponse(200, readyPayload()))
  return captureAgentGovernanceEvidence({
    environment: captureEnvironment(),
    fetchImpl,
    now: NOW,
  })
}

function captureEnvironment() {
  return {
    NODE_ENV: "production",
    STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_URL:
      "https://governance.example.test/evidence/agent-runtime",
    STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_SECRET: SECRET,
    STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
  }
}

function readyPayload() {
  return {
    ok: true,
    data: {
      ready: true,
      environment: "internal_pilot",
      sourceSystemReference: "identity-governance://stoquify/internal-pilot",
      attestationReference:
        "attestation://agent-runtime/governance/release-1",
      attestationDigest: `sha256:${"9".repeat(64)}`,
      attestedAt: "2026-07-25T13:25:00.000Z",
      releaseBinding: releaseBinding(),
      approvals: {
        product: approval("product"),
        security: approval("security"),
      },
      owners: REQUIRED_OWNER_ROLES.map(owner),
    },
  }
}

function releaseBinding() {
  return {
    packageId: "package-123",
    releaseVersion: "release-1",
    commitSha: COMMIT_SHA,
    artifactDigest: ARTIFACT_DIGEST,
    manifestHash: MANIFEST_HASH,
    evidenceBundleHash: EVIDENCE_BUNDLE_HASH,
  }
}

function approval(kind) {
  return {
    decision: "APPROVED",
    actorDirectoryId: `directory://person/${kind}-approver`,
    approvalReference: `approval://${kind}/release-1`,
    decidedAt: "2026-07-25T12:45:00.000Z",
    expiresAt: "2026-07-25T18:00:00.000Z",
    manifestHash: MANIFEST_HASH,
    artifactDigest: ARTIFACT_DIGEST,
    evidenceBundleHash: EVIDENCE_BUNDLE_HASH,
  }
}

function owner(role) {
  const roleSlug = role.toLowerCase().replaceAll("_", "-")
  return {
    role,
    primaryDirectoryId: `directory://person/${roleSlug}/primary`,
    backupDirectoryId: `directory://person/${roleSlug}/backup`,
    acceptedRunbookVersion: "agent-pilot-runbook-v1",
    acceptedAt: "2026-07-25T12:30:00.000Z",
    coverageStartsAt: "2026-07-25T12:00:00.000Z",
    coverageEndsAt: "2026-07-25T18:00:00.000Z",
    escalationReference: `evidence://owners/${roleSlug}/release-1`,
  }
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
      manifestHash: MANIFEST_HASH,
      evidenceBundleHash: EVIDENCE_BUNDLE_HASH,
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
