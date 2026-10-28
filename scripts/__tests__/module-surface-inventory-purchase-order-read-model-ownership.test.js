const { buildModuleSurfaceInventory } = require("../module-surface-inventory")

describe("Purchase-order read-model surface ownership", () => {
  const report = buildModuleSurfaceInventory(process.cwd(), { mode: "report" })

  it("maps GoodsReceiptAndSummary to the canonical Purchasing module", () => {
    const record = report.records.find(
      (item) =>
        item.surfaceType === "action" &&
        item.file === "actions/purchaseOrderWorkflow/GoodsReceiptAndSummary.ts",
    )

    expect(record).toMatchObject({
      moduleSlug: "purchasing",
      permission: "purchases.orders.read",
      guard: "requirePermission",
    })
    expect(record.classification).toContain("mapped")
    expect(record.classification).not.toContain("unmapped")
    expect(record.classification).not.toContain("missing permission")
  })
})
