#!/usr/bin/env node

const { createHash, randomBytes } = require("node:crypto")
const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs")
const { dirname, resolve } = require("node:path")

const RECONCILER_PATH = "/api/internal/agents/reconcile-abandoned"
const DEFAULT_JSON_OUT =
  "what-next/agents-runtime/agent-reconciler-readiness-evidence.json"
const DEFAULT_MD_OUT =
  "what-next/agents-runtime/agent-reconciler-readiness-evidence.md"
const DEFAULT_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json"
const ALLOWED_BLOCKERS = new Set([
  "RECONCILER_SECRET_UNAVAILABLE",
  "RECONCILER_ALERT_TRANSPORT_UNHEALTHY",
  "RECONCILER_SUCCESS_WINDOWS_INCOMPLETE",
  "RECONCILER_WINDOW_FAILED",
  "RECONCILER_CADENCE_STALE",
  "RECONCILER_CADENCE_IRREGULAR",
  "RECONCILER_LEASE_STALE",
])
const ALLOWED_WINDOW_STATUSES = new Set([
  "COMPLETED",
  "COMPLETED_WITH_WARNINGS",
  "FAILED",
  "RUNNING",
])
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,190}$/
const ENVIRONMENT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,62}$/
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/
const MAX_RESPONSE_BYTES = 100_000

class ReconcilerEvidenceCaptureError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "ReconcilerEvidenceCaptureError"
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
  const baseUrl = String(
    environment.STOQUIFY_AGENT_RECONCILER_BASE_URL || "",
  ).trim()
  const secret = String(
    environment.STOQUIFY_AGENT_RECONCILER_SECRET || "",
  ).trim()
  const releaseEnvironment = String(
    environment.STOQUIFY_AGENT_RELEASE_ENVIRONMENT || "",
  )
    .trim()
    .toLowerCase()

  if (!baseUrl) {
    throw new ReconcilerEvidenceCaptureError(
      "RECONCILER_BASE_URL_MISSING",
      "The reconciler base URL is required.",
    )
  }
  const url = new URL(RECONCILER_PATH, baseUrl)
  if (
    url.protocol !== "https:" &&
    !(
      environment.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  ) {
    throw new ReconcilerEvidenceCaptureError(
      "RECONCILER_HTTPS_REQUIRED",
      "The reconciler endpoint must use HTTPS outside local development.",
    )
  }
  if (secret.length < 32) {
    throw new ReconcilerEvidenceCaptureError(
      "RECONCILER_SECRET_INVALID",
      "The reconciler secret must contain at least 32 characters.",
    )
  }
  if (!ENVIRONMENT_PATTERN.test(releaseEnvironment)) {
    throw new ReconcilerEvidenceCaptureError(
      "RECONCILER_ENVIRONMENT_INVALID",
      "The release environment is invalid.",
    )
  }

  return {
    url,
    secret,
    releaseEnvironment,
    timeoutMs: boundedInteger(
      environment.STOQUIFY_AGENT_RECONCILER_CAPTURE_TIMEOUT_MS,
      20_000,
      5_000,
      60_000,
    ),
  }
}

async function captureAgentReconcilerEvidence(input = {}) {
  const environment = input.environment || process.env
  const config = resolveCaptureConfig(environment)
  const fetchImpl = input.fetchImpl || fetch
  const now = input.now || new Date()
  const capturedAt = now.toISOString()
  const invalidCredential = buildInvalidCredential(config.secret)

  const invalidResponse = await requestReadiness({
    fetchImpl,
    url: config.url,
    secret: invalidCredential,
    timeoutMs: config.timeoutMs,
  })
  const readinessResponse = await requestReadiness({
    fetchImpl,
    url: config.url,
    secret: config.secret,
    timeoutMs: config.timeoutMs,
  })
  const readiness = sanitizeReadinessPayload(readinessResponse.payload)
  const invalidAuthRejected = invalidResponse.status === 401
  const readinessHttpReady =
    readinessResponse.status === 200 && readiness.ready === true
  const ready =
    invalidAuthRejected &&
    readinessHttpReady &&
    readiness.environment === config.releaseEnvironment

  const evidenceCore = {
    schemaVersion: 1,
    capturedAt,
    endpointReference: endpointReference(config.url),
    environment: config.releaseEnvironment,
    checks: {
      readinessHttpStatus: readinessResponse.status,
      invalidAuthHttpStatus: invalidResponse.status,
      invalidAuthRejected,
      environmentMatched:
        readiness.environment === config.releaseEnvironment,
    },
    readiness,
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
      ready,
      capturedAt,
      evidenceHash,
      readiness,
    }),
  }
}

async function requestReadiness(input) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs)
  try {
    const response = await input.fetchImpl(input.url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${input.secret}`,
        accept: "application/json",
        "user-agent": "stoquify-agent-reconciler-evidence/1",
      },
      signal: controller.signal,
    })
    return {
      status: response.status,
      payload: await boundedJson(response),
    }
  } catch (error) {
    if (error instanceof ReconcilerEvidenceCaptureError) throw error
    throw new ReconcilerEvidenceCaptureError(
      error?.name === "AbortError"
        ? "RECONCILER_CAPTURE_TIMEOUT"
        : "RECONCILER_CAPTURE_UNAVAILABLE",
      "The reconciler readiness probe could not be completed.",
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function boundedJson(response) {
  const text = await response.text()
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new ReconcilerEvidenceCaptureError(
      "RECONCILER_RESPONSE_TOO_LARGE",
      "The reconciler readiness response exceeded the evidence limit.",
    )
  }
  try {
    return text ? JSON.parse(text) : null
  } catch {
    throw new ReconcilerEvidenceCaptureError(
      "RECONCILER_RESPONSE_INVALID",
      "The reconciler readiness response was not valid JSON.",
    )
  }
}

function sanitizeReadinessPayload(payload) {
  const data =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
      ? payload.data
      : {}
  const blockers = Array.isArray(data.blockers)
    ? [...new Set(data.blockers.filter((code) => ALLOWED_BLOCKERS.has(code)))]
    : []
  const windows = Array.isArray(data.windows)
    ? data.windows.slice(0, 3).map(sanitizeWindow)
    : []

  return {
    ready: data.ready === true,
    environment: safeEnvironment(data.environment),
    scheduleKey:
      data.scheduleKey === "agent-runtime-control-plane"
        ? data.scheduleKey
        : null,
    intervalMinutes:
      data.intervalMinutes === 5 ? data.intervalMinutes : null,
    blockers,
    requiredSuccessfulWindows:
      data.requiredSuccessfulWindows === 3
        ? data.requiredSuccessfulWindows
        : null,
    successfulWindowCount: boundedCount(data.successfulWindowCount, 3),
    latestScheduledAt: safeTimestamp(data.latestScheduledAt),
    latestCompletedAt: safeTimestamp(data.latestCompletedAt),
    windows,
    activeInvocation: data.activeInvocation === true,
    activeLeaseStale: data.activeLeaseStale === true,
    alertTransportReady: data.alertTransportReady === true,
  }
}

function sanitizeWindow(window) {
  const candidate =
    window && typeof window === "object" && !Array.isArray(window)
      ? window
      : {}
  return {
    runId:
      typeof candidate.runId === "string" &&
      RUN_ID_PATTERN.test(candidate.runId)
        ? candidate.runId
        : null,
    status: ALLOWED_WINDOW_STATUSES.has(candidate.status)
      ? candidate.status
      : null,
    scheduledAt: safeTimestamp(candidate.scheduledAt),
    completedAt: safeTimestamp(candidate.completedAt),
  }
}

function buildOperationalRegisterPatch(input) {
  const evidenceId = input.evidenceHash.replace("sha256:", "")
  const evidenceBase = `evidence://agent-reconciler-readiness/${evidenceId}`
  const latestScheduledAt = safeTimestamp(
    input.readiness.latestScheduledAt,
  )
  return {
    readinessStatus: input.ready ? "HEALTHY" : "BLOCKED",
    readinessCheckedAt: input.capturedAt,
    readinessEvidenceReference: evidenceBase,
    readinessEvidenceSha256: input.evidenceHash,
    heartbeatFreshUntil: latestScheduledAt
      ? new Date(
          Date.parse(latestScheduledAt) + 8 * 60_000,
        ).toISOString()
      : null,
    invalidAuthEvidenceReference: `${evidenceBase}/invalid-auth-401`,
    windows: input.readiness.windows.map((window, index) => ({
      runId: window.runId,
      scheduledAt: window.scheduledAt,
      completedAt: window.completedAt,
      status: window.status,
      evidenceReference: `${evidenceBase}/window/${index + 1}`,
    })),
  }
}

function applyCaptureToOperationalRegister(register, capture) {
  if (!capture?.ready || !HASH_PATTERN.test(capture.evidenceHash || "")) {
    throw new ReconcilerEvidenceCaptureError(
      "RECONCILER_CAPTURE_NOT_READY",
      "Only a ready evidence capture may update the operational register.",
    )
  }
  if (
    register?.activation?.requested !== false ||
    register?.activation?.authorized !== false ||
    register?.activation?.activatedAt !== null
  ) {
    throw new ReconcilerEvidenceCaptureError(
      "RECONCILER_REGISTER_ACTIVATION_BOUNDARY_INVALID",
      "The operational register activation boundary is invalid.",
    )
  }
  const expectedEnvironment = String(
    register?.release?.environment || "",
  )
    .trim()
    .toLowerCase()
  if (expectedEnvironment !== capture.environment) {
    throw new ReconcilerEvidenceCaptureError(
      "RECONCILER_REGISTER_ENVIRONMENT_MISMATCH",
      "The captured environment does not match the operational register.",
    )
  }
  return {
    ...register,
    scheduler: {
      ...register.scheduler,
      ...capture.operationalRegisterPatch,
    },
  }
}

function renderMarkdown(capture) {
  const lines = [
    "# Stoquify Agent Reconciler Readiness Evidence",
    "",
    `**Captured:** ${capture.capturedAt}  `,
    `**Environment:** \`${capture.environment}\`  `,
    `**Ready:** ${capture.ready ? "Yes" : "No"}  `,
    `**Evidence hash:** \`${capture.evidenceHash}\`  `,
    "**Secret values printed or retained:** No",
    "",
    "| Check | Result |",
    "|---|---|",
    `| Authorized readiness HTTP | \`${capture.checks.readinessHttpStatus}\` |`,
    `| Invalid authentication rejected | ${
      capture.checks.invalidAuthRejected ? "Yes" : "No"
    } (\`${capture.checks.invalidAuthHttpStatus}\`) |`,
    `| Environment matched | ${
      capture.checks.environmentMatched ? "Yes" : "No"
    } |`,
    `| Alert transport ready | ${
      capture.readiness.alertTransportReady ? "Yes" : "No"
    } |`,
    `| Successful windows | ${capture.readiness.successfulWindowCount}/${capture.readiness.requiredSuccessfulWindows ?? 3} |`,
    "",
    "## Captured Windows",
    "",
    "| Run | Status | Scheduled | Completed |",
    "|---|---|---|---|",
  ]
  capture.readiness.windows.forEach((window) => {
    lines.push(
      `| \`${window.runId ?? "invalid"}\` | \`${
        window.status ?? "invalid"
      }\` | ${window.scheduledAt ?? "invalid"} | ${
        window.completedAt ?? "invalid"
      } |`,
    )
  })
  if (capture.readiness.windows.length === 0) {
    lines.push("| No windows supplied | - | - | - |")
  }
  lines.push(
    "",
    "## Readiness Blockers",
    "",
    ...(capture.readiness.blockers.length
      ? capture.readiness.blockers.map((blocker) => `- \`${blocker}\``)
      : ["- None."]),
    "",
    "## Safety",
    "",
    "- The bearer secret is read from the process environment and is never written to JSON, Markdown, logs, or the operational register.",
    "- Raw HTTP bodies and authorization headers are not retained.",
    "- The invalid-auth probe uses an ephemeral generated value that is discarded.",
    "- A ready capture can update scheduler evidence only; it cannot alter approvals, owners, release identity, activation fields, or declared release status.",
    "",
  )
  return lines.join("\n")
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

function hashEvidence(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`
}

function safeEnvironment(value) {
  return typeof value === "string" && ENVIRONMENT_PATTERN.test(value)
    ? value
    : null
}

function safeTimestamp(value) {
  if (typeof value !== "string") return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : null
}

function boundedCount(value, maximum) {
  return Number.isInteger(value) && value >= 0 && value <= maximum
    ? value
    : 0
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum)
}

async function main() {
  const options = parseArgs(process.argv)
  const capture = await captureAgentReconcilerEvidence()
  const jsonOut = resolve(process.cwd(), options.jsonOut)
  const markdownOut = resolve(process.cwd(), options.markdownOut)
  mkdirSync(dirname(jsonOut), { recursive: true })
  mkdirSync(dirname(markdownOut), { recursive: true })
  writeFileSync(jsonOut, `${JSON.stringify(capture, null, 2)}\n`, "utf8")
  writeFileSync(markdownOut, renderMarkdown(capture), "utf8")

  if (options.updateRegister) {
    const registerPath = resolve(process.cwd(), options.updateRegister)
    if (!existsSync(registerPath)) {
      throw new ReconcilerEvidenceCaptureError(
        "RECONCILER_REGISTER_MISSING",
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
        successfulWindows: capture.readiness.successfulWindowCount,
        invalidAuthRejected: capture.checks.invalidAuthRejected,
        evidenceHash: capture.evidenceHash,
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
      error instanceof ReconcilerEvidenceCaptureError
        ? error.code
        : "RECONCILER_CAPTURE_FAILED"
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
  ReconcilerEvidenceCaptureError,
  applyCaptureToOperationalRegister,
  buildOperationalRegisterPatch,
  captureAgentReconcilerEvidence,
  parseArgs,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeReadinessPayload,
}
