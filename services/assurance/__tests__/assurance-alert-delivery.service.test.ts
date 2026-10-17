jest.mock("server-only", () => ({}));
jest.mock("@/prisma/db", () => ({ db: mockPrismaClient() }));

function mockPrismaClient() {
  return {
    workflowAssuranceIncident: {
      findUnique: jest.fn(),
    },
    workflowAssuranceAlertDelivery: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

import { db } from "@/prisma/db";

import {
  dispatchWorkflowAssuranceWebhookAlerts,
  queueWorkflowAssuranceWebhookDelivery,
  workflowAssuranceRetryDelayMs,
} from "../assurance-alert-delivery.service";

const mockDb = db as unknown as ReturnType<typeof mockPrismaClient>;
const originalUrl = process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL;
const originalSecret = process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET;

describe("workflow assurance webhook delivery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL =
      "https://alerts.example.test/assurance";
    process.env.STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET =
      "test-only-assurance-secret-32-characters";
    mockDb.workflowAssuranceAlertDelivery.updateMany.mockResolvedValue({
      count: 0,
    });
    mockDb.workflowAssuranceAlertDelivery.findMany.mockResolvedValue([]);
  });

  afterAll(() => {
    restoreEnv("STOQUIFY_ASSURANCE_ALERT_WEBHOOK_URL", originalUrl);
    restoreEnv("STOQUIFY_ASSURANCE_ALERT_WEBHOOK_SECRET", originalSecret);
  });

  it("deduplicates without resurrecting a terminal delivery", async () => {
    mockDb.workflowAssuranceIncident.findUnique.mockResolvedValue({
      id: "incident-1",
      organizationId: "org-1",
      sourceHash: "sha256:source",
      severity: "BLOCKING",
      actionRoute: "/en/dashboard/assurance",
      assignedRole: "owner",
    });
    mockDb.workflowAssuranceAlertDelivery.upsert.mockResolvedValue({
      id: "delivery-1",
      status: "DEAD_LETTER",
    });

    await queueWorkflowAssuranceWebhookDelivery({
      incidentId: "incident-1",
      reason: "created",
    });

    const update =
      mockDb.workflowAssuranceAlertDelivery.upsert.mock.calls[0][0].update;
    expect(update).not.toHaveProperty("status");
    expect(update).not.toHaveProperty("nextAttemptAt");
    expect(update).not.toHaveProperty("attemptCount");
  });

  it("uses bounded exponential jitter", () => {
    expect(workflowAssuranceRetryDelayMs(1, () => 0)).toBe(24_000);
    expect(workflowAssuranceRetryDelayMs(1, () => 1)).toBe(30_000);
    expect(workflowAssuranceRetryDelayMs(20, () => 1)).toBe(3_600_000);
    expect(workflowAssuranceRetryDelayMs(1, () => Number.NaN)).toBe(27_000);
  });

  it("requeues a failed attempt with deterministic jitter", async () => {
    const now = new Date("2026-07-24T12:00:00.000Z");
    mockDb.workflowAssuranceAlertDelivery.findMany.mockResolvedValue([
      deliveryFixture({ attemptCount: 0 }),
    ]);
    mockDb.workflowAssuranceAlertDelivery.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    mockDb.workflowAssuranceAlertDelivery.update.mockResolvedValue({
      id: "delivery-1",
    });

    const result = await dispatchWorkflowAssuranceWebhookAlerts({
      now,
      random: () => 0,
      fetchImpl: jest.fn().mockRejectedValue(new Error("network down")),
    });

    expect(result).toEqual({
      ready: true,
      delivered: 0,
      retried: 1,
      failed: 0,
      deadLettered: 0,
    });
    expect(mockDb.workflowAssuranceAlertDelivery.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "delivery-1", organizationId: "org-1", status: "PROCESSING", lockedAt: now, attemptCount: 1 }),
      data: expect.objectContaining({
        status: "PENDING",
        failedAt: null,
        nextAttemptAt: new Date(now.getTime() + 24_000),
        lockedAt: null,
        lockedBy: null,
      }),
    });
  });

  it.each(["success", "failure"])("does not acknowledge a lost lease after %s", async outcome => {
    mockDb.workflowAssuranceAlertDelivery.findMany.mockResolvedValue([deliveryFixture({ attemptCount: 0 })]);
    mockDb.workflowAssuranceAlertDelivery.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const result = await dispatchWorkflowAssuranceWebhookAlerts({ workerId: "old-worker", fetchImpl: async () => {
      if (outcome === "failure") throw new Error("old request failed");
      return new Response("ok");
    } });
    expect(result).toMatchObject({ delivered: 0, retried: 0, deadLettered: 0 });
    expect(mockDb.workflowAssuranceAlertDelivery.updateMany.mock.calls[2][0].where).toMatchObject({ id: "delivery-1", organizationId: "org-1", status: "PROCESSING", lockedBy: "old-worker", attemptCount: 1, lockedAt: expect.any(Date) });
  });

  it("uses distinct delivery keys for equal source hashes and stable keys on retry", async () => {
    const keys: string[] = [];
    for (const id of ["delivery-1", "delivery-2", "delivery-1"]) {
      mockDb.workflowAssuranceAlertDelivery.findMany.mockResolvedValue([{ ...deliveryFixture({ attemptCount: 0 }), id }]);
      mockDb.workflowAssuranceAlertDelivery.updateMany.mockResolvedValue({ count: 1 });
      await dispatchWorkflowAssuranceWebhookAlerts({ fetchImpl: async (_url, init) => {
        keys.push((init?.headers as Record<string, string>)["idempotency-key"]);
        expect(JSON.parse(String(init?.body)).idempotencyKey).toBe(keys.at(-1));
        return new Response("ok");
      } });
    }
    expect(keys[0]).not.toBe(keys[1]); expect(keys[0]).toBe(keys[2]);
  });

  it("does not send an already exhausted crash retry", async () => {
    mockDb.workflowAssuranceAlertDelivery.findMany.mockResolvedValue([deliveryFixture({ attemptCount: 5 })]);
    mockDb.workflowAssuranceAlertDelivery.updateMany.mockResolvedValue({ count: 1 });
    const fetchImpl = jest.fn();
    expect(await dispatchWorkflowAssuranceWebhookAlerts({ fetchImpl })).toMatchObject({ failed: 1, deadLettered: 1, delivered: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("dead-letters an exhausted delivery", async () => {
    const now = new Date("2026-07-24T12:00:00.000Z");
    mockDb.workflowAssuranceAlertDelivery.findMany.mockResolvedValue([
      deliveryFixture({ attemptCount: 4 }),
    ]);
    mockDb.workflowAssuranceAlertDelivery.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    mockDb.workflowAssuranceAlertDelivery.update.mockResolvedValue({
      id: "delivery-1",
    });

    const result = await dispatchWorkflowAssuranceWebhookAlerts({
      now,
      fetchImpl: jest.fn().mockRejectedValue(new Error("network down")),
    });

    expect(result).toEqual({
      ready: true,
      delivered: 0,
      retried: 0,
      failed: 1,
      deadLettered: 1,
    });
    expect(mockDb.workflowAssuranceAlertDelivery.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "delivery-1", organizationId: "org-1", status: "PROCESSING", lockedAt: now, attemptCount: 5 }),
      data: expect.objectContaining({
        status: "DEAD_LETTER",
        failedAt: now,
        nextAttemptAt: null,
        lockedAt: null,
        lockedBy: null,
      }),
    });
  });
});

function deliveryFixture(input: { attemptCount: number }) {
  return {
    id: "delivery-1",
    organizationId: "org-1",
    dedupeKey: "created:sha256:source",
    attemptCount: input.attemptCount,
    incident: {
      id: "incident-1",
      organizationId: "org-1",
      workflow: "AGENT_RUNTIME",
      checkKey: "agent-runtime-release-control",
      sourceType: "agent_activation_package",
      sourceId: "release-1",
      severity: "BLOCKING",
      actionRoute: "/en/dashboard/assurance",
    },
  };
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
