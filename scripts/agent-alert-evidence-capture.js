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
  "what-next/agents-runtime/agent-alert-operational-evidence.json"
const DEFAULT_MD_OUT =
  "what-next/agents-runtime/agent-alert-operational-evidence.md"
const DEFAULT_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json"
const ENVIRONMENT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,62}$/
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/
const REFERENCE_PATTERN =
  /^[a-z][a-z0-9+.-]*:\/\/[a-z0-9][a-z0-9._~:/-]*$/i
const IDENTITY_REFERENCE_PATTERN =
  /^(?:directory|identity):\/\/[a-z0-9][a-z0-9._~:/-]*$/i
const SYNTHETIC_IDENTITY_PATTERN =
  /(^|[:/._-])(e2e|test|seed|fixture|demo)($|[:/._-])/i
const MAX_RESPONSE_BYTES = 100_000
const MAX_EVIDENCE_AGE_MS = 24 * 60 * 60_000

class AlertEvidenceCaptureError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "AlertEvidenceCaptureError"
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
    environment.STOQUIFY_AGENT_ALERT_EVIDENCE_URL || "",
  ).trim()
  const secret = String(
    environment.STOQUIFY_AGENT_ALERT_EVIDENCE_SECRET || "",
  ).trim()
  const releaseEnvironment = String(
    environment.STOQUIFY_AGENT_RELEASE_ENVIRONMENT || "",
  )
    .trim()
    .toLowerCase()

  if (!rawUrl) {
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_URL_MISSING",
      "The alert evidence URL is required.",
    )
  }
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_URL_INVALID",
      "The alert evidence URL is invalid.",
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
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_HTTPS_REQUIRED",
      "The alert evidence endpoint must be query-free HTTPS outside local development.",
    )
  }
  if (secret.length < 32) {
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_SECRET_INVALID",
      "The alert evidence secret must contain at least 32 characters.",
    )
  }
  if (!ENVIRONMENT_PATTERN.test(releaseEnvironment)) {
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_ENVIRONMENT_INVALID",
      "The release environment is invalid.",
    )
  }
  return {
    url,
    secret,
    releaseEnvironment,
    timeoutMs: boundedInteger(
      environment.STOQUIFY_AGENT_ALERT_EVIDENCE_TIMEOUT_MS,
      20_000,
      5_000,
      60_000,
    ),
  }
}

async function captureAgentAlertEvidence(input = {}) {
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
  const blockers = evaluateEvidence(evidence, now)
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
        "user-agent": "stoquify-agent-alert-evidence/1",
      },
      signal: controller.signal,
    })
    return {
      status: response.status,
      payload: await boundedJson(response),
    }
  } catch (error) {
    if (error instanceof AlertEvidenceCaptureError) throw error
    throw new AlertEvidenceCaptureError(
      error?.name === "AbortError"
        ? "ALERT_EVIDENCE_CAPTURE_TIMEOUT"
        : "ALERT_EVIDENCE_CAPTURE_UNAVAILABLE",
      "The alert evidence probe could not be completed.",
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function boundedJson(response) {
  const text = await response.text()
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_RESPONSE_TOO_LARGE",
      "The alert evidence response exceeded the evidence limit.",
    )
  }
  try {
    return text ? JSON.parse(text) : null
  } catch {
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_RESPONSE_INVALID",
      "The alert evidence response was not valid JSON.",
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
    transportStatus:
      data.transportStatus === "HEALTHY" ? "HEALTHY" : null,
    transportReference: safeReference(data.transportReference),
    managedSecretReference: safeReference(data.managedSecretReference),
    httpsDeliveryReference: safeReference(data.httpsDeliveryReference),
    externalRequestReference: safeReference(
      data.externalRequestReference,
    ),
    deliveredAt: safeTimestamp(data.deliveredAt),
    acknowledgementSloMinutes: boundedIntegerOrNull(
      data.acknowledgementSloMinutes,
      1,
      120,
    ),
    acknowledgedAt: safeTimestamp(data.acknowledgedAt),
    acknowledgedByDirectoryId: safeIdentity(
      data.acknowledgedByDirectoryId,
    ),
    acknowledgementReference: safeReference(
      data.acknowledgementReference,
    ),
    retryEvidenceReference: safeReference(
      data.retryEvidenceReference,
    ),
    deadLetterEvidenceReference: safeReference(
      data.deadLetterEvidenceReference,
    ),
    recoveryEvidenceReference: safeReference(
      data.recoveryEvidenceReference,
    ),
    escalationTestedAt: safeTimestamp(data.escalationTestedAt),
    escalatedToDirectoryId: safeIdentity(
      data.escalatedToDirectoryId,
    ),
    escalationEvidenceReference: safeReference(
      data.escalationEvidenceReference,
    ),
    secretRotationEvidenceReference: safeReference(
      data.secretRotationEvidenceReference,
    ),
  }
}

function evaluateEvidence(evidence, now) {
  const blockers = []
  const nowMs = now.getTime()
  if (evidence.transportStatus !== "HEALTHY") {
    blockers.push("ALERT_TRANSPORT_NOT_HEALTHY")
  }
  for (const [field, code] of [
    ["transportReference", "ALERT_TRANSPORT_REFERENCE_INVALID"],
    ["managedSecretReference", "ALERT_MANAGED_SECRET_REFERENCE_INVALID"],
    ["httpsDeliveryReference", "ALERT_HTTPS_DELIVERY_REFERENCE_INVALID"],
    ["externalRequestReference", "ALERT_EXTERNAL_REQUEST_REFERENCE_INVALID"],
    ["acknowledgementReference", "ALERT_ACKNOWLEDGEMENT_REFERENCE_INVALID"],
    ["retryEvidenceReference", "ALERT_RETRY_REFERENCE_INVALID"],
    ["deadLetterEvidenceReference", "ALERT_DEAD_LETTER_REFERENCE_INVALID"],
    ["recoveryEvidenceReference", "ALERT_RECOVERY_REFERENCE_INVALID"],
    ["escalationEvidenceReference", "ALERT_ESCALATION_REFERENCE_INVALID"],
    [
      "secretRotationEvidenceReference",
      "ALERT_SECRET_ROTATION_REFERENCE_INVALID",
    ],
  ]) {
    if (!evidence[field]) blockers.push(code)
  }
  if (!evidence.acknowledgedByDirectoryId) {
    blockers.push("ALERT_ACKNOWLEDGER_IDENTITY_INVALID")
  }
  if (!evidence.escalatedToDirectoryId) {
    blockers.push("ALERT_ESCALATION_IDENTITY_INVALID")
  }
  const deliveredAt = timestampMs(evidence.deliveredAt)
  const acknowledgedAt = timestampMs(evidence.acknowledgedAt)
  const escalationTestedAt = timestampMs(evidence.escalationTestedAt)
  if (
    deliveredAt === null ||
    deliveredAt > nowMs ||
    nowMs - deliveredAt > MAX_EVIDENCE_AGE_MS
  ) {
    blockers.push("ALERT_DELIVERY_TIMESTAMP_INVALID_OR_STALE")
  }
  if (
    acknowledgedAt === null ||
    acknowledgedAt > nowMs ||
    (deliveredAt !== null && acknowledgedAt < deliveredAt)
  ) {
    blockers.push("ALERT_ACKNOWLEDGEMENT_TIMESTAMP_INVALID")
  }
  if (evidence.acknowledgementSloMinutes === null) {
    blockers.push("ALERT_ACKNOWLEDGEMENT_SLO_INVALID")
  } else if (
    deliveredAt !== null &&
    acknowledgedAt !== null &&
    acknowledgedAt - deliveredAt >
      evidence.acknowledgementSloMinutes * 60_000
  ) {
    blockers.push("ALERT_ACKNOWLEDGEMENT_OUTSIDE_SLO")
  }
  if (
    escalationTestedAt === null ||
    escalationTestedAt > nowMs ||
    (deliveredAt !== null && escalationTestedAt < deliveredAt)
  ) {
    blockers.push("ALERT_ESCALATION_TIMESTAMP_INVALID")
  }
  return blockers
}

function buildOperationalRegisterPatch(input) {
  return {
    transportStatus: input.evidence.transportStatus,
    transportReference: input.evidence.transportReference,
    managedSecretReference: input.evidence.managedSecretReference,
    httpsDeliveryReference: input.evidence.httpsDeliveryReference,
    externalRequestReference: input.evidence.externalRequestReference,
    deliveredAt: input.evidence.deliveredAt,
    acknowledgementSloMinutes:
      input.evidence.acknowledgementSloMinutes,
    acknowledgedAt: input.evidence.acknowledgedAt,
    acknowledgedByDirectoryId:
      input.evidence.acknowledgedByDirectoryId,
    acknowledgementReference:
      input.evidence.acknowledgementReference,
    retryEvidenceReference: input.evidence.retryEvidenceReference,
    deadLetterEvidenceReference:
      input.evidence.deadLetterEvidenceReference,
    recoveryEvidenceReference:
      input.evidence.recoveryEvidenceReference,
    escalationTestedAt: input.evidence.escalationTestedAt,
    escalatedToDirectoryId: input.evidence.escalatedToDirectoryId,
    escalationEvidenceReference:
      input.evidence.escalationEvidenceReference,
    secretRotationEvidenceReference:
      input.evidence.secretRotationEvidenceReference,
    evidenceSha256: input.evidenceHash,
  }
}

function applyCaptureToOperationalRegister(register, capture) {
  if (!capture?.ready || !HASH_PATTERN.test(capture.evidenceHash || "")) {
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_CAPTURE_NOT_READY",
      "Only a ready alert evidence capture may update the operational register.",
    )
  }
  if (
    register?.activation?.requested !== false ||
    register?.activation?.authorized !== false ||
    register?.activation?.activatedAt !== null
  ) {
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_REGISTER_ACTIVATION_BOUNDARY_INVALID",
      "The operational register activation boundary is invalid.",
    )
  }
  const expectedEnvironment = String(
    register?.release?.environment || "",
  )
    .trim()
    .toLowerCase()
  if (expectedEnvironment !== capture.environment) {
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_REGISTER_ENVIRONMENT_MISMATCH",
      "The captured environment does not match the operational register.",
    )
  }
  const securityOwner = findOwner(register.owners, "SECURITY_INCIDENT")
  const onCallOwner = findOwner(register.owners, "ON_CALL_BACKUP")
  if (
    securityOwner?.primaryDirectoryId !==
    capture.evidence.acknowledgedByDirectoryId
  ) {
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_ACKNOWLEDGER_OWNER_MISMATCH",
      "The alert acknowledger does not match the security incident owner.",
    )
  }
  if (
    onCallOwner?.primaryDirectoryId !==
    capture.evidence.escalatedToDirectoryId
  ) {
    throw new AlertEvidenceCaptureError(
      "ALERT_EVIDENCE_ESCALATION_OWNER_MISMATCH",
      "The alert escalation target does not match the on-call backup owner.",
    )
  }
  return {
    ...register,
    alerting: {
      ...register.alerting,
      ...capture.operationalRegisterPatch,
    },
  }
}

function renderMarkdown(capture) {
  const lines = [
    "# Stoquify Agent Alert Operational Evidence",
    "",
    `**Captured:** ${capture.capturedAt}  `,
    `**Environment:** \`${capture.environment}\`  `,
    `**Ready:** ${capture.ready ? "Yes" : "No"}  `,
    `**Evidence hash:** \`${capture.evidenceHash}\`  `,
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
    `| HTTPS alert transport | \`${
      capture.evidence.transportStatus ?? "INVALID"
    }\` |`,
    `| Delivered | ${capture.evidence.deliveredAt ?? "Invalid"} |`,
    `| Acknowledged | ${
      capture.evidence.acknowledgedAt ?? "Invalid"
    } |`,
    `| Escalation tested | ${
      capture.evidence.escalationTestedAt ?? "Invalid"
    } |`,
    "",
    "## Evidence References",
    "",
    "| Evidence | Reference |",
    "|---|---|",
    `| Delivery | \`${
      capture.evidence.httpsDeliveryReference ?? "invalid"
    }\` |`,
    `| External request | \`${
      capture.evidence.externalRequestReference ?? "invalid"
    }\` |`,
    `| Acknowledgement | \`${
      capture.evidence.acknowledgementReference ?? "invalid"
    }\` |`,
    `| Retry | \`${
      capture.evidence.retryEvidenceReference ?? "invalid"
    }\` |`,
    `| Dead letter | \`${
      capture.evidence.deadLetterEvidenceReference ?? "invalid"
    }\` |`,
    `| Recovery | \`${
      capture.evidence.recoveryEvidenceReference ?? "invalid"
    }\` |`,
    `| Escalation | \`${
      capture.evidence.escalationEvidenceReference ?? "invalid"
    }\` |`,
    `| Secret rotation | \`${
      capture.evidence.secretRotationEvidenceReference ?? "invalid"
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
    "- The invalid-auth probe uses an ephemeral generated value that is discarded.",
    "- Unknown response fields are discarded before hashing or reporting.",
    "- A ready capture can update alerting evidence only; it cannot alter release identity, approvals, owners, scheduler data, declared status, or activation.",
    "",
  ]
  return lines.join("\n")
}

function findOwner(owners, role) {
  return Array.isArray(owners)
    ? owners.find((owner) => owner?.role === role)
    : undefined
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
  return typeof value === "string" && ENVIRONMENT_PATTERN.test(value)
    ? value
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

function safeTimestamp(value) {
  const timestamp = timestampMs(value)
  return timestamp === null ? null : new Date(timestamp).toISOString()
}

function timestampMs(value) {
  if (typeof value !== "string") return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function boundedIntegerOrNull(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum
    ? value
    : null
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum)
}

function hashEvidence(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`
}

async function main() {
  const options = parseArgs(process.argv)
  const capture = await captureAgentAlertEvidence()
  const jsonOut = resolve(process.cwd(), options.jsonOut)
  const markdownOut = resolve(process.cwd(), options.markdownOut)
  mkdirSync(dirname(jsonOut), { recursive: true })
  mkdirSync(dirname(markdownOut), { recursive: true })
  writeFileSync(jsonOut, `${JSON.stringify(capture, null, 2)}\n`, "utf8")
  writeFileSync(markdownOut, renderMarkdown(capture), "utf8")

  if (options.updateRegister) {
    const registerPath = resolve(process.cwd(), options.updateRegister)
    if (!existsSync(registerPath)) {
      throw new AlertEvidenceCaptureError(
        "ALERT_EVIDENCE_REGISTER_MISSING",
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
      error instanceof AlertEvidenceCaptureError
        ? error.code
        : "ALERT_EVIDENCE_CAPTURE_FAILED"
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        code,
        secretValuesPrinted: false,
      })}\n`,
    )
    process.exitCode = 1
  })
}

module.exports = {
  AlertEvidenceCaptureError,
  applyCaptureToOperationalRegister,
  buildOperationalRegisterPatch,
  captureAgentAlertEvidence,
  evaluateEvidence,
  parseArgs,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeEvidencePayload,
}
