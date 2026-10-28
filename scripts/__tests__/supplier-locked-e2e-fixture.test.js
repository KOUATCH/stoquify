const {
  SUPPLIER_LOCKED_E2E_FIXTURE_CONTRACT,
} = require("../supplier-locked-e2e-fixture");
const { assertLocalFixtureAllowed } = require("../supplier-e2e-fixture");

describe("supplier locked E2E fixture contract", () => {
  it("keeps supplier permissions while withholding the Purchasing module", () => {
    expect(SUPPLIER_LOCKED_E2E_FIXTURE_CONTRACT).toEqual(
      expect.objectContaining({
        productionBackfill: false,
        organizationId: "org_supplier_e2e_locked",
        roleCode: "SUPPLIER_E2E_LOCKED",
        requestedModules: ["sales"],
        absentModule: "purchasing",
      }),
    );
    expect(SUPPLIER_LOCKED_E2E_FIXTURE_CONTRACT.permissions).toEqual(
      expect.arrayContaining([
        "purchases.suppliers.read",
        "purchasing.ap.invoice.view",
      ]),
    );
  });

  it.each(["NODE_ENV", "AQSTOQFLOW_ENV", "VERCEL_ENV"])(
    "inherits the production guard through %s",
    (key) => {
      expect(() =>
        assertLocalFixtureAllowed(
          { [key]: "production" },
          "postgresql://postgres@127.0.0.1:5432/stoquify",
        ),
      ).toThrow(/Refusing to seed or delete fixtures/);
    },
  );
});
