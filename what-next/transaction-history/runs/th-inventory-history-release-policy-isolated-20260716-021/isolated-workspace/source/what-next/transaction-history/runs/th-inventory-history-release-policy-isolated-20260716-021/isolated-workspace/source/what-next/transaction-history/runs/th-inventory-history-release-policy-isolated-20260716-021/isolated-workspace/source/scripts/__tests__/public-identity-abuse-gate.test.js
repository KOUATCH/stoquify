const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  buildPublicIdentityAbuseReadiness,
  gateResultForReport,
} = require("../public-identity-abuse-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "public-identity-abuse-gate-"))
}

function write(root, relativePath, lines) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const content = Array.isArray(lines) ? lines.join(String.fromCharCode(10)) : lines
  fs.writeFileSync(target, content, "utf8")
}

function writeReadyFixture(root) {
  write(root, "prisma/schema.prisma", [
    "model PublicIdentityAbuseBucket {",
    "  scope String",
    "  subjectHash String",
    "  @@unique([scope, subjectHash])",
    "}",
  ])
  write(root, "prisma/migrations/20260711133000_public_identity_abuse_limits/migration.sql", [
    'CREATE TABLE "public_identity_abuse_buckets" ("scope" TEXT, "subjectHash" TEXT);',
    'CREATE UNIQUE INDEX "bucket_key" ON "public_identity_abuse_buckets"("scope", "subjectHash");',
  ])
  write(root, "services/security/public-identity-abuse.service.ts", [
    'createHmac("sha256", hashingSecret())',
    "TransactionIsolationLevel.Serializable",
    '"P2002" "P2034" ":subject" ":ip"',
  ])
  write(root, "services/users/user-identity.service.ts", [
    'operation: "registration"',
    'operation: "invitation_redemption"',
    'operation: "password_reset_request"',
    'operation: "password_reset_completion"',
    'operation: "email_otp_verification"',
  ])
  for (const file of [
    "actions/auth.ts",
    "actions/users/createUser.ts",
    "actions/users/createInvitedUser.ts",
    "actions/users/sendResetLink.ts",
    "actions/users/updateUserPassword.ts",
    "actions/users/verifyOtp.ts",
  ]) {
    write(root, file, "getPublicIdentityRequestContext()")
  }
}

describe("public identity abuse readiness gate", () => {
  it("passes a complete privacy-preserving implementation", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const report = buildPublicIdentityAbuseReadiness(root, {
      mode: "fail",
      release: "on",
      environment: { AUTH_SECRET: "a".repeat(32) },
    })

    expect(report.summary).toMatchObject({ status: "ready", blockerCount: 0 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks release when the hashing secret is absent", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const report = buildPublicIdentityAbuseReadiness(root, {
      mode: "fail",
      release: "on",
      environment: {},
    })

    expect(report.blockers).toContain("release_hash_secret")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks raw identifier storage and missing workflow coverage", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "prisma/schema.prisma", [
      "model PublicIdentityAbuseBucket {",
      "  scope String",
      "  subjectHash String",
      "  email String",
      "  @@unique([scope, subjectHash])",
      "}",
    ])
    write(root, "services/users/user-identity.service.ts", 'operation: "registration"')
    const report = buildPublicIdentityAbuseReadiness(root, {
      mode: "fail",
      release: "off",
      environment: {},
    })

    expect(report.blockers).toEqual(expect.arrayContaining([
      "schema_no_raw_identifiers",
      "invitation_limit",
      "reset_request_limit",
      "reset_completion_limit",
      "otp_limit",
    ]))
  })
})
