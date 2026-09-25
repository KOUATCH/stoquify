const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SIMULATION_DIR = path.join(
  ROOT,
  "what-next",
  "evidence",
  "finance-x1",
  "local-simulation",
);
const APPROVAL_RECORD_PATH = path.join(SIMULATION_DIR, "approval-record.json");
const REPORT_PATH = path.join(SIMULATION_DIR, "local-evidence-preflight.json");
const DEFAULT_STORAGE_STATE_PATH = path.join(
  os.tmpdir(),
  "stoquify-finance-x1",
  "external-accountant.storage-state.json",
);

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
  return crypto.createHash("sha256").update(serialize(value)).digest("hex");
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function generatedRunId() {
  return `LOCAL-X1-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
}

function inspectStorageState(storageStatePath) {
  if (!fs.existsSync(storageStatePath)) {
    return { present: false, cookieCount: 0, originCount: 0 };
  }
  const stat = fs.statSync(storageStatePath);
  if (!stat.isFile() || stat.size === 0) {
    return { present: false, cookieCount: 0, originCount: 0 };
  }
  try {
    const state = JSON.parse(fs.readFileSync(storageStatePath, "utf8"));
    const cookieCount = Array.isArray(state.cookies) ? state.cookies.length : 0;
    const originCount = Array.isArray(state.origins) ? state.origins.length : 0;
    return { present: cookieCount > 0, cookieCount, originCount };
  } catch {
    return { present: false, cookieCount: 0, originCount: 0 };
  }
}

function main() {
  if (process.env.X1_ALLOW_LOCAL_SIMULATION !== "true") {
    throw new Error("X1_ALLOW_LOCAL_SIMULATION=true is required.");
  }
  if (!fs.existsSync(APPROVAL_RECORD_PATH)) {
    throw new Error("The synchronized local approval record is missing.");
  }

  const record = JSON.parse(fs.readFileSync(APPROVAL_RECORD_PATH, "utf8"));
  const { recordHash, ...recordContent } = record;
  const findings = [];
  if (hash(recordContent) !== recordHash) {
    findings.push({
      id: "local-record-integrity",
      detail: "The synchronized local approval record hash is invalid.",
    });
  }
  if (
    record.authoritative !== false ||
    record.gateReleaseAllowed !== false ||
    record.releaseGate !== "BLOCKED_EXTERNAL_APPROVAL_REQUIRED"
  ) {
    findings.push({
      id: "local-simulation-boundary",
      detail: "The local record does not preserve the external release block.",
    });
  }
  if (record.status !== "SIMULATED_APPROVED" || record.decision !== "APPROVE") {
    findings.push({
      id: "local-simulated-decision",
      detail: "The local approval decision has not been explicitly synchronized.",
    });
  }

  const decisionScope = record.simulationDecisionScope || {};
  const budgets = Array.isArray(decisionScope.productBudgets)
    ? decisionScope.productBudgets
    : [];
  if (budgets.length !== 7 || budgets.some((budget) => budget.decision !== "APPROVE")) {
    findings.push({
      id: "local-product-budgets",
      detail: "All seven proposed product budgets must have explicit simulated approval.",
    });
  }

  const evidence = decisionScope.evidenceAuthorization || {};
  if (
    evidence.decision !== "APPROVE" ||
    evidence.classification !== "LOCAL_SIMULATION_ONLY" ||
    evidence.authenticatedEvidence !== false ||
    evidence.primaryTenantId !== "rds_org_001" ||
    evidence.foreignIsolationProbeTenantId !== "rds_org_002" ||
    !Array.isArray(evidence.locales) ||
    !evidence.locales.includes("en") ||
    !evidence.locales.includes("fr") ||
    !Array.isArray(evidence.viewports) ||
    !["desktop", "tablet", "mobile"].every((viewport) =>
      evidence.viewports.includes(viewport),
    )
  ) {
    findings.push({
      id: "local-evidence-scope",
      detail: "The local EN/FR tenant, persona, and viewport scope is incomplete.",
    });
  }

  const runId = process.env.FINANCE_X1_EVIDENCE_RUN_ID || generatedRunId();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{5,80}$/.test(runId)) {
    findings.push({
      id: "local-run-id",
      detail: "The local run ID is not safe for an evidence directory.",
    });
  }

  const storageStatePath =
    process.env.PLAYWRIGHT_FINANCE_X1_STORAGE_STATE || DEFAULT_STORAGE_STATE_PATH;
  const storageState = inspectStorageState(storageStatePath);
  if (!storageState.present) {
    findings.push({
      id: "local-external-accountant-storage-state",
      detail: "A locally authenticated external-accountant browser state is required.",
    });
  }

  const report = {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    classification: "LOCAL_SIMULATION_PREFLIGHT_NOT_RELEASE_EVIDENCE",
    authoritative: false,
    authenticatedEvidence: false,
    gateReleaseAllowed: false,
    releaseGate: "BLOCKED_EXTERNAL_APPROVAL_REQUIRED",
    status:
      findings.length === 0
        ? "ready-for-local-authenticated-capture"
        : "blocked-local-simulation",
    runId,
    approvalRecordId: record.recordId,
    approvalRecordHash: record.recordHash,
    simulatedBudgetCount: budgets.length,
    storageStatePath,
    storageStatePresent: storageState.present,
    storageStateCookieCount: storageState.cookieCount,
    blockerCount: findings.length,
    findings,
    safeNextAction:
      findings.length === 1 &&
      findings[0].id === "local-external-accountant-storage-state"
        ? "Obtain explicit authorization to prepare the disposable external-accountant credential and browser state."
        : "Resolve the listed local simulation findings without modifying the authoritative approval manifest.",
  };
  writeJson(REPORT_PATH, report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = findings.length === 0 ? 0 : 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
