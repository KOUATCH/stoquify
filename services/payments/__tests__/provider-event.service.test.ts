import { createHmac } from "node:crypto"

import {
  ExceptionSeverity,
  PaymentExceptionType,
  PaymentReconciliationInboxStatus,
  ProviderAccountStatus,
  ProviderEventStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"

import { MobileMoneyHmacAdapter, sha256 } from "../adapters/mobile-money-hmac.adapter"
import { captureProviderEvent } from "../provider-event.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    providerAccount: { findFirst: jest.fn() },
    providerEvent: { findFirst: jest.fn(), create: jest.fn() },
    paymentReconciliationInboxItem: { upsert: jest.fn() },
    paymentException: { create: jest.fn() },
    businessEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    ledgerAuditEvent: { create: jest.fn() },
    closeRun: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    closePackExport: { findFirst: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

jest.mock("@/lib/error-handling/monitoring", () => ({
  AlertSeverity: { HIGH: "HIGH" },
  AlertType: { SECURITY: "SECURITY" },
  createAlert: jest.fn().mockResolvedValue({ id: "alert-1" }),
}))

const mockedDb = db as unknown as {
  $transaction: jest.Mock
  providerAccount: { findFirst: jest.Mock }
  providerEvent: { findFirst: jest.Mock; create: jest.Mock }
  paymentReconciliationInboxItem: { upsert: jest.Mock }
  paymentException: { create: jest.Mock }
  businessEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  ledgerAuditEvent: { create: jest.Mock }
  closeRun: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
  closePackExport: { findFirst: jest.Mock; update: jest.Mock }
  auditLog: { create: jest.Mock }
}

const adapter = new MobileMoneyHmacAdapter("mtn-momo", 1024, 300)
const secret = "provider-secret"
const now = new Date("2026-06-14T12:00:00Z")

function rawEvent(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    eventId: "evt-1",
    transactionId: "txn-1",
    reference: "ref-1",
    eventType: "PAYMENT_SUCCEEDED",
    amount: "10000",
    feeAmount: "100",
    currencyCode: "XAF",
    occurredAt: "2026-06-14T11:59:00Z",
    customerMsisdn: "237699000000",
    ...overrides,
  })
}

function headersFor(rawBody: string, timestamp = now.getTime(), signingSecret = secret) {
  const signature = createHmac("sha256", signingSecret)
    .update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`)
    .digest("hex")

  return {
    "x-provider-timestamp": String(timestamp),
    "x-provider-signature": `sha256=${signature}`,
  }
}

function arrangeCertifiedCloseTarget() {
  mockedDb.closeRun.findMany.mockResolvedValue([{ id: "close-run-1", packExports: [{ id: "close-pack-export-1" }] }])
  mockedDb.closeRun.findFirst.mockResolvedValue({
    id: "close-run-1",
    organizationId: "org-1",
    status: "CERTIFIED",
    metadata: null,
  })
  mockedDb.closePackExport.findFirst.mockResolvedValue({ id: "close-pack-export-1", metadata: { mode: "CERTIFIED" } })
  mockedDb.closePackExport.update.mockResolvedValue({ id: "close-pack-export-1" })
  mockedDb.closeRun.update.mockResolvedValue({ id: "close-run-1" })
  mockedDb.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" })
}

describe("provider event ingestion", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
    mockedDb.providerAccount.findFirst.mockResolvedValue({
      id: "provider-account-1",
      status: ProviderAccountStatus.ACTIVE,
    })
    mockedDb.providerEvent.findFirst.mockResolvedValue(null)
    mockedDb.providerEvent.create.mockResolvedValue({ id: "provider-event-1" })
    mockedDb.paymentReconciliationInboxItem.upsert.mockResolvedValue({ id: "inbox-1" })
    mockedDb.paymentException.create.mockResolvedValue({ id: "exception-1" })
    mockedDb.businessEvent.findUnique.mockResolvedValue(null)
    mockedDb.businessEvent.create.mockImplementation(async (args) => ({
      id: "business-event-1",
      ...args.data,
      outboxMessages: args.data.outboxMessages.create,
    }))
    mockedDb.closeRun.findMany.mockResolvedValue([])
    mockedDb.closeRun.findFirst.mockResolvedValue(null)
    mockedDb.closeRun.update.mockResolvedValue({ id: "close-run-1" })
    mockedDb.closePackExport.findFirst.mockResolvedValue(null)
    mockedDb.closePackExport.update.mockResolvedValue({ id: "close-pack-export-1" })
    mockedDb.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" })
  })

  it("captures a valid provider event as verified evidence", async () => {
    const rawBody = rawEvent()

    const result = await captureProviderEvent({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawBody,
      headers: headersFor(rawBody),
      secret,
      now,
      correlationId: "corr-1",
    })

    expect(result).toMatchObject({
      status: "CAPTURED",
      providerEventId: "evt-1",
      providerEventRecordId: "provider-event-1",
      inboxItemId: "inbox-1",
      correlationId: "corr-1",
    })
    expect(mockedDb.providerEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProviderEventStatus.VERIFIED,
          signatureValid: true,
          rawPayloadHash: sha256(adapter.canonicalPayload(rawBody)),
        }),
      }),
    )
    expect(mockedDb.paymentException.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "payment.provider_event.captured",
          eventSource: "PROVIDER_WEBHOOK",
          idempotencyKey: "provider-event:provider-event-1:captured",
          sourceType: "PAYMENT_RECONCILIATION",
          sourceId: "provider-event-1",
          documentHash: sha256(adapter.canonicalPayload(rawBody)),
          outboxMessages: {
            create: [
              expect.objectContaining({
                channel: "NOTIFICATION",
                eventName: "payment.provider_event.captured",
              }),
            ],
          },
        }),
        include: { outboxMessages: true },
      }),
    )
  })

  it("invalidates certified close evidence when a captured provider event overlaps the closed period", async () => {
    arrangeCertifiedCloseTarget()
    const rawBody = rawEvent()

    await captureProviderEvent({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawBody,
      headers: headersFor(rawBody),
      secret,
      now,
      correlationId: "corr-close-provider",
    })

    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "close.certification.invalidated",
          metadata: expect.objectContaining({
            sourceCode: "PAYMENT_PROVIDER_EVENT_CAPTURED",
            sourceDomain: "payments",
            sourceTable: "provider_events",
          }),
        }),
      }),
    )
    expect(mockedDb.closeRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "close-run-1" },
        data: expect.objectContaining({
          status: "BLOCKED",
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({
              sourceCode: "PAYMENT_PROVIDER_EVENT_CAPTURED",
              newEvidenceHash: sha256(adapter.canonicalPayload(rawBody)),
              correlationId: "corr-close-provider",
            }),
          }),
        }),
      }),
    )
  })

  it("returns duplicate for the same provider event and same payload hash", async () => {
    const rawBody = rawEvent()
    mockedDb.providerEvent.findFirst.mockResolvedValue({
      id: "provider-event-1",
      rawPayloadHash: sha256(adapter.canonicalPayload(rawBody)),
    })

    const result = await captureProviderEvent({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawBody,
      headers: headersFor(rawBody),
      secret,
      now,
    })

    expect(result.status).toBe("DUPLICATE")
    expect(mockedDb.providerEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
    expect(mockedDb.paymentReconciliationInboxItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: PaymentReconciliationInboxStatus.IGNORED,
        }),
      }),
    )
  })

  it("creates a tamper exception when the same event id arrives with a different payload hash", async () => {
    const rawBody = rawEvent({ amount: "12000" })
    mockedDb.providerEvent.findFirst.mockResolvedValue({
      id: "provider-event-1",
      rawPayloadHash: "sha256:old",
    })

    const result = await captureProviderEvent({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawBody,
      headers: headersFor(rawBody),
      secret,
      now,
    })

    expect(result.status).toBe("TAMPERED")
    expect(mockedDb.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.TAMPER_SIGNAL,
          severity: ExceptionSeverity.CRITICAL,
        }),
      }),
    )
    expect(mockedDb.businessEvent.create).not.toHaveBeenCalled()
  })

  it("persists rejected evidence and an exception for missing signatures", async () => {
    const rawBody = rawEvent()

    const result = await captureProviderEvent({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawBody,
      headers: { "x-provider-timestamp": String(now.getTime()) },
      secret,
      now,
    })

    expect(result.status).toBe("REJECTED")
    expect(mockedDb.providerEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProviderEventStatus.TAMPERED,
          signatureValid: false,
        }),
      }),
    )
    expect(mockedDb.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.SIGNATURE_FAILURE,
        }),
      }),
    )
    expect(mockedDb.businessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "payment.provider_event.rejected",
          eventSource: "PROVIDER_WEBHOOK",
          idempotencyKey: "provider-event:provider-event-1:rejected",
          sourceType: "PAYMENT_RECONCILIATION",
          sourceId: "provider-event-1",
          documentHash: sha256(adapter.canonicalPayload(rawBody)),
        }),
        include: { outboxMessages: true },
      }),
    )
  })

  it("classifies stale signed events as replay attempts", async () => {
    const rawBody = rawEvent()
    const staleTimestamp = now.getTime() - 600_000

    const result = await captureProviderEvent({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawBody,
      headers: headersFor(rawBody, staleTimestamp),
      secret,
      now,
    })

    expect(result.status).toBe("REJECTED")
    expect(mockedDb.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.REPLAY_SPIKE,
        }),
      }),
    )
  })

  it("rejects oversized provider payloads before persistence", async () => {
    const smallAdapter = new MobileMoneyHmacAdapter("mtn-momo", 10, 300)

    await expect(
      captureProviderEvent({
        organizationId: "org-1",
        providerAccountId: "provider-account-1",
        adapter: smallAdapter,
        rawBody: rawEvent(),
        headers: {},
        secret,
        now,
      }),
    ).rejects.toMatchObject({
      reason: "PAYLOAD_TOO_LARGE",
    })
    expect(mockedDb.providerEvent.create).not.toHaveBeenCalled()
  })
})
