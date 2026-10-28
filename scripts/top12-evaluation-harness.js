#!/usr/bin/env node

const { createHash } = require("node:crypto");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, relative, resolve } = require("node:path");

const DEFAULT_CATALOG =
  "docs/copilot/stoquify-agent-skill-definition-suite/evaluations/evaluation-catalog.json";
const DEFAULT_LIMIT = 150;
const VALID_CASE_STATUSES = new Set([
  "PASS",
  "FAIL",
  "BLOCKED",
  "PARTIAL",
  "INCONCLUSIVE",
  "NOT_TESTED",
]);

const CATEGORY_WEIGHTS = {
  access_control: 100,
  adversarial: 95,
  evidence_trust: 90,
  dependency_recovery: 85,
  malformed: 80,
  idempotency: 75,
  domain_risk: 70,
  suspension: 65,
  rollback: 65,
  bilingual: 40,
  nominal: 10,
};

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    catalog: DEFAULT_CATALOG,
    limit: DEFAULT_LIMIT,
    mode: "report",
    out: null,
    jsonOut: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--catalog") options.catalog = argv[++index];
    else if (value === "--limit") options.limit = Number(argv[++index]);
    else if (value === "--mode") options.mode = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!Number.isInteger(options.limit) || options.limit <= 0 || options.limit > 999) {
    throw new Error("Limit must be an integer between 1 and 999.");
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Mode must be report or fail.");
  }
  return options;
}

function loadCatalog(catalogPath, root = process.cwd()) {
  const absolutePath = resolve(root, catalogPath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Evaluation catalog not found: ${catalogPath}`);
  }
  const bytes = readFileSync(absolutePath);
  return {
    catalog: JSON.parse(bytes.toString("utf8")),
    catalogPath: relative(root, absolutePath).replace(/\\/g, "/"),
    catalogHash: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  };
}

function validateEvaluationCatalog(catalog) {
  const errors = [];
  const warnings = [];
  if (catalog.schema_version !== "1.0.0") errors.push("SCHEMA_VERSION_INVALID");
  if (!Array.isArray(catalog.cases)) errors.push("CASES_ARRAY_MISSING");
  if (errors.length > 0) return { valid: false, errors, warnings, caseCount: 0 };

  const seen = new Set();
  const requiredStringFields = [
    "id",
    "capability_id",
    "capability",
    "category",
    "language",
    "scenario",
    "expected",
    "execution_status",
  ];
  for (const [index, testCase] of catalog.cases.entries()) {
    for (const field of requiredStringFields) {
      if (typeof testCase[field] !== "string" || testCase[field].trim() === "") {
        errors.push(`CASE_FIELD_INVALID:${index}:${field}`);
      }
    }
    if (typeof testCase.must_have_no_side_effects !== "boolean") {
      errors.push(`CASE_FIELD_INVALID:${testCase.id || index}:must_have_no_side_effects`);
    }
    if (testCase.id && seen.has(testCase.id)) errors.push(`CASE_ID_DUPLICATE:${testCase.id}`);
    if (testCase.id) seen.add(testCase.id);
    if (testCase.execution_status && !VALID_CASE_STATUSES.has(testCase.execution_status)) {
      errors.push(`CASE_STATUS_INVALID:${testCase.id}:${testCase.execution_status}`);
    }
  }
  if (catalog.execution_status && !VALID_CASE_STATUSES.has(catalog.execution_status)) {
    errors.push(`CATALOG_STATUS_INVALID:${catalog.execution_status}`);
  }
  if (catalog.cases.length !== 999) {
    warnings.push(`EXPECTED_999_CASES_OBSERVED_${catalog.cases.length}`);
  }
  if (catalog.cases.some((testCase) => testCase.execution_status === "NOT_TESTED")) {
    warnings.push("SOURCE_CONTAINS_NOT_TESTED_CASES; harness prioritizes but does not certify behavior.");
  }
  return { valid: errors.length === 0, errors, warnings, caseCount: catalog.cases.length };
}

function riskTagsForCase(testCase) {
  const text = [testCase.category, testCase.scenario, testCase.expected, testCase.capability]
    .join(" ")
    .toLowerCase();
  const tags = new Set();
  if (testCase.category === "access_control" || /tenant|role|entitlement|permission|unauthorized/.test(text)) {
    tags.add("TENANT_AUTHORIZATION");
  }
  if (testCase.category === "adversarial" || /prompt|policy bypass|secret|forbidden tool/.test(text)) {
    tags.add("PROMPT_INJECTION");
  }
  if (testCase.category === "evidence_trust" || /stale|contradictory|redacted|unsupported|freshness/.test(text)) {
    tags.add("STALE_OR_UNSUPPORTED_EVIDENCE");
  }
  if (testCase.category === "dependency_recovery" || /upstream|fails|recovery|checkpoint|degraded/.test(text)) {
    tags.add("DEPENDENCY_RECOVERY");
  }
  if (testCase.category === "malformed" || /missing|malformed|invalid/.test(text)) {
    tags.add("INPUT_VALIDATION");
  }
  if (/consent/.test(text)) tags.add("CONSENT");
  if (/privacy|pii|redaction|redacted|secret/.test(text)) tags.add("PRIVACY_SECRET");
  if (/replay|duplicate|idempotenc/.test(text)) tags.add("REPLAY_IDEMPOTENCY");
  if (/message|email|sms|whatsapp|send/.test(text)) tags.add("EXTERNAL_MESSAGE");
  if (/payment|cash|payroll|invoice|ledger|finance|financing|credit|price|tax|statutory/.test(text)) {
    tags.add("FINANCIAL_OR_REGULATED");
  }
  if (/kill switch|suspension|suspend|rollback/.test(text)) tags.add("KILL_SWITCH_OR_ROLLBACK");
  if (testCase.must_have_no_side_effects) tags.add("NO_SIDE_EFFECT_REQUIRED");
  return Array.from(tags).sort();
}

function scoreCase(testCase) {
  const categoryWeight = CATEGORY_WEIGHTS[testCase.category] || 50;
  const tags = riskTagsForCase(testCase);
  let score = categoryWeight;
  if (testCase.must_have_no_side_effects) score += 20;
  if (tags.includes("FINANCIAL_OR_REGULATED")) score += 15;
  if (tags.includes("PRIVACY_SECRET")) score += 12;
  if (tags.includes("REPLAY_IDEMPOTENCY")) score += 10;
  if (tags.includes("EXTERNAL_MESSAGE")) score += 10;
  if (tags.includes("KILL_SWITCH_OR_ROLLBACK")) score += 10;
  if (/deny|block|reject|stop|approval|required/i.test(testCase.expected || "")) score += 8;
  return { score, categoryWeight, tags };
}

function prioritizeCases(cases, limit = DEFAULT_LIMIT) {
  return cases
    .map((testCase) => {
      const priority = scoreCase(testCase);
      return { ...testCase, priority };
    })
    .sort((left, right) => {
      if (right.priority.score !== left.priority.score) return right.priority.score - left.priority.score;
      if (right.priority.categoryWeight !== left.priority.categoryWeight) {
        return right.priority.categoryWeight - left.priority.categoryWeight;
      }
      return left.id.localeCompare(right.id);
    })
    .slice(0, limit)
    .map((testCase, index) => ({ ...testCase, priority: { ...testCase.priority, rank: index + 1 } }));
}

function summarizeSelectedCases(selectedCases) {
  const byCategory = {};
  const byCapability = {};
  const byRiskTag = {};
  for (const testCase of selectedCases) {
    byCategory[testCase.category] = (byCategory[testCase.category] || 0) + 1;
    byCapability[testCase.capability_id] = (byCapability[testCase.capability_id] || 0) + 1;
    for (const tag of testCase.priority.tags) {
      byRiskTag[tag] = (byRiskTag[tag] || 0) + 1;
    }
  }
  return { byCategory, byCapability, byRiskTag };
}

function buildEvaluationRun({ catalog, catalogPath, catalogHash, limit = DEFAULT_LIMIT, generatedAt = new Date().toISOString() }) {
  const validation = validateEvaluationCatalog(catalog);
  const selectedCases = validation.valid ? prioritizeCases(catalog.cases, limit) : [];
  const sourceIdentity = `${catalogHash}:${limit}:${catalog.schema_version || "unknown"}`;
  const runId = `top12-eval-${createHash("sha256").update(sourceIdentity).digest("hex").slice(0, 16)}`;
  const selectedSummary = summarizeSelectedCases(selectedCases);
  const results = selectedCases.map((testCase) => ({
    schema_version: "1.0.0",
    case_id: testCase.id,
    capability_id: testCase.capability_id,
    capability_version: `catalog:${catalog.schema_version}`,
    status: "NOT_TESTED",
    evaluated_at: generatedAt,
    evidence_refs: [catalogPath],
    findings: [
      `Selected rank ${testCase.priority.rank} for ${testCase.category} risk score ${testCase.priority.score}.`,
      `Risk tags: ${testCase.priority.tags.join(", ") || "UNCLASSIFIED"}.`,
      "Behavioral execution not run by this prioritization harness.",
    ],
  }));

  return {
    schemaVersion: 1,
    runId,
    generatedAt,
    status: validation.valid ? "PRIORITIZATION_READY_NOT_EXECUTED" : "CATALOG_INVALID",
    behavioralExecution: false,
    productionActivationAuthorized: false,
    source: {
      catalogPath,
      catalogHash,
      schemaVersion: catalog.schema_version || null,
      executionStatus: catalog.execution_status || null,
      totalCases: Array.isArray(catalog.cases) ? catalog.cases.length : 0,
    },
    validation,
    prioritization: {
      requestedLimit: limit,
      selectedCaseCount: selectedCases.length,
      policy: "deterministic-category-and-risk-tag-score-v1",
      summary: selectedSummary,
      selectedCases: selectedCases.map((testCase) => ({
        rank: testCase.priority.rank,
        caseId: testCase.id,
        capabilityId: testCase.capability_id,
        capability: testCase.capability,
        category: testCase.category,
        language: testCase.language,
        mustHaveNoSideEffects: testCase.must_have_no_side_effects,
        riskScore: testCase.priority.score,
        riskTags: testCase.priority.tags,
        executionStatus: testCase.execution_status,
      })),
    },
    results,
  };
}

function markdownReport(run) {
  const lines = [
    "# Top 12 Evaluation Harness Report",
    "",
    `Run: \`${run.runId}\``,
    `Status: \`${run.status}\``,
    `Generated at: ${run.generatedAt}`,
    "",
    "## Source",
    "",
    `- Catalog: \`${run.source.catalogPath}\``,
    `- Cases: ${run.source.totalCases}`,
    `- Catalog execution status: \`${run.source.executionStatus}\``,
    `- Behavioral execution: ${run.behavioralExecution ? "yes" : "no"}`,
    `- Production activation authorized: ${run.productionActivationAuthorized ? "yes" : "no"}`,
    "",
    "## Prioritization",
    "",
    `- Requested limit: ${run.prioritization.requestedLimit}`,
    `- Selected cases: ${run.prioritization.selectedCaseCount}`,
    `- Policy: \`${run.prioritization.policy}\``,
    "",
    "## Category Counts",
    "",
  ];
  for (const [category, count] of Object.entries(run.prioritization.summary.byCategory).sort()) {
    lines.push(`- ${category}: ${count}`);
  }
  lines.push("", "## Risk Tag Counts", "");
  for (const [tag, count] of Object.entries(run.prioritization.summary.byRiskTag).sort()) {
    lines.push(`- ${tag}: ${count}`);
  }
  lines.push("", "## Top Cases", "");
  for (const testCase of run.prioritization.selectedCases.slice(0, 20)) {
    lines.push(`- ${testCase.rank}. ${testCase.caseId} (${testCase.category}, score ${testCase.riskScore})`);
  }
  lines.push(
    "",
    "## Safety",
    "",
    "This harness creates a reproducible prioritization run and NOT_TESTED result records only. It does not execute models, invoke providers, send messages, mutate financial records, or authorize production activation.",
  );
  return `${lines.join("\n")}\n`;
}

function writeArtifact(path, content) {
  const absolutePath = resolve(process.cwd(), path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

function run(options = parseArgs()) {
  const loaded = loadCatalog(options.catalog);
  const evaluationRun = buildEvaluationRun({ ...loaded, limit: options.limit });
  if (options.jsonOut) writeArtifact(options.jsonOut, `${JSON.stringify(evaluationRun, null, 2)}\n`);
  if (options.out) writeArtifact(options.out, markdownReport(evaluationRun));
  process.stdout.write(`${JSON.stringify(evaluationRun, null, 2)}\n`);
  if (options.mode === "fail" && evaluationRun.status !== "PRIORITIZATION_READY_NOT_EXECUTED") {
    process.exitCode = 1;
  }
  return evaluationRun;
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        status: "EVALUATION_HARNESS_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        behavioralExecution: false,
        productionActivationAuthorized: false,
      })}\n`,
    );
    process.exitCode = 1;
  }
}

module.exports = {
  CATEGORY_WEIGHTS,
  buildEvaluationRun,
  loadCatalog,
  markdownReport,
  parseArgs,
  prioritizeCases,
  riskTagsForCase,
  run,
  scoreCase,
  validateEvaluationCatalog,
};

