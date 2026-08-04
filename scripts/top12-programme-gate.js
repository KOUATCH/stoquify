#!/usr/bin/env node

const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const {
  collectInput,
  evaluatePromotion,
} = require("./agent-phase-promotion-gate");

const DEFAULT_MANIFEST =
  "docs/stoquify-skills-agents/execution/top12-programme-status.json";
const CAPABILITY_IDS = Array.from({ length: 12 }, (_, index) =>
  `C${String(index + 1).padStart(2, "0")}`,
);
const FOUNDATION_IDS = ["F-A", "F-B", "F-C", "F-D", "F-E", "F-F", "F-G"];
const AUTONOMY_ORDER = ["L0", "L1", "L2", "L3", "L4"];
const WORK_ITEM_STATES = [
  "COMPLETE",
  "IN_PROGRESS",
  "EXTERNAL_INPUT_BLOCKED",
  "PENDING",
];

function parseArgs(argv = process.argv.slice(2)) {
  const options = { manifest: DEFAULT_MANIFEST, mode: "report" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--manifest") options.manifest = argv[++index];
    else if (value === "--mode") options.mode = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.");
  }
  return options;
}

function parseRoadmapWorkItems(markdown) {
  const items = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(
      /^\|\s*([A-Z0-9]+-\d{3})\s*\|\s*([^|]+)\|\s*([^|]+)\|/,
    );
    if (!match) continue;
    const dependencies = match[3]
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value && value !== "—" && value !== "-");
    items.set(match[1], {
      id: match[1],
      title: match[2].trim(),
      dependencies,
    });
  }
  return items;
}

function findCycles(items) {
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(id, path) {
    if (visiting.has(id)) {
      cycles.push([...path.slice(path.indexOf(id)), id]);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const item = items.get(id);
    for (const dependency of item?.dependencies || []) {
      if (items.has(dependency)) visit(dependency, [...path, dependency]);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of items.keys()) visit(id, [id]);
  return cycles;
}

function validateProgramme({ manifest, roadmapMarkdown, root = process.cwd() }) {
  const errors = [];
  const warnings = [];
  const workItems = parseRoadmapWorkItems(roadmapMarkdown);
  const capabilityIds = manifest.capabilities?.map((item) => item.id) || [];
  const foundationIds = manifest.foundations?.map((item) => item.id) || [];

  if (manifest.schemaVersion !== 1) errors.push("SCHEMA_VERSION_INVALID");
  if (manifest.decision !== "CONDITIONAL_GO_DEVELOPMENT_ONLY") {
    errors.push("DECISION_BOUNDARY_INVALID");
  }
  if (JSON.stringify(capabilityIds) !== JSON.stringify(CAPABILITY_IDS)) {
    errors.push("CAPABILITY_SET_INVALID");
  }
  if (JSON.stringify(foundationIds) !== JSON.stringify(FOUNDATION_IDS)) {
    errors.push("FOUNDATION_SET_INVALID");
  }
  if (workItems.size !== 63) errors.push(`WBS_COUNT_INVALID:${workItems.size}`);

  const maxAutonomy = AUTONOMY_ORDER.indexOf(manifest.policy?.maximumAutonomy);
  if (maxAutonomy < 0 || maxAutonomy > AUTONOMY_ORDER.indexOf("L2")) {
    errors.push("AUTONOMY_CEILING_INVALID");
  }
  for (const capability of manifest.capabilities || []) {
    const autonomy = AUTONOMY_ORDER.indexOf(capability.autonomy);
    if (autonomy < 0 || autonomy > maxAutonomy) {
      errors.push(`CAPABILITY_AUTONOMY_INVALID:${capability.id}`);
    }
    for (const dependency of capability.hardDependencies || []) {
      if (
        !CAPABILITY_IDS.includes(dependency) &&
        !FOUNDATION_IDS.includes(dependency)
      ) {
        errors.push(`CAPABILITY_DEPENDENCY_UNKNOWN:${capability.id}:${dependency}`);
      }
    }
  }

  const stateByWorkItem = new Map();
  for (const state of WORK_ITEM_STATES) {
    for (const id of manifest.workItemStates?.[state] || []) {
      if (stateByWorkItem.has(id)) errors.push(`WBS_STATE_DUPLICATE:${id}`);
      stateByWorkItem.set(id, state);
    }
  }
  for (const id of workItems.keys()) {
    if (!stateByWorkItem.has(id)) errors.push(`WBS_STATE_MISSING:${id}`);
  }
  for (const id of stateByWorkItem.keys()) {
    if (!workItems.has(id)) errors.push(`WBS_STATE_UNKNOWN:${id}`);
  }
  for (const item of workItems.values()) {
    for (const dependency of item.dependencies) {
      if (!workItems.has(dependency)) {
        errors.push(`WBS_DEPENDENCY_UNKNOWN:${item.id}:${dependency}`);
      }
    }
  }
  for (const cycle of findCycles(workItems)) {
    errors.push(`WBS_DEPENDENCY_CYCLE:${cycle.join(":")}`);
  }

  for (const evidencePath of manifest.requiredEvidence || []) {
    if (!existsSync(resolve(root, evidencePath))) {
      errors.push(`REQUIRED_EVIDENCE_MISSING:${evidencePath}`);
    }
  }
  if (manifest.policy?.productionActivation !== "BLOCKED") {
    errors.push("PRODUCTION_ACTIVATION_MUST_REMAIN_BLOCKED");
  }
  if (manifest.policy?.phase3Authority !== "UNAUTHORIZED") {
    errors.push("PHASE3_AUTHORITY_MUST_REMAIN_UNAUTHORIZED");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      capabilities: capabilityIds.length,
      foundations: foundationIds.length,
      workItems: workItems.size,
      completedWorkItems: (manifest.workItemStates?.COMPLETE || []).length,
      inProgressWorkItems: (manifest.workItemStates?.IN_PROGRESS || []).length,
      externalInputBlockedWorkItems: (
        manifest.workItemStates?.EXTERNAL_INPUT_BLOCKED || []
      ).length,
    },
  };
}

function evaluateCurrentState(root, manifest) {
  const phase2b = evaluatePromotion(collectInput(root), "phase2b");
  const external = JSON.parse(
    readFileSync(
      resolve(
        root,
        "docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUT_READINESS_2026-07-25.json",
      ),
      "utf8",
    ),
  );
  const mismatches = [];
  const baseline = manifest.runtimeBaseline || {};
  const checks = [
    ["phase2bStatus", phase2b.status],
    ["phase2bChecks", phase2b.summary.checks],
    ["phase2bPassed", phase2b.summary.passed],
    ["phase2bBlockers", phase2b.summary.blockers],
    ["externalInputStatus", external.status],
    ["externalInputChecks", external.summary?.checks],
    ["externalInputPassed", external.summary?.passed],
    ["externalInputBlockers", external.summary?.blockers],
  ];
  for (const [key, current] of checks) {
    if (baseline[key] !== current) {
      mismatches.push({ key, recorded: baseline[key], current });
    }
  }
  return { phase2b, external, mismatches };
}

function run(options = parseArgs()) {
  const root = process.cwd();
  const manifestPath = resolve(root, options.manifest);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const roadmapPath = resolve(root, manifest.roadmap);
  const control = validateProgramme({
    manifest,
    roadmapMarkdown: readFileSync(roadmapPath, "utf8"),
    root,
  });
  const current = evaluateCurrentState(root, manifest);
  const controlReady = control.valid && current.mismatches.length === 0;
  const promotionReady = current.phase2b.eligible === true;
  const result = {
    programmeId: manifest.programmeId,
    status: !controlReady
      ? "CONTROL_INVALID"
      : promotionReady
        ? "READY_FOR_SEPARATE_PHASE2B_ACTIVATION_REVIEW"
        : "CONTROL_READY_EXECUTION_BLOCKED",
    controlReady,
    promotionReady,
    activationAuthorizedByGate: false,
    phase3AuthorizedByGate: false,
    control,
    baselineMismatches: current.mismatches,
    phase2b: {
      status: current.phase2b.status,
      checks: current.phase2b.summary.checks,
      passed: current.phase2b.summary.passed,
      blockers: current.phase2b.summary.blockers,
    },
    externalInputs: {
      status: current.external.status,
      checks: current.external.summary?.checks,
      passed: current.external.summary?.passed,
      blockers: current.external.summary?.blockers,
    },
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!controlReady || (options.mode === "fail" && !promotionReady)) {
    process.exitCode = 1;
  }
  return result;
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        status: "CONTROL_ERROR",
        code: "TOP12_PROGRAMME_GATE_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
        activationAuthorizedByGate: false,
        phase3AuthorizedByGate: false,
      })}\n`,
    );
    process.exitCode = 1;
  }
}

module.exports = {
  CAPABILITY_IDS,
  FOUNDATION_IDS,
  findCycles,
  parseArgs,
  parseRoadmapWorkItems,
  run,
  validateProgramme,
};
