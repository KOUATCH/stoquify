const {
  buildModuleSurfaceInventory,
  moduleSurfaceGapFindings,
} = require("../module-surface-inventory")

describe("cross-cutting module surface boundaries", () => {
  const report = buildModuleSurfaceInventory(process.cwd(), { mode: "report" })

  it.each([
    [
      "actions/_shared/safe-action-responses.ts",
      "not applicable: internal action response helper",
    ],
    [
      "actions/auth.ts",
      "not applicable: public identity boundary",
    ],
  ])("classifies %s outside tenant-commercial module ownership", (file, classification) => {
    const record = report.records.find(
      (item) => item.surfaceType === "action" && item.file === file,
    )

    expect(record).toMatchObject({
      moduleSlug: null,
      permission: null,
      guard: "none",
      moduleApplicability: classification,
      classification,
    })
    expect(moduleSurfaceGapFindings(report)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ file })]),
    )
  })
})
