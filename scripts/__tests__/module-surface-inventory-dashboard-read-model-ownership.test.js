const { buildModuleSurfaceInventory } = require("../module-surface-inventory")

describe("Dashboard read-model surface ownership", () => {
  const report = buildModuleSurfaceInventory(process.cwd(), { mode: "report" })

  it.each([
    "actions/signals/business-signals.actions.ts",
    "actions/snapshots/snapshot.actions.ts",
  ])("maps %s to the canonical Dashboard module", (file) => {
    const record = report.records.find(
      (item) => item.surfaceType === "action" && item.file === file,
    )

    expect(record).toMatchObject({
      moduleSlug: "dashboard",
      permission: "dashboard.read",
      guard: "protect",
    })
    expect(record.classification).toContain("mapped")
    expect(record.classification).not.toContain("unmapped")
    expect(record.classification).not.toContain("missing permission")
  })
})
