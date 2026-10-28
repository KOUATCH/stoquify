const {
  assertLocalFixtureAllowed,
  CUSTOMER_E2E_FIXTURE_CONTRACT,
} = require("../customer-e2e-fixture");

describe("customer E2E fixture contract", () => {
  it("declares permitted, denied, locked, empty, and foreign-tenant boundaries", () => {
    expect(CUSTOMER_E2E_FIXTURE_CONTRACT.requiredPermissions).toEqual(
      expect.arrayContaining([
        "customers.read",
        "customers.create",
        "customers.update",
        "customers.analytics.read",
        "customers.orders.read",
        "accounting.exports.create",
      ]),
    );
    expect(CUSTOMER_E2E_FIXTURE_CONTRACT.deniedPermissions).not.toContain(
      "customers.read",
    );
    expect(CUSTOMER_E2E_FIXTURE_CONTRACT.lockedRequestedModules).toEqual([
      "sales",
    ]);
    expect(CUSTOMER_E2E_FIXTURE_CONTRACT.requestedModules).toEqual(
      expect.arrayContaining(["sales", "accounting"]),
    );
    expect(CUSTOMER_E2E_FIXTURE_CONTRACT.organizationId).not.toBe(
      CUSTOMER_E2E_FIXTURE_CONTRACT.foreignOrganizationId,
    );
    expect(CUSTOMER_E2E_FIXTURE_CONTRACT.organizationId).not.toBe(
      CUSTOMER_E2E_FIXTURE_CONTRACT.lockedOrganizationId,
    );
    expect(CUSTOMER_E2E_FIXTURE_CONTRACT.primaryCustomerId).not.toBe(
      CUSTOMER_E2E_FIXTURE_CONTRACT.foreignCustomerId,
    );
    expect(CUSTOMER_E2E_FIXTURE_CONTRACT.primaryCustomerId).not.toBe(
      CUSTOMER_E2E_FIXTURE_CONTRACT.emptyCustomerId,
    );
    expect(CUSTOMER_E2E_FIXTURE_CONTRACT.productionBackfill).toBe(false);
  });

  it.each(["NODE_ENV", "AQSTOQFLOW_ENV", "VERCEL_ENV"])(
    "refuses production through %s",
    (key) => {
      expect(() =>
        assertLocalFixtureAllowed(
          { [key]: "production" },
          "postgresql://postgres@127.0.0.1:5432/stoquify",
        ),
      ).toThrow(/Refusing to seed or delete fixtures/);
    },
  );

  it("refuses nonlocal databases without explicit nonproduction authority", () => {
    expect(() =>
      assertLocalFixtureAllowed(
        { NODE_ENV: "test" },
        "postgresql://postgres@db.internal:5432/stoquify",
      ),
    ).toThrow(/Refusing a nonlocal database/);
  });

  it("allows local and explicitly authorized nonlocal test databases", () => {
    expect(() =>
      assertLocalFixtureAllowed(
        { NODE_ENV: "test" },
        "postgresql://postgres@127.0.0.1:5432/stoquify",
      ),
    ).not.toThrow();
    expect(() =>
      assertLocalFixtureAllowed(
        {
          NODE_ENV: "test",
          AQSTOQFLOW_CUSTOMER_E2E_ALLOW_NONLOCAL: "1",
        },
        "postgresql://postgres@db.internal:5432/stoquify",
      ),
    ).not.toThrow();
  });
});
