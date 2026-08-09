const {
  buildReleaseSecretPreflight,
  gateResultForReport,
  releaseEnabled,
  renderMarkdown,
} = require("../release-secret-preflight")

const identitySecret = "mV9!qT2#xK7@pR4$zN8&cF5*wH3+yL6="
const receiptSecret = "B4^sJ8!dQ2%vM7@kX5#nC9&rP3*tL6+Z"
const historySecret = "H7@vN3!xQ9%kR5#pL2&cW8*tM4+sZ6^D"
const statementTokenSecret = "T8!wQ4#nL9@xC2%pR7&vM5*kD3+sZ6^H"
const statementDeliveryKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
const accountantInviteKey = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
const resendApiKey = "re_live_referral_preflight_value"

function readyEnvironment(overrides = {}) {
  return {
    PUBLIC_IDENTITY_ABUSE_HASH_SECRET: identitySecret,
    AQSTOQFLOW_RECEIPT_TOKEN_SECRET: receiptSecret,
    AQSTOQFLOW_HISTORY_CURSOR_SECRET: historySecret,
    AQSTOQFLOW_STATEMENT_TOKEN_SECRET: statementTokenSecret,
    AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY: statementDeliveryKey,
    AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY: accountantInviteKey,
    NEXT_PUBLIC_BASE_URL: "https://app.stoquify.test",
    STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: "true",
    STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: "false",
    STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS: "true",
    RESEND_API_KEY: resendApiKey,
    RESEND_FROM_EMAIL: "Stoquify <referrals@stoquify.test>",
    AUTH_SECRET: "A7!auth-only-value-C8#rT2@qW9%zP5&x",
    ...overrides,
  }
}

describe("release secret preflight", () => {
  it("reports missing local secrets without blocking non-release work", () => {
    const report = buildReleaseSecretPreflight({ release: "off", environment: {} })

    expect(report.summary).toMatchObject({
      status: "conditional",
      blockerCount: 0,
      warningCount: 16,
    })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("fails closed when release and referral delivery secrets are absent", () => {
    const report = buildReleaseSecretPreflight({ release: "on", environment: {} })

    expect(report.summary.status).toBe("blocked")
    expect(report.blockers).toEqual([
      "public_identity_secret_present",
      "public_identity_secret_strong",
      "public_receipt_secret_present",
      "public_receipt_secret_strong",
      "history_cursor_secret_present",
      "history_cursor_secret_strong",
      "statement_token_secret_present",
      "statement_token_secret_strong",
      "statement_delivery_encryption_key_present",
      "statement_delivery_encryption_key_valid",
      "accountant_invite_encryption_key_present",
      "accountant_invite_encryption_key_valid",
      "public_app_url_present",
      "public_app_url_https",
      "statement_live_delivery_channel_enabled",
      "accountant_invite_live_delivery_enabled",
    ])
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("accepts strong, purpose-specific secrets and live email delivery", () => {
    const report = buildReleaseSecretPreflight({
      release: "on",
      environment: readyEnvironment(),
    })

    expect(report.summary).toMatchObject({
      status: "ready",
      readyCount: 21,
      blockerCount: 0,
    })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("accepts WhatsApp as the customer statement channel", () => {
    const report = buildReleaseSecretPreflight({
      release: "on",
      environment: readyEnvironment({
        STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS: "false",
        STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS: "true",
        WHATSAPP_PHONE_NUMBER_ID: "123456789",
        WHATSAPP_ACCESS_TOKEN: "whatsapp-live-access-token",
      }),
    })

    expect(report.summary.status).toBe("ready")
  })

  it("rejects placeholders and auth-secret reuse", () => {
    const report = buildReleaseSecretPreflight({
      release: "on",
      environment: readyEnvironment({
        PUBLIC_IDENTITY_ABUSE_HASH_SECRET:
          "your-public-identity-secret-minimum-32-characters",
        AQSTOQFLOW_RECEIPT_TOKEN_SECRET: identitySecret,
        AUTH_SECRET: identitySecret,
      }),
    })

    expect(report.blockers).toEqual(expect.arrayContaining([
      "public_identity_secret_strong",
      "dedicated_secrets_are_not_auth_secrets",
    ]))
  })

  it("rejects reuse across dedicated public and referral boundaries", () => {
    const report = buildReleaseSecretPreflight({
      release: "on",
      environment: readyEnvironment({
        AQSTOQFLOW_RECEIPT_TOKEN_SECRET: identitySecret,
        AQSTOQFLOW_STATEMENT_TOKEN_SECRET: identitySecret,
      }),
    })

    expect(report.blockers).toContain("dedicated_secrets_are_distinct")
  })

  it("rejects invalid envelope keys, insecure URLs, and missing live providers", () => {
    const report = buildReleaseSecretPreflight({
      release: "on",
      environment: readyEnvironment({
        AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY: "not-a-32-byte-key",
        AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY: "also-invalid",
        NEXT_PUBLIC_BASE_URL: "http://app.stoquify.test",
        RESEND_API_KEY: "",
      }),
    })

    expect(report.blockers).toEqual(expect.arrayContaining([
      "statement_delivery_encryption_key_valid",
      "accountant_invite_encryption_key_valid",
      "public_app_url_https",
      "statement_email_provider_configured",
      "accountant_invite_provider_configured",
    ]))
  })

  it("never includes secret or provider credential values in evidence", () => {
    const environment = readyEnvironment()
    const report = buildReleaseSecretPreflight({
      release: "on",
      environment,
    })
    const evidence = renderMarkdown(report, "fail") + JSON.stringify(report)

    for (const secret of [
      identitySecret,
      receiptSecret,
      historySecret,
      statementTokenSecret,
      statementDeliveryKey,
      accountantInviteKey,
      resendApiKey,
    ]) {
      expect(evidence).not.toContain(secret)
    }
    expect(report.summary.secretValuePrinted).toBe(false)
  })

  it("rejects history cursor secret reuse across dedicated and auth boundaries", () => {
    const report = buildReleaseSecretPreflight({
      release: "on",
      environment: readyEnvironment({
        AQSTOQFLOW_HISTORY_CURSOR_SECRET: receiptSecret,
        AUTH_SECRET: receiptSecret,
      }),
    })

    expect(report.blockers).toEqual(expect.arrayContaining([
      "dedicated_secrets_are_distinct",
      "dedicated_secrets_are_not_auth_secrets",
    ]))
  })

  it("automatically enforces only production-like environments", () => {
    expect(releaseEnabled("auto", { VERCEL_ENV: "production" })).toBe(true)
    expect(releaseEnabled("auto", { VERCEL_ENV: "preview", NODE_ENV: "test" })).toBe(false)
    expect(releaseEnabled("auto", { CI_RELEASE: "1" })).toBe(true)
  })
})
