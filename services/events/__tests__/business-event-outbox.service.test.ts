import {
  ApplicationError,
  NotFoundError,
} from "@/services/_shared/action-errors"

import {
  businessEventOutboxRetryAt,
  claimBusinessEventOutboxMessages,
  getBusinessEventOutboxReadiness,
  markBusinessEventOutboxDelivered,
  markBusinessEventOutboxFailed,
} from "../business-event-outbox.service"

function message(overrides: Record<string, unknown> = {}) {
  return {
    id: "outbox-1",
    organizationId: "org-1",
    businessEventId: "event-1",
    channel: "WEBHOOK",
    eventName: "payment.captured",
    destination: null,
    idempotencyKey: "payment-1",
    payloadHash: "payload-hash",
    payload: { paymentId: "payment-1" },
    status: "PENDING",
    attempts: 0,
    maxAttempts: 3,
    availableAt: new Date("2026-08-23T10:00:00.000Z"),
    lockedAt: null,
    lockedBy: null,
    correlationId: "corr-1",
    ...overrides,
  }
}

function createClient() {
  const store = {
    businessEventOutbox: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    businessEventAudit: {
      create: jest.fn(),
    },
  }

  return {
    ...store,
    $transaction: jest.fn(async (callback) => callback(store)),
  }
}

describe("business event outbox gateway", () => {
  const now = new Date("2026-08-23T10:05:00.000Z")

  it("claims only tenant-scoped messages with a bounded lease attempt", async () => {
    const client = createClient()
    client.businessEventOutbox.findMany.mockResolvedValue([message()])
    client.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })

    const claimed = await claimBusinessEventOutboxMessages(
      { organizationId: "org-1", workerId: "worker-1", now },
      client,
    )

    expect(claimed).toEqual([
      expect.objectContaining({
        id: "outbox-1",
        organizationId: "org-1",
        status: "LOCKED",
        attempts: 1,
        lockedBy: "worker-1",
      }),
    ])
    expect(client.businessEventOutbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1" }),
      }),
    )
    expect(client.businessEventOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "outbox-1",
          organizationId: "org-1",
          attempts: 0,
        }),
        data: expect.objectContaining({
          status: "LOCKED",
          lockedBy: "worker-1",
          attempts: { increment: 1 },
        }),
      }),
    )
  })

  it("dead-letters an exhausted candidate instead of leasing it again", async () => {
    const client = createClient()
    client.businessEventOutbox.findMany.mockResolvedValue([
      message({ status: "FAILED", attempts: 3, maxAttempts: 3 }),
    ])
    client.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })

    await expect(
      claimBusinessEventOutboxMessages(
        { organizationId: "org-1", workerId: "worker-1", now },
        client,
      ),
    ).resolves.toEqual([])
    expect(client.businessEventOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          attempts: 3,
        }),
        data: expect.objectContaining({
          status: "DEAD_LETTER",
          lastErrorCode: "RETRY_EXHAUSTED",
        }),
      }),
    )
  })

  it("completes delivery and audit evidence in the same transaction", async () => {
    const client = createClient()
    client.businessEventOutbox.findFirst.mockResolvedValue(
      message({
        status: "LOCKED",
        attempts: 1,
        lockedBy: "worker-1",
        businessEvent: {
          eventSource: "PROVIDER_WEBHOOK",
          payloadHash: "event-hash",
          correlationId: "corr-event",
        },
      }),
    )
    client.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })

    await expect(
      markBusinessEventOutboxDelivered(
        {
          organizationId: "org-1",
          workerId: "worker-1",
          messageId: "outbox-1",
          now,
        },
        client,
      ),
    ).resolves.toMatchObject({ status: "SENT" })

    expect(client.businessEventOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          lockedBy: "worker-1",
        }),
        data: expect.objectContaining({ status: "SENT", processedAt: now }),
      }),
    )
    expect(client.businessEventAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          businessEventId: "event-1",
          action: "OUTBOX_DELIVERED",
          correlationId: "corr-1",
        }),
      }),
    )
  })

  it("retries a safe typed failure without persisting raw unknown error details", async () => {
    const client = createClient()
    client.businessEventOutbox.findFirst.mockResolvedValue(
      message({
        status: "LOCKED",
        attempts: 1,
        lockedBy: "worker-1",
        businessEvent: {
          eventSource: "PROVIDER_WEBHOOK",
          payloadHash: "event-hash",
          correlationId: "corr-event",
        },
      }),
    )
    client.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })

    const result = await markBusinessEventOutboxFailed(
      {
        organizationId: "org-1",
        workerId: "worker-1",
        messageId: "outbox-1",
        error: new Error("postgresql://secret@host/database"),
        now,
      },
      client,
    )

    expect(result).toMatchObject({
      status: "FAILED",
      errorCode: "INTERNAL_ERROR",
      availableAt: businessEventOutboxRetryAt(1, now),
    })
    expect(client.businessEventOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          lastErrorCode: "INTERNAL_ERROR",
          lastErrorMessage: "Business-event outbox delivery failed.",
        }),
      }),
    )
  })

  it("dead-letters the final failed attempt and records the terminal audit", async () => {
    const client = createClient()
    client.businessEventOutbox.findFirst.mockResolvedValue(
      message({
        status: "LOCKED",
        attempts: 3,
        maxAttempts: 3,
        lockedBy: "worker-1",
        businessEvent: {
          eventSource: "PROVIDER_WEBHOOK",
          payloadHash: "event-hash",
          correlationId: "corr-event",
        },
      }),
    )
    client.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })

    await expect(
      markBusinessEventOutboxFailed(
        {
          organizationId: "org-1",
          workerId: "worker-1",
          messageId: "outbox-1",
          error: new ApplicationError(
            "DATABASE_UNAVAILABLE",
            "Temporary outage.",
            503,
            false,
          ),
          now,
        },
        client,
      ),
    ).resolves.toMatchObject({
      status: "DEAD_LETTER",
      errorCode: "DATABASE_UNAVAILABLE",
    })
    expect(client.businessEventAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "OUTBOX_DEAD_LETTERED" }),
      }),
    )
  })

  it("rejects cross-tenant completion when the scoped lease is absent", async () => {
    const client = createClient()
    client.businessEventOutbox.findFirst.mockResolvedValue(null)

    await expect(
      markBusinessEventOutboxDelivered(
        {
          organizationId: "org-2",
          workerId: "worker-1",
          messageId: "outbox-1",
          now,
        },
        client,
      ),
    ).rejects.toBeInstanceOf(NotFoundError)
    expect(client.businessEventOutbox.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "outbox-1",
          organizationId: "org-2",
          lockedBy: "worker-1",
        }),
      }),
    )
    expect(client.businessEventOutbox.updateMany).not.toHaveBeenCalled()
  })

  it("exposes tenant-scoped retry backlog readiness", async () => {
    const client = createClient()
    client.businessEventOutbox.groupBy.mockResolvedValue([
      { status: "PENDING", _count: { _all: 2 } },
      { status: "FAILED", _count: { _all: 1 } },
      { status: "DEAD_LETTER", _count: { _all: 1 } },
    ])
    client.businessEventOutbox.findFirst.mockResolvedValue(
      message({ availableAt: new Date("2026-08-23T09:55:00.000Z") }),
    )

    await expect(
      getBusinessEventOutboxReadiness("org-1", client),
    ).resolves.toEqual({
      pending: 2,
      locked: 0,
      deferred: 0,
      failed: 1,
      deadLetter: 1,
      oldestActionableAt: new Date("2026-08-23T09:55:00.000Z"),
    })
    expect(client.businessEventOutbox.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-1" } }),
    )
  })
})
