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
  "what-next/agents-runtime/agent-ci-release-operational-evidence.json"
const DEFAULT_MD_OUT =
  "what-next/agents-runtime/agent-ci-release-operational-evidence.md"
const DEFAULT_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json"
const ENVIRONMENT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,62}$/
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/i
const COMMIT_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i
const REFERENCE_PATTERN =
  /^[a-z][a-z0-9+.-]*:\/\/[a-z0-9][a-z0-9._~:/-]*$/i
const SAFE_TEXT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/ -]{0,199}$/
const MAX_RESPONSE_BYTES = 150_000
const MAX_EVIDENCE_AGE_MS = 24 * 60 * 60_000

class CiReleaseEvidenceCaptureError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "CiReleaseEvidenceCaptureError"
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
    environment.STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_URL || "",
  ).trim()
  const secret = String(
    environment.STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_SECRET || "",
  ).trim()
  const releaseEnvironment = String(
    environment.STOQUIFY_AGENT_RELEASE_ENVIRONMENT || "",
  )
    .trim()
    .toLowerCase()

  if (!rawUrl) {
    throw new CiReleaseEvidenceCaptureError(
      "CI_RELEASE_EVIDENCE_URL_MISSING",
      "The CI release evidence URL is required.",
    )
  }
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    throw new CiReleaseEvidenceCaptureError(
      "CI_RELEASE_EVIDENCE_URL_INVALID",
      "The CI release evidence URL is invalid.",
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
    throw new CiReleaseEvidenceCaptureError(
      "CI_RELEASE_EVIDENCE_HTTPS_REQUIRED",
      "The CI release evidence endpoint must be query-free HTTPS outside local development.",
    )
  }
  if (secret.length < 32) {
    throw new CiReleaseEvidenceCaptureError(
      "CI_RELEASE_EVIDENCE_SECRET_INVALID",
      "The CI release evidence secret must contain at least 32 characters.",
    )
  }
  if (!ENVIRONMENT_PATTERN.test(releaseEnvironment)) {
    throw new CiReleaseEvidenceCaptureError(
      "CI_RELEASE_EVIDENCE_ENVIRONMENT_INVALID",
      "The release environment is invalid.",
    )
  }
  return {
    url,
    secret,
    releaseEnvironment,
    timeoutMs: boundedInteger(
      environment.STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_TIMEOUT_MS,
      20_000,
      5_000,
      60_000,
    ),
  }
}

async function captureAgentCiReleaseEvidence(input = {}) {
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
  const blockers = evaluateCiReleaseEvidence(evidence, now)
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
        "user-agent": "stoquify-agent-ci-release-evidence/1",
      },
      signal: controller.signal,
    })
    return {
      status: response.status,
      payload: await boundedJson(response),
    }
  } catch (error) {
    if (error instanceof CiReleaseEvidenceCaptureError) throw error
    throw new CiReleaseEvidenceCaptureError(
      error?.name === "AbortError"
        ? "CI_RELEASE_EVIDENCE_CAPTURE_TIMEOUT"
        : "CI_RELEASE_EVIDENCE_CAPTURE_UNAVAILABLE",
      "The CI release evidence probe could not be completed.",
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function boundedJson(response) {
  const text = await response.text()
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new CiReleaseEvidenceCaptureError(
      "CI_RELEASE_EVIDENCE_RESPONSE_TOO_LARGE",
      "The CI release evidence response exceeded the evidence limit.",
    )
  }
  try {
    return text ? JSON.parse(text) : null
  } catch {
    throw new CiReleaseEvidenceCaptureError(
      "CI_RELEASE_EVIDENCE_RESPONSE_INVALID",
      "The CI release evidence response was not valid JSON.",
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
    release: sanitizeRelease(data.release),
    ci: sanitizeCi(data.ci),
  }
}

function sanitizeRelease(value) {
  const candidate = objectValue(value)
  return {
    packageId: safeText(candidate.packageId),
    releaseVersion: safeText(candidate.releaseVersion),
    packageState:
      candidate.packageState === "PILOT_CERTIFIED"
        ? "PILOT_CERTIFIED"
        : null,
    commitSha: safeCommit(candidate.commitSha),
    artifactDigest: safeHash(candidate.artifactDigest),
    artifactReference: safeReference(candidate.artifactReference),
    deploymentReference: safeReference(candidate.deploymentReference),
    packageCertificationReference: safeReference(
      candidate.packageCertificationReference,
    ),
    packageCertificationHash: safeHash(
      candidate.packageCertificationHash,
    ),
    manifestHash: safeHash(candidate.manifestHash),
    evidenceBundleHash: safeHash(candidate.evidenceBundleHash),
    browserReportHash: safeHash(candidate.browserReportHash),
    pilotAllowlistReference: safeReference(
      candidate.pilotAllowlistReference,
    ),
    roleAllowlistReference: safeReference(
      candidate.roleAllowlistReference,
    ),
    activationAbsent: candidate.activatedAt === null,
    activatedAt: null,
  }
}

function sanitizeCi(value) {
  const candidate = objectValue(value)
  return {
    status: candidate.status === "PASSED" ? "PASSED" : null,
    sourceTreeClean: candidate.sourceTreeClean === true,
    commitSha: safeCommit(candidate.commitSha),
    branchReference: safeReference(candidate.branchReference),
    runReference: safeReference(candidate.runReference),
    artifactDigest: safeHash(candidate.artifactDigest),
    artifactReference: safeReference(candidate.artifactReference),
    browserReportHash: safeHash(candidate.browserReportHash),
    completedAt: safeTimestamp(candidate.completedAt),
  }
}

function evaluateCiReleaseEvidence(evidence, now) {
  const blockers = []
  const nowMs = now.getTime()
  for (const [field, code] of [
    ["sourceSystemReference", "CI_RELEASE_SOURCE_REFERENCE_INVALID"],
    ["attestationReference", "CI_RELEASE_ATTESTATION_REFERENCE_INVALID"],
  ]) {
    if (!evidence[field]) blockers.push(code)
  }
  if (!evidence.attestationDigest) {
    blockers.push("CI_RELEASE_ATTESTATION_DIGEST_INVALID")
  }
  const attestedAt = timestampMs(evidence.attestedAt)
  if (
    attestedAt === null ||
    attestedAt > nowMs ||
    nowMs - attestedAt > MAX_EVIDENCE_AGE_MS
  ) {
    blockers.push("CI_RELEASE_ATTESTATION_TIMESTAMP_INVALID_OR_STALE")
  }
  evaluateRelease(evidence.release, blockers)
  const completedAt = evaluateCi(evidence.ci, nowMs, blockers)
  if (
    attestedAt !== null &&
    completedAt !== null &&
    completedAt > attestedAt
  ) {
    blockers.push("CI_RELEASE_ATTESTATION_PRECEDES_CI_COMPLETION")
  }
  compareReleaseAndCi(evidence.release, evidence.ci, blockers)
  return blockers
}

function evaluateRelease(release, blockers) {
  for (const [field, code] of [
    ["packageId", "CI_RELEASE_PACKAGE_ID_INVALID"],
    ["releaseVersion", "CI_RELEASE_VERSION_INVALID"],
    ["commitSha", "CI_RELEASE_COMMIT_SHA_INVALID"],
    ["artifactDigest", "CI_RELEASE_ARTIFACT_DIGEST_INVALID"],
    ["artifactReference", "CI_RELEASE_ARTIFACT_REFERENCE_INVALID"],
    ["deploymentReference", "CI_RELEASE_DEPLOYMENT_REFERENCE_INVALID"],
    [
      "packageCertificationReference",
      "CI_RELEASE_PACKAGE_CERTIFICATION_REFERENCE_INVALID",
    ],
    [
      "packageCertificationHash",
      "CI_RELEASE_PACKAGE_CERTIFICATION_HASH_INVALID",
    ],
    ["manifestHash", "CI_RELEASE_MANIFEST_HASH_INVALID"],
    ["evidenceBundleHash", "CI_RELEASE_EVIDENCE_BUNDLE_HASH_INVALID"],
    ["browserReportHash", "CI_RELEASE_BROWSER_REPORT_HASH_INVALID"],
    [
      "pilotAllowlistReference",
      "CI_RELEASE_PILOT_ALLOWLIST_REFERENCE_INVALID",
    ],
    [
      "roleAllowlistReference",
      "CI_RELEASE_ROLE_ALLOWLIST_REFERENCE_INVALID",
    ],
  ]) {
    if (!release[field]) blockers.push(code)
  }
  if (release.packageState !== "PILOT_CERTIFIED") {
    blockers.push("CI_RELEASE_PACKAGE_NOT_PILOT_CERTIFIED")
  }
  if (!release.activationAbsent || release.activatedAt !== null) {
    blockers.push("CI_RELEASE_PACKAGE_ACTIVATION_PRESENT")
  }
}

function evaluateCi(ci, nowMs, blockers) {
  if (ci.status !== "PASSED") blockers.push("CI_RELEASE_CI_NOT_PASSED")
  if (ci.sourceTreeClean !== true) {
    blockers.push("CI_RELEASE_SOURCE_TREE_NOT_CLEAN")
  }
  for (const [field, code] of [
    ["commitSha", "CI_RELEASE_CI_COMMIT_SHA_INVALID"],
    ["branchReference", "CI_RELEASE_BRANCH_REFERENCE_INVALID"],
    ["runReference", "CI_RELEASE_RUN_REFERENCE_INVALID"],
    ["artifactDigest", "CI_RELEASE_CI_ARTIFACT_DIGEST_INVALID"],
    ["artifactReference", "CI_RELEASE_CI_ARTIFACT_REFERENCE_INVALID"],
    ["browserReportHash", "CI_RELEASE_CI_BROWSER_REPORT_HASH_INVALID"],
  ]) {
    if (!ci[field]) blockers.push(code)
  }
  const completedAt = timestampMs(ci.completedAt)
  if (
    completedAt === null ||
    completedAt > nowMs ||
    nowMs - completedAt > MAX_EVIDENCE_AGE_MS
  ) {
    blockers.push("CI_RELEASE_CI_COMPLETION_INVALID_OR_STALE")
  }
  return completedAt
}

function compareReleaseAndCi(release, ci, blockers) {
  for (const [field, code] of [
    ["commitSha", "CI_RELEASE_COMMIT_MISMATCH"],
    ["artifactDigest", "CI_RELEASE_ARTIFACT_DIGEST_MISMATCH"],
    ["artifactReference", "CI_RELEASE_ARTIFACT_REFERENCE_MISMATCH"],
    ["browserReportHash", "CI_RELEASE_BROWSER_REPORT_HASH_MISMATCH"],
  ]) {
    if (
      release[field] &&
      ci[field] &&
      release[field].toLowerCase() !== ci[field].toLowerCase()
    ) {
      blockers.push(code)
    }
  }
}

function buildOperationalRegisterPatch(input) {
  const evidenceId = input.evidenceHash.replace("sha256:", "")
  const evidenceBase = `evidence://agent-ci-release/${evidenceId}`
  const release = input.evidence.release
  const ci = input.evidence.ci
  return {
    release: {
      environment: input.evidence.environment.toUpperCase(),
      packageId: release.packageId,
      releaseVersion: release.releaseVersion,
      packageState: release.packageState,
      commitSha: release.commitSha,
      artifactDigest: release.artifactDigest,
      artifactReference: release.artifactReference,
      deploymentReference: release.deploymentReference,
      packageCertificationReference:
        release.packageCertificationReference,
      packageCertificationHash: release.packageCertificationHash,
      manifestHash: release.manifestHash,
      evidenceBundleHash: release.evidenceBundleHash,
      browserReportHash: release.browserReportHash,
      pilotAllowlistReference: release.pilotAllowlistReference,
      roleAllowlistReference: release.roleAllowlistReference,
      ciEvidenceSha256: input.evidenceHash,
      activatedAt: null,
    },
    ci: {
      status: ci.status,
      sourceTreeClean: ci.sourceTreeClean,
      commitSha: ci.commitSha,
      branchReference: ci.branchReference,
      runReference: ci.runReference,
      artifactDigest: ci.artifactDigest,
      artifactReference: ci.artifactReference,
      browserReportHash: ci.browserReportHash,
      completedAt: ci.completedAt,
      sourceSystemReference: input.evidence.sourceSystemReference,
      attestationReference: input.evidence.attestationReference,
      attestationDigest: input.evidence.attestationDigest,
      attestedAt: input.evidence.attestedAt,
      evidenceSha256: input.evidenceHash,
      invalidAuthEvidenceReference: `${evidenceBase}/invalid-auth-401`,
    },
  }
}

function applyCaptureToOperationalRegister(register, capture) {
  if (!capture?.ready || !HASH_PATTERN.test(capture.evidenceHash || "")) {
    throw new CiReleaseEvidenceCaptureError(
      "CI_RELEASE_EVIDENCE_CAPTURE_NOT_READY",
      "Only a ready CI release evidence capture may update the operational register.",
    )
  }
  if (
    register?.activation?.requested !== false ||
    register?.activation?.authorized !== false ||
    register?.activation?.activatedAt !== null
  ) {
    throw new CiReleaseEvidenceCaptureError(
      "CI_RELEASE_EVIDENCE_REGISTER_ACTIVATION_BOUNDARY_INVALID",
      "The operational register activation boundary is invalid.",
    )
  }
  if (
    register?.release?.packageState !== "PILOT_CERTIFIED" ||
    register?.release?.activatedAt !== null
  ) {
    throw new CiReleaseEvidenceCaptureError(
      "CI_RELEASE_EVIDENCE_RELEASE_STATE_INVALID",
      "CI release evidence requires an inactive PILOT_CERTIFIED release.",
    )
  }
  const expectedEnvironment = String(
    register.release.environment || "",
  )
    .trim()
    .toLowerCase()
  if (expectedEnvironment !== capture.environment) {
    throw new CiReleaseEvidenceCaptureError(
      "CI_RELEASE_EVIDENCE_REGISTER_ENVIRONMENT_MISMATCH",
      "The captured environment does not match the operational register.",
    )
  }
  assertNoReleaseIdentityDrift(
    register.release,
    capture.operationalRegisterPatch.release,
  )
  return {
    ...register,
    release: capture.operationalRegisterPatch.release,
    ci: capture.operationalRegisterPatch.ci,
  }
}

function assertNoReleaseIdentityDrift(current, captured) {
  for (const field of [
    "packageId",
    "releaseVersion",
    "commitSha",
    "artifactDigest",
    "artifactReference",
    "deploymentReference",
    "packageCertificationReference",
    "packageCertificationHash",
    "manifestHash",
    "evidenceBundleHash",
    "browserReportHash",
    "pilotAllowlistReference",
    "roleAllowlistReference",
    "ciEvidenceSha256",
  ]) {
    const existing = current[field]
    const incoming = captured[field]
    if (
      typeof existing === "string" &&
      existing.length > 0 &&
      existing.toLowerCase() !== incoming.toLowerCase()
    ) {
      throw new CiReleaseEvidenceCaptureError(
        `CI_RELEASE_EVIDENCE_EXISTING_${constantName(field)}_DRIFT`,
        "The captured release identity conflicts with existing evidence.",
      )
    }
  }
}

function renderMarkdown(capture) {
  const lines = [
    "# Stoquify Agent CI and Release Operational Evidence",
    "",
    `**Captured:** ${capture.capturedAt}  `,
    `**Environment:** \`${capture.environment}\`  `,
    `**Ready:** ${capture.ready ? "Yes" : "No"}  `,
    `**Evidence hash:** \`${capture.evidenceHash}\`  `,
    "**Activation authorized:** No  ",
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
    `| Source tree clean | ${
      capture.evidence.ci.sourceTreeClean ? "Yes" : "No"
    } |`,
    `| CI completed | ${capture.evidence.ci.completedAt ?? "Invalid"} |`,
    "",
    "## Frozen Release",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Package | \`${capture.evidence.release.packageId ?? "invalid"}\` |`,
    `| Release | \`${
      capture.evidence.release.releaseVersion ?? "invalid"
    }\` |`,
    `| Package state | \`${
      capture.evidence.release.packageState ?? "invalid"
    }\` |`,
    `| Commit | \`${capture.evidence.release.commitSha ?? "invalid"}\` |`,
    `| Artifact | \`${
      capture.evidence.release.artifactDigest ?? "invalid"
    }\` |`,
    `| Manifest | \`${
      capture.evidence.release.manifestHash ?? "invalid"
    }\` |`,
    `| Browser report | \`${
      capture.evidence.release.browserReportHash ?? "invalid"
    }\` |`,
    `| Certified package proof | \`${
      capture.evidence.release.packageCertificationReference ?? "invalid"
    }\` |`,
    `| Activated | No |`,
    "",
    "## CI Attestation",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Source | \`${
      capture.evidence.sourceSystemReference ?? "invalid"
    }\` |`,
    `| Attestation | \`${
      capture.evidence.attestationReference ?? "invalid"
    }\` |`,
    `| Run | \`${capture.evidence.ci.runReference ?? "invalid"}\` |`,
    `| Branch | \`${
      capture.evidence.ci.branchReference ?? "invalid"
    }\` |`,
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
    "- Dirty, stale, failed, activated, uncertified, or hash-drifting releases are rejected.",
    "- A ready capture can update release and CI evidence only; it cannot alter governance, approvals, owners, scheduler, alerting, credential rotation, declared status, or activation.",
    "",
  ]
  return lines.join("\n")
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
  const capture = await captureAgentCiReleaseEvidence()
  const jsonOut = resolve(process.cwd(), options.jsonOut)
  const markdownOut = resolve(process.cwd(), options.markdownOut)
  mkdirSync(dirname(jsonOut), { recursive: true })
  mkdirSync(dirname(markdownOut), { recursive: true })
  writeFileSync(jsonOut, `${JSON.stringify(capture, null, 2)}\n`, "utf8")
  writeFileSync(markdownOut, renderMarkdown(capture), "utf8")

  if (options.updateRegister) {
    const registerPath = resolve(process.cwd(), options.updateRegister)
    if (!existsSync(registerPath)) {
      throw new CiReleaseEvidenceCaptureError(
        "CI_RELEASE_EVIDENCE_REGISTER_MISSING",
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
        sourceTreeClean: capture.evidence.ci.sourceTreeClean,
        packageState: capture.evidence.release.packageState,
        activationAuthorized: false,
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
      error instanceof CiReleaseEvidenceCaptureError
        ? error.code
        : "CI_RELEASE_EVIDENCE_CAPTURE_FAILED"
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        code,
        activationAuthorized: false,
        secretValuesPrinted: false,
      })}\n`,
    )
    process.exitCode = 1
  })
}

module.exports = {
  CiReleaseEvidenceCaptureError,
  applyCaptureToOperationalRegister,
  buildOperationalRegisterPatch,
  captureAgentCiReleaseEvidence,
  evaluateCiReleaseEvidence,
  parseArgs,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeEvidencePayload,
}
