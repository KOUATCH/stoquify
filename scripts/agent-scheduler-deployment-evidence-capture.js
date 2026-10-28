#!/usr/bin/env node

const { createHash, randomBytes } = require("node:crypto");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { dirname, resolve } = require("node:path");

const DEFAULT_JSON_OUT =
  "what-next/agents-runtime/agent-scheduler-deployment-operational-evidence.json";
const DEFAULT_MD_OUT =
  "what-next/agents-runtime/agent-scheduler-deployment-operational-evidence.md";
const DEFAULT_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json";
const ENVIRONMENT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,62}$/;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/i;
const COMMIT_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const REFERENCE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/[a-z0-9][a-z0-9._~:/-]*$/i;
const SAFE_TEXT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/ -]{0,199}$/;
const MAX_RESPONSE_BYTES = 150_000;
const MAX_EVIDENCE_AGE_MS = 24 * 60 * 60_000;
const FORBIDDEN_PAYLOAD_KEYS = new Set([
  "secretValue",
  "credentialValue",
  "passwordValue",
  "tokenValue",
  "authorizationHeader",
  "rawEnvironment",
  "environmentSnapshot",
  "databaseUrl",
  "connectionString",
  "accessToken",
  "refreshToken",
  "privateKey",
]);

class SchedulerDeploymentEvidenceCaptureError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SchedulerDeploymentEvidenceCaptureError";
    this.code = code;
  }
}

function parseArgs(argv) {
  const options = {
    mode: "report",
    jsonOut: DEFAULT_JSON_OUT,
    markdownOut: DEFAULT_MD_OUT,
    registerPath: DEFAULT_REGISTER,
    updateRegister: null,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--mode") options.mode = argv[++index];
    else if (argument === "--out") options.jsonOut = argv[++index];
    else if (argument === "--md-out") options.markdownOut = argv[++index];
    else if (argument === "--register") options.registerPath = argv[++index];
    else if (argument === "--update-register") {
      options.updateRegister = argv[++index] || DEFAULT_REGISTER;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.");
  }
  return options;
}

function resolveCaptureConfig(environment = process.env) {
  const rawUrl = String(
    environment.STOQUIFY_AGENT_SCHEDULER_EVIDENCE_URL || "",
  ).trim();
  const secret = String(
    environment.STOQUIFY_AGENT_SCHEDULER_EVIDENCE_SECRET || "",
  ).trim();
  const releaseEnvironment = String(
    environment.STOQUIFY_AGENT_RELEASE_ENVIRONMENT || "",
  )
    .trim()
    .toLowerCase();

  if (!rawUrl) {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_URL_MISSING",
      "The scheduler deployment evidence URL is required.",
    );
  }
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_URL_INVALID",
      "The scheduler deployment evidence URL is invalid.",
    );
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
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_HTTPS_REQUIRED",
      "The scheduler evidence endpoint must be query-free HTTPS outside local development.",
    );
  }
  if (secret.length < 32) {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_SECRET_INVALID",
      "The scheduler evidence secret must contain at least 32 characters.",
    );
  }
  if (!ENVIRONMENT_PATTERN.test(releaseEnvironment)) {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_ENVIRONMENT_INVALID",
      "The release environment is invalid.",
    );
  }
  return {
    url,
    secret,
    releaseEnvironment,
    timeoutMs: boundedInteger(
      environment.STOQUIFY_AGENT_SCHEDULER_EVIDENCE_TIMEOUT_MS,
      20_000,
      5_000,
      60_000,
    ),
  };
}

async function captureAgentSchedulerDeploymentEvidence(input = {}) {
  const operationalRegister = input.operationalRegister;
  if (!operationalRegister) {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_OPERATIONAL_REGISTER_REQUIRED",
      "The operational register is required for release-bound capture.",
    );
  }
  const environment = input.environment || process.env;
  const config = resolveCaptureConfig(environment);
  const fetchImpl = input.fetchImpl || fetch;
  const now = input.now || new Date();
  const capturedAt = now.toISOString();

  const invalidResponse = await requestEvidence({
    fetchImpl,
    url: config.url,
    secret: buildInvalidCredential(config.secret),
    timeoutMs: config.timeoutMs,
  });
  const evidenceResponse = await requestEvidence({
    fetchImpl,
    url: config.url,
    secret: config.secret,
    timeoutMs: config.timeoutMs,
  });
  const evidence = sanitizeEvidencePayload(evidenceResponse.payload);
  const checks = {
    evidenceHttpStatus: evidenceResponse.status,
    invalidAuthHttpStatus: invalidResponse.status,
    invalidAuthRejected: invalidResponse.status === 401,
    environmentMatched: evidence.environment === config.releaseEnvironment,
  };
  const blockers = evaluateSchedulerDeploymentEvidence(evidence, {
    now,
    release: operationalRegister.release,
    checks,
  });
  const ready =
    checks.invalidAuthRejected &&
    evidenceResponse.status === 200 &&
    evidence.sourceReady === true &&
    blockers.length === 0;
  const evidenceCore = {
    schemaVersion: 1,
    capturedAt,
    endpointReference: endpointReference(config.url),
    environment: config.releaseEnvironment,
    checks,
    evidence,
    blockers,
    ready,
    rawResponseRetained: false,
    authorizationHeadersRetained: false,
    secretValuesPrinted: false,
    activationAuthorized: false,
  };
  const evidenceHash = hashEvidence(evidenceCore);
  return {
    ...evidenceCore,
    evidenceHash,
    operationalRegisterPatch: buildOperationalRegisterPatch({
      evidence,
      evidenceHash,
    }),
  };
}

async function requestEvidence(input) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await input.fetchImpl(input.url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${input.secret}`,
        accept: "application/json",
        "user-agent": "stoquify-agent-scheduler-deployment-evidence/1",
      },
      signal: controller.signal,
    });
    return {
      status: response.status,
      payload: await boundedJson(response),
    };
  } catch (error) {
    if (error instanceof SchedulerDeploymentEvidenceCaptureError) {
      throw error;
    }
    throw new SchedulerDeploymentEvidenceCaptureError(
      error?.name === "AbortError"
        ? "SCHEDULER_EVIDENCE_CAPTURE_TIMEOUT"
        : "SCHEDULER_EVIDENCE_CAPTURE_UNAVAILABLE",
      "The scheduler deployment evidence probe could not be completed.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function boundedJson(response) {
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_RESPONSE_TOO_LARGE",
      "The scheduler evidence response exceeded the evidence limit.",
    );
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_RESPONSE_INVALID",
      "The scheduler evidence response was not valid JSON.",
    );
  }
}

function sanitizeEvidencePayload(payload) {
  assertNoForbiddenKeys(payload);
  const data =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
      ? payload.data
      : {};
  return {
    sourceReady: data.ready === true,
    environment: safeEnvironment(data.environment),
    sourceSystemReference: safeReference(data.sourceSystemReference),
    attestationReference: safeReference(data.attestationReference),
    attestationDigest: safeHash(data.attestationDigest),
    attestedAt: safeTimestamp(data.attestedAt),
    release: sanitizeRelease(data.release),
    scheduler: sanitizeScheduler(data.scheduler),
  };
}

function sanitizeRelease(value) {
  const candidate = objectValue(value);
  return {
    packageId: safeText(candidate.packageId),
    releaseVersion: safeText(candidate.releaseVersion),
    packageState:
      candidate.packageState === "PILOT_CERTIFIED" ? "PILOT_CERTIFIED" : null,
    commitSha: safeCommit(candidate.commitSha),
    artifactDigest: safeHash(candidate.artifactDigest),
    deploymentReference: safeReference(candidate.deploymentReference),
    activationAbsent: candidate.activatedAt === null,
    activatedAt: null,
  };
}

function sanitizeScheduler(value) {
  const candidate = objectValue(value);
  return {
    provider: safeText(candidate.provider),
    scheduleReference: safeReference(candidate.scheduleReference),
    workloadReference: safeReference(candidate.workloadReference),
    authType: ["MANAGED_SECRET", "WORKLOAD_IDENTITY"].includes(
      candidate.authType,
    )
      ? candidate.authType
      : null,
    managedCredentialReference: safeReference(
      candidate.managedCredentialReference,
    ),
    intervalMinutes:
      candidate.intervalMinutes === 5 ? candidate.intervalMinutes : null,
    singleConcurrency: candidate.singleConcurrency === true,
    leaseSafe: candidate.leaseSafe === true,
    concurrencyEvidenceReference: safeReference(
      candidate.concurrencyEvidenceReference,
    ),
    timeoutMs:
      Number.isInteger(candidate.timeoutMs) &&
      candidate.timeoutMs > 0 &&
      candidate.timeoutMs < 300_000
        ? candidate.timeoutMs
        : null,
    deployedCommitSha: safeCommit(candidate.deployedCommitSha),
    deployedArtifactDigest: safeHash(candidate.deployedArtifactDigest),
    deployedAt: safeTimestamp(candidate.deployedAt),
    missingConfigHttpStatus:
      candidate.missingConfigHttpStatus === 503 ? 503 : null,
    missingConfigEvidenceReference: safeReference(
      candidate.missingConfigEvidenceReference,
    ),
    failureAlertReference: safeReference(candidate.failureAlertReference),
  };
}

function evaluateSchedulerDeploymentEvidence(
  evidence,
  { now = new Date(), release = null, checks = {} } = {},
) {
  const blockers = [];
  const nowMs = normalizeNow(now);
  if (evidence.sourceReady !== true) {
    blockers.push("SCHEDULER_EVIDENCE_SOURCE_NOT_READY");
  }
  if (checks.invalidAuthRejected !== true) {
    blockers.push("SCHEDULER_EVIDENCE_INVALID_AUTH_NOT_REJECTED");
  }
  if (checks.evidenceHttpStatus !== 200) {
    blockers.push("SCHEDULER_EVIDENCE_HTTP_STATUS_INVALID");
  }
  if (checks.environmentMatched !== true) {
    blockers.push("SCHEDULER_EVIDENCE_ENVIRONMENT_MISMATCH");
  }
  for (const [field, code] of [
    ["sourceSystemReference", "SCHEDULER_EVIDENCE_SOURCE_REFERENCE_INVALID"],
    [
      "attestationReference",
      "SCHEDULER_EVIDENCE_ATTESTATION_REFERENCE_INVALID",
    ],
  ]) {
    if (!evidence[field]) blockers.push(code);
  }
  if (!evidence.attestationDigest) {
    blockers.push("SCHEDULER_EVIDENCE_ATTESTATION_DIGEST_INVALID");
  }
  const attestedAtMs = timestampMs(evidence.attestedAt);
  if (
    attestedAtMs === null ||
    attestedAtMs > nowMs ||
    nowMs - attestedAtMs > MAX_EVIDENCE_AGE_MS
  ) {
    blockers.push("SCHEDULER_EVIDENCE_ATTESTATION_INVALID_OR_STALE");
  }
  evaluateRelease(evidence.release, release, blockers);
  evaluateScheduler(evidence.scheduler, nowMs, attestedAtMs, blockers);
  compareBoundValue(
    evidence.scheduler.deployedCommitSha,
    evidence.release.commitSha,
    "SCHEDULER_EVIDENCE_SCHEDULER_RELEASE_COMMIT_MISMATCH",
    blockers,
  );
  compareBoundValue(
    evidence.scheduler.deployedArtifactDigest,
    evidence.release.artifactDigest,
    "SCHEDULER_EVIDENCE_SCHEDULER_RELEASE_ARTIFACT_MISMATCH",
    blockers,
  );
  return [...new Set(blockers)];
}

function evaluateRelease(candidate, release, blockers) {
  for (const [field, code] of [
    ["packageId", "SCHEDULER_EVIDENCE_PACKAGE_ID_INVALID"],
    ["releaseVersion", "SCHEDULER_EVIDENCE_RELEASE_VERSION_INVALID"],
    ["commitSha", "SCHEDULER_EVIDENCE_RELEASE_COMMIT_INVALID"],
    ["artifactDigest", "SCHEDULER_EVIDENCE_RELEASE_ARTIFACT_INVALID"],
    [
      "deploymentReference",
      "SCHEDULER_EVIDENCE_RELEASE_DEPLOYMENT_REFERENCE_INVALID",
    ],
  ]) {
    if (!candidate[field]) blockers.push(code);
  }
  if (candidate.packageState !== "PILOT_CERTIFIED") {
    blockers.push("SCHEDULER_EVIDENCE_PACKAGE_NOT_PILOT_CERTIFIED");
  }
  if (!candidate.activationAbsent || candidate.activatedAt !== null) {
    blockers.push("SCHEDULER_EVIDENCE_RELEASE_ACTIVATION_PRESENT");
  }
  if (!release) {
    blockers.push("SCHEDULER_EVIDENCE_OPERATIONAL_RELEASE_MISSING");
    return;
  }
  for (const [field, code] of [
    ["packageId", "SCHEDULER_EVIDENCE_PACKAGE_ID_MISMATCH"],
    ["releaseVersion", "SCHEDULER_EVIDENCE_RELEASE_VERSION_MISMATCH"],
    ["packageState", "SCHEDULER_EVIDENCE_PACKAGE_STATE_MISMATCH"],
    ["commitSha", "SCHEDULER_EVIDENCE_RELEASE_COMMIT_MISMATCH"],
    ["artifactDigest", "SCHEDULER_EVIDENCE_RELEASE_ARTIFACT_MISMATCH"],
    [
      "deploymentReference",
      "SCHEDULER_EVIDENCE_RELEASE_DEPLOYMENT_REFERENCE_MISMATCH",
    ],
    ["activatedAt", "SCHEDULER_EVIDENCE_RELEASE_ACTIVATION_MISMATCH"],
  ]) {
    compareBoundValue(candidate[field], release[field], code, blockers);
  }
}

function evaluateScheduler(scheduler, nowMs, attestedAtMs, blockers) {
  for (const [field, code] of [
    ["provider", "SCHEDULER_EVIDENCE_PROVIDER_INVALID"],
    ["scheduleReference", "SCHEDULER_EVIDENCE_SCHEDULE_REFERENCE_INVALID"],
    ["workloadReference", "SCHEDULER_EVIDENCE_WORKLOAD_REFERENCE_INVALID"],
    [
      "managedCredentialReference",
      "SCHEDULER_EVIDENCE_MANAGED_CREDENTIAL_REFERENCE_INVALID",
    ],
    [
      "concurrencyEvidenceReference",
      "SCHEDULER_EVIDENCE_CONCURRENCY_REFERENCE_INVALID",
    ],
    ["deployedCommitSha", "SCHEDULER_EVIDENCE_DEPLOYED_COMMIT_INVALID"],
    ["deployedArtifactDigest", "SCHEDULER_EVIDENCE_DEPLOYED_ARTIFACT_INVALID"],
    [
      "missingConfigEvidenceReference",
      "SCHEDULER_EVIDENCE_MISSING_CONFIG_REFERENCE_INVALID",
    ],
    [
      "failureAlertReference",
      "SCHEDULER_EVIDENCE_FAILURE_ALERT_REFERENCE_INVALID",
    ],
  ]) {
    if (!scheduler[field]) blockers.push(code);
  }
  if (!["MANAGED_SECRET", "WORKLOAD_IDENTITY"].includes(scheduler.authType)) {
    blockers.push("SCHEDULER_EVIDENCE_AUTH_TYPE_INVALID");
  }
  if (scheduler.intervalMinutes !== 5) {
    blockers.push("SCHEDULER_EVIDENCE_INTERVAL_INVALID");
  }
  if (scheduler.singleConcurrency !== true && scheduler.leaseSafe !== true) {
    blockers.push("SCHEDULER_EVIDENCE_CONCURRENCY_CONTROL_MISSING");
  }
  if (!scheduler.timeoutMs) {
    blockers.push("SCHEDULER_EVIDENCE_TIMEOUT_INVALID");
  }
  if (scheduler.missingConfigHttpStatus !== 503) {
    blockers.push("SCHEDULER_EVIDENCE_MISSING_CONFIG_STATUS_NOT_503");
  }
  const deployedAtMs = timestampMs(scheduler.deployedAt);
  if (deployedAtMs === null || deployedAtMs > nowMs) {
    blockers.push("SCHEDULER_EVIDENCE_DEPLOYED_AT_INVALID");
  } else if (attestedAtMs !== null && deployedAtMs > attestedAtMs) {
    blockers.push("SCHEDULER_EVIDENCE_DEPLOYED_AFTER_ATTESTATION");
  }
}

function buildOperationalRegisterPatch(input) {
  const evidenceId = input.evidenceHash.replace("sha256:", "");
  const scheduler = input.evidence.scheduler;
  return {
    provider: scheduler.provider,
    scheduleReference: scheduler.scheduleReference,
    workloadReference: scheduler.workloadReference,
    authType: scheduler.authType,
    managedCredentialReference: scheduler.managedCredentialReference,
    intervalMinutes: scheduler.intervalMinutes,
    singleConcurrency: scheduler.singleConcurrency,
    leaseSafe: scheduler.leaseSafe,
    concurrencyEvidenceReference: scheduler.concurrencyEvidenceReference,
    timeoutMs: scheduler.timeoutMs,
    deployedCommitSha: scheduler.deployedCommitSha,
    deployedArtifactDigest: scheduler.deployedArtifactDigest,
    deployedAt: scheduler.deployedAt,
    missingConfigEvidenceReference: scheduler.missingConfigEvidenceReference,
    failureAlertReference: scheduler.failureAlertReference,
    deploymentSourceSystemReference: input.evidence.sourceSystemReference,
    deploymentAttestationReference: input.evidence.attestationReference,
    deploymentAttestationDigest: input.evidence.attestationDigest,
    deploymentAttestedAt: input.evidence.attestedAt,
    deploymentEvidenceSha256: input.evidenceHash,
    deploymentAuthorityInvalidAuthEvidenceReference: `evidence://agent-scheduler-deployment/${evidenceId}/invalid-auth-401`,
  };
}

function applyCaptureToOperationalRegister(
  register,
  capture,
  { now = new Date() } = {},
) {
  if (!capture?.ready || !HASH_PATTERN.test(capture.evidenceHash || "")) {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_CAPTURE_NOT_READY",
      "Only ready scheduler deployment evidence may update the register.",
    );
  }
  if (
    register?.activation?.requested !== false ||
    register?.activation?.authorized !== false ||
    register?.activation?.activatedAt !== null
  ) {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_ACTIVATION_BOUNDARY_INVALID",
      "The operational activation boundary is invalid.",
    );
  }
  if (
    register?.release?.packageState !== "PILOT_CERTIFIED" ||
    register?.release?.activatedAt !== null
  ) {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_RELEASE_STATE_INVALID",
      "Scheduler evidence requires an inactive PILOT_CERTIFIED release.",
    );
  }
  const expectedEnvironment = String(register.release.environment || "")
    .trim()
    .toLowerCase();
  if (expectedEnvironment !== capture.environment) {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_REGISTER_ENVIRONMENT_MISMATCH",
      "The captured environment does not match the operational register.",
    );
  }
  const blockers = evaluateSchedulerDeploymentEvidence(capture.evidence, {
    now,
    release: register.release,
    checks: capture.checks,
  });
  if (blockers.length > 0) {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_RELEASE_BINDING_INVALID",
      "The capture no longer matches the operational release.",
    );
  }
  assertNoExistingDeploymentDrift(
    register.scheduler,
    capture.operationalRegisterPatch,
  );
  return {
    ...register,
    scheduler: {
      ...register.scheduler,
      ...capture.operationalRegisterPatch,
    },
  };
}

function assertNoExistingDeploymentDrift(current, incoming) {
  for (const field of [
    "provider",
    "scheduleReference",
    "workloadReference",
    "authType",
    "managedCredentialReference",
    "concurrencyEvidenceReference",
    "deployedCommitSha",
    "deployedArtifactDigest",
    "deployedAt",
    "missingConfigEvidenceReference",
    "failureAlertReference",
    "deploymentSourceSystemReference",
    "deploymentAttestationReference",
    "deploymentAttestationDigest",
    "deploymentEvidenceSha256",
    "deploymentAuthorityInvalidAuthEvidenceReference",
  ]) {
    if (
      typeof current?.[field] === "string" &&
      current[field].length > 0 &&
      current[field].toLowerCase() !== String(incoming[field]).toLowerCase()
    ) {
      throw new SchedulerDeploymentEvidenceCaptureError(
        `SCHEDULER_EVIDENCE_EXISTING_${constantName(field)}_DRIFT`,
        "Existing scheduler deployment evidence conflicts with the capture.",
      );
    }
  }
  for (const field of ["intervalMinutes", "timeoutMs"]) {
    if (
      Number.isInteger(current?.[field]) &&
      current[field] !== incoming[field]
    ) {
      throw new SchedulerDeploymentEvidenceCaptureError(
        `SCHEDULER_EVIDENCE_EXISTING_${constantName(field)}_DRIFT`,
        "Existing scheduler deployment policy conflicts with the capture.",
      );
    }
  }
}

function renderMarkdown(capture) {
  const scheduler = capture.evidence.scheduler;
  const release = capture.evidence.release;
  const lines = [
    "# Stoquify Agent Scheduler Deployment Operational Evidence",
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
    `| Missing configuration returned 503 | ${
      scheduler.missingConfigHttpStatus === 503 ? "Yes" : "No"
    } |`,
    "",
    "## Frozen Release",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Package | \`${release.packageId ?? "invalid"}\` |`,
    `| Release | \`${release.releaseVersion ?? "invalid"}\` |`,
    `| Commit | \`${release.commitSha ?? "invalid"}\` |`,
    `| Artifact | \`${release.artifactDigest ?? "invalid"}\` |`,
    "| Activated | No |",
    "",
    "## Scheduler Deployment",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Provider | \`${scheduler.provider ?? "invalid"}\` |`,
    `| Auth type | \`${scheduler.authType ?? "invalid"}\` |`,
    `| Interval | ${scheduler.intervalMinutes ?? "invalid"} minutes |`,
    `| Single concurrency | ${scheduler.singleConcurrency ? "Yes" : "No"} |`,
    `| Lease safe | ${scheduler.leaseSafe ? "Yes" : "No"} |`,
    `| Timeout | ${scheduler.timeoutMs ?? "invalid"} ms |`,
    `| Deployed | ${scheduler.deployedAt ?? "invalid"} |`,
    "",
    "## Blockers",
    "",
    ...(capture.blockers.length
      ? capture.blockers.map((blocker) => `- \`${blocker}\``)
      : ["- None."]),
    "",
    "## Safety",
    "",
    "- The bearer secret, raw response, authorization header, environment snapshot, and credential values are never retained.",
    "- The capture must bind to the same inactive PILOT_CERTIFIED release already held by the operational register.",
    "- A ready capture can update scheduler deployment metadata only.",
    "- Scheduler readiness, windows, governance, approvals, owners, alerting, credential rotation, declared status, and activation remain unchanged.",
    "",
  ];
  return lines.join("\n");
}

function assertNoForbiddenKeys(value) {
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenKeys);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_PAYLOAD_KEYS.has(key)) {
      throw new SchedulerDeploymentEvidenceCaptureError(
        "SCHEDULER_EVIDENCE_FORBIDDEN_VALUE_FIELD",
        `Scheduler evidence contains forbidden value field: ${key}`,
      );
    }
    assertNoForbiddenKeys(child);
  }
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function buildInvalidCredential(secret) {
  let candidate;
  do {
    candidate = `invalid-${randomBytes(24).toString("hex")}`;
  } while (candidate === secret);
  return candidate;
}

function endpointReference(url) {
  return `${url.protocol}//${url.host}${url.pathname}`;
}

function safeEnvironment(value) {
  return typeof value === "string" &&
    ENVIRONMENT_PATTERN.test(value.toLowerCase())
    ? value.toLowerCase()
    : null;
}

function safeReference(value) {
  return typeof value === "string" &&
    REFERENCE_PATTERN.test(value) &&
    !value.includes("?") &&
    !value.includes("#")
    ? value
    : null;
}

function safeText(value) {
  return typeof value === "string" && SAFE_TEXT_PATTERN.test(value)
    ? value
    : null;
}

function safeCommit(value) {
  return typeof value === "string" && COMMIT_PATTERN.test(value)
    ? value.toLowerCase()
    : null;
}

function safeHash(value) {
  return typeof value === "string" && HASH_PATTERN.test(value)
    ? value.toLowerCase()
    : null;
}

function safeTimestamp(value) {
  const timestamp = timestampMs(value);
  return timestamp === null ? null : new Date(timestamp).toISOString();
}

function timestampMs(value) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeNow(value) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error("Scheduler evidence now value is invalid.");
  }
  return timestamp;
}

function compareBoundValue(actual, expected, code, blockers) {
  if (!sameBoundValue(actual, expected)) blockers.push(code);
}

function sameBoundValue(actual, expected) {
  if (actual === null || expected === null) return actual === expected;
  if (typeof actual !== "string" || typeof expected !== "string") {
    return actual === expected;
  }
  return actual.toLowerCase() === expected.toLowerCase();
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum);
}

function constantName(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}

function hashEvidence(value) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

async function main() {
  const options = parseArgs(process.argv);
  const registerPath = resolve(
    process.cwd(),
    options.updateRegister || options.registerPath,
  );
  if (!existsSync(registerPath)) {
    throw new SchedulerDeploymentEvidenceCaptureError(
      "SCHEDULER_EVIDENCE_REGISTER_MISSING",
      "The operational register does not exist.",
    );
  }
  const operationalRegister = JSON.parse(readFileSync(registerPath, "utf8"));
  const capture = await captureAgentSchedulerDeploymentEvidence({
    operationalRegister,
  });
  const jsonOut = resolve(process.cwd(), options.jsonOut);
  const markdownOut = resolve(process.cwd(), options.markdownOut);
  mkdirSync(dirname(jsonOut), { recursive: true });
  mkdirSync(dirname(markdownOut), { recursive: true });
  writeFileSync(jsonOut, `${JSON.stringify(capture, null, 2)}\n`, "utf8");
  writeFileSync(markdownOut, renderMarkdown(capture), "utf8");

  if (options.updateRegister) {
    const updated = applyCaptureToOperationalRegister(
      operationalRegister,
      capture,
    );
    writeFileSync(
      registerPath,
      `${JSON.stringify(updated, null, 2)}\n`,
      "utf8",
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ready: capture.ready,
        environment: capture.environment,
        invalidAuthRejected: capture.checks.invalidAuthRejected,
        missingConfigStatus: capture.evidence.scheduler.missingConfigHttpStatus,
        evidenceHash: capture.evidenceHash,
        blockerCount: capture.blockers.length,
        activationAuthorized: false,
        secretValuesPrinted: false,
        report: options.markdownOut,
      },
      null,
      2,
    )}\n`,
  );
  if (options.mode === "fail" && !capture.ready) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    const code =
      error instanceof SchedulerDeploymentEvidenceCaptureError
        ? error.code
        : "SCHEDULER_EVIDENCE_CAPTURE_FAILED";
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        code,
        activationAuthorized: false,
        secretValuesPrinted: false,
      })}\n`,
    );
    process.exitCode = 1;
  });
}

module.exports = {
  SchedulerDeploymentEvidenceCaptureError,
  applyCaptureToOperationalRegister,
  buildOperationalRegisterPatch,
  captureAgentSchedulerDeploymentEvidence,
  evaluateSchedulerDeploymentEvidence,
  parseArgs,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeEvidencePayload,
};
