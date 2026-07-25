#!/usr/bin/env node

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { dirname, resolve } = require("node:path");

const PATHS = Object.freeze({
  requirementsAudit:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_AUTHORIZED_SCOPE_REQUIREMENTS_AUDIT_2026-07-25.json",
  freezeAttestation:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_COMMIT_ATTESTATION_2026-07-25.json",
  operationalEvidence:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json",
  credentialRegister:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json",
  promotionLedger:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_3_PROMOTION_LEDGER_2026-07-25.json",
  pilotExitRegister:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2B_PILOT_EXIT_REGISTER_2026-07-25.json",
  releaseIndex:
    "what-next/skills-life-cycle/stoquify-ohada-leadership-release-evidence-index-2026-07-11.json",
  secretPreflight: "what-next/release-secret-preflight.json",
  migrationReadiness: "what-next/prisma-migration-deployment-readiness.json",
  statutoryReadiness:
    "what-next/statutory-country-pack-production-readiness.json",
});

const PHASE2B_EXPECTED_STEPS = new Map([
  [1, "REVIEW_ACCEPTED"],
  [2, "COMPLETED"],
  [3, "COMPLETED"],
  [4, "COMPLETED"],
  [5, "COMPLETED"],
  [6, "COMPLETED"],
  [7, "COMPLETED"],
  [8, "COMPLETED"],
  [9, "COMPLETED"],
  [10, "COMPLETED"],
  [11, "APPROVED_GO"],
]);
const PILOT_APPROVALS = ["product", "security", "financeDomain", "release"];
const COMMIT_PATTERN = /^[a-f0-9]{40}$/i;
const HASH_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i;

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    target: null,
    jsonOut: null,
    markdownOut: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") options.mode = argv[++index];
    else if (value === "--target") options.target = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else if (value === "--out") options.markdownOut = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.");
  }
  if (!["phase2b", "phase3"].includes(options.target)) {
    throw new Error("Target must be phase2b or phase3.");
  }
  return options;
}

function evaluatePromotion(input, target) {
  const checks = [];
  const add = (id, title, passed, evidencePath) => {
    checks.push({ id, title, passed: Boolean(passed), evidencePath });
  };

  add(
    "AUTHORIZED_SCOPE_COMPLETE",
    "All authorized repository requirements pass",
    input.requirementsAudit?.authorizedScopeComplete === true &&
      input.requirementsAudit?.summary?.repositoryBlockers === 0,
    PATHS.requirementsAudit,
  );
  add(
    "FROZEN_COMMIT_VERIFIED",
    "Phase 2A frozen commit remains verified",
    input.freezeAttestation?.status === "FROZEN_COMMIT_VERIFIED" &&
      input.freezeAttestation?.freezeVerified === true &&
      input.freezeAttestation?.summary?.contentMismatches === 0 &&
      input.freezeAttestation?.summary?.phase2aRuntimeDrift === 0,
    PATHS.freezeAttestation,
  );
  add(
    "CLEAN_RELEASE_READY",
    "Frozen release has clean release identity",
    input.freezeAttestation?.cleanReleaseReady === true,
    PATHS.freezeAttestation,
  );
  add(
    "GLOBAL_RELEASE_READY",
    "Global release evidence has no release blockers",
    input.releaseIndex?.summary?.status === "ready" &&
      input.releaseIndex?.summary?.releaseBlockerCount === 0,
    PATHS.releaseIndex,
  );
  add(
    "PRODUCTION_SECRETS_READY",
    "Production-purpose secret preflight is ready",
    input.secretPreflight?.summary?.status === "ready" &&
      input.secretPreflight?.summary?.blockerCount === 0,
    PATHS.secretPreflight,
  );
  add(
    "MIGRATION_TARGET_READY",
    "Migration and non-local database target are ready",
    input.migrationReadiness?.summary?.status === "ready" &&
      input.migrationReadiness?.summary?.blockerCount === 0,
    PATHS.migrationReadiness,
  );
  add(
    "STATUTORY_AUTHORITY_READY",
    "Statutory source and expert evidence are ready",
    input.statutoryReadiness?.summary?.status === "ready" &&
      input.statutoryReadiness?.summary?.blockerCount === 0,
    PATHS.statutoryReadiness,
  );
  add(
    "CREDENTIAL_ROTATION_READY",
    "Credential rotation register is ready",
    input.credentialRegister?.declaredStatus === "READY",
    PATHS.credentialRegister,
  );
  add(
    "OPERATIONAL_RELEASE_READY",
    "Operational release is ready for independent review",
    input.operationalEvidence?.declaredStatus ===
      "READY_FOR_INDEPENDENT_REVIEW",
    PATHS.operationalEvidence,
  );
  for (const [id, expectedStatus] of PHASE2B_EXPECTED_STEPS) {
    const step = input.promotionLedger?.steps?.find(
      (candidate) => candidate.id === id,
    );
    add(
      `PROMOTION_POINT_${id}_${expectedStatus}`,
      `Promotion point ${id} is ${expectedStatus}`,
      step?.status === expectedStatus,
      PATHS.promotionLedger,
    );
  }
  add(
    "ENTERPRISE_GATE_017_GO",
    "Enterprise gate 017 records approved GO",
    input.promotionLedger?.gateSnapshot?.enterpriseReleaseDecision ===
      "APPROVED_GO",
    PATHS.promotionLedger,
  );

  if (target === "phase2b") {
    add(
      "PRE_ACTIVATION_BOUNDARY",
      "Activation remains a separate false/false/null ceremony",
      input.operationalEvidence?.activation?.requested === false &&
        input.operationalEvidence?.activation?.authorized === false &&
        input.operationalEvidence?.activation?.activatedAt === null &&
        input.promotionLedger?.activationAuthorized === false,
      PATHS.operationalEvidence,
    );
    add(
      "PHASE3_REMAINS_UNAUTHORIZED",
      "Phase 3 remains unauthorized before the pilot",
      input.promotionLedger?.phase3Authorized === false,
      PATHS.promotionLedger,
    );
  } else {
    addPilotExitChecks(add, input);
    const point12 = input.promotionLedger?.steps?.find(
      (candidate) => candidate.id === 12,
    );
    const point13 = input.promotionLedger?.steps?.find(
      (candidate) => candidate.id === 13,
    );
    add(
      "PHASE2B_PILOT_COMPLETED",
      "Promotion point 12 records completed Phase 2B pilot",
      point12?.status === "COMPLETED",
      PATHS.promotionLedger,
    );
    add(
      "PHASE3_GO_APPROVED",
      "Promotion point 13 records approved Phase 3 GO",
      point13?.status === "APPROVED_GO",
      PATHS.promotionLedger,
    );
    add(
      "PHASE3_AUTHORITY_RECORDED",
      "Authoritative promotion ledger records Phase 3 authority",
      input.promotionLedger?.phase3Authorized === true,
      PATHS.promotionLedger,
    );
  }

  const blockers = checks
    .filter((check) => !check.passed)
    .map((check) => check.id);
  const eligible = blockers.length === 0;
  return {
    schemaVersion: 1,
    decisionId: `stoquify-agent-runtime-${target}-entry-2026-07-25`,
    evaluatedAt: (input.now || new Date()).toISOString(),
    target,
    status: eligible
      ? target === "phase2b"
        ? "ELIGIBLE_FOR_PHASE2B_ACTIVATION_REVIEW"
        : "ELIGIBLE_TO_BEGIN_PHASE3_READ_AND_DRAFT"
      : "BLOCKED",
    eligible,
    activationAuthorizedByGate: false,
    phase3AuthorizedByGate: false,
    recordedPhase3AuthorityPresent:
      input.promotionLedger?.phase3Authorized === true,
    summary: {
      checks: checks.length,
      passed: checks.filter((check) => check.passed).length,
      blockers: blockers.length,
      secretValuesPrinted: false,
    },
    checks,
    blockers,
    safety: {
      evidenceMutated: false,
      activationAttempted: false,
      phase3Started: false,
      authorityGrantedByGate: false,
      businessWriteAuthorityAdded: false,
      secretValuesPrinted: false,
    },
  };
}

function addPilotExitChecks(add, input) {
  const register = input.pilotExitRegister;
  add(
    "PILOT_EXIT_STATUS_READY",
    "Pilot exit register is ready for Phase 3 review",
    register?.declaredStatus === "READY_FOR_PHASE3_REVIEW",
    PATHS.pilotExitRegister,
  );
  add(
    "PILOT_RELEASE_BINDING",
    "Pilot exit evidence is bound to commit, artifact, and evidence bundle",
    COMMIT_PATTERN.test(register?.releaseBinding?.commitSha || "") &&
      HASH_PATTERN.test(register?.releaseBinding?.artifactDigest || "") &&
      HASH_PATTERN.test(register?.releaseBinding?.evidenceBundleHash || ""),
    PATHS.pilotExitRegister,
  );
  add(
    "PILOT_SCOPE_AND_ACTIVATION_EVIDENCE",
    "Pilot has activation reference and hashed tenant/role scope",
    nonEmpty(register?.pilot?.activationDecisionReference) &&
      HASH_PATTERN.test(register?.pilot?.allowlistedTenantScopeHash || "") &&
      HASH_PATTERN.test(register?.pilot?.allowlistedRoleScopeHash || ""),
    PATHS.pilotExitRegister,
  );
  const startedAt = validDate(register?.pilot?.startedAt);
  const endedAt = validDate(register?.pilot?.endedAt);
  add(
    "PILOT_OBSERVATION_COMPLETE",
    "Pilot has a bounded completed observation window and successful runs",
    startedAt !== null &&
      endedAt !== null &&
      endedAt > startedAt &&
      Number.isFinite(register?.pilot?.observationWindowHours) &&
      register.pilot.observationWindowHours > 0 &&
      Number.isInteger(register?.pilot?.successfulRunCount) &&
      register.pilot.successfulRunCount > 0 &&
      Number.isInteger(register?.pilot?.failedRunCount) &&
      register.pilot.failedRunCount >= 0,
    PATHS.pilotExitRegister,
  );
  add(
    "PILOT_SAFETY_CLEAN",
    "Pilot records zero authority, tenant, execution, and secret violations",
    register?.safety?.businessWriteAuthorityObserved === false &&
      register?.safety?.crossTenantViolationCount === 0 &&
      register?.safety?.prohibitedExecutionCount === 0 &&
      register?.safety?.secretExposureCount === 0,
    PATHS.pilotExitRegister,
  );
  add(
    "PILOT_OPERATIONS_EVIDENCE",
    "Pilot monitoring, support, rollback, and incident evidence are complete",
    nonEmpty(register?.operations?.monitoringEvidenceReference) &&
      nonEmpty(register?.operations?.supportEvidenceReference) &&
      register?.operations?.rollbackExercisePassed === true &&
      nonEmpty(register?.operations?.rollbackExerciseReference) &&
      nonEmpty(register?.operations?.incidentEvidenceReference),
    PATHS.pilotExitRegister,
  );
  add(
    "PILOT_INCIDENTS_CLEAN",
    "Pilot has zero critical, high, and unresolved incidents",
    register?.incidents?.criticalCount === 0 &&
      register?.incidents?.highCount === 0 &&
      register?.incidents?.unresolvedCount === 0,
    PATHS.pilotExitRegister,
  );
  const approvals = PILOT_APPROVALS.map((key) => register?.approvals?.[key]);
  const approvalActors = approvals
    .map((approval) => approval?.actorDirectoryId)
    .filter(nonEmpty);
  add(
    "PILOT_EXIT_APPROVALS",
    "Product, security, finance-domain, and release approvals are complete",
    approvals.every(
      (approval) =>
        approval?.decision === "APPROVED" &&
        nonEmpty(approval?.actorDirectoryId) &&
        nonEmpty(approval?.approvalReference) &&
        validDate(approval?.decidedAt) !== null,
    ),
    PATHS.pilotExitRegister,
  );
  add(
    "PILOT_APPROVER_SEGREGATION",
    "Pilot exit approvers are four distinct directory identities",
    approvalActors.length === PILOT_APPROVALS.length &&
      new Set(approvalActors).size === PILOT_APPROVALS.length,
    PATHS.pilotExitRegister,
  );
  add(
    "PILOT_PHASE3_RECOMMENDATION",
    "Pilot exit register recommends Phase 3 without self-authorizing it",
    register?.phase3Recommendation === true &&
      register?.phase3Authorized === false,
    PATHS.pilotExitRegister,
  );
}

function collectInput(root) {
  const input = {};
  for (const [key, path] of Object.entries(PATHS)) {
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) {
      throw new Error(`Required promotion evidence is missing: ${path}`);
    }
    input[key] = JSON.parse(readFileSync(absolute, "utf8"));
  }
  return input;
}

function outputPaths(target, options) {
  const label = target === "phase2b" ? "PHASE_2B_ENTRY" : "PHASE_3_ENTRY";
  return {
    jsonOut:
      options.jsonOut ||
      `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_${label}_DECISION_2026-07-25.json`,
    markdownOut:
      options.markdownOut ||
      `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_${label}_DECISION_2026-07-25.md`,
  };
}

function renderMarkdown(result) {
  const targetLabel =
    result.target === "phase2b" ? "Phase 2B Entry" : "Phase 3 Entry";
  const lines = [
    `# Stoquify Agent Runtime ${targetLabel} Decision`,
    "",
    `**Evaluated:** ${result.evaluatedAt}<br>`,
    `**Status:** \`${result.status}\`<br>`,
    `**Eligible:** ${result.eligible ? "Yes" : "No"}<br>`,
    "**Activation authorized by gate:** No<br>",
    "**Phase 3 authorized by gate:** No",
    "",
    "## Decision Boundary",
    "",
    "This read-only gate composes existing authority evidence. It reports eligibility and cannot approve, activate, mutate evidence, or start a phase.",
    "",
    "## Summary",
    "",
    "| Measure | Result |",
    "|---|---:|",
    `| Checks | ${result.summary.checks} |`,
    `| Passed | ${result.summary.passed} |`,
    `| Blockers | ${result.summary.blockers} |`,
    "",
    "## Checks",
    "",
    "| Check | Result | Evidence |",
    "|---|---|---|",
    ...result.checks.map(
      (check) =>
        `| ${check.id} | ${check.passed ? "Passed" : "Blocked"} | ${escapeTable(
          check.evidencePath,
        )} |`,
    ),
    "",
    "## Blockers",
    "",
    ...(result.blockers.length
      ? result.blockers.map((blocker) => `- \`${blocker}\``)
      : [
          "- None. The target is eligible for its separately governed next ceremony.",
        ]),
    "",
    "## Safety",
    "",
    "- No evidence file was mutated by the evaluation.",
    "- No activation was requested or attempted.",
    "- No Phase 3 implementation was started.",
    "- No authority was granted by this gate.",
    "- No secret value was printed.",
    "",
  ];
  return lines.join("\n");
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validDate(value) {
  if (!nonEmpty(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function escapeTable(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function main() {
  const options = parseArgs();
  const root = process.cwd();
  const result = evaluatePromotion(collectInput(root), options.target);
  const paths = outputPaths(options.target, options);
  const jsonOut = resolve(root, paths.jsonOut);
  const markdownOut = resolve(root, paths.markdownOut);
  mkdirSync(dirname(jsonOut), { recursive: true });
  mkdirSync(dirname(markdownOut), { recursive: true });
  writeFileSync(jsonOut, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeFileSync(markdownOut, renderMarkdown(result), "utf8");
  process.stdout.write(
    `${JSON.stringify(
      {
        target: result.target,
        status: result.status,
        eligible: result.eligible,
        checks: result.summary.checks,
        passed: result.summary.passed,
        blockers: result.summary.blockers,
        activationAuthorizedByGate: false,
        phase3AuthorizedByGate: false,
        secretValuesPrinted: false,
        report: paths.markdownOut,
      },
      null,
      2,
    )}\n`,
  );
  if (options.mode === "fail" && !result.eligible) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch {
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        code: "AGENT_PHASE_PROMOTION_GATE_FAILED",
        activationAuthorizedByGate: false,
        phase3AuthorizedByGate: false,
        secretValuesPrinted: false,
      })}\n`,
    );
    process.exitCode = 1;
  }
}

module.exports = {
  PATHS,
  PHASE2B_EXPECTED_STEPS,
  PILOT_APPROVALS,
  collectInput,
  evaluatePromotion,
  outputPaths,
  parseArgs,
  renderMarkdown,
};
