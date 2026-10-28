const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  buildPayrollTrustSpineReadiness,
  gateResultForReport,
} = require("../payroll-trust-spine-readiness-gate");

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "payroll-trust-gate-"));
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source, "utf8");
}

function transitionCommand(command, next, from, to, eventType) {
  return [
    `export async function ${command}() {`,
    "return inPayrollTransitionTransaction(client, async () => {",
    `PayrollRunStatus.${from}`,
    `PayrollRunStatus.${to}`,
    `eventType: "${eventType}"`,
    "recordBusinessEventInTx",
    "persistPayrollRunTransition",
    "});",
    "}",
    next,
  ].join("\n");
}

function protectedAction(binding, next, permission, service) {
  return [
    `const ${binding} = protect(`,
    `permission: "${permission}"`,
    "freshAuth: { maxAgeSeconds: 300 }",
    'tenantGuard: "handler-derived"',
    "organizationId: ctx.orgId",
    "actorId: ctx.userId",
    "actorPermissions: ctx.permissions",
    "lastAuthAt: ctx.freshAuth.lastAuthAt",
    `await ${service}(`,
    next,
  ].join("\n");
}

function writeReadyFixture(root) {
  write(
    root,
    "services/payroll/payroll-control.service.ts",
    [
      "Prisma.TransactionIsolationLevel.Serializable",
      "async function persistPayrollRunTransition",
      "payrollRunTransition.create",
      "businessEventId: input.businessEventId",
      "payrollRun.updateMany",
      "await input.afterCompareAndSet?.();",
      "writeAudit",
      "markBusinessEventAppliedInTx",
      "async function requireTransitionedPayrollRun",
      transitionCommand(
        "reviewPayrollRun",
        "export async function approvePayrollRun",
        "CALCULATED",
        "REVIEWED",
        "PAYROLL_RUN_REVIEWED",
      ),
      transitionCommand(
        "approvePayrollRun",
        "export async function emitPayrollPayslips",
        "REVIEWED",
        "APPROVED",
        "PAYROLL_RUN_APPROVED",
      ),
      transitionCommand(
        "emitPayrollPayslips",
        "export async function postPayrollRun",
        "APPROVED",
        "EMITTED",
        "PAYSLIP_EMITTED",
      ),
      transitionCommand(
        "postPayrollRun",
        "/**\n * @deprecated",
        "EMITTED",
        "POSTED",
        "PAYROLL_POSTED",
      ),
      "export async function approveAndPostPayrollRun",
      'process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED === "true"',
      '"INVALID_TRANSITION"',
      "Combined payroll approval and posting is disabled",
      "export async function requestPayrollPaymentBatch",
    ].join("\n"),
  );
  write(
    root,
    "actions/payroll/payroll-control.actions.ts",
    [
      protectedAction(
        "reviewRun",
        "export async function reviewPayrollRunAction",
        "payroll.runs.review",
        "reviewPayrollRun",
      ),
      protectedAction(
        "approveRun",
        "export async function approvePayrollRunAction",
        "payroll.runs.approve",
        "approvePayrollRun",
      ),
      protectedAction(
        "emitPayslips",
        "export async function emitPayrollPayslipsAction",
        "payroll.payslips.emit",
        "emitPayrollPayslips",
      ),
      protectedAction(
        "postRun",
        "export async function postPayrollRunAction",
        "payroll.runs.post",
        "postPayrollRun",
      ),
    ].join("\n"),
  );
  write(
    root,
    "services/payroll/__tests__/payroll-run-approval-transition.service.test.ts",
    [
      "records the canonical review event and tenant-scoped compare-and-set transition",
      "atomically records the distinct approval event and compare-and-set transition",
      "creates the canonical event, emitted payslips, and CAS transition atomically",
      "posts the ledger and commits CAS, invalidation, audit, and event application in order",
      "fails the deprecated combined command closed after Trust Spine cutover",
      "rolls the review transition back when compare-and-set loses",
      "does not apply the emission event when compare-and-set loses",
      "does not update the period, invalidate close, or apply the event when CAS loses",
      "rolls back with a concurrency conflict when compare-and-set loses",
      "retries a serializable transaction conflict and applies the transition once",
      "returns the prior result for a same-payload idempotent replay",
      "rejects an idempotency key reused with a different approval document",
    ].join("\n"),
  );
  write(
    root,
    "actions/payroll/__tests__/payroll-control.actions.test.ts",
    [
      "passes server-derived actor and verified fresh-auth evidence when approving a reviewed payroll run",
      "protects $label with server-derived tenant, actor, permissions, and fresh-auth evidence",
      'organizationId: "client-org"',
      'actorId: "client-actor"',
      'lastAuthAt: "1900-01-01T00:00:00.000Z"',
      "fails payroll approval closed when step-up authentication is missing",
    ].join("\n"),
  );
  write(
    root,
    "prisma/migrations/20260821210000_payroll_trust_spine_transition_ledger/migration.sql",
    [
      "'CALCULATED' AND \"toStatus\" = 'REVIEWED'",
      "'REVIEWED' AND \"toStatus\" = 'APPROVED'",
      "'APPROVED' AND \"toStatus\" = 'EMITTED'",
      "'EMITTED' AND \"toStatus\" = 'POSTED'",
    ].join("\n"),
  );
  write(
    root,
    "scripts/payroll-trust-spine-postgres-certification.js",
    [
      "BEGIN ISOLATION LEVEL SERIALIZABLE",
      "Promise.all",
      "ROLLBACK",
      "concurrent_approval_has_one_atomic_winner",
      "duplicate_evidence_is_rejected_without_partial_commit",
      "failure_injection_rolls_back_run_event_outbox_audit_and_transition",
      "local disposable test database",
    ].join("\n"),
  );
  write(
    root,
    "scripts/__tests__/payroll-trust-spine-postgres-certification.test.js",
    "refuses missing, remote, and production-named databases\naccepts a local disposable database without returning credentials",
  );
  write(
    root,
    "package.json",
    JSON.stringify({
      scripts: {
        "payroll:trust-spine:gate":
          "node scripts/payroll-trust-spine-readiness-gate.js --mode fail",
        "payroll:trust-spine:postgres":
          "node scripts/payroll-trust-spine-postgres-certification.js",
        "policy:gates":
          "npm run payroll:trust-spine:gate && npm run payroll:trust-spine:postgres",
      },
    }),
  );
}

function mutate(root, relativePath, from, to = "removed") {
  const target = path.join(root, relativePath);
  const source = fs.readFileSync(target, "utf8");
  expect(source).toContain(from);
  fs.writeFileSync(target, source.replace(from, to), "utf8");
}

describe("Payroll Trust Spine readiness gate", () => {
  it("passes the complete lifecycle enforcement spine", () => {
    const root = makeTempRepo();
    writeReadyFixture(root);
    const report = buildPayrollTrustSpineReadiness(root, { mode: "fail" });
    expect(report.summary).toMatchObject({
      status: "ready",
      readyCount: 6,
      blockerCount: 0,
    });
    expect(gateResultForReport(report, "fail").exitCode).toBe(0);
  });

  it.each([
    [
      "persisted_five_stage_lifecycle",
      "services/payroll/payroll-control.service.ts",
      "PayrollRunStatus.EMITTED",
    ],
    [
      "collapsed_transition_shortcut_fails_closed",
      "services/payroll/payroll-control.service.ts",
      "Combined payroll approval and posting is disabled",
    ],
    [
      "canonical_transition_events_are_transactional",
      "services/payroll/payroll-control.service.ts",
      'eventType: "PAYSLIP_EMITTED"',
    ],
    [
      "fresh_auth_and_server_derived_trust_context",
      "actions/payroll/payroll-control.actions.ts",
      "lastAuthAt: ctx.freshAuth.lastAuthAt",
    ],
    [
      "fresh_auth_and_server_derived_trust_context",
      "actions/payroll/payroll-control.actions.ts",
      "organizationId: ctx.orgId",
    ],
    [
      "cas_idempotency_and_partial_commit_regressions_covered",
      "services/payroll/__tests__/payroll-run-approval-transition.service.test.ts",
      "does not update the period, invalidate close, or apply the event when CAS loses",
    ],
    [
      "postgres_concurrency_and_failure_injection_wired",
      "scripts/payroll-trust-spine-postgres-certification.js",
      "failure_injection_rolls_back_run_event_outbox_audit_and_transition",
    ],
  ])("blocks the %s mutation", (blocker, file, source) => {
    const root = makeTempRepo();
    writeReadyFixture(root);
    mutate(root, file, source);
    const report = buildPayrollTrustSpineReadiness(root, { mode: "fail" });
    expect(report.blockers).toContain(blocker);
    expect(gateResultForReport(report, "fail").exitCode).toBe(1);
  });

  it("blocks when the trust-spine gate leaves the policy chain", () => {
    const root = makeTempRepo();
    writeReadyFixture(root);
    mutate(root, "package.json", "npm run payroll:trust-spine:gate && ", "");
    const report = buildPayrollTrustSpineReadiness(root, { mode: "fail" });
    expect(report.blockers).toContain(
      "postgres_concurrency_and_failure_injection_wired",
    );
  });
});
