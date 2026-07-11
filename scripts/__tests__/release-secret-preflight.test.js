const {
  buildReleaseSecretPreflight,
  gateResultForReport,
  releaseEnabled,
  renderMarkdown,
} = require("../release-secret-preflight")

const identitySecret = "mV9!qT2#xK7@pR4$zN8&cF5*wH3+yL6="
const receiptSecret = "B4^sJ8!dQ2%vM7@kX5#nC9&rP3*tL6+Z"

describe("release secret preflight", () => {
  it("reports missing local secrets without blocking non-release work", () => {
    const report = buildReleaseSecretPreflight({ release: "off", environment: {} })

    expect(report.summary).toMatchObject({ status: "conditional", blockerCount: 0, warningCount: 4 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("fails closed when release secrets are absent", () => {
    const report = buildReleaseSecretPreflight({ release: "on", environment: {} })

    expect(report.summary.status).toBe("blocked")
    expect(report.blockers).toEqual([
      "public_identity_secret_present",
      "public_identity_secret_strong",
      "public_receipt_secret_present",
      "public_receipt_secret_strong",
    ])
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("accepts strong, purpose-specific, distinct secrets", () => {
    const report = buildReleaseSecretPreflight({
      release: "on",
      environment: {
        PUBLIC_IDENTITY_ABUSE_HASH_SECRET: identitySecret,
        AQSTOQFLOW_RECEIPT_TOKEN_SECRET: receiptSecret,
        AUTH_SECRET: "A7!auth-only-value-C8#rT2@qW9%zP5&x",
      },
    })

    expect(report.summary).toMatchObject({ status: "ready", readyCount: 6, blockerCount: 0 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("rejects placeholders and auth-secret reuse", () => {
    const report = buildReleaseSecretPreflight({
      release: "on",
      environment: {
        PUBLIC_IDENTITY_ABUSE_HASH_SECRET: "your-public-identity-secret-minimum-32-characters",
        AQSTOQFLOW_RECEIPT_TOKEN_SECRET: identitySecret,
        AUTH_SECRET: identitySecret,
      },
    })

    expect(report.blockers).toEqual(expect.arrayContaining([
      "public_identity_secret_strong",
      "dedicated_secrets_are_not_auth_secrets",
    ]))
  })

  it("rejects reuse across the two public boundaries", () => {
    const report = buildReleaseSecretPreflight({
      release: "on",
      environment: {
        PUBLIC_IDENTITY_ABUSE_HASH_SECRET: identitySecret,
        AQSTOQFLOW_RECEIPT_TOKEN_SECRET: identitySecret,
      },
    })

    expect(report.blockers).toContain("dedicated_secrets_are_distinct")
  })

  it("never includes secret values in rendered or serialized evidence", () => {
    const report = buildReleaseSecretPreflight({
      release: "on",
      environment: {
        PUBLIC_IDENTITY_ABUSE_HASH_SECRET: identitySecret,
        AQSTOQFLOW_RECEIPT_TOKEN_SECRET: receiptSecret,
      },
    })
    const evidence = renderMarkdown(report, "fail") + JSON.stringify(report)

    expect(evidence).not.toContain(identitySecret)
    expect(evidence).not.toContain(receiptSecret)
    expect(report.summary.secretValuePrinted).toBe(false)
  })

  it("automatically enforces only production-like environments", () => {
    expect(releaseEnabled("auto", { VERCEL_ENV: "production" })).toBe(true)
    expect(releaseEnabled("auto", { VERCEL_ENV: "preview", NODE_ENV: "test" })).toBe(false)
    expect(releaseEnabled("auto", { CI_RELEASE: "1" })).toBe(true)
  })
})
