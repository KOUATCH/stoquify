const {
  buildIds,
  parseArgs,
  safeDatabase,
} = require("../payroll-trust-spine-postgres-certification");

describe("Payroll Trust Spine PostgreSQL certification harness", () => {
  it("accepts only the two evidence output paths", () => {
    expect(
      parseArgs([
        "node",
        "script",
        "--out",
        "certificate.md",
        "--json-out",
        "certificate.json",
      ]),
    ).toMatchObject({
      out: expect.stringMatching(/certificate\.md$/),
      jsonOut: expect.stringMatching(/certificate\.json$/),
    });
    expect(() => parseArgs(["node", "script", "--unsafe"])).toThrow(
      "Unknown argument",
    );
  });

  it("refuses missing, remote, and production-named databases", () => {
    expect(() => safeDatabase({})).toThrow("dedicated test database");
    expect(() =>
      safeDatabase({
        PAYROLL_IMMUTABILITY_DATABASE_URL:
          "postgresql://user:secret@db.example.com:5432/payroll_test",
      }),
    ).toThrow("Refusing");
    expect(() =>
      safeDatabase({
        PAYROLL_IMMUTABILITY_DATABASE_URL:
          "postgresql://user:secret@localhost:5432/payroll_production",
      }),
    ).toThrow("Refusing");
  });

  it("accepts a local disposable database without returning credentials", () => {
    expect(
      safeDatabase({
        PAYROLL_IMMUTABILITY_DATABASE_URL:
          "postgresql://user:secret@localhost:5432/payroll_transition_test",
      }),
    ).toMatchObject({
      host: "localhost",
      database: "payroll_transition_test",
    });
  });

  it("builds isolated race and rollback fixture identifiers", () => {
    expect(buildIds("race", "fixed")).toEqual({
      organizationId: "trust_cert_org_race_fixed",
      periodId: "trust_cert_period_race_fixed",
      runId: "trust_cert_run_race_fixed",
      reviewEventId: "trust_cert_review_race_fixed",
    });
  });
});
