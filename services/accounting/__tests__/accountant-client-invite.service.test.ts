import {
  AccountantAccessRole,
  AccountantClientInviteStatus,
  type Prisma,
} from "@prisma/client"

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

jest.mock("../accountant-access.service", () => ({
  grantAccountantAccess: jest.fn(),
}))

import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  acceptAccountantClientInviteInTx,
  queueAccountantClientInviteInTx,
} from "../accountant-client-invite.service"
import { openAccountantClientInviteEnvelope } from "../accountant-client-invite-envelope"

const mockRecordEvent = recordBusinessEventInTx as jest.Mock
const mockMarkApplied = markBusinessEventAppliedInTx as jest.Mock
const now = new Date("2026-08-09T16:00:00.000Z")
const expiresAt = new Date("2026-12-31T23:59:59.000Z")
const inviteToken = "invite-token-" + "a".repeat(32)

function queueTx() {
  const tx = {
    accountantClientInvite: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(async ({ data }) => data),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: "owner-1" }),
    },
    referralAttribution: {
      create: jest.fn().mockResolvedValue({ id: "attribution-1" }),
    },
    accountantClientInviteState: {
      create: jest.fn().mockResolvedValue({ id: "state-1" }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }
  return tx
}

describe("accountant client invite service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRecordEvent.mockResolvedValue({
      event: {
        id: "event-1",
        outboxMessages: [{
          id: "outbox-1",
          eventName: "accountant.client.invite.requested",
        }],
      },
      created: true,
    })
    mockMarkApplied.mockResolvedValue(undefined)
  })

  it("queues an immutable, consent-bound invite without persisting raw email", async () => {
    const tx = queueTx()
    const result = await queueAccountantClientInviteInTx(
      tx as unknown as Prisma.TransactionClient,
      "client-org",
      "owner-1",
      {
        accountantEmail: "Accountant@Example.test",
        accountantFirmName: "Trusted Ledger LLP",
        role: "REVIEWER",
        consentEvidenceHash: `sha256:${"a".repeat(64)}`,
        expiresAt,
        environment: {
          NODE_ENV: "test",
          NEXT_PUBLIC_APP_URL: "https://stoquify.example",
          AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY: "ab".repeat(32),
        },
      },
      now,
    )

    expect(result).toEqual(
      expect.objectContaining({
        organizationId: "client-org",
        redactedEmail: "a***@example.test",
        status: AccountantClientInviteStatus.PENDING,
        outboxId: "outbox-1",
        replayed: false,
      }),
    )
    const recorded = mockRecordEvent.mock.calls[0][1]
    expect(recorded.metadata).toEqual(
      expect.objectContaining({
        rawEmailStored: false,
        rawInviteTokenStored: false,
        providerEnvelope: "AES_256_GCM",
      }),
    )
    expect(JSON.stringify(recorded.payload)).not.toContain(
      "accountant@example.test",
    )
    expect(JSON.stringify(recorded.outboxMessages[0].payload)).not.toContain(
      "accountant@example.test",
    )
    const envelope = openAccountantClientInviteEnvelope(
      recorded.outboxMessages[0].payload.sealedEnvelope,
      {
        AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY: "ab".repeat(32),
      },
    )
    expect(envelope).not.toBeNull()
    expect(new URL(envelope!.inviteUrl).searchParams.get("invite")).toMatch(
      /^[A-Za-z0-9_-]{32,128}$/,
    )
    expect(tx.accountantClientInvite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        emailHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        redactedEmail: "a***@example.test",
        inviteTokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        evidenceHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    })
    expect(tx.accountantClientInviteState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        version: 1,
        status: AccountantClientInviteStatus.PENDING,
        previousStateHash: null,
      }),
    })
  })

  it("requires explicit recipient acceptance before creating client access", async () => {
    const tx = {
      accountantClientInvite: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invite-1",
          organizationId: "client-org",
          attributionId: "attribution-1",
          inviteTokenHash: hashBusinessPayload(inviteToken),
          emailHash:
            "fcd4f8f7b5c8df92ca0c7f824089dccb30ea861220232425f94df29bdab2b978",
          accountantFirmName: "Trusted Ledger LLP",
          accountantFirmRegistrationNumber: null,
          role: AccountantAccessRole.REVIEWER,
          consentGrantedById: "owner-1",
          consentGrantedAt: now,
          consentEvidenceHash: `sha256:${"a".repeat(64)}`,
          effectiveFrom: now,
          expiresAt,
          correlationId: "accountant-invite-correlation",
          evidenceHash: "b".repeat(64),
          attribution: { referralCode: "referral-code-123" },
          states: [{
            version: 1,
            status: AccountantClientInviteStatus.PENDING,
            stateHash: "c".repeat(64),
          }],
        }),
      },
      accountantAccessGrant: { create: jest.fn() },
    }

    await expect(
      acceptAccountantClientInviteInTx(
        tx as unknown as Prisma.TransactionClient,
        {
          referralCode: "referral-code-123",
          targetOrganizationId: "accountant-org",
          accountantUserId: "accountant-user",
          accountantEmail: "accountant@example.test",
          inviteToken,
          recipientAccepted: false,
          now,
        },
      ),
    ).rejects.toThrow(/acceptance is required/i)
    expect(tx.accountantAccessGrant.create).not.toHaveBeenCalled()
  })

  it("atomically accepts a matching invite and creates the cross-tenant grant", async () => {
    const { hashBusinessPayload } = jest.requireActual(
      "@/services/events/business-event.service",
    )
    const tx = {
      accountantClientInvite: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invite-1",
          organizationId: "client-org",
          attributionId: "attribution-1",
          inviteTokenHash: hashBusinessPayload(inviteToken),
          emailHash: hashBusinessPayload("accountant@example.test"),
          accountantFirmName: "Trusted Ledger LLP",
          accountantFirmRegistrationNumber: null,
          role: AccountantAccessRole.REVIEWER,
          consentGrantedById: "owner-1",
          consentGrantedAt: now,
          consentEvidenceHash: `sha256:${"a".repeat(64)}`,
          effectiveFrom: now,
          expiresAt,
          correlationId: "accountant-invite-correlation",
          evidenceHash: "b".repeat(64),
          attribution: { referralCode: "referral-code-123" },
          states: [{
            version: 1,
            status: AccountantClientInviteStatus.PENDING,
            stateHash: "c".repeat(64),
          }],
        }),
      },
      accountantAccessGrant: {
        create: jest.fn().mockResolvedValue({
          id: "grant-1",
          role: AccountantAccessRole.REVIEWER,
          expiresAt,
        }),
      },
      accountantClientInviteState: {
        create: jest.fn().mockResolvedValue({ id: "state-2" }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    }

    await expect(
      acceptAccountantClientInviteInTx(
        tx as unknown as Prisma.TransactionClient,
        {
          referralCode: "referral-code-123",
          targetOrganizationId: "accountant-org",
          accountantUserId: "accountant-user",
          accountantEmail: "accountant@example.test",
          inviteToken,
          recipientAccepted: true,
          now,
        },
      ),
    ).resolves.toEqual({
      inviteId: "invite-1",
      accessGrantId: "grant-1",
      accepted: true,
      replayed: false,
    })
    expect(tx.accountantAccessGrant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "client-org",
        accountantUserId: "accountant-user",
        activeScopeKey: "client-org:accountant-user",
        metadata: expect.objectContaining({
          accountantClientInviteId: "invite-1",
          accountantOrganizationId: "accountant-org",
        }),
      }),
    })
    expect(tx.accountantClientInviteState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        version: 2,
        status: AccountantClientInviteStatus.ACCEPTED,
        accountantUserId: "accountant-user",
        accessGrantId: "grant-1",
        previousStateHash: "c".repeat(64),
      }),
    })
  })

  it("rejects a matching email and referral when the invite secret is wrong", async () => {
    const tx = {
      accountantClientInvite: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invite-1",
          organizationId: "client-org",
          attributionId: "attribution-1",
          inviteTokenHash: hashBusinessPayload(inviteToken),
          emailHash: hashBusinessPayload("accountant@example.test"),
          accountantFirmName: "Trusted Ledger LLP",
          accountantFirmRegistrationNumber: null,
          role: AccountantAccessRole.REVIEWER,
          consentGrantedById: "owner-1",
          consentGrantedAt: now,
          consentEvidenceHash: "sha256:" + "a".repeat(64),
          effectiveFrom: now,
          expiresAt,
          correlationId: "accountant-invite-correlation",
          evidenceHash: "b".repeat(64),
          attribution: { referralCode: "referral-code-123" },
          states: [{
            version: 1,
            status: AccountantClientInviteStatus.PENDING,
            stateHash: "c".repeat(64),
          }],
        }),
      },
      accountantAccessGrant: { create: jest.fn() },
    }

    await expect(
      acceptAccountantClientInviteInTx(
        tx as unknown as Prisma.TransactionClient,
        {
          referralCode: "referral-code-123",
          targetOrganizationId: "accountant-org",
          accountantUserId: "accountant-user",
          accountantEmail: "accountant@example.test",
          inviteToken: "wrong-invite-token-" + "b".repeat(32),
          recipientAccepted: true,
          now,
        },
      ),
    ).rejects.toThrow(/credentials do not match/i)
    expect(tx.accountantAccessGrant.create).not.toHaveBeenCalled()
  })
})
