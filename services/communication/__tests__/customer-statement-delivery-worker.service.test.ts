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
  hashBusinessPayload,
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
const statementPayload = { recordedBalance: "125.50" }
const statementHash = hashBusinessPayload(statementPayload)
const rawHash = (value: string) => createHash("sha256").update(value).digest("hex")

const sealedEnvelope = "v1.sealed-envelope"
const sealedEnvelopeHash = "sha256:" + createHash("sha256")
  .update(sealedEnvelope)
  .digest("hex")
const payload = {
  schemaVersion: "customer-statement-delivery.v1",
  deliveryId: "delivery-1",
  organizationId: "org-1",
  statementSnapshotId: "statement-1",
  statementContentHash: statementHash,
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
  payloadHash: hashBusinessPayload(payload),
  metadata: null,
  updatedAt: now,
}

const delivery = {
  id: "delivery-1",
  organizationId: "org-1",
  statementSnapshotId: "statement-1",
  statementContentHash: statementHash,
  tokenId: "token-1",
  attributionId: "attribution-1",
  destinationHash: payload.destinationHash,
  consentEvidenceHash: payload.consentEvidenceHash,
  channel: "EMAIL",
  locale: "EN",
  states: [{ status: "QUEUED" }],
  payloadHash: "e".repeat(64),
  token: {
    id: "token-1",
    tokenHash: rawHash("signed-token"),
    jtiHash: rawHash("signed-jti"),
    status: "ACTIVE",
    revokedAt: null,
    expiresAt: new Date("2026-09-08T10:00:00.000Z"),
    statementContentHash: statementHash,
  },
  attribution: {
    id: "attribution-1",
    referralCode: "referral_code_123",
  },
  statementSnapshot: {
    id: "statement-1",
    statementNumber: "STM-2026-001",
    contentHash: statementHash,
    statementPayload,
    truncated: false,
    closingBalance: { toFixed: () => "125.50" },
    currency: "XAF",
    organization: { name: "Demo Shop", isActive: true, deletedAt: null },
  },
}

function settlementTx() {
  return {
    businessEventOutbox: {
      findFirst: jest.fn().mockResolvedValue(request),
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
    customerStatementAccessToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
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
    mockDb.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(settlementTx()))
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
        statementContentHash: statementHash,
        jti: "signed-jti",
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
      organizationId: "org-1",
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
      organizationId: "org-1",
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
    const transaction = settlementTx()
    mockDb.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(transaction))
    mockDb.businessEventOutbox.findFirst.mockResolvedValue({
      ...request,
      payload: { ...payload, sealedEnvelopeHash: "sha256:" + "0".repeat(64) },
    })
    mockDb.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })
    const send = jest.fn()

    await expect(processCustomerStatementDelivery({
      organizationId: "org-1",
      requestId: "outbox-1",
      workerId: "worker-1",
      now,
      dependencies: { sendCustomerStatementDelivery: send },
    })).resolves.toMatchObject({ status: "DEAD_LETTER" })

    expect(send).not.toHaveBeenCalled()
    expect(transaction.businessEventOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: BusinessOutboxStatus.DEAD_LETTER,
        lastErrorCode: "STATEMENT_DELIVERY_INTEGRITY_FAILED",
      }),
    }))
    expect(transaction.customerStatementDeliveryState.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "DEAD_LETTER" }) })
  })

  it("rejects a missing tenant before reading or claiming work", async () => {
    await expect(claimCustomerStatementDeliveries({ organizationId: "", workerId: "worker-1" })).rejects.toThrow()
    expect(mockDb.businessEventOutbox.findMany).not.toHaveBeenCalled()
  })

  it.each(["REVOKED", "EXPIRED"])("retains a cancelled outcome without dispatching %s access", async status => {
    const transaction = settlementTx(), send = jest.fn()
    mockDb.$transaction.mockImplementation(async callback => callback(transaction))
    mockDb.customerStatementDelivery.findFirst.mockResolvedValue({ ...delivery, token: { ...delivery.token, status } })
    expect(await processCustomerStatementDelivery({ organizationId: "org-1", requestId: "outbox-1", workerId: "worker-1", now, dependencies: { sendCustomerStatementDelivery: send } })).toMatchObject({ status: "CANCELLED" })
    expect(send).not.toHaveBeenCalled()
    expect(transaction.customerStatementDeliveryState.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "CANCELLED" }) })
  })

  it("observes an already reserved operation without sending or settling it again", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue({ ...request, metadata: { statementDispatch: { version: 1, attempt: 1, executionId: "826a101c-ad93-43e6-87cd-5629d2f3dd9e", reservedAt: now.toISOString(), outcome: "RESERVED" } } })
    const send = jest.fn()
    expect(await processCustomerStatementDelivery({ organizationId: "org-1", requestId: "outbox-1", workerId: "worker-1", now, dependencies: { sendCustomerStatementDelivery: send } })).toMatchObject({ status: "PROCESSING" })
    expect(send).not.toHaveBeenCalled(); expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("holds a legacy retried request with no dispatch evidence instead of guessing it was not sent", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue({ ...request, attempts: 2 })
    const send = jest.fn()
    expect(await processCustomerStatementDelivery({ organizationId: "org-1", requestId: "outbox-1", workerId: "worker-1", now, dependencies: { sendCustomerStatementDelivery: send } })).toMatchObject({ status: "DEFERRED", code: "PROVIDER_OUTCOME_UNKNOWN" })
    expect(send).not.toHaveBeenCalled()
  })

  it.each(["throw", "timeout", "missing-reference"])("holds %s after reserving dispatch and never schedules automatic retry", async kind => {
    const transaction = settlementTx()
    mockDb.$transaction.mockImplementation(async callback => callback(transaction))
    const send = jest.fn(() => kind === "throw" ? Promise.reject(new Error("private provider details")) : kind === "timeout" ? new Promise<never>(() => {}) : Promise.resolve({ status: "SENT" as const, retryable: false, message: "accepted without evidence" }))
    const result = await processCustomerStatementDelivery({ organizationId: "org-1", requestId: "outbox-1", workerId: "worker-1", now, providerTimeoutMs: 5, dependencies: { sendCustomerStatementDelivery: send } })
    expect(result).toMatchObject({ status: "DEFERRED", code: "PROVIDER_OUTCOME_UNKNOWN" }); expect(send).toHaveBeenCalledTimes(1)
    expect(transaction.businessEventOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "DEFERRED", lastErrorMessage: null }), where: expect.objectContaining({ organizationId: "org-1", attempts: 1, metadata: { path: ["statementDispatch", "executionId"], equals: expect.any(String) } }) }))
  })

  it("does not settle acceptance after losing its generation", async () => {
    const transaction = settlementTx()
    transaction.businessEventOutbox.findFirst.mockResolvedValue(null)
    mockDb.$transaction.mockImplementation(async callback => callback(transaction))
    const send = jest.fn().mockResolvedValue({ status: "SENT", providerReference: "accepted", retryable: false, message: "accepted" })
    expect(await processCustomerStatementDelivery({ organizationId: "org-1", requestId: "outbox-1", workerId: "worker-1", now, dependencies: { sendCustomerStatementDelivery: send } })).toMatchObject({ status: "LEASE_LOST" })
    expect(transaction.customerStatementDeliveryState.create).not.toHaveBeenCalled()
  })
})
