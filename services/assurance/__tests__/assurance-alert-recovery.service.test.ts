jest.mock("server-only", () => ({}));
jest.mock("@/prisma/db", () => ({ db: mockPrismaClient() }));

function mockPrismaClient() {
  const client = {
    user: {
      count: jest.fn(),
    },
    workflowAssuranceAlertDelivery: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    workflowAssuranceIncidentEvent: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  client.$transaction.mockImplementation(
    async (callback: (tx: typeof client) => unknown) => callback(client),
  );
  return client;
}

import { createHash } from "node:crypto";

import { db } from "@/prisma/db";

import { recoverWorkflowAssuranceDeadLetter } from "../assurance-alert-recovery.service";

const mockDb = db as unknown as ReturnType<typeof mockPrismaClient>;
const now = new Date("2026-07-24T12:00:00.000Z");
const recoveryInput = {
  organizationId: "org-1",
  deliveryId: "delivery-dead",
  actorId: "operator-1",
  reason: "Retry after the production alert endpoint recovered.",
  idempotencyKey: "recovery-request-1",
  now,
};

describe("workflow assurance dead-letter recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.user.count.mockResolvedValue(1);
    mockDb.workflowAssuranceIncidentEvent.create.mockResolvedValue({
      id: "event-1",
    });
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  it("creates an audited pending successor while preserving the dead letter", async () => {
    mockDb.workflowAssuranceAlertDelivery.findFirst
      .mockResolvedValueOnce(deadLetterFixture())
      .mockResolvedValueOnce(null);
    mockDb.workflowAssuranceAlertDelivery.create.mockResolvedValue({
      id: "delivery-recovery",
    });

    const result = await recoverWorkflowAssuranceDeadLetter(recoveryInput);

    expect(result).toEqual({
      sourceDeliveryId: "delivery-dead",
      recoveryDeliveryId: "delivery-recovery",
      status: "PENDING",
      requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      replayed: false,
    });
    expect(mockDb.workflowAssuranceAlertDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        incidentId: "incident-1",
        channel: "WEBHOOK",
        status: "PENDING",
        attemptCount: 0,
        nextAttemptAt: now,
        metadata: expect.objectContaining({
          recoveryOfDeliveryId: "delivery-dead",
          recoveryReason: recoveryInput.reason,
          recoveredById: "operator-1",
        }),
      }),
      select: { id: true },
    });
    expect(mockDb.workflowAssuranceIncidentEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        incidentId: "incident-1",
        actorId: "operator-1",
        eventType: "ALERT_RECORDED",
      }),
    });
    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityId: "delivery-recovery",
        action: "WORKFLOW_ASSURANCE_ALERT_RECOVERY_QUEUED",
        organizationId: "org-1",
        userId: "operator-1",
      }),
    });
  });

  it("returns the same successor for an identical recovery replay", async () => {
    const requestHash = expectedRequestHash(recoveryInput);
    mockDb.workflowAssuranceAlertDelivery.findFirst
      .mockResolvedValueOnce(deadLetterFixture())
      .mockResolvedValueOnce({
        id: "delivery-recovery",
        metadata: { recoveryRequestHash: requestHash },
      });

    await expect(
      recoverWorkflowAssuranceDeadLetter(recoveryInput),
    ).resolves.toEqual({
      sourceDeliveryId: "delivery-dead",
      recoveryDeliveryId: "delivery-recovery",
      status: "PENDING",
      requestHash,
      replayed: true,
    });
    expect(mockDb.workflowAssuranceAlertDelivery.create).not.toHaveBeenCalled();
    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects an idempotency key reused for different recovery evidence", async () => {
    mockDb.workflowAssuranceAlertDelivery.findFirst
      .mockResolvedValueOnce(deadLetterFixture())
      .mockResolvedValueOnce({
        id: "delivery-recovery",
        metadata: { recoveryRequestHash: "different-request" },
      });

    await expect(
      recoverWorkflowAssuranceDeadLetter(recoveryInput),
    ).rejects.toThrow(
      "Dead-letter recovery idempotency key conflicts with another request.",
    );
  });

  it("rejects a delivery that is not a terminal dead letter", async () => {
    mockDb.workflowAssuranceAlertDelivery.findFirst
      .mockResolvedValueOnce(deadLetterFixture({ status: "PENDING" }))
      .mockResolvedValueOnce(null);

    await expect(
      recoverWorkflowAssuranceDeadLetter(recoveryInput),
    ).rejects.toThrow("Only terminal dead-letter deliveries can be recovered.");
  });

  it("fails closed for another tenant or an inactive operator", async () => {
    mockDb.workflowAssuranceAlertDelivery.findFirst.mockResolvedValueOnce(null);
    await expect(
      recoverWorkflowAssuranceDeadLetter(recoveryInput),
    ).rejects.toThrow("Workflow assurance alert delivery was not found.");

    mockDb.workflowAssuranceAlertDelivery.findFirst.mockResolvedValueOnce(
      deadLetterFixture(),
    );
    mockDb.user.count.mockResolvedValueOnce(0);
    await expect(
      recoverWorkflowAssuranceDeadLetter(recoveryInput),
    ).rejects.toThrow(
      "Dead-letter recovery requires an active tenant operator.",
    );
  });
});

function deadLetterFixture(input?: { status?: string }) {
  return {
    id: "delivery-dead",
    organizationId: "org-1",
    incidentId: "incident-1",
    channel: "WEBHOOK",
    status: input?.status ?? "DEAD_LETTER",
    recipientId: null,
    recipientRole: "owner",
    title: "Stoquify agent runtime control requires attention",
    message: "Review the linked Workflow Assurance incident.",
    actionRoute: "/en/dashboard/assurance",
    attemptCount: 5,
  };
}

function expectedRequestHash(input: typeof recoveryInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        actorId: input.actorId,
        deliveryId: input.deliveryId,
        organizationId: input.organizationId,
        reason: input.reason,
      }),
    )
    .digest("hex");
}
