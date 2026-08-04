const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  ASSURANCE_ROUTE_IDS,
  buildServerCommand,
  buildSmokeCommand,
  ensureRunPrerequisites,
  parseArgs,
  reportConfig,
} = require("../workflow-assurance-browser-smoke")

describe("workflow-assurance-browser-smoke", () => {
  it("limits the smoke wrapper to the assurance incident detail route", () => {
    expect(ASSURANCE_ROUTE_IDS).toEqual(["assurance-incident-detail"])
  })

  it("uses configurable defaults for base url, timeout, incident fixture, and auth state", () => {
    const args = parseArgs(
      ["node", "script"],
      {
        ASSURANCE_SMOKE_BASE_URL: "http://127.0.0.1:3020",
        ASSURANCE_SMOKE_TIMEOUT_MS: "130000",
        ASSURANCE_SMOKE_INCIDENT_ID: "incident_123",
        ASSURANCE_SMOKE_STORAGE_STATE: "playwright/.auth/custom-assurance.json",
      },
      process.cwd(),
    )

    expect(args.baseUrl).toBe("http://127.0.0.1:3020")
    expect(args.timeoutMs).toBe(130000)
    expect(args.warmupTimeoutMs).toBe(130000)
    expect(args.incidentId).toBe("incident_123")
    expect(args.storageState.replace(/\\/g, "/")).toContain("playwright/.auth/custom-assurance.json")
  })

  it("builds the low-level route smoke command with screenshots and the assurance route id", () => {
    const args = parseArgs(
      ["node", "script", "--base-url", "http://127.0.0.1:3021", "--incident-id", "incident_456"],
      {},
      process.cwd(),
    )
    const smokeCommand = buildSmokeCommand(args)

    expect(smokeCommand.command).toBe(process.execPath)
    expect(smokeCommand.args).toContain("--require-screenshots")
    expect(smokeCommand.args).toContain("--storage-state")
    expect(smokeCommand.args.join(" ")).toContain("--route assurance-incident-detail")
  })

  it("documents standalone server startup without starting a server", () => {
    const args = parseArgs(
      [
        "node",
        "script",
        "--server-mode",
        "standalone",
        "--base-url",
        "http://127.0.0.1:3022",
        "--incident-id",
        "incident_789",
      ],
      {},
      process.cwd(),
    )

    expect(buildServerCommand(args)).toEqual({
      command: process.execPath,
      args: [path.join(".next", "standalone", "server.js")],
      env: {
        HOSTNAME: "127.0.0.1",
        PORT: "3022",
      },
      note: "Use after npm run build:app when Next output is standalone.",
    })
  })

  it("fails before browser smoke when the incident fixture id is missing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "assurance-smoke-"))
    const args = parseArgs(["node", "script", "--storage-state", "playwright/.auth/assurance.json"], {}, root)

    expect(() => ensureRunPrerequisites(args)).toThrow(/ASSURANCE_SMOKE_INCIDENT_ID|--incident-id/)
  })

  it("fails before browser smoke when the tenant-scoped auth state is missing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "assurance-smoke-"))
    const args = parseArgs(
      ["node", "script", "--incident-id", "incident_123", "--storage-state", "playwright/.auth/missing.json"],
      {},
      root,
    )

    expect(() => ensureRunPrerequisites(args)).toThrow(/auth state not found/)
    expect(() => ensureRunPrerequisites(args)).toThrow(/tenant-scoped assurance manager/)
  })

  it("prints a dry-run report without claiming browser certification", () => {
    const args = parseArgs(
      [
        "node",
        "script",
        "--dry-run",
        "--server-mode",
        "standalone",
        "--base-url",
        "http://127.0.0.1:3023",
        "--incident-id",
        "incident_123",
      ],
      {},
      process.cwd(),
    )

    expect(reportConfig(args)).toMatchObject({
      baseUrl: "http://127.0.0.1:3023",
      serverMode: "standalone",
      routeIds: ASSURANCE_ROUTE_IDS,
      incidentId: "incident_123",
      authState: "playwright/.auth/assurance-manager.json",
      output: "what-next/referrals/WORKFLOW_ASSURANCE_INCIDENT_DETAIL_BROWSER_SMOKE.json",
      screenshotsDir: "what-next/referrals/screenshots/assurance-incident-detail",
      certificationClaimed: false,
      truthAuthority: "server-owned POS action and Workflow Assurance services only",
    })
  })
})
