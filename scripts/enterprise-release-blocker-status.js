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
const PRIOR_RELEASE_AGGREGATE_PATH = DEFAULT_JSON_OUT;
const IMMUTABILITY_PROOF_DIRECTORY = "what-next/payroll";
const IMMUTABILITY_CANONICAL_FILE = "payroll-immutability-runtime-check.json";
const IMMUTABILITY_DIRECT_FILE_PATTERN =
  /^payroll-immutability-runtime-check-run-\d+\.json$/;
const EXPECTED_IMMUTABILITY_COUNTS = Object.freeze({
  triggers: 9,
  blockedMutations: 14,
  allowedLifecycleMutations: 3,
});

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
      "Run the isolated PostgreSQL payroll immutability proof and attach its direct evidence.",
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
    if (key === "immutability") {
      documents[key] = null;
      buffers[key] = null;
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

function parseEvidenceTime(value) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isIsolatedDatabaseName(value) {
  return (
    typeof value === "string" &&
    /(?:test|testing|immutability|isolated|development|dev|local)/i.test(value)
  );
}

function immutableProofEvaluation(document) {
  const summary = document?.summary || {};
  const triggers = Array.isArray(document?.triggers) ? document.triggers : [];
  const blockedChecks = Array.isArray(document?.blockedChecks)
    ? document.blockedChecks
    : [];
  const allowedChecks = Array.isArray(document?.allowedChecks)
    ? document.allowedChecks
    : [];
  const blockers = [];

  if (document?.status !== "ready") blockers.push("proof_status_not_ready");
  if (document?.mode !== "fail") blockers.push("proof_not_release_enforced");
  if (!parseEvidenceTime(document?.generatedAt)) {
    blockers.push("proof_generated_at_invalid");
  }
  if (!isIsolatedDatabaseName(document?.safety?.dbName)) {
    blockers.push("proof_database_not_isolated");
  }
  if (
    typeof document?.safety?.host !== "string" ||
    document.safety.host.trim().length === 0
  ) {
    blockers.push("proof_database_host_missing");
  }
  if (
    summary.requiredTriggers !== EXPECTED_IMMUTABILITY_COUNTS.triggers ||
    summary.presentTriggers !== EXPECTED_IMMUTABILITY_COUNTS.triggers ||
    triggers.length !== EXPECTED_IMMUTABILITY_COUNTS.triggers ||
    triggers.some((trigger) => trigger?.present !== true)
  ) {
    blockers.push("proof_trigger_catalog_incomplete");
  }
  if (
    summary.expectedBlockedMutations !==
      EXPECTED_IMMUTABILITY_COUNTS.blockedMutations ||
    summary.blockedMutations !==
      EXPECTED_IMMUTABILITY_COUNTS.blockedMutations ||
    blockedChecks.length !== EXPECTED_IMMUTABILITY_COUNTS.blockedMutations ||
    blockedChecks.some((check) => check?.passed !== true)
  ) {
    blockers.push("proof_forbidden_mutations_not_blocked");
  }
  if (
    summary.expectedAllowedLifecycleMutations !==
      EXPECTED_IMMUTABILITY_COUNTS.allowedLifecycleMutations ||
    summary.allowedLifecycleMutations !==
      EXPECTED_IMMUTABILITY_COUNTS.allowedLifecycleMutations ||
    allowedChecks.length !==
      EXPECTED_IMMUTABILITY_COUNTS.allowedLifecycleMutations ||
    allowedChecks.some((check) => check?.passed !== true)
  ) {
    blockers.push("proof_allowed_lifecycle_not_verified");
  }
  if (summary.blockerCount !== 0 || (document?.blockers?.length || 0) !== 0) {
    blockers.push("proof_reports_runtime_blockers");
  }

  return {
    ready: blockers.length === 0,
    blockers: [...new Set(blockers)],
  };
}

function candidateFromDocument(document, sourcePath, sourceKind, buffer) {
  const encoded = buffer || Buffer.from(JSON.stringify(document ?? null));
  const evaluation = immutableProofEvaluation(document);
  return {
    document,
    sourcePath,
    sourceKind,
    buffer: encoded,
    sha256: sha256Prefixed(encoded),
    generatedAt: document?.generatedAt || null,
    generatedAtMs: parseEvidenceTime(document?.generatedAt),
    evaluation,
  };
}

function loadImmutabilityCandidates(root, evidence, options = {}) {
  if (Array.isArray(options.immutabilityCandidates)) {
    return options.immutabilityCandidates.map((candidate, index) =>
      candidateFromDocument(
        candidate.document,
        candidate.sourcePath || `supplied-immutability-proof-${index + 1}`,
        candidate.sourceKind || "supplied_runtime_proof",
        candidate.buffer,
      ),
    );
  }

  if (
    options.documents &&
    Object.prototype.hasOwnProperty.call(options.documents, "immutability")
  ) {
    return [
      candidateFromDocument(
        evidence.documents.immutability,
        EVIDENCE_PATHS.immutability,
        "supplied_runtime_proof",
        evidence.buffers.immutability,
      ),
    ];
  }

  const directory = path.resolve(root, IMMUTABILITY_PROOF_DIRECTORY);
  let names = [];
  try {
    names = fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter(
        (name) =>
          name === IMMUTABILITY_CANONICAL_FILE ||
          IMMUTABILITY_DIRECT_FILE_PATTERN.test(name),
      );
  } catch {
    evidence.errors.push("immutability:evidence_directory_missing");
    return [];
  }

  const candidates = [];
  for (const name of names.sort()) {
    const sourcePath = path
      .join(IMMUTABILITY_PROOF_DIRECTORY, name)
      .replace(/\\/g, "/");
    try {
      const buffer = fs.readFileSync(path.resolve(root, sourcePath));
      const document = JSON.parse(buffer.toString("utf8"));
      candidates.push(
        candidateFromDocument(
          document,
          sourcePath,
          IMMUTABILITY_DIRECT_FILE_PATTERN.test(name)
            ? "direct_isolated_postgresql_proof"
            : "canonical_runtime_proof",
          buffer,
        ),
      );
    } catch {
      evidence.errors.push(`immutability:${sourcePath}:evidence_unparseable`);
    }
  }

  if (candidates.length === 0) {
    evidence.errors.push("immutability:evidence_missing");
  }
  return candidates;
}

function loadPriorReleaseAggregate(root, options = {}) {
  if (Object.prototype.hasOwnProperty.call(options, "priorReleaseAggregate")) {
    return options.priorReleaseAggregate;
  }
  if (options.documents) return null;
  try {
    return JSON.parse(
      fs.readFileSync(path.resolve(root, PRIOR_RELEASE_AGGREGATE_PATH), "utf8"),
    );
  } catch {
    return null;
  }
}

function priorImmutabilityState(aggregate) {
  const gate = Array.isArray(aggregate?.blockers)
    ? aggregate.blockers.find((item) => item?.id === "B02")
    : null;
  if (!gate || typeof gate.ready !== "boolean") return null;
  return {
    generatedAt: aggregate.generatedAt || null,
    generatedAtMs: parseEvidenceTime(aggregate.generatedAt),
    ready: gate.ready,
    status: gate.status || null,
  };
}

function evaluateImmutabilityEvidence(root, evidence, options = {}) {
  const candidates = loadImmutabilityCandidates(root, evidence, options);
  const ranked = [...candidates].sort((left, right) => {
    const timeDifference =
      (right.generatedAtMs ?? Number.NEGATIVE_INFINITY) -
      (left.generatedAtMs ?? Number.NEGATIVE_INFINITY);
    if (timeDifference !== 0) return timeDifference;
    if (left.sourceKind === right.sourceKind) {
      return left.sourcePath.localeCompare(right.sourcePath);
    }
    return left.sourceKind === "direct_isolated_postgresql_proof" ? -1 : 1;
  });
  const selected = ranked[0] || null;
  const prior = priorImmutabilityState(
    loadPriorReleaseAggregate(root, options),
  );
  const conflictingCandidates = selected
    ? ranked.filter(
        (candidate) =>
          candidate !== selected &&
          candidate.evaluation.ready !== selected.evaluation.ready,
      )
    : [];
  const aggregateConflict = Boolean(
    selected && prior && prior.ready !== selected.evaluation.ready,
  );
  const staleAggregateInvalidated = Boolean(
    aggregateConflict &&
    selected.generatedAtMs !== null &&
    prior?.generatedAtMs !== null &&
    selected.generatedAtMs > prior.generatedAtMs,
  );

  return {
    document: selected?.document || null,
    ready: selected?.evaluation.ready === true,
    blockers: selected?.evaluation.blockers || [
      "payroll_immutability_not_verified",
    ],
    provenance: {
      selectedSource: selected?.sourcePath || null,
      sourceKind: selected?.sourceKind || null,
      generatedAt: selected?.generatedAt || null,
      sha256: selected?.sha256 || null,
      claimScope: "ISOLATED_NON_PRODUCTION_POSTGRESQL_RUNTIME_CONTROL",
      productionDatabaseVerifiedByThisProof: false,
      productionReleaseAuthorizedByThisProof: false,
      candidateCount: ranked.length,
      conflictingCandidateCount: conflictingCandidates.length,
      supersededSources: ranked.slice(1).map((candidate) => ({
        source: candidate.sourcePath,
        generatedAt: candidate.generatedAt,
        ready: candidate.evaluation.ready,
      })),
      priorAggregate: prior,
      aggregateConflictDetected: aggregateConflict,
      staleAggregateInvalidated,
      precedence:
        "Newest direct runtime evidence wins by evidence generatedAt; derived release aggregates never override their source proof.",
    },
  };
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
  const immutability = evaluateImmutabilityEvidence(root, evidence, options);
  d.immutability = immutability.document;
  const credential = evaluateCredentials(evidence, options);
  const operational = evaluateOperations(evidence, credential, options);

  const b01Ready =
    d.build?.status === "passed" &&
    d.build?.exitCode === 0 &&
    d.build?.timedOut === false;
  const b02Ready = immutability.ready;
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
        `proofScope=${immutability.provenance.claimScope}`,
        `proofSource=${immutability.provenance.selectedSource || "missing"}`,
        `proofGeneratedAt=${immutability.provenance.generatedAt || "missing"}`,
        `triggers=${d.immutability?.summary?.presentTriggers ?? 0}/${d.immutability?.summary?.requiredTriggers ?? EXPECTED_IMMUTABILITY_COUNTS.triggers}`,
        `blockedMutations=${d.immutability?.summary?.blockedMutations ?? 0}/${d.immutability?.summary?.expectedBlockedMutations ?? EXPECTED_IMMUTABILITY_COUNTS.blockedMutations}`,
        `allowedLifecycle=${d.immutability?.summary?.allowedLifecycleMutations ?? 0}/${d.immutability?.summary?.expectedAllowedLifecycleMutations ?? EXPECTED_IMMUTABILITY_COUNTS.allowedLifecycleMutations}`,
        `staleAggregateInvalidated=${immutability.provenance.staleAggregateInvalidated}`,
      ],
      b02Ready ? [] : immutability.blockers,
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
  const countryPackEvidenceReady = b05Ready && b06Ready;
  const operatorEvidenceReady = b07Ready && b08Ready && b09Ready && b10Ready;
  const nextActions = blockers
    .filter((item) => !item.ready)
    .map((item) => ({ id: item.id, action: item.nextAction }));

  return {
    schemaVersion: "1.1",
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
    claims: {
      payrollImmutability: {
        status: b02Ready
          ? "ISOLATED_POSTGRESQL_RUNTIME_CONTROL_VERIFIED"
          : "NOT_VERIFIED",
        scope: immutability.provenance.claimScope,
        productionDatabaseVerified: false,
        productionReleaseAuthorized: false,
      },
      countryPackProduction: {
        status: countryPackEvidenceReady
          ? "EVIDENCE_READY_FOR_RELEASE_REVIEW"
          : "FAIL_CLOSED",
        gateIds: ["B05", "B06"],
        productionUseAuthorized: false,
      },
      operatorReadiness: {
        status: operatorEvidenceReady
          ? "EVIDENCE_READY_FOR_RELEASE_REVIEW"
          : "FAIL_CLOSED",
        gateIds: ["B07", "B08", "B09", "B10"],
        productionOperationAuthorized: false,
      },
      overallRelease: {
        status: allReady ? "AWAIT_AUTHORIZED_PROMOTION_DECISION" : "NOT_READY",
        activationAuthorized: false,
      },
    },
    blockers,
    evidenceErrors: evidence.errors,
    nextActions,
    evidencePaths: EVIDENCE_PATHS,
    evidenceProvenance: {
      immutability: immutability.provenance,
    },
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
    "## Claim semantics",
    "",
    `- Payroll immutability: \`${report.claims.payrollImmutability.status}\` within \`${report.claims.payrollImmutability.scope}\`.`,
    "- This proof does not verify the production database and does not authorize production release.",
    `- Country-pack production evidence: \`${report.claims.countryPackProduction.status}\` (B05-B06 remain independent).`,
    `- Operator readiness evidence: \`${report.claims.operatorReadiness.status}\` (B07-B10 remain independent).`,
    `- Overall release claim: \`${report.claims.overallRelease.status}\`; activation authorized: no.`,
    "",
    "## Payroll immutability evidence provenance",
    "",
    `- Selected source: \`${report.evidenceProvenance.immutability.selectedSource || "missing"}\``,
    `- Source kind: \`${report.evidenceProvenance.immutability.sourceKind || "missing"}\``,
    `- Evidence generated: ${report.evidenceProvenance.immutability.generatedAt || "missing"}`,
    `- Evidence digest: \`${report.evidenceProvenance.immutability.sha256 || "missing"}\``,
    `- Stale conflicting aggregate invalidated: ${report.evidenceProvenance.immutability.staleAggregateInvalidated ? "yes" : "no"}`,
    `- Precedence: ${report.evidenceProvenance.immutability.precedence}`,
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
