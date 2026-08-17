const crypto = require("node:crypto")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { Client } = require("pg")

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])
const SAFE_SCHEMA = /^codex_pos_commit_result_(?:cert|restore)_\d{8}$/

function parseArgs(argv) {
  const args = { mode: "preflight" }
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--mode") args.mode = argv[++index]
    else if (value === "--database") args.database = argv[++index]
    else if (value === "--target-schema") args.targetSchema = argv[++index]
    else if (value === "--restore-schema") args.restoreSchema = argv[++index]
    else if (value === "--evidence-dir") args.evidenceDir = argv[++index]
    else throw new Error(`Unknown argument: ${value}`)
  }
  if (!["preflight", "execute"].includes(args.mode)) {
    throw new Error("--mode must be preflight or execute")
  }
  return args
}

function required(value, name) {
  if (!value || !String(value).trim()) throw new Error(`${name} is required`)
  return String(value).trim()
}

function assertSafeName(value, name) {
  if (!SAFE_SCHEMA.test(value) || value === "public") {
    throw new Error(`${name} is outside the approved isolated certification namespace`)
  }
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function resolveConnection(args, schema) {
  const configured = required(process.env.DATABASE_URL, "DATABASE_URL")
  const url = new URL(configured.replace(/\$\{([^}]+)\}/g, (_match, key) => process.env[key] ?? ""))
  if (!LOCAL_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Refusing schema-rebound certification on a non-local PostgreSQL host")
  }
  const database = required(args.database, "--database")
  if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error("Unsafe database name")
  assertSafeName(schema, "schema")
  url.pathname = `/${database}`
  url.searchParams.set("schema", schema)
  return url.toString()
}

function redactedTarget(urlValue) {
  const url = new URL(urlValue)
  return {
    protocol: url.protocol,
    host: url.hostname,
    port: url.port || "5432",
    database: url.pathname.replace(/^\//, ""),
    schema: url.searchParams.get("schema"),
  }
}

async function inspectSchema(urlValue, schema) {
  const client = new Client({ connectionString: urlValue })
  await client.connect()
  try {
    const identity = await client.query(
      "SELECT current_database() AS database, current_user AS role",
    )
    const namespace = await client.query(
      "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1) AS present",
      [schema],
    )
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name",
      [schema],
    )
    return {
      database: identity.rows[0].database,
      databaseRole: identity.rows[0].role,
      schema,
      schemaPresent: namespace.rows[0].present,
      tableCount: tables.rowCount,
      tables: tables.rows.map((row) => row.table_name),
    }
  } finally {
    await client.end()
  }
}

async function ensureSchema(urlValue, schema) {
  const client = new Client({ connectionString: urlValue })
  await client.connect()
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schema)}`)
  } finally {
    await client.end()
  }
}

async function migrationHistory(urlValue, schema) {
  const inspection = await inspectSchema(urlValue, schema)
  if (!inspection.tables.includes("_prisma_migrations")) return []
  const client = new Client({ connectionString: urlValue })
  await client.connect()
  try {
    const result = await client.query(
      `SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count
       FROM ${quoteIdentifier(schema)}."_prisma_migrations"
       ORDER BY started_at, migration_name`,
    )
    return result.rows.map((row) => ({
      migrationName: row.migration_name,
      checksum: row.checksum,
      startedAt: row.started_at?.toISOString?.() ?? row.started_at,
      finishedAt: row.finished_at?.toISOString?.() ?? row.finished_at,
      rolledBackAt: row.rolled_back_at?.toISOString?.() ?? row.rolled_back_at,
      appliedStepsCount: row.applied_steps_count,
    }))
  } finally {
    await client.end()
  }
}

function rewritePublicReferences(sql, schema) {
  return sql
    .replaceAll('"public".', `${quoteIdentifier(schema)}.`)
    .replace(/\bpublic\./g, `${quoteIdentifier(schema)}.`)
    .replaceAll("'public.", `'${schema}.`)
    .replace(/(table_schema\s*=\s*)'public'/gi, `$1'${schema}'`)
    .replace(
      /FROM\s+pg_type\s+WHERE\s+typname\s*=/gi,
      `FROM pg_type WHERE typnamespace = to_regnamespace('${schema}') AND typname =`,
    )
    .replace(
      /FROM\s+pg_constraint\s+WHERE\s+conname\s*=/gi,
      `FROM pg_constraint WHERE connamespace = to_regnamespace('${schema}') AND conname =`,
    )
}

function projectMigrations(root, schema, tempRoot) {
  const sourceRoot = path.join(root, "prisma")
  const targetRoot = path.join(tempRoot, schema, "prisma")
  const migrationsRoot = path.join(sourceRoot, "migrations")
  fs.mkdirSync(path.join(targetRoot, "migrations"), { recursive: true })
  fs.copyFileSync(path.join(sourceRoot, "schema.prisma"), path.join(targetRoot, "schema.prisma"))
  const lockFile = path.join(migrationsRoot, "migration_lock.toml")
  if (fs.existsSync(lockFile)) {
    fs.copyFileSync(lockFile, path.join(targetRoot, "migrations", "migration_lock.toml"))
  }
  const entries = []
  for (const directory of fs.readdirSync(migrationsRoot, { withFileTypes: true })) {
    if (!directory.isDirectory()) continue
    const source = path.join(migrationsRoot, directory.name, "migration.sql")
    if (!fs.existsSync(source)) continue
    const original = fs.readFileSync(source, "utf8")
    const projected = rewritePublicReferences(original, schema)
    if (/FROM\s+pg_type\s+WHERE\s+typname\s*=/i.test(projected)) {
      throw new Error(`Unscoped pg_type lookup remains in ${directory.name}`)
    }
    if (/FROM\s+pg_constraint\s+WHERE\s+conname\s*=/i.test(projected)) {
      throw new Error(`Unscoped pg_constraint lookup remains in ${directory.name}`)
    }
    const destinationDirectory = path.join(targetRoot, "migrations", directory.name)
    fs.mkdirSync(destinationDirectory, { recursive: true })
    fs.writeFileSync(path.join(destinationDirectory, "migration.sql"), projected)
    entries.push({
      migration: directory.name,
      sourceSha256: sha256(original),
      projectionSha256: sha256(projected),
      changed: original !== projected,
    })
  }
  entries.sort((left, right) => left.migration.localeCompare(right.migration))
  return { schemaPath: path.join(targetRoot, "schema.prisma"), entries }
}

function runMigrationProjection(root, urlValue, schemaPath) {
  const prismaCli = require.resolve("prisma/build/index.js")
  const result = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "deploy", "--schema", schemaPath],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: urlValue },
      encoding: "utf8",
      windowsHide: true,
    },
  )
  if (result.status !== 0) {
    const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
      .trim()
    throw new Error(`Schema-rebound migration replay failed: ${combined}`)
  }
  return { exitCode: result.status, command: "prisma migrate deploy --schema <temporary projection>" }
}

async function schemaFingerprint(urlValue, schema) {
  const client = new Client({ connectionString: urlValue })
  await client.connect()
  try {
    const columns = await client.query(
      `SELECT table_name, column_name, ordinal_position, data_type, udt_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = $1
       ORDER BY table_name, ordinal_position`,
      [schema],
    )
    const constraints = await client.query(
      `SELECT table_name, constraint_name, constraint_type
       FROM information_schema.table_constraints
       WHERE table_schema = $1
       ORDER BY table_name, constraint_name`,
      [schema],
    )
    const indexes = await client.query(
      "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = $1 ORDER BY tablename, indexname",
      [schema],
    )
    const canonical = JSON.stringify({
      columns: columns.rows,
      constraints: constraints.rows,
      indexes: indexes.rows,
    })
    return {
      sha256: sha256(canonical),
      columnCount: columns.rowCount,
      constraintCount: constraints.rowCount,
      indexCount: indexes.rowCount,
    }
  } finally {
    await client.end()
  }
}

function writeJson(directory, name, payload) {
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(directory, name), `${JSON.stringify(payload, null, 2)}\n`)
}

async function main() {
  const args = parseArgs(process.argv)
  const root = path.resolve(__dirname, "..")
  const targetSchema = required(args.targetSchema, "--target-schema")
  const restoreSchema = required(args.restoreSchema, "--restore-schema")
  assertSafeName(targetSchema, "target schema")
  assertSafeName(restoreSchema, "restore schema")
  if (targetSchema === restoreSchema) throw new Error("Target and restore schemas must differ")
  const targetUrl = resolveConnection(args, targetSchema)
  const restoreUrl = resolveConnection(args, restoreSchema)
  const evidenceDir = path.resolve(required(args.evidenceDir, "--evidence-dir"))
  const observedAt = new Date().toISOString()
  const targetBefore = await inspectSchema(targetUrl, targetSchema)
  const restoreBefore = await inspectSchema(restoreUrl, restoreSchema)
  const historyBefore = await migrationHistory(targetUrl, targetSchema)
  const verification = {
    observedAt,
    mode: args.mode,
    target: redactedTarget(targetUrl),
    targetBefore,
    restoreBefore,
    emptyTargetVerified: targetBefore.tableCount === 0,
    emptyRestoreVerified: restoreBefore.tableCount === 0,
    publicSchemaAccessed: false,
    realDataUsed: false,
  }
  writeJson(evidenceDir, "target-verification.json", verification)
  writeJson(evidenceDir, "migration-history-before.json", {
    observedAt,
    target: redactedTarget(targetUrl),
    migrations: historyBefore,
  })
  if (args.mode === "preflight") {
    if (!verification.emptyTargetVerified || !verification.emptyRestoreVerified) {
      throw new Error("Certification target or restore schema is not empty")
    }
    process.stdout.write("POS G0 database preflight passed.\n")
    return
  }
  if (!verification.emptyTargetVerified || !verification.emptyRestoreVerified) {
    throw new Error("Refusing migration replay because an approved schema is not empty")
  }

  await ensureSchema(restoreUrl, restoreSchema)
  await ensureSchema(targetUrl, targetSchema)
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stoquify-pos-g0-"))
  try {
    const restoreProjection = projectMigrations(root, restoreSchema, tempRoot)
    const restoreRun = runMigrationProjection(root, restoreUrl, restoreProjection.schemaPath)
    const restoreFingerprint = await schemaFingerprint(restoreUrl, restoreSchema)
    const targetProjection = projectMigrations(root, targetSchema, tempRoot)
    const targetRun = runMigrationProjection(root, targetUrl, targetProjection.schemaPath)
    const targetFingerprint = await schemaFingerprint(targetUrl, targetSchema)
    const historyAfter = await migrationHistory(targetUrl, targetSchema)
    const migrationCount = targetProjection.entries.length
    const finishedCount = historyAfter.filter((entry) => entry.finishedAt && !entry.rolledBackAt).length
    const fingerprintsMatch = restoreFingerprint.sha256 === targetFingerprint.sha256
    writeJson(evidenceDir, "schema-rebound-projection-manifest.json", {
      observedAt: new Date().toISOString(),
      sourceMigrationDirectory: "prisma/migrations",
      originalRepositoryMigrationsModified: false,
      publicSchemaAccessed: false,
      realDataUsed: false,
      restoreProjection: restoreProjection.entries,
      targetProjection: targetProjection.entries,
    })
    writeJson(evidenceDir, "restore-rehearsal-result.json", {
      observedAt: new Date().toISOString(),
      target: redactedTarget(restoreUrl),
      migrationRun: restoreRun,
      fingerprint: restoreFingerprint,
      comparedWithTarget: targetFingerprint,
      fingerprintsMatch,
    })
    writeJson(evidenceDir, "migration-history-after.json", {
      observedAt: new Date().toISOString(),
      target: redactedTarget(targetUrl),
      migrationRun: targetRun,
      expectedMigrationCount: migrationCount,
      finishedMigrationCount: finishedCount,
      fingerprint: targetFingerprint,
      restoreFingerprint,
      fingerprintsMatch,
      migrations: historyAfter,
    })
    if (finishedCount !== migrationCount || !fingerprintsMatch) {
      throw new Error("Migration history or restore fingerprint did not certify")
    }
    process.stdout.write(`POS G0 schema-rebound replay passed (${finishedCount} migrations).\n`)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}

module.exports = {
  parseArgs,
  redactedTarget,
  rewritePublicReferences,
}
