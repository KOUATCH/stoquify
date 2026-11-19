// Additive upgrade on a new clone of the retained synthetic AF12 database.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict")
const { Client } = require("pg"), { spawnSync } = require("node:child_process")
const cluster = "C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993/af13-postgres"
const name = "stoquify_local_af13_upgrade_20261025_r1", template = "stoquify_local_af13_baseline_20261025_r1"
const url = `postgresql://af01@127.0.0.1:55450/${name}`
const output = "docs/accounting-firms/roadmap-2026-10-19/execution/AF13/2026-10-25-run-03"
async function snapshot(client) {
  const result = {}
  for (const table of ["journal_entries", "journal_entry_lines", "inventory_transactions", "inventory_levels", "customer_ledger_entries", "customer_receivable_documents", "supplier_ledger_entries", "customers", "suppliers", "firm_advisory_revisions"]) {
    result[table] = (await client.query(`SELECT count(*)::integer AS count, md5(coalesce(string_agg(md5((to_jsonb(t) - 'openingRevisionId' - 'openingSourceId')::text), '' ORDER BY id), '')) AS digest FROM "${table}" t`)).rows[0]
  }
  return result
}
async function main() {
  if (process.env.NODE_ENV === "production") throw Error("Production forbidden")
  const admin = new Client({ connectionString: "postgresql://af01@127.0.0.1:55450/postgres" })
  await admin.connect()
  try {
    const actual = (await admin.query("SHOW data_directory")).rows[0].data_directory
    assert.equal(fs.realpathSync(actual).toLowerCase(), fs.realpathSync(cluster).toLowerCase())
    assert.equal((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [name])).rowCount, 0, "Refuse existing target")
    assert.equal((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [template])).rowCount, 1, "Retained synthetic AF12 template required")
    await admin.query(`CREATE DATABASE "${name}" TEMPLATE "${template}"`)
  } finally { await admin.end() }
  const client = new Client({ connectionString: url }); await client.connect()
  try {
    const before = await snapshot(client)
    assert.ok(before.journal_entries.count > 0, "Populated synthetic ledger required")
    const migrationsBefore = (await client.query('SELECT count(*)::integer AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')).rows[0].n
    assert.equal(migrationsBefore, 118)
    for (const label of ["upgrade", "upgrade-replay"]) {
      const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", ".codex-tmp/af13-prisma/prisma.config.ts"], {
        env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url }, windowsHide: true, encoding: "utf8", timeout: 240000,
      })
      fs.writeFileSync(path.join(output, label + ".log"), result.stdout + result.stderr)
      assert.equal(result.status, 0, label)
    }
    const after = await snapshot(client)
    assert.deepEqual(after, before)
    const migrationsAfter = (await client.query('SELECT count(*)::integer AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')).rows[0].n
    assert.equal(migrationsAfter, fs.readdirSync("prisma/migrations",{withFileTypes:true}).filter(e=>e.isDirectory() && fs.existsSync(path.join("prisma/migrations",e.name,"migration.sql"))).length)
    assert.equal((await client.query('SELECT count(*)::integer AS n FROM firm_practice_revisions')).rows[0].n, 0)
    fs.writeFileSync(path.join(output, "upgrade-verification.json"), JSON.stringify({ name, template, migrationsBefore, migrationsAfter, before, after, equal: true, replayPassed: true }, null, 2))
    console.log("Populated baseline to current migrations and replay passed; all ten operational/advisory table counts and row digests unchanged.")
  } finally { await client.end() }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1 })
