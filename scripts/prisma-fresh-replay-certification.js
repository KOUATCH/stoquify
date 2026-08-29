#!/usr/bin/env node

const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const { Client } = require("pg")

const DEFAULT_OUT = "what-next/prisma-fresh-replay-certification.md"
const DEFAULT_JSON_OUT = "what-next/prisma-fresh-replay-certification.json"
const DATABASE_URL_ENV = "AQSTOQFLOW_FRESH_REPLAY_DATABASE_URL"
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

const ALLOWED_DROPPED_FOREIGN_KEYS = new Set([
  "accountant_client_invites_businessEventId_fkey",
  "accountant_client_invites_outboxId_fkey",
  "customer_statement_deliveries_businessEventId_fkey",
  "customer_statement_deliveries_outboxId_fkey",
  "production_batches_createdById_fkey",
  "production_batches_locationId_fkey",
  "production_batches_organizationId_fkey",
  "production_batches_recipeId_fkey",
  "recipe_ingredients_itemId_fkey",
  "recipe_ingredients_recipeId_fkey",
  "recipes_organizationId_fkey",
  "recipes_outputItemId_fkey",
])

const ALLOWED_DEFAULT_TABLES = new Set([
  "payroll_employee_balance_cases",
  "payroll_payment_destination_change_requests",
  "workflow_assurance_alert_deliveries",
  "workflow_assurance_check_definitions",
  "workflow_assurance_check_runs",
  "workflow_assurance_incidents",
  "workflow_assurance_waivers",
])

const ALLOWED_LEGACY_TABLES = new Set([
  "legacy_production_batches",
  "legacy_recipe_ingredients",
  "legacy_recipes",
])

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "fail",
    out: DEFAULT_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--root") options.root = path.resolve(argv[++index])
    else if (value === "--mode") options.mode = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error(`Unknown argument: ${value}`)
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`)
  }
  return options
}

function expandEnv(value) {
  return value.replace(/\$\{([^}]+)\}/g, (_match, key) => process.env[key] || "")
}

function requireSafeDatabaseUrl() {
  const configured = process.env[DATABASE_URL_ENV]?.trim()
  if (!configured) throw new Error(`${DATABASE_URL_ENV} is required`)
  const parsed = new URL(expandEnv(configured))
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Fresh replay certification requires PostgreSQL")
  }
  if (!LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("Fresh replay certification refuses non-local databases")
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""))
  if (!/^stoquify_(?:referral|replay)_[a-z0-9_]+$/.test(databaseName)) {
    throw new Error("Fresh replay certification requires a stoquify_replay_* database (legacy stoquify_referral_* is also accepted)")
  }
  return { databaseName, databaseUrl: parsed.toString() }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function listMigrations(root) {
  const migrationsRoot = path.join(root, "prisma", "migrations")
  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const file = path.join(migrationsRoot, entry.name, "migration.sql")
      return { name: entry.name, checksum: sha256(fs.readFileSync(file)) }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

function runSchemaDiff(root, databaseUrl) {
  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js")
  const schema = path.join(root, "prisma", "schema.prisma")
  const run = spawnSync(
    process.execPath,
    [
      prismaCli,
      "migrate",
      "diff",
      "--from-schema-datasource",
      schema,
      "--to-schema-datamodel",
      schema,
      "--script",
    ],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    },
  )
  if (run.status !== 0) {
    throw new Error((run.stderr || run.stdout || "Prisma schema diff failed").trim())
  }
  return (run.stdout || "").replace(/\r\n/g, "\n")
}

function executableStatements(sql) {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((part) =>
      part
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean)
}

function classifyStatement(statement) {
  let match = statement.match(
    /^ALTER TABLE "([^"]+)" DROP CONSTRAINT "([^"]+)"$/s,
  )
  if (match && ALLOWED_DROPPED_FOREIGN_KEYS.has(match[2])) {
    return { allowed: true, category: "retained_database_foreign_key" }
  }

  match = statement.match(
    /^ALTER TABLE "([^"]+)" ALTER COLUMN "updatedAt" DROP DEFAULT$/s,
  )
  if (match && ALLOWED_DEFAULT_TABLES.has(match[1])) {
    return { allowed: true, category: "retained_database_timestamp_default" }
  }

  match = statement.match(/^DROP TABLE "([^"]+)"$/s)
  if (match && ALLOWED_LEGACY_TABLES.has(match[1])) {
    return { allowed: true, category: "retained_legacy_evidence_table" }
  }

  if (statement === 'DROP TYPE "ProductionBatchStatus"') {
    return { allowed: true, category: "retained_legacy_evidence_enum" }
  }

  if (/^ALTER TABLE "[^"]+" RENAME CONSTRAINT "[^"]+" TO "[^"]+"$/s.test(statement)) {
    return { allowed: true, category: "metadata_foreign_key_rename" }
  }

  if (/^ALTER INDEX "[^"]+" RENAME TO "[^"]+"$/s.test(statement)) {
    return { allowed: true, category: "metadata_index_rename" }
  }

  return { allowed: false, category: "unexpected_structural_drift" }
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    counts[item[key]] = (counts[item[key]] || 0) + 1
    return counts
  }, {})
}

async function inspectMigrationHistory(databaseUrl, expected) {
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    const result = await client.query(
      'SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name',
    )
    const actualByName = new Map(result.rows.map((row) => [row.migration_name, row]))
    const expectedByName = new Map(expected.map((migration) => [migration.name, migration]))
    const missing = expected.filter((migration) => !actualByName.has(migration.name)).map((migration) => migration.name)
    const unknown = result.rows.filter((row) => !expectedByName.has(row.migration_name)).map((row) => row.migration_name)
    const unfinished = result.rows
      .filter((row) => !row.finished_at || row.rolled_back_at)
      .map((row) => row.migration_name)
    const checksumMismatches = result.rows
      .filter((row) => expectedByName.has(row.migration_name))
      .filter((row) => expectedByName.get(row.migration_name).checksum !== row.checksum)
      .map((row) => row.migration_name)
    return {
      expectedCount: expected.length,
      appliedCount: result.rows.length,
      missing,
      unknown,
      unfinished,
      checksumMismatches,
      ready:
        missing.length === 0 &&
        unknown.length === 0 &&
        unfinished.length === 0 &&
        checksumMismatches.length === 0,
    }
  } finally {
    await client.end()
  }
}

function renderMarkdown(report) {
  const lines = [
    "# Prisma Fresh Replay Certification",
    "",
    `- Status: **${report.status}**`,
    `- Database: \`${report.databaseName}\` (local dedicated replay database)`,
    `- Catalog/applied migrations: ${report.history.expectedCount}/${report.history.appliedCount}`,
    `- Residual drift statements: ${report.drift.statementCount}`,
    `- Unexpected structural drift: ${report.drift.unexpected.length}`,
    `- Drift SHA-256: \`${report.drift.sha256}\``,
    "",
    "## Migration History",
    "",
    `- Missing: ${report.history.missing.length}`,
    `- Unknown: ${report.history.unknown.length}`,
    `- Unfinished or rolled back: ${report.history.unfinished.length}`,
    `- Checksum mismatches: ${report.history.checksumMismatches.length}`,
    "",
    "## Allowed Residual Drift",
    "",
    "The gate permits only metadata-only index/foreign-key renames, stronger database-side foreign keys and timestamp defaults, and the explicitly retained legacy production evidence tables/type. It rejects missing tables, enums, columns, indexes, or any other structural change.",
    "",
  ]
  for (const [category, count] of Object.entries(report.drift.allowedCategories)) {
    lines.push(`- ${category}: ${count}`)
  }
  if (report.drift.unexpected.length) {
    lines.push("", "## Unexpected Statements", "")
    for (const statement of report.drift.unexpected) lines.push(`- \`${statement}\``)
  }
  return lines.join("\n") + "\n"
}

async function main() {
  const options = parseArgs()
  const { databaseName, databaseUrl } = requireSafeDatabaseUrl()
  const expected = listMigrations(options.root)
  const history = await inspectMigrationHistory(databaseUrl, expected)
  const sql = runSchemaDiff(options.root, databaseUrl)
  const classified = executableStatements(sql).map((statement) => ({
    statement,
    ...classifyStatement(statement),
  }))
  const unexpected = classified.filter((item) => !item.allowed).map((item) => item.statement)
  const allowed = classified.filter((item) => item.allowed)
  const ready = history.ready && unexpected.length === 0
  const report = {
    generatedAt: new Date().toISOString(),
    status: ready ? "READY_WITH_INTENTIONAL_RESIDUAL_DRIFT" : "BLOCKED",
    ready,
    databaseName,
    history,
    drift: {
      statementCount: classified.length,
      sha256: sha256(sql),
      allowedCategories: countBy(allowed, "category"),
      unexpected,
    },
  }

  const markdownPath = path.resolve(options.root, options.out)
  const jsonPath = path.resolve(options.root, options.jsonOut)
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true })
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
  fs.writeFileSync(markdownPath, renderMarkdown(report))
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n")
  process.stdout.write(JSON.stringify(report) + "\n")

  if (options.mode === "fail" && !ready) process.exitCode = 1
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
