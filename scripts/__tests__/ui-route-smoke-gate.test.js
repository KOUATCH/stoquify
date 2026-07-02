const { captureScreenshots, parseArgs, routeUrl, selectedRoutes, warmupRoutes } = require("../ui-route-smoke-gate")

describe("ui-route-smoke-gate", () => {
  it("enables browser warmup by default with a production-safe timeout floor", () => {
    const args = parseArgs(["node", "script", "--timeout-ms", "1200"])

    expect(args.warmup).toBe(true)
    expect(args.warmupTimeoutMs).toBe(60000)
  })

  it("parses explicit warmup controls", () => {
    const args = parseArgs([
      "node",
      "script",
      "--timeout-ms",
      "2000",
      "--warmup-timeout-ms",
      "5000",
      "--skip-warmup",
    ])

    expect(args.timeoutMs).toBe(2000)
    expect(args.warmupTimeoutMs).toBe(5000)
    expect(args.warmup).toBe(false)
  })

  it("selects only requested payroll route ids in manifest order", () => {
    const args = parseArgs(["node", "script", "--route", "payroll-runs", "--route", "payroll-payments"])

    expect(selectedRoutes(args).map((route) => route.id)).toEqual(["payroll-payments", "payroll-runs"])
  })

  it("builds stable absolute route URLs from a base URL", () => {
    expect(routeUrl("http://127.0.0.1:3001/app", "/en/dashboard/payroll/runs")).toBe(
      "http://127.0.0.1:3001/en/dashboard/payroll/runs",
    )
  })

  it("returns explicit missing-playwright screenshot evidence for selected routes", async () => {
    const args = parseArgs(["node", "script", "--route", "payroll-runs"])
    const [route] = selectedRoutes(args)

    const result = await captureScreenshots(args, [route], null)

    expect(result.available).toBe(false)
    expect(result.captures).toHaveLength(route.viewports.length)
    expect(result.captures).toEqual(
      route.viewports.map((viewport) => ({
        routeId: "payroll-runs",
        viewport,
        ok: false,
        skipped: true,
        reason: "missing_playwright",
      })),
    )
  })

  it("returns explicit skipped warmup evidence when disabled", async () => {
    const result = await warmupRoutes({ warmup: false }, [], null)

    expect(result).toEqual({
      enabled: false,
      skipped: true,
      reason: "warmup disabled",
      routes: [],
    })
  })
})