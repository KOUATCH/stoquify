#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const ASSURANCE_ROUTE_IDS = Object.freeze(["assurance-incident-detail"])
const DEFAULT_OUT = "what-next/referrals/WORKFLOW_ASSURANCE_INCIDENT_DETAIL_BROWSER_SMOKE.json"
const DEFAULT_SCREENSHOTS_DIR = "what-next/referrals/screenshots/assurance-incident-detail"

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

function resolveFromRoot(root, value) {
  return path.isAbsolute(value) ? value : path.resolve(root, value)
}

function normalizeRelative(root, value) {
  return path.relative(root, value).replace(/\\/g, "/")
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

function parseArgs(argv, env = process.env, defaultRoot = process.cwd()) {
  let root = defaultRoot

  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      root = path.resolve(argv[index + 1])
      index += 1
    }
  }

  const args = {
    root,
    mode: firstEnv(env, ["ASSURANCE_SMOKE_MODE"], "fail"),
    baseUrl: firstEnv(env, ["ASSURANCE_SMOKE_BASE_URL", "PLAYWRIGHT_BASE_URL"], "http://127.0.0.1:3000"),
    incidentId: firstEnv(env, ["ASSURANCE_SMOKE_INCIDENT_ID"], ""),
    timeoutMs: parseNumber(firstEnv(env, ["ASSURANCE_SMOKE_TIMEOUT_MS"], "120000"), "ASSURANCE_SMOKE_TIMEOUT_MS"),
    warmupTimeoutMs: null,
    storageState: firstEnv(
      env,
      ["ASSURANCE_SMOKE_STORAGE_STATE", "PLAYWRIGHT_STORAGE_STATE"],
      "playwright/.auth/assurance-manager.json",
    ),
    screenshotsDir: firstEnv(env, ["ASSURANCE_SMOKE_SCREENSHOTS_DIR"], DEFAULT_SCREENSHOTS_DIR),
    out: firstEnv(env, ["ASSURANCE_SMOKE_OUT"], DEFAULT_OUT),
    serverMode: firstEnv(env, ["ASSURANCE_SMOKE_SERVER_MODE"], "external"),
    port: env.ASSURANCE_SMOKE_PORT ? Number.parseInt(env.ASSURANCE_SMOKE_PORT, 10) : null,
    hostname: firstEnv(env, ["ASSURANCE_SMOKE_HOSTNAME"], "127.0.0.1"),
    dryRun: env.ASSURANCE_SMOKE_DRY_RUN === "1",
  }

  const warmupEnv = firstEnv(env, ["ASSURANCE_SMOKE_WARMUP_TIMEOUT_MS"], null)
  args.warmupTimeoutMs =
    warmupEnv === null ? Math.max(args.timeoutMs, 120000) : parseNumber(warmupEnv, "ASSURANCE_SMOKE_WARMUP_TIMEOUT_MS")

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") index += 1
    else if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--base-url") args.baseUrl = argv[++index]
    else if (arg === "--incident-id") args.incidentId = argv[++index]
    else if (arg === "--timeout-ms") args.timeoutMs = parseNumber(argv[++index], "--timeout-ms")
    else if (arg === "--warmup-timeout-ms") args.warmupTimeoutMs = parseNumber(argv[++index], "--warmup-timeout-ms")
    else if (arg === "--storage-state") args.storageState = argv[++index]
    else if (arg === "--screenshots-dir") args.screenshotsDir = argv[++index]
    else if (arg === "--out") args.out = argv[++index]
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

  args.storageState = resolveFromRoot(args.root, args.storageState)
  args.screenshotsDir = resolveFromRoot(args.root, args.screenshotsDir)
  args.out = resolveFromRoot(args.root, args.out)

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

  for (const routeId of ASSURANCE_ROUTE_IDS) {
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

function ensureRunPrerequisites(args, fsImpl = fs) {
  if (!args.incidentId || args.incidentId === "__ASSURANCE_INCIDENT_ID_REQUIRED__") {
    throw new Error(
      "Workflow Assurance browser smoke requires ASSURANCE_SMOKE_INCIDENT_ID or --incident-id for an existing tenant-scoped incident detail fixture.",
    )
  }

  if (!fsImpl.existsSync(args.storageState)) {
    throw new Error(
      [
        `Workflow Assurance browser smoke auth state not found: ${args.storageState}`,
        "Create a tenant-scoped assurance manager Playwright storage state before running the gate, or set ASSURANCE_SMOKE_STORAGE_STATE/PLAYWRIGHT_STORAGE_STATE.",
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
    routeIds: ASSURANCE_ROUTE_IDS,
    incidentId: args.incidentId || null,
    authState: normalizeRelative(args.root, args.storageState),
    output: normalizeRelative(args.root, args.out),
    screenshotsDir: normalizeRelative(args.root, args.screenshotsDir),
    timeoutMs: args.timeoutMs,
    warmupTimeoutMs: args.warmupTimeoutMs,
    certificationClaimed: false,
    truthAuthority: "server-owned POS action and Workflow Assurance services only",
    smokeCommand: {
      command: "node",
      args: smokeCommand.args.map((value) =>
        path.isAbsolute(value) ? normalizeRelative(args.root, value) : value,
      ),
      env: {
        ASSURANCE_SMOKE_INCIDENT_ID: args.incidentId || "__ASSURANCE_INCIDENT_ID_REQUIRED__",
      },
    },
  }
}

function printHelp() {
  console.log(`Stoquify Workflow Assurance browser smoke wrapper

Usage:
  node scripts/workflow-assurance-browser-smoke.js --incident-id <workflow-assurance-incident-id>

Required evidence:
  --incident-id file/fixture id      Existing tenant-scoped Workflow Assurance incident detail id.
  --storage-state file              Tenant-scoped assurance manager Playwright storage state.

This wrapper delegates to scripts/ui-route-smoke-gate.js for the assurance-incident-detail route
and does not certify browser readiness by itself.
`)
}

function main() {
  const args = parseArgs(process.argv)
  const config = reportConfig(args)

  if (args.dryRun) {
    console.log(JSON.stringify(config, null, 2))
    return
  }

  ensureRunPrerequisites(args)

  if (config.serverCommand) {
    console.log(`Server command (${args.serverMode}): ${config.serverCommand.command} ${config.serverCommand.args.join(" ")}`)
  } else {
    console.log(`Using external app server at ${args.baseUrl}`)
  }

  const smokeCommand = buildSmokeCommand(args)
  const result = spawnSync(smokeCommand.command, smokeCommand.args, {
    cwd: args.root,
    env: {
      ...process.env,
      ASSURANCE_SMOKE_INCIDENT_ID: args.incidentId,
    },
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
  ASSURANCE_ROUTE_IDS,
  buildServerCommand,
  buildSmokeCommand,
  ensureRunPrerequisites,
  parseArgs,
  reportConfig,
}
