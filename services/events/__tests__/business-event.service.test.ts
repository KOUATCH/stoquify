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
  it.each([
    { code: "P2034" },
    { code: "P2010", meta: { code: "40001" } },
    { code: "P2010", meta: { code: "40P01" } },
  ])("preserves transaction retry signals for the owning transaction: %j", async details => {
    const tx = createTx(), failure = { name: "PrismaClientKnownRequestError", clientVersion: "6.19.3", ...details }
    tx.businessEvent.findUnique.mockResolvedValue(null)
    tx.businessEvent.create.mockRejectedValue(failure)
    await expect(recordBusinessEventInTx(tx, { organizationId: "org-1", eventType: "RETRY", idempotencyKey: "retry-1", payload: {} })).rejects.toBe(failure)
    expect(tx.businessEvent.create).toHaveBeenCalledTimes(1)
  })

  it("keeps the standalone transaction boundary sanitized when a retry signal escapes it", async () => {
    const tx = createTx()
    const failure = { name: "PrismaClientKnownRequestError", code: "P2034", clientVersion: "6.19.3", message: "private database detail" }
    tx.businessEvent.findUnique.mockResolvedValue(null)
    tx.businessEvent.create.mockRejectedValue(failure)
    const client = { ...tx, $transaction: jest.fn(async callback => callback(tx)) }
    const error = await recordBusinessEvent({ organizationId: "org-1", eventType: "RETRY", idempotencyKey: "retry-1", payload: {} }, client).catch(error => error)
    expect(error).toMatchObject({ code: "INTERNAL_ERROR", expose: false, message: "Business event transaction failed." })
    expect(JSON.stringify(error)).not.toContain("private database detail")
  })

  it("preserves a domain reference and existing metadata without classifying it as accounting", async () => {
    const tx = createTx()
    tx.businessEvent.findUnique.mockResolvedValue(null)
    tx.businessEvent.create.mockImplementation(async ({ data }) => ({ id: "event-domain", ...data }))
    const metadata = { evidenceHash: "retained", nested: { state: "requested" } }
    await recordBusinessEventInTx(tx, {
      organizationId: "org-1", eventType: "CONTRACT_CHANGED", idempotencyKey: "domain-1",
      payload: { contractId: "contract-1" }, sourceEntityType: "PAYROLL_CONTRACT",
      sourceId: "contract-1", metadata,
    })
    expect(tx.businessEvent.create.mock.calls[0][0].data).toMatchObject({
      sourceType: undefined, sourceId: "contract-1",
      metadata: { ...metadata, sourceEntityType: "PAYROLL_CONTRACT" },
    })
    expect(metadata).not.toHaveProperty("sourceEntityType")
  })

  it("retains a valid accounting classification alongside a domain reference", async () => {
    const tx = createTx()
    tx.businessEvent.findUnique.mockResolvedValue(null)
    tx.businessEvent.create.mockImplementation(async ({ data }) => ({ id: "event-accounting", ...data }))
    await recordBusinessEventInTx(tx, {
      organizationId: "org-1", eventType: "PAYROLL_POSTED", idempotencyKey: "accounting-1", payload: {},
      sourceType: "PAYROLL_RUN", sourceEntityType: "PayrollRun", sourceId: "run-1",
      metadata: { sourceEntityType: "PayrollRun", retained: true },
    })
    expect(tx.businessEvent.create.mock.calls[0][0].data).toMatchObject({
      sourceType: "PAYROLL_RUN", sourceId: "run-1",
      metadata: { sourceEntityType: "PayrollRun", retained: true },
    })
  })

  it.each(["PAYROLL_CONTRACT", "UNKNOWN", " PAYROLL_RUN "])("rejects invalid accounting source %s before database access", async (sourceType) => {
    const tx = createTx()
    const client = { businessEvent: tx.businessEvent, $transaction: jest.fn() }
    const input = { organizationId: "org-1", eventType: "SOURCE_CHECK", idempotencyKey: "invalid", payload: {}, sourceType }
    // Invalid runtime input deliberately bypasses the compile-time contract.
    // @ts-expect-error invalid accounting source
    await expect(recordBusinessEventInTx(tx, input)).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 })
    // @ts-expect-error invalid accounting source
    await expect(recordBusinessEvent(input, client)).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 })
    expect(tx.businessEvent.findUnique).not.toHaveBeenCalled()
    expect(tx.businessEvent.create).not.toHaveBeenCalled()
    expect(client.$transaction).not.toHaveBeenCalled()
  })

  it.each([[], "discarded", 12, new Date(), { sourceEntityType: "OtherEntity" }])("rejects lossy or conflicting domain metadata %#", async (metadata) => {
    const tx = createTx()
    await expect(recordBusinessEventInTx(tx, {
      organizationId: "org-1", eventType: "SOURCE_CHECK", idempotencyKey: "conflict", payload: {},
      sourceEntityType: "PAYROLL_CONTRACT", sourceId: "contract-1", metadata,
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
    expect(tx.businessEvent.findUnique).not.toHaveBeenCalled()
    expect(tx.businessEvent.create).not.toHaveBeenCalled()
  })

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
