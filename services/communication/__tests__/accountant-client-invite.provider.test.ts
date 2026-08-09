import { sendAccountantClientInvite } from "../accountant-client-invite.provider"

const input = {
  destination: "accountant@example.test",
  inviteUrl: "https://stoquify.example/api/referrals/referral-code-123",
  organizationName: "Client SA",
  accountantFirmName: "Trusted Ledger LLP",
  role: "REVIEWER" as const,
  locale: "EN" as const,
  expiresAt: "2026-12-31T23:59:59.000Z",
  referralCode: "referral-code-123",
  idempotencyKey: "outbox-1",
}

describe("accountant client invite provider", () => {
  it("defers without making a network call when live sends are disabled", async () => {
    const fetcher = jest.fn()

    await expect(
      sendAccountantClientInvite(input, {}, fetcher as typeof fetch),
    ).resolves.toEqual(
      expect.objectContaining({
        status: "DEFERRED",
        errorCode: "ACCOUNTANT_INVITE_EMAIL_NOT_CONFIGURED",
      }),
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("sends a branded, idempotent Resend email when configured", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "email-1" }),
    })

    await expect(
      sendAccountantClientInvite(
        input,
        {
          STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: "true",
          RESEND_API_KEY: "secret",
          STOQUIFY_ACCOUNTANT_INVITE_FROM_EMAIL: "invites@stoquify.example",
        },
        fetcher as typeof fetch,
      ),
    ).resolves.toEqual({
      status: "SENT",
      provider: "RESEND",
      providerReference: "email-1",
    })

    const request = fetcher.mock.calls[0][1]
    expect(request.headers["Idempotency-Key"]).toBe("outbox-1")
    const body = JSON.parse(request.body)
    expect(body.to).toEqual(["accountant@example.test"])
    expect(body.html).toContain("Powered by Stoquify")
    expect(body.html).toContain("referral-code-123")
  })

  it("marks a provider rejection as non-retryable", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "invalid" }),
    })

    await expect(
      sendAccountantClientInvite(
        input,
        {
          STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: "true",
          RESEND_API_KEY: "secret",
          RESEND_FROM_EMAIL: "invites@stoquify.example",
        },
        fetcher as typeof fetch,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        status: "FAILED",
        retryable: false,
      }),
    )
  })
})
