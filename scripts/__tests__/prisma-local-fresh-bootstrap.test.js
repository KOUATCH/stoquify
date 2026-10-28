const path = require("path")

const {
  loadDatabaseUrl,
  parseArgs,
  resolveTarget,
} = require(path.join("..", "prisma-local-fresh-bootstrap"))

describe("prisma local fresh bootstrap", () => {
  it("requires the explicit database argument", () => {
    expect(() => parseArgs([])).toThrow(/Usage:/)
    expect(parseArgs(["--database", "stoquify_local_clean_test"])).toEqual({
      databaseName: "stoquify_local_clean_test",
    })
  })

  it("derives a new local target without changing credentials or options", () => {
    const target = resolveTarget({
      databaseName: "stoquify_local_clean_test",
      sourceUrl: "postgresql://user:secret@localhost:5432/existing?schema=public",
      nodeEnv: "development",
    })
    expect(target.pathname).toBe("/stoquify_local_clean_test")
    expect(target.username).toBe("user")
    expect(target.password).toBe("secret")
    expect(target.searchParams.get("schema")).toBe("public")
  })

  it("refuses production, remote hosts, and unsafe database names", () => {
    expect(() =>
      resolveTarget({
        databaseName: "stoquify_local_clean_test",
        sourceUrl: "postgresql://user:secret@localhost:5432/existing",
        nodeEnv: "production",
      }),
    ).toThrow(/NODE_ENV=production/)
    expect(() =>
      resolveTarget({
        databaseName: "stoquify_local_clean_test",
        sourceUrl: "postgresql://user:secret@db.example.com:5432/existing",
        nodeEnv: "development",
      }),
    ).toThrow(/non-local/)
    expect(() =>
      resolveTarget({
        databaseName: "dbakesman",
        sourceUrl: "postgresql://user:secret@localhost:5432/existing",
        nodeEnv: "development",
      }),
    ).toThrow(/must match/)
  })

  it("expands dotenv-style DATABASE_URL variables with process values winning", () => {
    const url = loadDatabaseUrl(
      {
        DATABASE_URL:
          "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}",
        DB_USER: "developer",
        DB_PASSWORD: "secret",
        DB_HOST: "localhost",
        DB_NAME: "stoquify_local_clean_test",
      },
      path.join(__dirname, "missing.env"),
    )
    expect(url).toBe(
      "postgresql://developer:secret@localhost:5432/stoquify_local_clean_test",
    )
  })
})
