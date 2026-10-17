const fs = require("fs"), path = require("path"), crypto = require("crypto")
const { spawnSync } = require("child_process")
const { parse } = require("pg-connection-string")
const dotenv = require("dotenv")
const root = process.cwd()
const { runRestoreRehearsal } = require(path.join(root, "scripts/prisma-local-restore-rehearsal.js"))
const { createNewDatabase } = require(path.join(root, "scripts/prisma-local-fresh-bootstrap.js"))
for (const file of [".env.local", ".env"]) if (fs.existsSync(file)) dotenv.config({ path: file, quiet: true })
const hash = value => crypto.createHash("sha256").update(value).digest("hex")
const databaseName = "stoquify_restore_local_remediation_20260930_run01"
const evidence = { startedAt: new Date().toISOString(), status: "NOT_STARTED", databaseName, databaseCreatedByThisRun: false,
  databaseRetained: false, stages: [], sourceMutationAttempted: false,
  command: "node what-next/platform-remediation/2026-09-30-run-01/data-impact/restore/run-restore.cjs",
  underlyingModule: "scripts/prisma-local-restore-rehearsal.js", underlyingModuleSha256: hash(fs.readFileSync("scripts/prisma-local-restore-rehearsal.js")) }

async function run() {
  const started = Date.now()
  try {
    const raw = process.env.DATABASE_URL || process.env.DIRECT_URL
    if (!raw) throw new Error("CONNECTION_CONFIGURATION_MISSING")
    const source = raw.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => process.env[key] || "").replace(/^['"]|['"]$/g, "").trim()
    const url = new URL(source), parsed = parse(source)
    const normalized = host => String(host || "").toLowerCase().replace(/^\[|\]$/g, "")
    const local = host => ["localhost", "127.0.0.1", "::1"].includes(normalized(host))
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !local(url.hostname) || !local(parsed.host) ||
        (url.searchParams.has("hostaddr") && !local(url.searchParams.get("hostaddr")))) throw new Error("NON_LOOPBACK_SOURCE_REFUSED")
    // The restore tool uses URL parts for libpq; reject overrides that would change its effective target.
    if (normalized(url.hostname) !== normalized(parsed.host) || (url.port || "5432") !== (parsed.port || "5432") ||
        decodeURIComponent(url.pathname.slice(1)) !== parsed.database || decodeURIComponent(url.username) !== parsed.user ||
        decodeURIComponent(url.password) !== parsed.password) throw new Error("AMBIGUOUS_CONNECTION_PARAMETERS_REFUSED")
    const fingerprint = hash(`${normalized(parsed.host)}:${parsed.port || "5432"}/${parsed.database || ""}`)
    const impact = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "aggregate-impact.json"), "utf8"))
    if (impact.status !== "READ_ONLY_SCAN_COMPLETE" || impact.targetFingerprint !== fingerprint) throw new Error("SOURCE_DOES_NOT_MATCH_VERIFIED_IMPACT_SCAN")
    evidence.sourceFingerprint = fingerprint
    const options = { root, databaseName, retainDatabase: true, pgBin: "C:\\Program Files\\PostgreSQL\\17\\bin",
      out: "what-next/platform-remediation/2026-09-30-run-01/data-impact/restore/restore-rehearsal.md",
      jsonOut: "what-next/platform-remediation/2026-09-30-run-01/data-impact/restore/restore-rehearsal.json" }
    const report = await runRestoreRehearsal(options, {
      loadDatabaseUrl: () => source,
      createNewDatabase: async (target, name) => {
        if (name !== databaseName || !/^stoquify_restore_local_[a-z0-9_]+$/.test(name)) throw new Error("RESTORE_TARGET_REFUSED")
        await createNewDatabase(target, name)
        evidence.databaseCreatedByThisRun = true
        evidence.databaseRetained = true
        evidence.stages.push({ stage: "create_new_restore_database", completedAt: new Date().toISOString(), noOverwriteGuard: true })
      },
      runBinary: (command, args, options, label) => {
        const stageStarted = Date.now()
        if (!["pg_dump", "pg_restore"].includes(label)) throw new Error("UNEXPECTED_RESTORE_BINARY")
        const env = { ...options.env }
        delete env.PGHOSTADDR
        delete env.PGSERVICE
        delete env.PGSERVICEFILE
        // Source dump is enforced read-only; restore writes only the newly created target.
        env.PGOPTIONS = label === "pg_dump"
          ? "-c default_transaction_read_only=on -c statement_timeout=120000 -c lock_timeout=5000"
          : "-c statement_timeout=120000 -c lock_timeout=5000"
        const child = spawnSync(command, args, { cwd: options.cwd, env, encoding: "utf8", maxBuffer: 50 * 1024 * 1024,
          shell: false, windowsHide: true, timeout: 180_000 })
        evidence.stages.push({ stage: label, completedAt: new Date().toISOString(), elapsedMs: Date.now() - stageStarted,
          exitCode: child.status, errorCode: child.error?.code, sourceReadOnlyEnforced: label === "pg_dump" })
        if (child.error || child.status !== 0) throw new Error(`${label.toUpperCase()}_FAILED`)
        return child
      },
    })
    evidence.status = report.ready ? "RESTORE_REHEARSAL_READY" : "RESTORE_REHEARSAL_BLOCKED"
    evidence.report = { ready: report.ready, migrations: `${report.history.completedCount}/${report.history.repositoryCount}`,
      schemaDiffPreserved: report.schemaDiff.match, profilePreserved: report.dataProfile.match, migrateStatusReady: report.migrateStatus.ready,
      dumpBytes: report.backup.byteLength, temporaryDumpRetained: report.backup.temporaryDumpRetained }
    if (!report.ready) process.exitCode = 1
  } catch (error) {
    evidence.status = "RESTORE_REHEARSAL_BLOCKED"
    evidence.errorCode = /^[A-Z0-9_]+$/.test(error.message || "") ? error.message : error.code || "RESTORE_STAGE_ERROR"
    process.exitCode = 1
  } finally {
    evidence.completedAt = new Date().toISOString()
    evidence.elapsedMs = Date.now() - started
    fs.writeFileSync(path.join(__dirname, "execution.json"), JSON.stringify(evidence, null, 2) + "\n")
    console.log(JSON.stringify(evidence, null, 2))
  }
}
run().catch(() => { process.exitCode = 1 })
