#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const {
  buildEnterpriseBlockerStatus,
} = require("./enterprise-release-blocker-status");

const DEFAULT_INPUT =
  "docs/blockers/enterprise-release-external-evidence-intake-2026-07-27.json";
const DEFAULT_MARKDOWN_OUT =
  "what-next/enterprise-release-external-evidence-intake-readiness.md";
const DEFAULT_JSON_OUT =
  "what-next/enterprise-release-external-evidence-intake-readiness.json";

const EXPECTED_SECRET_NAMES = Object.freeze([
  "PUBLIC_IDENTITY_ABUSE_HASH_SECRET",
  "AQSTOQFLOW_RECEIPT_TOKEN_SECRET",
  "AQSTOQFLOW_HISTORY_CURSOR_SECRET",
]);

const REFERENCE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/[a-z0-9][a-z0-9._~:/-]*$/i;
const IDENTITY_PATTERN =
  /^(?:directory|identity):\/\/[a-z0-9][a-z0-9._~:/-]*$/i;
const MANAGED_SECRET_PATTERN =
  /^(?:secret-manager|vault|keyvault):\/\/[a-z0-9][a-z0-9._~:/-]*$/i;
const PLACEHOLDER_PATTERN =
  /(^|[:/._-])(demo|example|fake|fixture|placeholder|sample|seed|test|tbd|todo|unassigned)($|[:/._-])/i;
const FORBIDDEN_KEYS = new Set([
  "secret",
  "secretvalue",
  "password",
  "passwordvalue",
  "token",
  "tokenvalue",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "authorizationheader",
  "privatekey",
  "databaseurl",
  "connectionstring",
  "rawenvironment",
  "environmentsnapshot",
]);

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    input: DEFAULT_INPUT,
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") options.root = path.resolve(argv[++index]);
    else if (value === "--mode") options.mode = argv[++index];
    else if (value === "--input") options.input = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.");
  }
  return options;
}

function evaluateEnterpriseExternalIntake(
  input,
  {
    now = new Date(),
    authoritativeStatus = buildEnterpriseBlockerStatus(process.cwd()),
  } = {},
) {
  assertShape(input);
  const authoritative = new Map(
    (authoritativeStatus.blockers || []).map((item) => [item.id, item]),
  );
  const checks = [];
  const add = (id, title, owner, blockers, nextCommands) => {
    checks.push({
      id,
      title,
      owner,
      ready: blockers.length === 0,
      blockers: [...new Set(blockers)],
      nextCommands,
    });
  };

  add(
    "B03",
    "Production database target, backup, and migration evidence",
    "PLATFORM_DATABASE_OWNER",
    [
      ...evaluateOwner(input.database.owner, "DATABASE", now),
      ...requireReferences(input.database, [
        "targetAttestationReference",
        "managedDatabaseReference",
        "migrationIdentityReference",
        "runtimeIdentityReference",
        "backupReference",
        "restoreTestReference",
        "changeReference",
        "migrationExecutionReference",
      ]),
      ...authoritativeBlockers(authoritative, ["B03"]),
    ],
    [
      "npm run prisma:migration:release:preflight",
      "npm run prisma:migrate:deploy",
      "npm run prisma:migration:history:health",
      "npm run prisma:migrate:status",
    ],
  );

  add(
    "B04",
    "Managed production release-secret references",
    "SECURITY_PLATFORM_OWNER",
    [
      ...evaluateOwner(input.managedSecrets.owner, "MANAGED_SECRETS", now),
      ...evaluateManagedSecrets(input.managedSecrets.entries, now),
      ...requireReferences(input.managedSecrets, [
        "deploymentReference",
        "redactedGateEvidenceReference",
      ]),
      ...authoritativeBlockers(authoritative, ["B04"]),
    ],
    [
      "npm run release:secrets:preflight:release",
      "npm run public-identity:abuse:gate:release",
      "npm run receipt:token:config-gate:release",
      "npm run release:evidence:gate:release",
    ],
  );

  add(
    "B05_B06",
    "Cameroon source binding and independent expert return",
    "COMPLIANCE_LEGAL_OWNER",
    [
      ...evaluateOwner(input.statutory.owner, "STATUTORY", now),
      ...evaluateStatutory(input.statutory, now),
      ...authoritativeBlockers(authoritative, ["B05", "B06"]),
    ],
    [
      "npm run statutory:country-pack:review:preflight",
      "npm run statutory:country-pack:gate",
    ],
  );

  add(
    "B07",
    "Credential rotation and old-version rejection",
    "SECURITY_OWNER_WITH_SERVICE_OWNERS",
    [
      ...evaluateOwner(
        input.credentialRotation.owner,
        "CREDENTIAL_ROTATION",
        now,
      ),
      ...requireIdentity(
        input.credentialRotation.securityAuthorityDirectoryId,
        "SECURITY_AUTHORITY_IDENTITY_INVALID",
      ),
      ...requireReferences(input.credentialRotation, [
        "serviceOwnerRosterReference",
        "credentialInventoryReference",
        "rotationExecutionReference",
        "oldVersionRejectionReference",
        "securityApprovalReference",
      ]),
      ...authoritativeBlockers(authoritative, ["B07"]),
    ],
    [
      "npm run agent:credential-rotation:evidence:apply",
      "npm run agent:credential-rotation:gate",
    ],
  );

  add(
    "B08",
    "Operational ownership, scheduler, alerting, and CI evidence",
    "RELEASE_MANAGER",
    [
      ...evaluateOwner(input.operations.owner, "OPERATIONS", now),
      ...requireIdentity(
        input.operations.releaseManagerDirectoryId,
        "RELEASE_MANAGER_IDENTITY_INVALID",
      ),
      ...requireReferences(input.operations, [
        "operationalOwnerRosterReference",
        "protectedCiReference",
        "schedulerDeploymentReference",
        "schedulerWindowEvidenceReference",
        "invalidAuthRejectionReference",
        "alertLifecycleEvidenceReference",
        "independentReviewReference",
      ]),
      ...(input.operations.activationAuthorized === false
        ? []
        : ["ACTIVATION_AUTHORIZED_MUST_REMAIN_FALSE"]),
      ...authoritativeBlockers(authoritative, ["B08"]),
    ],
    ["npm run agent:operational-release:gate"],
  );

  add(
    "SAFETY",
    "Pre-promotion fail-closed boundary",
    "ENTERPRISE_RELEASE_AUTHORITY",
    evaluateSafety(input.safety),
    ["npm run enterprise:release:blockers:gate"],
  );

  const blockers = checks.flatMap((check) =>
    check.blockers.map((code) => `${check.id}:${code}`),
  );
  const ready = blockers.length === 0;

  return {
    schemaVersion: "1.0",
    evaluatedAt: now.toISOString(),
    status: ready
      ? "READY_TO_RERUN_AUTHORITATIVE_RELEASE_GATES"
      : "EXTERNAL_EVIDENCE_REQUIRED",
    ready,
    releasePosture: ready
      ? "AWAIT_AUTHORITATIVE_GATE_DECISIONS"
      : "DEVELOPMENT_CONTINUES_PILOT_AND_PRODUCTION_FAIL_CLOSED",
    summary: {
      checks: checks.length,
      passed: checks.filter((check) => check.ready).length,
      blockers: blockers.length,
      secretValuesPrinted: false,
    },
    checks,
    blockers,
    authoritativeSnapshot: Object.fromEntries(
      ["B03", "B04", "B05", "B06", "B07", "B08"].map((id) => [
        id,
        {
          ready: authoritative.get(id)?.ready === true,
          status: authoritative.get(id)?.status || "MISSING",
          blockerCount: authoritative.get(id)?.blockers?.length ?? 0,
        },
      ]),
    ),
    decisions: {
      authoritativePromotionApproved: false,
      activationAuthorized: false,
      phase2bAuthorized: false,
      phase3Authorized: false,
    },
    handling: {
      secretValuesAccepted: false,
      databaseUrlAccepted: false,
      approvalsCreated: false,
      identitiesCreated: false,
      sourceEvidenceMutated: false,
      operationalRegisterMutated: false,
      activationAttempted: false,
    },
  };
}

function assertShape(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Enterprise external evidence intake must be an object.");
  }
  assertNoForbiddenKeys(input);
  if (input.schemaVersion !== 1) {
    throw new Error(
      "Enterprise external evidence intake schemaVersion must be 1.",
    );
  }
  for (const field of [
    "database",
    "managedSecrets",
    "statutory",
    "credentialRotation",
    "operations",
    "safety",
  ]) {
    if (
      !input[field] ||
      typeof input[field] !== "object" ||
      Array.isArray(input[field])
    ) {
      throw new Error(
        `Enterprise external evidence intake ${field} must be an object.`,
      );
    }
  }
  if (!Array.isArray(input.managedSecrets.entries)) {
    throw new Error(
      "Enterprise external evidence intake managedSecrets.entries must be an array.",
    );
  }
}

function assertNoForbiddenKeys(value) {
  if (Array.isArray(value)) return value.forEach(assertNoForbiddenKeys);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(
        `Enterprise external evidence intake contains forbidden secret-bearing field: ${key}`,
      );
    }
    assertNoForbiddenKeys(child);
  }
}

function evaluateOwner(owner, prefix, now) {
  if (!owner || typeof owner !== "object") return [`${prefix}_OWNER_MISSING`];
  return [
    ...requireIdentity(
      owner.ownerDirectoryId,
      `${prefix}_OWNER_IDENTITY_INVALID`,
    ),
    ...requireReferences(owner, ["acceptanceReference"]),
    ...requirePastTimestamp(
      owner.acceptedAt,
      now,
      `${prefix}_OWNER_ACCEPTED_AT_INVALID`,
    ),
  ];
}

function evaluateManagedSecrets(entries, now) {
  const blockers = [];
  const byName = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      blockers.push("SECRET_ENTRY_INVALID");
      continue;
    }
    if (byName.has(entry.name))
      blockers.push(`SECRET_${constant(entry.name)}_DUPLICATE`);
    byName.set(entry.name, entry);
  }
  for (const name of EXPECTED_SECRET_NAMES) {
    const entry = byName.get(name);
    if (!entry) {
      blockers.push(`SECRET_${name}_MISSING`);
      continue;
    }
    if (!isManagedSecretReference(entry.managedSecretReference)) {
      blockers.push(`SECRET_${name}_MANAGED_REFERENCE_INVALID`);
    }
    if (!isReference(entry.versionReference)) {
      blockers.push(`SECRET_${name}_VERSION_REFERENCE_INVALID`);
    }
    blockers.push(
      ...requireIdentity(
        entry.operatorDirectoryId,
        `SECRET_${name}_OPERATOR_IDENTITY_INVALID`,
      ),
      ...requirePastTimestamp(
        entry.activatedAt,
        now,
        `SECRET_${name}_ACTIVATED_AT_INVALID`,
      ),
      ...requireReferences(entry, ["changeReference"]),
    );
  }
  for (const entry of entries) {
    if (!EXPECTED_SECRET_NAMES.includes(entry?.name)) {
      blockers.push(`UNEXPECTED_SECRET_${constant(entry?.name || "missing")}`);
    }
  }
  const managedReferences = entries
    .map((entry) => entry?.managedSecretReference)
    .filter(isManagedSecretReference);
  const versionReferences = entries
    .map((entry) => entry?.versionReference)
    .filter(isReference);
  if (new Set(managedReferences).size !== managedReferences.length) {
    blockers.push("MANAGED_SECRET_REFERENCES_MUST_BE_DISTINCT");
  }
  if (new Set(versionReferences).size !== versionReferences.length) {
    blockers.push("SECRET_VERSION_REFERENCES_MUST_BE_DISTINCT");
  }
  return blockers;
}

function evaluateStatutory(statutory, now) {
  const blockers = [
    ...requireIdentity(
      statutory.reviewerDirectoryId,
      "STATUTORY_REVIEWER_IDENTITY_INVALID",
    ),
    ...requireIdentity(
      statutory.checkerDirectoryId,
      "STATUTORY_CHECKER_IDENTITY_INVALID",
    ),
    ...requireReferences(statutory, [
      "reviewPackageReference",
      "reviewerAppointmentReference",
      "checkerAppointmentReference",
      "qualificationReference",
      "conflictDeclarationReference",
      "sourceHashVerificationReference",
      "fixtureTieOutReference",
      "signedApprovalArtifactReference",
      "signatureValidationReference",
      "checkerVerificationReference",
      "runtimeAuthorityPromotionReference",
    ]),
    ...requirePastTimestamp(
      statutory.reviewedAt,
      now,
      "STATUTORY_REVIEWED_AT_INVALID",
    ),
  ];
  if (
    isRealIdentity(statutory.reviewerDirectoryId) &&
    statutory.reviewerDirectoryId === statutory.checkerDirectoryId
  ) {
    blockers.push("STATUTORY_REVIEWER_CHECKER_SEGREGATION_REQUIRED");
  }
  return blockers;
}

function authoritativeBlockers(authoritative, ids) {
  return ids.flatMap((id) => {
    const item = authoritative.get(id);
    if (!item) return [`AUTHORITATIVE_${id}_EVIDENCE_MISSING`];
    if (item.ready === true) return [];
    return [`AUTHORITATIVE_${id}_${constant(item.status || "BLOCKED")}`];
  });
}

function evaluateSafety(safety) {
  const blockers = [];
  if (safety.secretValuesIncluded !== false)
    blockers.push("SECRET_VALUES_MUST_NOT_BE_INCLUDED");
  if (safety.databaseUrlIncluded !== false)
    blockers.push("DATABASE_URL_MUST_NOT_BE_INCLUDED");
  if (safety.approvalsInferred !== false)
    blockers.push("APPROVALS_MUST_NOT_BE_INFERRED");
  if (safety.activationRequested !== false)
    blockers.push("ACTIVATION_REQUESTED_MUST_REMAIN_FALSE");
  if (safety.activationAuthorized !== false)
    blockers.push("ACTIVATION_AUTHORIZED_MUST_REMAIN_FALSE");
  if (safety.phase2bAuthorized !== false)
    blockers.push("PHASE2B_AUTHORIZED_MUST_REMAIN_FALSE");
  if (safety.phase3Authorized !== false)
    blockers.push("PHASE3_AUTHORIZED_MUST_REMAIN_FALSE");
  return blockers;
}

function requireReferences(object, fields) {
  return fields.flatMap((field) =>
    isReference(object?.[field]) ? [] : [`${constant(field)}_INVALID`],
  );
}

function requireIdentity(value, code) {
  return isRealIdentity(value) ? [] : [code];
}

function requirePastTimestamp(value, now, code) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) && timestamp <= now.getTime() ? [] : [code];
}

function isReference(value) {
  return (
    REFERENCE_PATTERN.test(value || "") && !PLACEHOLDER_PATTERN.test(value)
  );
}

function isManagedSecretReference(value) {
  return (
    MANAGED_SECRET_PATTERN.test(value || "") && !PLACEHOLDER_PATTERN.test(value)
  );
}

function isRealIdentity(value) {
  return IDENTITY_PATTERN.test(value || "") && !PLACEHOLDER_PATTERN.test(value);
}

function constant(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .toUpperCase();
}

function renderMarkdown(result) {
  return [
    "# Enterprise Release External Evidence Intake Readiness",
    "",
    `**Evaluated:** ${result.evaluatedAt}`,
    `**Status:** \`${result.status}\``,
    `**Release posture:** \`${result.releasePosture}\``,
    `**Checks passed:** ${result.summary.passed}/${result.summary.checks}`,
    `**Blockers:** ${result.summary.blockers}`,
    "**Activation authorized by this validator:** No",
    "",
    "## Control boundary",
    "",
    "This validator accepts only redacted references and checks them together with the repository's authoritative B03-B08 gate evidence. It does not accept secret values or database URLs, create identities or approvals, mutate country-pack or operational evidence, authorize promotion, or activate any workload.",
    "",
    "## Workstream readiness",
    "",
    "| Workstream | Owner | Status | Blockers | Next commands |",
    "|---|---|---:|---:|---|",
    ...result.checks.map(
      (check) =>
        `| ${check.title} | ${check.owner} | ${check.ready ? "READY" : "BLOCKED"} | ${check.blockers.length} | ${check.nextCommands.map((command) => `\`${command}\``).join("<br>")} |`,
    ),
    "",
    "## Authoritative B03-B08 snapshot",
    "",
    "| Blocker | Ready | Status | Underlying blockers |",
    "|---|---:|---|---:|",
    ...Object.entries(result.authoritativeSnapshot).map(
      ([id, item]) =>
        `| ${id} | ${item.ready ? "yes" : "no"} | ${item.status} | ${item.blockerCount} |`,
    ),
    "",
    "## Required workflow",
    "",
    "1. Each accountable owner fills only their section of the intake manifest with authoritative, non-secret references.",
    "2. Run the underlying protected command in the authorized environment; the manifest alone never proves a gate.",
    "3. Rerun this validator to reconcile the external return with the live B03-B08 gate reports.",
    "4. When all intake checks pass, rerun the enterprise blocker gate and Skill 017 against one stable candidate.",
    "5. Keep activation and Phase 2B/Phase 3 authority separate and false until their explicit ceremonies.",
    "",
    "## Current blockers",
    "",
    ...(result.blockers.length
      ? result.blockers.map((item) => `- \`${item}\``)
      : [
          "- None. External evidence is ready for authoritative release-gate reruns; no promotion is granted.",
        ]),
    "",
  ].join("\n");
}

function writeWithRetry(target, value, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, value, "utf8");
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        Atomics.wait(
          new Int32Array(new SharedArrayBuffer(4)),
          0,
          0,
          500 * attempt,
        );
      }
    }
  }
  throw lastError;
}

function main() {
  const options = parseArgs();
  const root = path.resolve(options.root);
  const input = JSON.parse(
    fs.readFileSync(path.resolve(root, options.input), "utf8"),
  );
  const authoritativeStatus = buildEnterpriseBlockerStatus(root);
  const result = evaluateEnterpriseExternalIntake(input, {
    authoritativeStatus,
  });
  writeWithRetry(path.resolve(root, options.out), renderMarkdown(result));
  writeWithRetry(
    path.resolve(root, options.jsonOut),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        status: result.status,
        ready: result.ready,
        checks: result.summary.checks,
        passed: result.summary.passed,
        blockers: result.summary.blockers,
        activationAuthorized: false,
        secretValuesPrinted: false,
        report: options.out,
      },
      null,
      2,
    )}\n`,
  );
  if (options.mode === "fail" && !result.ready) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  DEFAULT_INPUT,
  EXPECTED_SECRET_NAMES,
  evaluateEnterpriseExternalIntake,
  parseArgs,
  renderMarkdown,
};
