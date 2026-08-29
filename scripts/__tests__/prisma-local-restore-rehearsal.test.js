const {
  databaseFingerprint,
  parseArgs,
  pgEnvironment,
  profilesMatch,
  requireLocalSource,
  targetFor,
} = require("../prisma-local-restore-rehearsal")

describe("Prisma local restore rehearsal", () => {
  it("requires an explicit restore-only database name", () => {
    expect(() => parseArgs([])).toThrow(/--database is required/)
    expect(() => parseArgs(["--database", "stoquify_dev_existing"])).toThrow(
      /stoquify_restore/,
    )
    expect(
      parseArgs(["--database", "stoquify_restore_staging_primary_20260829"]),
    ).toMatchObject({
      databaseName: "stoquify_restore_staging_primary_20260829",
      retainDatabase: false,
    })
    expect(
      parseArgs([
        "--database",
        "stoquify_restore_staging_primary_20260829",
        "--retain-database",
      ]),
    ).toMatchObject({ retainDatabase: true })
  })

  it("refuses production and non-local source databases", () => {
    expect(() =>
      requireLocalSource("postgresql://user:secret@localhost:5432/source", "production"),
    ).toThrow(/NODE_ENV=production/)
    expect(() =>
      requireLocalSource("postgresql://user:secret@example.com:5432/source", "test"),
    ).toThrow(/non-local/)
  })

  it("derives a restore target and libpq environment without exposing it in the fingerprint", () => {
    const source = requireLocalSource(
      "postgresql://user:secret@localhost:5432/source?schema=public",
      "test",
    )
    const target = targetFor(source, "stoquify_restore_staging_primary_20260829")
    const env = pgEnvironment(target, {})

    expect(target.pathname).toBe("/stoquify_restore_staging_primary_20260829")
    expect(env).toMatchObject({
      PGHOST: "localhost",
      PGPORT: "5432",
      PGUSER: "user",
      PGPASSWORD: "secret",
      PGDATABASE: "stoquify_restore_staging_primary_20260829",
    })
    expect(databaseFingerprint(source)).toMatch(/^[a-f0-9]{12}$/)
    expect(databaseFingerprint(source)).not.toContain("secret")
  })

  it("requires identical table presence and row counts", () => {
    const profile = [{ table: "users", present: true, rowCount: "2" }]
    expect(profilesMatch(profile, [...profile])).toBe(true)
    expect(
      profilesMatch(profile, [{ table: "users", present: true, rowCount: "3" }]),
    ).toBe(false)
  })
})
