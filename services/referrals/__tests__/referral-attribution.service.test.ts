jest.mock("@/services/accounting/accountant-client-invite.service", () => ({
  acceptAccountantClientInviteInTx: jest.fn(),
}))

import { acceptAccountantClientInviteInTx } from "@/services/accounting/accountant-client-invite.service"
import {
  recordReferralClick,
  recordReferralConversionInTx,
} from "../referral-attribution.service"
import { hashBusinessPayload } from "@/services/events/business-event.service"

const now = new Date("2026-08-09T10:00:00.000Z")
const mockAcceptInvite = acceptAccountantClientInviteInTx as jest.Mock
const inviteToken = "invite-token-" + "a".repeat(32)

function client(sourceType: "CUSTOMER_STATEMENT" | "ACCOUNTANT_INVITE" = "CUSTOMER_STATEMENT") {
  const tx = {
    referralAttribution: {
      findUnique: jest.fn().mockResolvedValue({
        id: "attribution-1",
        organizationId: "source-org-1",
        sourceType,
        campaign: "customer_statement_share",
        accountantClientInvite: sourceType === "ACCOUNTANT_INVITE"
          ? { inviteTokenHash: hashBusinessPayload(inviteToken) }
          : null,
      }),
    },
    referralAttributionEvent: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  }
  return {
    tx,
    db: {
      $transaction: jest.fn(async (callback: (value: unknown) => unknown) => callback(tx)),
    },
  }
}

describe("referral attribution service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAcceptInvite.mockResolvedValue({ accepted: true })
  })

  it("records a privacy-bounded click and preserves the referral code into registration", async () => {
    const fixture = client()

    const result = await recordReferralClick({
      referralCode: "referral_code_123",
      ipAddress: "203.0.113.10",
      userAgent: "Referral Browser",
      now,
    }, fixture.db as never)

    expect(result.registrationPath).toBe("/register-v2?ref=referral_code_123")
    expect(fixture.tx.referralAttributionEvent.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        organizationId: "source-org-1",
        attributionId: "attribution-1",
        eventType: "CLICK",
        subjectHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        payloadHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        metadata: {
          source: "REFERRAL_REDIRECT",
          requestMetadataHashed: true,
        },
      })],
      skipDuplicates: true,
    })
    expect(JSON.stringify(fixture.tx.referralAttributionEvent.createMany.mock.calls[0][0]))
      .not.toContain("203.0.113.10")
  })

  it("routes accountant invitations into accountant onboarding", async () => {
    const fixture = client("ACCOUNTANT_INVITE")

    const result = await recordReferralClick({
      referralCode: "accountant_ref_123",
      inviteToken,
      now,
    }, fixture.db as never)

    expect(result.registrationPath).toBe(
      "/register-v2?ref=accountant_ref_123&role=accountant&invite=" +
        inviteToken,
    )
  })

  it("rejects an accountant referral click without its secret token", async () => {
    const fixture = client("ACCOUNTANT_INVITE")

    await expect(recordReferralClick({
      referralCode: "accountant_ref_123",
      now,
    }, fixture.db as never)).rejects.toThrow("Referral not found")
    expect(fixture.tx.referralAttributionEvent.createMany).not.toHaveBeenCalled()
  })

  it("records a conversion against the source attribution without storing the email", async () => {
    const fixture = client()

    const result = await recordReferralConversionInTx(fixture.tx as never, {
      referralCode: "referral_code_123",
      targetOrganizationId: "new-org-1",
      subject: "New.Owner@Example.com",
      now,
    })

    expect(result).toMatchObject({ attributionId: "attribution-1", recorded: true })
    const call = fixture.tx.referralAttributionEvent.createMany.mock.calls[0][0]
    expect(call.data[0]).toMatchObject({
      organizationId: "source-org-1",
      targetOrganizationId: "new-org-1",
      eventType: "CONVERSION",
      sourceEventKey: "new-org-1",
      subjectHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    })
    expect(JSON.stringify(call)).not.toContain("New.Owner@Example.com")
  })

  it("activates an accepted accountant mandate inside conversion recording", async () => {
    const fixture = client("ACCOUNTANT_INVITE")

    const result = await recordReferralConversionInTx(fixture.tx as never, {
      referralCode: "accountant_ref_123",
      targetOrganizationId: "accountant-org",
      targetUserId: "accountant-user",
      subject: "Accountant@Example.com",
      accountantInviteToken: inviteToken,
      accountantInviteAccepted: true,
      now,
    })

    expect(mockAcceptInvite).toHaveBeenCalledWith(
      fixture.tx,
      {
        referralCode: "accountant_ref_123",
        targetOrganizationId: "accountant-org",
        accountantUserId: "accountant-user",
        accountantEmail: "Accountant@Example.com",
        inviteToken,
        recipientAccepted: true,
        now,
      },
    )
    expect(result?.accountantInviteActivation).toEqual({
      accepted: true,
    })
  })

  it("ignores malformed or unknown referral codes without blocking registration", async () => {
    const fixture = client()

    await expect(recordReferralConversionInTx(fixture.tx as never, {
      referralCode: "bad",
      targetOrganizationId: "new-org-1",
      subject: "owner@example.com",
      now,
    })).resolves.toBeNull()
    fixture.tx.referralAttribution.findUnique.mockResolvedValue(null)
    await expect(recordReferralConversionInTx(fixture.tx as never, {
      referralCode: "unknown_code_123",
      targetOrganizationId: "new-org-1",
      subject: "owner@example.com",
      now,
    })).resolves.toBeNull()

    expect(fixture.tx.referralAttributionEvent.createMany).not.toHaveBeenCalled()
  })
})
