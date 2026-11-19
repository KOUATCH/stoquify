// AF10: fresh synthetic database only; never reset/reuse an existing target.
const fs = require("node:fs"), path = require("node:path"), { Client } = require("pg")
const { spawnSync } = require("node:child_process")
const cluster = "C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993/af01-host/af01-postgres"
const name = "stoquify_local_af10_20261020_r1"
const url = `postgresql://af01@127.0.0.1:55449/${name}`
const output = "docs/accounting-firms/roadmap-2026-10-19/execution/AF10/2026-10-20-run-01"
async function main() {
  if (process.env.NODE_ENV === "production") throw Error("Production forbidden")
  const admin = new Client({ connectionString: "postgresql://af01@127.0.0.1:55449/postgres", connectionTimeoutMillis: 5000 })
  await admin.connect()
  try {
    const actual = (await admin.query("SHOW data_directory")).rows[0].data_directory
    if (fs.realpathSync(actual).toLowerCase() !== fs.realpathSync(cluster).toLowerCase()) throw Error("Wrong cluster")
    if ((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [name])).rowCount) throw Error("Refusing existing database")
    await admin.query(`CREATE DATABASE "${name}"`)
  } finally { await admin.end() }
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", ".codex-tmp/af10-prisma/prisma.config.ts"], {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url },
    windowsHide: true, encoding: "utf8", timeout: 240000,
  })
  fs.writeFileSync(path.join(output, "migrate.log"), result.stdout + result.stderr)
  if (result.status !== 0) throw Error("Migration failed; see retained log")
  console.log("Created and migrated the guarded synthetic AF10 database.")
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
