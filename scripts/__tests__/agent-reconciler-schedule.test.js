const {
  buildScheduleEnvelope,
  invokeAgentReconciler,
  resolveWorkerConfig,
  shouldRetryResponse,
} = require("../run-agent-reconciler-schedule")

const SECRET = "0123456789abcdef0123456789abcdef"

describe("agent reconciler schedule worker", () => {
  it("builds one deterministic run identity per five-minute window", () => {
    expect(
      buildScheduleEnvelope(
        new Date("2026-07-24T19:34:59.999Z"),
        "pilot",
      ),
    ).toEqual({
      scheduledAt: new Date("2026-07-24T19:30:00.000Z"),
      runId: "agent-runtime:pilot:2026-07-24T19:30:00.000Z",
    })
  })

  it("requires a strong secret and HTTPS outside local development", () => {
    expect(() =>
      resolveWorkerConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_RECONCILER_BASE_URL: "http://stoquify.example",
        STOQUIFY_AGENT_RECONCILER_SECRET: SECRET,
      }),
    ).toThrow("must use HTTPS")
    expect(() =>
      resolveWorkerConfig({
        NODE_ENV: "production",
        STOQUIFY_AGENT_RECONCILER_BASE_URL: "https://stoquify.example",
        STOQUIFY_AGENT_RECONCILER_SECRET: "short",
      }),
    ).toThrow("at least 32 characters")
  })

  it("sends authenticated schedule identity without returning the secret", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      response(200, {
        replayed: false,
        status: "COMPLETED",
        data: { correlationId: "stored-correlation" },
      }),
    )

    const result = await invokeAgentReconciler({
      environment: workerEnvironment(),
      now: new Date("2026-07-24T19:34:00.000Z"),
      fetchImpl,
    })

    expect(result).toEqual({
      ok: true,
      attempt: 1,
      runId: "agent-runtime:pilot:2026-07-24T19:30:00.000Z",
      scheduledAt: "2026-07-24T19:30:00.000Z",
      replayed: false,
      status: "COMPLETED",
      correlationId: "stored-correlation",
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(
        "https://stoquify.example/api/internal/agents/reconcile-abandoned",
      ),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: `Bearer ${SECRET}`,
          "x-stoquify-scheduler-run-id":
            "agent-runtime:pilot:2026-07-24T19:30:00.000Z",
          "x-stoquify-scheduler-scheduled-at":
            "2026-07-24T19:30:00.000Z",
        }),
      }),
    )
    expect(JSON.stringify(result)).not.toContain(SECRET)
  })

  it("retries a transport failure with the same run identity", async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(
        response(200, {
          replayed: true,
          status: "COMPLETED",
          correlationId: "agent-runtime:pilot:2026-07-24T19:30:00.000Z",
        }),
      )
    const sleepImpl = jest.fn().mockResolvedValue(undefined)

    const result = await invokeAgentReconciler({
      environment: workerEnvironment(),
      now: new Date("2026-07-24T19:34:00.000Z"),
      fetchImpl,
      sleepImpl,
    })

    expect(result.attempt).toBe(2)
    expect(result.replayed).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(sleepImpl).toHaveBeenCalledWith(1000)
    const firstHeaders = fetchImpl.mock.calls[0][1].headers
    const secondHeaders = fetchImpl.mock.calls[1][1].headers
    expect(secondHeaders["x-stoquify-scheduler-run-id"]).toBe(
      firstHeaders["x-stoquify-scheduler-run-id"],
    )
  })

  it("retries only overlap and server-side responses", () => {
    expect(
      shouldRetryResponse(409, {
        code: "RECONCILER_INVOCATION_IN_PROGRESS",
      }),
    ).toBe(true)
    expect(shouldRetryResponse(503, null)).toBe(true)
    expect(
      shouldRetryResponse(409, { code: "RECONCILER_INVOCATION_CONFLICT" }),
    ).toBe(false)
    expect(shouldRetryResponse(401, null)).toBe(false)
  })
})

function workerEnvironment() {
  return {
    NODE_ENV: "production",
    STOQUIFY_AGENT_RECONCILER_BASE_URL: "https://stoquify.example",
    STOQUIFY_AGENT_RECONCILER_SECRET: SECRET,
    STOQUIFY_AGENT_RELEASE_ENVIRONMENT: "pilot",
    STOQUIFY_AGENT_RECONCILER_MAX_ATTEMPTS: "3",
    STOQUIFY_AGENT_RECONCILER_TIMEOUT_MS: "10000",
  }
}

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(payload),
  }
}
