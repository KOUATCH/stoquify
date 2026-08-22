#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { writeGeneratedReportFile } = require("./generated-report-writer");

const DEFAULT_JSON_OUT =
  "what-next/payroll/payroll-trust-spine-readiness.json";
const DEFAULT_MARKDOWN_OUT =
  "what-next/payroll/payroll-trust-spine-readiness.md";

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    root: process.cwd(),
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") options.mode = argv[++index];
    else if (value === "--root") options.root = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`);
  }
  return options;
}

function read(root, relativePath) {
  const target = path.join(root, relativePath);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
}

function section(source, start, end) {
  const from = source.indexOf(start);
  if (from < 0) return "";
  const to = source.indexOf(end, from + start.length);
  return to < 0 ? source.slice(from) : source.slice(from, to);
}

function includesAll(source, values) {
  return values.every((value) => source.includes(value));
}

function transitionCommandReady(source, contract) {
  const block = section(
    source,
    `export async function ${contract.command}`,
    contract.end,
  );
  return includesAll(block, [
    "inPayrollTransitionTransaction",
    `PayrollRunStatus.${contract.from}`,
    `PayrollRunStatus.${contract.to}`,
    `eventType: "${contract.eventType}"`,
    "persistPayrollRunTransition",
  ]);
}

function protectedActionReady(source, contract) {
  const block = section(source, `const ${contract.binding} = protect`, contract.end);
  return includesAll(block, [
    `permission: "${contract.permission}"`,
    "freshAuth: { maxAgeSeconds: 300 }",
    'tenantGuard: "handler-derived"',
    "organizationId: ctx.orgId",
    "actorId: ctx.userId",
    "actorPermissions: ctx.permissions",
    "lastAuthAt: ctx.freshAuth.lastAuthAt",
    `await ${contract.service}(`,
  ]);
}

function buildPayrollTrustSpineReadiness(root = process.cwd(), options = {}) {
  const service = read(root, "services/payroll/payroll-control.service.ts");
  const actions = read(root, "actions/payroll/payroll-control.actions.ts");
  const transitionTests = read(
    root,
    "services/payroll/__tests__/payroll-run-approval-transition.service.test.ts",
  );
  const actionTests = read(
    root,
    "actions/payroll/__tests__/payroll-control.actions.test.ts",
  );
  const migration = read(
    root,
    "prisma/migrations/20260821210000_payroll_trust_spine_transition_ledger/migration.sql",
  );
  const postgresCertification = read(
    root,
    "scripts/payroll-trust-spine-postgres-certification.js",
  );
  const postgresCertificationTests = read(
    root,
    "scripts/__tests__/payroll-trust-spine-postgres-certification.test.js",
  );
  const packageJson = read(root, "package.json");

  const commands = [
    {
      command: "reviewPayrollRun",
      end: "export async function approvePayrollRun",
      from: "CALCULATED",
      to: "REVIEWED",
      eventType: "PAYROLL_RUN_REVIEWED",
    },
    {
      command: "approvePayrollRun",
      end: "export async function emitPayrollPayslips",
      from: "REVIEWED",
      to: "APPROVED",
      eventType: "PAYROLL_RUN_APPROVED",
    },
    {
      command: "emitPayrollPayslips",
      end: "export async function postPayrollRun",
      from: "APPROVED",
      to: "EMITTED",
      eventType: "PAYSLIP_EMITTED",
    },
    {
      command: "postPayrollRun",
      end: "/**\n * @deprecated",
      from: "EMITTED",
      to: "POSTED",
      eventType: "PAYROLL_POSTED",
    },
  ];
  const protectedActions = [
    {
      binding: "reviewRun",
      end: "export async function reviewPayrollRunAction",
      permission: "payroll.runs.review",
      service: "reviewPayrollRun",
    },
    {
      binding: "approveRun",
      end: "export async function approvePayrollRunAction",
      permission: "payroll.runs.approve",
      service: "approvePayrollRun",
    },
    {
      binding: "emitPayslips",
      end: "export async function emitPayrollPayslipsAction",
      permission: "payroll.payslips.emit",
      service: "emitPayrollPayslips",
    },
    {
      binding: "postRun",
      end: "export async function postPayrollRunAction",
      permission: "payroll.runs.post",
      service: "postPayrollRun",
    },
  ];

  const persistenceBlock = section(
    service,
    "async function persistPayrollRunTransition",
    "async function requireTransitionedPayrollRun",
  );
  const persistenceOrder = [
    "payrollRunTransition.create",
    "payrollRun.updateMany",
    "await input.afterCompareAndSet?.();",
    "writeAudit",
    "markBusinessEventAppliedInTx",
  ].map((value) => persistenceBlock.indexOf(value));

  const policy = (() => {
    try {
      return JSON.parse(packageJson).scripts || {};
    } catch {
      return {};
    }
  })();

  const checks = [
    {
      id: "persisted_five_stage_lifecycle",
      ready:
        commands.every((contract) => transitionCommandReady(service, contract)) &&
        includesAll(migration, [
          "'CALCULATED' AND \"toStatus\" = 'REVIEWED'",
          "'REVIEWED' AND \"toStatus\" = 'APPROVED'",
          "'APPROVED' AND \"toStatus\" = 'EMITTED'",
          "'EMITTED' AND \"toStatus\" = 'POSTED'",
        ]) &&
        !migration.includes(
          "'CALCULATED' AND \"toStatus\" = 'POSTED'",
        ),
    },
    {
      id: "collapsed_transition_shortcut_fails_closed",
      ready:
        includesAll(
          section(
            service,
            "export async function approveAndPostPayrollRun",
            "export async function requestPayrollPaymentBatch",
          ),
          [
            'process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED === "true"',
            '"INVALID_TRANSITION"',
            "Combined payroll approval and posting is disabled",
          ],
        ) &&
        !actions.includes("approveAndPostPayrollRunAction") &&
        transitionTests.includes(
          "fails the deprecated combined command closed after Trust Spine cutover",
        ),
    },
    {
      id: "canonical_transition_events_are_transactional",
      ready:
        commands.every((contract) =>
          includesAll(service, [
            `eventType: "${contract.eventType}"`,
            "recordBusinessEventInTx",
          ]),
        ) &&
        includesAll(persistenceBlock, [
          "businessEventId: input.businessEventId",
          "writeAudit",
          "markBusinessEventAppliedInTx",
        ]) &&
        includesAll(transitionTests, [
          "records the canonical review event and tenant-scoped compare-and-set transition",
          "atomically records the distinct approval event and compare-and-set transition",
          "creates the canonical event, emitted payslips, and CAS transition atomically",
          "posts the ledger and commits CAS, invalidation, audit, and event application in order",
        ]),
    },
    {
      id: "fresh_auth_and_server_derived_trust_context",
      ready:
        protectedActions.every((contract) =>
          protectedActionReady(actions, contract),
        ) &&
        includesAll(actionTests, [
          "passes server-derived actor and verified fresh-auth evidence when approving a reviewed payroll run",
          "protects $label with server-derived tenant, actor, permissions, and fresh-auth evidence",
          'organizationId: "client-org"',
          'actorId: "client-actor"',
          'lastAuthAt: "1900-01-01T00:00:00.000Z"',
          "fails payroll approval closed when step-up authentication is missing",
        ]),
    },
    {
      id: "cas_idempotency_and_partial_commit_regressions_covered",
      ready:
        persistenceOrder.every((index) => index >= 0) &&
        persistenceOrder.every(
          (index, position) => position === 0 || index > persistenceOrder[position - 1],
        ) &&
        service.includes("Prisma.TransactionIsolationLevel.Serializable") &&
        includesAll(transitionTests, [
          "rolls the review transition back when compare-and-set loses",
          "does not apply the emission event when compare-and-set loses",
          "does not update the period, invalidate close, or apply the event when CAS loses",
          "rolls back with a concurrency conflict when compare-and-set loses",
          "retries a serializable transaction conflict and applies the transition once",
          "returns the prior result for a same-payload idempotent replay",
          "rejects an idempotency key reused with a different approval document",
        ]),
    },
    {
      id: "postgres_concurrency_and_failure_injection_wired",
      ready:
        includesAll(postgresCertification, [
          "BEGIN ISOLATION LEVEL SERIALIZABLE",
          "Promise.all",
          "ROLLBACK",
          "concurrent_approval_has_one_atomic_winner",
          "duplicate_evidence_is_rejected_without_partial_commit",
          "failure_injection_rolls_back_run_event_outbox_audit_and_transition",
          "local disposable test database",
        ]) &&
        includesAll(postgresCertificationTests, [
          "refuses missing, remote, and production-named databases",
          "accepts a local disposable database without returning credentials",
        ]) &&
        typeof policy["payroll:trust-spine:postgres"] === "string" &&
        policy["payroll:trust-spine:postgres"].includes(
          "payroll-trust-spine-postgres-certification.js",
        ) &&
        typeof policy["payroll:trust-spine:gate"] === "string" &&
        typeof policy["policy:gates"] === "string" &&
        policy["policy:gates"].includes("npm run payroll:trust-spine:gate") &&
        policy["policy:gates"].includes("npm run payroll:trust-spine:postgres"),
    },
  ];

  const blockers = checks.filter((check) => !check.ready).map((check) => check.id);
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
    },
    checks,
    blockers,
  };
}

function gateResultForReport(report, mode = "report") {
  return {
    status: report.summary.status,
    exitCode: mode === "fail" && report.blockers.length ? 1 : 0,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Payroll Trust Spine Readiness Gate",
    "",
    `Generated: ${report.summary.generatedAt}`,
    `Mode: ${report.summary.mode}`,
    `Status: ${report.summary.status}`,
    "",
    "## Summary",
    "",
    `- Checks ready: ${report.summary.readyCount}/${report.summary.checkCount}`,
    `- Blockers: ${report.summary.blockerCount}`,
    "",
    "## Checks",
    "",
    ...report.checks.map(
      (check) => `- ${check.ready ? "ready" : "blocked"}: ${check.id}`,
    ),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length
      ? report.blockers.map((blocker) => `- ${blocker}`)
      : ["- None"]),
    "",
    "## Safety",
    "",
    "- The readiness gate is static and read-only.",
    "- The separately wired PostgreSQL certificate is restricted to a local disposable test database.",
    "- Readiness is internal engineering evidence, not production or statutory approval.",
  ];
  return `${lines.join("\n")}\n`;
}

function writeReport(root, options, report) {
  writeGeneratedReportFile(
    path.resolve(root, options.jsonOut),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  writeGeneratedReportFile(
    path.resolve(root, options.out),
    renderMarkdown(report),
    "utf8",
  );
}

if (require.main === module) {
  try {
    const options = parseArgs();
    const root = path.resolve(options.root);
    const report = buildPayrollTrustSpineReadiness(root, options);
    writeReport(root, options, report);
    console.log(renderMarkdown(report));
    process.exitCode = gateResultForReport(report, options.mode).exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  buildPayrollTrustSpineReadiness,
  gateResultForReport,
  parseArgs,
  renderMarkdown,
};
