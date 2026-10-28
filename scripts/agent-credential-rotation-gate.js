#!/usr/bin/env node

const { readFileSync, writeFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const { mkdirSync } = require("node:fs");

const DEFAULT_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json";
const DEFAULT_REPORT =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.md";
const COMPLETE_DISPOSITIONS = new Set([
  "ROTATED_AND_REVOKED",
  "TEST_ONLY_CONFIRMED",
  "NOT_PRESENT_CONFIRMED",
]);
const CLASSIFICATION_EVIDENCE_FIELDS = [
  "rotationOwnerDirectoryId",
  "evidenceReference",
  "securityApprovalReference",
  "reviewedAt",
];
const ROTATION_EVIDENCE_FIELDS = [
  "secretManagerReference",
  "rotationOwnerDirectoryId",
  "rotationStartedAt",
  "newVersionActivatedAt",
  "oldVersionRevokedAt",
  "dependentWorkloadsRestartedAt",
  "newVersionVerifiedAt",
  "oldVersionRejectedAt",
  "evidenceReference",
  "securityApprovalReference",
  "reviewedAt",
];
const AUTHORITY_EVIDENCE_FIELDS = [
  "environment",
  "sourceSystemReference",
  "attestationReference",
  "attestationDigest",
  "attestedAt",
  "evidenceSha256",
  "invalidAuthEvidenceReference",
];
const RELEASE_BINDING_FIELDS = [
  "environment",
  "packageId",
  "releaseVersion",
  "commitSha",
  "artifactDigest",
  "deploymentReference",
];
const FORBIDDEN_EVIDENCE_KEYS = new Set([
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

const REFERENCE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/[a-z0-9][a-z0-9._~:/-]*$/i;
const IDENTITY_REFERENCE_PATTERN =
  /^(?:directory|identity):\/\/[a-z0-9][a-z0-9._~:/-]*$/i;
const SYNTHETIC_IDENTITY_PATTERN =
  /(^|[:/._-])(e2e|test|seed|fixture|demo)($|[:/._-])/i;

const ENVIRONMENT_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,62}$/;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/i;
const COMMIT_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const MAX_AUTHORITY_AGE_MS = 24 * 60 * 60_000;

function parseArgs(argv) {
  const options = {
    mode: "report",
    registerPath: DEFAULT_REGISTER,
    reportPath: DEFAULT_REPORT,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--mode") options.mode = argv[++index];
    else if (argument === "--register") options.registerPath = argv[++index];
    else if (argument === "--out") options.reportPath = argv[++index];
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.");
  }
  return options;
}

function evaluateRotationRegister(
  register,
  { now = new Date(), expectedRelease = null } = {},
) {
  assertRegisterShape(register);
  const blockers = [];
  const nowMs = normalizeNow(now);
  const attestedAtMs = evaluateAuthority(register.authority, nowMs, blockers);
  evaluateReleaseBinding(register.releaseBinding, expectedRelease, blockers);
  const entryResults = register.entries.map((entry) => {
    const entryBlockers = [];
    if (entry.disposition === "UNRESOLVED") {
      entryBlockers.push("SECURITY_CLASSIFICATION_UNRESOLVED");
    } else if (entry.disposition === "ROTATED_AND_REVOKED") {
      requireEvidenceFields(entry, ROTATION_EVIDENCE_FIELDS, entryBlockers);
      validateEvidenceReferences(entry.rotationEvidence, entryBlockers, true);
      validateRotationOrder(entry.rotationEvidence, entryBlockers);
    } else if (COMPLETE_DISPOSITIONS.has(entry.disposition)) {
      requireEvidenceFields(
        entry,
        CLASSIFICATION_EVIDENCE_FIELDS,
        entryBlockers,
      );
      validateEvidenceReferences(entry.rotationEvidence, entryBlockers, false);
    } else {
      entryBlockers.push("DISPOSITION_INVALID");
    }
    if (COMPLETE_DISPOSITIONS.has(entry.disposition)) {
      validateEvidenceAuthorityBinding(
        entry.rotationEvidence,
        register,
        nowMs,
        attestedAtMs,
        entryBlockers,
      );
    }
    if (entryBlockers.length > 0) {
      blockers.push(...entryBlockers.map((code) => `${entry.id}:${code}`));
    }
    return {
      id: entry.id,
      disposition: entry.disposition,
      ready: entryBlockers.length === 0,
      blockers: entryBlockers,
    };
  });

  if (!nonEmpty(register.securityOwnerDirectoryId)) {
    blockers.push("register:SECURITY_OWNER_MISSING");
  } else if (!isRealIdentity(register.securityOwnerDirectoryId)) {
    blockers.push("register:SECURITY_OWNER_INVALID");
  }
  if (!nonEmpty(register.securityApprovalReference)) {
    blockers.push("register:SECURITY_APPROVAL_REFERENCE_MISSING");
  } else if (!REFERENCE_PATTERN.test(register.securityApprovalReference)) {
    blockers.push("register:SECURITY_APPROVAL_REFERENCE_INVALID");
  }
  const ready = blockers.length === 0;
  const expectedStatus = ready ? "READY" : "BLOCKED";
  if (register.declaredStatus !== expectedStatus) {
    blockers.push("register:DECLARED_STATUS_MISMATCH");
  }
  return {
    ready: ready && register.declaredStatus === expectedStatus,
    status: ready ? "READY" : "BLOCKED",
    blockerCount: blockers.length,
    blockers,
    entryResults,
    secretValuesPrinted: false,
  };
}

function assertRegisterShape(register) {
  if (!register || typeof register !== "object" || Array.isArray(register)) {
    throw new Error("Credential rotation register must be an object.");
  }
  assertNoForbiddenKeys(register);
  if (register.schemaVersion !== 1) {
    throw new Error("Credential rotation register schemaVersion must be 1.");
  }
  if (!nonEmpty(register.registerId) || !nonEmpty(register.incidentReference)) {
    throw new Error("Credential rotation register identity is incomplete.");
  }
  if (!Array.isArray(register.entries) || register.entries.length === 0) {
    throw new Error("Credential rotation register must contain entries.");
  }
  const ids = new Set();
  for (const entry of register.entries) {
    if (!nonEmpty(entry.id) || ids.has(entry.id)) {
      throw new Error(
        "Credential rotation entry IDs must be non-empty and unique.",
      );
    }
    ids.add(entry.id);
    if (!nonEmpty(entry.purpose)) {
      throw new Error(`Credential rotation purpose is missing: ${entry.id}`);
    }
    if (
      !Array.isArray(entry.environmentVariables) ||
      entry.environmentVariables.length === 0 ||
      entry.environmentVariables.some((name) => !/^[A-Z][A-Z0-9_]*$/.test(name))
    ) {
      throw new Error(`Credential environment names are invalid: ${entry.id}`);
    }
    if (
      !Array.isArray(entry.dependentWorkloads) ||
      entry.dependentWorkloads.length === 0 ||
      entry.dependentWorkloads.some((workload) => !nonEmpty(workload))
    ) {
      throw new Error(
        `Credential dependent workloads are invalid: ${entry.id}`,
      );
    }
    if (
      !entry.rotationEvidence ||
      typeof entry.rotationEvidence !== "object" ||
      Array.isArray(entry.rotationEvidence)
    ) {
      throw new Error(`Credential rotation evidence is invalid: ${entry.id}`);
    }
  }
  if (
    !register.authority ||
    typeof register.authority !== "object" ||
    Array.isArray(register.authority)
  ) {
    throw new Error("Credential evidence authority is invalid.");
  }
  if (
    !register.releaseBinding ||
    typeof register.releaseBinding !== "object" ||
    Array.isArray(register.releaseBinding)
  ) {
    throw new Error("Credential release binding is invalid.");
  }
}

function assertNoForbiddenKeys(value) {
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenKeys);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_EVIDENCE_KEYS.has(key)) {
      throw new Error(
        `Credential register contains forbidden value field: ${key}`,
      );
    }
    assertNoForbiddenKeys(child);
  }
}

function requireEvidenceFields(entry, fields, blockers) {
  for (const field of fields) {
    if (!nonEmpty(entry.rotationEvidence[field])) {
      blockers.push(`EVIDENCE_${field.toUpperCase()}_MISSING`);
    }
  }
}

function validateRotationOrder(evidence, blockers) {
  const orderedFields = [
    "rotationStartedAt",
    "newVersionActivatedAt",
    "dependentWorkloadsRestartedAt",
    "newVersionVerifiedAt",
    "oldVersionRevokedAt",
    "oldVersionRejectedAt",
    "reviewedAt",
  ];
  const timestamps = orderedFields.map((field) =>
    parseTimestamp(evidence[field]),
  );
  if (timestamps.some((timestamp) => timestamp === null)) {
    blockers.push("EVIDENCE_TIMESTAMP_INVALID");
    return;
  }
  for (let index = 1; index < timestamps.length; index += 1) {
    if (timestamps[index] < timestamps[index - 1]) {
      blockers.push("EVIDENCE_TIMESTAMP_ORDER_INVALID");
      return;
    }
  }
}

function evaluateAuthority(authority, nowMs, blockers) {
  for (const field of AUTHORITY_EVIDENCE_FIELDS) {
    if (!nonEmpty(authority[field])) {
      blockers.push(`authority:${constantName(field)}_MISSING`);
    }
  }
  if (
    nonEmpty(authority.environment) &&
    !ENVIRONMENT_PATTERN.test(authority.environment)
  ) {
    blockers.push("authority:ENVIRONMENT_INVALID");
  }
  for (const field of [
    "sourceSystemReference",
    "attestationReference",
    "invalidAuthEvidenceReference",
  ]) {
    if (
      nonEmpty(authority[field]) &&
      !REFERENCE_PATTERN.test(authority[field])
    ) {
      blockers.push(`authority:${constantName(field)}_INVALID`);
    }
  }
  for (const field of ["attestationDigest", "evidenceSha256"]) {
    if (nonEmpty(authority[field]) && !HASH_PATTERN.test(authority[field])) {
      blockers.push(`authority:${constantName(field)}_INVALID`);
    }
  }
  const attestedAtMs = parseTimestamp(authority.attestedAt);
  if (
    attestedAtMs === null ||
    attestedAtMs > nowMs ||
    nowMs - attestedAtMs > MAX_AUTHORITY_AGE_MS
  ) {
    blockers.push("authority:ATTESTED_AT_INVALID_OR_STALE");
  }
  return attestedAtMs;
}

function evaluateReleaseBinding(binding, expectedRelease, blockers) {
  for (const field of RELEASE_BINDING_FIELDS) {
    if (!nonEmpty(binding[field])) {
      blockers.push(`releaseBinding:${constantName(field)}_MISSING`);
    }
  }
  if (
    nonEmpty(binding.environment) &&
    !ENVIRONMENT_PATTERN.test(binding.environment)
  ) {
    blockers.push("releaseBinding:ENVIRONMENT_INVALID");
  }
  if (nonEmpty(binding.commitSha) && !COMMIT_PATTERN.test(binding.commitSha)) {
    blockers.push("releaseBinding:COMMIT_SHA_INVALID");
  }
  if (
    nonEmpty(binding.artifactDigest) &&
    !HASH_PATTERN.test(binding.artifactDigest)
  ) {
    blockers.push("releaseBinding:ARTIFACT_DIGEST_INVALID");
  }
  if (
    nonEmpty(binding.deploymentReference) &&
    !REFERENCE_PATTERN.test(binding.deploymentReference)
  ) {
    blockers.push("releaseBinding:DEPLOYMENT_REFERENCE_INVALID");
  }
  if (binding.packageState !== "PILOT_CERTIFIED") {
    blockers.push("releaseBinding:PACKAGE_NOT_PILOT_CERTIFIED");
  }
  if (binding.activatedAt !== null) {
    blockers.push("releaseBinding:ACTIVATED_AT_MUST_REMAIN_NULL");
  }
  if (!expectedRelease) return;
  for (const [field, code] of [
    ["environment", "releaseBinding:ENVIRONMENT_MISMATCH"],
    ["packageId", "releaseBinding:PACKAGE_ID_MISMATCH"],
    ["releaseVersion", "releaseBinding:RELEASE_VERSION_MISMATCH"],
    ["packageState", "releaseBinding:PACKAGE_STATE_MISMATCH"],
    ["commitSha", "releaseBinding:COMMIT_SHA_MISMATCH"],
    ["artifactDigest", "releaseBinding:ARTIFACT_DIGEST_MISMATCH"],
    ["deploymentReference", "releaseBinding:DEPLOYMENT_REFERENCE_MISMATCH"],
    ["activatedAt", "releaseBinding:ACTIVATED_AT_MISMATCH"],
  ]) {
    if (!sameBoundValue(binding[field], expectedRelease[field])) {
      blockers.push(code);
    }
  }
}

function validateEvidenceAuthorityBinding(
  evidence,
  register,
  nowMs,
  attestedAtMs,
  blockers,
) {
  if (
    nonEmpty(evidence.rotationOwnerDirectoryId) &&
    evidence.rotationOwnerDirectoryId !== register.securityOwnerDirectoryId
  ) {
    blockers.push("EVIDENCE_ROTATION_OWNER_MISMATCH");
  }
  if (
    nonEmpty(evidence.securityApprovalReference) &&
    evidence.securityApprovalReference !== register.securityApprovalReference
  ) {
    blockers.push("EVIDENCE_SECURITY_APPROVAL_MISMATCH");
  }
  const reviewedAtMs = parseTimestamp(evidence.reviewedAt);
  if (reviewedAtMs === null || reviewedAtMs > nowMs) {
    blockers.push("EVIDENCE_REVIEWED_AT_INVALID_OR_FUTURE");
  } else if (attestedAtMs !== null && reviewedAtMs > attestedAtMs) {
    blockers.push("EVIDENCE_REVIEW_AFTER_AUTHORITY_ATTESTATION");
  }
}

function validateEvidenceReferences(evidence, blockers, requireSecretManager) {
  if (
    nonEmpty(evidence.rotationOwnerDirectoryId) &&
    !isRealIdentity(evidence.rotationOwnerDirectoryId)
  ) {
    blockers.push("EVIDENCE_ROTATIONOWNERDIRECTORYID_INVALID");
  }
  for (const field of [
    "evidenceReference",
    "securityApprovalReference",
    ...(requireSecretManager ? ["secretManagerReference"] : []),
  ]) {
    if (nonEmpty(evidence[field]) && !REFERENCE_PATTERN.test(evidence[field])) {
      blockers.push(`EVIDENCE_${field.toUpperCase()}_INVALID`);
    }
  }
}

function isRealIdentity(value) {
  return (
    IDENTITY_REFERENCE_PATTERN.test(value) &&
    !SYNTHETIC_IDENTITY_PATTERN.test(value)
  );
}

function parseTimestamp(value) {
  if (!nonEmpty(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeNow(value) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error("Credential gate now value is invalid.");
  }
  return timestamp;
}

function sameBoundValue(actual, expected) {
  if (actual === null || expected === null) return actual === expected;
  if (typeof actual !== "string" || typeof expected !== "string") {
    return actual === expected;
  }
  return actual.toLowerCase() === expected.toLowerCase();
}

function constantName(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function renderMarkdown(register, result) {
  const lines = [
    "# Stoquify Agent Runtime Credential Rotation Register",
    "",
    `**Register:** \`${register.registerId}\`  `,
    `**Incident scope:** \`${register.incidentReference}\`  `,
    `**Gate status:** \`${result.status}\`  `,
    `**Current blockers:** ${result.blockerCount}  `,
    `**Credential classes:** ${register.entries.length}  `,
    `**Secret values printed or retained:** No`,
    "",
    `**Authority source:** \`${
      register.authority.sourceSystemReference || "unresolved"
    }\`  `,
    `**Authority attested:** ${
      register.authority.attestedAt || "unresolved"
    }  `,
    `**Release binding:** \`${
      register.releaseBinding.releaseVersion || "unresolved"
    }\` / \`${register.releaseBinding.artifactDigest || "unresolved"}\``,
    "",
    "This register records credential classes and evidence references only. It must never contain a credential value, token, password, authorization header, database URL, or environment snapshot.",
    "",
    "| Credential class | Purpose | Environment names | Dependent workloads | Disposition | Gate |",
    "|---|---|---|---|---|---|",
  ];
  for (const entry of register.entries) {
    const entryResult = result.entryResults.find(
      (candidate) => candidate.id === entry.id,
    );
    lines.push(
      `| \`${entry.id}\` | ${escapeCell(entry.purpose)} | ${entry.environmentVariables
        .map((name) => `\`${name}\``)
        .join("<br>")} | ${entry.dependentWorkloads
        .map(escapeCell)
        .join("<br>")} | \`${entry.disposition}\` | ${
        entryResult.ready ? "Ready" : "Blocked"
      } |`,
    );
  }
  lines.push(
    "",
    "## Required Evidence Per Rotated Credential",
    "",
    "- Secret-manager reference",
    "- Rotation owner directory identity",
    "- Rotation start timestamp",
    "- New-version activation timestamp",
    "- Dependent workload restart timestamp",
    "- New-version verification timestamp",
    "- Old-version revocation timestamp",
    "- Old-version rejection timestamp",
    "- Evidence reference",
    "- Security approval reference",
    "- Security review timestamp",
    "",
    "A `TEST_ONLY_CONFIRMED` or `NOT_PRESENT_CONFIRMED` disposition still requires a real security owner, review timestamp, evidence reference, and security approval reference.",
    "",
    "## Current Blockers",
    "",
  );
  if (result.blockers.length === 0) lines.push("- None.");
  else result.blockers.forEach((blocker) => lines.push(`- \`${blocker}\``));
  lines.push(
    "",
    "## Decision",
    "",
    result.ready
      ? "All listed credential classes have complete, value-free security evidence."
      : "Credential response remains blocked. This document is a completion register, not rotation or revocation evidence.",
    "",
  );
  return lines.join("\n");
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function main() {
  const options = parseArgs(process.argv);
  const registerPath = resolve(process.cwd(), options.registerPath);
  const reportPath = resolve(process.cwd(), options.reportPath);
  const register = JSON.parse(readFileSync(registerPath, "utf8"));
  const result = evaluateRotationRegister(register);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, renderMarkdown(register, result), "utf8");
  console.log(
    JSON.stringify(
      {
        status: result.status,
        entries: register.entries.length,
        blockers: result.blockerCount,
        secretValuesPrinted: false,
        report: options.reportPath,
      },
      null,
      2,
    ),
  );
  if (options.mode === "fail" && !result.ready) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  evaluateRotationRegister,
  renderMarkdown,
};
