jest.mock("server-only", () => ({}));
jest.mock("@/prisma/db", () => ({ db: {} }));
jest.mock("@/services/assurance/assurance-alert-delivery.service", () => ({
  resolveAssuranceAlertTransportReadiness: jest.fn(),
}));

import {
  AgentReconcilerInvocationError,
  assessAgentReconcilerReadiness,
  resolveAgentReconcilerInvocationEnvelope,
  resolveAgentReconcilerSchedulePolicy,
} from "../agent-reconciler-invocation.service";

const now = new Date("2026-07-24T19:30:30.000Z");

describe("agent reconciler invocation controls", () => {
  it("normalizes a fresh scheduler envelope with a stable request hash", () => {
    const input = {
      runId: "agent-runtime:pilot:2026-07-24T19:30:00.000Z",
      scheduledAt: "2026-07-24T19:30:00.000Z",
      environment: "PILOT",
      now,
    };

    const first = resolveAgentReconcilerInvocationEnvelope(input);
    const replay = resolveAgentReconcilerInvocationEnvelope(input);

    expect(first).toEqual({
      environment: "pilot",
      scheduleKey: "agent-runtime-control-plane",
      runId: input.runId,
      correlationId: input.runId,
      scheduledAt: new Date(input.scheduledAt),
      requestHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
    expect(replay.requestHash).toBe(first.requestHash);
  });

  it.each([
    {
      runId: null,
      scheduledAt: "2026-07-24T19:30:00.000Z",
      code: "RECONCILER_INVOCATION_INVALID",
    },
    {
      runId: "agent-runtime:pilot:future",
      scheduledAt: "2026-07-24T19:32:00.000Z",
      code: "RECONCILER_INVOCATION_FUTURE",
    },
    {
      runId: "agent-runtime:pilot:stale",
      scheduledAt: "2026-07-24T19:19:00.000Z",
      code: "RECONCILER_INVOCATION_STALE",
    },
  ])("fails closed for an invalid scheduler envelope", (fixture) => {
    expect(() =>
      resolveAgentReconcilerInvocationEnvelope({
        ...fixture,
        environment: "pilot",
        now,
      }),
    ).toThrow(
      expect.objectContaining<Partial<AgentReconcilerInvocationError>>({
        code: fixture.code as AgentReconcilerInvocationError["code"],
      }),
    );
  });

  it("fixes cadence at five minutes and bounds lease duration", () => {
    expect(
      resolveAgentReconcilerSchedulePolicy({
        STOQUIFY_AGENT_RECONCILER_LEASE_MINUTES: "2",
      }),
    ).toEqual({ intervalMinutes: 5, leaseMinutes: 5 });
    expect(
      resolveAgentReconcilerSchedulePolicy({
        STOQUIFY_AGENT_RECONCILER_LEASE_MINUTES: "90",
      }),
    ).toEqual({ intervalMinutes: 5, leaseMinutes: 30 });
  });

  it("requires three consecutive fresh successful windows", () => {
    expect(
      assessAgentReconcilerReadiness({
        invocations: successfulWindows(),
        activeStartedAt: null,
        secretConfigured: true,
        alertTransportReady: true,
        now,
        leaseMinutes: 10,
      }),
    ).toEqual({
      ready: true,
      blockers: [],
      requiredSuccessfulWindows: 3,
      successfulWindowCount: 3,
      latestScheduledAt: "2026-07-24T19:30:00.000Z",
      latestCompletedAt: "2026-07-24T19:30:20.000Z",
      windows: [
        {
          runId: "agent-runtime:pilot:2026-07-24T19:30:00.000Z",
          status: "COMPLETED",
          scheduledAt: "2026-07-24T19:30:00.000Z",
          completedAt: "2026-07-24T19:30:20.000Z",
        },
        {
          runId: "agent-runtime:pilot:2026-07-24T19:25:00.000Z",
          status: "COMPLETED",
          scheduledAt: "2026-07-24T19:25:00.000Z",
          completedAt: "2026-07-24T19:25:20.000Z",
        },
        {
          runId: "agent-runtime:pilot:2026-07-24T19:20:00.000Z",
          status: "COMPLETED",
          scheduledAt: "2026-07-24T19:20:00.000Z",
          completedAt: "2026-07-24T19:20:20.000Z",
        },
      ],
      activeInvocation: false,
      activeLeaseStale: false,
      alertTransportReady: true,
    });
  });

  it("reports missing infrastructure and incomplete cadence without secrets", () => {
    const result = assessAgentReconcilerReadiness({
      invocations: successfulWindows().slice(0, 1),
      activeStartedAt: null,
      secretConfigured: false,
      alertTransportReady: false,
      now,
      leaseMinutes: 10,
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual([
      "RECONCILER_SECRET_UNAVAILABLE",
      "RECONCILER_ALERT_TRANSPORT_UNHEALTHY",
      "RECONCILER_SUCCESS_WINDOWS_INCOMPLETE",
    ]);
  });

  it("detects failed, stale, irregular, and stale-lease windows", () => {
    const windows = successfulWindows();
    windows[0].status = "FAILED";
    windows[1].scheduledAt = new Date("2026-07-24T19:20:00.000Z");

    const result = assessAgentReconcilerReadiness({
      invocations: windows,
      activeStartedAt: new Date("2026-07-24T19:19:00.000Z"),
      secretConfigured: true,
      alertTransportReady: true,
      now: new Date("2026-07-24T19:40:00.000Z"),
      leaseMinutes: 10,
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "RECONCILER_WINDOW_FAILED",
        "RECONCILER_CADENCE_STALE",
        "RECONCILER_CADENCE_IRREGULAR",
        "RECONCILER_LEASE_STALE",
      ]),
    );
  });
});

function successfulWindows() {
  return [
    {
      runId: "agent-runtime:pilot:2026-07-24T19:30:00.000Z",
      status: "COMPLETED",
      scheduledAt: new Date("2026-07-24T19:30:00.000Z"),
      startedAt: new Date("2026-07-24T19:30:01.000Z"),
      completedAt: new Date("2026-07-24T19:30:20.000Z"),
    },
    {
      runId: "agent-runtime:pilot:2026-07-24T19:25:00.000Z",
      status: "COMPLETED",
      scheduledAt: new Date("2026-07-24T19:25:00.000Z"),
      startedAt: new Date("2026-07-24T19:25:01.000Z"),
      completedAt: new Date("2026-07-24T19:25:20.000Z"),
    },
    {
      runId: "agent-runtime:pilot:2026-07-24T19:20:00.000Z",
      status: "COMPLETED",
      scheduledAt: new Date("2026-07-24T19:20:00.000Z"),
      startedAt: new Date("2026-07-24T19:20:01.000Z"),
      completedAt: new Date("2026-07-24T19:20:20.000Z"),
    },
  ];
}
