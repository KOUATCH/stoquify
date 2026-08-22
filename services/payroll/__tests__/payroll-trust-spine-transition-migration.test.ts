import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260821210000_payroll_trust_spine_transition_ledger",
  "migration.sql",
);

const contractPath = path.join(
  process.cwd(),
  "docs",
  "HRIS-Payroll",
  "payroll-trust-spine-execution",
  "contracts",
  "payroll-lifecycle-contract.json",
);

const schema = fs.readFileSync(
  path.join(process.cwd(), "prisma", "schema.prisma"),
  "utf8",
);
const migration = fs.readFileSync(migrationPath, "utf8");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8")) as {
  transitions: Array<{ from: string; to: string; eventType: string }>;
};

describe("Payroll Trust Spine transition migration", () => {
  it("models the tenant-owned append-only transition evidence", () => {
    expect(schema).toContain("model PayrollRunTransition {");
    expect(schema).toContain(
      "PayrollRun @relation(fields: [organizationId, payrollRunId], references: [organizationId, id]",
    );
    expect(schema).toContain(
      'BusinessEvent? @relation("PayrollRunTransitionBusinessEvent", fields: [organizationId, businessEventId], references: [organizationId, id]',
    );
    expect(schema).toContain(
      "@@unique([organizationId, payrollRunId, sequence])",
    );
    expect(schema).toContain(
      "@@unique([organizationId, payrollRunId, toStatus])",
    );
    expect(schema).toContain("@@unique([organizationId, idempotencyKey])");
    expect(schema).toContain("@@unique([organizationId, businessEventId])");
  });

  it("adds nullable event links without rewriting existing source evidence", () => {
    for (const column of [
      "decisionBusinessEventId",
      "reviewedBusinessEventId",
      "approvedBusinessEventId",
      "emittedBusinessEventId",
    ]) {
      expect(migration).toContain(`ADD COLUMN "${column}"`);
    }

    expect(migration).toContain(
      'FOREIGN KEY ("organizationId", "payrollRunId")',
    );
    expect(migration).toContain(
      'REFERENCES "payroll_runs"("organizationId", "id")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("organizationId", "businessEventId")',
    );
    expect(migration).toContain(
      'REFERENCES "business_events"("organizationId", "id")',
    );
  });

  it("requires complete runtime evidence for only the frozen lifecycle", () => {
    const expected = contract.transitions.map(
      (transition) =>
        `("fromStatus" = '${transition.from}' AND "toStatus" = '${transition.to}')`,
    );

    for (const transition of expected) {
      expect(migration).toContain(transition);
    }

    for (const requiredEvidence of [
      '"actorId" IS NOT NULL',
      '"transitionedAt" IS NOT NULL',
      '"businessEventId" IS NOT NULL',
      '"idempotencyKey" IS NOT NULL',
      '"payloadHash" IS NOT NULL',
      '"toVersion" = "fromVersion" + 1',
    ]) {
      expect(migration).toContain(requiredEvidence);
    }
  });

  it("backfills one explicitly partial snapshot without inventing a lifecycle", () => {
    expect(migration).toContain("'LEGACY_BACKFILL'");
    expect(migration).toContain("'LEGACY_PARTIAL_EVIDENCE'");
    expect(migration).toContain('"fromStatus" IS NULL');
    expect(migration).toContain('"fromVersion" IS NULL');
    expect(migration).toContain('"idempotencyKey" IS NULL');
    expect(migration).toContain('"payloadHash" IS NULL');
    expect(migration).toContain(
      "Historical lifecycle snapshot only; no intermediate transitions were inferred.",
    );
    expect(migration).toContain(
      'ON CONFLICT ("organizationId", "payrollRunId", "toStatus") DO NOTHING',
    );
  });

  it("bridges paid and archived runs only to the last provable trust-spine stage", () => {
    expect(migration).toContain("run.\"status\" IN ('PAID', 'ARCHIVED')");
    expect(migration).toContain("ELSE 'POSTED'::\"PayrollRunStatus\"");
    expect(migration).toContain('run."postedAt" IS NOT NULL');
    expect(migration).toContain('run."ledgerPostingBatchId" IS NOT NULL');
    expect(migration).not.toContain("'PAID'::\"PayrollRunStatus\"");
  });

  it("serializes runtime inserts against the tenant-scoped source run", () => {
    expect(migration).toContain(
      'WHERE run."organizationId" = NEW."organizationId"',
    );
    expect(migration).toContain('AND run."id" = NEW."payrollRunId"');
    expect(migration).toContain("FOR UPDATE;");
    expect(migration).toContain(
      'source_run."status" IS DISTINCT FROM NEW."fromStatus"',
    );
    expect(migration).toContain(
      'source_run."version" IS DISTINCT FROM NEW."fromVersion"',
    );
    expect(migration).toContain("Payroll transition sequence conflict");
  });

  it("enforces SoD and canonical event identity at the database boundary", () => {
    expect(migration).toContain("Payroll review violates separation of duties");
    expect(migration).toContain(
      "Payroll approval violates separation of duties",
    );
    expect(migration).toContain(
      "Payroll posting violates separation of duties",
    );
    expect(migration).toContain(
      "Payroll emission requires persisted approval evidence",
    );
    expect(migration).toContain('source_run."preparedById" IS NULL');
    expect(migration).toContain('source_run."approvedById" IS NULL');

    for (const { eventType } of contract.transitions) {
      expect(migration).toContain(`THEN '${eventType}'`);
    }
    expect(migration).toContain("Payroll transition canonical event mismatch");
  });

  it("rejects every update or delete of transition evidence", () => {
    expect(migration).toContain(
      'CREATE TRIGGER "payroll_run_transitions_append_only"',
    );
    expect(migration).toContain(
      'BEFORE UPDATE OR DELETE ON "payroll_run_transitions"',
    );
    expect(migration).toContain(
      "Payroll run transition evidence is immutable and append-only",
    );
  });
});
