import {
  openAccountantClientInviteEnvelope,
  sealAccountantClientInviteEnvelope,
} from "../accountant-client-invite-envelope"

const environment = {
  AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY: "ab".repeat(32),
}

const payload = {
  destination: "accountant@example.test",
  inviteUrl: "https://stoquify.example/api/referrals/referral-code-123",
  inviteId: "invite-1",
  referralCode: "referral-code-123",
  issuedAt: "2026-08-09T16:00:00.000Z",
}

describe("accountant client invite envelope", () => {
  it("encrypts provider-only invitation data with authenticated encryption", () => {
    const sealed = sealAccountantClientInviteEnvelope(payload, environment)

    expect(sealed).toBeTruthy()
    expect(sealed).not.toContain(payload.destination)
    expect(sealed).not.toContain(payload.inviteUrl)
    expect(openAccountantClientInviteEnvelope(sealed!, environment)).toEqual(
      payload,
    )
  })

  it("rejects tampered or incorrectly keyed envelopes", () => {
    const sealed = sealAccountantClientInviteEnvelope(payload, environment)!
    const tampered = sealed.slice(0, -1) + (sealed.endsWith("a") ? "b" : "a")

    expect(openAccountantClientInviteEnvelope(tampered, environment)).toBeNull()
    expect(
      openAccountantClientInviteEnvelope(sealed, {
        AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY: "cd".repeat(32),
      }),
    ).toBeNull()
  })
})
