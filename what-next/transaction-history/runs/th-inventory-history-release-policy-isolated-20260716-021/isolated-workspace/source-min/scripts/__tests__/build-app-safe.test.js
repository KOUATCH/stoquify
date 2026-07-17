const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  DEFAULT_BUILD_TIMEOUT_MS,
  cleanNextOutput,
  devProcessUsesBuildOutput,
  findOrphanedBuildProcesses,
  inferDevelopmentDistDir,
  inspectNextOutput,
  isBuildProcessCommand,
  isDevProcessCommand,
  parseArgs,
  resolveNextBuildCommand,
  runSafeBuild,
} = require("../build-app-safe")

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "build-app-safe-"))
}

function writeFile(filePath, contents = "") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents, "utf8")
}

describe("safe build app wrapper", () => {
  it("parses wrapper defaults with a bounded build timeout", () => {
    const args = parseArgs(["node", "script"], {
      env: {},
    })

    expect(args.allowOrphans).toBe(false)
    expect(args.dryRun).toBe(false)
    expect(args.skipClean).toBe(false)
    expect(args.timeoutMs).toBe(DEFAULT_BUILD_TIMEOUT_MS)
  })

  it("allows explicit zero timeout override for local diagnostics", () => {
    const envArgs = parseArgs(["node", "script"], {
      env: { BUILD_APP_TIMEOUT_MS: "0" },
    })
    const cliArgs = parseArgs(["node", "script", "--timeout-ms", "0"], {
      env: {},
    })

    expect(envArgs.timeoutMs).toBe(0)
    expect(cliArgs.timeoutMs).toBe(0)
  })

  it("accepts environment controls for npm-hostile argument forwarding", () => {
    const args = parseArgs(["node", "script"], {
      env: {
        BUILD_APP_ALLOW_ORPHANS: "1",
        BUILD_APP_DRY_RUN: "1",
        BUILD_APP_SKIP_CLEAN: "1",
        BUILD_APP_TIMEOUT_MS: "2500",
      },
    })

    expect(args.allowOrphans).toBe(true)
    expect(args.dryRun).toBe(true)
    expect(args.skipClean).toBe(true)
    expect(args.timeoutMs).toBe(2500)
  })

  it("recognizes npm and direct Next build commands", () => {
    expect(isBuildProcessCommand("npm run build:app")).toBe(true)
    expect(isBuildProcessCommand("pwsh -Command npm run build:app")).toBe(true)
    expect(isBuildProcessCommand("node node_modules/next/dist/bin/next build")).toBe(true)
    expect(isBuildProcessCommand("next build")).toBe(true)
    expect(isBuildProcessCommand("node scripts/build-app-safe.js")).toBe(false)
  })

  it("recognizes npm and direct Next dev commands as .next writers", () => {
    expect(isDevProcessCommand("npm run dev")).toBe(true)
    expect(isDevProcessCommand("pwsh -Command npm run dev")).toBe(true)
    expect(isDevProcessCommand("node node_modules/next/dist/bin/next dev -p 3000")).toBe(true)
    expect(isDevProcessCommand("next dev -p 3000")).toBe(true)
    expect(isDevProcessCommand("node scripts/build-app-safe.js")).toBe(false)
  })

  it("infers isolated development dist output from Next config", () => {
    const root = makeTempRoot()
    writeFile(
      path.join(root, "next.config.mjs"),
      "const nextDistDir = process.env.NEXT_DIST_DIR?.trim() || (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'); export default { distDir: nextDistDir, output: 'standalone' }\n",
    )

    expect(inferDevelopmentDistDir(root, { env: {} })).toBe(".next-dev")
    expect(devProcessUsesBuildOutput(root, { env: {} })).toBe(false)
    expect(inferDevelopmentDistDir(root, { env: { NEXT_DIST_DIR: ".next" } })).toBe(".next")
    expect(devProcessUsesBuildOutput(root, { env: { NEXT_DIST_DIR: ".next" } })).toBe(true)
  })

  it("ignores orphaned dev processes when development output is isolated from production build output", async () => {
    const root = makeTempRoot()
    writeFile(
      path.join(root, "next.config.mjs"),
      "const nextDistDir = process.env.NEXT_DIST_DIR?.trim() || (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'); export default { distDir: nextDistDir, output: 'standalone' }\n",
    )

    const summary = await runSafeBuild({
      root,
      currentPid: 11,
      processRowsBefore: [
        { pid: 11, ppid: 1, commandLine: "node scripts/build-app-safe.js" },
        { pid: 30, ppid: 1, commandLine: "node node_modules/next/dist/bin/next dev -p 3000" },
      ],
      processRowsAfter: [
        { pid: 11, ppid: 1, commandLine: "node scripts/build-app-safe.js" },
        { pid: 30, ppid: 1, commandLine: "node node_modules/next/dist/bin/next dev -p 3000" },
      ],
      buildRunner: async () => {
        writeFile(path.join(root, ".next", "BUILD_ID"), "build-123\n")
        writeFile(path.join(root, ".next", "static", "build-123", "_ssgManifest.js"), "self.__SSG_MANIFEST=[]\n")
        writeFile(path.join(root, ".next", "standalone", "server.js"), "require('next')\n")
        return {
          commandLine: "node node_modules/next/dist/bin/next build",
          exitCode: 0,
          signal: null,
          timedOut: false,
        }
      },
    })

    expect(summary.status).toBe("passed")
    expect(summary.devProcessesBlockBuildOutput).toBe(false)
    expect(summary.orphanedBuildProcesses).toHaveLength(0)
    expect(summary.postBuildOrphanedBuildProcesses).toHaveLength(0)
  })
  it("reports orphaned build chains while ignoring the current npm ancestry", () => {
    const rows = [
      { pid: 10, ppid: 1, commandLine: "npm run build:app" },
      { pid: 11, ppid: 10, commandLine: "node scripts/build-app-safe.js" },
      { pid: 20, ppid: 1, commandLine: "next build" },
      { pid: 21, ppid: 20, commandLine: "node node_modules/next/dist/bin/next build" },
      { pid: 30, ppid: 1, commandLine: "next dev -p 3000" },
    ]

    const orphans = findOrphanedBuildProcesses(rows, { currentPid: 11 })

    expect(orphans.map((row) => row.pid)).toEqual([20, 21, 30])
  })

  it("does not clean absent or cache-only .next output", () => {
    const root = makeTempRoot()

    expect(inspectNextOutput(root).shouldClean).toBe(false)

    fs.mkdirSync(path.join(root, ".next", "cache"), { recursive: true })
    const cacheOnly = inspectNextOutput(root)

    expect(cacheOnly.state).toBe("cache-only")
    expect(cacheOnly.shouldClean).toBe(false)
  })

  it("marks production-looking .next output without BUILD_ID as stale or corrupt", () => {
    const root = makeTempRoot()
    fs.mkdirSync(path.join(root, ".next", "server"), { recursive: true })

    const inspection = inspectNextOutput(root)

    expect(inspection.state).toBe("stale-or-corrupt")
    expect(inspection.shouldClean).toBe(true)
    expect(inspection.reasons).toContain(".next has production build markers but no BUILD_ID")
  })

  it("marks missing BUILD_ID static manifest and standalone server as stale or corrupt", () => {
    const root = makeTempRoot()
    writeFile(path.join(root, "next.config.mjs"), "export default { output: 'standalone' }\n")
    writeFile(path.join(root, ".next", "BUILD_ID"), "build-123\n")

    const inspection = inspectNextOutput(root)

    expect(inspection.state).toBe("stale-or-corrupt")
    expect(inspection.shouldClean).toBe(true)
    expect(inspection.reasons).toEqual([
      ".next/static/build-123/_ssgManifest.js is missing",
      ".next/standalone/server.js is missing for standalone output",
    ])
  })

  it("cleans only the inspected .next directory when output is stale or corrupt", () => {
    const root = makeTempRoot()
    fs.mkdirSync(path.join(root, ".next", "server"), { recursive: true })
    const inspection = inspectNextOutput(root)

    expect(cleanNextOutput(root, inspection)).toBe(true)
    expect(fs.existsSync(path.join(root, ".next"))).toBe(false)
  })

  it("blocks a build when orphaned build chains are detected", async () => {
    const root = makeTempRoot()

    const summary = await runSafeBuild({
      root,
      currentPid: 11,
      processRows: [
        { pid: 11, ppid: 1, commandLine: "node scripts/build-app-safe.js" },
        { pid: 20, ppid: 1, commandLine: "npm run build:app" },
      ],
      buildRunner: async () => {
        throw new Error("build should not run")
      },
    })

    expect(summary.status).toBe("blocked-orphaned-build")
    expect(summary.exitCode).toBe(1)
    expect(summary.orphanedBuildProcesses).toHaveLength(1)
  })

  it("dry-runs without mutating stale .next output", async () => {
    const root = makeTempRoot()
    fs.mkdirSync(path.join(root, ".next", "server"), { recursive: true })

    const summary = await runSafeBuild({
      root,
      currentPid: 11,
      processRows: [{ pid: 11, ppid: 1, commandLine: "node scripts/build-app-safe.js" }],
      dryRun: true,
    })

    expect(summary.status).toBe("dry-run")
    expect(summary.nextOutput.shouldClean).toBe(true)
    expect(summary.cleanedNext).toBe(false)
    expect(fs.existsSync(path.join(root, ".next"))).toBe(true)
  })

  it("cleans stale output before running the injected direct build", async () => {
    const root = makeTempRoot()
    fs.mkdirSync(path.join(root, ".next", "server"), { recursive: true })

    const summary = await runSafeBuild({
      root,
      currentPid: 11,
      processRowsBefore: [{ pid: 11, ppid: 1, commandLine: "node scripts/build-app-safe.js" }],
      processRowsAfter: [{ pid: 11, ppid: 1, commandLine: "node scripts/build-app-safe.js" }],
      buildRunner: async () => {
        writeFile(path.join(root, ".next", "BUILD_ID"), "build-123\n")
        writeFile(path.join(root, ".next", "static", "build-123", "_ssgManifest.js"), "self.__SSG_MANIFEST=[]\n")
        return {
          commandLine: "node node_modules/next/dist/bin/next build",
          exitCode: 0,
          signal: null,
          timedOut: false,
        }
      },
    })

    expect(summary.status).toBe("passed")
    expect(summary.cleanedNext).toBe(true)
    expect(summary.postBuildNextOutput.state).toBe("valid")
    expect(fs.existsSync(path.join(root, ".next", "BUILD_ID"))).toBe(true)
  })

  it("does not pass a zero-exit build with invalid post-build output", async () => {
    const root = makeTempRoot()

    const summary = await runSafeBuild({
      root,
      currentPid: 11,
      processRowsBefore: [{ pid: 11, ppid: 1, commandLine: "node scripts/build-app-safe.js" }],
      processRowsAfter: [{ pid: 11, ppid: 1, commandLine: "node scripts/build-app-safe.js" }],
      buildRunner: async () => ({
        commandLine: "node node_modules/next/dist/bin/next build",
        exitCode: 0,
        signal: null,
        timedOut: false,
      }),
    })

    expect(summary.status).toBe("failed-post-build-output")
    expect(summary.exitCode).toBe(1)
    expect(summary.postBuildNextOutput.state).toBe("absent")
  })

  it("resolves the normal build command to the local Next entrypoint", () => {
    const root = makeTempRoot()
    writeFile(path.join(root, "node_modules", "next", "dist", "bin", "next"), "#!/usr/bin/env node\n")

    const command = resolveNextBuildCommand(root)

    expect(command.command).toBe(process.execPath)
    expect(command.args).toEqual([
      path.join(root, "node_modules", "next", "dist", "bin", "next"),
      "build",
    ])
  })
})
