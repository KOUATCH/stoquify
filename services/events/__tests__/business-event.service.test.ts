import { IdempotencyConflictError } from "@/services/_shared/action-errors"

import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEvent,
  recordBusinessEventInTx,
} from "../business-event.service"

function createTx() {
  return {
    businessEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  }
}

function createEvidenceClient() {
  const store = {
    businessEventAudit: {
      create: jest.fn(),
    },
    businessEventAnomaly: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  }

  return {
    ...store,
    $transaction: jest.fn(async (callback) => callback(store)),
  }
}

describe("business event gateway", () => {
  it("records an append-only event with deterministic payload and outbox hashes", async () => {
    const tx = createTx()
    tx.businessEvent.findUnique.mockResolvedValue(null)
    tx.businessEvent.create.mockImplementation(async (args) => ({
      id: "event-1",
      ...args.data,
      outboxMessages: args.data.outboxMessages.create,
    }))

    const result = await recordBusinessEventInTx(tx, {
      organizationId: "org-1",
      eventType: "POS_SALE_FINALIZED",
      eventSource: "POS",
      idempotencyKey: "sale-1",
      correlationId: "corr-1",
      payload: { total: "118.00", lines: [{ sku: "A", qty: 1 }] },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "pos.sale.finalized",
          payload: { saleId: "sale-1" },
        },
      ],
    })

    expect(result.created).toBe(true)
    expect(tx.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "POS_SALE_FINALIZED",
          eventSource: "POS",
          idempotencyKey: "sale-1",
          payloadHash: hashBusinessPayload({
            total: "118.00",
            lines: [{ sku: "A", qty: 1 }],
          }),
          correlationId: "corr-1",
          audits: {
            create: expect.objectContaining({
              organizationId: "org-1",
              action: "RECORDED",
              eventSource: "POS",
              payloadHash: hashBusinessPayload({
                total: "118.00",
                lines: [{ sku: "A", qty: 1 }],
              }),
              correlationId: "corr-1",
              metadata: {
                eventType: "POS_SALE_FINALIZED",
                schemaVersion: 1,
                outboxMessageCount: 1,
              },
            }),
          },
          outboxMessages: {
            create: [
              expect.objectContaining({
                organizationId: "org-1",
                channel: "NOTIFICATION",
                eventName: "pos.sale.finalized",
                idempotencyKey: "POS:sale-1:NOTIFICATION:pos.sale.finalized",
                payloadHash: hashBusinessPayload({ saleId: "sale-1" }),
                correlationId: "corr-1",
              }),
            ],
          },
        }),
        include: { outboxMessages: true },
      }),
    )
  })

  it("returns the original event for identical replay", async () => {
    const tx = createTx()
    const payload = { amount: "2500.00", providerReference: "momo-1" }
    const existing = {
      id: "event-1",
      organizationId: "org-1",
      eventType: "PAYMENT_PROVIDER_EVENT_RECEIVED",
      eventSource: "PROVIDER_WEBHOOK",
      idempotencyKey: "momo-1",
      payloadHash: hashBusinessPayload(payload),
      correlationId: "corr-original",
      outboxMessages: [],
    }

    tx.businessEvent.findUnique.mockResolvedValue(existing)

    const result = await recordBusinessEventInTx(tx, {
      organizationId: "org-1",
      eventType: "PAYMENT_PROVIDER_EVENT_RECEIVED",
      eventSource: "PROVIDER_WEBHOOK",
      idempotencyKey: "momo-1",
      payload,
    })

    expect(result).toEqual({ event: existing, created: false })
    expect(tx.businessEvent.create).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })

  it("rejects and audits idempotency replay with a different payload hash", async () => {
    const tx = createTx()
    const evidenceClient = createEvidenceClient()
    tx.businessEvent.findUnique.mockResolvedValue({
      id: "event-1",
      organizationId: "org-1",
      eventType: "PAYMENT_PROVIDER_EVENT_RECEIVED",
      eventSource: "PROVIDER_WEBHOOK",
      idempotencyKey: "momo-1",
      payloadHash: hashBusinessPayload({ amount: "2500.00" }),
      correlationId: "corr-original",
      outboxMessages: [],
    })

    await expect(
      recordBusinessEventInTx(
        tx,
        {
          organizationId: "org-1",
          eventType: "PAYMENT_PROVIDER_EVENT_RECEIVED",
          eventSource: "PROVIDER_WEBHOOK",
          idempotencyKey: "momo-1",
          actorId: "user-1",
          correlationId: "corr-conflict",
          payload: { amount: "9999.00" },
        },
        { evidenceClient },
      ),
    ).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
      name: "IdempotencyConflictError",
    })

    expect(evidenceClient.businessEventAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          businessEventId: "event-1",
          action: "IDEMPOTENCY_CONFLICT",
          actorId: "user-1",
          correlationId: "corr-conflict",
        }),
      }),
    )
    expect(evidenceClient.businessEventAnomaly.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          organizationId: "org-1",
          businessEventId: "event-1",
          code: "IDEMPOTENCY_CONFLICT",
          severity: "HIGH",
          status: "OPEN",
        }),
      }),
    )
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })

  it("resolves a concurrent P2002 insert as a same-payload replay", async () => {
    const tx = createTx()
    const payload = { amount: "2500.00", providerReference: "momo-1" }
    const existing = {
      id: "event-1",
      organizationId: "org-1",
      eventType: "PAYMENT_PROVIDER_EVENT_RECEIVED",
      eventSource: "PROVIDER_WEBHOOK",
      idempotencyKey: "momo-1",
      payloadHash: hashBusinessPayload(payload),
      correlationId: "corr-original",
      outboxMessages: [],
    }
    tx.businessEvent.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing)
    tx.businessEvent.create.mockRejectedValue({
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      clientVersion: "6.19.3",
    })
    const client = {
      ...tx,
      $transaction: jest.fn(async (callback) => callback(tx)),
    }

    await expect(
      recordBusinessEvent(
        {
          organizationId: "org-1",
          eventType: "PAYMENT_PROVIDER_EVENT_RECEIVED",
          eventSource: "PROVIDER_WEBHOOK",
          idempotencyKey: "momo-1",
          correlationId: "corr-retry",
          payload,
        },
        client,
      ),
    ).resolves.toEqual({ event: existing, created: false })

    expect(tx.businessEvent.findUnique).toHaveBeenLastCalledWith({
      where: {
        organizationId_eventSource_idempotencyKey: {
          organizationId: "org-1",
          eventSource: "PROVIDER_WEBHOOK",
          idempotencyKey: "momo-1",
        },
      },
      include: { outboxMessages: true },
    })
  })

  it("returns the canonical typed validation error before database access", async () => {
    const tx = createTx()

    await expect(
      recordBusinessEventInTx(tx, {
        organizationId: "",
        eventType: "POS_SALE_FINALIZED",
        idempotencyKey: "sale-1",
        payload: {},
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    })
    expect(tx.businessEvent.findUnique).not.toHaveBeenCalled()
  })

  it("marks an event applied with tenant-scoped audit evidence", async () => {
    const tx = createTx()
    tx.businessEvent.update.mockResolvedValue({
      id: "event-1",
      status: "APPLIED",
    })

    await markBusinessEventAppliedInTx(tx, "org-1", "event-1")

    expect(tx.businessEvent.update).toHaveBeenCalledWith({
      where: { id: "event-1", organizationId: "org-1" },
      data: expect.objectContaining({
        status: "APPLIED",
        audits: {
          create: expect.objectContaining({
            organizationId: "org-1",
            action: "APPLIED",
          }),
        },
      }),
    })
  })
})
