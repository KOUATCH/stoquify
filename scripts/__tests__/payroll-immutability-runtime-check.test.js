const fs = require("fs")
const path = require("path")
const { REQUIRED_TRIGGERS, buildReport, exitCodeForReport, parseArgs, safeDatabase } = require("../payroll-immutability-runtime-check")

const ORIGINAL_ENV = process.env

describe("payroll immutability runtime check", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.PAYROLL_IMMUTABILITY_DATABASE_URL
    delete process.env.TEST_DATABASE_URL
    delete process.env.PAYROLL_IMMUTABILITY_ALLOW_SHARED_DATABASE
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it("requires a dedicated payroll immutability or test database URL", () => {
    expect(() => safeDatabase()).toThrow(/PAYROLL_IMMUTABILITY_DATABASE_URL|TEST_DATABASE_URL/)
  })

  it("refuses to use DATABASE_URL directly by default", () => {
    const url = "postgresql://user:pass@localhost:5432/stockflow_immutability_test"
    process.env.DATABASE_URL = url
    process.env.PAYROLL_IMMUTABILITY_DATABASE_URL = url

    expect(() => safeDatabase()).toThrow(/Refusing to use DATABASE_URL/)
  })

  it("requires a clearly non-production database name", () => {
    process.env.PAYROLL_IMMUTABILITY_DATABASE_URL = "postgresql://user:pass@localhost:5432/stockflow"

    expect(() => safeDatabase()).toThrow(/Database name must include/)
  })

  it("accepts an explicit immutability test database", () => {
    process.env.PAYROLL_IMMUTABILITY_DATABASE_URL = "postgresql://user:pass@localhost:5432/stockflow_immutability_test"

    expect(safeDatabase()).toMatchObject({
      dbName: "stockflow_immutability_test",
      host: "localhost",
    })
  })

  it("keeps all protected payroll trigger names in the runtime contract", () => {
    expect(REQUIRED_TRIGGERS).toEqual(
      expect.arrayContaining([
        ["payroll_runs", "payroll_runs_prevent_finalized_mutation_trigger"],
        ["payroll_run_lines", "payroll_run_lines_prevent_posted_mutation_trigger"],
        ["payroll_payslips", "payroll_payslips_prevent_emitted_mutation_trigger"],
        ["payroll_payslip_lines", "payroll_payslip_lines_prevent_emitted_mutation_trigger"],
        ["payroll_payment_batches", "payroll_payment_batches_prevent_released_mutation_trigger"],
        ["payroll_payment_allocations", "payroll_payment_allocations_prevent_released_mutation_trigger"],
        ["payroll_declarations", "payroll_declarations_prevent_payload_mutation_trigger"],
      ]),
    )
  })

  it("turns runtime immutability blockers into fail-mode release blockers", () => {
    const args = { mode: "fail", applyMigrations: false, out: null, jsonOut: null }
    const report = buildReport(
      args,
      { dbName: "stockflow_immutability_test", host: "localhost" },
      { exitCode: 0 },
      {
        triggers: REQUIRED_TRIGGERS.map(([tableName, triggerName]) => ({ tableName, triggerName, present: true })),
        mutations: {
          blocked: [{ label: "block_run_update", passed: false, message: "Mutation unexpectedly succeeded." }],
          allowed: [{ label: "allow_run_metadata", passed: true, message: "Allowed lifecycle metadata mutation succeeded." }],
        },
      },
      null,
    )

    expect(report.status).toBe("blocked")
    expect(report.summary.blockerCount).toBe(1)
    expect(report.blockers).toContainEqual({ area: "mutation_not_blocked", detail: "block_run_update" })
    expect(exitCodeForReport(args, report)).toBe(1)
  })

  it("uses mapped physical table names for synthetic seed data", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "payroll-immutability-runtime-check.js"), "utf8")

    expect(source).toContain('INSERT INTO "organizations"')
    expect(source).not.toContain('INSERT INTO "Organization"')
  })

  it("parses report output arguments", () => {
    expect(parseArgs(["node", "script", "--mode", "warn", "--skip-migrate", "--out", "out.md"])).toMatchObject({
      mode: "warn",
      applyMigrations: false,
    })
  })
})
