#!/usr/bin/env node

const { createHash, randomBytes } = require("node:crypto")
const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs")
const { dirname, resolve } = require("node:path")

const DEFAULT_JSON_OUT =
  "what-next/agents-runtime/agent-governance-operational-evidence.json"
const DEFAULT_MD_OUT =
  "what-next/agents-runtime/agent-governance-operational-evidence.md"
const DEFAULT_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json"
const REQUIRED_OWNER_ROLES = [
  "ROLLOUT",
  "ROLLBACK",
  "SUPPORT",
  "PILOT",
  "SECURITY_INCIDENT",
  "ON_CALL_BACKUP",
]
const ENVIRONMENT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,62}$/
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/i
const COMMIT_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i
const REFERENCE_PATTERN =
  /^[a-z][a-z0-9+.-]*:\/\/[a-z0-9][a-z0-9._~:/-]*$/i
const IDENTITY_REFERENCE_PATTERN =
  /^(?:directory|identity):\/\/[a-z0-9][a-z0-9._~:/-]*$/i
const SYNTHETIC_IDENTITY_PATTERN =
  /(^|[:/._-])(e2e|test|seed|fixture|demo)($|[:/._-])/i
const SAFE_TEXT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/ -]{0,199}$/
const MAX_RESPONSE_BYTES = 150_000
const MAX_ATTESTATION_AGE_MS = 24 * 60 * 60_000

class GovernanceEvidenceCaptureError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "GovernanceEvidenceCaptureError"
    this.code = code
  }
}

function parseArgs(argv) {
  const options = {
    mode: "report",
    jsonOut: DEFAULT_JSON_OUT,
    markdownOut: DEFAULT_MD_OUT,
    updateRegister: null,
  }
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--mode") options.mode = argv[++index]
    else if (argument === "--out") options.jsonOut = argv[++index]
    else if (argument === "--md-out") options.markdownOut = argv[++index]
    else if (argument === "--update-register") {
      options.updateRegister = argv[++index] || DEFAULT_REGISTER
    } else throw new Error(`Unknown argument: ${argument}`)
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.")
  }
  return options
}

function resolveCaptureConfig(environment = process.env) {
  const rawUrl = String(
    environment.STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_URL || "",
  ).trim()
  const secret = String(
    environment.STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_SECRET || "",
  ).trim()
  const releaseEnvironment = String(
    environment.STOQUIFY_AGENT_RELEASE_ENVIRONMENT || "",
  )
    .trim()
    .toLowerCase()

  if (!rawUrl) {
    throw new GovernanceEvidenceCaptureError(
      "GOVERNANCE_EVIDENCE_URL_MISSING",
      "The governance evidence URL is required.",
    )
  }
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    throw new GovernanceEvidenceCaptureError(
      "GOVERNANCE_EVIDENCE_URL_INVALID",
      "The governance evidence URL is invalid.",
    )
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        environment.NODE_ENV !== "production" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  ) {
    throw new GovernanceEvidenceCaptureError(
      "GOVERNANCE_EVIDENCE_HTTPS_REQUIRED",
      "The governance evidence endpoint must be query-free HTTPS outside local development.",
    )
  }
  if (secret.length < 32) {
    throw new GovernanceEvidenceCaptureError(
      "GOVERNANCE_EVIDENCE_SECRET_INVALID",
      "The governance evidence secret must contain at least 32 characters.",
    )
  }
  if (!ENVIRONMENT_PATTERN.test(releaseEnvironment)) {
    throw new GovernanceEvidenceCaptureError(
      "GOVERNANCE_EVIDENCE_ENVIRONMENT_INVALID",
      "The release environment is invalid.",
    )
  }
  return {
    url,
    secret,
    releaseEnvironment,
    timeoutMs: boundedInteger(
      environment.STOQUIFY_AGENT_GOVERNANCE_EVIDENCE_TIMEOUT_MS,
      20_000,
      5_000,
      60_000,
    ),
  }
}

async function captureAgentGovernanceEvidence(input = {}) {
  const environment = input.environment || process.env
  const config = resolveCaptureConfig(environment)
  const fetchImpl = input.fetchImpl || fetch
  const now = input.now || new Date()
  const capturedAt = now.toISOString()

  const invalidResponse = await requestEvidence({
    fetchImpl,
    url: config.url,
    secret: buildInvalidCredential(config.secret),
    timeoutMs: config.timeoutMs,
  })
  const evidenceResponse = await requestEvidence({
    fetchImpl,
    url: config.url,
    secret: config.secret,
    timeoutMs: config.timeoutMs,
  })
  const evidence = sanitizeEvidencePayload(evidenceResponse.payload)
  const blockers = evaluateGovernanceEvidence(evidence, now)
  const invalidAuthRejected = invalidResponse.status === 401
  const environmentMatched =
    evidence.environment === config.releaseEnvironment
  const ready =
    invalidAuthRejected &&
    evidenceResponse.status === 200 &&
    evidence.sourceReady === true &&
    environmentMatched &&
    blockers.length === 0

  const evidenceCore = {
    schemaVersion: 1,
    capturedAt,
    endpointReference: endpointReference(config.url),
    environment: config.releaseEnvironment,
    checks: {
      evidenceHttpStatus: evidenceResponse.status,
      invalidAuthHttpStatus: invalidResponse.status,
      invalidAuthRejected,
      environmentMatched,
    },
    evidence,
    blockers,
    ready,
    localDatabaseIdentitiesAccepted: false,
    rawResponseRetained: false,
    authorizationHeadersRetained: false,
    secretValuesPrinted: false,
  }
  const evidenceHash = hashEvidence(evidenceCore)
  return {
    ...evidenceCore,
    evidenceHash,
    operationalRegisterPatch: buildOperationalRegisterPatch({
      evidence,
      evidenceHash,
    }),
  }
}

async function requestEvidence(input) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs)
  try {
    const response = await input.fetchImpl(input.url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${input.secret}`,
        accept: "application/json",
        "user-agent": "stoquify-agent-governance-evidence/1",
      },
      signal: controller.signal,
    })
    return {
      status: response.status,
      payload: await boundedJson(response),
    }
  } catch (error) {
    if (error instanceof GovernanceEvidenceCaptureError) throw error
    throw new GovernanceEvidenceCaptureError(
      error?.name === "AbortError"
        ? "GOVERNANCE_EVIDENCE_CAPTURE_TIMEOUT"
        : "GOVERNANCE_EVIDENCE_CAPTURE_UNAVAILABLE",
      "The governance evidence probe could not be completed.",
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function boundedJson(response) {
  const text = await response.text()
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new GovernanceEvidenceCaptureError(
      "GOVERNANCE_EVIDENCE_RESPONSE_TOO_LARGE",
      "The governance evidence response exceeded the evidence limit.",
    )
  }
  try {
    return text ? JSON.parse(text) : null
  } catch {
    throw new GovernanceEvidenceCaptureError(
      "GOVERNANCE_EVIDENCE_RESPONSE_INVALID",
      "The governance evidence response was not valid JSON.",
    )
  }
}

function sanitizeEvidencePayload(payload) {
  const data =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
      ? payload.data
      : {}
  return {
    sourceReady: data.ready === true,
    environment: safeEnvironment(data.environment),
    sourceSystemReference: safeReference(data.sourceSystemReference),
    attestationReference: safeReference(data.attestationReference),
    attestationDigest: safeHash(data.attestationDigest),
    attestedAt: safeTimestamp(data.attestedAt),
    releaseBinding: sanitizeReleaseBinding(data.releaseBinding),
    approvals: {
      product: sanitizeApproval(data.approvals?.product),
      security: sanitizeApproval(data.approvals?.security),
    },
    owners: Array.isArray(data.owners)
      ? data.owners.slice(0, 20).map(sanitizeOwner)
      : [],
  }
}

function sanitizeReleaseBinding(value) {
  const candidate = objectValue(value)
  return {
    packageId: safeText(candidate.packageId),
    releaseVersion: safeText(candidate.releaseVersion),
    commitSha: safeCommit(candidate.commitSha),
    artifactDigest: safeHash(candidate.artifactDigest),
    manifestHash: safeHash(candidate.manifestHash),
    evidenceBundleHash: safeHash(candidate.evidenceBundleHash),
  }
}

function sanitizeApproval(value) {
  const candidate = objectValue(value)
  return {
    decision: candidate.decision === "APPROVED" ? "APPROVED" : null,
    actorDirectoryId: safeIdentity(candidate.actorDirectoryId),
    approvalReference: safeReference(candidate.approvalReference),
    decidedAt: safeTimestamp(candidate.decidedAt),
    expiresAt: safeTimestamp(candidate.expiresAt),
    manifestHash: safeHash(candidate.manifestHash),
    artifactDigest: safeHash(candidate.artifactDigest),
    evidenceBundleHash: safeHash(candidate.evidenceBundleHash),
  }
}

function sanitizeOwner(value) {
  const candidate = objectValue(value)
  return {
    role: safeText(candidate.role),
    primaryDirectoryId: safeIdentity(candidate.primaryDirectoryId),
    backupDirectoryId: safeIdentity(candidate.backupDirectoryId),
    acceptedRunbookVersion: safeText(candidate.acceptedRunbookVersion),
    acceptedAt: safeTimestamp(candidate.acceptedAt),
    coverageStartsAt: safeTimestamp(candidate.coverageStartsAt),
    coverageEndsAt: safeTimestamp(candidate.coverageEndsAt),
    escalationReference: safeReference(candidate.escalationReference),
  }
}

function evaluateGovernanceEvidence(evidence, now) {
  const blockers = []
  const nowMs = now.getTime()
  for (const [field, code] of [
    ["sourceSystemReference", "GOVERNANCE_SOURCE_REFERENCE_INVALID"],
    ["attestationReference", "GOVERNANCE_ATTESTATION_REFERENCE_INVALID"],
  ]) {
    if (!evidence[field]) blockers.push(code)
  }
  if (!evidence.attestationDigest) {
    blockers.push("GOVERNANCE_ATTESTATION_DIGEST_INVALID")
  }
  const attestedAt = timestampMs(evidence.attestedAt)
  if (
    attestedAt === null ||
    attestedAt > nowMs ||
    nowMs - attestedAt > MAX_ATTESTATION_AGE_MS
  ) {
    blockers.push("GOVERNANCE_ATTESTATION_TIMESTAMP_INVALID_OR_STALE")
  }
  evaluateReleaseBinding(evidence.releaseBinding, blockers)
  evaluateApprovals(
    evidence.releaseBinding,
    evidence.approvals,
    nowMs,
    blockers,
  )
  evaluateOwners(evidence.owners, nowMs, blockers)
  return blockers
}

function evaluateReleaseBinding(binding, blockers) {
  for (const [field, code] of [
    ["packageId", "GOVERNANCE_PACKAGE_ID_INVALID"],
    ["releaseVersion", "GOVERNANCE_RELEASE_VERSION_INVALID"],
    ["commitSha", "GOVERNANCE_COMMIT_SHA_INVALID"],
    ["artifactDigest", "GOVERNANCE_ARTIFACT_DIGEST_INVALID"],
    ["manifestHash", "GOVERNANCE_MANIFEST_HASH_INVALID"],
    ["evidenceBundleHash", "GOVERNANCE_EVIDENCE_BUNDLE_HASH_INVALID"],
  ]) {
    if (!binding[field]) blockers.push(code)
  }
}

function evaluateApprovals(binding, approvals, nowMs, blockers) {
  for (const [kind, approval] of [
    ["PRODUCT", approvals.product],
    ["SECURITY", approvals.security],
  ]) {
    if (approval.decision !== "APPROVED") {
      blockers.push(`GOVERNANCE_${kind}_NOT_APPROVED`)
    }
    if (!approval.actorDirectoryId) {
      blockers.push(`GOVERNANCE_${kind}_ACTOR_INVALID`)
    }
    if (!approval.approvalReference) {
      blockers.push(`GOVERNANCE_${kind}_REFERENCE_INVALID`)
    }
    validateCurrentWindow(
      approval.decidedAt,
      approval.expiresAt,
      nowMs,
      `GOVERNANCE_${kind}`,
      blockers,
    )
    for (const [field, code] of [
      ["manifestHash", "MANIFEST_HASH"],
      ["artifactDigest", "ARTIFACT_DIGEST"],
      ["evidenceBundleHash", "EVIDENCE_BUNDLE_HASH"],
    ]) {
      if (!approval[field]) {
        blockers.push(`GOVERNANCE_${kind}_${code}_INVALID`)
      } else if (
        binding[field] &&
        approval[field].toLowerCase() !== binding[field].toLowerCase()
      ) {
        blockers.push(`GOVERNANCE_${kind}_${code}_MISMATCH`)
      }
    }
  }
  if (
    approvals.product.actorDirectoryId &&
    approvals.product.actorDirectoryId ===
      approvals.security.actorDirectoryId
  ) {
    blockers.push("GOVERNANCE_APPROVERS_NOT_DISTINCT")
  }
}

function evaluateOwners(ownerEntries, nowMs, blockers) {
  const owners = new Map()
  for (const owner of ownerEntries) {
    if (!owner.role || owners.has(owner.role)) {
      blockers.push("GOVERNANCE_OWNER_ROLE_INVALID_OR_DUPLICATE")
      continue
    }
    owners.set(owner.role, owner)
  }
  for (const role of REQUIRED_OWNER_ROLES) {
    const owner = owners.get(role)
    if (!owner) {
      blockers.push(`GOVERNANCE_OWNER_${role}_MISSING`)
      continue
    }
    if (!owner.primaryDirectoryId) {
      blockers.push(`GOVERNANCE_OWNER_${role}_PRIMARY_INVALID`)
    }
    if (!owner.backupDirectoryId) {
      blockers.push(`GOVERNANCE_OWNER_${role}_BACKUP_INVALID`)
    }
    if (
      owner.primaryDirectoryId &&
      owner.primaryDirectoryId === owner.backupDirectoryId
    ) {
      blockers.push(`GOVERNANCE_OWNER_${role}_PRIMARY_BACKUP_NOT_DISTINCT`)
    }
    if (!owner.acceptedRunbookVersion) {
      blockers.push(`GOVERNANCE_OWNER_${role}_RUNBOOK_INVALID`)
    }
    if (!owner.escalationReference) {
      blockers.push(`GOVERNANCE_OWNER_${role}_ESCALATION_REFERENCE_INVALID`)
    }
    if (!pastTimestamp(owner.acceptedAt, nowMs)) {
      blockers.push(`GOVERNANCE_OWNER_${role}_ACCEPTED_AT_INVALID`)
    }
    validateCurrentWindow(
      owner.coverageStartsAt,
      owner.coverageEndsAt,
      nowMs,
      `GOVERNANCE_OWNER_${role}`,
      blockers,
    )
  }
  for (const role of owners.keys()) {
    if (!REQUIRED_OWNER_ROLES.includes(role)) {
      blockers.push(`GOVERNANCE_OWNER_${role}_UNEXPECTED`)
    }
  }
}

function validateCurrentWindow(startValue, endValue, nowMs, prefix, blockers) {
  const start = timestampMs(startValue)
  const end = timestampMs(endValue)
  if (start === null || start > nowMs) {
    blockers.push(`${prefix}_START_INVALID`)
  }
  if (
    end === null ||
    end <= nowMs ||
    (start !== null && end <= start)
  ) {
    blockers.push(`${prefix}_EXPIRED_OR_END_INVALID`)
  }
}

function buildOperationalRegisterPatch(input) {
  const evidenceId = input.evidenceHash.replace("sha256:", "")
  const evidenceBase = `evidence://agent-governance/${evidenceId}`
  const binding = input.evidence.releaseBinding
  return {
    governance: {
      environment: input.evidence.environment.toUpperCase(),
      sourceSystemReference: input.evidence.sourceSystemReference,
      attestationReference: input.evidence.attestationReference,
      attestationDigest: input.evidence.attestationDigest,
      attestedAt: input.evidence.attestedAt,
      evidenceSha256: input.evidenceHash,
      invalidAuthEvidenceReference: `${evidenceBase}/invalid-auth-401`,
      packageId: binding.packageId,
      releaseVersion: binding.releaseVersion,
      commitSha: binding.commitSha,
      artifactDigest: binding.artifactDigest,
      manifestHash: binding.manifestHash,
      evidenceBundleHash: binding.evidenceBundleHash,
    },
    approvals: input.evidence.approvals,
    owners: input.evidence.owners,
  }
}

function applyCaptureToOperationalRegister(register, capture) {
  if (!capture?.ready || !HASH_PATTERN.test(capture.evidenceHash || "")) {
    throw new GovernanceEvidenceCaptureError(
      "GOVERNANCE_EVIDENCE_CAPTURE_NOT_READY",
      "Only a ready governance evidence capture may update the operational register.",
    )
  }
  if (
    register?.activation?.requested !== false ||
    register?.activation?.authorized !== false ||
    register?.activation?.activatedAt !== null
  ) {
    throw new GovernanceEvidenceCaptureError(
      "GOVERNANCE_EVIDENCE_REGISTER_ACTIVATION_BOUNDARY_INVALID",
      "The operational register activation boundary is invalid.",
    )
  }
  if (
    register?.release?.packageState !== "PILOT_CERTIFIED" ||
    register?.release?.activatedAt !== null
  ) {
    throw new GovernanceEvidenceCaptureError(
      "GOVERNANCE_EVIDENCE_RELEASE_STATE_INVALID",
      "Governance evidence requires an inactive PILOT_CERTIFIED release.",
    )
  }
  const expectedEnvironment = String(
    register.release.environment || "",
  )
    .trim()
    .toLowerCase()
  if (expectedEnvironment !== capture.environment) {
    throw new GovernanceEvidenceCaptureError(
      "GOVERNANCE_EVIDENCE_REGISTER_ENVIRONMENT_MISMATCH",
      "The captured environment does not match the operational register.",
    )
  }
  assertReleaseBinding(register.release, capture.evidence.releaseBinding)
  return {
    ...register,
    governance: capture.operationalRegisterPatch.governance,
    approvals: capture.operationalRegisterPatch.approvals,
    owners: capture.operationalRegisterPatch.owners,
  }
}

function assertReleaseBinding(release, binding) {
  for (const field of [
    "packageId",
    "releaseVersion",
    "commitSha",
    "artifactDigest",
    "manifestHash",
    "evidenceBundleHash",
  ]) {
    const expected = release[field]
    const actual = binding[field]
    const matched =
      typeof expected === "string" &&
      typeof actual === "string" &&
      (field === "packageId" || field === "releaseVersion"
        ? expected === actual
        : expected.toLowerCase() === actual.toLowerCase())
    if (!matched) {
      throw new GovernanceEvidenceCaptureError(
        `GOVERNANCE_EVIDENCE_RELEASE_${constantName(field)}_MISMATCH`,
        "The governance evidence does not match the frozen release identity.",
      )
    }
  }
}

function renderMarkdown(capture) {
  const lines = [
    "# Stoquify Agent Governance Operational Evidence",
    "",
    `**Captured:** ${capture.capturedAt}  `,
    `**Environment:** \`${capture.environment}\`  `,
    `**Ready:** ${capture.ready ? "Yes" : "No"}  `,
    `**Evidence hash:** \`${capture.evidenceHash}\`  `,
    "**Local database identities accepted:** No  ",
    "**Secret values printed or retained:** No",
    "",
    "| Check | Result |",
    "|---|---|",
    `| Authorized evidence HTTP | \`${capture.checks.evidenceHttpStatus}\` |`,
    `| Invalid authentication rejected | ${
      capture.checks.invalidAuthRejected ? "Yes" : "No"
    } (\`${capture.checks.invalidAuthHttpStatus}\`) |`,
    `| Environment matched | ${
      capture.checks.environmentMatched ? "Yes" : "No"
    } |`,
    `| Attested | ${capture.evidence.attestedAt ?? "Invalid"} |`,
    `| Source authority | \`${
      capture.evidence.sourceSystemReference ?? "invalid"
    }\` |`,
    `| Attestation | \`${
      capture.evidence.attestationReference ?? "invalid"
    }\` |`,
    "",
    "## Frozen Release Binding",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Package | \`${
      capture.evidence.releaseBinding.packageId ?? "invalid"
    }\` |`,
    `| Release | \`${
      capture.evidence.releaseBinding.releaseVersion ?? "invalid"
    }\` |`,
    `| Commit | \`${
      capture.evidence.releaseBinding.commitSha ?? "invalid"
    }\` |`,
    `| Artifact | \`${
      capture.evidence.releaseBinding.artifactDigest ?? "invalid"
    }\` |`,
    `| Manifest | \`${
      capture.evidence.releaseBinding.manifestHash ?? "invalid"
    }\` |`,
    `| Evidence bundle | \`${
      capture.evidence.releaseBinding.evidenceBundleHash ?? "invalid"
    }\` |`,
    "",
    "## Approvals",
    "",
    "| Approval | Decision | Actor | Expires |",
    "|---|---|---|---|",
    approvalRow("Product", capture.evidence.approvals.product),
    approvalRow("Security", capture.evidence.approvals.security),
    "",
    "## Owner Coverage",
    "",
    "| Responsibility | Primary | Backup | Coverage ends |",
    "|---|---|---|---|",
    ...capture.evidence.owners.map(ownerRow),
    "",
    "## Blockers",
    "",
    ...(capture.blockers.length
      ? capture.blockers.map((blocker) => `- \`${blocker}\``)
      : ["- None."]),
    "",
    "## Safety",
    "",
    "- The bearer secret is read from the process environment and is never written to JSON, Markdown, logs, or the operational register.",
    "- Raw HTTP bodies and authorization headers are not retained.",
    "- The invalid-auth probe uses an ephemeral generated value that is discarded.",
    "- Unknown response fields are discarded before hashing or reporting.",
    "- Local Prisma approval and owner records are never promoted into external governance evidence.",
    "- A ready capture can update governance, approvals, and owners only; it cannot alter release identity, CI, scheduler, alerting, credential rotation, declared status, or activation.",
    "",
  ]
  return lines.join("\n")
}

function approvalRow(label, approval) {
  return `| ${label} | \`${approval.decision ?? "invalid"}\` | \`${
    approval.actorDirectoryId ?? "invalid"
  }\` | ${approval.expiresAt ?? "invalid"} |`
}

function ownerRow(owner) {
  return `| \`${owner.role ?? "invalid"}\` | \`${
    owner.primaryDirectoryId ?? "invalid"
  }\` | \`${owner.backupDirectoryId ?? "invalid"}\` | ${
    owner.coverageEndsAt ?? "invalid"
  } |`
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {}
}

function buildInvalidCredential(secret) {
  let candidate
  do {
    candidate = `invalid-${randomBytes(24).toString("hex")}`
  } while (candidate === secret)
  return candidate
}

function endpointReference(url) {
  return `${url.protocol}//${url.host}${url.pathname}`
}

function safeEnvironment(value) {
  return typeof value === "string" &&
    ENVIRONMENT_PATTERN.test(value.toLowerCase())
    ? value.toLowerCase()
    : null
}

function safeReference(value) {
  return typeof value === "string" &&
    REFERENCE_PATTERN.test(value) &&
    !value.includes("?") &&
    !value.includes("#")
    ? value
    : null
}

function safeIdentity(value) {
  return typeof value === "string" &&
    IDENTITY_REFERENCE_PATTERN.test(value) &&
    !SYNTHETIC_IDENTITY_PATTERN.test(value)
    ? value
    : null
}

function safeText(value) {
  return typeof value === "string" && SAFE_TEXT_PATTERN.test(value)
    ? value
    : null
}

function safeCommit(value) {
  return typeof value === "string" && COMMIT_PATTERN.test(value)
    ? value.toLowerCase()
    : null
}

function safeHash(value) {
  return typeof value === "string" && HASH_PATTERN.test(value)
    ? value.toLowerCase()
    : null
}

function safeTimestamp(value) {
  const timestamp = timestampMs(value)
  return timestamp === null ? null : new Date(timestamp).toISOString()
}

function timestampMs(value) {
  if (typeof value !== "string") return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function pastTimestamp(value, nowMs) {
  const timestamp = timestampMs(value)
  return timestamp !== null && timestamp <= nowMs
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum)
}

function constantName(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase()
}

function hashEvidence(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`
}

async function main() {
  const options = parseArgs(process.argv)
  const capture = await captureAgentGovernanceEvidence()
  const jsonOut = resolve(process.cwd(), options.jsonOut)
  const markdownOut = resolve(process.cwd(), options.markdownOut)
  mkdirSync(dirname(jsonOut), { recursive: true })
  mkdirSync(dirname(markdownOut), { recursive: true })
  writeFileSync(jsonOut, `${JSON.stringify(capture, null, 2)}\n`, "utf8")
  writeFileSync(markdownOut, renderMarkdown(capture), "utf8")

  if (options.updateRegister) {
    const registerPath = resolve(process.cwd(), options.updateRegister)
    if (!existsSync(registerPath)) {
      throw new GovernanceEvidenceCaptureError(
        "GOVERNANCE_EVIDENCE_REGISTER_MISSING",
        "The operational register does not exist.",
      )
    }
    const register = JSON.parse(readFileSync(registerPath, "utf8"))
    const updated = applyCaptureToOperationalRegister(register, capture)
    writeFileSync(
      registerPath,
      `${JSON.stringify(updated, null, 2)}\n`,
      "utf8",
    )
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ready: capture.ready,
        environment: capture.environment,
        invalidAuthRejected: capture.checks.invalidAuthRejected,
        evidenceHash: capture.evidenceHash,
        blockerCount: capture.blockers.length,
        ownerRoles: capture.evidence.owners.length,
        localDatabaseIdentitiesAccepted: false,
        secretValuesPrinted: false,
        report: options.markdownOut,
      },
      null,
      2,
    )}\n`,
  )
  if (options.mode === "fail" && !capture.ready) process.exitCode = 1
}

if (require.main === module) {
  main().catch((error) => {
    const code =
      error instanceof GovernanceEvidenceCaptureError
        ? error.code
        : "GOVERNANCE_EVIDENCE_CAPTURE_FAILED"
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        code,
        localDatabaseIdentitiesAccepted: false,
        secretValuesPrinted: false,
      })}\n`,
    )
    process.exitCode = 1
  })
}

module.exports = {
  GovernanceEvidenceCaptureError,
  REQUIRED_OWNER_ROLES,
  applyCaptureToOperationalRegister,
  buildOperationalRegisterPatch,
  captureAgentGovernanceEvidence,
  evaluateGovernanceEvidence,
  parseArgs,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeEvidencePayload,
}
