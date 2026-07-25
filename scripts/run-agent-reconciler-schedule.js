#!/usr/bin/env node

const RECONCILER_PATH = "/api/internal/agents/reconcile-abandoned"
const INTERVAL_MS = 5 * 60_000

function resolveWorkerConfig(environment = process.env) {
  const baseUrl = String(environment.STOQUIFY_AGENT_RECONCILER_BASE_URL || "").trim()
  const secret = String(environment.STOQUIFY_AGENT_RECONCILER_SECRET || "").trim()
  const releaseEnvironment = String(
    environment.STOQUIFY_AGENT_RELEASE_ENVIRONMENT || "local",
  )
    .trim()
    .toLowerCase()

  if (!baseUrl) throw new Error("STOQUIFY_AGENT_RECONCILER_BASE_URL is required.")
  const url = new URL(RECONCILER_PATH, baseUrl)
  if (
    url.protocol !== "https:" &&
    !(
      environment.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  ) {
    throw new Error("The reconciler endpoint must use HTTPS outside local development.")
  }
  if (secret.length < 32) {
    throw new Error("STOQUIFY_AGENT_RECONCILER_SECRET must contain at least 32 characters.")
  }
  if (!/^[a-z0-9][a-z0-9._-]{0,62}$/.test(releaseEnvironment)) {
    throw new Error("STOQUIFY_AGENT_RELEASE_ENVIRONMENT is invalid.")
  }

  return {
    url,
    secret,
    releaseEnvironment,
    timeoutMs: boundedInteger(
      environment.STOQUIFY_AGENT_RECONCILER_TIMEOUT_MS,
      120_000,
      10_000,
      300_000,
    ),
    maxAttempts: boundedInteger(
      environment.STOQUIFY_AGENT_RECONCILER_MAX_ATTEMPTS,
      3,
      1,
      5,
    ),
  }
}

function buildScheduleEnvelope(now, releaseEnvironment) {
  const scheduledAt = new Date(Math.floor(now.getTime() / INTERVAL_MS) * INTERVAL_MS)
  return {
    scheduledAt,
    runId: `agent-runtime:${releaseEnvironment}:${scheduledAt.toISOString()}`,
  }
}

async function invokeAgentReconciler(input = {}) {
  const environment = input.environment || process.env
  const config = resolveWorkerConfig(environment)
  const envelope = buildScheduleEnvelope(
    input.now || new Date(),
    config.releaseEnvironment,
  )
  const fetchImpl = input.fetchImpl || fetch
  const sleepImpl = input.sleepImpl || sleep

  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        fetchImpl,
        config.url,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.secret}`,
            "content-type": "application/json",
            "x-stoquify-scheduler-run-id": envelope.runId,
            "x-stoquify-scheduler-scheduled-at": envelope.scheduledAt.toISOString(),
            "user-agent": "stoquify-agent-reconciler/1",
          },
          body: "{}",
        },
        config.timeoutMs,
      )
      const payload = await safeJson(response)
      if (response.ok) {
        return {
          ok: true,
          attempt,
          runId: envelope.runId,
          scheduledAt: envelope.scheduledAt.toISOString(),
          replayed: payload?.replayed === true,
          status: payload?.status || payload?.data?.status || "COMPLETED",
          correlationId:
            payload?.data?.correlationId || payload?.correlationId || envelope.runId,
        }
      }

      if (!shouldRetryResponse(response.status, payload) || attempt === config.maxAttempts) {
        throw new Error(
          `Agent reconciler request failed with status ${response.status} and code ${
            payload?.code || "UNAVAILABLE"
          }.`,
        )
      }
    } catch (error) {
      if (attempt === config.maxAttempts || !isRetryableFailure(error)) throw error
    }

    await sleepImpl(Math.min(1_000 * 2 ** (attempt - 1), 8_000))
  }

  throw new Error("Agent reconciler retry policy exhausted.")
}

async function fetchWithTimeout(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function shouldRetryResponse(status, payload) {
  if (status >= 500) return true
  return (
    status === 409 &&
    ["RECONCILER_INVOCATION_IN_PROGRESS", "RECONCILER_INVOCATION_OVERLAP"].includes(
      payload?.code,
    )
  )
}

function isRetryableFailure(error) {
  if (!(error instanceof Error)) return false
  if (error.name === "AbortError") return true
  return !error.message.startsWith("Agent reconciler request failed")
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum)
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

if (require.main === module) {
  invokeAgentReconciler()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    })
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : "Agent reconciler invocation failed."}\n`,
      )
      process.exitCode = 1
    })
}

module.exports = {
  buildScheduleEnvelope,
  invokeAgentReconciler,
  resolveWorkerConfig,
  shouldRetryResponse,
}
