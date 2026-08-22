const {
  extractBackfillSql,
  parseArgs,
  safeDatabase,
} = require("../payroll-trust-spine-migration-runtime-check");

describe("Payroll Trust Spine migration runtime proof harness", () => {
  const originalPayrollUrl = process.env.PAYROLL_IMMUTABILITY_DATABASE_URL;
  const originalTestUrl = process.env.TEST_DATABASE_URL;

  afterEach(() => {
    if (originalPayrollUrl === undefined)
      delete process.env.PAYROLL_IMMUTABILITY_DATABASE_URL;
    else process.env.PAYROLL_IMMUTABILITY_DATABASE_URL = originalPayrollUrl;
    if (originalTestUrl === undefined) delete process.env.TEST_DATABASE_URL;
    else process.env.TEST_DATABASE_URL = originalTestUrl;
  });

  it("parses only the two redacted evidence output paths", () => {
    expect(
      parseArgs([
        "node",
        "script",
        "--out",
        "proof.md",
        "--json-out",
        "proof.json",
      ]),
    ).toMatchObject({
      out: expect.stringMatching(/proof\.md$/),
      jsonOut: expect.stringMatching(/proof\.json$/),
    });
    expect(() => parseArgs(["node", "script", "--unsafe"])).toThrow(
      "Unknown argument",
    );
  });

  it("refuses missing, remote, and production-named databases", () => {
    delete process.env.PAYROLL_IMMUTABILITY_DATABASE_URL;
    delete process.env.TEST_DATABASE_URL;
    expect(() => safeDatabase()).toThrow("dedicated test database");

    process.env.PAYROLL_IMMUTABILITY_DATABASE_URL =
      "postgresql://user:secret@db.example.com:5432/payroll_test";
    expect(() => safeDatabase()).toThrow("Refusing");

    process.env.PAYROLL_IMMUTABILITY_DATABASE_URL =
      "postgresql://user:secret@localhost:5432/payroll_production";
    expect(() => safeDatabase()).toThrow("Refusing");
  });

  it("accepts only a local disposable database without exposing credentials", () => {
    process.env.PAYROLL_IMMUTABILITY_DATABASE_URL =
      "postgresql://user:secret@localhost:5432/payroll_transition_test";
    expect(safeDatabase()).toMatchObject({
      host: "localhost",
      database: "payroll_transition_test",
    });
  });

  it("extracts the restartable historical backfill only", () => {
    const sql = extractBackfillSql();
    expect(sql).toContain('INSERT INTO "payroll_run_transitions"');
    expect(sql).toContain("'LEGACY_PARTIAL_EVIDENCE'");
    expect(sql).toContain(
      'ON CONFLICT ("organizationId", "payrollRunId", "toStatus") DO NOTHING',
    );
    expect(sql).not.toContain("CREATE OR REPLACE FUNCTION");
  });
});
