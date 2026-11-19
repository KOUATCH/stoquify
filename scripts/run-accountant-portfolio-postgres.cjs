// AF01 only: creates a new database on an explicitly owned loopback cluster.
// Never resets, drops, reuses or derives a target from application configuration.
const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const { Client } = require("pg")

async function main() {
  const cluster = process.env.AF01_CLUSTER_DIR
  const name = process.argv[2]
  if (!cluster || !path.isAbsolute(cluster) || path.basename(cluster) !== "af01-postgres" ||
      !/^stoquify_local_af01_[a-z0-9_]+$/.test(name || "") || process.env.NODE_ENV === "production") {
    throw new Error("Explicit owned AF01 cluster and fresh database name required.")
  }
  const output = path.resolve("docs/accounting-firms/roadmap-2026-10-19/execution/AF01/2026-10-19-run-01")
  const url = `postgresql://af01@127.0.0.1:55441/${name}?schema=public&connection_limit=5&connect_timeout=5`
  const admin = new Client({ connectionString: "postgresql://af01@127.0.0.1:55441/postgres", connectionTimeoutMillis: 5000 })
  try {
    await admin.connect()
    const actual = (await admin.query("SHOW data_directory")).rows[0].data_directory
    if (fs.realpathSync(actual).toLowerCase() !== fs.realpathSync(cluster).toLowerCase()) throw new Error("Cluster identity mismatch")
    if ((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [name])).rowCount) throw new Error("Refusing existing database")
    await admin.query(`CREATE DATABASE "${name}"`)
    fs.writeFileSync(path.join(output, name + "-target.json"), JSON.stringify({
      database: name, host: "127.0.0.1", port: 55441, clusterOwnedByThisRun: true,
      server: (await admin.query("SELECT version() AS version")).rows[0].version,
      applicationDatabaseChanged: false,
    }, null, 2), { flag: "wx" })
  } finally { await admin.end() }
  const env = { ...process.env, NODE_ENV: "test", DATABASE_URL: url, DIRECT_URL: url,
    SHADOW_DATABASE_URL: url, AF01_POSTGRES_URL: url, RUN_AF01_POSTGRES: "1", AF01_EVIDENCE_DIR: output }
  const run = (entry, args, label, timeout) => {
    const result = spawnSync(process.execPath, [entry, ...args], { env, windowsHide: true, encoding: "utf8", timeout, maxBuffer: 20e6 })
    const log = ((result.stdout || "") + (result.stderr || "")).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, "[ISOLATED_DATABASE_URL]")
    fs.writeFileSync(path.join(output, name + "-" + label + ".log"), log, { flag: "wx" })
    console.log(log.slice(-3000))
    if (result.status !== 0) throw new Error(label + " failed; inspect retained evidence. No database reset attempted.")
  }
  run("node_modules/prisma/build/index.js", ["migrate", "deploy"], "migrations", 240000)
  run("node_modules/jest/bin/jest.js", ["--config", "jest.accountant-portfolio-postgres.config.cjs", "--runInBand", "--no-cache",
    "--json", "--outputFile", path.join(output, name + "-tests.json")], "tests", 240000)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
