import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260625110000_payroll_kernel_immutability",
  "migration.sql",
);

const migrationSql = fs.readFileSync(migrationPath, "utf8");

const declarationLifecycleMigrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260626133000_payroll_declaration_lifecycle_evidence",
  "migration.sql",
);

const declarationLifecycleMigrationSql = fs.readFileSync(
  declarationLifecycleMigrationPath,
  "utf8",
);

const paymentReconciliationLifecycleMigrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260626143000_payroll_payment_reconciliation_lifecycle",
  "migration.sql",
);

const paymentReconciliationLifecycleMigrationSql = fs.readFileSync(
  paymentReconciliationLifecycleMigrationPath,
  "utf8",
);

const employeeBalanceLifecycleMigrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260628123000_payroll_employee_balance_lifecycle",
  "migration.sql",
);

const employeeBalanceLifecycleMigrationSql = fs.readFileSync(
  employeeBalanceLifecycleMigrationPath,
  "utf8",
);

describe("payroll kernel immutability migration", () => {
  it.each([
    ["payroll_runs", "payroll_runs_prevent_finalized_mutation_trigger"],
    ["payroll_run_lines", "payroll_run_lines_prevent_posted_mutation_trigger"],
    ["payroll_payslips", "payroll_payslips_prevent_emitted_mutation_trigger"],
    [
      "payroll_payslip_lines",
      "payroll_payslip_lines_prevent_emitted_mutation_trigger",
    ],
    [
      "payroll_payment_batches",
      "payroll_payment_batches_prevent_released_mutation_trigger",
    ],
    [
      "payroll_payment_allocations",
      "payroll_payment_allocations_prevent_released_mutation_trigger",
    ],
    [
      "payroll_declarations",
      "payroll_declarations_prevent_payload_mutation_trigger",
    ],
  ])("installs an immutability trigger for %s", (tableName, triggerName) => {
    expect(migrationSql).toContain(`ON "${tableName}"`);
    expect(migrationSql).toContain(`"${triggerName}"`);
  });

  it("blocks mutation of finalized payroll evidence statuses", () => {
    expect(migrationSql).toContain("'POSTED', 'ARCHIVED'");
    expect(migrationSql).toContain("'EMITTED', 'CORRECTED', 'VOIDED'");
    expect(migrationSql).toContain(
      "'RELEASED', 'PARTIALLY_SETTLED', 'SETTLED'",
    );
    expect(migrationSql).toContain("Cannot modify immutable payroll evidence");
    expect(migrationSql).toContain("Cannot delete immutable payroll evidence");
  });

  it("keeps declaration payload content immutable while allowing lifecycle status evidence", () => {
    expect(migrationSql).toContain(
      '"payroll_declarations_prevent_payload_mutation"',
    );
    expect(migrationSql).toContain(
      "ARRAY['updatedAt', 'metadata', 'status', 'dueDate']::TEXT[]",
    );
    expect(migrationSql).toContain("'declaration ' || OLD.\"id\"");
  });

  it("allows only forward payroll payment settlement status lifecycle changes", () => {
    expect(paymentReconciliationLifecycleMigrationSql).toContain(
      '"payroll_payment_batches_prevent_released_mutation"',
    );
    expect(paymentReconciliationLifecycleMigrationSql).toContain(
      "OLD.\"status\"::TEXT = 'RELEASED' AND NEW.\"status\"::TEXT IN ('PARTIALLY_SETTLED', 'SETTLED')",
    );
    expect(paymentReconciliationLifecycleMigrationSql).toContain(
      "OLD.\"status\"::TEXT = 'PARTIALLY_SETTLED' AND NEW.\"status\"::TEXT IN ('PARTIALLY_SETTLED', 'SETTLED')",
    );
    expect(paymentReconciliationLifecycleMigrationSql).toContain(
      "ARRAY['updatedAt', 'metadata', 'notes', 'status', 'reconciliationStatus', 'paymentExceptionId']::TEXT[]",
    );
    expect(paymentReconciliationLifecycleMigrationSql).toContain(
      "Cannot change immutable payroll payment lifecycle status",
    );
  });
  it("makes declaration lifecycle evidence append-only", () => {
    expect(declarationLifecycleMigrationSql).toContain(
      'CREATE TABLE "payroll_declaration_evidence"',
    );
    expect(declarationLifecycleMigrationSql).toContain(
      '"PayrollDeclarationEvidenceTransition"',
    );
    expect(declarationLifecycleMigrationSql).toContain(
      '"payroll_declaration_evidence_prevent_mutation"',
    );
    expect(declarationLifecycleMigrationSql).toContain(
      'BEFORE UPDATE OR DELETE ON "payroll_declaration_evidence"',
    );
    expect(declarationLifecycleMigrationSql).toContain(
      "Cannot modify immutable payroll evidence: declaration evidence",
    );
  });

  it("makes payroll employee balance lifecycle events append-only", () => {
    expect(employeeBalanceLifecycleMigrationSql).toContain(
      'CREATE TABLE "payroll_employee_balance_events"',
    );
    expect(employeeBalanceLifecycleMigrationSql).toContain(
      '"PayrollEmployeeBalanceEventType"',
    );
    expect(employeeBalanceLifecycleMigrationSql).toContain(
      '"payroll_employee_balance_events_prevent_mutation"',
    );
    expect(employeeBalanceLifecycleMigrationSql).toContain(
      'BEFORE UPDATE OR DELETE ON "payroll_employee_balance_events"',
    );
    expect(employeeBalanceLifecycleMigrationSql).toContain(
      "Cannot modify immutable payroll evidence: employee balance event",
    );
  });
});
