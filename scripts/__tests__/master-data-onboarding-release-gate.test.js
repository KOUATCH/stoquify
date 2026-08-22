const { evaluateMasterDataOnboardingRelease, flattenKeys, parseArgs } = require("../master-data-onboarding-release-gate")

describe("master-data onboarding release gate", () => {
  it("keeps the focused repository contract release-ready", () => {
    const report = evaluateMasterDataOnboardingRelease(process.cwd())
    expect(report.summary.blockerCount).toBe(0)
    expect(report).toMatchObject({
      workflowKey: "governed_master_data_onboarding",
      canonicalModule: "settings",
      canonicalRoute: "/dashboard/settings/data-onboarding",
    })
  })

  it("compares nested localization leaf contracts deterministically", () => {
    expect(flattenKeys({ a: { b: "x" }, c: ["y"] }).sort()).toEqual(["a.b", "c"])
  })

  it("supports an explicit executed-browser evidence requirement", () => {
    expect(parseArgs(["node", "gate", "--mode", "fail", "--require-browser-evidence"])).toMatchObject({
      mode: "fail",
      requireBrowserEvidence: true,
    })
  })
})
