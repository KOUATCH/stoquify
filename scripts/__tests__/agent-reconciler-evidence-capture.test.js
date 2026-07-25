const {
  ReconcilerEvidenceCaptureError,
  applyCaptureToOperationalRegister,
  captureAgentReconcilerEvidence,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeReadinessPayload,
} = require("../agent-reconciler-evidence-capture")

const SECRET = "0123456789abcdef0123456789abcdef"
const NOW = new Date("2026-07-25T13:30:30.000Z")

describe("agent reconciler evidence capture", () => {
  it("captures ready and invalid-auth proof without retaining the secret", async () => {
    const calls = []
    const fetchImpl = jest.fn(async (_url, init) => {
      calls.push(init.headers.authorization)
      return calls.length === 1
        ? jsonResponse(401, {
            ok: false,
            error: "Unauthorized.",
            secretEcho: "must-never-be-retained",
          })
        : jsonResponse(200, readyPayload())
    })

    const capture = await captureAgentReconcilerEvidence({
      environment: captureEnvironment(),
      fetchImpl,
      now: NOW,
    })

    expect(capture).toEqual(
      expect.objectContaining({
        ready: true,
        environment: "internal_pilot",
        evidenceHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        rawResponseRetained: false,
        authorizationHeadersRetained: false,
        secretValuesPrinted: false,
      }),
    )
    expect(capture.checks).toEqual({
      readinessHttpStatus: 200,
      invalidAuthHttpStatus: 401,
      invalidAuthRejected: true,
      environmentMatched: true,
    })
    expect(capture.operationalRegisterPatch).toEqual(
      expect.objectContaining({
        readinessStatus: "HEALTHY",
        readinessCheckedAt: NOW.toISOString(),
        readinessEvidenceSha256: capture.evidenceHash,
        heartbeatFreshUntil: "2026-07-25T13:38:00.000Z",
        windows: expect.arrayContaining([
          expect.objectContaining({
            runId:
              "agent-runtime:internal_pilot:2026-07-25T13:30:00.000Z",
            status: "COMPLETED",
          }),
        ]),
      }),
    )
    expect(calls).toHaveLength(2)
    expect(calls[0]).not.toBe(`Bearer ${SECRET}`)
    expect(calls[1]).toBe(`Bearer ${SECRET}`)
    expect(JSON.stringify(capture)).not.toContain(SECRET)
    expect(JSON.stringify(capture)).not.toContain("must-never-be-retained")
  })

  it("fails readiness when the invalid-auth probe is not rejected", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, readyPayload()))
      .mockResolvedValueOnce(jsonResponse(200, readyPayload()))

    const capture = await captureAgentReconcilerEvidence({
      environment: captureEnvironment(),
      fetchImpl,
      now: NOW,
    })

    expect(capture.ready).toBe(false)
    expect(capture.checks.invalidAuthRejected).toBe(false)
    expect(capture.operationalRegisterPatch.readinessStatus).toBe("BLOCKED")
  })

  it("fails readiness when the authenticated environment does not match", async () => {
    const payload = readyPayload()
    payload.data.environment = "other_pilot"
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { ok: false }))
      .mockResolvedValueOnce(jsonResponse(200, payload))

    const capture = await captureAgentReconcilerEvidence({
      environment: captureEnvironment(),
      fetchImpl,
      now: NOW,
    })

    expect(capture.ready).toBe(false)
    expect(capture.checks.environmentMatched).toBe(false)
  })

  it("sanitizes unknown fields, blocker codes, and invalid windows", () => {
    const readiness = sanitizeReadinessPayload({
      data: {
        ...readyPayload().data,
        secretValue: "must-never-be-retained",
        blockers: ["RECONCILER_CADENCE_STALE", "UNKNOWN_INTERNAL_CODE"],
        windows: [
          {
            runId: "invalid run id",
            status: "UNKNOWN_STATUS",
            scheduledAt: "not-a-date",
            completedAt: null,
            rawResult: "must-never-be-retained",
          },
        ],
      },
    })

    expect(readiness.blockers).toEqual(["RECONCILER_CADENCE_STALE"])
    expect(readiness.windows).toEqual([
      {
        runId: null,
        status: null,
        scheduledAt: null,
        completedAt: null,
      },
    ])
    expect(JSON.stringify(readiness)).not.toContain("must-never-be-retained")
  })

  it("updates only scheduler evidence on a ready matching register", async () => {
    const capture = await readyCapture()
    const register = operationalRegister()

    const updated = applyCaptureToOperationalRegister(register, capture)

    expect(updated.release).toEqual(register.release)
    expect(updated.approvals).toEqual(register.approvals)
    expect(updated.owners).toEqual(register.owners)
    expect(updated.activation).toEqual({
      requested: false,
      authorized: false,
      activatedAt: null,
    })
    expect(updated.declaredStatus).toBe("BLOCKED")
    expect(updated.scheduler).toEqual(
      expect.objectContaining(capture.operationalRegisterPatch),
    )
  })

  it("rejects register updates from blocked capture or unsafe activation state", async () => {
    const capture = await readyCapture()
    const blockedCapture = {
      ...capture,
      ready: false,
    }

    expect(() =>
      applyCaptureToOperationalRegister(
        operationalRegister(),
        blockedCapture,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "RECONCILER_CAPTURE_NOT_READY",
      }),
    )

    const unsafeRegister = operationalRegister()
    unsafeRegister.activation.authorized = true
    expect(() =>
      applyCaptureToOperationalRegister(unsafeRegister, capture),
    ).toThrow(
      expect.objectContaining({
        code: "RECONCILER_REGISTER_ACTIVATION_BOUNDARY_INVALID",
      }),
    )
  })

  it("requires HTTPS outside local development and a strong secret", () => {
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_RECONCILER_BASE_URL: "http://example.invalid",
        STOQUIFY_AGENT_RECONCILER_SECRET: SECRET,
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "RECONCILER_HTTPS_REQUIRED",
      }),
    )
    expect(() =>
      resolveCaptureConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_RECONCILER_BASE_URL: "https://example.invalid",
        STOQUIFY_AGENT_RECONCILER_SECRET: "too-short",
        STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "RECONCILER_SECRET_INVALID",
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
  return captureAgentReconcilerEvidence({
    environment: captureEnvironment(),
    fetchImpl,
    now: NOW,
  })
}

function captureEnvironment() {
  return {
    NODE_ENV: "production",
    STOQUIFY_AGENT_RECONCILER_BASE_URL:
      "https://internal-pilot.example.test",
    STOQUIFY_AGENT_RECONCILER_SECRET: SECRET,
    STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "internal_pilot",
  }
}

function readyPayload() {
  const windows = [
    windowPayload("13:30:00", "13:30:20"),
    windowPayload("13:25:00", "13:25:20"),
    windowPayload("13:20:00", "13:20:20"),
  ]
  return {
    ok: true,
    data: {
      ready: true,
      environment: "internal_pilot",
      scheduleKey: "agent-runtime-control-plane",
      intervalMinutes: 5,
      blockers: [],
      requiredSuccessfulWindows: 3,
      successfulWindowCount: 3,
      latestScheduledAt: windows[0].scheduledAt,
      latestCompletedAt: windows[0].completedAt,
      windows,
      activeInvocation: false,
      activeLeaseStale: false,
      alertTransportReady: true,
    },
  }
}

function windowPayload(scheduledTime, completedTime) {
  return {
    runId: `agent-runtime:internal_pilot:2026-07-25T${scheduledTime}.000Z`,
    status: "COMPLETED",
    scheduledAt: `2026-07-25T${scheduledTime}.000Z`,
    completedAt: `2026-07-25T${completedTime}.000Z`,
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
    owners: [],
    scheduler: {
      provider: "managed-scheduler",
    },
    alerting: {},
    credentialRotation: {},
    activation: {
      requested: false,
      authorized: false,
      activatedAt: null,
    },
  }
}
