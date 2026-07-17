#!/usr/bin/env node

const fs = require("fs")
const os = require("os")
const path = require("path")

const MODES = new Set(["report", "warn", "fail"])

function unquote(value) {
  return value.trim().replace(/^["']|["']$/g, "")
}

function readDotenv(filePath = path.join(process.cwd(), ".env")) {
  if (!fs.existsSync(filePath)) return null
  const values = {}
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    values[match[1]] = unquote(match[2])
  }
  return values
}

function expandEnvReferences(value, values, env = process.env) {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) return values[key]
    if (Object.prototype.hasOwnProperty.call(env, key)) return env[key]
    return ""
  })
}

function readDotenvValue(key, filePath = path.join(process.cwd(), ".env"), env = process.env) {
  const values = readDotenv(filePath)
  if (!values || !Object.prototype.hasOwnProperty.call(values, key)) return null
  return expandEnvReferences(values[key], values, env)
}

function applyRuntimeDatabaseEnv(env = process.env, filePath = path.join(process.cwd(), ".env")) {
  if (env.DATABASE_URL) return false
  const dotenvValue = readDotenvValue("DATABASE_URL", filePath, env)
  if (!dotenvValue) return false
  env.DATABASE_URL = dotenvValue
  return true
}

const REQUIRED_WORKFLOW_ASSURANCE_TABLES = [
  "workflow_assurance_check_definitions",
  "workflow_assurance_check_runs",
  "workflow_assurance_incidents",
  "workflow_assurance_incident_events",
  "workflow_assurance_alert_deliveries",
  "workflow_assurance_waivers",
]

const REQUIRED_WORKFLOW_ASSURANCE_MIGRATIONS = [
  "20260621103000_workflow_assurance_registry_foundation",
  "20260621113000_workflow_assurance_incident_spine",
]

function parseArgs(argv) {
  const args = {
    mode: "report",
    out: null,
    jsonOut: null,
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--json-out") args.jsonOut = path.resolve(argv[++index])
    else if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!MODES.has(args.mode)) throw new Error("--mode must be one of: report, warn, fail")
  return args
}

function printHelp() {
  console.log(`Workflow Assurance runtime table check

Usage:
  node scripts/workflow-assurance-runtime-table-check.js [--mode report|warn|fail] [--out file] [--json-out file]

This is a runtime fallback for environments where Prisma migrate status/deploy cannot report cleanly.
It validates that the database contains the workflow assurance tables and migration rows required by the schema.
`)
}

function evaluateRuntimeTablePresence(input = {}) {
  const now = input.generatedAt ?? new Date().toISOString()
  const tables = input.requiredTables ?? REQUIRED_WORKFLOW_ASSURANCE_TABLES
  const migrations = input.requiredMigrations ?? REQUIRED_WORKFLOW_ASSURANCE_MIGRATIONS
  const tableRows = new Map((input.tableRows ?? []).map((row) => [String(row.tableName), Boolean(row.present)]))
  const migrationRows = new Map((input.migrationRows ?? []).map((row) => [String(row.migrationName), Boolean(row.present)]))
  const tableResults = tables.map((tableName) => ({
    tableName,
    present: tableRows.get(tableName) === true,
  }))
  const migrationResults = migrations.map((migrationName) => ({
    migrationName,
    present: migrationRows.get(migrationName) === true,
  }))
  const blockers = [
    ...tableResults.filter((row) => !row.present).map((row) => ({
      area: "runtime_table",
      blocker: row.tableName,
    })),
    ...migrationResults.filter((row) => !row.present).map((row) => ({
      area: "migration_history",
      blocker: row.migrationName,
    })),
  ]

  if (input.queryError) {
    blockers.push({
      area: "database_query",
      blocker: String(input.queryError.message ?? input.queryError),
    })
  }

  return {
    generatedAt: now,
    status: blockers.length === 0 ? "ready" : "blocked",
    summary: {
      requiredTableCount: tableResults.length,
      presentTableCount: tableResults.filter((row) => row.present).length,
      requiredMigrationCount: migrationResults.length,
      presentMigrationCount: migrationResults.filter((row) => row.present).length,
      blockerCount: blockers.length,
    },
    tables: tableResults,
    migrations: migrationResults,
    blockers,
  }
}

async function queryRuntimeDatabase(prisma) {
  const tableRows = []
  for (const tableName of REQUIRED_WORKFLOW_ASSURANCE_TABLES) {
    const result = await prisma.$queryRaw`SELECT to_regclass(${tableName})::text AS regclass`
    tableRows.push({
      tableName,
      present: Boolean(result?.[0]?.regclass),
    })
  }

  const migrationRows = []
  for (const migrationName of REQUIRED_WORKFLOW_ASSURANCE_MIGRATIONS) {
    const result = await prisma.$queryRaw`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE migration_name = ${migrationName}
        AND finished_at IS NOT NULL
      LIMIT 1
    `
    migrationRows.push({
      migrationName,
      present: result.length > 0,
    })
  }

  return { tableRows, migrationRows }
}

async function checkRuntimeDatabase() {
  applyRuntimeDatabaseEnv()

  let PrismaClient
  try {
    ;({ PrismaClient } = require("@prisma/client"))
  } catch (error) {
    return evaluateRuntimeTablePresence({ queryError: error })
  }

  const prisma = new PrismaClient()
  try {
    const rows = await queryRuntimeDatabase(prisma)
    return evaluateRuntimeTablePresence(rows)
  } catch (error) {
    return evaluateRuntimeTablePresence({ queryError: error })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

function renderMarkdown(report, mode = "report") {
  const lines = []
  lines.push("# Workflow Assurance Runtime Table Check")
  lines.push("")
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Mode: \`${mode}\``)
  lines.push(`Status: \`${report.status}\``)
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Runtime tables present: ${report.summary.presentTableCount}/${report.summary.requiredTableCount}`)
  lines.push(`- Migration rows present: ${report.summary.presentMigrationCount}/${report.summary.requiredMigrationCount}`)
  lines.push(`- Blockers: ${report.summary.blockerCount}`)
  lines.push("")
  lines.push("## Runtime Tables")
  lines.push("")
  for (const table of report.tables) lines.push(`- ${table.present ? "present" : "missing"}: ${table.tableName}`)
  lines.push("")
  lines.push("## Migration History")
  lines.push("")
  for (const migration of report.migrations) {
    lines.push(`- ${migration.present ? "present" : "missing"}: ${migration.migrationName}`)
  }
  lines.push("")
  lines.push("## Blockers")
  lines.push("")
  if (report.blockers.length === 0) {
    lines.push("No Workflow Assurance runtime table blockers detected.")
  } else {
    for (const blocker of report.blockers) lines.push(`- ${blocker.area}: ${blocker.blocker}`)
  }
  lines.push("")
  lines.push("## Safety Notes")
  lines.push("")
  lines.push("- This checker is read-only and does not apply migrations.")
  lines.push("- Use it as a fallback when Prisma migrate status/deploy cannot report cleanly.")
  lines.push("- A passing result does not replace a healthy Prisma migration workflow for release.")
  return lines.join(os.EOL)
}

function writeOutputs(report, args) {
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true })
    fs.writeFileSync(args.out, renderMarkdown(report, args.mode), "utf8")
  }
  if (args.jsonOut) {
    fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true })
    fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}${os.EOL}`, "utf8")
  }
}

function exitCodeForReport(report, mode) {
  if (mode === "fail" && report.summary.blockerCount > 0) return 1
  return 0
}

async function main(argv = process.argv) {
  const args = parseArgs(argv)
  const report = await checkRuntimeDatabase()
  writeOutputs(report, args)
  console.log(renderMarkdown(report, args.mode))
  if (args.mode === "warn" && report.summary.blockerCount > 0) {
    console.warn(`Workflow Assurance runtime table check found ${report.summary.blockerCount} blocker(s).`)
  }
  return exitCodeForReport(report, args.mode)
}

if (require.main === module) {
  main(process.argv)
    .then((code) => {
      process.exitCode = code
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}

module.exports = {
  REQUIRED_WORKFLOW_ASSURANCE_MIGRATIONS,
  REQUIRED_WORKFLOW_ASSURANCE_TABLES,
  applyRuntimeDatabaseEnv,
  checkRuntimeDatabase,
  expandEnvReferences,
  readDotenvValue,
  evaluateRuntimeTablePresence,
  exitCodeForReport,
  parseArgs,
  queryRuntimeDatabase,
  renderMarkdown,
}

