#!/usr/bin/env node

const fs = require("fs")
const os = require("os")
const { spawnSync } = require("child_process")
const path = require("path")
const { Client } = require("pg")

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])
const PROTECTED_DATABASE_NAMES = new Set(["postgres", "template0", "template1"])
const DEFAULT_OUT = path.join(
  process.cwd(),
  "what-next",
  "payroll",
  "payroll-immutability-migration-deploy-diagnostics.md",
)
const DEFAULT_JSON_OUT = path.join(
  process.cwd(),
  "what-next",
  "payroll",
  "payroll-immutability-migration-deploy-diagnostics.json",
)

function parseArgs(argv = process.argv) {
  const args = { out: DEFAULT_OUT, jsonOut: DEFAULT_JSON_OUT }
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--json-out") args.jsonOut = path.resolve(argv[++index])
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function resolveSafeTarget(env = process.env) {
  const urlValue =
    env.PAYROLL_IMMUTABILITY_DATABASE_URL || env.TEST_DATABASE_URL || ""
  if (!urlValue) {
    throw new Error(
      "Set PAYROLL_IMMUTABILITY_DATABASE_URL or TEST_DATABASE_URL.",
    )
  }

  const parsed = new URL(urlValue)
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""))
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error("Refusing to reset a non-local database.")
  }
  if (
    !/(test|immutability)/i.test(dbName) ||
    PROTECTED_DATABASE_NAMES.has(dbName.toLowerCase())
  ) {
    throw new Error(
      `Refusing to reset database without a test/immutability name: ${dbName}`,
    )
  }

  return {
    dbName,
    host: parsed.hostname,
    urlValue,
  }
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`
}

function redactDiagnosticText(value, secretUrls = []) {
  let redacted = String(value || "")
  for (const secretUrl of secretUrls.filter(Boolean)) {
    redacted = redacted.split(secretUrl).join("[REDACTED_DATABASE_URL]")
  }
  return redacted.replace(
    /(postgres(?:ql)?:\/\/)[^\s@]+@/gi,
    "$1[REDACTED]@",
  )
}

function buildMigrationDiagnostics({
  target,
  adminUrl,
  result,
  startedAt,
  finishedAt,
}) {
  const secretUrls = [target.urlValue, adminUrl]
  const stdout = redactDiagnosticText(result.stdout, secretUrls)
  const stderr = redactDiagnosticText(result.stderr, secretUrls)
  const spawnError = redactDiagnosticText(
    result.error?.stack || result.error?.message || "",
    secretUrls,
  )
  const combinedDiagnostics = `${stdout}\n${stderr}\n${spawnError}`
  const errorCode = combinedDiagnostics.match(/\b(P\d{4})\b/)?.[1]
  const secretUrlValuesPrinted =
    secretUrls
      .filter(Boolean)
      .some((secretUrl) => combinedDiagnostics.includes(secretUrl)) ||
    /(postgres(?:ql)?:\/\/)(?!\[REDACTED\])[^\s@]+@/i.test(
      combinedDiagnostics,
    )

  return {
    generatedAt: finishedAt,
    command: "prisma migrate deploy",
    target: { host: target.host, dbName: target.dbName },
    startedAt,
    finishedAt,
    exitCode: result.status ?? 1,
    errorCode: errorCode || null,
    stdout,
    stderr,
    spawnError,
    secretUrlValuesPrinted,
  }
}

function renderDiagnostics(diagnostics) {
  return [
    "# Payroll Immutability Migration Deploy Diagnostics",
    "",
    `Generated: ${diagnostics.generatedAt}`,
    `Command: \`${diagnostics.command}\``,
    `Target: \`${diagnostics.target.host}/${diagnostics.target.dbName}\``,
    `Exit code: ${diagnostics.exitCode}`,
    `Prisma error code: ${diagnostics.errorCode || "none"}`,
    `Secret database URL values printed: ${diagnostics.secretUrlValuesPrinted ? "yes" : "no"}`,
    "",
    "## Full Redacted Standard Output",
    "",
    "```text",
    diagnostics.stdout || "(empty)",
    "```",
    "",
    "## Full Redacted Standard Error",
    "",
    "```text",
    diagnostics.stderr || "(empty)",
    "```",
    "",
    "## Full Redacted Spawn Error",
    "",
    "```text",
    diagnostics.spawnError || "(empty)",
    "```",
  ].join(os.EOL)
}

function writeDiagnostics(diagnostics, args) {
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true })
    fs.writeFileSync(
      args.out,
      `${renderDiagnostics(diagnostics)}${os.EOL}`,
      "utf8",
    )
  }
  if (args.jsonOut) {
    fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true })
    fs.writeFileSync(
      args.jsonOut,
      `${JSON.stringify(diagnostics, null, 2)}${os.EOL}`,
      "utf8",
    )
  }
}

async function recreateDatabase(target) {
  const adminUrl = new URL(target.urlValue)
  adminUrl.pathname = "/postgres"
  const client = new Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    await client.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [target.dbName],
    )
    await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(target.dbName)}`)
    await client.query(`CREATE DATABASE ${quoteIdentifier(target.dbName)}`)
  } finally {
    await client.end()
  }
  return adminUrl.toString()
}

function runMigrateDeploy(target) {
  const prismaEntry = path.join(
    process.cwd(),
    "node_modules",
    "prisma",
    "build",
    "index.js",
  )
  return spawnSync(process.execPath, [prismaEntry, "migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: target.urlValue },
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  })
}

async function main(argv = process.argv) {
  const args = parseArgs(argv)
  const target = resolveSafeTarget()
  console.log(`Reset target: ${target.host}/${target.dbName}`)

  const adminUrl = await recreateDatabase(target)
  const startedAt = new Date().toISOString()
  const result = runMigrateDeploy(target)
  const finishedAt = new Date().toISOString()
  const diagnostics = buildMigrationDiagnostics({
    target,
    adminUrl,
    result,
    startedAt,
    finishedAt,
  })
  writeDiagnostics(diagnostics, args)
  console.log(renderDiagnostics(diagnostics))

  if (diagnostics.exitCode !== 0) {
    throw new Error(
      `Prisma migrate deploy failed${diagnostics.errorCode ? ` with ${diagnostics.errorCode}` : ""}.`,
    )
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}

module.exports = {
  buildMigrationDiagnostics,
  parseArgs,
  redactDiagnosticText,
  renderDiagnostics,
  resolveSafeTarget,
}
