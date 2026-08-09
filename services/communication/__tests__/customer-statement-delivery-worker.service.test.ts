jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    businessEventOutbox: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    customerStatementDelivery: {
      findFirst: jest.fn(),
    },
  },
}))
jest.mock("@/services/accounting/customer-statement-delivery.service", () => ({
  CUSTOMER_STATEMENT_DELIVERY_EVENT_NAME: "customer.statement.delivery.requested",
}))
jest.mock("@/services/accounting/customer-statement-delivery-envelope", () => ({
  openCustomerStatementDeliveryEnvelope: jest.fn(),
}))
jest.mock("@/services/accounting/customer-statement-token", () => ({
  verifyCustomerStatementAccessToken: jest.fn(),
}))
jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn((value: unknown) =>
    require("node:crypto").createHash("sha256").update(JSON.stringify(value)).digest("hex"),
  ),
  recordBusinessEventInTx: jest.fn(),
  markBusinessEventAppliedInTx: jest.fn(),
}))

import { createHash } from "node:crypto"
import {
  BusinessOutboxStatus,
  CustomerStatementDeliveryStatus,
} from "@prisma/client"
import { db } from "@/prisma/db"
import { openCustomerStatementDeliveryEnvelope } from "@/services/accounting/customer-statement-delivery-envelope"
import { verifyCustomerStatementAccessToken } from "@/services/accounting/customer-statement-token"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  claimCustomerStatementDeliveries,
  processCustomerStatementDelivery,
} from "../customer-statement-delivery-worker.service"

const mockDb = db as unknown as {
  $transaction: jest.Mock
  businessEventOutbox: {
    findFirst: jest.Mock
    findMany: jest.Mock
    updateMany: jest.Mock
  }
  customerStatementDelivery: { findFirst: jest.Mock }
}
const mockOpenEnvelope = openCustomerStatementDeliveryEnvelope as jest.Mock
const mockVerifyToken = verifyCustomerStatementAccessToken as jest.Mock
const mockRecordEvent = recordBusinessEventInTx as jest.Mock
const mockMarkApplied = markBusinessEventAppliedInTx as jest.Mock
const now = new Date("2026-08-09T10:05:00.000Z")

const sealedEnvelope = "v1.sealed-envelope"
const sealedEnvelopeHash = "sha256:" + createHash("sha256")
  .update(sealedEnvelope)
  .digest("hex")
const payload = {
  schemaVersion: "customer-statement-delivery.v1",
  deliveryId: "delivery-1",
  organizationId: "org-1",
  statementSnapshotId: "statement-1",
  statementContentHash: "c".repeat(64),
  tokenId: "token-1",
  attributionId: "attribution-1",
  referralCode: "referral_code_123",
  channel: "EMAIL",
  locale: "EN",
  destinationHash: "sha256:" + createHash("sha256")
    .update("customer@example.com")
    .digest("hex"),
  redactedDestination: "c***@example.com",
  consentEvidenceHash: "sha256:" + "a".repeat(64),
  sealedEnvelope,
  sealedEnvelopeHash,
}

const request = {
  id: "outbox-1",
  organizationId: "org-1",
  eventName: "customer.statement.delivery.requested",
  status: BusinessOutboxStatus.LOCKED,
  lockedBy: "worker-1",
  attempts: 1,
  maxAttempts: 5,
  payload,
  payloadHash: "d".repeat(64),
}

const delivery = {
  id: "delivery-1",
  organizationId: "org-1",
  statementSnapshotId: "statement-1",
  statementContentHash: "c".repeat(64),
  tokenId: "token-1",
  attributionId: "attribution-1",
  destinationHash: payload.destinationHash,
  consentEvidenceHash: payload.consentEvidenceHash,
  channel: "EMAIL",
  payloadHash: "e".repeat(64),
  token: {
    id: "token-1",
    status: "ACTIVE",
    revokedAt: null,
    expiresAt: new Date("2026-09-08T10:00:00.000Z"),
    statementContentHash: "c".repeat(64),
  },
  attribution: {
    id: "attribution-1",
    referralCode: "referral_code_123",
  },
  statementSnapshot: {
    id: "statement-1",
    statementNumber: "STM-2026-001",
    contentHash: "c".repeat(64),
    closingBalance: { toFixed: () => "125.50" },
    currency: "XAF",
    organization: { name: "Demo Shop" },
  },
}

function settlementTx() {
  return {
    businessEventOutbox: {
      findFirst: jest.fn().mockResolvedValue({
        id: "outbox-1",
        payloadHash: request.payloadHash,
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    customerStatementDelivery: {
      findFirst: jest.fn().mockResolvedValue({
        ...delivery,
        states: [{
          version: 1,
          status: CustomerStatementDeliveryStatus.QUEUED,
          stateHash: "f".repeat(64),
        }],
      }),
    },
    customerStatementDeliveryState: {
      create: jest.fn().mockResolvedValue({ id: "state-2" }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }
}

describe("customer statement delivery worker", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(request)
    mockDb.customerStatementDelivery.findFirst.mockResolvedValue(delivery)
    mockOpenEnvelope.mockReturnValue({
      destination: "customer@example.com",
      accessUrl: "https://stoquify.test/customer-statement/statement-1?token=signed-token&ref=referral_code_123",
      statementSnapshotId: "statement-1",
      tokenId: "token-1",
      referralCode: "referral_code_123",
      issuedAt: "2026-08-09T10:00:00.000Z",
    })
    mockVerifyToken.mockReturnValue({
      ok: true,
      payload: {
        organizationId: "org-1",
        statementContentHash: "c".repeat(64),
      },
    })
    mockRecordEvent.mockResolvedValue({
      event: { id: "delivery-sent-event" },
      created: true,
    })
    mockMarkApplied.mockResolvedValue({ id: "delivery-sent-event" })
  })

  it("claims only actionable delivery outbox rows by compare-and-set", async () => {
    mockDb.businessEventOutbox.findMany.mockResolvedValue([
      { id: "outbox-1" },
      { id: "outbox-2" },
    ])
    mockDb.businessEventOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })

    const claimed = await claimCustomerStatementDeliveries({
      workerId: "worker-1",
      now,
    })

    expect(claimed).toEqual(["outbox-1"])
    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenCalledTimes(2)
  })

  it("revalidates sealed evidence and appends SENT state after provider acceptance", async () => {
    const transaction = settlementTx()
    mockDb.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(transaction))
    const send = jest.fn().mockResolvedValue({
      status: "SENT",
      providerReference: "provider-message-1",
      retryable: false,
      message: "accepted",
    })

    const result = await processCustomerStatementDelivery({
      requestId: "outbox-1",
      workerId: "worker-1",
      now,
      environment: {
        AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY: "22".repeat(32),
      },
      dependencies: { sendCustomerStatementDelivery: send },
    })

    expect(result.status).toBe("SENT")
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      channel: "EMAIL",
      destination: "customer@example.com",
      statementNumber: "STM-2026-001",
      referralCode: "referral_code_123",
    }), expect.any(Object))
    expect(transaction.businessEventOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: BusinessOutboxStatus.SENT }),
    }))
    expect(transaction.customerStatementDeliveryState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        version: 2,
        status: CustomerStatementDeliveryStatus.SENT,
        previousStateHash: "f".repeat(64),
        providerReferenceHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    })
    expect(mockMarkApplied).toHaveBeenCalled()
  })

  it("fails the lease closed before provider access when envelope integrity drifts", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue({
      ...request,
      payload: { ...payload, sealedEnvelopeHash: "sha256:" + "0".repeat(64) },
    })
    mockDb.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })
    const send = jest.fn()

    await expect(processCustomerStatementDelivery({
      requestId: "outbox-1",
      workerId: "worker-1",
      now,
      dependencies: { sendCustomerStatementDelivery: send },
    })).rejects.toThrow("envelope hash does not match")

    expect(send).not.toHaveBeenCalled()
    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: BusinessOutboxStatus.FAILED,
        lastErrorCode: "STATEMENT_DELIVERY_INTEGRITY_FAILED",
      }),
    }))
  })
})
