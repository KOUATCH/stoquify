const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  PAYROLL_ROUTE_IDS,
  buildServerCommand,
  buildSmokeCommand,
  ensureStorageState,
  parseArgs,
  reportConfig,
} = require("../payroll-browser-smoke")

describe("payroll-browser-smoke", () => {
  it("keeps the payroll smoke route manifest limited to implemented payroll routes", () => {
    expect(PAYROLL_ROUTE_IDS).toEqual([
      "payroll",
      "payroll-attendance",
      "payroll-compensation",
      "payroll-contracts",
      "payroll-employees",
      "payroll-declarations",
      "payroll-payments",
      "payroll-runs",
      "payroll-payslips",
      "payroll-register",
      "payroll-setup",
    ])
    expect(PAYROLL_ROUTE_IDS).not.toContain("payroll-presence")
  })

  it("uses configurable CI-friendly defaults for base url, timeouts, and auth state", () => {
    const args = parseArgs(
      ["node", "script"],
      {
        PAYROLL_SMOKE_BASE_URL: "http://127.0.0.1:3015",
        PAYROLL_SMOKE_TIMEOUT_MS: "130000",
        PAYROLL_SMOKE_STORAGE_STATE: "playwright/.auth/custom-payroll.json",
      },
      process.cwd(),
    )

    expect(args.baseUrl).toBe("http://127.0.0.1:3015")
    expect(args.timeoutMs).toBe(130000)
    expect(args.warmupTimeoutMs).toBe(130000)
    expect(args.storageState.replace(/\\/g, "/")).toContain("playwright/.auth/custom-payroll.json")
  })

  it("builds the low-level smoke command with all implemented payroll route ids", () => {
    const args = parseArgs(["node", "script", "--base-url", "http://127.0.0.1:3010"], {}, process.cwd())
    const smokeCommand = buildSmokeCommand(args)

    expect(smokeCommand.command).toBe(process.execPath)
    expect(smokeCommand.args).toContain("--require-screenshots")
    expect(smokeCommand.args).toContain("--warmup-timeout-ms")
    expect(smokeCommand.args).toContain("120000")

    for (const routeId of PAYROLL_ROUTE_IDS) {
      expect(smokeCommand.args.join(" ")).toContain(`--route ${routeId}`)
    }
  })

  it("documents the standalone server command for standalone Next output", () => {
    const args = parseArgs(
      ["node", "script", "--server-mode", "standalone", "--base-url", "http://127.0.0.1:3010"],
      {},
      process.cwd(),
    )

    expect(buildServerCommand(args)).toEqual({
      command: process.execPath,
      args: [path.join(".next", "standalone", "server.js")],
      env: {
        HOSTNAME: "127.0.0.1",
        PORT: "3010",
      },
      note: "Use after npm run build:app when Next output is standalone.",
    })
  })

  it("keeps next-start as an explicit developer fallback", () => {
    const args = parseArgs(
      ["node", "script", "--server-mode", "next-start", "--base-url", "http://127.0.0.1:3011"],
      {},
      process.cwd(),
    )

    expect(buildServerCommand(args)).toEqual({
      command: "npm",
      args: ["run", "start", "--", "-p", "3011"],
      env: {},
      note: "Developer fallback when standalone output is not required.",
    })
  })

  it("fails before browser smoke when the tenant-scoped auth state is missing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "payroll-smoke-"))
    const args = parseArgs(["node", "script", "--storage-state", "playwright/.auth/missing.json"], {}, root)

    expect(() => ensureStorageState(args)).toThrow(/auth state not found/)
    expect(() => ensureStorageState(args)).toThrow(/auth:payroll:bootstrap/)
  })

  it("prints a dry-run report that includes the standalone command and smoke output paths", () => {
    const args = parseArgs(
      ["node", "script", "--dry-run", "--server-mode", "standalone", "--base-url", "http://127.0.0.1:3012"],
      {},
      process.cwd(),
    )

    expect(reportConfig(args)).toMatchObject({
      baseUrl: "http://127.0.0.1:3012",
      serverMode: "standalone",
      authState: "playwright/.auth/payroll.json",
      output: "what-next/payroll/AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json",
      routes: PAYROLL_ROUTE_IDS,
    })
  })
})
