const {
  applyCaptureToOperationalRegister,
  captureAgentAlertEvidence,
  evaluateEvidence,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeEvidencePayload,
} = require("../agent-alert-evidence-capture")

const SECRET = "0123456789abcdef0123456789abcdef"
const NOW = new Date("2026-07-25T13:30:30.000Z")
const SECURITY_OWNER =
  "directory://person/security-incident/primary"
const ON_CALL_OWNER = "directory://person/on-call-backup/primary"

describe("agent alert evidence capture", () => {
  it("captures complete live evidence and invalid-auth proof without retaining secrets", async () => {
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

    const capture = await captureAgentAlertEvidence({
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
    expect(capture.operationalRegisterPatch).toEqual(
      expect.objectContaining({
        transportStatus: "HEALTHY",
        acknowledgedByDirectoryId: SECURITY_OWNER,
        escalatedToDirectoryId: ON_CALL_OWNER,
        evidenceSha256: capture.evidenceHash,
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

    const capture = await captureAgentAlertEvidence({
      environment: captureEnvironment(),
      fetchImpl,
      now: NOW,
    })

    expect(capture.ready).toBe(false)
    expect(capture.checks.invalidAuthRejected).toBe(false)
  })

  it("fails readiness when the evidence environment differs", async () => {
    const payload = readyPayload()
    payload.data.environment = "other_pilot"
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { ok: false }))
      .mockResolvedValueOnce(jsonResponse(200, payload))

    const capture = await captureAgentAlertEvidence({
      environment: captureEnvironment(),
      fetchImpl,
      now: NOW,
    })

    expect(capture.ready).toBe(false)
    expect(capture.checks.environmentMatched).toBe(false)
  })

  it("sanitizes unknown, query-bearing, synthetic, and secret-bearing fields", () => {
    const payload = readyPayload()
    Object.assign(payload.data, {
      secretValue: "must-never-be-retained",
      rawResponse: "must-never-be-retained",
      transportReference:
        "https://evidence.example.test/transport?token=secret",
      acknowledgedByDirectoryId: "directory://person/e2e-user",
    })

    const evidence = sanitizeEvidencePayload(payload)

    expect(evidence.transportReference).toBeNull()
    expect(evidence.acknowledgedByDirectoryId).toBeNull()
    expect(JSON.stringify(evidence)).not.toContain(
      "must-never-be-retained",
    )
    expect(evaluateEvidence(evidence, NOW)).toEqual(
      expect.arrayContaining([
        "ALERT_TRANSPORT_REFERENCE_INVALID",
        "ALERT_ACKNOWLEDGER_IDENTITY_INVALID",
      ]),
    )
  })

  it("rejects stale delivery and acknowledgement outside the SLO", () => {
    const payload = readyPayload()
    payload.data.deliveredAt = "2026-07-23T12:00:00.000Z"
    payload.data.acknowledgedAt = "2026-07-25T12:30:00.000Z"

    const blockers = evaluateEvidence(
      sanitizeEvidencePayload(payload),
      NOW,
    )

    expect(blockers).toEqual(
      expect.arrayContaining([
        "ALERT_DELIVERY_TIMESTAMP_INVALID_OR_STALE",
        "ALERT_ACKNOWLEDGEMENT_OUTSIDE_SLO",
      ]),
    )
  })

  it("updates only alerting evidence for matching real owners", async () => {
    const capture = await readyCapture()
    const register = operationalRegister()

    const updated = applyCaptureToOperationalRegister(register, capture)

    expect(updated.release).toEqual(register.release)
    expect(updated.approvals).toEqual(register.approvals)
    expect(updated.owners).toEqual(register.owners)
    expect(updated.scheduler).toEqual(register.scheduler)
    expect(updated.credentialRotation).toEqual(
      register.credentialRotation,
    )
    expect(updated.activation).toEqual({
      requested: false,
      authorized: false,
      activatedAt: null,
    })
    expect(updated.declaredStatus).toBe("BLOCKED")
    expect(updated.alerting).toEqual(
      expect.objectContaining(capture.operationalRegisterPatch),
    )
  })

  it("rejects blocked capture, unsafe activation, or owner mismatch", async () => {
    const capture = await readyCapture()

    expect(() =>
      applyCaptureToOperationalRegister(operationalRegister(), {
        ...capture,
        ready: false,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "ALERT_EVIDENCE_CAPTURE_NOT_READY",
      }),
    )

    const unsafeRegister = operationalRegister()
    unsafeRegister.activation.requested = true
    expect(() =>
      applyCaptureToOperationalRegister(unsafeRegister, capture),
    ).toThrow(
      expect.objectContaining({
        code: "ALERT_EVIDENCE_REGISTER_ACTIVATION_BOUNDARY_INVALID",
      }),
    )

    const mismatchedOwnerRegister = operationalRegister()
    mismatchedOwnerRegister.owners[0].primaryDirectoryId =
      "directory://person/security-incident/other"
    expect(() =>
      applyCaptureToOperationalRegister(
        mismatchedOwnerRegister,
        capture,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "ALERT_EVIDENCE_ACKNOWLEDGER_OWNER_MISMATCH",
      }),
    )
  })

  it("requires query-free HTTPS outside local development and a strong secret", () => {
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_ALERT_EVIDENCE_URL:
          "http://example.invalid/evidence",
        STOQUIFY_AGENT_ALERT_EVIDENCE_SECRET: SECRET,
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "ALERT_EVIDENCE_HTTPS_REQUIRED",
      }),
    )
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_ALERT_EVIDENCE_URL:
          "https://example.invalid/evidence?token=unsafe",
        STOQUIFY_AGENT_ALERT_EVIDENCE_SECRET: SECRET,
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "ALERT_EVIDENCE_HTTPS_REQUIRED",
      }),
    )
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_ALERT_EVIDENCE_URL:
          "https://example.invalid/evidence",
        STOQUIFY_AGENT_ALERT_EVIDENCE_SECRET: "too-short",
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "ALERT_EVIDENCE_SECRET_INVALID",
      }),
    )
  })

  it("renders a value-free human report", async () => {
    const capture = await readyCapture()
    const markdown = renderMarkdown(capture)

    expect(markdown).toContain("Ready:** Yes")
    expect(markdown).toContain("Invalid authentication rejected")
    expect(markdown).toContain("Secret values printed or retained:** No")
    expect(markdown).not.toContain(SECRET)
  })
})

async function readyCapture() {
  const fetchImpl = jest
    .fn()
    .mockResolvedValueOnce(jsonResponse(401, { ok: false }))
    .mockResolvedValueOnce(jsonResponse(200, readyPayload()))
  return captureAgentAlertEvidence({
    environment: captureEnvironment(),
    fetchImpl,
    now: NOW,
  })
}

function captureEnvironment() {
  return {
    NODE_ENV: "production",
    STOQUIFY_AGENT_ALERT_EVIDENCE_URL:
      "https://alerts.example.test/evidence/agent-runtime",
    STOQUIFY_AGENT_ALERT_EVIDENCE_SECRET: SECRET,
    STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
  }
}

function readyPayload() {
  return {
    ok: true,
    data: {
      ready: true,
      environment: "internal_pilot",
      transportStatus: "HEALTHY",
      transportReference: "alert-transport://internal-pilot/webhook",
      managedSecretReference: "secret-manager://alerts/current",
      httpsDeliveryReference: "evidence://alerts/https-delivery/123",
      externalRequestReference: "external-request://alerts/123",
      deliveredAt: "2026-07-25T12:00:00.000Z",
      acknowledgementSloMinutes: 15,
      acknowledgedAt: "2026-07-25T12:05:00.000Z",
      acknowledgedByDirectoryId: SECURITY_OWNER,
      acknowledgementReference:
        "evidence://alerts/acknowledgement/123",
      retryEvidenceReference: "evidence://alerts/retry/123",
      deadLetterEvidenceReference:
        "evidence://alerts/dead-letter/123",
      recoveryEvidenceReference: "evidence://alerts/recovery/123",
      escalationTestedAt: "2026-07-25T12:10:00.000Z",
      escalatedToDirectoryId: ON_CALL_OWNER,
      escalationEvidenceReference: "evidence://alerts/escalation/123",
      secretRotationEvidenceReference:
        "evidence://alerts/secret-rotation/123",
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

function operationalRegister() {
  return {
    schemaVersion: 1,
    registerId: "operational-release-test",
    declaredStatus: "BLOCKED",
    release: {
      environment: "INTERNAL_PILOT",
      packageId: "package-123",
    },
    ci: {},
    approvals: {},
    owners: [
      {
        role: "SECURITY_INCIDENT",
        primaryDirectoryId: SECURITY_OWNER,
      },
      {
        role: "ON_CALL_BACKUP",
        primaryDirectoryId: ON_CALL_OWNER,
      },
    ],
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
