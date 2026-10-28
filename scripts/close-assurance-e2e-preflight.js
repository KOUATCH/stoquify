#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const TODAY = "2026-07-20"
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"])
const REMOTE_RISK_MARKERS = [
  "prod",
  "production",
  "supabase",
  "neon",
  "rds",
  "amazonaws",
  "azure",
  "railway",
  "render",
  "vercel",
]

function loadLocalEnv(root = process.cwd()) {
  for (const envPath of [path.join(root, ".env.local"), path.join(root, ".env")]) {
    if (!fs.existsSync(envPath)) continue

    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match || process.env[match[1]] !== undefined) continue

      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[match[1]] = value
        .replace(/\${([A-Za-z_][A-Za-z0-9_]*)}/g, (_, key) => process.env[key] || "")
        .replace(/\\n/g, "\n")
    }
  }
}

function parseArgs(argv = process.argv.slice(2), env = process.env, root = process.cwd()) {
  const args = {
    mode: "report",
    root,
    jsonOut: path.join(root, "what-next", "accounting", `close-assurance-e2e-db-preflight-${TODAY}.json`),
    out: path.join(root, "what-next", "accounting", `close-assurance-e2e-db-preflight-${TODAY}.md`),
    allowRemote: env.AQSTOQFLOW_ALLOW_REMOTE_E2E_DB === "1",
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--mode") args.mode = argv[++index] || args.mode
    else if (arg === "--json-out") args.jsonOut = path.resolve(root, argv[++index])
    else if (arg === "--out") args.out = path.resolve(root, argv[++index])
    else if (arg === "--allow-remote") args.allowRemote = true
    else if (arg === "--help" || arg === "-h") args.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }

  if (!["report", "fail"].includes(args.mode)) {
    throw new Error("--mode must be report or fail")
  }
  return args
}

function redactedConnection(raw) {
  if (!raw) return null
  if (raw.startsWith("file:")) return raw.replace(/file:(.+)/, "file:<local-file>")

  try {
    const url = new URL(raw)
    const auth = url.username ? `${url.username}:***@` : ""
    const port = url.port ? `:${url.port}` : ""
    return `${url.protocol}//${auth}${url.hostname}${port}${url.pathname ? "/<database>" : ""}`
  } catch {
    return "<unparseable-database-url>"
  }
}

function hasRiskMarker(value) {
  const text = String(value || "").toLowerCase()
  return REMOTE_RISK_MARKERS.some((marker) => text.includes(marker))
}

function classifyConnection(raw, { allowRemote = false } = {}) {
  if (!raw) {
    return {
      present: false,
      safe: false,
      reason: "DATABASE_URL is missing.",
      redactedUrl: null,
      protocol: null,
      host: null,
      databaseName: null,
      hostClass: "missing",
    }
  }

  if (raw.startsWith("file:")) {
    return {
      present: true,
      safe: true,
      reason: "SQLite/file database URL is local.",
      redactedUrl: redactedConnection(raw),
      protocol: "file",
      host: null,
      databaseName: "<local-file>",
      hostClass: "local-file",
    }
  }

  try {
    const url = new URL(raw)
    const protocol = url.protocol.replace(/:$/, "")
    const host = url.hostname
    const databaseName = decodeURIComponent(url.pathname.replace(/^\//, "")) || null
    const local = LOCAL_HOSTS.has(host)
    const riskyName = hasRiskMarker(host) || hasRiskMarker(databaseName)
    const safe = allowRemote || (local && !riskyName)

    return {
      present: true,
      safe,
      reason: safe
        ? local
          ? "Database host is local and has no production marker."
          : "Remote database allowed by explicit AQSTOQFLOW_ALLOW_REMOTE_E2E_DB/--allow-remote override."
        : local
          ? "Database name or host contains a production-risk marker."
          : "Database host is not local; live e2e seeding is blocked without explicit remote override.",
      redactedUrl: redactedConnection(raw),
      protocol,
      host,
      databaseName,
      hostClass: local ? "local" : "remote",
    }
  } catch {
    return {
      present: true,
      safe: false,
      reason: "DATABASE_URL could not be parsed safely.",
      redactedUrl: redactedConnection(raw),
      protocol: null,
      host: null,
      databaseName: null,
      hostClass: "unparseable",
    }
  }
}

function productionMarkers(env = process.env) {
  return ["NODE_ENV", "AQSTOQFLOW_ENV", "VERCEL_ENV"]
    .map((key) => ({ key, value: env[key] || null }))
    .filter((entry) => String(entry.value || "").toLowerCase() === "production")
}

function buildPayload(args, env = process.env) {
  const database = classifyConnection(env.DATABASE_URL, { allowRemote: args.allowRemote })
  const directUrl = env.DIRECT_URL
    ? classifyConnection(env.DIRECT_URL, { allowRemote: args.allowRemote })
    : null
  const markers = productionMarkers(env)
  const gates = [
    {
      id: "environment:not-production",
      ok: markers.length === 0,
      reason: markers.length === 0
        ? "No production environment markers are set."
        : `Production marker(s) set: ${markers.map((marker) => marker.key).join(", ")}.`,
    },
    {
      id: "database:local-or-explicitly-approved",
      ok: database.safe,
      reason: database.reason,
    },
    {
      id: "direct-url:local-or-absent",
      ok: !directUrl || directUrl.safe,
      reason: directUrl ? directUrl.reason : "DIRECT_URL is absent, so no second write target was detected.",
    },
  ]
  const ok = gates.every((gate) => gate.ok)

  return {
    checkedAt: new Date().toISOString(),
    mode: args.mode,
    ok,
    recommendation: ok
      ? "The live close-assurance e2e smoke may be run against this local/dev database target."
      : "Do not run the live close-assurance e2e smoke until the database target is local/dev or explicitly approved.",
    command: "npm run test:e2e:close-assurance",
    allowRemoteOverride: args.allowRemote,
    environment: {
      productionMarkers: markers,
    },
    database,
    directUrl,
    gates,
  }
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
}

function writeMarkdown(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const lines = [
    "# Close Assurance E2E Database Preflight",
    "",
    `Checked at: ${payload.checkedAt}`,
    `Verdict: ${payload.ok ? "OK_TO_RUN_LOCAL_E2E" : "BLOCKED"}`,
    "",
    "## Command",
    "",
    "```powershell",
    payload.command,
    "```",
    "",
    "## Gates",
    "",
    ...payload.gates.map((gate) => `- ${gate.ok ? "PASS" : "FAIL"}: ${gate.id} - ${gate.reason}`),
    "",
    "## Database Target",
    "",
    `- DATABASE_URL: ${payload.database.redactedUrl || "missing"}`,
    `- Host class: ${payload.database.hostClass}`,
    `- DIRECT_URL: ${payload.directUrl?.redactedUrl || "absent"}`,
    "",
    "## Recommendation",
    "",
    payload.recommendation,
    "",
  ]
  fs.writeFileSync(filePath, lines.join("\n"), "utf8")
}

async function main() {
  const args = parseArgs()
  if (args.help) {
    console.log("node scripts/close-assurance-e2e-preflight.js [--mode report|fail] [--allow-remote]")
    return
  }

  loadLocalEnv(args.root)
  const payload = buildPayload(args)
  writeJson(args.jsonOut, payload)
  writeMarkdown(args.out, payload)
  console.log(`Close assurance e2e preflight: ${payload.ok ? "ok" : "blocked"}`)
  console.log(`Report: ${path.relative(args.root, args.out).replace(/\\/g, "/")}`)
  console.log(`JSON: ${path.relative(args.root, args.jsonOut).replace(/\\/g, "/")}`)

  if (args.mode === "fail" && !payload.ok) process.exitCode = 1
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}

module.exports = {
  buildPayload,
  classifyConnection,
  parseArgs,
  productionMarkers,
  redactedConnection,
}