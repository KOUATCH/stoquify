#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const PAYROLL_ROUTE_IDS = Object.freeze([
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

function firstEnv(env, names, fallback) {
  for (const name of names) {
    if (env[name]) return env[name]
  }
  return fallback
}

function parseNumber(value, name) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed < 1000) {
    throw new Error(`${name} must be a number greater than or equal to 1000`)
  }
  return parsed
}

function portFromBaseUrl(baseUrl, fallback = 3000) {
  try {
    const url = new URL(baseUrl)
    if (url.port) return Number.parseInt(url.port, 10)
    return url.protocol === "https:" ? 443 : 80
  } catch {
    return fallback
  }
}

function parseArgs(argv, env = process.env, root = process.cwd()) {
  const args = {
    root,
    mode: firstEnv(env, ["PAYROLL_SMOKE_MODE"], "fail"),
    baseUrl: firstEnv(env, ["PAYROLL_SMOKE_BASE_URL", "PLAYWRIGHT_BASE_URL"], "http://127.0.0.1:3000"),
    timeoutMs: parseNumber(firstEnv(env, ["PAYROLL_SMOKE_TIMEOUT_MS"], "120000"), "PAYROLL_SMOKE_TIMEOUT_MS"),
    warmupTimeoutMs: null,
    storageState: path.resolve(
      root,
      firstEnv(env, ["PAYROLL_SMOKE_STORAGE_STATE", "PLAYWRIGHT_STORAGE_STATE"], "playwright/.auth/payroll.json"),
    ),
    screenshotsDir: path.resolve(
      root,
      firstEnv(
        env,
        ["PAYROLL_SMOKE_SCREENSHOTS_DIR"],
        "what-next/payroll/screenshots/payroll-browser-smoke",
      ),
    ),
    out: path.resolve(
      root,
      firstEnv(env, ["PAYROLL_SMOKE_OUT"], "what-next/payroll/AQSTOQFLOW_PAYROLL_UI_ROUTE_SMOKE_BROWSER.json"),
    ),
    serverMode: firstEnv(env, ["PAYROLL_SMOKE_SERVER_MODE"], "external"),
    port: env.PAYROLL_SMOKE_PORT ? Number.parseInt(env.PAYROLL_SMOKE_PORT, 10) : null,
    hostname: firstEnv(env, ["PAYROLL_SMOKE_HOSTNAME"], "127.0.0.1"),
    dryRun: env.PAYROLL_SMOKE_DRY_RUN === "1",
  }

  const warmupEnv = firstEnv(env, ["PAYROLL_SMOKE_WARMUP_TIMEOUT_MS"], null)
  args.warmupTimeoutMs = warmupEnv === null ? Math.max(args.timeoutMs, 120000) : parseNumber(warmupEnv, "PAYROLL_SMOKE_WARMUP_TIMEOUT_MS")

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--base-url") args.baseUrl = argv[++index]
    else if (arg === "--timeout-ms") args.timeoutMs = parseNumber(argv[++index], "--timeout-ms")
    else if (arg === "--warmup-timeout-ms") args.warmupTimeoutMs = parseNumber(argv[++index], "--warmup-timeout-ms")
    else if (arg === "--storage-state") args.storageState = path.resolve(root, argv[++index])
    else if (arg === "--screenshots-dir") args.screenshotsDir = path.resolve(root, argv[++index])
    else if (arg === "--out") args.out = path.resolve(root, argv[++index])
    else if (arg === "--server-mode") args.serverMode = argv[++index]
    else if (arg === "--port") args.port = Number.parseInt(argv[++index], 10)
    else if (arg === "--hostname") args.hostname = argv[++index]
    else if (arg === "--dry-run") args.dryRun = true
    else if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!["report", "fail"].includes(args.mode)) {
    throw new Error("--mode must be one of: report, fail")
  }
  if (!["external", "standalone", "next-start"].includes(args.serverMode)) {
    throw new Error("--server-mode must be one of: external, standalone, next-start")
  }
  if (!Number.isFinite(args.port)) {
    args.port = portFromBaseUrl(args.baseUrl)
  }

  return args
}

function buildSmokeCommand(args) {
  const commandArgs = [
    path.join("scripts", "ui-route-smoke-gate.js"),
    "--mode",
    args.mode,
    "--base-url",
    args.baseUrl,
    "--timeout-ms",
    String(args.timeoutMs),
    "--warmup-timeout-ms",
    String(args.warmupTimeoutMs),
    "--require-screenshots",
    "--storage-state",
    args.storageState,
    "--screenshots-dir",
    args.screenshotsDir,
    "--out",
    args.out,
  ]

  for (const routeId of PAYROLL_ROUTE_IDS) {
    commandArgs.push("--route", routeId)
  }

  return {
    command: process.execPath,
    args: commandArgs,
  }
}

function buildServerCommand(args) {
  if (args.serverMode === "external") return null
  if (args.serverMode === "standalone") {
    return {
      command: process.execPath,
      args: [path.join(".next", "standalone", "server.js")],
      env: {
        HOSTNAME: args.hostname,
        PORT: String(args.port),
      },
      note: "Use after npm run build:app when Next output is standalone.",
    }
  }

  return {
    command: "npm",
    args: ["run", "start", "--", "-p", String(args.port)],
    env: {},
    note: "Developer fallback when standalone output is not required.",
  }
}

function ensureStorageState(args, fsImpl = fs) {
  if (!fsImpl.existsSync(args.storageState)) {
    throw new Error(
      [
        `Payroll browser smoke auth state not found: ${args.storageState}`,
        "Run npm run auth:payroll:bootstrap against the target base URL first, or set PAYROLL_SMOKE_STORAGE_STATE/PLAYWRIGHT_STORAGE_STATE to a valid tenant-scoped payroll auth state.",
      ].join("\n"),
    )
  }
}

function reportConfig(args) {
  const smokeCommand = buildSmokeCommand(args)
  const serverCommand = buildServerCommand(args)

  return {
    baseUrl: args.baseUrl,
    mode: args.mode,
    serverMode: args.serverMode,
    serverCommand,
    authState: path.relative(args.root, args.storageState).replace(/\\/g, "/"),
    output: path.relative(args.root, args.out).replace(/\\/g, "/"),
    screenshotsDir: path.relative(args.root, args.screenshotsDir).replace(/\\/g, "/"),
    timeoutMs: args.timeoutMs,
    warmupTimeoutMs: args.warmupTimeoutMs,
    routes: PAYROLL_ROUTE_IDS,
    smokeCommand: {
      command: "node",
      args: smokeCommand.args.map((value) =>
        path.isAbsolute(value) ? path.relative(args.root, value).replace(/\\/g, "/") : value,
      ),
    },
  }
}

function printHelp() {
  console.log(`AqStoqFlow payroll browser smoke wrapper

Usage:
  node scripts/payroll-browser-smoke.js [--base-url http://127.0.0.1:3000] [--server-mode external|standalone|next-start]

Environment:
  PAYROLL_SMOKE_BASE_URL          Overrides PLAYWRIGHT_BASE_URL and default http://127.0.0.1:3000.
  PAYROLL_SMOKE_TIMEOUT_MS        Defaults to 120000 for CI-friendly route rendering.
  PAYROLL_SMOKE_WARMUP_TIMEOUT_MS Defaults to max(timeout, 120000).
  PAYROLL_SMOKE_STORAGE_STATE     Defaults to playwright/.auth/payroll.json.
  PAYROLL_SMOKE_SERVER_MODE       external, standalone, or next-start.

Server modes:
  external    Assumes the app is already running.
  standalone  Documents node .next/standalone/server.js with HOSTNAME/PORT.
  next-start  Documents npm run start -- -p PORT as a developer fallback.
`)
}

function main() {
  const args = parseArgs(process.argv)
  const config = reportConfig(args)

  if (args.dryRun) {
    console.log(JSON.stringify(config, null, 2))
    return
  }

  ensureStorageState(args)

  if (config.serverCommand) {
    console.log(`Server command (${args.serverMode}): ${config.serverCommand.command} ${config.serverCommand.args.join(" ")}`)
    if (config.serverCommand.env && Object.keys(config.serverCommand.env).length > 0) {
      console.log(`Server env: ${JSON.stringify(config.serverCommand.env)}`)
    }
  } else {
    console.log(`Using external app server at ${args.baseUrl}`)
  }

  const smokeCommand = buildSmokeCommand(args)
  const result = spawnSync(smokeCommand.command, smokeCommand.args, {
    cwd: args.root,
    env: process.env,
    stdio: "inherit",
  })

  if (result.error) throw result.error
  process.exitCode = result.status === null ? 1 : result.status
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  PAYROLL_ROUTE_IDS,
  buildServerCommand,
  buildSmokeCommand,
  ensureStorageState,
  parseArgs,
  reportConfig,
}
