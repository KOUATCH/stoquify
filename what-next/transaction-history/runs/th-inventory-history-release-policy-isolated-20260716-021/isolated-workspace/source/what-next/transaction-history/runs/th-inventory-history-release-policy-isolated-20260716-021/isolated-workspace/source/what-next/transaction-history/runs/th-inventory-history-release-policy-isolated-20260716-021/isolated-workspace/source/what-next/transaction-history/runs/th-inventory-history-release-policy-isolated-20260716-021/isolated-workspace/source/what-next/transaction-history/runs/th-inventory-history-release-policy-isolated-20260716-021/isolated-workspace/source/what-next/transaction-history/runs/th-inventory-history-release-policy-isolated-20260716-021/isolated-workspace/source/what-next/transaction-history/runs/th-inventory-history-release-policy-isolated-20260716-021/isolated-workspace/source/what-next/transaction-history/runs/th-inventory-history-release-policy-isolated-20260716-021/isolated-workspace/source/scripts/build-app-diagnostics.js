#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { spawn, spawnSync } = require("child_process")

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000

function timestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0")
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("")
}

function sanitizeLabel(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function defaultCommand(platform = process.platform) {
  return platform === "win32" ? "npm.cmd" : "npm"
}

function parsePositiveInteger(value, name) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

function parseArgs(argv = process.argv, options = {}) {
  const platform = options.platform || process.platform
  const args = {
    root: process.cwd(),
    outDir: path.join("what-next", "build-diagnostics"),
    label: null,
    timeoutMs: parsePositiveInteger(
      options.env?.BUILD_DIAGNOSTICS_TIMEOUT_MS || process.env.BUILD_DIAGNOSTICS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
      "BUILD_DIAGNOSTICS_TIMEOUT_MS",
    ),
    command: defaultCommand(platform),
    commandArgs: ["run", "build:app"],
    echo: false,
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--out-dir") args.outDir = argv[++index]
    else if (arg === "--label") args.label = argv[++index]
    else if (arg === "--timeout-ms") args.timeoutMs = parsePositiveInteger(argv[++index], "--timeout-ms")
    else if (arg === "--echo") args.echo = true
    else if (arg === "--") {
      const commandParts = argv.slice(index + 1)
      if (commandParts.length === 0) throw new Error("-- requires a command to run")
      args.command = commandParts[0]
      args.commandArgs = commandParts.slice(1)
      break
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  args.root = path.resolve(args.root)
  args.outDir = path.resolve(args.root, args.outDir)
  args.label = sanitizeLabel(args.label) || timestamp()
  return args
}

function printHelp() {
  console.log(`Build App Diagnostics

Usage:
  node scripts/build-app-diagnostics.js [--timeout-ms ms] [--out-dir path] [--label name] [--echo] [-- command args...]

Defaults:
  command: npm run build:app
  timeout: ${DEFAULT_TIMEOUT_MS}ms
  output: what-next/build-diagnostics/<timestamp>/

Examples:
  node scripts/build-app-diagnostics.js --timeout-ms 1800000
  node scripts/build-app-diagnostics.js --label direct-next -- npx next build
`)
}

function ensureRunDir(outDir, label) {
  const runDir = path.join(outDir, label)
  fs.mkdirSync(runDir, { recursive: true })
  return runDir
}

function terminateProcessTree(pid, platform = process.platform) {
  if (!pid) return
  if (platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" })
    return
  }

  try {
    process.kill(-pid, "SIGTERM")
  } catch {
    try {
      process.kill(pid, "SIGTERM")
    } catch {
      // The child may have already exited.
    }
  }
}

function commandLine(command, commandArgs) {
  return [command, ...commandArgs].join(" ")
}

function buildSpawnOptions(root, env, platform = process.platform, command = "") {
  const shell = platform === "win32" && /\.(cmd|bat)$/i.test(command)
  return {
    cwd: root,
    env,
    windowsHide: true,
    detached: platform !== "win32",
    shell,
  }
}

function renderMarkdown(summary) {
  const lines = [
    "# Build App Diagnostics Summary",
    "",
    `Generated: ${summary.endedAt}`,
    `Status: \`${summary.status}\``,
    `Command: \`${summary.commandLine}\``,
    `Root: \`${summary.root}\``,
    `Run directory: \`${summary.runDir}\``,
    "",
    "## Result",
    "",
    `- Exit code: ${summary.exitCode === null ? "null" : summary.exitCode}`,
    `- Signal: ${summary.signal || "none"}`,
    `- Timed out: ${summary.timedOut ? "yes" : "no"}`,
    `- Timeout ms: ${summary.timeoutMs}`,
    `- Duration ms: ${summary.durationMs}`,
    `- Child pid: ${summary.childPid || "not-started"}`,
    `- Spawn error: ${summary.spawnError || "none"}`,
    "",
    "## Artifacts",
    "",
    `- Stdout: \`${summary.stdout}\``,
    `- Stderr: \`${summary.stderr}\``,
    `- Summary JSON: \`${summary.summaryJson}\``,
    `- Summary Markdown: \`${summary.summaryMarkdown}\``,
    `- BUILD_ID: ${summary.buildId || "not-found"}`,
    "",
    "## Notes",
    "",
    "- This wrapper captures command output and exit metadata; it does not delete build output or mutate application files beyond diagnostics artifacts.",
    "- Treat timed-out or missing-exit-code runs as inconclusive until a direct successful rerun is captured.",
  ]

  return `${lines.join("\n")}\n`
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function readBuildId(root) {
  const buildIdPath = path.join(root, ".next", "BUILD_ID")
  if (!fs.existsSync(buildIdPath)) return null
  return fs.readFileSync(buildIdPath, "utf8").trim() || null
}

async function closeStreams(...streams) {
  await Promise.all(
    streams.map((stream) => new Promise((resolve) => stream.end(resolve))),
  )
}

function runBuildDiagnostics(options = {}) {
  const root = path.resolve(options.root || process.cwd())
  const outDir = path.resolve(root, options.outDir || path.join("what-next", "build-diagnostics"))
  const label = sanitizeLabel(options.label) || timestamp()
  const runDir = ensureRunDir(outDir, label)
  const stdout = path.join(runDir, "build.stdout.log")
  const stderr = path.join(runDir, "build.stderr.log")
  const summaryJson = path.join(runDir, "summary.json")
  const summaryMarkdown = path.join(runDir, "summary.md")
  const command = options.command || defaultCommand(options.platform || process.platform)
  const commandArgs = options.commandArgs || ["run", "build:app"]
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS
  const echo = Boolean(options.echo)
  const startedAtDate = new Date()
  const stdoutStream = fs.createWriteStream(stdout, { encoding: "utf8" })
  const stderrStream = fs.createWriteStream(stderr, { encoding: "utf8" })

  return new Promise((resolve) => {
    let child
    let timedOut = false
    let spawnError = null
    let closed = false

    const finalize = async (exitCode, signal) => {
      if (closed) return
      closed = true
      clearTimeout(timer)
      await closeStreams(stdoutStream, stderrStream)

      const endedAtDate = new Date()
      const status = timedOut
        ? "timeout"
        : spawnError
          ? "error"
          : exitCode === 0
            ? "passed"
            : "failed"
      const summary = {
        command,
        commandArgs,
        commandLine: commandLine(command, commandArgs),
        root,
        runDir,
        startedAt: startedAtDate.toISOString(),
        endedAt: endedAtDate.toISOString(),
        durationMs: endedAtDate.getTime() - startedAtDate.getTime(),
        timeoutMs,
        timedOut,
        exitCode: typeof exitCode === "number" ? exitCode : null,
        signal: signal || null,
        status,
        childPid: child?.pid || null,
        spawnError: spawnError ? spawnError.message : null,
        stdout,
        stderr,
        summaryJson,
        summaryMarkdown,
        buildId: readBuildId(root),
      }

      writeJson(summaryJson, summary)
      fs.writeFileSync(summaryMarkdown, renderMarkdown(summary), "utf8")
      resolve(summary)
    }

    const timer = setTimeout(() => {
      timedOut = true
      terminateProcessTree(child?.pid, options.platform || process.platform)
    }, timeoutMs)

    try {
      child = spawn(
        command,
        commandArgs,
        buildSpawnOptions(root, options.env || process.env, options.platform || process.platform, command),
      )
    } catch (error) {
      spawnError = error
      finalize(null, null)
      return
    }

    child.stdout.on("data", (chunk) => {
      stdoutStream.write(chunk)
      if (echo) process.stdout.write(chunk)
    })
    child.stderr.on("data", (chunk) => {
      stderrStream.write(chunk)
      if (echo) process.stderr.write(chunk)
    })
    child.on("error", (error) => {
      spawnError = error
    })
    child.on("close", (code, signal) => {
      finalize(code, signal)
    })
  })
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help) {
    printHelp()
    return
  }

  const summary = await runBuildDiagnostics(args)
  console.log(renderMarkdown(summary))
  process.exitCode = summary.status === "passed" ? 0 : 1
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  buildSpawnOptions,
  defaultCommand,
  parseArgs,
  renderMarkdown,
  runBuildDiagnostics,
  sanitizeLabel,
  terminateProcessTree,
  timestamp,
}