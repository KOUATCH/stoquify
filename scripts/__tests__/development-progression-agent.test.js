const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { hash, inside, verifyLocalBaseline, currentAttempt, eligibleActions, dependencyProblems, rejectSyntheticManifest, buildRegister, nextStep, parseArgs, executeAction } = require("../development-progression-agent");

let root;
const now = Date.parse("2026-09-02T12:00:00Z");
const binding = { digest: "source-digest" };
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "stoquify-progression-")); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });
function attempt(status = "PASSED", overrides = {}) {
  fs.writeFileSync(path.join(root, "proof.json"), JSON.stringify({ status }));
  return { status, fingerprint: binding.digest, completedAt: new Date(now).toISOString(), attemptsForFingerprint: 1, resultPath: "proof.json", resultSha256: hash(fs.readFileSync(path.join(root, "proof.json"))), ...overrides };
}
function baseline() {
  const routes = Array.from({ length: 7 }, (_, index) => `/dashboard/finance/route-${index}`);
  const artifacts = routes.flatMap((route, i) => ["en", "fr"].flatMap((locale) => ["desktop", "tablet", "mobile"].map((viewport) => {
    const artifactPath = `${i}-${locale}-${viewport}.png`;
    fs.writeFileSync(path.join(root, artifactPath), `fixture-image-${artifactPath}`);
    return { artifactId: artifactPath, artifactPath, sha256: hash(fs.readFileSync(path.join(root, artifactPath))), runId: "local-run", organizationId: "fixture-tenant", personaRole: "external_accountant", authenticated: true, authoritative: false, approvedForReleaseEvidence: false, locale, viewport, route: `/${locale}${route}`, capturedAt: "2026-09-01T12:00:00Z", checks: { routeLoaded: true, authorizationVerified: true, tenantIsolationVerified: true, redactionBoundaryVerified: true, layoutUsable: true, accessibilityReviewed: true } };
  })));
  const manifest = { capturedAt: "2026-09-01T12:01:00Z", artifactCount: 42, runId: "local-run", organizationId: "fixture-tenant", authoritative: false, authenticated: true, approvedForReleaseEvidence: false, productionBudgetsApproved: false, artifacts };
  fs.writeFileSync(path.join(root, "local.json"), JSON.stringify(manifest));
  return { routes, selection: { selected: { file: "local.json", manifest }, invalidCount: 0 } };
}

describe("development progression evidence and resumption", () => {
  it("does not repeat passed verification for unchanged inputs", () => {
    const state = { actions: { "x1-contract-tests": attempt() } };
    expect(eligibleActions(root, state, binding, false, now)).not.toContain("x1-contract-tests");
    expect(eligibleActions(root, state, binding, false, now)).toContain("x1-matrix-list");
  });
  it("blocks dependent work until verification succeeds", () => {
    expect(eligibleActions(root, { actions: {} }, binding, false, now)).not.toContain("x1-matrix-list");
  });
  it("reopens changed sources, missing files and tampered evidence", () => {
    const state = { actions: { "x1-contract-tests": attempt() } };
    expect(currentAttempt(root, "x1-contract-tests", state, { digest: "changed" }, now).status).toBe("STALE");
    fs.writeFileSync(path.join(root, "proof.json"), "tampered");
    expect(currentAttempt(root, "x1-contract-tests", state, binding, now).status).toBe("STALE");
    fs.unlinkSync(path.join(root, "proof.json"));
    expect(currentAttempt(root, "x1-contract-tests", state, binding, now).status).toBe("STALE");
  });
  it("bounds failed retries and retries only when explicitly requested or inputs change", () => {
    const state = { actions: { "x1-contract-tests": attempt("FAILED") } };
    expect(eligibleActions(root, state, binding, false, now)).not.toContain("x1-contract-tests");
    expect(eligibleActions(root, state, binding, true, now)).toContain("x1-contract-tests");
    state.actions["x1-contract-tests"].attemptsForFingerprint = 2;
    expect(eligibleActions(root, state, binding, true, now)).not.toContain("x1-contract-tests");
    expect(eligibleActions(root, state, { digest: "changed" }, false, now)).toContain("x1-contract-tests");
  });
  it("does not interpret a successful report invocation as a passed gate", () => {
    const state = { actions: { "x1-readiness": attempt("OBSERVED_BLOCKED") } };
    expect(currentAttempt(root, "x1-readiness", state, binding, now).status).toBe("OBSERVED_BLOCKED");
    expect(eligibleActions(root, state, binding, false, now)).not.toContain("x1-readiness");
    expect(currentAttempt(root, "x1-readiness", state, binding, now + 3600000).status).toBe("STALE");
  });
  it("verifies all 42 hashes without promoting a local baseline", () => {
    const { routes, selection } = baseline();
    const report = verifyLocalBaseline(root, selection, routes);
    expect(report.status).toBe("PASSED");
    expect(report.releaseEvidence).toBe(false);
    expect(report.currentCandidateProven).toBe(false);
    fs.writeFileSync(path.join(root, selection.selected.manifest.artifacts[0].artifactPath), "changed");
    expect(verifyLocalBaseline(root, selection, routes).status).toBe("FAILED");
  });
  it("rejects duplicate cells and attempts to relabel simulation as release evidence", () => {
    const { routes, selection } = baseline();
    selection.selected.manifest.artifacts[1] = selection.selected.manifest.artifacts[0];
    selection.selected.manifest.approvedForReleaseEvidence = true;
    expect(verifyLocalBaseline(root, selection, routes).status).toBe("FAILED");
  });
  it("rejects path traversal and unregistered actions", () => {
    expect(() => inside(root, "../outside.json")).toThrow(/boundary/);
    expect(() => parseArgs(["--run-id", "../escape"])).toThrow();
    expect(() => executeAction(root, "publish-production", null, null, root)).toThrow(/allowlisted/);
  });
  it("rejects synthetic approvals even if a structural validator would accept them", () => {
    const report = { status: "ready-for-human-review", blockerCount: 0, findings: [] };
    expect(rejectSyntheticManifest({ authoritative: false }, report).status).toBe("blocked");
    expect(rejectSyntheticManifest({ budgetApproval: { approvalReference: "LOCAL-X1-12345" } }, report).status).toBe("blocked");
    expect(rejectSyntheticManifest({ budgetApproval: { approvalReference: "CONTROL-12345" } }, report)).toBe(report);
  });
  it("reports cycles and missing prerequisites", () => {
    expect(dependencyProblems([{ id: "a", prerequisites: ["b"] }, { id: "b", prerequisites: ["a", "missing"] }]).join(" ")).toMatch(/cycle/);
    expect(dependencyProblems([{ id: "a", prerequisites: ["missing"] }])).toContain("Missing dependency: missing");
  });
  it("prioritizes failed local verification before recommending a new increment", () => {
    const register = { dependencyProblems: [], items: [{ id: "x1-local-integrity", title: "local artifact integrity", status: "FAILED", prerequisites: [], evidence: ["failed-proof.json"] }, { id: "x1-contract-tests", status: "PASSED" }, { id: "x1-matrix-list", status: "PASSED" }] };
    expect(nextStep(register).id).toBe("REPAIR-x1-local-integrity");
  });
  it("keeps finance X1 separate from system X01 and leaves local engineering eligible", () => {
    const register = buildRegister({ root, state: { actions: {} }, binding, x1: { status: "blocked", findings: [{ id: "product-budget-approval", path: "budgetApproval", detail: "missing" }], bindingStatus: "blocked-awaiting-approval" }, enterprise: { blockers: [{ id: "B02", title: "Payroll proof", ready: true, status: "READY" }], summary: { readyCount: 1, blockerCount: 1 } }, config: {}, selection: {}, now });
    expect(register.items.some((item) => item.id === "X01")).toBe(true);
    expect(register.items.find((item) => item.id === "X1-PRODUCT").restricts).not.toContain("development");
    expect(register.items.find((item) => item.id === "B02").status).toBe("SOURCE_READY_REBIND_REQUIRED");
    // Minimal enterprise fixture deliberately omits B10; complete registers enforce every edge.
    register.dependencyProblems = [];
    expect(nextStep(register).id).toBe("X1-FOCUSED-VERIFICATION");
    expect(register.activationAuthorized).toBe(false);
  });
});
