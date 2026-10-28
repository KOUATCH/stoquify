const {
  assertLocalFixtureAllowed,
  INVENTORY_ITEMS_E2E_FIXTURE_CONTRACT,
} = require("../inventory-items-e2e-fixture")

describe("inventory item E2E fixture contract", () => {
  it("declares the tenant-scoped item permissions and foreign-item boundary", () => {
    expect(INVENTORY_ITEMS_E2E_FIXTURE_CONTRACT.requiredPermissions).toEqual(
      expect.arrayContaining([
        "inventory.items.read",
        "inventory.items.create",
        "inventory.items.update",
      ]),
    )
    expect(INVENTORY_ITEMS_E2E_FIXTURE_CONTRACT.organizationId).not.toBe(
      INVENTORY_ITEMS_E2E_FIXTURE_CONTRACT.foreignOrganizationId,
    )
    expect(INVENTORY_ITEMS_E2E_FIXTURE_CONTRACT.itemId).not.toBe(
      INVENTORY_ITEMS_E2E_FIXTURE_CONTRACT.foreignItemId,
    )
    expect(INVENTORY_ITEMS_E2E_FIXTURE_CONTRACT.productionBackfill).toBe(false)
  })

  it.each(["NODE_ENV", "AQSTOQFLOW_ENV", "VERCEL_ENV"])(
    "refuses production through %s",
    (key) => {
      expect(() => assertLocalFixtureAllowed({ [key]: "production" })).toThrow(
        /Refusing to seed or delete fixtures/,
      )
    },
  )

  it("allows local and CI test environments", () => {
    expect(() =>
      assertLocalFixtureAllowed({ NODE_ENV: "test", CI: "true" }),
    ).not.toThrow()
  })
})
