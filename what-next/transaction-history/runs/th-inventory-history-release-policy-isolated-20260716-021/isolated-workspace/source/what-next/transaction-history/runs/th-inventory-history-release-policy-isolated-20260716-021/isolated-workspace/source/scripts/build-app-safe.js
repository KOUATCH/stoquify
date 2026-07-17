#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { spawn, spawnSync } = require("child_process")

const PROCESS_INSPECTION_TIMEOUT_MS = 10 * 1000
const DEFAULT_BUILD_TIMEOUT_MS = 30 * 60 * 1000

function parseOptionalTimeout(value, name) {
  if (value === undefined || value === null || value === "") return 0
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`)
  }
  return parsed
}

function parseArgs(argv = process.argv, options = {}) {
  const env = options.env || process.env
  const args = {
    root: process.cwd(),
    allowOrphans: env.BUILD_APP_ALLOW_ORPHANS === "1",
    dryRun: env.BUILD_APP_DRY_RUN === "1",
    skipClean: env.BUILD_APP_SKIP_CLEAN === "1",
    timeoutMs: env.BUILD_APP_TIMEOUT_MS === undefined || env.BUILD_APP_TIMEOUT_MS === null || env.BUILD_APP_TIMEOUT_MS === ""
      ? DEFAULT_BUILD_TIMEOUT_MS
      : parseOptionalTimeout(env.BUILD_APP_TIMEOUT_MS, "BUILD_APP_TIMEOUT_MS"),
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--allow-orphans") args.allowOrphans = true
    else if (arg === "--dry-run") args.dryRun = true
    else if (arg === "--skip-clean") args.skipClean = true
    else if (arg === "--timeout-ms") args.timeoutMs = parseOptionalTimeout(argv[++index], "--timeout-ms")
    else if (arg === "--help" || arg === "-h") args.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }

  args.root = path.resolve(args.root)
  return args
}

function printHelp() {
  console.log(`Safe Build App Wrapper

Usage:
  node scripts/build-app-safe.js [--dry-run] [--skip-clean] [--allow-orphans] [--timeout-ms ms]

Defaults:
  - Detect active orphaned next dev / next build / npm run build:app chains before building.
  - Clean .next only when it has provably stale or corrupt production output.
  - Run Next directly through node_modules/next/dist/bin/next build.
  - Timeout after ${DEFAULT_BUILD_TIMEOUT_MS}ms; BUILD_APP_TIMEOUT_MS=0 or --timeout-ms 0 disables it.

Environment controls:
  BUILD_APP_DRY_RUN=1, BUILD_APP_SKIP_CLEAN=1, BUILD_APP_ALLOW_ORPHANS=1
`)
}

function normalizeCommandLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

function normalizeProcessRow(row) {
  const pid = Number(row.pid ?? row.ProcessId ?? row.processId)
  const ppid = Number(row.ppid ?? row.ParentProcessId ?? row.parentProcessId)

  return {
    pid: Number.isFinite(pid) ? pid : null,
    ppid: Number.isFinite(ppid) ? ppid : null,
    commandLine: normalizeCommandLine(row.commandLine ?? row.CommandLine ?? row.command ?? row.args),
  }
}

function readWindowsProcessRows(options = {}) {
  const result = (options.spawnSync || spawnSync)(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$ErrorActionPreference = 'Stop'; Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress -Depth 3",
    ],
    {
      encoding: "utf8",
      timeout: options.timeoutMs || PROCESS_INSPECTION_TIMEOUT_MS,
      windowsHide: true,
    },
  )

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr || `process inspection exited ${result.status}`)
  }
  const output = String(result.stdout || "").trim()
  if (!output) return []
  const parsed = JSON.parse(output)
  return Array.isArray(parsed) ? parsed : [parsed]
}

function readPosixProcessRows(options = {}) {
  const result = (options.spawnSync || spawnSync)("ps", ["-eo", "pid=,ppid=,args="], {
    encoding: "utf8",
    timeout: options.timeoutMs || PROCESS_INSPECTION_TIMEOUT_MS,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr || `process inspection exited ${result.status}`)
  }

  return String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/))
    .filter(Boolean)
    .map((match) => ({
      pid: Number(match[1]),
      ppid: Number(match[2]),
      commandLine: match[3],
    }))
}

function readProcessRows(options = {}) {
  const platform = options.platform || process.platform
  const rows = platform === "win32"
    ? readWindowsProcessRows(options)
    : readPosixProcessRows(options)
  return rows.map(normalizeProcessRow).filter((row) => row.pid !== null)
}

function isBuildProcessCommand(commandLine) {
  const line = normalizeCommandLine(commandLine)
  if (!line) return false
  if (/scripts[\\/]+build-app-safe\.js\b/i.test(line)) return false

  return (
    /\b(?:npm|npm\.cmd|pnpm|pnpm\.cmd|yarn|yarn\.cmd)\s+(?:run\s+)?build:app\b/i.test(line) ||
    /\brun-script\s+build:app\b/i.test(line) ||
    /\b(?:pwsh|powershell)(?:\.exe)?\b.*\bnpm(?:\.cmd)?\s+run\s+build:app\b/i.test(line) ||
    /\bnext(?:\.cmd)?["']?\s+build\b/i.test(line) ||
    /next[\\/]+dist[\\/]+bin[\\/]+next(?:\.js)?["']?\s+build\b/i.test(line)
  )
}

function isDevProcessCommand(commandLine) {
  const line = normalizeCommandLine(commandLine)
  if (!line) return false
  if (/scripts[\/]+build-app-safe\.js\b/i.test(line)) return false

  return (
    /\b(?:npm|npm\.cmd|pnpm|pnpm\.cmd|yarn|yarn\.cmd)\s+(?:run\s+)?dev\b/i.test(line) ||
    /\brun-script\s+dev\b/i.test(line) ||
    /\b(?:pwsh|powershell)(?:\.exe)?\b.*\bnpm(?:\.cmd)?\s+run\s+dev\b/i.test(line) ||
    /\bnext(?:\.cmd)?["']?\s+dev\b/i.test(line) ||
    /next[\\/]+dist[\\/]+bin[\\/]+next(?:\.js)?["']?\s+dev\b/i.test(line)
  )
}

function inferDevelopmentDistDir(root, options = {}) {
  const env = options.env || process.env
  const configuredDistDir = env.NEXT_DIST_DIR?.trim()
  if (configuredDistDir) return configuredDistDir

  const candidates = ["next.config.mjs", "next.config.js", "next.config.ts"]
  for (const fileName of candidates) {
    const filePath = path.join(root, fileName)
    if (!pathExists(filePath)) continue
    const config = fs.readFileSync(filePath, "utf8")
    const devTernary = config.match(/NODE_ENV\s*===\s*["']development["'][\s\S]{0,200}\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["']/)
    if (devTernary) return devTernary[1]

    const literalDistDir = config.match(/distDir\s*:\s*["']([^"']+)["']/)
    if (literalDistDir) return literalDistDir[1]
  }

  return ".next"
}

function devProcessUsesBuildOutput(root, options = {}) {
  return path.basename(inferDevelopmentDistDir(root, options)) === ".next"
}

function processLineage(rows, currentPid = process.pid) {
  const byPid = new Map(rows.map((row) => [row.pid, row]))
  const lineage = new Set()
  let pid = currentPid

  while (pid && !lineage.has(pid)) {
    lineage.add(pid)
    pid = byPid.get(pid)?.ppid
  }

  return lineage
}

function findOrphanedBuildProcesses(rows, options = {}) {
  const normalizedRows = rows.map(normalizeProcessRow).filter((row) => row.pid !== null)
  const lineage = processLineage(normalizedRows, options.currentPid || process.pid)
  const includeDevProcesses = options.includeDevProcesses !== false

  return normalizedRows
    .filter((row) => isBuildProcessCommand(row.commandLine) || (includeDevProcesses && isDevProcessCommand(row.commandLine)))
    .filter((row) => !lineage.has(row.pid))
    .sort((a, b) => a.pid - b.pid)
}

function inspectBuildProcesses(options = {}) {
  try {
    const rows = Array.isArray(options.processRows)
      ? options.processRows
      : readProcessRows(options)
    const orphans = findOrphanedBuildProcesses(rows, {
      currentPid: options.currentPid || process.pid,
      includeDevProcesses: options.includeDevProcesses !== false,
    })
    return { rows: rows.map(normalizeProcessRow), orphans, error: null }
  } catch (error) {
    return { rows: [], orphans: [], error }
  }
}

function pathExists(filePath) {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory()
  } catch {
    return false
  }
}

function readFileTrimmed(filePath) {
  return fs.readFileSync(filePath, "utf8").trim()
}

function expectsStandaloneOutput(root) {
  const candidates = ["next.config.mjs", "next.config.js", "next.config.ts"]
  return candidates.some((fileName) => {
    const filePath = path.join(root, fileName)
    if (!pathExists(filePath)) return false
    return /output\s*:\s*["']standalone["']/.test(fs.readFileSync(filePath, "utf8"))
  })
}

function inspectNextOutput(root, options = {}) {
  const nextDir = path.join(root, ".next")
  const reasons = []

  if (!pathExists(nextDir)) {
    return { state: "absent", nextDir, shouldClean: false, reasons }
  }
  if (!isDirectory(nextDir)) {
    return {
      state: "stale-or-corrupt",
      nextDir,
      shouldClean: true,
      reasons: [".next exists but is not a directory"],
    }
  }

  const entries = fs.readdirSync(nextDir)
  const productionMarkers = new Set([
    "server",
    "static",
    "standalone",
    "trace",
    "package.json",
    "routes-manifest.json",
    "build-manifest.json",
    "prerender-manifest.json",
  ])
  const hasProductionMarkers = entries.some((entry) => productionMarkers.has(entry))
  const buildIdPath = path.join(nextDir, "BUILD_ID")

  if (!pathExists(buildIdPath)) {
    if (hasProductionMarkers) {
      return {
        state: "stale-or-corrupt",
        nextDir,
        shouldClean: true,
        reasons: [".next has production build markers but no BUILD_ID"],
      }
    }

    return {
      state: "cache-only",
      nextDir,
      shouldClean: false,
      reasons: [".next has no production build markers"],
    }
  }

  const buildId = readFileTrimmed(buildIdPath)
  if (!buildId) reasons.push(".next/BUILD_ID is empty")

  if (buildId) {
    const ssgManifest = path.join(nextDir, "static", buildId, "_ssgManifest.js")
    if (!pathExists(ssgManifest)) {
      reasons.push(`.next/static/${buildId}/_ssgManifest.js is missing`)
    }
  }

  const requireStandalone = options.requireStandalone ?? expectsStandaloneOutput(root)
  if (requireStandalone && !pathExists(path.join(nextDir, "standalone", "server.js"))) {
    reasons.push(".next/standalone/server.js is missing for standalone output")
  }

  return {
    state: reasons.length > 0 ? "stale-or-corrupt" : "valid",
    nextDir,
    shouldClean: reasons.length > 0,
    reasons,
    buildId: buildId || null,
    requireStandalone,
  }
}

function assertSafeNextDir(root, nextDir) {
  const resolvedRoot = path.resolve(root)
  const resolvedNextDir = path.resolve(nextDir)
  const relative = path.relative(resolvedRoot, resolvedNextDir)
  if (path.basename(resolvedNextDir) !== ".next" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to clean unsafe .next path: ${resolvedNextDir}`)
  }
}

function cleanNextOutput(root, inspection) {
  if (!inspection.shouldClean) return false
  assertSafeNextDir(root, inspection.nextDir)
  fs.rmSync(inspection.nextDir, { recursive: true, force: true })
  return true
}

function resolveNextBuildCommand(root) {
  const nextEntry = path.join(root, "node_modules", "next", "dist", "bin", "next")
  if (!pathExists(nextEntry)) {
    throw new Error(`Cannot find Next build entry at ${nextEntry}`)
  }

  return {
    command: process.execPath,
    args: [nextEntry, "build"],
    commandLine: `${process.execPath} ${nextEntry} build`,
  }
}

function terminateProcessTree(pid, platform = process.platform) {
  if (!pid) return
  if (platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true })
    return
  }

  try {
    process.kill(-pid, "SIGTERM")
  } catch {
    try {
      process.kill(pid, "SIGTERM")
    } catch {
      // The process may have exited between timeout and cleanup.
    }
  }
}

function runDirectNextBuild(options = {}) {
  const root = path.resolve(options.root || process.cwd())
  const commandSpec = options.commandSpec || resolveNextBuildCommand(root)
  const timeoutMs = options.timeoutMs || 0

  return new Promise((resolve) => {
    let timedOut = false
    let child
    let settled = false

    const finish = (result) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      resolve({
        commandLine: commandSpec.commandLine,
        exitCode: typeof result.exitCode === "number" ? result.exitCode : null,
        signal: result.signal || null,
        spawnError: result.spawnError || null,
        timedOut,
        childPid: child?.pid || null,
      })
    }

    const timer = timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true
          terminateProcessTree(child?.pid, options.platform || process.platform)
        }, timeoutMs)
      : null

    try {
      child = spawn(commandSpec.command, commandSpec.args, {
        cwd: root,
        env: options.env || process.env,
        stdio: options.stdio || "inherit",
        windowsHide: true,
        detached: (options.platform || process.platform) !== "win32",
        shell: false,
      })
    } catch (error) {
      finish({ exitCode: null, signal: null, spawnError: error })
      return
    }

    child.on("error", (error) => {
      finish({ exitCode: null, signal: null, spawnError: error })
    })
    child.on("close", (code, signal) => {
      finish({ exitCode: code, signal })
    })
  })
}

function summarizeProcesses(processes) {
  return processes.map((processInfo) => ({
    pid: processInfo.pid,
    ppid: processInfo.ppid,
    commandLine: processInfo.commandLine,
  }))
}

async function runSafeBuild(options = {}) {
  const root = path.resolve(options.root || process.cwd())
  const allowOrphans = Boolean(options.allowOrphans)
  const buildTimeoutMs = options.timeoutMs ?? DEFAULT_BUILD_TIMEOUT_MS
  const includeDevProcesses = options.includeDevProcesses ?? devProcessUsesBuildOutput(root, options)
  const before = inspectBuildProcesses({
    ...options,
    includeDevProcesses,
    processRows: options.processRowsBefore ?? options.processRows,
  })

  const summary = {
    root,
    status: "pending",
    exitCode: 1,
    allowOrphans,
    dryRun: Boolean(options.dryRun),
    skippedClean: Boolean(options.skipClean),
    devProcessesBlockBuildOutput: includeDevProcesses,
    processInspectionError: before.error ? before.error.message : null,
    orphanedBuildProcesses: summarizeProcesses(before.orphans),
    nextOutput: null,
    cleanedNext: false,
    build: null,
    postBuildNextOutput: null,
    postBuildOrphanedBuildProcesses: [],
    postBuildProcessInspectionError: null,
  }

  if (before.error) {
    summary.status = "blocked-process-inspection"
    return summary
  }

  if (before.orphans.length > 0 && !allowOrphans) {
    summary.status = "blocked-orphaned-build"
    return summary
  }

  const nextOutput = inspectNextOutput(root, options)
  summary.nextOutput = {
    state: nextOutput.state,
    shouldClean: nextOutput.shouldClean,
    reasons: nextOutput.reasons,
    buildId: nextOutput.buildId || null,
    requireStandalone: Boolean(nextOutput.requireStandalone),
  }

  if (nextOutput.shouldClean && !options.skipClean && !options.dryRun) {
    summary.cleanedNext = cleanNextOutput(root, nextOutput)
  }

  if (options.dryRun) {
    summary.status = "dry-run"
    summary.exitCode = 0
    return summary
  }

  const build = options.buildRunner
    ? await options.buildRunner({ root, timeoutMs: buildTimeoutMs })
    : await runDirectNextBuild({
        root,
        timeoutMs: buildTimeoutMs,
        env: options.env || process.env,
        platform: options.platform || process.platform,
      })
  summary.build = {
    commandLine: build.commandLine || null,
    exitCode: typeof build.exitCode === "number" ? build.exitCode : null,
    signal: build.signal || null,
    spawnError: build.spawnError ? build.spawnError.message || String(build.spawnError) : null,
    timedOut: Boolean(build.timedOut),
    childPid: build.childPid || null,
  }

  const postBuildNextOutput = inspectNextOutput(root, options)
  summary.postBuildNextOutput = {
    state: postBuildNextOutput.state,
    shouldClean: postBuildNextOutput.shouldClean,
    reasons: postBuildNextOutput.reasons,
    buildId: postBuildNextOutput.buildId || null,
    requireStandalone: Boolean(postBuildNextOutput.requireStandalone),
  }

  const after = inspectBuildProcesses({
    ...options,
    includeDevProcesses,
    processRows: options.processRowsAfter ?? options.processRows,
  })
  summary.postBuildProcessInspectionError = after.error ? after.error.message : null
  summary.postBuildOrphanedBuildProcesses = summarizeProcesses(after.orphans)

  if (after.error) {
    summary.status = "failed-post-process-inspection"
    summary.exitCode = 1
    return summary
  }

  if (after.orphans.length > 0 && !allowOrphans) {
    summary.status = "failed-post-build-orphans"
    summary.exitCode = 1
    return summary
  }

  if (build.timedOut) summary.status = "timeout"
  else if (build.spawnError) summary.status = "error"
  else if (build.exitCode !== 0) summary.status = "failed"
  else if (postBuildNextOutput.state !== "valid") summary.status = "failed-post-build-output"
  else summary.status = "passed"
  summary.exitCode = summary.status === "passed" ? 0 : 1
  return summary
}

function renderProcessList(processes) {
  if (!processes.length) return "none"
  return processes
    .map((processInfo) => `pid=${processInfo.pid} ppid=${processInfo.ppid} ${processInfo.commandLine}`)
    .join("\n")
}

function renderSummary(summary) {
  const lines = [
    "Safe build:app wrapper",
    `Status: ${summary.status}`,
    `Root: ${summary.root}`,
    `Dev processes block build output: ${summary.devProcessesBlockBuildOutput ? "yes" : "no"}`,
    `Orphaned build chains before build: ${summary.orphanedBuildProcesses.length}`,
  ]

  if (summary.processInspectionError) {
    lines.push(`Process inspection error: ${summary.processInspectionError}`)
  }
  if (summary.orphanedBuildProcesses.length > 0) {
    lines.push(renderProcessList(summary.orphanedBuildProcesses))
  }
  if (summary.nextOutput) {
    lines.push(`.next state: ${summary.nextOutput.state}`)
    if (summary.nextOutput.reasons.length > 0) {
      lines.push(`.next reasons: ${summary.nextOutput.reasons.join("; ")}`)
    }
    lines.push(`.next cleaned: ${summary.cleanedNext ? "yes" : "no"}`)
  }
  if (summary.build) {
    lines.push(`Build command: ${summary.build.commandLine}`)
    lines.push(`Build exit code: ${summary.build.exitCode === null ? "null" : summary.build.exitCode}`)
    lines.push(`Build timed out: ${summary.build.timedOut ? "yes" : "no"}`)
    if (summary.build.spawnError) lines.push(`Build spawn error: ${summary.build.spawnError}`)
  }
  if (summary.postBuildNextOutput) {
    lines.push(`Post-build .next state: ${summary.postBuildNextOutput.state}`)
    if (summary.postBuildNextOutput.reasons.length > 0) {
      lines.push(`Post-build .next reasons: ${summary.postBuildNextOutput.reasons.join("; ")}`)
    }
  }
  lines.push(`Orphaned build chains after build: ${summary.postBuildOrphanedBuildProcesses.length}`)
  if (summary.postBuildOrphanedBuildProcesses.length > 0) {
    lines.push(renderProcessList(summary.postBuildOrphanedBuildProcesses))
  }
  if (summary.postBuildProcessInspectionError) {
    lines.push(`Post-build process inspection error: ${summary.postBuildProcessInspectionError}`)
  }

  return `${lines.join("\n")}\n`
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help) {
    printHelp()
    return
  }

  const summary = await runSafeBuild(args)
  console.log(renderSummary(summary))
  process.exitCode = summary.exitCode
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = {
  DEFAULT_BUILD_TIMEOUT_MS,
  cleanNextOutput,
  expectsStandaloneOutput,
  findOrphanedBuildProcesses,
  devProcessUsesBuildOutput,
  inferDevelopmentDistDir,
  inspectBuildProcesses,
  inspectNextOutput,
  isBuildProcessCommand,
  isDevProcessCommand,
  parseArgs,
  readProcessRows,
  renderSummary,
  resolveNextBuildCommand,
  runDirectNextBuild,
  runSafeBuild,
}
