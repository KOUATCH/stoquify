#!/usr/bin/env node

const crypto = require("crypto")
const fs = require("fs")
const os = require("os")
const path = require("path")
const { spawnSync } = require("child_process")
const { Client } = require("pg")
const {
  createNewDatabase,
  loadDatabaseUrl,
} = require("./prisma-local-fresh-bootstrap")
const {
  buildMigrationHistoryHealth,
  queryHistoryRows,
} = require("./prisma-migration-history-health-check")

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])
const SAFE_RESTORE_DATABASE = /^stoquify_restore_[a-z0-9_]+$/
const PROFILE_TABLES = [
  "organizations",
  "users",
  "accounts",
  "sessions",
  "chart_of_accounts",
  "journals",
  "journal_entries",
  "fiscal_years",
  "accounting_periods",
]

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    databaseName: null,
    out: "what-next/migrations/local-restore-rehearsal.md",
    jsonOut: "what-next/migrations/local-restore-rehearsal.json",
    pgBin: process.env.AQSTOQFLOW_PG_BIN || "C:\\Program Files\\PostgreSQL\\17\\bin",
    retainDatabase: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--root") options.root = path.resolve(argv[++index])
    else if (value === "--database") options.databaseName = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else if (value === "--pg-bin") options.pgBin = path.resolve(argv[++index])
    else if (value === "--retain-database") options.retainDatabase = true
    else throw new Error(`Unknown argument: ${value}`)
  }
  if (!options.databaseName) throw new Error("--database is required")
  if (!SAFE_RESTORE_DATABASE.test(options.databaseName)) {
    throw new Error("Restore database name must match stoquify_restore_[a-z0-9_]+")
  }
  return options
}

function requireLocalSource(sourceUrl, nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv === "production") {
    throw new Error("Refusing local restore rehearsal while NODE_ENV=production")
  }
  const parsed = new URL(sourceUrl)
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Local restore rehearsal requires PostgreSQL")
  }
  if (!LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("Local restore rehearsal refuses a non-local source database")
  }
  return parsed
}

function targetFor(source, databaseName) {
  const target = new URL(source)
  target.pathname = `/${databaseName}`
  return target
}

function databaseFingerprint(url) {
  return crypto
    .createHash("sha256")
    .update(`${url.protocol}//${url.hostname}:${url.port || "default"}${url.pathname}`)
    .digest("hex")
    .slice(0, 12)
}

function pgEnvironment(url, environment = process.env) {
  const result = {
    ...environment,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")),
  }
  const sslMode = url.searchParams.get("sslmode")
  if (sslMode) result.PGSSLMODE = sslMode
  return result
}

function binaryPath(pgBin, name) {
  const suffix = process.platform === "win32" ? ".exe" : ""
  const candidate = path.join(pgBin, `${name}${suffix}`)
  if (!fs.existsSync(candidate)) throw new Error(`${name} was not found in the configured PostgreSQL bin directory`)
  return candidate
}

function runBinary(command, args, options, label) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    shell: false,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const diagnostic = `${result.stderr || ""}\n${result.stdout || ""}`
      .replace(/\b(?:postgres(?:ql)?|https?):\/\/\S+/gi, "[REDACTED_URL]")
      .replace(/\b(password|secret|token)(\s*[:=]\s*)\S+/gi, "$1$2[REDACTED]")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-8)
      .join(" | ")
    throw new Error(
      `${label} failed with exit code ${result.status ?? 1}${diagnostic ? `: ${diagnostic}` : ""}`,
    )
  }
  return result
}

async function profileDatabase(databaseUrl, tables = PROFILE_TABLES) {
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    const profile = []
    for (const table of tables) {
      const exists = await client.query("SELECT to_regclass($1) IS NOT NULL AS present", [
        `public.${table}`,
      ])
      const present = Boolean(exists.rows[0]?.present)
      let rowCount = null
      if (present) {
        const count = await client.query(`SELECT COUNT(*)::text AS count FROM "${table}"`)
        rowCount = count.rows[0]?.count ?? "0"
      }
      profile.push({ table, present, rowCount })
    }
    return profile
  } finally {
    await client.end()
  }
}

async function dropRestoreDatabase(target, databaseName) {
  if (!SAFE_RESTORE_DATABASE.test(databaseName)) {
    throw new Error("Refusing to drop a database outside the restore-only namespace")
  }
  const admin = new URL(target)
  admin.pathname = "/postgres"
  const client = new Client({ connectionString: admin.toString() })
  await client.connect()
  try {
    const existing = await client.query(
      "SELECT datname FROM pg_database WHERE datname = $1",
      [databaseName],
    )
    if (existing.rowCount !== 1) {
      throw new Error("Restore cleanup target does not exist or is ambiguous")
    }
    await client.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`)
  } finally {
    await client.end()
  }
}

function profilesMatch(source, restored) {
  return JSON.stringify(source) === JSON.stringify(restored)
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

function runSchemaDiff(root, databaseUrl, runner = spawnSync) {
  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js")
  const schema = path.join(root, "prisma", "schema.prisma")
  const result = runner(
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
      shell: false,
    },
  )
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error("Prisma schema diff failed")
  return (result.stdout || "").replace(/\r\n/g, "\n")
}

function renderMarkdown(report) {
  return [
    "# Local PostgreSQL Restore Rehearsal",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: \`${report.status}\``,
    "",
    "## Scope",
    "",
    `- Source: \`${report.source.databaseRef}\` (local, populated)` ,
    `- Restore database: \`${report.restore.databaseName}\``,
    `- Restore database retained for inspection: ${report.restore.databaseRetained ? "yes" : "no"}`,
    `- Temporary dump retained: ${report.backup.temporaryDumpRetained ? "yes" : "no"}`,
    `- Secrets retained or printed: no`,
    "",
    "## Verification",
    "",
    `- Backup created: ${report.backup.created ? "yes" : "no"}`,
    `- Backup bytes: ${report.backup.byteLength}`,
    `- Backup SHA-256 recorded: ${report.backup.sha256 ? "yes" : "no"}`,
    `- History ready: ${report.history.ready ? "yes" : "no"}`,
    `- Applied migrations: ${report.history.completedCount}/${report.history.repositoryCount}`,
    `- Schema-diff fingerprint preserved: ${report.schemaDiff.match ? "yes" : "no"}`,
    `- Auth/accounting table profile preserved: ${report.dataProfile.match ? "yes" : "no"}`,
    `- Source profile proves populated data: ${report.dataProfile.sourcePopulated ? "yes" : "no"}`,
    `- Prisma migration status ready: ${report.migrateStatus.ready ? "yes" : "no"}`,
    "",
    "## Safety",
    "",
    "- The source database was queried and dumped read-only.",
    "- The rehearsal created a new restore-only local database and did not overwrite an existing database.",
    "- No migration, resolve, reset, drop, seed, or data mutation ran against the source.",
    "- This is recovery and structural-integrity evidence, not a functional login or accounting certification.",
    "",
  ].join("\n")
}

async function runRestoreRehearsal(options, dependencies = {}) {
  const root = path.resolve(options.root)
  const sourceUrlValue = (dependencies.loadDatabaseUrl || loadDatabaseUrl)()
  const source = requireLocalSource(sourceUrlValue, dependencies.nodeEnv)
  const target = targetFor(source, options.databaseName)
  const create = dependencies.createNewDatabase || createNewDatabase
  const profile = dependencies.profileDatabase || profileDatabase
  const queryHistory = dependencies.queryHistoryRows || queryHistoryRows
  const schemaDiff = dependencies.runSchemaDiff || runSchemaDiff
  const runner = dependencies.runBinary || runBinary
  const dropRestore = dependencies.dropRestoreDatabase || dropRestoreDatabase
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stoquify-migration-restore-"))
  const dumpPath = path.join(tempRoot, "source.dump")
  let backup = { created: false, byteLength: 0, sha256: null, temporaryDumpRetained: false }
  let databaseCreated = false

  try {
    const sourceProfile = await profile(source.toString())
    const pgDump = binaryPath(options.pgBin, "pg_dump")
    runner(
      pgDump,
      ["--format=custom", "--no-owner", "--no-privileges", `--file=${dumpPath}`],
      { cwd: root, env: pgEnvironment(source) },
      "pg_dump",
    )
    const stat = fs.statSync(dumpPath)
    backup = {
      created: stat.size > 0,
      byteLength: stat.size,
      sha256: sha256File(dumpPath),
      temporaryDumpRetained: false,
    }

    await create(target, options.databaseName)
    databaseCreated = true
    const pgRestore = binaryPath(options.pgBin, "pg_restore")
    runner(
      pgRestore,
      [
        "--exit-on-error",
        "--no-owner",
        "--no-privileges",
        `--dbname=${options.databaseName}`,
        dumpPath,
      ],
      { cwd: root, env: pgEnvironment(target) },
      "pg_restore",
    )

    const restoredProfile = await profile(target.toString())
    const query = await queryHistory(target.toString())
    const history = buildMigrationHistoryHealth(root, {
      mode: "fail",
      databaseUrl: target.toString(),
      rows: query.rows,
      querySucceeded: query.succeeded,
      queryErrorCode: query.errorCode,
    })
    const sourceDiff = schemaDiff(root, source.toString())
    const restoredDiff = schemaDiff(root, target.toString())
    const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js")
    const status = spawnSync(process.execPath, [prismaCli, "migrate", "status"], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: target.toString() },
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      shell: false,
    })
    const sourcePopulated = sourceProfile.some(
      (item) => item.present && item.rowCount !== null && BigInt(item.rowCount) > 0n,
    )
    let cleanupReady = true
    if (!options.retainDatabase) {
      try {
        await dropRestore(target, options.databaseName)
      } catch (_error) {
        cleanupReady = false
      }
    }
    const ready =
      backup.created &&
      history.summary.status === "ready" &&
      profilesMatch(sourceProfile, restoredProfile) &&
      sourceDiff === restoredDiff &&
      !status.error &&
      status.status === 0 &&
      cleanupReady
    const report = {
      generatedAt: new Date().toISOString(),
      status: ready ? "READY" : "BLOCKED",
      ready,
      source: {
        databaseRef: `db-${databaseFingerprint(source)}`,
        targetClass: "local",
        databaseNameRetained: false,
      },
      backup,
      restore: {
        databaseName: options.databaseName,
        databaseCreated,
        databaseRetained: options.retainDatabase,
        cleanupReady,
      },
      history: {
        ready: history.summary.status === "ready",
        repositoryCount: history.summary.repositoryMigrationCount,
        completedCount: history.summary.completedRowCount,
        blockerCount: history.blockers.length,
      },
      schemaDiff: {
        match: sourceDiff === restoredDiff,
        sourceSha256: crypto.createHash("sha256").update(sourceDiff).digest("hex"),
        restoredSha256: crypto.createHash("sha256").update(restoredDiff).digest("hex"),
      },
      dataProfile: {
        match: profilesMatch(sourceProfile, restoredProfile),
        sourcePopulated,
        source: sourceProfile,
        restored: restoredProfile,
      },
      migrateStatus: {
        ready: !status.error && status.status === 0,
        exitCode: status.status ?? 1,
      },
      safety: {
        sourceMutationAttempted: false,
        resolveAttempted: false,
        resetAttempted: false,
        secretsRetained: false,
      },
    }
    fs.mkdirSync(path.dirname(path.resolve(root, options.out)), { recursive: true })
    fs.mkdirSync(path.dirname(path.resolve(root, options.jsonOut)), { recursive: true })
    fs.writeFileSync(path.resolve(root, options.out), renderMarkdown(report), "utf8")
    fs.writeFileSync(path.resolve(root, options.jsonOut), JSON.stringify(report, null, 2) + "\n", "utf8")
    return report
  } finally {
    const resolvedTemp = path.resolve(tempRoot)
    const resolvedSystemTemp = path.resolve(os.tmpdir())
    if (
      resolvedTemp.startsWith(resolvedSystemTemp + path.sep) &&
      path.basename(resolvedTemp).startsWith("stoquify-migration-restore-")
    ) {
      fs.rmSync(resolvedTemp, { recursive: true, force: true })
    }
  }
}

async function main() {
  const options = parseArgs()
  const report = await runRestoreRehearsal(options)
  process.stdout.write(
    JSON.stringify({
      status: report.status,
      ready: report.ready,
      source: report.source.databaseRef,
      restoreDatabase: report.restore.databaseName,
      appliedMigrations: report.history.completedCount,
      profileMatch: report.dataProfile.match,
      schemaDiffMatch: report.schemaDiff.match,
      secretValuePrinted: false,
    }) + "\n",
  )
  if (!report.ready) process.exitCode = 1
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}

module.exports = {
  databaseFingerprint,
  dropRestoreDatabase,
  parseArgs,
  pgEnvironment,
  profilesMatch,
  requireLocalSource,
  runRestoreRehearsal,
  targetFor,
}
