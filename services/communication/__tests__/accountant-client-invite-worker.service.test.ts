import {
  AccountantAccessRole,
  AccountantClientInviteStatus,
  BusinessOutboxStatus,
} from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    businessEventOutbox: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    accountantClientInvite: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual(
    "@/services/events/business-event.service",
  )
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  }
})

import { db } from "@/prisma/db"
import { sealAccountantClientInviteEnvelope } from "@/services/accounting/accountant-client-invite-envelope"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  claimAccountantClientInvites,
  processAccountantClientInvite,
} from "../accountant-client-invite-worker.service"

const mockDb = db as unknown as {
  businessEventOutbox: {
    findMany: jest.Mock
    findFirst: jest.Mock
    updateMany: jest.Mock
  }
  accountantClientInvite: {
    findFirst: jest.Mock
  }
  $transaction: jest.Mock
}
const mockRecordEvent = recordBusinessEventInTx as jest.Mock
const mockMarkApplied = markBusinessEventAppliedInTx as jest.Mock

const now = new Date("2026-08-09T16:00:00.000Z")
const expiresAt = new Date("2026-12-31T23:59:59.000Z")
const environment = {
  AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY: "ab".repeat(32),
}
const inviteToken = "invite-token-" + "a".repeat(32)
const sealedEnvelope = sealAccountantClientInviteEnvelope({
  destination: "accountant@example.test",
  inviteUrl:
    "https://stoquify.example/api/referrals/referral-code-123?invite=" +
    inviteToken,
  inviteId: "invite-1",
  referralCode: "referral-code-123",
  issuedAt: now.toISOString(),
}, environment)!
const emailHash = hashBusinessPayload("accountant@example.test")

function request() {
  return {
    id: "outbox-1",
    organizationId: "client-org",
    eventName: "accountant.client.invite.requested",
    idempotencyKey: "accountant-client-invite:invite-1",
    status: BusinessOutboxStatus.LOCKED,
    attempts: 1,
    maxAttempts: 5,
    payloadHash: "d".repeat(64),
    payload: {
      schemaVersion: "accountant-client-invite.v1",
      inviteId: "invite-1",
      organizationId: "client-org",
      attributionId: "attribution-1",
      referralCode: "referral-code-123",
      emailHash,
      redactedEmail: "a***@example.test",
      role: "REVIEWER",
      locale: "EN",
      consentEvidenceHash: `sha256:${"a".repeat(64)}`,
      expiresAt: expiresAt.toISOString(),
      sealedEnvelope,
      sealedEnvelopeHash: hashBusinessPayload(sealedEnvelope),
    },
  }
}

function invite() {
  return {
    id: "invite-1",
    organizationId: "client-org",
    attributionId: "attribution-1",
    inviteTokenHash: hashBusinessPayload(inviteToken),
    emailHash,
    redactedEmail: "a***@example.test",
    accountantFirmName: "Trusted Ledger LLP",
    accountantFirmRegistrationNumber: null,
    role: AccountantAccessRole.REVIEWER,
    consentEvidenceHash: `sha256:${"a".repeat(64)}`,
    expiresAt,
    evidenceHash: "b".repeat(64),
    attribution: {
      id: "attribution-1",
      referralCode: "referral-code-123",
    },
    organization: { name: "Client SA" },
    states: [{ status: AccountantClientInviteStatus.PENDING }],
  }
}

describe("accountant client invite worker", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRecordEvent.mockResolvedValue({
      event: { id: "worker-event-1", outboxMessages: [] },
      created: true,
    })
    mockMarkApplied.mockResolvedValue(undefined)
  })

  it("claims only eligible invitation outbox rows with compare-and-set", async () => {
    mockDb.businessEventOutbox.findMany.mockResolvedValue([
      { id: "outbox-1" },
      { id: "outbox-2" },
    ])
    mockDb.businessEventOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })

    await expect(
      claimAccountantClientInvites({
        organizationId: "client-org",
        workerId: "worker-1",
        now,
      }),
    ).resolves.toEqual(["outbox-1"])
    expect(mockDb.businessEventOutbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "client-org",
          eventName: "accountant.client.invite.requested",
        }),
      }),
    )
  })

  it("verifies the encrypted evidence and settles a sent invitation", async () => {
    const outbox = request()
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outbox)
    mockDb.accountantClientInvite.findFirst.mockResolvedValue(invite())
    const tx = {
      businessEventOutbox: {
        findFirst: jest.fn().mockResolvedValue({
          id: "outbox-1",
          payloadHash: outbox.payloadHash,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      accountantClientInvite: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invite-1",
          organizationId: "client-org",
          evidenceHash: "b".repeat(64),
          redactedEmail: "a***@example.test",
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    }
    mockDb.$transaction.mockImplementation(
      async (callback: (value: typeof tx) => unknown) => callback(tx),
    )
    const sender = jest.fn().mockResolvedValue({
      status: "SENT",
      provider: "RESEND",
      providerReference: "email-1",
    })

    await expect(
      processAccountantClientInvite({
        requestId: "outbox-1",
        workerId: "worker-1",
        now,
        environment,
        dependencies: { sendAccountantClientInvite: sender },
      }),
    ).resolves.toEqual({ requestId: "outbox-1", status: "SENT" })
    expect(sender).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: "accountant@example.test",
        organizationName: "Client SA",
        referralCode: "referral-code-123",
      }),
      environment,
    )
    expect(tx.businessEventOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BusinessOutboxStatus.SENT,
          lockedAt: null,
          lockedBy: null,
        }),
      }),
    )
  })

  it("fails closed before provider delivery when envelope evidence drifts", async () => {
    const outbox = request()
    outbox.payload.sealedEnvelopeHash = "e".repeat(64)
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outbox)
    mockDb.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })
    const sender = jest.fn()

    await expect(
      processAccountantClientInvite({
        requestId: "outbox-1",
        workerId: "worker-1",
        now,
        environment,
        dependencies: { sendAccountantClientInvite: sender },
      }),
    ).rejects.toThrow(/envelope hash/i)
    expect(sender).not.toHaveBeenCalled()
    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BusinessOutboxStatus.FAILED,
          lastErrorCode: "ACCOUNTANT_INVITE_INTEGRITY_FAILED",
        }),
      }),
    )
  })

  it("fails closed before provider delivery when the invite secret drifts", async () => {
    const outbox = request()
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outbox)
    mockDb.accountantClientInvite.findFirst.mockResolvedValue({
      ...invite(),
      inviteTokenHash: hashBusinessPayload(
        "different-invite-token-" + "b".repeat(32),
      ),
    })
    mockDb.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })
    const sender = jest.fn()

    await expect(
      processAccountantClientInvite({
        requestId: "outbox-1",
        workerId: "worker-1",
        now,
        environment,
        dependencies: { sendAccountantClientInvite: sender },
      }),
    ).rejects.toThrow(/referral URL is invalid/i)
    expect(sender).not.toHaveBeenCalled()
    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BusinessOutboxStatus.FAILED,
          lastErrorCode: "ACCOUNTANT_INVITE_INTEGRITY_FAILED",
        }),
      }),
    )
  })
})
