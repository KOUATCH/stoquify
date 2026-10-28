const {
  assertLocalFixtureAllowed,
  SUPPLIER_E2E_FIXTURE_CONTRACT,
  normalizePrismaDatasourceUrl,
  resolvedDatabaseUrl,
} = require("../supplier-e2e-fixture")

describe("supplier E2E fixture contract", () => {
  it("declares positive, denied, lifecycle, and foreign-tenant boundaries", () => {
    expect(SUPPLIER_E2E_FIXTURE_CONTRACT.requiredPermissions).toEqual(
      expect.arrayContaining([
        "purchases.suppliers.read",
        "purchases.suppliers.create",
        "purchases.suppliers.update",
        "purchases.suppliers.delete",
        "reports.export",
      ]),
    )
    expect(SUPPLIER_E2E_FIXTURE_CONTRACT.deniedPermissions).not.toEqual(
      expect.arrayContaining(["purchases.suppliers.read", "reports.export"]),
    )
    expect(SUPPLIER_E2E_FIXTURE_CONTRACT.organizationId).not.toBe(
      SUPPLIER_E2E_FIXTURE_CONTRACT.foreignOrganizationId,
    )
    expect(SUPPLIER_E2E_FIXTURE_CONTRACT.primarySupplierId).not.toBe(
      SUPPLIER_E2E_FIXTURE_CONTRACT.foreignSupplierId,
    )
    expect(Object.keys(SUPPLIER_E2E_FIXTURE_CONTRACT.lifecycleSupplierIds)).toEqual(
      ["desktop", "tablet", "mobile"],
    )
    expect(SUPPLIER_E2E_FIXTURE_CONTRACT.productionBackfill).toBe(false)
    expect(SUPPLIER_E2E_FIXTURE_CONTRACT.assurance).toEqual({
      mode: "local-password-step-up",
      userId: "usr_supplier_e2e_local",
      method: "password",
      level: 1,
      organizationBound: true,
    })
  })

  it.each(["NODE_ENV", "AQSTOQFLOW_ENV", "VERCEL_ENV"])(
    "refuses production through %s",
    (key) => {
      expect(() =>
        assertLocalFixtureAllowed(
          { [key]: "production" },
          "postgresql://postgres@127.0.0.1:5432/stoquify",
        ),
      ).toThrow(/Refusing to seed or delete fixtures/)
    },
  )

  it("refuses nonlocal databases without explicit nonproduction authority", () => {
    expect(() =>
      assertLocalFixtureAllowed(
        { NODE_ENV: "test" },
        "postgresql://postgres@db.internal:5432/stoquify",
      ),
    ).toThrow(/Refusing a nonlocal database/)
  })

  it("allows local and explicitly authorized nonlocal test databases", () => {
    expect(() =>
      assertLocalFixtureAllowed(
        { NODE_ENV: "test" },
        "postgresql://postgres@127.0.0.1:5432/stoquify",
      ),
    ).not.toThrow()
    expect(() =>
      assertLocalFixtureAllowed(
        {
          NODE_ENV: "test",
          AQSTOQFLOW_SUPPLIER_E2E_ALLOW_NONLOCAL: "1",
        },
        "postgresql://postgres@db.internal:5432/stoquify",
      ),
    ).not.toThrow()
  })

  it("normalizes supplier datasource URLs for Prisma Edge compatibility", () => {
    expect(normalizePrismaDatasourceUrl("postgresql://postgres@db.internal:5432/stoquify")).toBe(
      "prisma+postgres://postgres@db.internal:5432/stoquify",
    )
    expect(normalizePrismaDatasourceUrl("postgres://postgres@db.internal:5432/stoquify")).toBe(
      "prisma+postgres://postgres@db.internal:5432/stoquify",
    )
    expect(normalizePrismaDatasourceUrl("prisma+postgres://postgres@db.internal:5432/stoquify")).toBe(
      "prisma+postgres://postgres@db.internal:5432/stoquify",
    )
  })

  it("resolves supplier datasource URLs from explicit URLs and DB_* fallback", () => {
    expect(resolvedDatabaseUrl({ DATABASE_URL: "postgres://postgres@db.internal:5432/stoquify" })).toBe(
      "prisma+postgres://postgres@db.internal:5432/stoquify",
    )
    expect(
      resolvedDatabaseUrl({
        DB_USER: "tenant",
        DB_PASSWORD: "pa:ss",
        DB_HOST: "10.0.0.5",
        DB_PORT: "5444",
        DB_NAME: "fixturedb",
      }),
    ).toBe("prisma+postgres://tenant:pa%3Ass@10.0.0.5:5444/fixturedb")
  })
})
