const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  TEST_DB_NAME,
  readDotenvValue,
  resolvePayrollImmutabilityDatabaseUrl,
  setDatabaseName,
} = require("../with-payroll-immutability-test-db")

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
})