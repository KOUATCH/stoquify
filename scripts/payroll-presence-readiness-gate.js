const fs = require("fs");
const path = require("path");
const { writeGeneratedReportFile } = require("./generated-report-writer");

const DEFAULT_JSON_OUT = "what-next/payroll/payroll-presence-readiness.json";
const DEFAULT_MARKDOWN_OUT = "what-next/payroll/payroll-presence-readiness.md";

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

function buildPayrollPresenceReadiness(root = process.cwd(), options = {}) {
  const schema = read(root, "prisma/schema.prisma");
  const payrollControl = read(
    root,
    "services/payroll/payroll-control.service.ts",
  );
  const payrollControlTests = read(
    root,
    "services/payroll/__tests__/payroll-control.service.test.ts",
  );
  const timeLeave = read(root, "services/hris/time-leave.service.ts");
  const readiness = read(root, "services/hris/payroll-readiness-contract.ts");
  const register = read(root, "services/payroll/payroll-register.service.ts");
  const accountingGate = read(
    root,
    "scripts/payroll-accounting-close-development-gate.js",
  );
  const immutabilityMigration = read(
    root,
    "prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql",
  );
  const immutabilityRuntime = read(
    root,
    "scripts/payroll-immutability-runtime-check.js",
  );
  const payrollActions = read(
    root,
    "actions/payroll/payroll-control.actions.ts",
  );
  const operationalTime = read(root, "services/hris/operational-time.service.ts");
  const operationalActions = read(root, "actions/hris/operational-time.actions.ts");
  const employeeSurface = read(root, "components/hris/HrisOperationalTimeRequestPanel.tsx");
  const managerSurface = read(root, "components/hris/HrisOperationalTimeApprovalPanel.tsx");
  const operationalMigration = read(root, "prisma/migrations/20260726213000_hris_operational_time_management/migration.sql");
  const packageJson = read(root, "package.json");

  const checks = [
    {
      id: "country_pack_version_pinned",
      ready:
        schema.includes("countryPackVersion") &&
        schema.includes("calculationSnapshot") &&
        payrollControl.includes(
          "countryPackVersion: countryPack.countryPackVersion",
        ) &&
        payrollControl.includes("countryPackResolutionHash"),
    },
    {
      id: "finalized_payroll_and_payslip_immutable",
      ready:
        immutabilityMigration.includes(
          "payroll_runs_prevent_finalized_mutation_trigger",
        ) &&
        immutabilityMigration.includes(
          "payroll_payslips_prevent_emitted_mutation_trigger",
        ) &&
        immutabilityRuntime.includes("block_payslip_update") &&
        immutabilityRuntime.includes("block_run_line_update"),
    },
    {
      id: "attendance_changes_require_correction",
      ready:
        timeLeave.includes(
          "HRIS_TIME_CORRECTION_REQUIRES_PAYROLL_CORRECTION_RUN",
        ) &&
        timeLeave.includes("PayrollAttendanceSnapshotStatus.SUPERSEDED") &&
        timeLeave.includes('eventType: "attendance.period.corrected"') &&
        payrollControl.includes("PAYROLL_INPUT_SNAPSHOT_ALREADY_SEALED") &&
        payrollControl.includes("PayrollRunType.CORRECTION"),
    },
    {
      id: "payroll_register_ledger_tieout",
      ready:
        register.includes("componentMappingTieOut") &&
        register.includes("ledgerTieOut") &&
        accountingGate.includes("register_to_ledger_and_component_tieout") &&
        accountingGate.includes("register_to_ledger_and_component_tieout"),
    },
    {
      id: "ghost_and_duplicate_destination_risk_visible",
      ready:
        readiness.includes("HRIS_PAYROLL_IDENTITY_SOURCE_PROOF_MISSING") &&
        payrollControl.includes("PAYROLL_INPUT_CONTRACT_MISSING") &&
        payrollControl.includes(
          "PAYROLL_INPUT_PAYMENT_DESTINATION_DUPLICATE",
        ) &&
        payrollControlTests.includes(
          "blocks payroll calculation when active employees share an approved payment destination",
        ),
    },
    {
      id: "tenant_rbac_fresh_auth_and_sod",
      ready:
        payrollActions.includes('permission: "payroll.runs.calculate"') &&
        payrollActions.includes('permission: "payroll.runs.approve"') &&
        payrollActions.includes("freshAuth: true") &&
        payrollControl.includes('action: "payroll.run.approve"') &&
        payrollControl.includes("subjectActorId: run.preparedById") &&
        payrollControl.includes(
          "assertSensitiveActionAllowed(controlDecision)",
        ),
    },
    {
      id: "correction_event_audit_and_notification",
      ready:
        timeLeave.includes("recordBusinessEventInTx") &&
        timeLeave.includes("markBusinessEventAppliedInTx") &&
        timeLeave.includes("HRIS_ATTENDANCE_SNAPSHOT_CORRECTED") &&
        timeLeave.includes('eventName: "attendance_snapshot.corrected"'),
    },
    {
      id: "operational_time_ledgers_present",
      ready:
        schema.includes("model HrisWorkCalendar") &&
        schema.includes("model HrisPublicHoliday") &&
        schema.includes("model HrisWorkSchedule") &&
        schema.includes("model HrisLeavePolicy") &&
        schema.includes("model HrisLeaveBalanceEntry") &&
        schema.includes("model HrisTimeRequest") &&
        schema.includes("model HrisTimeImportBatch") &&
        schema.includes("model HrisTimeEntry") &&
        schema.includes("model HrisAttendanceAnomaly") &&
        operationalMigration.includes('CREATE TABLE "hris_time_requests"'),
    },
    {
      id: "time_request_maker_checker_and_balance_control",
      ready:
        operationalTime.includes("SOD_VIOLATION: A requester cannot approve") &&
        operationalTime.includes("HRIS_LEAVE_BALANCE_INSUFFICIENT") &&
        operationalTime.includes("hrisLeaveBalanceEntry.create") &&
        operationalActions.includes("freshAuth: true"),
    },
    {
      id: "time_import_validation_and_anomaly_queue",
      ready:
        operationalTime.includes("SCHEDULE_RECONCILIATION_MISMATCH") &&
        operationalTime.includes("OVERTIME_EXCEEDS_WORKED") &&
        operationalTime.includes("hrisAttendanceAnomaly.create") &&
        operationalTime.includes("resolveOperationalTimeAnomaly"),
    },
    {
      id: "operational_records_feed_certified_snapshot",
      ready:
        operationalTime.includes("buildOperationalAttendanceCertification") &&
        operationalTime.includes("STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_CERTIFICATION") &&
        operationalTime.includes("HRIS_TIME_INPUT_UNAPPROVED") &&
        operationalActions.includes("certifyHrisTimeLeaveAttendance"),
    },
    {
      id: "employee_and_manager_time_surfaces",
      ready:
        employeeSurface.includes("requestOperationalTimeAction") &&
        managerSurface.includes("decideOperationalTimeRequestAction") &&
        employeeSurface.includes("ATTENDANCE_CORRECTION") &&
        managerSurface.includes("Approve") &&
        managerSurface.includes("Reject"),
    },
    {
      id: "policy_gate_wiring",
      ready:
        packageJson.includes('"payroll:presence:gate"') &&
        packageJson.includes("npm run payroll:presence:gate") &&
        packageJson.includes("npm run payroll:immutability:runtime") &&
        packageJson.indexOf("npm run payroll:presence:gate") <
          packageJson.indexOf("npm run payroll:immutability:runtime"),
    },
  ];

  const blockers = checks
    .filter((check) => !check.ready)
    .map((check) => check.id);
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
    "# Payroll Presence Readiness Gate",
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
    "- This gate is static and read-only.",
    "- It verifies internal payroll/presence controls, not statutory or production approval.",
    "- Live payroll, payments, declarations, and authority effects remain governed by production gates.",
  ];
  return `${lines.join("\n")}\n`;
}

function writeReport(root, options, report) {
  const jsonTarget = path.resolve(root, options.jsonOut);
  const markdownTarget = path.resolve(root, options.out);
  writeGeneratedReportFile(jsonTarget, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeGeneratedReportFile(markdownTarget, renderMarkdown(report), "utf8");
}

if (require.main === module) {
  try {
    const options = parseArgs();
    const root = path.resolve(options.root);
    const report = buildPayrollPresenceReadiness(root, options);
    writeReport(root, options, report);
    console.log(renderMarkdown(report));
    process.exitCode = gateResultForReport(report, options.mode).exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  buildPayrollPresenceReadiness,
  gateResultForReport,
  parseArgs,
  renderMarkdown,
};
