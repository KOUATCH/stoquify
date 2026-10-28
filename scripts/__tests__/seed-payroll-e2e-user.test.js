const { assertLocalSeedAllowed, normalizePrismaDatasourceUrl, resolvePrismaDatasourceUrl } = require("../seed-payroll-e2e-user")

describe("payroll E2E fixture datasource compatibility", () => {
  it("normalizes PostgreSQL URLs for Prisma Edge compatibility", () => {
    expect(normalizePrismaDatasourceUrl("postgresql://postgres@127.0.0.1:5432/stoquify")).toBe(
      "prisma+postgres://postgres@127.0.0.1:5432/stoquify",
    )
    expect(normalizePrismaDatasourceUrl("postgres://postgres:pa%3Ass@127.0.0.1:5432/stoquify")).toBe(
      "prisma+postgres://postgres:pa%3Ass@127.0.0.1:5432/stoquify",
    )
  })

  it("preserves Prisma-native datasource URLs", () => {
    expect(normalizePrismaDatasourceUrl("prisma://postgres@127.0.0.1:5432/stoquify")).toBe(
      "prisma://postgres@127.0.0.1:5432/stoquify",
    )
    expect(normalizePrismaDatasourceUrl("prisma+postgres://postgres@127.0.0.1:5432/stoquify")).toBe(
      "prisma+postgres://postgres@127.0.0.1:5432/stoquify",
    )
  })

  it("resolves fixture datasource from DATABASE_URL and DIRECT_URL", () => {
    expect(resolvePrismaDatasourceUrl({ DATABASE_URL: "postgres://payroll:pw@db.local:5432/payroll" })).toBe(
      "prisma+postgres://payroll:pw@db.local:5432/payroll",
    )
    expect(resolvePrismaDatasourceUrl({ DIRECT_URL: "postgresql://payroll:pw@db.local:5432/payroll" })).toBe(
      "prisma+postgres://payroll:pw@db.local:5432/payroll",
    )
  })

  it("keeps the local-seed safety marker guard intact", () => {
    const originalNodeEnv = process.env.NODE_ENV
    const originalAqstoqflowEnv = process.env.AQSTOQFLOW_ENV
    const originalVercelEnv = process.env.VERCEL_ENV

    process.env.NODE_ENV = "production"
    expect(() => assertLocalSeedAllowed()).toThrow(/Refusing to run while an environment marker is production/)

    process.env.NODE_ENV = originalNodeEnv
    process.env.AQSTOQFLOW_ENV = originalAqstoqflowEnv
    process.env.VERCEL_ENV = originalVercelEnv
  })
})
