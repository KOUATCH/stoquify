const { buildModuleSurfaceInventory } = require("../module-surface-inventory")

describe("inventory reference-data surface ownership", () => {
  const report = buildModuleSurfaceInventory(process.cwd(), { mode: "report" })

  it.each([
    ["actions/brands/getOrgBrands.ts", "inventory.brands.read"],
    ["actions/categories/createCategory.ts", "inventory.categories.create"],
    ["actions/categories/getOrgCategories.ts", "inventory.categories.read"],
  ])("inherits Inventory ownership and RBAC from %s", (file, requiredPermission) => {
    const record = report.records.find(
      (item) => item.surfaceType === "action" && item.file === file,
    )

    expect(record).toMatchObject({
      moduleSlug: "inventory",
      guard: "delegated-re-export",
    })
    expect(record.permission.split(" | ")).toContain(requiredPermission)
    expect(record.classification).toContain("mapped")
    expect(record.classification).not.toContain("unmapped")
    expect(record.classification).not.toContain("missing permission")
  })

  it("maps the guarded unit-management action to Inventory", () => {
    const record = report.records.find(
      (item) => item.surfaceType === "action" && item.file === "actions/units/unit-management-actions.ts",
    )

    expect(record).toMatchObject({
      moduleSlug: "inventory",
      permission: "inventory.units.read",
      guard: "requirePermission",
    })
    expect(record.classification).not.toContain("unmapped")
  })

  it("classifies bulk category creation as a protected Inventory command", () => {
    const record = report.records.find(
      (item) => item.surfaceType === "action" && item.file === "actions/categories/createBulkCategories.ts",
    )

    expect(record).toMatchObject({
      moduleSlug: "inventory",
      permission: "inventory.categories.create",
      guard: "requirePermission",
      moduleApplicability: "required",
    })
    expect(record.classification).toContain("mapped")
    expect(record.classification).not.toContain("unmapped")
    expect(record.classification).not.toContain("missing permission")
  })
})
