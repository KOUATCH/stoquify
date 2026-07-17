import { ConflictError } from "@/services/_shared/action-errors"

import {
  hashBusinessPayload,
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
          payloadHash: hashBusinessPayload({ total: "118.00", lines: [{ sku: "A", qty: 1 }] }),
          outboxMessages: {
            create: [
              expect.objectContaining({
                organizationId: "org-1",
                channel: "NOTIFICATION",
                eventName: "pos.sale.finalized",
                idempotencyKey: "POS:sale-1:NOTIFICATION:pos.sale.finalized",
                payloadHash: hashBusinessPayload({ saleId: "sale-1" }),
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
      eventSource: "PROVIDER_WEBHOOK",
      idempotencyKey: "momo-1",
      payloadHash: hashBusinessPayload(payload),
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
    tx.businessEvent.findUnique.mockResolvedValue({
      id: "event-1",
      organizationId: "org-1",
      eventSource: "PROVIDER_WEBHOOK",
      idempotencyKey: "momo-1",
      payloadHash: hashBusinessPayload({ amount: "2500.00" }),
      outboxMessages: [],
    })

    await expect(
      recordBusinessEventInTx(tx, {
        organizationId: "org-1",
        eventType: "PAYMENT_PROVIDER_EVENT_RECEIVED",
        eventSource: "PROVIDER_WEBHOOK",
        idempotencyKey: "momo-1",
        actorId: "user-1",
        payload: { amount: "9999.00" },
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "BusinessEvent",
          entityId: "event-1",
          action: "BUSINESS_EVENT_IDEMPOTENCY_CONFLICT",
          userId: "user-1",
          organizationId: "org-1",
        }),
      }),
    )
  })
})

