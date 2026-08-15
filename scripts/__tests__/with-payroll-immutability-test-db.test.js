const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  TEST_DB_NAME,
  readDotenvValue,
  resolvePayrollImmutabilityDatabaseUrl,
  setDatabaseName,
} = require("../with-payroll-immutability-test-db")
const {
  buildMigrationDiagnostics,
  redactDiagnosticText,
  renderDiagnostics,
  resolveSafeTarget,
} = require("../reset-payroll-immutability-test-db")

describe("with payroll immutability test db", () => {
  it("derives the dedicated immutability database from a local DATABASE_URL", () => {
    const url = setDatabaseName("postgresql://user:pass@localhost:5432/stockflow?schema=public")

    expect(new URL(url).pathname).toBe(`/${TEST_DB_NAME}`)
    expect(url).toContain("schema=public")
  })

  it("percent-encodes credential characters that break URL parsing", () => {
    const url = setDatabaseName("postgresql://user:p@ss@localhost:5432/stockflow?schema=public")

    expect(new URL(url)).toMatchObject({
      hostname: "localhost",
      pathname: `/${TEST_DB_NAME}`,
    })
    expect(url).toContain("p%40ss")
  })

  it("prefers explicit payroll immutability URLs", () => {
    expect(
      resolvePayrollImmutabilityDatabaseUrl({
        PAYROLL_IMMUTABILITY_DATABASE_URL: "postgresql://user:pass@localhost:5432/explicit_immutability_test",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/stockflow",
      }),
    ).toBe("postgresql://user:pass@localhost:5432/explicit_immutability_test")
  })

  it("expands local .env placeholders before deriving the test database", () => {
    const envPath = path.join(os.tmpdir(), `payroll-immutability-env-${Date.now()}.env`)
    fs.writeFileSync(
      envPath,
      [
        "DB_USER=user",
        "DB_PASSWORD=p@ss",
        "DB_HOST=localhost",
        "DB_PORT=5432",
        "DB_NAME=stockflow",
        'DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"',
      ].join(os.EOL),
      "utf8",
    )

    try {
      const expanded = readDotenvValue("DATABASE_URL", envPath, {})
      const url = setDatabaseName(expanded)

      expect(new URL(url)).toMatchObject({
        hostname: "localhost",
        pathname: `/${TEST_DB_NAME}`,
      })
      expect(url).toContain("p%40ss")
    } finally {
      fs.rmSync(envPath, { force: true })
    }
  })

  it("refuses to derive a payroll immutability database from a non-local source URL", () => {
    expect(() =>
      resolvePayrollImmutabilityDatabaseUrl({
        DATABASE_URL: "postgresql://user:pass@db.example.com:5432/stockflow",
      }),
    ).toThrow(/non-local DATABASE_URL/)
  })
  it("allows reset only for a named local test database", () => {
    expect(
      resolveSafeTarget({
        PAYROLL_IMMUTABILITY_DATABASE_URL:
          "postgresql://user:pass@localhost:5432/stockflow_immutability_test",
      }),
    ).toMatchObject({
      dbName: "stockflow_immutability_test",
      host: "localhost",
    })
  })

  it.each([
    "postgresql://user:pass@db.example.com:5432/stockflow_immutability_test",
    "postgresql://user:pass@localhost:5432/stockflow",
  ])("refuses unsafe reset target %s", (url) => {
    expect(() =>
      resolveSafeTarget({
        PAYROLL_IMMUTABILITY_DATABASE_URL: url,
      }),
    ).toThrow(/Refusing to reset/)
  })

  it("preserves complete Prisma diagnostics while redacting database credentials", () => {
    const targetUrl =
      "postgresql://runtime-user:runtime-secret@localhost:5432/stockflow_immutability_test?schema=public"
    const diagnostics = buildMigrationDiagnostics({
      target: {
        dbName: "stockflow_immutability_test",
        host: "localhost",
        urlValue: targetUrl,
      },
      adminUrl:
        "postgresql://runtime-user:runtime-secret@localhost:5432/postgres?schema=public",
      result: {
        status: 1,
        stdout: "62 migrations found in prisma/migrations\n",
        stderr: `Error: P3005\nDatabase URL: ${targetUrl}\nThe database schema is not empty.\n`,
      },
      startedAt: "2026-08-12T00:00:00.000Z",
      finishedAt: "2026-08-12T00:00:01.000Z",
    })

    expect(diagnostics).toMatchObject({
      command: "prisma migrate deploy",
      exitCode: 1,
      errorCode: "P3005",
      secretUrlValuesPrinted: false,
    })
    expect(diagnostics.stdout).toBe(
      "62 migrations found in prisma/migrations\n",
    )
    expect(diagnostics.stderr).toContain("The database schema is not empty.")
    expect(JSON.stringify(diagnostics)).not.toContain("runtime-secret")
    expect(renderDiagnostics(diagnostics)).not.toContain("runtime-secret")
  })

  it("redacts credentials from PostgreSQL URLs not known in advance", () => {
    expect(
      redactDiagnosticText(
        "postgresql://someone:unknown-secret@localhost:5432/test",
      ),
    ).toBe("postgresql://[REDACTED]@localhost:5432/test")
  })
})
