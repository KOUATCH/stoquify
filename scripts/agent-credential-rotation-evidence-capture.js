#!/usr/bin/env node

const { createHash, randomBytes } = require("node:crypto");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { dirname, resolve } = require("node:path");
const {
  evaluateRotationRegister,
} = require("./agent-credential-rotation-gate");

const DEFAULT_JSON_OUT =
  "what-next/agents-runtime/agent-credential-rotation-operational-evidence.json";
const DEFAULT_MD_OUT =
  "what-next/agents-runtime/agent-credential-rotation-operational-evidence.md";
const DEFAULT_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json";
const DEFAULT_OPERATIONAL_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json";
const COMPLETE_DISPOSITIONS = new Set([
  "ROTATED_AND_REVOKED",
  "TEST_ONLY_CONFIRMED",
  "NOT_PRESENT_CONFIRMED",
]);
const ENVIRONMENT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,62}$/;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/i;
const COMMIT_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const REFERENCE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/[a-z0-9][a-z0-9._~:/-]*$/i;
const IDENTITY_REFERENCE_PATTERN =
  /^(?:directory|identity):\/\/[a-z0-9][a-z0-9._~:/-]*$/i;
const SYNTHETIC_IDENTITY_PATTERN =
  /(^|[:/._-])(e2e|test|seed|fixture|demo)($|[:/._-])/i;
const SAFE_TEXT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/ -]{0,199}$/;
const MAX_RESPONSE_BYTES = 250_000;
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

class CredentialRotationEvidenceCaptureError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CredentialRotationEvidenceCaptureError";
    this.code = code;
  }
}

function parseArgs(argv) {
  const options = {
    mode: "report",
    jsonOut: DEFAULT_JSON_OUT,
    markdownOut: DEFAULT_MD_OUT,
    registerPath: DEFAULT_REGISTER,
    operationalRegisterPath: DEFAULT_OPERATIONAL_REGISTER,
    updateRegister: null,
    updateOperationalRegister: null,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--mode") options.mode = argv[++index];
    else if (argument === "--out") options.jsonOut = argv[++index];
    else if (argument === "--md-out") options.markdownOut = argv[++index];
    else if (argument === "--register") options.registerPath = argv[++index];
    else if (argument === "--operational-register") {
      options.operationalRegisterPath = argv[++index];
    } else if (argument === "--update-register") {
      options.updateRegister = argv[++index] || DEFAULT_REGISTER;
    } else if (argument === "--update-operational-register") {
      options.updateOperationalRegister =
        argv[++index] || DEFAULT_OPERATIONAL_REGISTER;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.");
  }
  if (
    Boolean(options.updateRegister) !==
    Boolean(options.updateOperationalRegister)
  ) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_APPLY_PATHS_INCOMPLETE",
      "Credential and operational registers must be updated together.",
    );
  }
  return options;
}

function resolveCaptureConfig(environment = process.env) {
  const rawUrl = String(
    environment.STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_URL || "",
  ).trim();
  const secret = String(
    environment.STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_SECRET || "",
  ).trim();
  const releaseEnvironment = String(
    environment.STOQUIFY_AGENT_RELEASE_ENVIRONMENT || "",
  )
    .trim()
    .toLowerCase();

  if (!rawUrl) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_URL_MISSING",
      "The credential evidence URL is required.",
    );
  }
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_URL_INVALID",
      "The credential evidence URL is invalid.",
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
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_HTTPS_REQUIRED",
      "The credential evidence endpoint must be query-free HTTPS outside local development.",
    );
  }
  if (secret.length < 32) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_SECRET_INVALID",
      "The credential evidence secret must contain at least 32 characters.",
    );
  }
  if (!ENVIRONMENT_PATTERN.test(releaseEnvironment)) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_ENVIRONMENT_INVALID",
      "The release environment is invalid.",
    );
  }
  return {
    url,
    secret,
    releaseEnvironment,
    timeoutMs: boundedInteger(
      environment.STOQUIFY_AGENT_CREDENTIAL_EVIDENCE_TIMEOUT_MS,
      20_000,
      5_000,
      60_000,
    ),
  };
}

async function captureAgentCredentialRotationEvidence(input = {}) {
  const credentialRegister = input.credentialRegister;
  const operationalRegister = input.operationalRegister;
  if (!credentialRegister || !operationalRegister) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_LOCAL_REGISTERS_REQUIRED",
      "Both local evidence registers are required for release-bound capture.",
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
    registerMatched:
      evidence.registerId === credentialRegister.registerId &&
      evidence.incidentReference === credentialRegister.incidentReference,
  };
  const evidenceHash = hashEvidence({
    schemaVersion: 1,
    capturedAt,
    endpointReference: endpointReference(config.url),
    environment: config.releaseEnvironment,
    checks,
    evidence,
  });
  const candidateRegister = buildCredentialRegister(
    credentialRegister,
    evidence,
    evidenceHash,
  );
  const blockers = evaluateCapture({
    evidence,
    checks,
    credentialRegister,
    operationalRegister,
    candidateRegister,
    now,
  });
  const ready =
    checks.invalidAuthRejected &&
    evidenceResponse.status === 200 &&
    evidence.sourceReady === true &&
    blockers.length === 0;

  return {
    schemaVersion: 1,
    capturedAt,
    endpointReference: endpointReference(config.url),
    environment: config.releaseEnvironment,
    checks,
    evidence,
    evidenceHash,
    credentialRegisterCandidate: candidateRegister,
    blockers,
    ready,
    rawResponseRetained: false,
    authorizationHeadersRetained: false,
    secretValuesPrinted: false,
    activationAuthorized: false,
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
        "user-agent": "stoquify-agent-credential-evidence/1",
      },
      signal: controller.signal,
    });
    return {
      status: response.status,
      payload: await boundedJson(response),
    };
  } catch (error) {
    if (error instanceof CredentialRotationEvidenceCaptureError) throw error;
    throw new CredentialRotationEvidenceCaptureError(
      error?.name === "AbortError"
        ? "CREDENTIAL_EVIDENCE_CAPTURE_TIMEOUT"
        : "CREDENTIAL_EVIDENCE_CAPTURE_UNAVAILABLE",
      "The credential evidence probe could not be completed.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function boundedJson(response) {
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_RESPONSE_TOO_LARGE",
      "The credential evidence response exceeded the evidence limit.",
    );
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_RESPONSE_INVALID",
      "The credential evidence response was not valid JSON.",
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
    registerId: safeText(data.registerId),
    incidentReference: safeText(data.incidentReference),
    sourceSystemReference: safeReference(data.sourceSystemReference),
    attestationReference: safeReference(data.attestationReference),
    attestationDigest: safeHash(data.attestationDigest),
    attestedAt: safeTimestamp(data.attestedAt),
    securityOwnerDirectoryId: safeIdentity(data.securityOwnerDirectoryId),
    securityApprovalReference: safeReference(data.securityApprovalReference),
    release: sanitizeRelease(data.release),
    entries: sanitizeEntries(data.entries),
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

function sanitizeEntries(value) {
  if (!Array.isArray(value) || value.length > 100) return [];
  return value.map((entry) => {
    const candidate = objectValue(entry);
    return {
      id: safeText(candidate.id),
      disposition: COMPLETE_DISPOSITIONS.has(candidate.disposition)
        ? candidate.disposition
        : null,
      rotationEvidence: sanitizeRotationEvidence(candidate.rotationEvidence),
    };
  });
}

function sanitizeRotationEvidence(value) {
  const candidate = objectValue(value);
  return {
    secretManagerReference: safeReference(candidate.secretManagerReference),
    rotationOwnerDirectoryId: safeIdentity(candidate.rotationOwnerDirectoryId),
    rotationStartedAt: safeTimestamp(candidate.rotationStartedAt),
    newVersionActivatedAt: safeTimestamp(candidate.newVersionActivatedAt),
    oldVersionRevokedAt: safeTimestamp(candidate.oldVersionRevokedAt),
    dependentWorkloadsRestartedAt: safeTimestamp(
      candidate.dependentWorkloadsRestartedAt,
    ),
    newVersionVerifiedAt: safeTimestamp(candidate.newVersionVerifiedAt),
    oldVersionRejectedAt: safeTimestamp(candidate.oldVersionRejectedAt),
    evidenceReference: safeReference(candidate.evidenceReference),
    securityApprovalReference: safeReference(
      candidate.securityApprovalReference,
    ),
    reviewedAt: safeTimestamp(candidate.reviewedAt),
  };
}

function evaluateCapture(input) {
  const blockers = [];
  if (input.evidence.sourceReady !== true) {
    blockers.push("CREDENTIAL_EVIDENCE_SOURCE_NOT_READY");
  }
  if (!input.checks.invalidAuthRejected) {
    blockers.push("CREDENTIAL_EVIDENCE_INVALID_AUTH_NOT_REJECTED");
  }
  if (input.checks.evidenceHttpStatus !== 200) {
    blockers.push("CREDENTIAL_EVIDENCE_HTTP_STATUS_INVALID");
  }
  if (!input.checks.environmentMatched) {
    blockers.push("CREDENTIAL_EVIDENCE_ENVIRONMENT_MISMATCH");
  }
  if (!input.checks.registerMatched) {
    blockers.push("CREDENTIAL_EVIDENCE_REGISTER_IDENTITY_MISMATCH");
  }
  evaluateEntrySet(
    input.credentialRegister.entries,
    input.evidence.entries,
    blockers,
  );
  const result = evaluateRotationRegister(input.candidateRegister, {
    now: input.now,
    expectedRelease: input.operationalRegister.release,
  });
  blockers.push(
    ...result.blockers.map((blocker) => `credentialRegister:${blocker}`),
  );
  return [...new Set(blockers)];
}

function evaluateEntrySet(expectedEntries, capturedEntries, blockers) {
  const expected = new Set(expectedEntries.map((entry) => entry.id));
  const capturedIds = capturedEntries.map((entry) => entry.id);
  const captured = new Set(capturedIds);
  if (capturedIds.some((id) => !id)) {
    blockers.push("CREDENTIAL_EVIDENCE_ENTRY_ID_INVALID");
  }
  if (captured.size !== capturedIds.length) {
    blockers.push("CREDENTIAL_EVIDENCE_ENTRY_ID_DUPLICATE");
  }
  for (const id of expected) {
    if (!captured.has(id)) {
      blockers.push(`CREDENTIAL_EVIDENCE_ENTRY_MISSING:${id}`);
    }
  }
  for (const id of captured) {
    if (id && !expected.has(id)) {
      blockers.push(`CREDENTIAL_EVIDENCE_ENTRY_UNEXPECTED:${id}`);
    }
  }
}

function buildCredentialRegister(base, evidence, evidenceHash) {
  const capturedById = new Map(
    evidence.entries.map((entry) => [entry.id, entry]),
  );
  return {
    ...base,
    declaredStatus: "READY",
    securityOwnerDirectoryId: evidence.securityOwnerDirectoryId,
    securityApprovalReference: evidence.securityApprovalReference,
    authority: {
      environment: evidence.environment
        ? evidence.environment.toUpperCase()
        : null,
      sourceSystemReference: evidence.sourceSystemReference,
      attestationReference: evidence.attestationReference,
      attestationDigest: evidence.attestationDigest,
      attestedAt: evidence.attestedAt,
      evidenceSha256: evidenceHash,
      invalidAuthEvidenceReference: evidenceHash
        ? `evidence://agent-credential-rotation/${evidenceHash.replace(
            "sha256:",
            "",
          )}/invalid-auth-401`
        : null,
    },
    releaseBinding: {
      environment: evidence.environment
        ? evidence.environment.toUpperCase()
        : null,
      packageId: evidence.release.packageId,
      releaseVersion: evidence.release.releaseVersion,
      packageState: evidence.release.packageState,
      commitSha: evidence.release.commitSha,
      artifactDigest: evidence.release.artifactDigest,
      deploymentReference: evidence.release.deploymentReference,
      activatedAt: null,
    },
    entries: base.entries.map((entry) => {
      const captured = capturedById.get(entry.id);
      return {
        ...entry,
        disposition: captured?.disposition || "UNRESOLVED",
        rotationEvidence: captured?.rotationEvidence || {},
      };
    }),
  };
}

function applyCaptureToRegisters(input) {
  const {
    credentialRegister,
    operationalRegister,
    capture,
    registerReference,
  } = input;
  if (!capture?.ready || !HASH_PATTERN.test(capture.evidenceHash || "")) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_CAPTURE_NOT_READY",
      "Only ready credential evidence may update the registers.",
    );
  }
  if (
    operationalRegister?.activation?.requested !== false ||
    operationalRegister?.activation?.authorized !== false ||
    operationalRegister?.activation?.activatedAt !== null
  ) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_ACTIVATION_BOUNDARY_INVALID",
      "The operational activation boundary is invalid.",
    );
  }
  if (
    operationalRegister?.release?.packageState !== "PILOT_CERTIFIED" ||
    operationalRegister?.release?.activatedAt !== null
  ) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_RELEASE_STATE_INVALID",
      "Credential evidence requires an inactive PILOT_CERTIFIED release.",
    );
  }
  if (
    credentialRegister.registerId !== capture.evidence.registerId ||
    credentialRegister.incidentReference !== capture.evidence.incidentReference
  ) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_REGISTER_IDENTITY_DRIFT",
      "The captured register identity conflicts with the local register.",
    );
  }
  const updatedCredentialRegister = buildCredentialRegister(
    credentialRegister,
    capture.evidence,
    capture.evidenceHash,
  );
  assertNoCompletedEvidenceDrift(credentialRegister, updatedCredentialRegister);
  const result = evaluateRotationRegister(updatedCredentialRegister, {
    now: input.now || new Date(),
    expectedRelease: operationalRegister.release,
  });
  if (!result.ready) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_UPDATED_REGISTER_BLOCKED",
      "The updated credential register did not pass its gate.",
    );
  }
  const credentialRegisterText = `${JSON.stringify(
    updatedCredentialRegister,
    null,
    2,
  )}\n`;
  const credentialRegisterSha256 = hashBuffer(
    Buffer.from(credentialRegisterText, "utf8"),
  );
  const currentReference =
    operationalRegister?.credentialRotation?.registerReference;
  if (
    currentReference &&
    registerReference &&
    currentReference !== registerReference
  ) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_REGISTER_REFERENCE_DRIFT",
      "The operational credential register reference has drifted.",
    );
  }
  const updatedOperationalRegister = {
    ...operationalRegister,
    credentialRotation: {
      ...operationalRegister.credentialRotation,
      registerReference: currentReference || registerReference,
      registerSha256: credentialRegisterSha256,
      securityApprovalReference:
        updatedCredentialRegister.securityApprovalReference,
      evidenceSha256: capture.evidenceHash,
      attestationReference:
        updatedCredentialRegister.authority.attestationReference,
    },
  };
  return {
    credentialRegister: updatedCredentialRegister,
    credentialRegisterText,
    credentialRegisterSha256,
    operationalRegister: updatedOperationalRegister,
  };
}

function assertNoCompletedEvidenceDrift(current, incoming) {
  if (
    current.declaredStatus === "READY" &&
    current.authority?.evidenceSha256 &&
    current.authority.evidenceSha256 !== incoming.authority.evidenceSha256
  ) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_COMPLETED_REGISTER_DRIFT",
      "A completed credential register cannot be silently replaced.",
    );
  }
  const incomingById = new Map(
    incoming.entries.map((entry) => [entry.id, entry]),
  );
  for (const entry of current.entries) {
    if (entry.disposition === "UNRESOLVED") continue;
    const candidate = incomingById.get(entry.id);
    if (
      !candidate ||
      JSON.stringify({
        disposition: entry.disposition,
        rotationEvidence: entry.rotationEvidence,
      }) !==
        JSON.stringify({
          disposition: candidate.disposition,
          rotationEvidence: candidate.rotationEvidence,
        })
    ) {
      throw new CredentialRotationEvidenceCaptureError(
        `CREDENTIAL_EVIDENCE_EXISTING_${constantName(entry.id)}_DRIFT`,
        "Existing credential evidence conflicts with the authority response.",
      );
    }
  }
}

function renderMarkdown(capture) {
  const lines = [
    "# Stoquify Agent Credential Rotation Operational Evidence",
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
    `| Register and incident matched | ${
      capture.checks.registerMatched ? "Yes" : "No"
    } |`,
    `| Credential classes supplied | ${capture.evidence.entries.length} |`,
    `| Authority attested | ${capture.evidence.attestedAt ?? "Invalid"} |`,
    "",
    "## Release Binding",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Package | \`${capture.evidence.release.packageId ?? "invalid"}\` |`,
    `| Release | \`${capture.evidence.release.releaseVersion ?? "invalid"}\` |`,
    `| Commit | \`${capture.evidence.release.commitSha ?? "invalid"}\` |`,
    `| Artifact | \`${
      capture.evidence.release.artifactDigest ?? "invalid"
    }\` |`,
    "| Activated | No |",
    "",
    "## Credential Classes",
    "",
    "| Credential class | Disposition | Gate |",
    "|---|---|---|",
    ...capture.credentialRegisterCandidate.entries.map((entry) => {
      const blocked = capture.blockers.some((blocker) =>
        blocker.includes(entry.id),
      );
      return `| \`${entry.id}\` | \`${entry.disposition}\` | ${
        blocked ? "Blocked" : "Complete"
      } |`;
    }),
    "",
    "## Blockers",
    "",
    ...(capture.blockers.length
      ? capture.blockers.map((blocker) => `- \`${blocker}\``)
      : ["- None."]),
    "",
    "## Safety",
    "",
    "- Credential values, authorization headers, raw environments, and raw HTTP bodies are never retained.",
    "- The collector records secret-manager and immutable evidence references only.",
    "- Every configured credential class must appear exactly once.",
    "- Evidence must bind to the same inactive PILOT_CERTIFIED release held by the operational register.",
    "- Applying a ready capture can update only the credential register and the operational credential-rotation binding.",
    "- Release status, governance, scheduler, alerting, declared operational status, and activation remain unchanged.",
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
      throw new CredentialRotationEvidenceCaptureError(
        "CREDENTIAL_EVIDENCE_FORBIDDEN_VALUE_FIELD",
        `Credential evidence contains forbidden value field: ${key}`,
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

function safeIdentity(value) {
  return typeof value === "string" &&
    IDENTITY_REFERENCE_PATTERN.test(value) &&
    !SYNTHETIC_IDENTITY_PATTERN.test(value)
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
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum);
}

function constantName(value) {
  return String(value)
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

function hashEvidence(value) {
  return hashBuffer(Buffer.from(JSON.stringify(value), "utf8"));
}

function hashBuffer(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

async function main() {
  const options = parseArgs(process.argv);
  const credentialPath = resolve(
    process.cwd(),
    options.updateRegister || options.registerPath,
  );
  const operationalPath = resolve(
    process.cwd(),
    options.updateOperationalRegister || options.operationalRegisterPath,
  );
  if (!existsSync(credentialPath) || !existsSync(operationalPath)) {
    throw new CredentialRotationEvidenceCaptureError(
      "CREDENTIAL_EVIDENCE_REGISTER_MISSING",
      "The credential or operational evidence register is missing.",
    );
  }
  const credentialRegister = JSON.parse(readFileSync(credentialPath, "utf8"));
  const operationalRegister = JSON.parse(readFileSync(operationalPath, "utf8"));
  const capture = await captureAgentCredentialRotationEvidence({
    credentialRegister,
    operationalRegister,
  });
  const jsonOut = resolve(process.cwd(), options.jsonOut);
  const markdownOut = resolve(process.cwd(), options.markdownOut);
  mkdirSync(dirname(jsonOut), { recursive: true });
  mkdirSync(dirname(markdownOut), { recursive: true });
  writeFileSync(jsonOut, `${JSON.stringify(capture, null, 2)}\n`, "utf8");
  writeFileSync(markdownOut, renderMarkdown(capture), "utf8");

  let registerSha256 = null;
  if (options.updateRegister) {
    const applied = applyCaptureToRegisters({
      credentialRegister,
      operationalRegister,
      capture,
      registerReference: options.updateRegister.replaceAll("\\", "/"),
    });
    writeFileSync(credentialPath, applied.credentialRegisterText, "utf8");
    writeFileSync(
      operationalPath,
      `${JSON.stringify(applied.operationalRegister, null, 2)}\n`,
      "utf8",
    );
    registerSha256 = applied.credentialRegisterSha256;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ready: capture.ready,
        environment: capture.environment,
        invalidAuthRejected: capture.checks.invalidAuthRejected,
        credentialClasses: capture.evidence.entries.length,
        evidenceHash: capture.evidenceHash,
        registerSha256,
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
      error instanceof CredentialRotationEvidenceCaptureError
        ? error.code
        : "CREDENTIAL_EVIDENCE_CAPTURE_FAILED";
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
  CredentialRotationEvidenceCaptureError,
  applyCaptureToRegisters,
  buildCredentialRegister,
  captureAgentCredentialRotationEvidence,
  evaluateCapture,
  parseArgs,
  renderMarkdown,
  resolveCaptureConfig,
  sanitizeEvidencePayload,
};
