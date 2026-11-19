import {
  AccountantAccessRole,
  AccountantClientInviteStatus,
  BusinessOutboxStatus,
  Prisma,
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
  runAccountantClientInviteWorker,
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
  const value = {
    id: "outbox-1",
    organizationId: "client-org",
    eventName: "accountant.client.invite.requested",
    idempotencyKey: "accountant-client-invite:invite-1",
    status: BusinessOutboxStatus.LOCKED,
    lockedBy: "worker-1",
    updatedAt: now,
    metadata: null as unknown,
    attempts: 1,
    maxAttempts: 5,
    payloadHash: "",
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
  value.payloadHash = hashBusinessPayload(value.payload)
  return value
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
      { id: "outbox-1", attempts: 0, updatedAt: now },
      { id: "outbox-2", attempts: 0, updatedAt: now },
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
    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "client-org", attempts: 0, updatedAt: now }),
    }))
  })

  it("verifies the encrypted evidence and settles a sent invitation", async () => {
    const outbox = request()
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outbox)
    mockDb.accountantClientInvite.findFirst.mockResolvedValue(invite())
    const tx = {
      businessEventOutbox: {
        findFirst: jest.fn().mockResolvedValue({
          ...outbox,
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
        organizationId: "client-org",
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
    outbox.payloadHash = hashBusinessPayload(outbox.payload)
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outbox)
    mockDb.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })
    const sender = jest.fn()
    mockDb.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(settlementTransaction(outbox)))

    await expect(
      processAccountantClientInvite({
        organizationId: "client-org",
        requestId: "outbox-1",
        workerId: "worker-1",
        now,
        environment,
        dependencies: { sendAccountantClientInvite: sender },
      }),
    ).resolves.toMatchObject({ status: "DEAD_LETTER", code: "ACCOUNTANT_INVITE_INTEGRITY_FAILED" })
    expect(sender).not.toHaveBeenCalled()
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
    mockDb.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(settlementTransaction(outbox)))

    await expect(
      processAccountantClientInvite({
        organizationId: "client-org",
        requestId: "outbox-1",
        workerId: "worker-1",
        now,
        environment,
        dependencies: { sendAccountantClientInvite: sender },
      }),
    ).resolves.toMatchObject({ status: "DEAD_LETTER", code: "ACCOUNTANT_INVITE_INTEGRITY_FAILED" })
    expect(sender).not.toHaveBeenCalled()
  })
})

function settlementTransaction(outbox = request()) {
  return {
    businessEventOutbox: {
      findFirst: jest.fn().mockResolvedValue(outbox),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    accountantClientInvite: { findFirst: jest.fn().mockResolvedValue(invite()) },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
  }
}

const executionId = "c3340b7f-363f-4b92-8e92-8eb1f6c70727"
const dispatch = (attempt: number, outcome: string) => ({ accountantInviteDispatch: {
  version: 1, attempt, executionId, reservedAt: now.toISOString(), outcome,
} })
const processing = (dependencies: { sendAccountantClientInvite: jest.Mock }, extra = {}) => ({
  organizationId: "client-org", requestId: "outbox-1", workerId: "worker-1", now, environment, dependencies, ...extra,
})

describe("invitation dispatch authority and uncertain outcomes", () => {
  let outbox: ReturnType<typeof request>
  let transaction: ReturnType<typeof settlementTransaction>

  beforeEach(() => {
    jest.clearAllMocks()
    outbox = request()
    transaction = settlementTransaction(outbox)
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(outbox)
    mockDb.accountantClientInvite.findFirst.mockResolvedValue(invite())
    mockDb.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(transaction))
    mockRecordEvent.mockResolvedValue({ event: { id: "worker-event-1", outboxMessages: [] }, created: true })
    mockMarkApplied.mockResolvedValue(undefined)
  })

  it.each([undefined, "", "   "])("rejects a missing tenant before queue access: %s", async organizationId => {
    await expect(claimAccountantClientInvites({ organizationId: organizationId as string, workerId: "worker-1" })).rejects.toThrow()
    await expect(processAccountantClientInvite(processing({ sendAccountantClientInvite: jest.fn() }, { organizationId }))).rejects.toThrow()
    expect(mockDb.businessEventOutbox.findMany).not.toHaveBeenCalled()
    expect(mockDb.businessEventOutbox.findFirst).not.toHaveBeenCalled()
  })

  it("cannot process an outbox ID outside the explicitly requested tenant", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue(null)
    const send = jest.fn()
    await expect(processAccountantClientInvite(processing({ sendAccountantClientInvite: send }, { organizationId: "foreign-org" }))).rejects.toThrow()
    expect(mockDb.businessEventOutbox.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ organizationId: "foreign-org" }) })
    expect(send).not.toHaveBeenCalled()
  })

  it.each([0, -1, 101, 1.5, NaN])("rejects invalid claim limits before queue access: %s", async limit => {
    await expect(claimAccountantClientInvites({ organizationId: "client-org", workerId: "worker-1", limit })).rejects.toThrow()
    expect(mockDb.businessEventOutbox.findMany).not.toHaveBeenCalled()
  })

  it("reserves dispatch with an exact tenant/generation before provider access", async () => {
    const send = jest.fn(async () => {
      expect(transaction.businessEventOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ organizationId: "client-org", lockedBy: "worker-1", attempts: 1, updatedAt: now, metadata: expect.anything() }),
        data: expect.objectContaining({ metadata: expect.objectContaining({ accountantInviteDispatch: expect.objectContaining({ outcome: "RESERVED", attempt: 1, executionId: expect.any(String) }) }) }),
      }))
      return { status: "SENT" as const, provider: "RESEND" as const, providerReference: "message-1" }
    })
    await expect(processAccountantClientInvite(processing({ sendAccountantClientInvite: send }))).resolves.toMatchObject({ status: "SENT" })
    expect(transaction.businessEventOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "client-org", attempts: 1, metadata: { path: ["accountantInviteDispatch", "executionId"], equals: expect.any(String) } }),
    }))
  })

  it("does not send when another invocation wins the reservation", async () => {
    transaction.businessEventOutbox.updateMany.mockResolvedValue({ count: 0 })
    const send = jest.fn()
    expect(await processAccountantClientInvite(processing({ sendAccountantClientInvite: send }))).toMatchObject({ status: "LEASE_LOST" })
    expect(send).not.toHaveBeenCalled()
    expect(mockRecordEvent).not.toHaveBeenCalled()
  })

  it("fences an observed null across both SQL NULL and JSON null representations", async () => {
    const send = jest.fn().mockResolvedValue({ status: "SENT", provider: "RESEND", providerReference: "message-1" })
    expect(await processAccountantClientInvite(processing({ sendAccountantClientInvite: send }))).toMatchObject({ status: "SENT" })
    expect(transaction.businessEventOutbox.updateMany.mock.calls[0][0].where).toEqual(expect.objectContaining({
      attempts: 1, updatedAt: now, metadata: { equals: Prisma.AnyNull },
    }))
  })

  it("observes an in-flight reservation without sending or taking ownership", async () => {
    outbox.metadata = dispatch(1, "RESERVED")
    const send = jest.fn()
    expect(await processAccountantClientInvite(processing({ sendAccountantClientInvite: send }))).toMatchObject({ status: "PROCESSING" })
    expect(send).not.toHaveBeenCalled()
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it.each(["legacy", "reserved", "unknown", "accepted", "malformed"])("holds reclaimed %s evidence without automatic resend", async kind => {
    outbox.attempts = 2
    outbox.metadata = kind === "legacy" ? null : kind === "malformed" ? { accountantInviteDispatch: { outcome: "RESERVED" } } : dispatch(1, kind.toUpperCase())
    const send = jest.fn()
    expect(await processAccountantClientInvite(processing({ sendAccountantClientInvite: send }))).toMatchObject({ status: "DEFERRED", code: "PROVIDER_OUTCOME_UNKNOWN" })
    expect(send).not.toHaveBeenCalled()
    expect(transaction.businessEventOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "client-org", attempts: 2, updatedAt: now }), data: expect.objectContaining({ status: "DEFERRED", lastErrorCode: "PROVIDER_OUTCOME_UNKNOWN", lastErrorMessage: null }) }))
  })

  it("permits a retry only after the immediately prior attempt proved no send", async () => {
    outbox.attempts = 2
    outbox.metadata = dispatch(1, "NOT_SENT")
    const send = jest.fn().mockResolvedValue({ status: "SENT", provider: "RESEND", providerReference: "message-2" })
    expect(await processAccountantClientInvite(processing({ sendAccountantClientInvite: send }))).toMatchObject({ status: "SENT" })
    expect(send).toHaveBeenCalledTimes(1)
  })

  it.each(["throw", "timeout", "unknown", "missing-reference"])("holds %s after dispatch and never schedules automatic retry", async kind => {
    const send = jest.fn(() => kind === "throw" ? Promise.reject(new Error("private provider detail"))
      : kind === "timeout" ? new Promise<never>(() => {})
        : kind === "missing-reference" ? Promise.resolve({ status: "SENT", provider: "RESEND", providerReference: " " })
          : Promise.resolve({ status: "UNKNOWN", provider: "RESEND", errorCode: "ACCOUNTANT_INVITE_PROVIDER_OUTCOME_UNKNOWN", retryable: false }))
    expect(await processAccountantClientInvite(processing({ sendAccountantClientInvite: send }, { providerTimeoutMs: 5 }))).toMatchObject({ status: "DEFERRED", code: "PROVIDER_OUTCOME_UNKNOWN" })
    expect(send).toHaveBeenCalledTimes(1)
    expect(transaction.businessEventOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "client-org", attempts: 1, metadata: { path: ["accountantInviteDispatch", "executionId"], equals: expect.any(String) } }),
      data: expect.objectContaining({ status: "DEFERRED", lastErrorCode: "PROVIDER_OUTCOME_UNKNOWN", lastErrorMessage: null }),
    }))
  })

  it.each([true, false])("fences late provider success/failure from a same-worker reclaimed generation: %s", async accepted => {
    // The provider resolves only after another claim has advanced this request.
    // The database mock grants a read only when the actual lease predicate
    // still contains the current attempt, rather than returning a fixed count.
    const send = jest.fn(async () => {
      transaction.businessEventOutbox.findFirst.mockImplementation(async ({ where }) =>
        where.attempts === 2 ? { ...outbox, attempts: 2, metadata: dispatch(2, "RESERVED") } : null)
      return accepted ? { status: "SENT", provider: "RESEND", providerReference: "old-message" }
        : { status: "FAILED", provider: "RESEND", errorCode: "OLD_REJECTION", retryable: true }
    })
    expect(await processAccountantClientInvite(processing({ sendAccountantClientInvite: send }))).toMatchObject({ status: "LEASE_LOST" })
    expect(transaction.businessEventOutbox.updateMany).toHaveBeenCalledTimes(1)
    expect(mockRecordEvent).not.toHaveBeenCalled()
  })

  it("retains a reservation when settlement is unavailable after provider acceptance", async () => {
    mockDb.$transaction.mockImplementationOnce(async callback => callback(transaction))
      .mockRejectedValue(new Error("private database detail"))
    const send = jest.fn().mockResolvedValue({ status: "SENT", provider: "RESEND", providerReference: "message-1" })
    await expect(processAccountantClientInvite(processing({ sendAccountantClientInvite: send }))).rejects.toThrow(/outcome could not be recorded/)
    expect(send).toHaveBeenCalledTimes(1)
    expect(transaction.businessEventOutbox.updateMany).toHaveBeenCalledTimes(1)
    expect(transaction.businessEventOutbox.updateMany.mock.calls[0][0].data.metadata.accountantInviteDispatch.outcome).toBe("RESERVED")
  })

  it("does not send after an exhausted known-unsent attempt", async () => {
    outbox.attempts = 6
    outbox.metadata = dispatch(5, "NOT_SENT")
    const send = jest.fn()
    expect(await processAccountantClientInvite(processing({ sendAccountantClientInvite: send }))).toMatchObject({ status: "DEAD_LETTER", code: "ACCOUNTANT_INVITE_ATTEMPTS_EXHAUSTED" })
    expect(send).not.toHaveBeenCalled()
  })

  it("threads the tenant into every processed request and redacts unexpected worker errors", async () => {
    mockDb.businessEventOutbox.findMany.mockResolvedValue([{ id: "outbox-1", attempts: 0, updatedAt: now }])
    mockDb.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })
    mockDb.businessEventOutbox.findFirst.mockRejectedValue(new Error("private token"))
    expect(await runAccountantClientInviteWorker({ organizationId: "client-org", workerId: "worker-1", now })).toEqual([
      { requestId: "outbox-1", status: "UNCONFIRMED", error: "Accountant invitation outcome is unconfirmed. Review the retained request." },
    ])
    expect(mockDb.businessEventOutbox.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ organizationId: "client-org" }) })
  })
})
