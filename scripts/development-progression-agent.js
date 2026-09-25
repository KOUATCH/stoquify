#!/usr/bin/env node

// Repository engineering coordinator. It never creates approvals or activates a release.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { buildEnterpriseBlockerStatus, EVIDENCE_PATHS } = require("./enterprise-release-blocker-status");

const OUTPUT = "what-next/development-progression-agent";
const CONFIG = "docs/blockers-docs/X1_APPROVAL_AUTOMATION_CONFIGURATION_2026-08-31.json";
const CONTRACT = "docs/blockers-docs/X1_CONTRACT_ARTIFACT_MANIFEST_2026-08-31.json";
const MANIFEST = "what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json";
const LOCAL = "what-next/evidence/finance-x1/local-simulation";
const CONTRACT_TESTS = [
  "scripts/__tests__/development-progression-agent.test.js",
  "scripts/__tests__/x1-approval-automation-orchestrator.test.js",
  "scripts/__tests__/finance-x1-evidence-preflight.test.ts",
  "scripts/__tests__/validate-finance-x1-evidence.test.ts",
  "components/DataTableComponents/__tests__/FinanceX1EvidenceBinding.test.ts",
  "components/DataTableComponents/__tests__/NextPhaseContracts.test.ts",
  "components/DataTableComponents/__tests__/FinanceAccountingContract.test.ts",
];
const ACTIONS = Object.freeze({
  "x1-local-integrity": { title: "Verify the local 42-file baseline", requires: [], ttlMs: Infinity },
  "x1-contract-tests": { title: "Verify X1 contracts and approval time boundaries", requires: [], ttlMs: Infinity },
  "x1-matrix-list": { title: "Compile the authenticated capture matrix without opening a browser", requires: ["x1-contract-tests"], ttlMs: Infinity },
  "x1-readiness": { title: "Refresh X1 configuration, contract hashes and local database candidates", requires: [], ttlMs: 3600000 },
});
const ENTERPRISE = {
  B01: [[], "APPLICATION_RELEASE_OWNER", "engineering", "npm run build:app"],
  B02: [[], "PAYROLL_CONTROLS_AND_DATABASE_OWNER", "evidence", "npm run payroll:immutability:runtime"],
  B03: [["X02"], "PLATFORM_DATABASE_OWNER", "external", "npm run prisma:migration:release:preflight"],
  B04: [[], "SECURITY_PLATFORM_OWNER", "external", "npm run release:secrets:preflight:release"],
  B05: [[], "COMPLIANCE_EVIDENCE_OWNER", "evidence", "npm run statutory:country-pack:review:preflight"],
  B06: [["B05"], "COMPLIANCE_LEGAL_OWNER", "human", "npm run statutory:country-pack:gate"],
  B07: [["B03", "B04"], "SECURITY_OWNER", "dependency", "npm run agent:credential-rotation:gate"],
  B08: [["B03", "B04", "B06", "B07"], "RELEASE_MANAGER_AND_SRE_OWNER", "dependency", "npm run agent:operational-release:gate"],
  B09: [["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "X01"], "RELEASE_MANAGER", "dependency", "npm run agent:phase2a:freeze:gate"],
  B10: [["B09"], "PRODUCT_SECURITY_AND_RELEASE_OWNERS", "human", "npm run agent:governance:evidence:gate"],
  B11: [["GATE-017"], "PILOT_RELEASE_OWNER", "dependency", "npm run agent:phase2b:entry:gate"],
  B12: [["B11"], "PRODUCTION_RELEASE_OWNER", "human", "npm run agent:phase3:entry:gate"],
};

function hash(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function relative(root, file) { return path.relative(root, file).replace(/\\/g, "/"); }
function inside(root, file) {
  const rel = path.relative(root, path.resolve(root, file));
  if (!rel || rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error("Path must remain inside its workspace boundary.");
  // Resolve each existing ancestor to reject junction/symlink escapes as well.
  let ancestor = path.resolve(root, file);
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const realRoot = fs.realpathSync(root);
  const realRel = path.relative(realRoot, fs.realpathSync(ancestor));
  if (realRel === ".." || realRel.startsWith(`..${path.sep}`) || path.isAbsolute(realRel)) throw new Error("Symbolic path escapes its workspace boundary.");
  return path.resolve(root, file);
}
function digestFile(root, file) {
  try { return hash(fs.readFileSync(inside(root, file))); } catch { return null; }
}
function walk(root, dir, accept) {
  if (!fs.existsSync(path.join(root, dir))) return [];
  return fs.readdirSync(inside(root, dir), { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) return [];
    const file = `${dir}/${entry.name}`;
    return entry.isDirectory() ? walk(root, file, accept) : accept(file) ? [file] : [];
  });
}
function atomicJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  fs.renameSync(temp, file);
}

function localBaseline(root) {
  const candidates = walk(root, LOCAL, (file) => file.endsWith("/manifest.local-simulation.json"));
  const valid = candidates.flatMap((file) => {
    try { return [{ file, manifest: readJson(inside(root, file)) }]; } catch { return []; }
  }).filter(({ manifest }) => Number.isFinite(Date.parse(manifest.capturedAt)));
  valid.sort((a, b) => Date.parse(b.manifest.capturedAt) - Date.parse(a.manifest.capturedAt));
  return { selected: valid[0] ?? null, candidates, invalidCount: candidates.length - valid.length };
}

function verifyLocalBaseline(root, selection, requiredRoutes) {
  const failures = [];
  const selected = selection.selected;
  if (!selected) return { status: "FAILED", failures: ["No readable dated local baseline."], artifactCount: 0, releaseEvidence: false };
  const m = selected.manifest;
  if (selection.invalidCount) failures.push("Some local baseline manifests are malformed or undated.");
  if (m.authoritative !== false || m.approvedForReleaseEvidence !== false || m.authenticated !== true || m.productionBudgetsApproved !== false) failures.push("Local evidence classification is inconsistent.");
  const artifacts = m.artifacts ?? m.evidenceArtifacts ?? [];
  const expected = requiredRoutes.flatMap((route) => ["en", "fr"].flatMap((locale) => ["desktop", "tablet", "mobile"].map((viewport) => `${viewport}|/${locale}${route}`)));
  const cells = new Set();
  const ids = new Set();
  const paths = new Set();
  for (const artifact of artifacts) {
    const key = `${artifact.viewport}|${artifact.route}`;
    if (!expected.includes(key) || cells.has(key) || ids.has(artifact.artifactId) || paths.has(artifact.artifactPath)) failures.push("Duplicate or unexpected artifact identity/route cell.");
    cells.add(key); ids.add(artifact.artifactId); paths.add(artifact.artifactPath);
    if (artifact.runId !== m.runId || artifact.organizationId !== m.organizationId || artifact.personaRole !== "external_accountant" || artifact.authenticated !== true || artifact.authoritative !== false || artifact.approvedForReleaseEvidence !== false || !artifact.route.startsWith(`/${artifact.locale}/`)) failures.push("Artifact identity or classification mismatch.");
    if (!["routeLoaded", "authorizationVerified", "tenantIsolationVerified", "redactionBoundaryVerified", "layoutUsable", "accessibilityReviewed"].every((check) => artifact.checks?.[check] === true)) failures.push("Artifact checks are incomplete.");
    if (!Number.isFinite(Date.parse(artifact.capturedAt)) || Date.parse(artifact.capturedAt) > Date.parse(m.capturedAt)) failures.push("Artifact capture timestamp is invalid.");
    const actual = digestFile(root, artifact.artifactPath ?? "");
    if (!actual || actual !== artifact.sha256) failures.push(`Missing or changed artifact: ${artifact.artifactId}`);
  }
  if (artifacts.length !== 42 || m.artifactCount !== 42 || expected.length !== 42 || expected.some((cell) => !cells.has(cell))) failures.push("The full seven-route, two-locale, three-viewport matrix is required.");
  return { status: failures.length ? "FAILED" : "PASSED", source: selected.file, manifestSha256: digestFile(root, selected.file), capturedAt: m.capturedAt, artifactCount: artifacts.length, verifiedCells: cells.size, failures, releaseEvidence: false, currentCandidateProven: false, claim: "File integrity and recorded local coverage only; capture predates this run and lacks current candidate binding." };
}

function fingerprint(root, manifestPath, selection) {
  const sourceDirs = ["app", "actions", "components", "services", "lib", "hooks", "config", "types", "scripts", "tests", "messages", "prisma"];
  const files = sourceDirs.flatMap((dir) => walk(root, dir, (file) => /\.(?:[cm]?[jt]sx?|json|prisma|sql)$/.test(file) && !file.includes("/graphify-out/") && !file.includes("/__pycache__/")));
  files.push("package.json", "package-lock.json", "pnpm-lock.yaml", "tsconfig.json", "jest.config.ts", "jest.payroll-trust-spine.config.cjs", "jest.setup.ts", "playwright.finance-x1-evidence.config.ts", CONFIG, CONTRACT, manifestPath);
  files.push(...walk(root, "docs/blockers-docs", (file) => /\.(json|md|docx)$/.test(file)));
  files.push(...selection.candidates);
  for (const artifact of selection.selected?.manifest.artifacts ?? selection.selected?.manifest.evidenceArtifacts ?? []) files.push(artifact.artifactPath);
  const inputs = Object.fromEntries([...new Set(files)].sort().map((file) => [file, digestFile(root, file)]));
  // Environment values and auth storage are never persisted. Only their digests affect invalidation.
  const environmentDigest = hash(JSON.stringify(Object.fromEntries(["NODE_ENV", "DATABASE_URL", "X1_ALLOW_LOCAL_SIMULATION", "FINANCE_X1_EVIDENCE_APPROVAL_MANIFEST", "FINANCE_X1_EVIDENCE_RUN_ID", "FINANCE_X1_FOREIGN_TENANT_ID", "PLAYWRIGHT_BASE_URL", "PLAYWRIGHT_FINANCE_X1_STORAGE_STATE"].map((key) => [key, process.env[key] ?? null]))) + [".env", ".env.local", ".env.development", ".env.development.local"].map((file) => digestFile(root, file)).join("|"));
  return { digest: hash(JSON.stringify(inputs) + environmentDigest), inputs, environmentDigest };
}

function currentAttempt(root, actionId, state, binding, now = Date.now()) {
  const attempt = state.actions?.[actionId];
  if (!attempt) return { status: "NOT_RUN", reason: "No verification recorded." };
  if (attempt.fingerprint !== binding.digest) return { status: "STALE", reason: "Source or configuration changed.", previous: attempt };
  if (!Number.isFinite(Date.parse(attempt.completedAt)) || now < Date.parse(attempt.completedAt) || now - Date.parse(attempt.completedAt) >= ACTIONS[actionId].ttlMs) return { status: "STALE", reason: "External observations require refresh.", previous: attempt };
  if (!attempt.resultPath || !attempt.resultSha256 || digestFile(root, attempt.resultPath) !== attempt.resultSha256) return { status: "STALE", reason: "Saved evidence is missing or changed.", previous: attempt };
  return { ...attempt, current: true };
}

function eligibleActions(root, state, binding, retry, now = Date.now()) {
  return Object.keys(ACTIONS).filter((id) => {
    const current = currentAttempt(root, id, state, binding, now);
    if (current.status === "PASSED" || current.status === "OBSERVED_BLOCKED") return false;
    if (current.status === "FAILED" && (!retry || (current.attemptsForFingerprint ?? 0) >= 2)) return false;
    return ACTIONS[id].requires.every((dep) => currentAttempt(root, dep, state, binding, now).status === "PASSED");
  });
}

function dependencyProblems(items) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const problems = []; const done = new Set(); const visiting = new Set();
  function visit(id, chain) {
    if (visiting.has(id)) { problems.push(`Dependency cycle: ${[...chain, id].join(" -> ")}`); return; }
    if (done.has(id)) return;
    if (!byId.has(id)) { problems.push(`Missing dependency: ${id}`); return; }
    visiting.add(id);
    for (const dep of byId.get(id).prerequisites) visit(dep, [...chain, id]);
    visiting.delete(id); done.add(id);
  }
  for (const item of items) visit(item.id, []);
  return [...new Set(problems)];
}

function rejectSyntheticManifest(manifest, report) {
  const references = [manifest.budgetApproval?.approvalReference, manifest.evidenceAuthorization?.credentialApprovalReference, manifest.evidenceAuthorization?.seededDataApprovalReference];
  const synthetic = manifest.authoritative === false || manifest.approvedForReleaseEvidence === false || manifest.simulation === true || /LOCAL_SIMULATION/i.test(manifest.classification ?? "") || references.some((value) => typeof value === "string" && /^(?:local|synthetic|simulation|fixture)(?:[-_:]|$)/i.test(value));
  if (!synthetic) return report;
  return { ...report, status: "blocked", bindingStatus: "invalid", blockerCount: report.blockerCount + 1, findings: [...report.findings, { id: "synthetic-evidence-rejected", path: "manifest", detail: "A local or synthetic approval/evidence manifest cannot satisfy authoritative X1 evidence requirements." }] };
}

function node(id, title, classification, restricts, prerequisites, owner, source, resolution, verification, completion) {
  return { id, sourceIds: [id], title, classification, restricts, prerequisites, owner, source, resolution, verification, completion, status: "OPEN", evidence: [], downstream: [] };
}

function buildRegister({ root, state, binding, x1, enterprise, config, selection, now = Date.now() }) {
  const items = [];
  for (const [id, action] of Object.entries(ACTIONS)) {
    const result = currentAttempt(root, id, state, binding, now);
    items.push({ ...node(id, action.title, "evidence", ["development-evidence"], action.requires, "DEVELOPMENT_AGENT", "scripts/development-progression-agent.js", `Run allowlisted action ${id}.`, `node scripts/development-progression-agent.js --mode resume`, "Current bound verification passes; report exit zero alone is insufficient."), status: result.status, evidence: result.resultPath ? [result.resultPath] : [], failure: result.reason ?? null });
  }
  const findings = x1.findings ?? [];
  for (const [id, title, pattern, owner] of [
    ["X1-PRODUCT", "Product performance-budget decision", /product-budget|budgetApproval/, "PRODUCT_APPROVER"],
    ["X1-AUTHORIZATION", "Non-production fixture and credential authorization", /evidence-authorization|evidenceAuthorization/, "SECURITY_CONTROL_AND_DATA_CUSTODY_OWNER"],
  ]) {
    const failed = findings.filter((finding) => pattern.test(`${finding.id} ${finding.path}`));
    items.push({ ...node(id, title, "human", ["authorized-evidence", "X1-acceptance"], [], owner, MANIFEST, "Supply authentic scoped approval references, identity, decision, signature and validity; retain already populated facts.", "Existing X1 validator plus authoritative approval-system verification.", "Actual decision authenticated and bound to the exact contract."), status: failed.length || x1.bindingStatus === "invalid" ? "OPEN" : "EXTERNAL_VERIFICATION_REQUIRED", failure: failed.map((item) => item.detail), sourceIds: [id, ...failed.map((item) => item.id)] });
  }
  const readiness = currentAttempt(root, "x1-readiness", state, binding, now);
  const observed = readiness.current ? readJson(inside(root, readiness.resultPath)).report : null;
  const missing = observed?.blockers?.map((item) => item.code) ?? [];
  items.push({ ...node("X1-PROVIDER", "Authoritative approval provider configuration and signed delegation", "external", ["approval-automation"], [], "PLATFORM_AND_GOVERNANCE_OWNERS", CONFIG, "Choose the approved platform and supply only missing non-secret references; implement its adapter and authenticate the scoped POL-004 delegation. Direct documented human approval intake remains available.", "npm run table:x1:approval:readiness", "Provider-issued authority verified; a populated configuration alone is insufficient."), status: missing.length || !config.providerAdapterModule ? "OPEN" : "EXTERNAL_VERIFICATION_REQUIRED", failure: missing, alternativePath: "X1-PRODUCT + X1-AUTHORIZATION may use the existing direct approval intake; provider automation is not a universal development prerequisite." });
  items.push({ ...node("X1-CAPTURE", "Current authorized 42-artifact evidence run", "dependency", ["X1-acceptance"], ["X1-PRODUCT", "X1-AUTHORIZATION", "x1-matrix-list"], "EVIDENCE_CAPTURE_OWNER", MANIFEST, "After external verification, use approved browser state and a new run ID to execute the existing preflight and capture commands.", "npm run table:x1:finance:evidence:preflight; npm run table:x1:finance:evidence:capture; npm run table:x1:finance:evidence:gate", "42 current file-backed captures after approval, with validated tenant, persona, route, locale, viewport and hashes."), status: x1.status === "ready-for-human-review" ? "EXTERNAL_VERIFICATION_REQUIRED" : "WAITING", failure: findings.map((item) => item.id), localBaseline: selection.selected?.file ?? null });
  items.push(node("X1-REVIEW", "Independent X1 evidence acceptance", "human", ["X1-acceptance"], ["X1-CAPTURE"], "INDEPENDENT_REVIEWER", "docs/blockers-docs", "Review authentic records and artifacts; record the external disposition.", "Independent source-system and artifact review.", "A scoped reviewer decision exists outside the agent-authored manifest."));
  if (findings.some((item) => !/product-budget|evidence-authorization|authenticated-evidence-matrix/.test(item.id))) items.push({ ...node("X1-MANIFEST", "Evidence manifest validation findings", "engineering", ["authorized-evidence"], [], "X1_ENGINEERING_OWNER", MANIFEST, "Correct the reported schema or file-integrity problem without altering approval truth.", "npm run table:x1:finance:evidence:gate", "Existing validator accepts actual records and artifacts."), failure: findings });
  for (const item of enterprise.blockers) {
    const [deps, owner, category, command] = ENTERPRISE[item.id];
    items.push({ ...node(item.id, item.title, category, ["pilot", "production"], deps, owner, "scripts/enterprise-release-blocker-status.js", item.nextAction, command, "Source gate passes with current environment and immutable candidate binding; authorized promotion remains separate."), status: item.ready ? "SOURCE_READY_REBIND_REQUIRED" : item.status, sourceStatus: item.status, failure: item.blockers, evidence: item.facts, freshness: "Aggregate recomputed now from saved source evidence; runtime observations were not rerun." });
  }
  items.push(node("GATE-017", "Enterprise release review", "human", ["pilot", "production"], ["B10", "X04"], "ENTERPRISE_RELEASE_BOARD", "docs/system-evaluation-and-redirection/system-evaluation-2026-08-28-blocker-matrix.md", "Request the documented release review after all prerequisites are rebound.", "Enterprise Gate 017 decision.", "Authentic candidate-bound GO decision."));
  for (const [id, title, command] of [
    ["X01", "Module access and surface registry", "npm run module:surface:inventory"],
    ["X02", "Migration parity and destructive-change dispositions", "npm run prisma:migration:release:preflight"],
    ["X03", "Payroll concurrency and idempotency regression proof", "npm run payroll:trust-spine:gate"],
    ["X04", "Pilot UX, accessibility, localization and mobile proof", "Scope the pilot route evidence from the current release contract."],
  ]) items.push({ ...node(id, title, "stale", ["pilot", "production"], [], "DOMAIN_ENGINEERING_AND_ASSURANCE_OWNER", "docs/system-evaluation-and-redirection/system-evaluation-2026-08-28-blocker-matrix.md", "Refresh the historical finding against current source before planning remediation.", command, "Current scoped source evidence resolves the historical finding."), status: "REVALIDATION_REQUIRED" });
  items.find((item) => item.id === "B02").prerequisites.push("X03");
  for (const item of items) item.downstream = items.filter((candidate) => candidate.prerequisites.includes(item.id)).map((candidate) => candidate.id);
  return { schemaVersion: 1, generatedAt: new Date(now).toISOString(), fingerprint: binding.digest, items, dependencyProblems: dependencyProblems(items), x1Validator: x1, enterpriseSummary: enterprise.summary, activationAuthorized: false, pilotEligible: false, productionEligible: false, eligibilityReason: "This coordinator never issues release authority; historical source readiness requires current candidate binding and external review." };
}

function runProcess(root, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, shell: false, timeout: 180000, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, windowsHide: true, env: { ...process.env, FORCE_COLOR: "0" } });
  return { exitCode: result.status, timedOut: result.error?.code === "ETIMEDOUT", stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function executeAction(root, id, selection, manifest, runDir) {
  if (!Object.hasOwn(ACTIONS, id)) throw new Error("Action is not allowlisted.");
  if (id === "x1-local-integrity") return verifyLocalBaseline(root, selection, manifest.requiredRoutes ?? []);
  if (id === "x1-contract-tests") {
    const reportPath = path.join(runDir, "jest-results.json");
    const result = runProcess(root, ["node_modules/jest/bin/jest.js", "--config=jest.payroll-trust-spine.config.cjs", "--roots", "scripts/__tests__", "components/DataTableComponents", "--runTestsByPath", ...CONTRACT_TESTS, "--runInBand", "--json", `--outputFile=${reportPath}`]);
    const report = fs.existsSync(reportPath) ? readJson(reportPath) : null;
    return { status: result.exitCode === 0 && report?.success === true && report.numTotalTests > 0 ? "PASSED" : "FAILED", exitCode: result.exitCode, timedOut: result.timedOut, suites: report?.numTotalTestSuites ?? 0, tests: report?.numTotalTests ?? 0, passed: report?.numPassedTests ?? 0, failedTests: report?.testResults?.flatMap((suite) => suite.assertionResults.filter((test) => test.status === "failed").map((test) => test.fullName)) ?? [], command: "node node_modules/jest/bin/jest.js --config=jest.payroll-trust-spine.config.cjs --roots scripts/__tests__ components/DataTableComponents --runTestsByPath <fixed X1 suites> --runInBand" };
  }
  if (id === "x1-matrix-list") {
    const result = runProcess(root, ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.finance-x1-evidence.config.ts", "--list", "--reporter=list"]);
    const tests = Number(result.stdout.match(/Total:\s+(\d+) tests?/)?.[1] ?? 0);
    return { status: result.exitCode === 0 && tests === 43 ? "PASSED" : "FAILED", exitCode: result.exitCode, timedOut: result.timedOut, tests, browsersOpened: false, command: "npm run table:x1:finance:evidence:list", diagnostic: result.exitCode === 0 ? null : "Matrix compilation failed; run the listed command locally for diagnostics." };
  }
  const result = runProcess(root, ["scripts/x1-approval-automation-orchestrator.js", "--mode", "report", "--no-write"]);
  let report;
  try { report = JSON.parse(result.stdout.trim().split("\n").findLast((line) => line.startsWith("{"))); } catch { /* Missing/invalid output is a failed observation. */ }
  const valid = result.exitCode === 0 && Array.isArray(report?.blockers) && report?.databaseMutated === false && report?.externalRecordsCreated === false;
  return { status: valid ? report.blockers.length ? "OBSERVED_BLOCKED" : "PASSED" : "FAILED", exitCode: result.exitCode, timedOut: result.timedOut, command: "node scripts/x1-approval-automation-orchestrator.js --mode report --no-write", report: valid ? { status: report.status, blockers: report.blockers, artifacts: report.artifacts, database: { status: report.database.status, target: report.database.target, existingX1ActivationPackages: report.database.existingX1ActivationPackages, roles: report.database.roles.map((role) => ({ id: role.id, code: role.code, permissionCount: role.permissions.length, candidateUserIds: role.users.map((user) => user.id), formalAuthorityProven: false })) } } : null, diagnostic: valid ? null : "Readiness could not be observed; no approval or database readiness was inferred." };
}

function nextStep(register) {
  const passed = (id) => register.items.find((item) => item.id === id)?.status === "PASSED";
  if (register.dependencyProblems.length) return { id: "REPAIR-DEPENDENCY-REGISTER", eligible: false, reason: register.dependencyProblems };
  const failed = register.items.find((item) => Object.hasOwn(ACTIONS, item.id) && item.status === "FAILED");
  if (failed) return { id: `REPAIR-${failed.id}`, eligible: true, scope: `Diagnose ${failed.title} from its saved evidence. Fix the demonstrated cause before retrying or widening scope.`, prerequisites: failed.prerequisites, evidence: failed.evidence, acceptance: "The original verification succeeds with current input binding; no thresholds or authority requirements are weakened." };
  if (!passed("x1-contract-tests") || !passed("x1-matrix-list")) return { id: "X1-FOCUSED-VERIFICATION", eligible: true, scope: "Run or repair the focused X1 engineering checks; release approvals are not prerequisites for these local checks.", prerequisites: [], acceptance: "Current contract suites pass and the capture harness lists 43 tests." };
  return { id: "X1-LOCAL-PERFORMANCE-CHARACTERIZATION", eligible: true, scope: "Measure X1 finance route loading and populated/empty table behavior against the existing authorized disposable fixtures. Inspect recorded slow routes first; proposed budgets remain unapproved and historical timings are not p75 measurements.", prerequisites: ["x1-contract-tests", "x1-matrix-list"], authorityBoundary: "Confirm the session's local fixture/browser authorization before another authenticated run. No production acceptance is implied.", acceptance: "Save repeatable route timings and row-state evidence, identify bottlenecks, and propose the smallest source-backed fix with focused regression checks.", executionPrompt: "Inspect the current X1 local baseline and route/read-model implementations. Establish whether each zero-row observation is expected or a missing fixture. Measure repeat runs on the authorized local fixture target; retain EN/FR, tenant isolation, redaction and accounting truth. Implement only the demonstrated bottleneck fix, verify it, and save before/after evidence. Keep proposed budgets and external acceptance pending." };
}

function publish(root, runDir, register, binding, state, transitions, mode) {
  const next = nextStep(register);
  atomicJson(path.join(runDir, "blocker-register.json"), register);
  atomicJson(path.join(runDir, "input-binding.json"), binding);
  atomicJson(path.join(runDir, "next-step.json"), next);
  atomicJson(path.join(runDir, "run.json"), { schemaVersion: 1, generatedAt: new Date().toISOString(), mode, transitions, actions: state.actions, nextStep: next.id, changedInputFiles: [...new Set(transitions.flatMap((transition) => transition.changedInputFiles))], artifactDirectory: relative(root, runDir), fileChangeSemantics: "The runner writes only its own artifacts/state. Input changes during verification invalidate the result.", databaseWrites: false, externalRecordsCreated: false, captureAttempted: false, activationAuthorized: false });
  const external = register.items.filter((item) => ["human", "external"].includes(item.classification));
  const lines = external.map((item) => `| ${item.id} | ${item.owner} | ${item.resolution} | ${item.downstream.join(", ") || item.restricts.join(", ")} |`);
  fs.writeFileSync(path.join(runDir, "external-decisions.md"), `# Remaining external decisions\n\nPrepared locally; no requests sent. Existing fixture identities are candidates, never signatures or authority. Direct X1 approval intake is available without selecting an automation provider.\n\n| Item | Owner role | Minimum action | Unlocks |\n|---|---|---|---|\n${lines.join("\n")}\n\nExact current X1 integration findings: ${JSON.stringify(register.items.find((item) => item.id === "X1-PROVIDER").failure)}\n\nUse the prefilled intake in what-next/evidence/finance-x1/X1_APPROVAL_INTAKE_PREFILLED_2026-09-01.md. Preserve existing facts; obtain only real product/security decisions, immutable references, signed timestamps and signature references. Never include secret values.\n`);
  fs.writeFileSync(path.join(runDir, "report.md"), `# Development progression run\n\nMode: ${mode}. Source binding: ${binding.digest}.\n\nDevelopment continues; pilot and production activation remain unauthorized. Finance X1 and system X01 retain distinct IDs.\n\n| Verification | Result |\n|---|---|\n${register.items.slice(0, 4).map((item) => `| ${item.title} | ${item.status} |`).join("\n")}\n\nEnterprise sources currently report ${register.enterpriseSummary.readyCount}/${register.enterpriseSummary.blockerCount} ready. These are saved source observations, not fresh production proof.\n\nNext: ${next.id}. ${next.scope ?? "Resolve dependency inconsistencies."}\n\nSee blocker-register.json for restrictions, source IDs, completion criteria and dependencies; external-decisions.md for the consolidated handoff.\n`);
  return next;
}

function parseArgs(argv) {
  const options = { mode: "inspect", runId: new Date().toISOString().replace(/[:.]/g, "-") + "-" + crypto.randomBytes(3).toString("hex"), manifest: MANIFEST, retry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--retry") options.retry = true;
    else if (["--mode", "--run-id", "--manifest"].includes(argv[i])) {
      const key = { "--mode": "mode", "--run-id": "runId", "--manifest": "manifest" }[argv[i]];
      if (!argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error("Argument value is required.");
      options[key] = argv[++i];
    } else throw new Error("Unknown argument; use --mode inspect|run|resume, --run-id, --manifest, or --retry.");
  }
  if (!["inspect", "run", "resume"].includes(options.mode) || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(options.runId)) throw new Error("Invalid mode or run ID.");
  return options;
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const root = path.resolve(__dirname, "..");
  if (path.resolve(process.cwd()) !== root) throw new Error("Run this command from the Stoquify repository root.");
  inside(root, options.manifest);
  const outputRoot = inside(root, OUTPUT);
  fs.mkdirSync(outputRoot, { recursive: true });
  const lockPath = path.join(outputRoot, "runner.lock");
  let lock;
  try { lock = fs.openSync(lockPath, "wx"); } catch { throw new Error("Another progression run owns runner.lock. If interrupted, verify its process has ended before removing that specific lock."); }
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  try {
    const runDir = inside(outputRoot, options.runId);
    fs.mkdirSync(runDir); // Never overwrite a historical run.
    const statePath = path.join(outputRoot, "state.json");
    const state = fs.existsSync(statePath) ? readJson(statePath) : { schemaVersion: 1, actions: {}, history: [] };
    if (state.schemaVersion !== 1 || !state.actions || !Array.isArray(state.history)) throw new Error("Invalid progression state; preserve it for inspection.");
    const selection = localBaseline(root);
    const manifest = readJson(inside(root, options.manifest));
    let binding = fingerprint(root, options.manifest, selection);
    const transitions = [];
    if (options.mode !== "inspect") {
      const attempted = new Set();
      while (true) {
        const id = eligibleActions(root, state, binding, options.retry).find((candidate) => !attempted.has(candidate));
        if (!id) break;
        attempted.add(id);
        const before = currentAttempt(root, id, state, binding);
        process.stdout.write(`Running ${id}: ${ACTIONS[id].title}\n`);
        const startedAt = new Date().toISOString();
        const result = executeAction(root, id, selection, manifest, runDir);
        const afterBinding = fingerprint(root, options.manifest, selection);
        if (afterBinding.digest !== binding.digest) { result.status = "FAILED"; result.diagnostic = "Inputs changed during verification; discard the result and resume against stable sources."; }
        const resultPath = path.join(runDir, `${id}.json`);
        atomicJson(resultPath, result);
        const previous = state.actions[id];
        state.actions[id] = { status: result.status, fingerprint: binding.digest, startedAt, completedAt: new Date().toISOString(), attemptsForFingerprint: previous?.fingerprint === binding.digest ? (previous.attemptsForFingerprint ?? 0) + 1 : 1, resultPath: relative(root, resultPath), resultSha256: digestFile(root, relative(root, resultPath)) };
        const changedInputFiles = [...new Set([...Object.keys(binding.inputs), ...Object.keys(afterBinding.inputs)])].filter((file) => binding.inputs[file] !== afterBinding.inputs[file]);
        transitions.push({ action: id, from: before.status, to: result.status, reason: before.reason ?? "Eligible dependency order.", changedInputFiles });
        state.history.push({ action: id, ...state.actions[id] });
        atomicJson(statePath, state);
        binding = afterBinding;
      }
    }
    require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "node" } });
    const { validateFinanceX1EvidenceManifest } = require("./validate-finance-x1-evidence.ts");
    const x1 = rejectSyntheticManifest(manifest, validateFinanceX1EvidenceManifest({ root, manifest: options.manifest, mode: "report" }));
    const enterprise = buildEnterpriseBlockerStatus(root);
    atomicJson(path.join(runDir, "enterprise-source-snapshot.json"), enterprise);
    atomicJson(path.join(runDir, "enterprise-source-binding.json"), Object.fromEntries(Object.values(EVIDENCE_PATHS).map((file) => [file, digestFile(root, file)])));
    const register = buildRegister({ root, state, binding, x1, enterprise, config: readJson(inside(root, CONFIG)), selection });
    const next = publish(root, runDir, register, binding, state, transitions, options.mode);
    const failed = register.items.slice(0, 4).some((item) => item.status === "FAILED");
    process.stdout.write(`${JSON.stringify({ status: failed ? "ENGINEERING_VERIFICATION_FAILED" : "DEVELOPMENT_CONTINUES_EXTERNAL_DECISIONS_PENDING", runDirectory: relative(root, runDir), actionsExecuted: transitions.length, x1Status: x1.status, enterpriseReady: enterprise.summary.readyCount, enterpriseTotal: enterprise.summary.blockerCount, next: next.id, activationAuthorized: false })}\n`);
    if (failed || register.dependencyProblems.length) process.exitCode = 1;
  } finally {
    fs.closeSync(lock);
    fs.unlinkSync(lockPath);
  }
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}

module.exports = { ACTIONS, hash, inside, verifyLocalBaseline, currentAttempt, eligibleActions, dependencyProblems, rejectSyntheticManifest, buildRegister, nextStep, parseArgs, executeAction, main };
