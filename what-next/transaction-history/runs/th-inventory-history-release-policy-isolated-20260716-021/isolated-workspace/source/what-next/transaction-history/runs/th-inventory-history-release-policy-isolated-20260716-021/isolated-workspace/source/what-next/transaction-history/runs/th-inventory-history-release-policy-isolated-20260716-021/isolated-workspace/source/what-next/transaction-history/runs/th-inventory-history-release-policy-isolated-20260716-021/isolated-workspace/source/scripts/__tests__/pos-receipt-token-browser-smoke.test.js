const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  TARGET_PERMISSION,
  buildOperatorScenarios,
  buildSmokeCommand,
  ensureStorageStates,
  parseArgs,
  reportConfig,
  routeUrl,
} = require("../pos-receipt-token-browser-smoke")

describe("pos-receipt-token-browser-smoke", () => {
  it("uses two explicit operator auth states and requires completed sale results by default", () => {
    const args = parseArgs(["node", "script"], {}, process.cwd())

    expect(args.mode).toBe("fail")
    expect(args.baseUrl).toBe("http://127.0.0.1:3000")
    expect(args.routePath).toBe("/en/dashboard/pos")
    expect(args.requireSaleResult).toBe(true)
    expect(args.authorizedStorageState.replace(/\\/g, "/")).toContain(
      "playwright/.auth/pos-receipt-token-authorized.json",
    )
    expect(args.deniedStorageState.replace(/\\/g, "/")).toContain(
      "playwright/.auth/pos-receipt-token-denied.json",
    )
  })

  it("accepts CI-friendly overrides for base url, auth states, output, and empty sale handling", () => {
    const root = process.cwd()
    const args = parseArgs(
      [
        "node",
        "script",
        "--base-url",
        "http://127.0.0.1:3020",
        "--authorized-storage-state",
        "playwright/.auth/allowed.json",
        "--denied-storage-state",
        "playwright/.auth/denied.json",
        "--search-query",
        "POS-20260703",
        "--allow-empty-sale-results",
        "--out",
        "what-next/custom-pos-smoke.json",
        "--screenshots-dir",
        "what-next/custom-pos-screens",
      ],
      {},
      root,
    )

    expect(args.baseUrl).toBe("http://127.0.0.1:3020")
    expect(args.searchQuery).toBe("POS-20260703")
    expect(args.requireSaleResult).toBe(false)
    expect(args.authorizedStorageState.replace(/\\/g, "/")).toContain("playwright/.auth/allowed.json")
    expect(args.deniedStorageState.replace(/\\/g, "/")).toContain("playwright/.auth/denied.json")
    expect(args.out.replace(/\\/g, "/")).toContain("what-next/custom-pos-smoke.json")
    expect(args.screenshotsDir.replace(/\\/g, "/")).toContain("what-next/custom-pos-screens")
  })

  it("refuses to run the allowed and denied operators from the same storage state", () => {
    expect(() =>
      parseArgs(
        [
          "node",
          "script",
          "--authorized-storage-state",
          "playwright/.auth/operator.json",
          "--denied-storage-state",
          "playwright/.auth/operator.json",
        ],
        {},
        process.cwd(),
      ),
    ).toThrow(/must be different/)
  })

  it("builds permission-aware authorized and denied operator scenarios", () => {
    const args = parseArgs(["node", "script"], {}, process.cwd())

    expect(buildOperatorScenarios(args)).toEqual([
      expect.objectContaining({
        id: "authorized-operator",
        expectsTargetPermission: true,
      }),
      expect.objectContaining({
        id: "denied-operator",
        expectsTargetPermission: false,
      }),
    ])
  })

  it("checks for both browser storage states before running the live smoke", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pos-receipt-smoke-"))
    const authDir = path.join(root, "playwright", ".auth")
    fs.mkdirSync(authDir, { recursive: true })
    fs.writeFileSync(path.join(authDir, "allowed.json"), "{}")

    const args = parseArgs(
      [
        "node",
        "script",
        "--authorized-storage-state",
        "playwright/.auth/allowed.json",
        "--denied-storage-state",
        "playwright/.auth/denied.json",
      ],
      {},
      root,
    )

    expect(() => ensureStorageStates(args)).toThrow(/Denied POS operator/)

    fs.writeFileSync(path.join(authDir, "denied.json"), "{}")
    expect(() => ensureStorageStates(args)).not.toThrow()
  })

  it("documents the runnable smoke command and evidence destinations", () => {
    const args = parseArgs(["node", "script", "--timeout-ms", "45000"], {}, process.cwd())
    const config = reportConfig(args)
    const command = buildSmokeCommand(args)

    expect(config.targetPermission).toBe(TARGET_PERMISSION)
    expect(config.output).toBe("what-next/AQSTOQFLOW_POS_RECEIPT_TOKEN_BROWSER_SMOKE.json")
    expect(config.screenshotsDir).toBe("what-next/screenshots/pos-receipt-token-management")
    expect(config.smokeCommand.args).toContain("--authorized-storage-state")
    expect(config.smokeCommand.args).toContain("--denied-storage-state")
    expect(command.args).toContain("--require-sale-result")
  })

  it("builds stable route urls from the configured app base url", () => {
    expect(routeUrl("http://127.0.0.1:3000", "/en/dashboard/pos")).toBe(
      "http://127.0.0.1:3000/en/dashboard/pos",
    )
    expect(routeUrl("http://127.0.0.1:3000/", "/api/me/permissions")).toBe(
      "http://127.0.0.1:3000/api/me/permissions",
    )
  })
})
