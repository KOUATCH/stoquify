const { buildModuleSurfaceInventory } = require("../module-surface-inventory")

describe("inventory item action surface ownership", () => {
  const report = buildModuleSurfaceInventory(process.cwd(), { mode: "report" })

  it.each([
    "actions/item-suppliers/addItemSuppliers.ts",
    "actions/item-suppliers/getItemWithSuppliers.ts",
    "actions/item/items.ts",
    "actions/item/listItemsAction.ts",
    "actions/itemsShow/createActionItem.ts",
    "actions/itemsShow/deleteItem.ts",
    "actions/itemsShow/getBriefItemById.ts",
    "actions/itemsShow/getBriefOrgItems.ts",
    "actions/itemsShow/getOrgItems.ts",
    "actions/itemsShow/getOrgItemsWithInventoryLevels.ts",
    "actions/itemsShow/getOrgItemsWithInventoryLevelsLocation.ts",
    "actions/itemsShow/updateItemBasicInfoById.ts",
    "actions/itemsShow/updateItemById.ts",
    "actions/itemsShow/updateItemItemDetailsById.ts",
    "actions/itemsShow/updateItemPricingById.ts",
    "actions/itemsShow/updateItemRelationsById.ts",
    "actions/itemsShow/updateItemStockById.ts",
  ])("maps %s to the inventory module", (file) => {
    const record = report.records.find(
      (item) => item.surfaceType === "action" && item.file === file,
    )

    expect(record).toMatchObject({ moduleSlug: "inventory" })
    expect(record.classification).toContain("mapped")
    expect(record.classification).not.toContain("unmapped")
  })

  it("keeps the separate suppliers action namespace owned by purchasing", () => {
    const record = report.records.find(
      (item) => item.surfaceType === "action" && item.file === "actions/suppliers/itemSupplierActions.ts",
    )

    expect(record).toMatchObject({ moduleSlug: "purchasing" })
    expect(record.classification).toContain("mapped")
    expect(record.classification).not.toContain("unmapped")
  })
})
