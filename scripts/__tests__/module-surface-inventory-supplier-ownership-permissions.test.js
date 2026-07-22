const { buildModuleSurfaceInventory } = require("../module-surface-inventory")

describe("Supplier surface ownership and permission parsing", () => {
  const report = buildModuleSurfaceInventory(process.cwd(), { mode: "report" })

  it("maps item-supplier sourcing to Purchasing with its cross-domain permissions", () => {
    const record = report.records.find(
      (item) =>
        item.surfaceType === "action" &&
        item.file === "actions/suppliers/itemSupplierActions.ts",
    )

    expect(record).toMatchObject({
      moduleSlug: "purchasing",
      permission: [
        "inventory.items.read",
        "purchases.suppliers.read",
        "inventory.items.update",
        "purchases.suppliers.create",
        "purchases.suppliers.update",
        "purchases.suppliers.delete",
      ].join(" | "),
      guard: "requireAllPermissions",
    })
    expect(record.classification).toContain("mapped")
    expect(record.classification).not.toContain("unmapped")
    expect(record.classification).not.toContain("missing permission")
  })

  it("maps supplier management to Purchasing without parsing error-message text", () => {
    const record = report.records.find(
      (item) =>
        item.surfaceType === "action" &&
        item.file === "actions/suppliers/supplier-management-actions.ts",
    )

    expect(record).toMatchObject({
      moduleSlug: "purchasing",
      permission: [
        "purchases.suppliers.read",
        "purchases.suppliers.create",
        "purchases.suppliers.update",
        "purchases.suppliers.delete",
      ].join(" | "),
      guard: "requireOrg+permission-check",
    })
    expect(record.permission).not.toContain("startsWith")
    expect(record.classification).toContain("mapped")
    expect(record.classification).not.toContain("unmapped")
    expect(record.classification).not.toContain("missing permission")
  })
})
