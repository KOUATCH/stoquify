const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  buildSpawnOptions,
  defaultCommand,
  parseArgs,
  renderMarkdown,
  runBuildDiagnostics,
  sanitizeLabel,
} = require("../build-app-diagnostics")

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "build-app-diagnostics-"))
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

describe("build app diagnostics wrapper", () => {
  it("parses local build diagnostics defaults", () => {
    const args = parseArgs(["node", "script"], {
      env: { BUILD_DIAGNOSTICS_TIMEOUT_MS: "120000" },
      platform: "linux",
    })

    expect(args.command).toBe(defaultCommand("linux"))
    expect(args.commandArgs).toEqual(["run", "build:app"])
    expect(args.timeoutMs).toBe(120000)
    expect(args.outDir).toContain(path.join("what-next", "build-diagnostics"))
  })

  it("parses an explicit diagnostic command after --", () => {
    const args = parseArgs([
      "node",
      "script",
      "--timeout-ms",
      "2500",
      "--label",
      "demo build!",
      "--",
      process.execPath,
      "-e",
      "console.log('ok')",
    ])

    expect(args.timeoutMs).toBe(2500)
    expect(args.label).toBe("demo-build")
    expect(args.command).toBe(process.execPath)
    expect(args.commandArgs).toEqual(["-e", "console.log('ok')"])
  })

  it("uses shell spawning only for Windows cmd/bat diagnostics", () => {
    expect(buildSpawnOptions("repo", { NODE_ENV: "test" }, "win32", "npm.cmd")).toEqual({
      cwd: "repo",
      env: { NODE_ENV: "test" },
      windowsHide: true,
      detached: false,
      shell: true,
    })
    expect(buildSpawnOptions("repo", { NODE_ENV: "test" }, "win32", process.execPath)).toEqual({
      cwd: "repo",
      env: { NODE_ENV: "test" },
      windowsHide: true,
      detached: false,
      shell: false,
    })
    expect(buildSpawnOptions("repo", { NODE_ENV: "test" }, "linux", "npm")).toEqual({
      cwd: "repo",
      env: { NODE_ENV: "test" },
      windowsHide: true,
      detached: true,
      shell: false,
    })
  })

  it("sanitizes labels for diagnostics directories", () => {
    expect(sanitizeLabel("  release build / stdout  ")).toBe("release-build-stdout")
  })

  it("captures stdout, stderr, exit code, and summary files for a successful command", async () => {
    const root = makeTempRoot()

    const summary = await runBuildDiagnostics({
      root,
      outDir: "diagnostics",
      label: "success",
      timeoutMs: 5000,
      command: process.execPath,
      commandArgs: ["-e", "console.log('build ok'); console.error('warn only')"],
    })

    expect(summary.status).toBe("passed")
    expect(summary.exitCode).toBe(0)
    expect(summary.timedOut).toBe(false)
    expect(fs.readFileSync(summary.stdout, "utf8")).toContain("build ok")
    expect(fs.readFileSync(summary.stderr, "utf8")).toContain("warn only")
    expect(readJson(summary.summaryJson)).toEqual(expect.objectContaining({
      status: "passed",
      exitCode: 0,
      timedOut: false,
    }))
    expect(fs.readFileSync(summary.summaryMarkdown, "utf8")).toContain("Status: `passed`")
  })

  it("records a non-zero exit code as a failed diagnostic run", async () => {
    const root = makeTempRoot()

    const summary = await runBuildDiagnostics({
      root,
      outDir: "diagnostics",
      label: "failure",
      timeoutMs: 5000,
      command: process.execPath,
      commandArgs: ["-e", "console.error('build failed'); process.exit(7)"],
    })

    expect(summary.status).toBe("failed")
    expect(summary.exitCode).toBe(7)
    expect(summary.timedOut).toBe(false)
    expect(fs.readFileSync(summary.stderr, "utf8")).toContain("build failed")
  })

  it("records timeout and kills the diagnostic command", async () => {
    const root = makeTempRoot()

    const summary = await runBuildDiagnostics({
      root,
      outDir: "diagnostics",
      label: "timeout",
      timeoutMs: 100,
      command: process.execPath,
      commandArgs: ["-e", "setTimeout(() => {}, 5000)"],
    })

    expect(summary.status).toBe("timeout")
    expect(summary.timedOut).toBe(true)
    expect(readJson(summary.summaryJson)).toEqual(expect.objectContaining({
      status: "timeout",
      timedOut: true,
    }))
  })

  it("renders an evidence summary without pretending timeouts passed", () => {
    const markdown = renderMarkdown({
      endedAt: "2026-07-03T00:00:00.000Z",
      status: "timeout",
      commandLine: "npm run build:app",
      root: "repo",
      runDir: "diag",
      exitCode: null,
      signal: "SIGTERM",
      timedOut: true,
      timeoutMs: 100,
      durationMs: 101,
      childPid: 123,
      spawnError: null,
      stdout: "stdout.log",
      stderr: "stderr.log",
      summaryJson: "summary.json",
      summaryMarkdown: "summary.md",
      buildId: null,
    })

    expect(markdown).toContain("Status: `timeout`")
    expect(markdown).toContain("Timed out: yes")
    expect(markdown).toContain("Treat timed-out or missing-exit-code runs as inconclusive")
  })

  it("exposes package scripts for safe builds and diagnostics", () => {
    const packageJson = require("../../package.json")

    expect(packageJson.scripts["build:app"]).toBe("node scripts/build-app-safe.js")
    expect(packageJson.scripts["build:app:next"]).toBe("next build")
    expect(packageJson.scripts["build:app:diagnostics"]).toBe("node scripts/build-app-diagnostics.js")
    expect(packageJson.scripts["verify:repo"]).toContain("npm run build:app")
    expect(packageJson.scripts["verify:repo"]).not.toContain("build:app:diagnostics")
  })
})