import {
  ApplicationError,
} from "@/services/_shared/action-errors"

import {
  businessEventOutboxRetryAt,
  claimBusinessEventOutboxMessages,
  getBusinessEventOutboxReadiness,
  markBusinessEventOutboxDelivered,
  markBusinessEventOutboxFailed,
  runBusinessEventOutboxWorker,
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
        lockedAt: now,
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
        lockedAt: now,
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
          attempts: 1,
          lockedAt: now,
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
          attempts: 1,
          lockedAt: now,
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
        lockedAt: now,
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
        attempts: 1,
        lockedAt: now,
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
        lockedAt: now,
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
          attempts: 3,
          lockedAt: now,
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

  it("reports lost ownership for cross-tenant completion without effects", async () => {
    const client = createClient()
    client.businessEventOutbox.findFirst.mockResolvedValue(null)

    await expect(
      markBusinessEventOutboxDelivered(
        {
          organizationId: "org-2",
          workerId: "worker-1",
          messageId: "outbox-1",
          attempts: 1,
          lockedAt: now,
          now,
        },
        client,
      ),
    ).resolves.toEqual({ messageId: "outbox-1", status: "LEASE_LOST" })
    expect(client.businessEventOutbox.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "outbox-1",
          organizationId: "org-2",
          lockedBy: "worker-1",
          attempts: 1,
          lockedAt: now,
        }),
      }),
    )
    expect(client.businessEventOutbox.updateMany).not.toHaveBeenCalled()
    expect(client.businessEventAudit.create).not.toHaveBeenCalled()
  })

  describe.each([
    ["delivery", markBusinessEventOutboxDelivered],
    ["failure", markBusinessEventOutboxFailed],
  ] as const)("exact claim %s", (_label, terminal) => {
    const input = () => ({ organizationId: "org-1", workerId: "worker-1", messageId: "outbox-1",
      attempts: 1, lockedAt: now, now, error: new Error("Controlled handler failure") })
    const leased = () => message({ status: "LOCKED", attempts: 1, lockedAt: now, lockedBy: "worker-1",
      businessEvent: { eventSource: "SYSTEM", payloadHash: "event-hash", correlationId: "corr-event" } })

    const invalidInputs: Array<[string, Record<string, unknown>]> = [
      ["missing attempt", { attempts: undefined }], ["zero attempt", { attempts: 0 }],
      ["negative attempt", { attempts: -1 }], ["fractional attempt", { attempts: 1.5 }],
      ["unsafe attempt", { attempts: Number.MAX_SAFE_INTEGER + 1 }], ["NaN attempt", { attempts: NaN }],
      ["missing timestamp", { lockedAt: undefined }], ["null timestamp", { lockedAt: null }],
      ["string timestamp", { lockedAt: now.toISOString() }], ["invalid timestamp", { lockedAt: new Date(NaN) }],
    ]
    it.each(invalidInputs)("rejects %s before starting a transaction", async (_name, override) => {
      const client = createClient()
      await expect(terminal({ ...input(), ...override } as ReturnType<typeof input>, client)).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
      expect(client.$transaction).not.toHaveBeenCalled()
      expect(client.businessEventOutbox.findFirst).not.toHaveBeenCalled()
      expect(client.businessEventOutbox.updateMany).not.toHaveBeenCalled()
      expect(client.businessEventAudit.create).not.toHaveBeenCalled()
    })

    const mismatchedInputs: Array<[string, Partial<ReturnType<typeof input>>]> = [
      ["tenant", { organizationId: "org-2" }], ["message", { messageId: "other-message" }],
      ["worker", { workerId: "other-worker" }], ["attempt", { attempts: 2 }],
      ["timestamp", { lockedAt: new Date(now.getTime() + 1) }],
    ]
    it.each(mismatchedInputs)("does not mutate a lease when %s differs", async (_name, override) => {
      const client = createClient(), retained = leased()
      // Match the actual supplied identity, so dropping a predicate makes this
      // regression exercise a write instead of returning lost ownership.
      client.businessEventOutbox.findFirst.mockImplementation(async ({ where }) =>
        Object.entries(where).every(([key, value]) => value instanceof Date
          ? (retained[key as keyof typeof retained] as Date)?.getTime() === value.getTime()
          : retained[key as keyof typeof retained] === value) ? retained : null)
      await expect(terminal({ ...input(), ...override }, client)).resolves.toEqual({ messageId: override.messageId ?? "outbox-1", status: "LEASE_LOST" })
      expect(client.businessEventOutbox.updateMany).not.toHaveBeenCalled()
      expect(client.businessEventAudit.create).not.toHaveBeenCalled()
      expect(retained).toEqual(leased())
    })

    it("fences a reclaim between the read and update without emitting an audit", async () => {
      const client = createClient()
      client.businessEventOutbox.findFirst.mockResolvedValue(leased())
      client.businessEventOutbox.updateMany.mockResolvedValue({ count: 0 })
      await expect(terminal(input(), client)).resolves.toEqual({ messageId: "outbox-1", status: "LEASE_LOST" })
      const expectedIdentity = { id: "outbox-1", organizationId: "org-1", status: "LOCKED", lockedBy: "worker-1", attempts: 1, lockedAt: now }
      expect(client.businessEventOutbox.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expectedIdentity }))
      expect(client.businessEventOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedIdentity }))
      expect(client.businessEventAudit.create).not.toHaveBeenCalled()
    })

    it("preserves real storage errors instead of claiming lease loss", async () => {
      const client = createClient(), failure = new Error("Owned database unavailable")
      client.businessEventOutbox.findFirst.mockRejectedValue(failure)
      await expect(terminal(input(), client)).rejects.toBe(failure)
      expect(client.businessEventOutbox.updateMany).not.toHaveBeenCalled()
      expect(client.businessEventAudit.create).not.toHaveBeenCalled()
    })

    it("propagates audit failure from the same transaction as the terminal write", async () => {
      const client = createClient(), failure = new Error("Owned terminal audit failure")
      client.businessEventOutbox.findFirst.mockResolvedValue(leased())
      client.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })
      client.businessEventAudit.create.mockRejectedValue(failure)
      await expect(terminal(input(), client)).rejects.toBe(failure)
      expect(client.$transaction).toHaveBeenCalledTimes(1)
      expect(client.businessEventOutbox.updateMany).toHaveBeenCalledTimes(1)
      expect(client.businessEventAudit.create).toHaveBeenCalledTimes(1)
      expect(client.businessEventOutbox.updateMany.mock.invocationCallOrder[0]).toBeLessThan(client.businessEventAudit.create.mock.invocationCallOrder[0])
    })
  })

  it.each(["success", "failure"])("continues the claimed batch after old-attempt %s loses its lease", async firstOutcome => {
    const client = createClient()
    client.businessEventOutbox.findMany.mockResolvedValue([message(), message({ id: "outbox-2", businessEventId: "event-2" })])
    client.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })
    client.businessEventOutbox.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(message({
      id: "outbox-2", businessEventId: "event-2", status: "LOCKED", attempts: 1, lockedAt: now, lockedBy: "worker-1",
      businessEvent: { eventSource: "SYSTEM", payloadHash: "second-event-hash", correlationId: "corr-2" },
    }))
    const handler = jest.fn(async claimed => { if (firstOutcome === "failure" && claimed.id === "outbox-1") throw new Error("The old handler rejected its reclaimed lease") })
    await expect(runBusinessEventOutboxWorker({ organizationId: "org-1", workerId: "worker-1", now }, handler, client)).resolves.toEqual([
      { messageId: "outbox-1", status: "LEASE_LOST" }, { messageId: "outbox-2", status: "SENT", processedAt: now },
    ])
    expect(handler.mock.calls.map(([claimed]) => claimed.id)).toEqual(["outbox-1", "outbox-2"])
    expect(client.businessEventOutbox.findFirst).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: {
      id: "outbox-1", organizationId: "org-1", status: "LOCKED", lockedBy: "worker-1", attempts: 1, lockedAt: now,
    } }))
    expect(client.businessEventOutbox.updateMany).toHaveBeenCalledTimes(3) // Two claims; only the second terminal write.
    expect(client.businessEventAudit.create).toHaveBeenCalledTimes(1)
    expect(client.businessEventAudit.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ businessEventId: "event-2", action: "OUTBOX_DELIVERED" }) }))
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
