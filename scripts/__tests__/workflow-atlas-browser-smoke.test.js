const path = require("path")

const {
  DEFAULT_EVIDENCE_ROOT,
  VIEWPORTS,
  parseArgs,
  routeUrl,
} = require("../workflow-atlas-browser-smoke")

describe("workflow-atlas-browser-smoke", () => {
  it("uses the focused bilingual desktop and mobile evidence contract", () => {
    const args = parseArgs(["node", "script"], process.cwd())

    expect(VIEWPORTS).toEqual({
      mobile: { width: 390, height: 844 },
      desktop: { width: 1440, height: 1100 },
    })
    expect(path.relative(process.cwd(), args.out).replace(/\\/g, "/")).toBe(
      `${DEFAULT_EVIDENCE_ROOT.replace(/\\/g, "/")}/browser-evidence.json`,
    )
    expect(path.relative(process.cwd(), args.screenshotsDir).replace(/\\/g, "/")).toBe(
      `${DEFAULT_EVIDENCE_ROOT.replace(/\\/g, "/")}/screenshots`,
    )
  })

  it("supports a custom server and evidence location", () => {
    const args = parseArgs(
      [
        "node",
        "script",
        "--base-url",
        "http://127.0.0.1:3020",
        "--out",
        "what-next/custom-atlas.json",
        "--screenshots-dir",
        "what-next/custom-atlas-screens",
        "--timeout-ms",
        "45000",
      ],
      process.cwd(),
    )

    expect(args.baseUrl).toBe("http://127.0.0.1:3020")
    expect(args.timeoutMs).toBe(45000)
    expect(args.out.replace(/\\/g, "/")).toContain("what-next/custom-atlas.json")
    expect(args.screenshotsDir.replace(/\\/g, "/")).toContain("what-next/custom-atlas-screens")
  })

  it("builds localized public route urls", () => {
    expect(routeUrl("http://127.0.0.1:3000", "en")).toBe(
      "http://127.0.0.1:3000/en/workflows",
    )
    expect(routeUrl("http://127.0.0.1:3000/", "fr")).toBe(
      "http://127.0.0.1:3000/fr/workflows",
    )
  })
})
