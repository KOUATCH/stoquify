#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const {
  evaluateRotationRegister,
} = require("./agent-credential-rotation-gate");
const {
  evaluateOperationalReleaseRegister,
  sha256Prefixed,
} = require("./agent-operational-release-gate");

const DEFAULT_MARKDOWN_OUT = "what-next/enterprise-release-blocker-status.md";
const DEFAULT_JSON_OUT = "what-next/enterprise-release-blocker-status.json";

const EVIDENCE_PATHS = Object.freeze({
  build: "what-next/build-diagnostics/enterprise-unblocking-b01/summary.json",
  immutability: "what-next/payroll/payroll-immutability-runtime-check.json",
  migrationPreflight:
    "what-next/blocker-execution/prisma-migration-production-preflight-2026-07-27.json",
  migrationHistory: "what-next/prisma-migration-history-health.json",
  secrets: "what-next/release-secret-preflight.json",
  review: "what-next/statutory-country-pack-review-preflight.json",
  statutory: "what-next/statutory-country-pack-production-readiness.json",
  credential:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json",
  operational:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_OPERATIONAL_RELEASE_EVIDENCE_2026-07-25.json",
  freeze:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_FREEZE_COMMIT_ATTESTATION_2026-07-25.json",
  phase2b:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2B_ENTRY_DECISION_2026-07-25.json",
  phase3:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_3_ENTRY_DECISION_2026-07-25.json",
  external:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUT_READINESS_2026-07-25.json",
  intervention:
    "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_HUMAN_INTERVENTION_PLAN_2026-07-25.json",
});

const BLOCKER_META = Object.freeze({
  B01: {
    title: "Application production build",
    blockedStatus: "ENGINEERING_BLOCKED",
    nextAction:
      "Repair the application build and capture a successful diagnostic build.",
  },
  B02: {
    title: "Payroll immutability runtime proof",
    blockedStatus: "ENGINEERING_BLOCKED",
    nextAction:
      "Restore the dedicated database proof and rerun payroll immutability.",
  },
  B03: {
    title: "Production database target and migration history",
    blockedStatus: "BLOCKED_EXTERNAL_CONFIG",
    nextAction:
      "Provision the approved production target, deploy, and pass direct history health.",
  },
  B04: {
    title: "Managed production release secrets",
    blockedStatus: "BLOCKED_EXTERNAL_CONFIG",
    nextAction:
      "Provision the three independent managed release secrets and rerun release preflight.",
  },
  B05: {
    title: "Cameroon source-artifact hash binding",
    blockedStatus: "REQUIRES_EXPERT_REVIEW",
    nextAction:
      "Return independently recomputed and checker-verified source hashes.",
  },
  B06: {
    title: "Cameroon qualified expert approval",
    blockedStatus: "REQUIRES_EXPERT_REVIEW",
    nextAction:
      "Return the authentic signed expert decision and separate checker verification.",
  },
  B07: {
    title: "Credential rotation and revocation",
    blockedStatus: "BLOCKED_DEPENDENCY",
    nextAction:
      "After stable managed references exist, complete all credential dispositions and evidence.",
  },
  B08: {
    title: "Operational release evidence",
    blockedStatus: "BLOCKED_DEPENDENCY",
    nextAction:
      "Complete owner, scheduler, alert, CI, governance, and credential evidence.",
  },
  B09: {
    title: "Clean immutable release freeze",
    blockedStatus: "WAIT_FOR_STABLE_TREE",
    nextAction:
      "After B01-B08 pass, cut a clean candidate and create a new immutable freeze.",
  },
  B10: {
    title: "Governance approvals and ownership",
    blockedStatus: "BLOCKED_DEPENDENCY",
    nextAction:
      "Bind real product/security approvals and six accepted owner assignments to the freeze.",
  },
  B11: {
    title: "Phase 2B entry",
    blockedStatus: "BLOCKED_DEPENDENCY",
    nextAction: "After B01-B10 and gate 017 GO, rerun the 23-check entry gate.",
  },
  B12: {
    title: "Phase 3 production decision",
    blockedStatus: "NOT_STARTED",
    nextAction:
      "After a successful pilot, obtain the artifact-bound 34-check Phase 3 decision.",
  },
});

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") options.root = path.resolve(argv[++index]);
    else if (value === "--mode") options.mode = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else throw new Error("Unknown argument: " + value);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Unsupported mode: " + options.mode);
  }
  return options;
}

function loadEvidence(root, overrides = {}) {
  const documents = {};
  const buffers = {};
  const errors = [];

  for (const [key, relativePath] of Object.entries(EVIDENCE_PATHS)) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      documents[key] = overrides[key];
      buffers[key] = Buffer.from(JSON.stringify(overrides[key] ?? null));
      continue;
    }
    const target = path.resolve(root, relativePath);
    if (!fs.existsSync(target)) {
      documents[key] = null;
      buffers[key] = null;
      errors.push(`${key}:evidence_missing`);
      continue;
    }
    try {
      const buffer = fs.readFileSync(target);
      buffers[key] = buffer;
      documents[key] = JSON.parse(buffer.toString("utf8"));
    } catch {
      documents[key] = null;
      buffers[key] = null;
      errors.push(`${key}:evidence_unparseable`);
    }
  }

  return { documents, buffers, errors };
}

function blocker(id, ready, facts = [], blockers = []) {
  const meta = BLOCKER_META[id];
  return {
    id,
    title: meta.title,
    ready,
    status: ready ? "READY" : meta.blockedStatus,
    facts,
    blockers: [...new Set(blockers)],
    nextAction: ready
      ? "Preserve and bind this evidence to the final candidate."
      : meta.nextAction,
  };
}

function allChecksPassed(document) {
  return (
    Array.isArray(document?.checks) &&
    document.checks.length > 0 &&
    document.checks.every(
      (check) => check.passed === true || check.ready === true,
    )
  );
}

function evaluateCredentials(evidence, options) {
  if (options.credentialEvaluation) return options.credentialEvaluation;
  if (!evidence.documents.credential) {
    return {
      ready: false,
      status: "BLOCKED",
      blockerCount: 1,
      blockers: ["credential:evidence_missing"],
    };
  }
  try {
    return evaluateRotationRegister(evidence.documents.credential);
  } catch {
    return {
      ready: false,
      status: "BLOCKED",
      blockerCount: 1,
      blockers: ["credential:evaluation_failed"],
    };
  }
}

function evaluateOperations(evidence, credentialEvaluation, options) {
  if (options.operationalEvaluation) return options.operationalEvaluation;
  if (
    !evidence.documents.operational ||
    !evidence.documents.credential ||
    !evidence.buffers.credential
  ) {
    return {
      ready: false,
      status: "BLOCKED",
      blockerCount: 1,
      blockers: ["operational:evidence_missing"],
    };
  }
  try {
    return evaluateOperationalReleaseRegister(evidence.documents.operational, {
      credentialRegister: evidence.documents.credential,
      credentialRegisterSha256: sha256Prefixed(evidence.buffers.credential),
    });
  } catch {
    return {
      ready: false,
      status: "BLOCKED",
      blockerCount: 1,
      blockers: ["operational:evaluation_failed"],
    };
  }
}

function buildEnterpriseBlockerStatus(root = process.cwd(), options = {}) {
  const evidence = loadEvidence(root, options.documents || {});
  const d = evidence.documents;
  const credential = evaluateCredentials(evidence, options);
  const operational = evaluateOperations(evidence, credential, options);

  const b01Ready =
    d.build?.status === "passed" &&
    d.build?.exitCode === 0 &&
    d.build?.timedOut === false;
  const b02Ready =
    d.immutability?.status === "ready" &&
    d.immutability?.summary?.presentTriggers === 9 &&
    d.immutability?.summary?.requiredTriggers === 9 &&
    d.immutability?.summary?.blockedMutations === 14 &&
    d.immutability?.summary?.allowedLifecycleMutations === 3 &&
    d.immutability?.summary?.blockerCount === 0;
  const b03Ready =
    d.migrationPreflight?.summary?.status === "ready" &&
    d.migrationPreflight?.deployment?.databaseConfigured === true &&
    d.migrationPreflight?.deployment?.databaseTargetSafe === true &&
    d.migrationHistory?.summary?.status === "ready" &&
    d.migrationHistory?.database?.targetClass === "remote" &&
    d.migrationHistory?.summary?.readyCount ===
      d.migrationHistory?.summary?.checkCount;
  const b04Ready =
    d.secrets?.summary?.status === "ready" &&
    d.secrets?.summary?.releaseEnforced === true &&
    d.secrets?.summary?.readyCount === 8 &&
    d.secrets?.summary?.checkCount === 8 &&
    d.secrets?.summary?.secretValuePrinted === false;
  const b05Ready =
    d.statutory?.sourceEvidence?.hashesVerified === true &&
    d.statutory?.sourceEvidence?.declaredSourceHashCount === 7 &&
    d.statutory?.sourceEvidence?.validDeclaredSourceHashCount === 7 &&
    d.statutory?.sourceEvidence?.boundDeclaredSourceHashCount === 7;
  const b06Ready =
    allChecksPassed(d.review) &&
    (d.review?.blockers?.length || 0) === 0 &&
    d.statutory?.sourceEvidence?.approvalArtifactVerified === true &&
    d.statutory?.sourceEvidence?.expertApprovalComplete === true &&
    d.statutory?.summary?.status === "ready";
  const b07Ready = credential.ready === true && credential.blockerCount === 0;
  const b08Ready = operational.ready === true && operational.blockerCount === 0;
  const b09Ready =
    d.freeze?.status === "FROZEN_COMMIT_VERIFIED" &&
    d.freeze?.freezeVerified === true &&
    d.freeze?.cleanReleaseReady === true &&
    d.freeze?.sourceTreeClean === true &&
    d.freeze?.summary?.contentMismatches === 0 &&
    d.freeze?.summary?.phase2aRuntimeDrift === 0;
  const governanceBlockers = (operational.blockers || []).filter((code) =>
    /^(?:approvals|owners):/i.test(code),
  );
  const b10Ready = b09Ready && governanceBlockers.length === 0;
  const b11Ready =
    d.phase2b?.eligible === true &&
    d.phase2b?.summary?.passed === 23 &&
    d.phase2b?.summary?.checks === 23 &&
    d.phase2b?.summary?.blockers === 0;
  const b12Ready =
    d.phase3?.eligible === true &&
    d.phase3?.recordedPhase3AuthorityPresent === true &&
    d.phase3?.summary?.passed === 34 &&
    d.phase3?.summary?.checks === 34 &&
    d.phase3?.summary?.blockers === 0;

  const blockers = [
    blocker(
      "B01",
      b01Ready,
      [
        `buildStatus=${d.build?.status || "missing"}`,
        `buildExitCode=${d.build?.exitCode ?? "missing"}`,
      ],
      b01Ready ? [] : ["build_not_verified"],
    ),
    blocker(
      "B02",
      b02Ready,
      [
        `triggers=${d.immutability?.summary?.presentTriggers ?? 0}/9`,
        `blockedMutations=${d.immutability?.summary?.blockedMutations ?? 0}/14`,
      ],
      b02Ready ? [] : ["payroll_immutability_not_verified"],
    ),
    blocker(
      "B03",
      b03Ready,
      [
        `preflight=${d.migrationPreflight?.summary?.readyCount ?? 0}/${d.migrationPreflight?.summary?.checkCount ?? 0}`,
        `history=${d.migrationHistory?.summary?.readyCount ?? 0}/${d.migrationHistory?.summary?.checkCount ?? 0}`,
        `historyTarget=${d.migrationHistory?.database?.targetClass || "missing"}`,
      ],
      [
        ...(d.migrationPreflight?.blockers || ["migration_preflight_missing"]),
        ...(b03Ready ? [] : ["remote_post_deploy_history_health_required"]),
      ],
    ),
    blocker(
      "B04",
      b04Ready,
      [
        `secretChecks=${d.secrets?.summary?.readyCount ?? 0}/${d.secrets?.summary?.checkCount ?? 0}`,
      ],
      d.secrets?.blockers || ["release_secret_preflight_missing"],
    ),
    blocker(
      "B05",
      b05Ready,
      [
        `sourceHashes=${d.statutory?.sourceEvidence?.boundDeclaredSourceHashCount ?? 0}/7`,
      ],
      b05Ready ? [] : ["source_artifact_hash_verification"],
    ),
    blocker(
      "B06",
      b06Ready,
      [
        `reviewChecks=${(d.review?.checks || []).filter((check) => check.passed).length}/${d.review?.checks?.length || 0}`,
        `approvalArtifactVerified=${d.statutory?.sourceEvidence?.approvalArtifactVerified === true}`,
      ],
      [
        ...(d.review?.blockers || ["qualified_review_missing"]),
        ...(b06Ready ? [] : ["source_artifact_expert_approval"]),
      ],
    ),
    blocker(
      "B07",
      b07Ready,
      [
        `credentialStatus=${credential.status || "missing"}`,
        `credentialBlockers=${credential.blockerCount ?? 1}`,
      ],
      credential.blockers || ["credential_evaluation_missing"],
    ),
    blocker(
      "B08",
      b08Ready,
      [
        `operationalStatus=${operational.status || "missing"}`,
        `operationalBlockers=${operational.blockerCount ?? 1}`,
      ],
      operational.blockers || ["operational_evaluation_missing"],
    ),
    blocker(
      "B09",
      b09Ready,
      [
        `freezeStatus=${d.freeze?.status || "missing"}`,
        `verifiedFiles=${d.freeze?.summary?.verifiedFiles ?? 0}/${d.freeze?.summary?.manifestFiles ?? 0}`,
        `runtimeDrift=${d.freeze?.summary?.phase2aRuntimeDrift ?? "missing"}`,
      ],
      d.freeze?.blockers || ["freeze_evidence_missing"],
    ),
    blocker(
      "B10",
      b10Ready,
      [
        `governanceBlockers=${governanceBlockers.length}`,
        `freezeReady=${b09Ready}`,
      ],
      [
        ...governanceBlockers,
        ...(b09Ready ? [] : ["clean_freeze_required_before_approval"]),
      ],
    ),
    blocker(
      "B11",
      b11Ready,
      [
        `phase2b=${d.phase2b?.summary?.passed ?? 0}/${d.phase2b?.summary?.checks ?? 0}`,
        `eligible=${d.phase2b?.eligible === true}`,
      ],
      d.phase2b?.blockers || ["phase2b_evidence_missing"],
    ),
    blocker(
      "B12",
      b12Ready,
      [
        `phase3=${d.phase3?.summary?.passed ?? 0}/${d.phase3?.summary?.checks ?? 0}`,
        `eligible=${d.phase3?.eligible === true}`,
      ],
      d.phase3?.blockers || ["phase3_evidence_missing"],
    ),
  ];

  const readyCount = blockers.filter((item) => item.ready).length;
  const allReady =
    readyCount === blockers.length && evidence.errors.length === 0;
  const nextActions = blockers
    .filter((item) => !item.ready)
    .map((item) => ({ id: item.id, action: item.nextAction }));

  return {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    status: allReady ? "READY_FOR_AUTHORIZED_PROMOTION_DECISION" : "BLOCKED",
    releasePosture: allReady
      ? "AWAIT_AUTHORIZED_PROMOTION_DECISION"
      : "DEVELOPMENT_CONTINUES_PILOT_AND_PRODUCTION_FAIL_CLOSED",
    summary: {
      blockerCount: blockers.length,
      readyCount,
      openCount: blockers.length - readyCount,
      evidenceErrorCount: evidence.errors.length,
      externalInputChecksPassed: d.external?.summary?.passed ?? 0,
      externalInputChecks: d.external?.summary?.checks ?? 0,
      externalInputBlockers: d.external?.summary?.blockers ?? 0,
      humanInterventionsRequired:
        d.intervention?.summary?.humanInterventionRequired ?? 0,
      secretValuesPrinted: false,
    },
    decisions: {
      readyToFreeze: blockers.slice(0, 8).every((item) => item.ready),
      readyToRequestGate017: blockers.slice(0, 10).every((item) => item.ready),
      readyForPhase2bReview: b11Ready,
      readyForPhase3Review: b12Ready,
      activationAuthorizedByThisGate: false,
    },
    blockers,
    evidenceErrors: evidence.errors,
    nextActions,
    evidencePaths: EVIDENCE_PATHS,
    safety: {
      evidenceMutated: false,
      externalAuthorityInferred: false,
      approvalInferred: false,
      activationAttempted: false,
      secretValuesPrinted: false,
    },
  };
}

function renderMarkdown(report) {
  const rows = report.blockers.map(
    (item) =>
      `| ${item.id} | ${item.ready ? "Ready" : "Blocked"} | ${item.status} | ${item.facts.join("; ")} | ${item.nextAction} |`,
  );
  return [
    "# Enterprise Release Blocker Status",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: \`${report.status}\``,
    `Release posture: \`${report.releasePosture}\``,
    "",
    "## Summary",
    "",
    `- Blockers ready: ${report.summary.readyCount}/${report.summary.blockerCount}`,
    `- Open blockers: ${report.summary.openCount}`,
    `- Evidence errors: ${report.summary.evidenceErrorCount}`,
    `- External-input checks: ${report.summary.externalInputChecksPassed}/${report.summary.externalInputChecks}`,
    `- External-input blockers: ${report.summary.externalInputBlockers}`,
    `- Human interventions required: ${report.summary.humanInterventionsRequired}`,
    "- Activation authorized by this gate: no",
    "- Secret values printed: no",
    "",
    "## Decisions",
    "",
    `- Ready to freeze: ${report.decisions.readyToFreeze ? "yes" : "no"}`,
    `- Ready to request gate 017: ${report.decisions.readyToRequestGate017 ? "yes" : "no"}`,
    `- Ready for Phase 2B review: ${report.decisions.readyForPhase2bReview ? "yes" : "no"}`,
    `- Ready for Phase 3 review: ${report.decisions.readyForPhase3Review ? "yes" : "no"}`,
    "",
    "## B01-B12",
    "",
    "| ID | Gate | Status | Evidence facts | Next action |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    "## Evidence errors",
    "",
    ...(report.evidenceErrors.length
      ? report.evidenceErrors.map((error) => `- ${error}`)
      : ["- None"]),
    "",
    "## Safety boundary",
    "",
    "- This synthesizer is read-only and does not mutate source evidence.",
    "- It never infers approvals, external authority, or activation from placeholders.",
    "- A fully ready report still requires a separately authorized promotion decision.",
    "",
  ].join("\n");
}

function wait(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
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
      if (attempt < attempts) wait(500 * attempt);
    }
  }
  throw lastError;
}

function writeReport(root, options, report) {
  writeWithRetry(path.resolve(root, options.out), renderMarkdown(report));
  writeWithRetry(
    path.resolve(root, options.jsonOut),
    JSON.stringify(report, null, 2) + "\n",
  );
}

function gateResultForReport(report, mode = "report") {
  return {
    status: report.status,
    exitCode: mode === "fail" && report.status === "BLOCKED" ? 1 : 0,
  };
}

if (require.main === module) {
  try {
    const options = parseArgs();
    const root = path.resolve(options.root);
    const report = buildEnterpriseBlockerStatus(root, options);
    writeReport(root, options, report);
    console.log(renderMarkdown(report));
    process.exitCode = gateResultForReport(report, options.mode).exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  BLOCKER_META,
  EVIDENCE_PATHS,
  buildEnterpriseBlockerStatus,
  gateResultForReport,
  loadEvidence,
  parseArgs,
  renderMarkdown,
};
