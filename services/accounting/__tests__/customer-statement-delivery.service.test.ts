jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../customer-statement-access.service", () => ({
  issueCustomerStatementAccessTokenInTx: jest.fn(),
}))
jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn((value: unknown) =>
    require("node:crypto").createHash("sha256").update(JSON.stringify(value)).digest("hex"),
  ),
  recordBusinessEventInTx: jest.fn(),
  markBusinessEventAppliedInTx: jest.fn(),
}))

import {
  CustomerStatementDeliveryChannel,
  CustomerStatementDeliveryStatus,
} from "@prisma/client"
import { db } from "@/prisma/db"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { issueCustomerStatementAccessTokenInTx } from "../customer-statement-access.service"
import { queueCustomerStatementDelivery } from "../customer-statement-delivery.service"

const mockIssueToken = issueCustomerStatementAccessTokenInTx as jest.Mock
const mockDb = db as unknown as { $transaction: jest.Mock }
const mockRecordEvent = recordBusinessEventInTx as jest.Mock
const mockMarkApplied = markBusinessEventAppliedInTx as jest.Mock

const now = new Date("2026-08-09T10:00:00.000Z")
const consentEvidenceHash = "sha256:" + "a".repeat(64)
const environment = {
  AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY: "22".repeat(32),
  NEXT_PUBLIC_BASE_URL: "https://stoquify.test",
}

function tx() {
  return {
    customerStatementDelivery: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "delivery-1" }),
    },
    customerStatementDeliveryState: {
      create: jest.fn().mockResolvedValue({ id: "delivery-state-1" }),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: "user-1" }),
    },
    referralAttribution: {
      create: jest.fn().mockResolvedValue({ id: "attribution-1" }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }
}

const input = {
  organizationId: "org-1",
  statementSnapshotId: "statement-1",
  issuedById: "user-1",
  channel: "EMAIL" as const,
  destination: "Customer@Example.com",
  consentBasis: "EXPLICIT" as const,
  consentEvidenceHash,
  consentCapturedAt: new Date("2026-08-09T09:55:00.000Z"),
  allowDispute: true,
  allowPromiseToPay: true,
  locale: "EN" as const,
  idempotencyKey: "statement-delivery-001",
  correlationId: "statement-delivery-session-001",
  now,
  environment,
}

describe("customer statement delivery service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIssueToken.mockResolvedValue({
      token: "signed-secret-token",
      tokenId: "token-1",
      tokenHash: "b".repeat(64),
      statementContentHash: "c".repeat(64),
      permissions: ["view", "dispute", "promise_to_pay"],
      expiresAt: new Date("2026-09-08T10:00:00.000Z"),
    })
    mockRecordEvent.mockResolvedValue({
      event: {
        id: "event-1",
        outboxMessages: [{
          id: "outbox-1",
          eventName: "customer.statement.delivery.requested",
        }],
      },
      created: true,
    })
    mockMarkApplied.mockResolvedValue({ id: "event-1" })
  })

  it("queues consented email delivery without persisting the raw recipient or token", async () => {
    const transaction = tx()
    mockDb.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(transaction))

    const result = await queueCustomerStatementDelivery(input, mockDb as never)

    expect(result).toMatchObject({
      statementSnapshotId: "statement-1",
      tokenId: "token-1",
      channel: CustomerStatementDeliveryChannel.EMAIL,
      status: CustomerStatementDeliveryStatus.QUEUED,
      redactedDestination: "c***@example.com",
      replayed: false,
    })
    const attribution = transaction.referralAttribution.create.mock.calls[0][0]
    expect(attribution.data).toMatchObject({
      organizationId: "org-1",
      statementSnapshotId: "statement-1",
      campaign: "customer_statement_share",
      channel: "EMAIL",
    })
    expect(mockIssueToken).toHaveBeenCalledWith(transaction, expect.objectContaining({
      referralAttributionId: attribution.data.id,
      recipientReference: "customer@example.com",
      allowDispute: true,
      allowPromiseToPay: true,
    }))

    const eventInput = mockRecordEvent.mock.calls[0][1]
    const outbox = eventInput.outboxMessages[0]
    const serialized = JSON.stringify(outbox)
    expect(outbox.destination).toBeUndefined()
    expect(outbox.payload.sealedEnvelope).toMatch(/^v1\./)
    expect(serialized).not.toContain("customer@example.com")
    expect(serialized).not.toContain("signed-secret-token")
    expect(eventInput.metadata).toMatchObject({
      rawDestinationStored: false,
      rawTokenStored: false,
      providerEnvelope: "AES_256_GCM",
    })
    expect(transaction.customerStatementDelivery.create).toHaveBeenCalled()
    expect(transaction.customerStatementDeliveryState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        version: 1,
        status: CustomerStatementDeliveryStatus.QUEUED,
        previousStateHash: null,
      }),
    })
    expect(mockMarkApplied).toHaveBeenCalledWith(transaction, "org-1", "event-1")
  })

  it("replays exact delivery evidence without minting another token or attribution", async () => {
    const transaction = tx()
    mockDb.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(transaction))

    await queueCustomerStatementDelivery(input, mockDb as never)
    const created = transaction.customerStatementDelivery.create.mock.calls[0][0].data
    transaction.customerStatementDelivery.findFirst.mockResolvedValue({
      ...created,
      id: created.id,
      token: { expiresAt: new Date("2026-09-08T10:00:00.000Z") },
      attribution: {
        referralCode: transaction.referralAttribution.create.mock.calls[0][0].data.referralCode,
      },
      states: [{ status: CustomerStatementDeliveryStatus.QUEUED }],
    })
    jest.clearAllMocks()
    transaction.customerStatementDelivery.findFirst.mockResolvedValue({
      ...created,
      token: { expiresAt: new Date("2026-09-08T10:00:00.000Z") },
      attribution: { referralCode: "referral_code_123" },
      states: [{ status: CustomerStatementDeliveryStatus.QUEUED }],
    })
    mockDb.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(transaction))

    const replay = await queueCustomerStatementDelivery(input, mockDb as never)

    expect(replay.replayed).toBe(true)
    expect(mockIssueToken).not.toHaveBeenCalled()
    expect(transaction.referralAttribution.create).not.toHaveBeenCalled()
    expect(mockRecordEvent).not.toHaveBeenCalled()
  })

  it("fails closed before writes when consent evidence is missing or future-dated", async () => {
    const transaction = tx()
    mockDb.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(transaction))

    await expect(queueCustomerStatementDelivery({
      ...input,
      consentEvidenceHash: "not-evidence",
    }, mockDb as never)).rejects.toThrow("Explicit consent evidence hash is required")
    await expect(queueCustomerStatementDelivery({
      ...input,
      consentCapturedAt: new Date("2026-08-10T10:00:00.000Z"),
    }, mockDb as never)).rejects.toThrow("not in the future")

    expect(transaction.customerStatementDelivery.findFirst).not.toHaveBeenCalled()
    expect(mockIssueToken).not.toHaveBeenCalled()
    expect(mockRecordEvent).not.toHaveBeenCalled()
  })
})
