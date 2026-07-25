jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock("@/services/agents/agent-reconciler-auth.service", () => ({
  isAgentReconcilerConfigured: jest.fn(
    (secret: string | undefined) => (secret?.length ?? 0) >= 32,
  ),
  isAuthorizedAgentReconciler: jest.fn(),
  resolveAgentReconcilerPolicy: jest.fn(() => ({
    olderThanMinutes: 15,
    limit: 100,
  })),
}));
jest.mock(
  "@/services/agents/agent-control-plane-reconciliation.service",
  () => ({
    reconcileAgentRuntimeControlPlane: jest.fn(),
  }),
);
jest.mock("@/services/agents/agent-reconciler-invocation.service", () => {
  class AgentReconcilerInvocationError extends Error {}
  return {
    AgentReconcilerInvocationError,
    beginAgentReconcilerInvocation: jest.fn(),
    completeAgentReconcilerInvocation: jest.fn(),
    failAgentReconcilerInvocation: jest.fn(),
    getAgentReconcilerReadiness: jest.fn(),
    resolveAgentReconcilerInvocationEnvelope: jest.fn(),
  };
});
jest.mock("@/services/agents/agent-run-governance.service", () => ({
  reconcileAbandonedAgentRuns: jest.fn(),
}));
jest.mock("@/services/assurance/assurance-alert-delivery.service", () => ({
  dispatchWorkflowAssuranceWebhookAlerts: jest.fn(),
}));

import { isAuthorizedAgentReconciler } from "@/services/agents/agent-reconciler-auth.service";
import { reconcileAgentRuntimeControlPlane } from "@/services/agents/agent-control-plane-reconciliation.service";
import {
  beginAgentReconcilerInvocation,
  completeAgentReconcilerInvocation,
  failAgentReconcilerInvocation,
  getAgentReconcilerReadiness,
  resolveAgentReconcilerInvocationEnvelope,
} from "@/services/agents/agent-reconciler-invocation.service";
import { reconcileAbandonedAgentRuns } from "@/services/agents/agent-run-governance.service";
import { dispatchWorkflowAssuranceWebhookAlerts } from "@/services/assurance/assurance-alert-delivery.service";

import { GET, POST } from "../route";

const SECRET = "0123456789abcdef0123456789abcdef";
const scheduledAt = new Date("2026-07-24T19:30:00.000Z");
const envelope = {
  environment: "pilot",
  scheduleKey: "agent-runtime-control-plane" as const,
  runId: "agent-runtime:pilot:2026-07-24T19:30:00.000Z",
  correlationId: "agent-runtime:pilot:2026-07-24T19:30:00.000Z",
  scheduledAt,
  requestHash: `sha256:${"a".repeat(64)}`,
};

const mockAuthorize = isAuthorizedAgentReconciler as jest.Mock;
const mockResolveEnvelope =
  resolveAgentReconcilerInvocationEnvelope as jest.Mock;
const mockBegin = beginAgentReconcilerInvocation as jest.Mock;
const mockComplete = completeAgentReconcilerInvocation as jest.Mock;
const mockFail = failAgentReconcilerInvocation as jest.Mock;
const mockReadiness = getAgentReconcilerReadiness as jest.Mock;
const mockReconcileRuns = reconcileAbandonedAgentRuns as jest.Mock;
const mockControlPlane = reconcileAgentRuntimeControlPlane as jest.Mock;
const mockAlertDelivery = dispatchWorkflowAssuranceWebhookAlerts as jest.Mock;

describe("/api/internal/agents/reconcile-abandoned", () => {
  const originalSecret = process.env.STOQUIFY_AGENT_RECONCILER_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STOQUIFY_AGENT_RECONCILER_SECRET = SECRET;
    mockAuthorize.mockReturnValue(true);
    mockResolveEnvelope.mockReturnValue(envelope);
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.STOQUIFY_AGENT_RECONCILER_SECRET;
    } else {
      process.env.STOQUIFY_AGENT_RECONCILER_SECRET = originalSecret;
    }
  });

  it("returns 503 when the server-side secret is missing", async () => {
    delete process.env.STOQUIFY_AGENT_RECONCILER_SECRET;

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Agent reconciler is not configured.",
    });
    expect(mockBegin).not.toHaveBeenCalled();
  });

  it("returns 401 before scheduler parsing for an unauthorized request", async () => {
    mockAuthorize.mockReturnValue(false);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mockResolveEnvelope).not.toHaveBeenCalled();
  });

  it("records a stable invocation around the complete reconciliation flow", async () => {
    mockBegin.mockResolvedValue({
      kind: "acquired",
      invocation: { id: "invocation-1" },
    });
    mockReconcileRuns.mockResolvedValue(2);
    mockControlPlane.mockResolvedValue({
      scanned: 1,
      passed: 1,
      failed: 0,
      incidents: 0,
      suspended: 0,
      alertTransportReady: true,
      alertTransportReason: null,
    });
    mockAlertDelivery.mockResolvedValue({
      ready: true,
      delivered: 1,
      retried: 0,
      failed: 0,
      deadLettered: 0,
    });
    mockComplete.mockResolvedValue({ id: "invocation-1" });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        ok: true,
        replayed: false,
        status: "COMPLETED",
      }),
    );
    expect(mockReconcileRuns).toHaveBeenCalledWith({
      olderThan: new Date("2026-07-24T19:15:00.000Z"),
      limit: 100,
    });
    expect(mockControlPlane).toHaveBeenCalledWith({
      correlationId: envelope.correlationId,
      executionKey: envelope.runId,
      now: scheduledAt,
    });
    expect(mockComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        invocationId: "invocation-1",
        completedWithWarnings: false,
      }),
    );
  });

  it("returns a completed replay without executing the reconciler twice", async () => {
    mockBegin.mockResolvedValue({
      kind: "replayed",
      invocation: {
        status: "COMPLETED",
        result: { reconciledCount: 2 },
        failureCode: null,
      },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        ok: true,
        replayed: true,
        status: "COMPLETED",
      }),
    );
    expect(mockReconcileRuns).not.toHaveBeenCalled();
    expect(mockControlPlane).not.toHaveBeenCalled();
  });

  it("returns 409 while the same invocation is still running", async () => {
    mockBegin.mockResolvedValue({
      kind: "in_progress",
      invocation: { status: "RUNNING" },
    });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        code: "RECONCILER_INVOCATION_IN_PROGRESS",
        correlationId: envelope.correlationId,
      }),
    );
  });

  it("exposes authenticated cadence readiness without secret material", async () => {
    mockReadiness.mockResolvedValue({
      ready: false,
      environment: "pilot",
      blockers: ["RECONCILER_SUCCESS_WINDOWS_INCOMPLETE"],
      alertTransportReady: true,
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      ok: false,
      data: expect.objectContaining({
        blockers: ["RECONCILER_SUCCESS_WINDOWS_INCOMPLETE"],
      }),
    });
    expect(JSON.stringify(body)).not.toContain(SECRET);
  });

  it("returns a sanitized 503 when readiness persistence is unavailable", async () => {
    mockReadiness.mockRejectedValue(new Error("database connection details"));

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Agent reconciler readiness is unavailable.",
      code: "RECONCILER_READINESS_UNAVAILABLE",
    });
  });

  it("does not expose a secondary failure while recording execution failure", async () => {
    mockBegin.mockResolvedValue({
      kind: "acquired",
      invocation: { id: "invocation-1" },
    });
    mockReconcileRuns.mockRejectedValue(
      new Error("protected database details"),
    );
    mockFail.mockRejectedValue(new Error("ledger database details"));

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: "Agent reconciliation failed.",
      code: "RECONCILER_EXECUTION_FAILED",
      correlationId: envelope.correlationId,
    });
    expect(JSON.stringify(body)).not.toContain("database details");
  });
});

function request() {
  return {
    headers: new Headers({
      authorization: `Bearer ${SECRET}`,
      "x-stoquify-scheduler-run-id": envelope.runId,
      "x-stoquify-scheduler-scheduled-at": scheduledAt.toISOString(),
    }),
  } as never;
}
