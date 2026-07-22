const { buildModuleSurfaceInventory } = require("../module-surface-inventory")

describe("HRIS module surface ownership", () => {
  const report = buildModuleSurfaceInventory(process.cwd(), { mode: "report" })

  it.each([
    "approval-inbox.actions.ts",
    "compensation.actions.ts",
    "employee.actions.ts",
    "lifecycle.actions.ts",
    "payment-destination.actions.ts",
    "time-leave.actions.ts",
  ])("maps actions/hris/%s to the payroll module", (file) => {
    const record = report.records.find(
      (item) => item.surfaceType === "action" && item.file === `actions/hris/${file}`,
    )

    expect(record).toMatchObject({ moduleSlug: "payroll" })
    expect(record.classification).toContain("mapped")
    expect(record.classification).not.toContain("unmapped")
  })

  it("maps the People sidebar surface to the payroll module", () => {
    const record = report.records.find(
      (item) => item.surfaceType === "navigation" && item.surface === "/dashboard/people",
    )

    expect(record).toMatchObject({ moduleSlug: "payroll" })
    expect(record.classification).toContain("mapped")
    expect(record.classification).not.toContain("unknown slug")
  })
})
