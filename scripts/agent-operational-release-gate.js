#!/usr/bin/env node

const { createHash } = require("node:crypto");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const {
  evaluateRotationRegister,
} = require("./agent-credential-rotation-gate");

const DEFAULT_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json";
const DEFAULT_REPORT =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.md";
const DEFAULT_CREDENTIAL_REGISTER =
  "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json";
const READY_STATUS = "READY_FOR_INDEPENDENT_REVIEW";
const REQUIRED_OWNER_ROLES = [
  "ROLLOUT",
  "ROLLBACK",
  "SUPPORT",
  "PILOT",
  "SECURITY_INCIDENT",
  "ON_CALL_BACKUP",
];
const FORBIDDEN_VALUE_KEYS = new Set([
  "secretValue",
  "credentialValue",
  "passwordValue",
  "tokenValue",
  "authorizationHeader",
  "databaseUrl",
  "connectionString",
  "rawEnvironment",
  "environmentSnapshot",
  "requestBody",
  "responseBody",
]);
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/i;
const COMMIT_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const REFERENCE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/[a-z0-9][a-z0-9._~:/-]*$/i;
const IDENTITY_REFERENCE_PATTERN =
  /^(?:directory|identity):\/\/[a-z0-9][a-z0-9._~:/-]*$/i;
const SYNTHETIC_IDENTITY_PATTERN =
  /(^|[:/._-])(e2e|test|seed|fixture|demo)($|[:/._-])/i;
const SCHEDULER_DEPLOYMENT_EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function parseArgs(argv) {
  const options = {
    mode: "report",
    registerPath: DEFAULT_REGISTER,
    reportPath: DEFAULT_REPORT,
    credentialRegisterPath: DEFAULT_CREDENTIAL_REGISTER,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--mode") options.mode = argv[++index];
    else if (argument === "--register") options.registerPath = argv[++index];
    else if (argument === "--out") options.reportPath = argv[++index];
    else if (argument === "--credential-register") {
      options.credentialRegisterPath = argv[++index];
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.");
  }
  return options;
}

function evaluateOperationalReleaseRegister(
  register,
  {
    now = new Date(),
    credentialRegister = null,
    credentialRegisterSha256 = null,
  } = {},
) {
  assertRegisterShape(register);
  const blockers = [];
  const nowMs = normalizeNow(now);

  evaluateReleaseIdentity(register.release, blockers);
  evaluateCiEvidence(register.release, register.ci, nowMs, blockers);
  evaluateGovernance(register.release, register.governance, nowMs, blockers);
  evaluateApprovals(register.release, register.approvals, nowMs, blockers);
  const owners = evaluateOwners(register.owners, nowMs, blockers);
  evaluateScheduler(register.release, register.scheduler, nowMs, blockers);
  evaluateAlerting(register.alerting, owners, nowMs, blockers);
  const credentialResult = evaluateCredentialBinding(
    register.release,
    register.credentialRotation,
    credentialRegister,
    credentialRegisterSha256,
    nowMs,
    blockers,
  );
  evaluateActivationBoundary(register.activation, blockers);

  const evidenceReady = blockers.length === 0;
  const expectedStatus = evidenceReady ? READY_STATUS : "BLOCKED";
  if (register.declaredStatus !== expectedStatus) {
    blockers.push("register:DECLARED_STATUS_MISMATCH");
  }
  const ready = evidenceReady && register.declaredStatus === READY_STATUS;

  return {
    ready,
    status: evidenceReady ? READY_STATUS : "BLOCKED",
    blockerCount: blockers.length,
    blockers,
    activationAuthorized: false,
    secretValuesPrinted: false,
    credentialRotationStatus: credentialResult?.status ?? "UNAVAILABLE",
    ownerRolesPresent: owners.size,
    successfulSchedulerWindows: register.scheduler.windows.filter(
      (window) => window.status === "COMPLETED",
    ).length,
  };
}

function assertRegisterShape(register) {
  if (!register || typeof register !== "object" || Array.isArray(register)) {
    throw new Error("Operational release evidence register must be an object.");
  }
  assertNoForbiddenKeys(register);
  if (register.schemaVersion !== 1) {
    throw new Error("Operational release evidence schemaVersion must be 1.");
  }
  if (!nonEmpty(register.registerId)) {
    throw new Error("Operational release evidence registerId is required.");
  }
  for (const field of [
    "release",
    "ci",
    "governance",
    "approvals",
    "scheduler",
    "alerting",
    "credentialRotation",
    "activation",
  ]) {
    const value = register[field];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(
        `Operational release evidence ${field} must be an object.`,
      );
    }
  }
  if (!Array.isArray(register.owners)) {
    throw new Error("Operational release owners must be an array.");
  }
  if (!Array.isArray(register.scheduler.windows)) {
    throw new Error("Operational release scheduler windows must be an array.");
  }
}

function assertNoForbiddenKeys(value) {
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenKeys);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_VALUE_KEYS.has(key)) {
      throw new Error(
        `Operational release register contains forbidden value field: ${key}`,
      );
    }
    assertNoForbiddenKeys(child);
  }
}

function evaluateReleaseIdentity(release, blockers) {
  requireText(release.environment, "release:ENVIRONMENT_MISSING", blockers);
  if (
    nonEmpty(release.environment) &&
    release.environment !== "INTERNAL_PILOT"
  ) {
    blockers.push("release:ENVIRONMENT_MUST_BE_INTERNAL_PILOT");
  }
  for (const [field, code] of [
    ["packageId", "PACKAGE_ID_MISSING"],
    ["releaseVersion", "RELEASE_VERSION_MISSING"],
  ]) {
    requireText(release[field], `release:${code}`, blockers);
  }
  for (const [field, code] of [
    ["deploymentReference", "DEPLOYMENT_REFERENCE_MISSING"],
    ["artifactReference", "ARTIFACT_REFERENCE_MISSING"],
    [
      "packageCertificationReference",
      "PACKAGE_CERTIFICATION_REFERENCE_MISSING",
    ],
    ["pilotAllowlistReference", "PILOT_ALLOWLIST_REFERENCE_MISSING"],
    ["roleAllowlistReference", "ROLE_ALLOWLIST_REFERENCE_MISSING"],
  ]) {
    requireReference(release[field], `release:${code}`, blockers);
  }
  requireCommit(release.commitSha, "release:COMMIT_SHA_INVALID", blockers);
  for (const [field, code] of [
    ["artifactDigest", "ARTIFACT_DIGEST_INVALID"],
    ["packageCertificationHash", "PACKAGE_CERTIFICATION_HASH_INVALID"],
    ["ciEvidenceSha256", "CI_EVIDENCE_HASH_INVALID"],
    ["manifestHash", "MANIFEST_HASH_INVALID"],
    ["evidenceBundleHash", "EVIDENCE_BUNDLE_HASH_INVALID"],
    ["browserReportHash", "BROWSER_REPORT_HASH_INVALID"],
  ]) {
    requireHash(release[field], `release:${code}`, blockers);
  }
  if (release.packageState !== "PILOT_CERTIFIED") {
    blockers.push("release:PACKAGE_NOT_PILOT_CERTIFIED");
  }
  if (release.activatedAt !== null) {
    blockers.push("release:PACKAGE_ALREADY_ACTIVATED");
  }
}

function evaluateCiEvidence(release, ci, nowMs, blockers) {
  if (ci.status !== "PASSED") blockers.push("ci:STATUS_NOT_PASSED");
  if (ci.sourceTreeClean !== true) blockers.push("ci:SOURCE_TREE_NOT_CLEAN");
  for (const [field, code] of [
    ["runReference", "RUN_REFERENCE_MISSING"],
    ["branchReference", "BRANCH_REFERENCE_MISSING"],
    ["artifactReference", "ARTIFACT_REFERENCE_MISSING"],
    ["sourceSystemReference", "SOURCE_SYSTEM_REFERENCE_MISSING"],
    ["attestationReference", "ATTESTATION_REFERENCE_MISSING"],
    ["invalidAuthEvidenceReference", "INVALID_AUTH_EVIDENCE_REFERENCE_MISSING"],
  ]) {
    requireReference(ci[field], `ci:${code}`, blockers);
  }
  requireCommit(ci.commitSha, "ci:COMMIT_SHA_INVALID", blockers);
  requireHash(ci.artifactDigest, "ci:ARTIFACT_DIGEST_INVALID", blockers);
  requireHash(ci.browserReportHash, "ci:BROWSER_REPORT_HASH_INVALID", blockers);
  requireHash(ci.attestationDigest, "ci:ATTESTATION_DIGEST_INVALID", blockers);
  requireHash(ci.evidenceSha256, "ci:EVIDENCE_HASH_INVALID", blockers);
  const completedAt = requirePastTimestamp(
    ci.completedAt,
    nowMs,
    "ci:COMPLETED_AT_INVALID",
    blockers,
  );
  if (completedAt !== null && nowMs - completedAt > 24 * 60 * 60 * 1000) {
    blockers.push("ci:COMPLETION_STALE");
  }
  const attestedAt = requirePastTimestamp(
    ci.attestedAt,
    nowMs,
    "ci:ATTESTED_AT_INVALID",
    blockers,
  );
  if (attestedAt !== null && nowMs - attestedAt > 24 * 60 * 60 * 1000) {
    blockers.push("ci:ATTESTATION_STALE");
  }
  if (completedAt !== null && attestedAt !== null && attestedAt < completedAt) {
    blockers.push("ci:ATTESTATION_PRECEDES_COMPLETION");
  }
  compareBoundValue(
    ci.commitSha,
    release.commitSha,
    "ci:COMMIT_SHA_RELEASE_MISMATCH",
    blockers,
  );
  compareBoundValue(
    ci.artifactDigest,
    release.artifactDigest,
    "ci:ARTIFACT_DIGEST_RELEASE_MISMATCH",
    blockers,
  );
  compareBoundValue(
    ci.artifactReference,
    release.artifactReference,
    "ci:ARTIFACT_REFERENCE_RELEASE_MISMATCH",
    blockers,
  );
  compareBoundValue(
    ci.evidenceSha256,
    release.ciEvidenceSha256,
    "ci:EVIDENCE_HASH_RELEASE_MISMATCH",
    blockers,
  );
  compareBoundValue(
    ci.browserReportHash,
    release.browserReportHash,
    "ci:BROWSER_REPORT_HASH_RELEASE_MISMATCH",
    blockers,
  );
}

function evaluateGovernance(release, governance, nowMs, blockers) {
  if (governance.environment !== release.environment) {
    blockers.push("governance:ENVIRONMENT_RELEASE_MISMATCH");
  }
  for (const [field, code] of [
    ["sourceSystemReference", "SOURCE_SYSTEM_REFERENCE_MISSING"],
    ["attestationReference", "ATTESTATION_REFERENCE_MISSING"],
    ["invalidAuthEvidenceReference", "INVALID_AUTH_EVIDENCE_REFERENCE_MISSING"],
  ]) {
    requireReference(governance[field], `governance:${code}`, blockers);
  }
  requireHash(
    governance.attestationDigest,
    "governance:ATTESTATION_DIGEST_INVALID",
    blockers,
  );
  requireHash(
    governance.evidenceSha256,
    "governance:EVIDENCE_HASH_INVALID",
    blockers,
  );
  const attestedAt = requirePastTimestamp(
    governance.attestedAt,
    nowMs,
    "governance:ATTESTED_AT_INVALID",
    blockers,
  );
  if (attestedAt !== null && nowMs - attestedAt > 24 * 60 * 60 * 1000) {
    blockers.push("governance:ATTESTATION_STALE");
  }
  for (const [field, code] of [
    ["packageId", "PACKAGE_ID_MISSING"],
    ["releaseVersion", "RELEASE_VERSION_MISSING"],
  ]) {
    requireText(governance[field], `governance:${code}`, blockers);
    compareBoundValue(
      governance[field],
      release[field],
      `governance:${constantName(field)}_RELEASE_MISMATCH`,
      blockers,
    );
  }
  requireCommit(
    governance.commitSha,
    "governance:COMMIT_SHA_INVALID",
    blockers,
  );
  compareBoundValue(
    governance.commitSha,
    release.commitSha,
    "governance:COMMIT_SHA_RELEASE_MISMATCH",
    blockers,
  );
  for (const field of [
    "artifactDigest",
    "manifestHash",
    "evidenceBundleHash",
  ]) {
    requireHash(
      governance[field],
      `governance:${constantName(field)}_INVALID`,
      blockers,
    );
    compareBoundValue(
      governance[field],
      release[field],
      `governance:${constantName(field)}_RELEASE_MISMATCH`,
      blockers,
    );
  }
}

function evaluateApprovals(release, approvals, nowMs, blockers) {
  const product = approvals.product;
  const security = approvals.security;
  for (const [kind, approval] of [
    ["product", product],
    ["security", security],
  ]) {
    if (!approval || typeof approval !== "object" || Array.isArray(approval)) {
      blockers.push(`approvals:${kind.toUpperCase()}_APPROVAL_MISSING`);
      continue;
    }
    if (approval.decision !== "APPROVED") {
      blockers.push(`approvals:${kind.toUpperCase()}_NOT_APPROVED`);
    }
    requireRealIdentity(
      approval.actorDirectoryId,
      `approvals:${kind.toUpperCase()}_ACTOR_INVALID`,
      blockers,
    );
    requireReference(
      approval.approvalReference,
      `approvals:${kind.toUpperCase()}_REFERENCE_MISSING`,
      blockers,
    );
    validateCurrentWindow(
      approval.decidedAt,
      approval.expiresAt,
      nowMs,
      `approvals:${kind.toUpperCase()}`,
      blockers,
    );
    for (const [field, releaseField] of [
      ["manifestHash", "manifestHash"],
      ["artifactDigest", "artifactDigest"],
      ["evidenceBundleHash", "evidenceBundleHash"],
    ]) {
      requireHash(
        approval[field],
        `approvals:${kind.toUpperCase()}_${constantName(field)}_INVALID`,
        blockers,
      );
      compareBoundValue(
        approval[field],
        release[releaseField],
        `approvals:${kind.toUpperCase()}_${constantName(field)}_MISMATCH`,
        blockers,
      );
    }
  }
  if (
    nonEmpty(product?.actorDirectoryId) &&
    product.actorDirectoryId === security?.actorDirectoryId
  ) {
    blockers.push("approvals:PRODUCT_SECURITY_ACTORS_NOT_DISTINCT");
  }
}

function evaluateOwners(ownerEntries, nowMs, blockers) {
  const owners = new Map();
  for (const owner of ownerEntries) {
    if (!owner || typeof owner !== "object" || Array.isArray(owner)) {
      blockers.push("owners:ENTRY_INVALID");
      continue;
    }
    if (!nonEmpty(owner.role) || owners.has(owner.role)) {
      blockers.push("owners:ROLE_INVALID_OR_DUPLICATE");
      continue;
    }
    owners.set(owner.role, owner);
  }
  for (const role of REQUIRED_OWNER_ROLES) {
    const owner = owners.get(role);
    if (!owner) {
      blockers.push(`owners:${role}_MISSING`);
      continue;
    }
    requireRealIdentity(
      owner.primaryDirectoryId,
      `owners:${role}_PRIMARY_INVALID`,
      blockers,
    );
    requireRealIdentity(
      owner.backupDirectoryId,
      `owners:${role}_BACKUP_INVALID`,
      blockers,
    );
    if (
      nonEmpty(owner.primaryDirectoryId) &&
      owner.primaryDirectoryId === owner.backupDirectoryId
    ) {
      blockers.push(`owners:${role}_PRIMARY_BACKUP_NOT_DISTINCT`);
    }
    requireText(
      owner.acceptedRunbookVersion,
      `owners:${role}_RUNBOOK_MISSING`,
      blockers,
    );
    requireReference(
      owner.escalationReference,
      `owners:${role}_ESCALATION_REFERENCE_MISSING`,
      blockers,
    );
    requirePastTimestamp(
      owner.acceptedAt,
      nowMs,
      `owners:${role}_ACCEPTED_AT_INVALID`,
      blockers,
    );
    validateCurrentWindow(
      owner.coverageStartsAt,
      owner.coverageEndsAt,
      nowMs,
      `owners:${role}`,
      blockers,
    );
  }
  for (const role of owners.keys()) {
    if (!REQUIRED_OWNER_ROLES.includes(role)) {
      blockers.push(`owners:${role}_UNEXPECTED`);
    }
  }
  return owners;
}

function evaluateScheduler(release, scheduler, nowMs, blockers) {
  requireText(scheduler.provider, "scheduler:PROVIDER_MISSING", blockers);
  for (const [field, code] of [
    ["scheduleReference", "SCHEDULE_REFERENCE_MISSING"],
    ["workloadReference", "WORKLOAD_REFERENCE_MISSING"],
    ["managedCredentialReference", "MANAGED_CREDENTIAL_REFERENCE_MISSING"],
    ["concurrencyEvidenceReference", "CONCURRENCY_EVIDENCE_REFERENCE_MISSING"],
    ["readinessEvidenceReference", "READINESS_EVIDENCE_REFERENCE_MISSING"],
    ["invalidAuthEvidenceReference", "INVALID_AUTH_EVIDENCE_REFERENCE_MISSING"],
    [
      "missingConfigEvidenceReference",
      "MISSING_CONFIG_EVIDENCE_REFERENCE_MISSING",
    ],
    ["failureAlertReference", "FAILURE_ALERT_REFERENCE_MISSING"],
    [
      "deploymentSourceSystemReference",
      "DEPLOYMENT_SOURCE_SYSTEM_REFERENCE_MISSING",
    ],
    [
      "deploymentAttestationReference",
      "DEPLOYMENT_ATTESTATION_REFERENCE_MISSING",
    ],
    [
      "deploymentAuthorityInvalidAuthEvidenceReference",
      "DEPLOYMENT_AUTHORITY_INVALID_AUTH_EVIDENCE_REFERENCE_MISSING",
    ],
  ]) {
    requireReference(scheduler[field], `scheduler:${code}`, blockers);
  }
  requireHash(
    scheduler.readinessEvidenceSha256,
    "scheduler:READINESS_EVIDENCE_HASH_INVALID",
    blockers,
  );
  requireHash(
    scheduler.deploymentAttestationDigest,
    "scheduler:DEPLOYMENT_ATTESTATION_DIGEST_INVALID",
    blockers,
  );
  requireHash(
    scheduler.deploymentEvidenceSha256,
    "scheduler:DEPLOYMENT_EVIDENCE_HASH_INVALID",
    blockers,
  );
  if (!["MANAGED_SECRET", "WORKLOAD_IDENTITY"].includes(scheduler.authType)) {
    blockers.push("scheduler:AUTH_TYPE_INVALID");
  }
  if (scheduler.intervalMinutes !== 5) {
    blockers.push("scheduler:INTERVAL_NOT_FIVE_MINUTES");
  }
  if (scheduler.singleConcurrency !== true && scheduler.leaseSafe !== true) {
    blockers.push("scheduler:CONCURRENCY_CONTROL_MISSING");
  }
  if (
    !Number.isInteger(scheduler.timeoutMs) ||
    scheduler.timeoutMs <= 0 ||
    scheduler.timeoutMs >= 300000
  ) {
    blockers.push("scheduler:TIMEOUT_INVALID");
  }
  requireCommit(
    scheduler.deployedCommitSha,
    "scheduler:DEPLOYED_COMMIT_SHA_INVALID",
    blockers,
  );
  requireHash(
    scheduler.deployedArtifactDigest,
    "scheduler:DEPLOYED_ARTIFACT_DIGEST_INVALID",
    blockers,
  );
  compareBoundValue(
    scheduler.deployedCommitSha,
    release.commitSha,
    "scheduler:DEPLOYED_COMMIT_SHA_MISMATCH",
    blockers,
  );
  compareBoundValue(
    scheduler.deployedArtifactDigest,
    release.artifactDigest,
    "scheduler:DEPLOYED_ARTIFACT_DIGEST_MISMATCH",
    blockers,
  );
  const deployedAtMs = requirePastTimestamp(
    scheduler.deployedAt,
    nowMs,
    "scheduler:DEPLOYED_AT_INVALID",
    blockers,
  );
  const deploymentAttestedAtMs = requirePastTimestamp(
    scheduler.deploymentAttestedAt,
    nowMs,
    "scheduler:DEPLOYMENT_ATTESTED_AT_INVALID",
    blockers,
  );
  if (
    deploymentAttestedAtMs !== null &&
    nowMs - deploymentAttestedAtMs > SCHEDULER_DEPLOYMENT_EVIDENCE_MAX_AGE_MS
  ) {
    blockers.push("scheduler:DEPLOYMENT_ATTESTATION_STALE");
  }
  if (
    deployedAtMs !== null &&
    deploymentAttestedAtMs !== null &&
    deployedAtMs > deploymentAttestedAtMs
  ) {
    blockers.push("scheduler:DEPLOYED_AFTER_ATTESTATION");
  }
  if (scheduler.readinessStatus !== "HEALTHY") {
    blockers.push("scheduler:READINESS_NOT_HEALTHY");
  }
  const readinessMs = requirePastTimestamp(
    scheduler.readinessCheckedAt,
    nowMs,
    "scheduler:READINESS_CHECKED_AT_INVALID",
    blockers,
  );
  if (readinessMs !== null && nowMs - readinessMs > 10 * 60 * 1000) {
    blockers.push("scheduler:READINESS_STALE");
  }
  const heartbeatFreshUntil = parseTimestamp(scheduler.heartbeatFreshUntil);
  if (heartbeatFreshUntil === null || heartbeatFreshUntil <= nowMs) {
    blockers.push("scheduler:HEARTBEAT_NOT_FRESH");
  }

  if (scheduler.windows.length < 3) {
    blockers.push("scheduler:THREE_SUCCESS_WINDOWS_MISSING");
    return;
  }
  const completedWindows = [];
  const runIds = new Set();
  scheduler.windows.forEach((window, index) => {
    const prefix = `scheduler:WINDOW_${index + 1}`;
    requireText(window.runId, `${prefix}_RUN_ID_MISSING`, blockers);
    requireReference(
      window.evidenceReference,
      `${prefix}_EVIDENCE_REFERENCE_MISSING`,
      blockers,
    );
    if (window.status !== "COMPLETED") {
      blockers.push(`${prefix}_NOT_COMPLETED`);
    }
    const scheduledAt = parseTimestamp(window.scheduledAt);
    const completedAt = parseTimestamp(window.completedAt);
    if (scheduledAt === null || scheduledAt > nowMs) {
      blockers.push(`${prefix}_SCHEDULED_AT_INVALID`);
    }
    if (
      completedAt === null ||
      completedAt > nowMs ||
      (scheduledAt !== null && completedAt < scheduledAt)
    ) {
      blockers.push(`${prefix}_COMPLETED_AT_INVALID`);
    }
    if (nonEmpty(window.runId)) {
      if (runIds.has(window.runId)) blockers.push(`${prefix}_RUN_ID_DUPLICATE`);
      runIds.add(window.runId);
    }
    if (
      window.status === "COMPLETED" &&
      scheduledAt !== null &&
      completedAt !== null
    ) {
      completedWindows.push({ scheduledAt, completedAt });
    }
  });
  const ordered = completedWindows
    .sort((left, right) => left.scheduledAt - right.scheduledAt)
    .slice(-3);
  if (ordered.length < 3) {
    blockers.push("scheduler:THREE_SUCCESS_WINDOWS_MISSING");
    return;
  }
  for (let index = 1; index < ordered.length; index += 1) {
    const delta = ordered[index].scheduledAt - ordered[index - 1].scheduledAt;
    if (Math.abs(delta - 5 * 60 * 1000) > 30 * 1000) {
      blockers.push("scheduler:FIVE_MINUTE_CADENCE_INVALID");
      break;
    }
  }
}

function evaluateAlerting(alerting, owners, nowMs, blockers) {
  if (alerting.transportStatus !== "HEALTHY") {
    blockers.push("alerting:TRANSPORT_NOT_HEALTHY");
  }
  requireHash(
    alerting.evidenceSha256,
    "alerting:EVIDENCE_HASH_INVALID",
    blockers,
  );
  for (const [field, code] of [
    ["transportReference", "TRANSPORT_REFERENCE_MISSING"],
    ["managedSecretReference", "MANAGED_SECRET_REFERENCE_MISSING"],
    ["httpsDeliveryReference", "HTTPS_DELIVERY_REFERENCE_MISSING"],
    ["externalRequestReference", "EXTERNAL_REQUEST_REFERENCE_MISSING"],
    ["acknowledgementReference", "ACKNOWLEDGEMENT_REFERENCE_MISSING"],
    ["retryEvidenceReference", "RETRY_EVIDENCE_REFERENCE_MISSING"],
    ["deadLetterEvidenceReference", "DEAD_LETTER_EVIDENCE_REFERENCE_MISSING"],
    ["recoveryEvidenceReference", "RECOVERY_EVIDENCE_REFERENCE_MISSING"],
    ["escalationEvidenceReference", "ESCALATION_EVIDENCE_REFERENCE_MISSING"],
    [
      "secretRotationEvidenceReference",
      "SECRET_ROTATION_EVIDENCE_REFERENCE_MISSING",
    ],
  ]) {
    requireReference(alerting[field], `alerting:${code}`, blockers);
  }
  const deliveredAt = requirePastTimestamp(
    alerting.deliveredAt,
    nowMs,
    "alerting:DELIVERED_AT_INVALID",
    blockers,
  );
  if (deliveredAt !== null && nowMs - deliveredAt > 24 * 60 * 60 * 1000) {
    blockers.push("alerting:DELIVERY_EVIDENCE_STALE");
  }
  const acknowledgedAt = requirePastTimestamp(
    alerting.acknowledgedAt,
    nowMs,
    "alerting:ACKNOWLEDGED_AT_INVALID",
    blockers,
  );
  requirePastTimestamp(
    alerting.escalationTestedAt,
    nowMs,
    "alerting:ESCALATION_TESTED_AT_INVALID",
    blockers,
  );
  if (
    !Number.isInteger(alerting.acknowledgementSloMinutes) ||
    alerting.acknowledgementSloMinutes <= 0 ||
    alerting.acknowledgementSloMinutes > 120
  ) {
    blockers.push("alerting:ACKNOWLEDGEMENT_SLO_INVALID");
  } else if (
    deliveredAt !== null &&
    acknowledgedAt !== null &&
    (acknowledgedAt < deliveredAt ||
      acknowledgedAt - deliveredAt >
        alerting.acknowledgementSloMinutes * 60 * 1000)
  ) {
    blockers.push("alerting:ACKNOWLEDGEMENT_OUTSIDE_SLO");
  }
  const securityOwner = owners.get("SECURITY_INCIDENT");
  const onCallOwner = owners.get("ON_CALL_BACKUP");
  requireRealIdentity(
    alerting.acknowledgedByDirectoryId,
    "alerting:ACKNOWLEDGER_IDENTITY_INVALID",
    blockers,
  );
  requireRealIdentity(
    alerting.escalatedToDirectoryId,
    "alerting:ESCALATION_IDENTITY_INVALID",
    blockers,
  );
  compareBoundValue(
    alerting.acknowledgedByDirectoryId,
    securityOwner?.primaryDirectoryId,
    "alerting:ACKNOWLEDGER_OWNER_MISMATCH",
    blockers,
  );
  compareBoundValue(
    alerting.escalatedToDirectoryId,
    onCallOwner?.primaryDirectoryId,
    "alerting:ESCALATION_OWNER_MISMATCH",
    blockers,
  );
}

function evaluateCredentialBinding(
  release,
  binding,
  credentialRegister,
  credentialRegisterSha256,
  nowMs,
  blockers,
) {
  requireText(
    binding.registerReference,
    "credentialRotation:REGISTER_REFERENCE_MISSING",
    blockers,
  );
  requireHash(
    binding.registerSha256,
    "credentialRotation:REGISTER_HASH_INVALID",
    blockers,
  );
  requireReference(
    binding.securityApprovalReference,
    "credentialRotation:SECURITY_APPROVAL_REFERENCE_MISSING",
    blockers,
  );
  requireHash(
    binding.evidenceSha256,
    "credentialRotation:EVIDENCE_HASH_INVALID",
    blockers,
  );
  requireReference(
    binding.attestationReference,
    "credentialRotation:ATTESTATION_REFERENCE_MISSING",
    blockers,
  );
  if (!credentialRegister) {
    blockers.push("credentialRotation:REGISTER_UNAVAILABLE");
    return null;
  }
  let credentialResult;
  try {
    credentialResult = evaluateRotationRegister(credentialRegister, {
      now: new Date(nowMs),
      expectedRelease: release,
    });
  } catch {
    blockers.push("credentialRotation:REGISTER_INVALID");
    return null;
  }
  if (!credentialResult.ready) {
    blockers.push("credentialRotation:CREDENTIAL_REGISTER_BLOCKED");
  }
  compareBoundValue(
    binding.registerSha256,
    credentialRegisterSha256,
    "credentialRotation:REGISTER_HASH_MISMATCH",
    blockers,
  );
  compareBoundValue(
    binding.securityApprovalReference,
    credentialRegister.securityApprovalReference,
    "credentialRotation:SECURITY_APPROVAL_REFERENCE_MISMATCH",
    blockers,
  );
  compareBoundValue(
    binding.evidenceSha256,
    credentialRegister.authority?.evidenceSha256,
    "credentialRotation:EVIDENCE_HASH_MISMATCH",
    blockers,
  );
  compareBoundValue(
    binding.attestationReference,
    credentialRegister.authority?.attestationReference,
    "credentialRotation:ATTESTATION_REFERENCE_MISMATCH",
    blockers,
  );
  return credentialResult;
}

function evaluateActivationBoundary(activation, blockers) {
  if (activation.requested !== false) {
    blockers.push("activation:REQUESTED_MUST_REMAIN_FALSE");
  }
  if (activation.authorized !== false) {
    blockers.push("activation:AUTHORIZED_MUST_REMAIN_FALSE");
  }
  if (activation.activatedAt !== null) {
    blockers.push("activation:ACTIVATED_AT_MUST_REMAIN_NULL");
  }
}

function requireText(value, code, blockers) {
  if (!nonEmpty(value)) blockers.push(code);
}

function requireReference(value, code, blockers) {
  if (!nonEmpty(value)) {
    blockers.push(code);
  } else if (!REFERENCE_PATTERN.test(value)) {
    blockers.push(code.replace(/_MISSING$/, "_INVALID"));
  }
}

function requireHash(value, code, blockers) {
  if (!nonEmpty(value) || !HASH_PATTERN.test(value)) blockers.push(code);
}

function requireCommit(value, code, blockers) {
  if (!nonEmpty(value) || !COMMIT_PATTERN.test(value)) blockers.push(code);
}

function requireRealIdentity(value, code, blockers) {
  if (
    !nonEmpty(value) ||
    !IDENTITY_REFERENCE_PATTERN.test(value) ||
    SYNTHETIC_IDENTITY_PATTERN.test(value)
  ) {
    blockers.push(code);
  }
}

function requirePastTimestamp(value, nowMs, code, blockers) {
  const timestamp = parseTimestamp(value);
  if (timestamp === null || timestamp > nowMs) {
    blockers.push(code);
    return null;
  }
  return timestamp;
}

function validateCurrentWindow(startsAt, endsAt, nowMs, prefix, blockers) {
  const start = parseTimestamp(startsAt);
  const end = parseTimestamp(endsAt);
  if (start === null || end === null || end <= start) {
    blockers.push(`${prefix}_WINDOW_INVALID`);
    return;
  }
  if (start > nowMs) blockers.push(`${prefix}_NOT_YET_VALID`);
  if (end <= nowMs) blockers.push(`${prefix}_EXPIRED`);
}

function compareBoundValue(actual, expected, code, blockers) {
  if (nonEmpty(actual) && nonEmpty(expected) && actual !== expected) {
    blockers.push(code);
  }
}

function parseTimestamp(value) {
  if (!nonEmpty(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeNow(value) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(timestamp))
    throw new Error("Evaluation time is invalid.");
  return timestamp;
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function constantName(value) {
  return value.replace(/[A-Z]/g, (character) => `_${character}`).toUpperCase();
}

function sha256Prefixed(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

function renderMarkdown(register, result) {
  const lines = [
    "# Stoquify Agent Runtime Operational Release Evidence",
    "",
    `**Register:** \`${register.registerId}\`  `,
    `**Gate status:** \`${result.status}\`  `,
    `**Current blockers:** ${result.blockerCount}  `,
    `**Independent release review ready:** ${result.ready ? "Yes" : "No"}  `,
    "**Activation authorized:** No  ",
    "**Secret or credential values retained:** No",
    "",
    "This register binds repository, governance, scheduler, alerting, and credential-rotation evidence for independent review. A passing result does not activate an agent package and does not replace the enterprise release decision.",
    "",
    "## Bound Release",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Environment | \`${display(register.release.environment)}\` |`,
    `| Package | \`${display(register.release.packageId)}\` |`,
    `| Release version | \`${display(register.release.releaseVersion)}\` |`,
    `| Package state | \`${display(register.release.packageState)}\` |`,
    `| Commit | \`${display(register.release.commitSha)}\` |`,
    `| Artifact digest | \`${display(register.release.artifactDigest)}\` |`,
    `| Manifest hash | \`${display(register.release.manifestHash)}\` |`,
    "",
    "## Evidence Summary",
    "",
    "| Control | Result |",
    "|---|---|",
    `| Real owner responsibilities present | ${result.ownerRolesPresent}/${REQUIRED_OWNER_ROLES.length} |`,
    `| Consecutive completed scheduler windows supplied | ${result.successfulSchedulerWindows} |`,
    `| Credential-rotation gate | \`${result.credentialRotationStatus}\` |`,
    "| Governance capture | Bound to authoritative attestation and frozen release or blocked below |",
    "| Product and security approvals | Bound to release identity or blocked below |",
    "| Alert delivery, acknowledgement, escalation, and recovery | Bound to named owners or blocked below |",
    "",
    "## Completion Procedure",
    "",
    "1. Freeze a clean reviewed commit, certified inactive package, immutable artifact, deployment, and browser report; then run `npm run agent:ci-release:evidence:apply` to capture the release and CI attestation.",
    "2. Bind the release package, manifest, evidence bundle, deployment, pilot-tenant allowlist, and role allowlist to the same commit and artifact.",
    "3. Expose an authoritative identity/governance attestation bound to the frozen release, then run `npm run agent:governance:evidence:apply` to capture real approvals and owner coverage without using local E2E records.",
    "4. Record real primary and backup identities, accepted runbook version, current coverage, and escalation reference for all six owner responsibilities.",
    "5. Deploy the five-minute reconciler with managed authentication, bounded timeout, and concurrency control; then run `npm run agent:scheduler:evidence:apply` to capture independent control-plane deployment, missing-configuration, and failure-alert proof.",
    "6. Observe three consecutive completed windows, then run `npm run agent:reconciler:evidence:apply` to capture hash-bound readiness, heartbeat, window, and invalid-auth proof.",
    "7. Prove HTTPS alert delivery, external request identity, acknowledgement within SLO, retry, dead-letter, protected recovery, backup escalation, and alert-secret rotation; then run `npm run agent:alert:evidence:apply` to capture and hash-bind the live evidence.",
    "8. Complete the separate credential-rotation register, run its fail-closed gate, and bind the exact register SHA-256 and security approval reference here.",
    "9. Set `declaredStatus` to `READY_FOR_INDEPENDENT_REVIEW` only after every blocker is resolved, then run `npm run agent:operational-release:gate`.",
    "10. Submit the frozen evidence bundle to `017-aqstoqflow-enterprise-release-gate`; keep activation as a later protected ceremony.",
    "",
    "References must use value-free URI-style identifiers such as `evidence://`, `approval://`, `directory://`, `secret-manager://`, or controlled HTTPS URLs without query strings. Never paste a secret, token, password, authorization header, database URL, signed URL, request body, or environment snapshot into this register.",
    "",
    "## Current Blockers",
    "",
  ];
  if (result.blockers.length === 0) lines.push("- None.");
  else result.blockers.forEach((blocker) => lines.push(`- \`${blocker}\``));
  lines.push(
    "",
    "## Decision",
    "",
    result.ready
      ? "The evidence package is ready for an independent `017-aqstoqflow-enterprise-release-gate` review. Activation remains a separate protected ceremony."
      : "The operational release package remains blocked. Complete the referenced real-world evidence without storing secret values, then rerun the fail-closed gate.",
    "",
    "The agent cannot approve, activate, or promote itself.",
    "",
  );
  return lines.join("\n");
}

function display(value) {
  return nonEmpty(value) ? value.replaceAll("|", "\\|") : "unresolved";
}

function main() {
  const options = parseArgs(process.argv);
  const registerPath = resolve(process.cwd(), options.registerPath);
  const reportPath = resolve(process.cwd(), options.reportPath);
  const credentialPath = resolve(process.cwd(), options.credentialRegisterPath);
  const register = JSON.parse(readFileSync(registerPath, "utf8"));
  const credentialBuffer = readFileSync(credentialPath);
  const credentialRegister = JSON.parse(credentialBuffer.toString("utf8"));
  const result = evaluateOperationalReleaseRegister(register, {
    credentialRegister,
    credentialRegisterSha256: sha256Prefixed(credentialBuffer),
  });
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, renderMarkdown(register, result), "utf8");
  console.log(
    JSON.stringify(
      {
        status: result.status,
        readyForIndependentReview: result.ready,
        activationAuthorized: false,
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
  READY_STATUS,
  REQUIRED_OWNER_ROLES,
  evaluateOperationalReleaseRegister,
  renderMarkdown,
  sha256Prefixed,
};
