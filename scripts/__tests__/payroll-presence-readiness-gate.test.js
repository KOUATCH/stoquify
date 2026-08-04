const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  buildPayrollPresenceReadiness,
  gateResultForReport,
} = require("../payroll-presence-readiness-gate");

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "payroll-presence-gate-"));
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source, "utf8");
}

function writeReadyFixture(root) {
  write(
    root,
    "prisma/schema.prisma",
    "countryPackVersion\ncalculationSnapshot\nmodel HrisWorkCalendar\nmodel HrisPublicHoliday\nmodel HrisWorkSchedule\nmodel HrisLeavePolicy\nmodel HrisLeaveBalanceEntry\nmodel HrisTimeRequest\nmodel HrisTimeImportBatch\nmodel HrisTimeEntry\nmodel HrisAttendanceAnomaly",
  );
  write(
    root,
    "services/payroll/payroll-control.service.ts",
    [
      "countryPackVersion: countryPack.countryPackVersion",
      "countryPackResolutionHash",
      "PAYROLL_INPUT_SNAPSHOT_ALREADY_SEALED",
      "PayrollRunType.CORRECTION",
      "PAYROLL_INPUT_CONTRACT_MISSING",
      "PAYROLL_INPUT_PAYMENT_DESTINATION_DUPLICATE",
      'action: "payroll.run.approve"',
      "subjectActorId: run.preparedById",
      "assertSensitiveActionAllowed(controlDecision)",
    ].join("\n"),
  );
  write(
    root,
    "services/payroll/__tests__/payroll-control.service.test.ts",
    [
      "blocks payroll calculation when active employees share an approved payment destination",
    ].join("\n"),
  );
  write(
    root,
    "services/hris/time-leave.service.ts",
    [
      "HRIS_TIME_CORRECTION_REQUIRES_PAYROLL_CORRECTION_RUN",
      "PayrollAttendanceSnapshotStatus.SUPERSEDED",
      'eventType: "attendance.period.corrected"',
      "recordBusinessEventInTx",
      "markBusinessEventAppliedInTx",
      "HRIS_ATTENDANCE_SNAPSHOT_CORRECTED",
      'eventName: "attendance_snapshot.corrected"',
    ].join("\n"),
  );
  write(
    root,
    "services/hris/payroll-readiness-contract.ts",
    "HRIS_PAYROLL_IDENTITY_SOURCE_PROOF_MISSING",
  );
  write(
    root,
    "services/payroll/payroll-register.service.ts",
    "componentMappingTieOut\nledgerTieOut",
  );
  write(
    root,
    "scripts/payroll-accounting-close-development-gate.js",
    "register_to_ledger_and_component_tieout",
  );
  write(
    root,
    "prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql",
    "payroll_runs_prevent_finalized_mutation_trigger\npayroll_payslips_prevent_emitted_mutation_trigger",
  );
  write(
    root,
    "scripts/payroll-immutability-runtime-check.js",
    "block_payslip_update\nblock_run_line_update",
  );
  write(
    root,
    "actions/payroll/payroll-control.actions.ts",
    [
      'permission: "payroll.runs.calculate"',
      'permission: "payroll.runs.approve"',
      "freshAuth: true",
    ].join("\n"),
  );  write(
    root,
    "services/hris/operational-time.service.ts",
    [
      "SOD_VIOLATION: A requester cannot approve",
      "HRIS_LEAVE_BALANCE_INSUFFICIENT",
      "hrisLeaveBalanceEntry.create",
      "SCHEDULE_RECONCILIATION_MISMATCH",
      "OVERTIME_EXCEEDS_WORKED",
      "hrisAttendanceAnomaly.create",
      "resolveOperationalTimeAnomaly",
      "buildOperationalAttendanceCertification",
      "STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_CERTIFICATION",
      "HRIS_TIME_INPUT_UNAPPROVED",
    ].join("\n"),
  );
  write(root, "actions/hris/operational-time.actions.ts", "freshAuth: true\ncertifyHrisTimeLeaveAttendance");
  write(root, "components/hris/HrisOperationalTimeRequestPanel.tsx", "requestOperationalTimeAction\nATTENDANCE_CORRECTION");
  write(root, "components/hris/HrisOperationalTimeApprovalPanel.tsx", "decideOperationalTimeRequestAction\nApprove\nReject");
  write(root, "prisma/migrations/20260726213000_hris_operational_time_management/migration.sql", 'CREATE TABLE "hris_time_requests"');
  write(
    root,
    "package.json",
    JSON.stringify(
      {
        scripts: {
          "payroll:presence:gate": "node scripts/payroll-presence-readiness-gate.js --mode fail",
          "payroll:immutability:runtime": "node scripts/payroll-immutability-runtime-check.js --mode fail",
          "policy:gates": "npm run payroll:presence:gate && npm run payroll:immutability:runtime",
        },
      },
      null,
      2,
    ),
  );
}

describe("payroll presence readiness gate", () => {
  it("passes the complete internal payroll/presence control spine", () => {
    const root = makeTempRepo();
    writeReadyFixture(root);

    const report = buildPayrollPresenceReadiness(root, { mode: "fail" });

    expect(report.summary).toMatchObject({
      status: "ready",
      readyCount: 13,
      blockerCount: 0,
    });
    expect(gateResultForReport(report, "fail").exitCode).toBe(0);
  });

  it("blocks when payroll presence is not in the release policy path", () => {
    const root = makeTempRepo();
    writeReadyFixture(root);
    write(
      root,
      "package.json",
      JSON.stringify(
        {
          scripts: {
            "payroll:presence:gate": "node scripts/payroll-presence-readiness-gate.js --mode fail",
            "payroll:immutability:runtime": "node scripts/payroll-immutability-runtime-check.js --mode fail",
            "policy:gates": "npm run payroll:immutability:runtime",
          },
        },
        null,
        2,
      ),
    );

    const report = buildPayrollPresenceReadiness(root, { mode: "fail" });

    expect(report.blockers).toContain("policy_gate_wiring");
    expect(gateResultForReport(report, "fail").exitCode).toBe(1);
  });

  it("blocks when duplicate destination detection is removed", () => {
    const root = makeTempRepo();
    writeReadyFixture(root);
    const target = path.join(
      root,
      "services/payroll/payroll-control.service.ts",
    );
    fs.writeFileSync(
      target,
      fs
        .readFileSync(target, "utf8")
        .replace(
          "PAYROLL_INPUT_PAYMENT_DESTINATION_DUPLICATE",
          "duplicate detection missing",
        ),
      "utf8",
    );

    const report = buildPayrollPresenceReadiness(root, { mode: "fail" });

    expect(report.blockers).toContain(
      "ghost_and_duplicate_destination_risk_visible",
    );
    expect(gateResultForReport(report, "fail").exitCode).toBe(1);
  });

  it("blocks when post-payroll attendance corrections can bypass correction runs", () => {
    const root = makeTempRepo();
    writeReadyFixture(root);
    const target = path.join(root, "services/hris/time-leave.service.ts");
    fs.writeFileSync(
      target,
      fs
        .readFileSync(target, "utf8")
        .replace(
          "HRIS_TIME_CORRECTION_REQUIRES_PAYROLL_CORRECTION_RUN",
          "correction run guard missing",
        ),
      "utf8",
    );

    const report = buildPayrollPresenceReadiness(root, { mode: "fail" });

    expect(report.blockers).toContain("attendance_changes_require_correction");
  });
});
