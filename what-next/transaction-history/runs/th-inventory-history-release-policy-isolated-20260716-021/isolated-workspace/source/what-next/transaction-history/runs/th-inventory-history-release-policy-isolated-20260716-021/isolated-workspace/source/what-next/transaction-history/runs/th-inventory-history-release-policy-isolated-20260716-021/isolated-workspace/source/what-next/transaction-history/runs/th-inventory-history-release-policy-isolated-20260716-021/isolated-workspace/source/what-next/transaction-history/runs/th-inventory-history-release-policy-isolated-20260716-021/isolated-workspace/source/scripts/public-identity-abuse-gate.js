const fs = require("fs")
const path = require("path")

const DEFAULT_JSON_OUT = "what-next/public-identity-abuse-readiness.json"
const DEFAULT_MARKDOWN_OUT = "what-next/public-identity-abuse-readiness.md"

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    release: "auto",
    root: process.cwd(),
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--mode") options.mode = argv[++index]
    else if (value === "--release") options.release = argv[++index]
    else if (value === "--root") options.root = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error("Unknown argument: " + value)
  }

  if (!["report", "fail"].includes(options.mode)) throw new Error("Unsupported mode: " + options.mode)
  if (!["auto", "on", "off"].includes(options.release)) throw new Error("Unsupported release mode: " + options.release)
  return options
}

function read(root, relativePath) {
  const target = path.join(root, relativePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""
}

function extractModel(schema, modelName) {
  const start = schema.indexOf("model " + modelName + " {")
  if (start < 0) return ""
  const end = schema.indexOf(String.fromCharCode(10) + "}", start)
  return end < 0 ? "" : schema.slice(start, end + 2)
}

function releaseEnabled(value, environment = process.env) {
  if (value === "on") return true
  if (value === "off") return false
  return environment.NODE_ENV === "production" || environment.CI_RELEASE === "1"
}

function buildPublicIdentityAbuseReadiness(root = process.cwd(), options = {}) {
  const environment = options.environment || process.env
  const release = releaseEnabled(options.release || "auto", environment)
  const schema = read(root, "prisma/schema.prisma")
  const model = extractModel(schema, "PublicIdentityAbuseBucket")
  const migration = read(root, "prisma/migrations/20260711133000_public_identity_abuse_limits/migration.sql")
  const service = read(root, "services/security/public-identity-abuse.service.ts")
  const identityService = read(root, "services/users/user-identity.service.ts")
  const actionFiles = [
    "actions/auth.ts",
    "actions/users/createUser.ts",
    "actions/users/createInvitedUser.ts",
    "actions/users/sendResetLink.ts",
    "actions/users/updateUserPassword.ts",
    "actions/users/verifyOtp.ts",
  ]
  const actionSources = actionFiles.map((file) => ({ file, source: read(root, file) }))
  const configuredSecret =
    environment.PUBLIC_IDENTITY_ABUSE_HASH_SECRET ||
    environment.AUTH_SECRET ||
    environment.NEXTAUTH_SECRET ||
    ""

  const checks = [
    { id: "schema_model", ready: model.includes("subjectHash") && model.includes("@@unique([scope, subjectHash])") },
    { id: "schema_no_raw_identifiers", ready: Boolean(model) && !/(^|[^A-Za-z])(email|token|userId|ipAddress)([^A-Za-z]|$)/.test(model) },
    { id: "migration_table", ready: migration.includes('CREATE TABLE "public_identity_abuse_buckets"') },
    { id: "migration_unique_bucket", ready: migration.includes('("scope", "subjectHash")') },
    { id: "hmac_hashing", ready: service.includes('createHmac("sha256"') && service.includes("hashingSecret()") },
    { id: "serializable_transactions", ready: service.includes("TransactionIsolationLevel.Serializable") },
    { id: "conflict_retries", ready: service.includes('"P2002"') && service.includes('"P2034"') },
    { id: "subject_and_ip_dimensions", ready: service.includes(":subject") && service.includes(":ip") },
    { id: "registration_limit", ready: identityService.includes('operation: "registration"') },
    { id: "invitation_limit", ready: identityService.includes('operation: "invitation_redemption"') },
    { id: "reset_request_limit", ready: identityService.includes('operation: "password_reset_request"') },
    { id: "reset_completion_limit", ready: identityService.includes('operation: "password_reset_completion"') },
    { id: "otp_limit", ready: identityService.includes('operation: "email_otp_verification"') },
    {
      id: "server_derived_request_context",
      ready: actionSources.every(({ source }) => source.includes("getPublicIdentityRequestContext")),
    },
    {
      id: "release_hash_secret",
      ready: !release || configuredSecret.length >= 32,
      warning: !release && configuredSecret.length < 32,
    },
  ]

  const blockers = checks.filter((check) => !check.ready).map((check) => check.id)
  const warnings = checks.filter((check) => check.warning).map((check) => check.id)
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      releaseSecretEnforcement: release ? "on" : "off",
      status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      secretConfigured: configuredSecret.length >= 32,
      secretValuePrinted: false,
    },
    checks,
    blockers,
    warnings,
  }
}

function gateResultForReport(report, mode = "report") {
  return {
    status: report.summary.status,
    exitCode: mode === "fail" && report.blockers.length ? 1 : 0,
  }
}

function renderMarkdown(report) {
  const lines = [
    "# Public Identity Abuse Readiness Gate",
    "",
    "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode,
    "Status: " + report.summary.status,
    "",
    "## Summary",
    "",
    "- Checks ready: " + report.summary.readyCount + "/" + report.summary.checkCount,
    "- Blockers: " + report.summary.blockerCount,
    "- Warnings: " + report.summary.warningCount,
    "- Release secret enforcement: " + report.summary.releaseSecretEnforcement,
    "- Secret configured: " + (report.summary.secretConfigured ? "yes" : "no"),
    "- Secret value printed: " + (report.summary.secretValuePrinted ? "yes" : "no"),
    "",
    "## Checks",
    "",
    ...report.checks.map((check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length ? report.blockers.map((blocker) => "- " + blocker) : ["- None"]),
    "",
    "## Warnings",
    "",
    ...(report.warnings.length ? report.warnings.map((warning) => "- " + warning) : ["- None"]),
    "",
    "## Safety",
    "",
    "- This gate is static and does not mutate abuse buckets or identity data.",
    "- It never prints secret values or raw public identifiers.",
  ]
  return lines.join(String.fromCharCode(10)) + String.fromCharCode(10)
}

function writeReport(root, options, report) {
  const jsonTarget = path.resolve(root, options.jsonOut)
  const markdownTarget = path.resolve(root, options.out)
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true })
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true })
  fs.writeFileSync(jsonTarget, JSON.stringify(report, null, 2) + String.fromCharCode(10), "utf8")
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8")
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const root = path.resolve(options.root)
    const report = buildPublicIdentityAbuseReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildPublicIdentityAbuseReadiness,
  gateResultForReport,
  parseArgs,
  releaseEnabled,
  renderMarkdown,
}
