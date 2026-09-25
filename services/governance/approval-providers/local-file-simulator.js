const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const CONFIG_PATH = path.join(
  ROOT,
  "docs",
  "blockers-docs",
  "X1_APPROVAL_AUTOMATION_CONFIGURATION_LOCAL_ONLY_2026-09-01.json",
);
const OUTPUT_DIR = path.join(
  ROOT,
  "what-next",
  "evidence",
  "finance-x1",
  "local-simulation",
);
const RECORD_PATH = path.join(OUTPUT_DIR, "approval-record.json");
const DECISION_PATH = path.join(OUTPUT_DIR, "decision-input.json");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "approval-manifest.json");
const EVENTS_PATH = path.join(OUTPUT_DIR, "callback-events.jsonl");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = stable(value[key]);
        return result;
      }, {});
  }
  return value;
}

function serialize(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function hash(value) {
  const input = typeof value === "string" ? value : serialize(value);
  return crypto.createHash("sha256").update(input).digest("hex");
}

function atomicWrite(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, serialize(value), "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function appendEvent(event) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.appendFileSync(EVENTS_PATH, `${JSON.stringify(event)}\n`, "utf8");
}

function repositoryPath(filePath) {
  return path.relative(ROOT, filePath).replaceAll("\\", "/");
}

function loadAndValidateConfiguration() {
  if (process.env.X1_ALLOW_LOCAL_SIMULATION !== "true") {
    throw new Error(
      "Local X1 simulation requires X1_ALLOW_LOCAL_SIMULATION=true.",
    );
  }

  const configuration = readJson(CONFIG_PATH);
  const controls = configuration.simulationControls || {};
  const principals = Object.values(configuration.servicePrincipals || {});

  if (configuration.mode !== "LOCAL_DEVELOPMENT_SIMULATION") {
    throw new Error("The selected profile is not a local simulation profile.");
  }
  if (configuration.authoritative !== false || configuration.gateReleaseAllowed !== false) {
    throw new Error("Local simulation must be non-authoritative and gate-ineligible.");
  }
  if (controls.allowProductionDatabase !== false || controls.allowGateRelease !== false) {
    throw new Error("Local simulation production and gate-release controls must remain disabled.");
  }
  if (controls.syntheticDecisionsOnly !== true || controls.authenticatedEvidence !== false) {
    throw new Error("Local decisions must be synthetic and evidence must be unauthenticated.");
  }
  if (principals.length !== 4 || new Set(principals).size !== 4) {
    throw new Error("Four distinct local service-principal fixtures are required.");
  }
  if (!principals.every((principal) => principal.startsWith("local-sp://"))) {
    throw new Error("Local service-principal fixtures must use local-sp:// identifiers.");
  }

  return configuration;
}

function recordId(configuration) {
  const identity = {
    mode: configuration.mode,
    workspace: configuration.approvalWorkspaceId,
    template: configuration.approvalTemplateId,
    servicePrincipals: configuration.servicePrincipals,
  };
  return `LOCAL-X1-${hash(identity).slice(0, 16).toUpperCase()}`;
}

function withRecordHash(record) {
  const { recordHash: _ignored, ...content } = record;
  return { ...content, recordHash: hash(content) };
}

function writeManifest(configuration, record) {
  const manifest = {
    schemaVersion: 1,
    classification: "LOCAL_SIMULATION_NOT_RELEASE_EVIDENCE",
    authoritative: false,
    authenticatedEvidence: false,
    gateReleaseAllowed: false,
    recordId: record.recordId,
    status: record.status,
    decision: record.decision,
    configurationPath: repositoryPath(CONFIG_PATH),
    configurationHash: hash(configuration),
    recordPath: repositoryPath(RECORD_PATH),
    recordHash: record.recordHash,
    decisionInputPath: repositoryPath(DECISION_PATH),
    eventLogPath: repositoryPath(EVENTS_PATH),
    evidenceWatermark: configuration.simulationControls.evidenceWatermark,
    releaseGate: "BLOCKED_EXTERNAL_APPROVAL_REQUIRED",
    generatedAt: new Date().toISOString(),
  };
  atomicWrite(MANIFEST_PATH, manifest);
  return manifest;
}

function create(configuration) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (fs.existsSync(RECORD_PATH)) {
    const existingRecord = readJson(RECORD_PATH);
    const manifest = writeManifest(configuration, existingRecord);
    return { created: false, record: existingRecord, manifest };
  }

  const now = new Date().toISOString();
  const record = withRecordHash({
    schemaVersion: 1,
    recordId: recordId(configuration),
    classification: "LOCAL_SIMULATION_NOT_AUTHORITATIVE",
    authoritative: false,
    approvalPlatform: configuration.approvalPlatform,
    workspaceId: configuration.approvalWorkspaceId,
    templateId: configuration.approvalTemplateId,
    status: "PENDING",
    decision: "PENDING",
    createdAt: now,
    updatedAt: now,
    simulationDecidedBy: null,
    simulationDecidedAt: null,
    effectiveUntil: null,
    signatureVerified: false,
    signatureReference: null,
    authenticatedEvidence: false,
    gateReleaseAllowed: false,
    releaseGate: "BLOCKED_EXTERNAL_APPROVAL_REQUIRED",
    servicePrincipals: configuration.servicePrincipals,
    evidenceWatermark: configuration.simulationControls.evidenceWatermark,
  });

  const decisionInput = {
    schemaVersion: 1,
    recordId: record.recordId,
    decision: "PENDING",
    decidedBy: "local-simulator",
    decidedAt: null,
    comment: "Set decision to APPROVE, REJECT, or REVISE, then run the sync command.",
  };

  atomicWrite(RECORD_PATH, record);
  atomicWrite(DECISION_PATH, decisionInput);
  appendEvent({
    eventId: `LOCAL-EVENT-${hash(`${record.recordId}:CREATED`).slice(0, 16).toUpperCase()}`,
    type: "LOCAL_APPROVAL_CREATED",
    recordId: record.recordId,
    occurredAt: now,
    authoritative: false,
  });

  const manifest = writeManifest(configuration, record);
  return { created: true, record, manifest };
}

function sync(configuration) {
  if (!fs.existsSync(RECORD_PATH)) {
    throw new Error("No local approval record exists. Run the create command first.");
  }
  if (!fs.existsSync(DECISION_PATH)) {
    throw new Error("The local decision input is missing. Run the create command first.");
  }

  const current = readJson(RECORD_PATH);
  const input = readJson(DECISION_PATH);
  const decision = String(input.decision || "").toUpperCase();
  const allowedDecisions = new Set(["PENDING", "APPROVE", "REJECT", "REVISE"]);

  if (input.recordId !== current.recordId) {
    throw new Error("The local decision input does not match the approval record.");
  }
  if (!allowedDecisions.has(decision)) {
    throw new Error("Local decision must be PENDING, APPROVE, REJECT, or REVISE.");
  }
  if (decision !== "PENDING" && !String(input.decidedBy || "").trim()) {
    throw new Error("A local simulator identity is required for a non-pending decision.");
  }
  if (decision === "APPROVE") {
    const scope = input.decisionScope;
    const budgets = scope && Array.isArray(scope.productBudgets)
      ? scope.productBudgets
      : [];
    const evidence = scope && scope.evidenceAuthorization;
    if (budgets.length < 7 || budgets.some((budget) => budget.decision !== "APPROVE")) {
      throw new Error("Local approval requires explicit approval of every proposed product budget.");
    }
    if (!evidence || evidence.decision !== "APPROVE" || evidence.classification !== "LOCAL_SIMULATION_ONLY") {
      throw new Error("Local approval requires an explicit local-only evidence authorization.");
    }
  }

  if (decision === current.decision) {
    const manifest = writeManifest(configuration, current);
    return { changed: false, record: current, manifest };
  }

  const now = new Date().toISOString();
  const validityDays = Number(configuration.proposedValidityDays || 0);
  const effectiveUntil = decision === "APPROVE"
    ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const statusByDecision = {
    PENDING: "PENDING",
    APPROVE: "SIMULATED_APPROVED",
    REJECT: "SIMULATED_REJECTED",
    REVISE: "SIMULATED_REVISION_REQUIRED",
  };

  const updated = withRecordHash({
    ...current,
    status: statusByDecision[decision],
    decision,
    updatedAt: now,
    simulationDecidedBy: decision === "PENDING" ? null : String(input.decidedBy).trim(),
    simulationDecidedAt: decision === "PENDING" ? null : input.decidedAt || now,
    simulationDecisionScope: decision === "PENDING" ? null : input.decisionScope,
    effectiveUntil,
    signatureVerified: false,
    signatureReference: null,
    authenticatedEvidence: false,
    gateReleaseAllowed: false,
    releaseGate: "BLOCKED_EXTERNAL_APPROVAL_REQUIRED",
  });

  atomicWrite(RECORD_PATH, updated);
  appendEvent({
    eventId: `LOCAL-EVENT-${hash(`${updated.recordId}:${decision}:${now}`).slice(0, 16).toUpperCase()}`,
    type: "LOCAL_APPROVAL_DECISION_SYNCHRONIZED",
    recordId: updated.recordId,
    decision,
    occurredAt: now,
    authoritative: false,
  });

  const manifest = writeManifest(configuration, updated);
  return { changed: true, record: updated, manifest };
}

function run(mode) {
  const configuration = loadAndValidateConfiguration();
  if (mode === "create") return create(configuration);
  if (mode === "sync") return sync(configuration);
  throw new Error(`Unsupported local approval mode: ${mode}`);
}

module.exports = { run };
