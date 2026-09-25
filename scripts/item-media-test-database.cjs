// Create an isolated schema-only local test database. Never copies business rows.
const { loadEnvConfig } = require("@next/env")
const { Pool } = require("pg")
const { spawnSync } = require("node:child_process")
const { readFileSync } = require("node:fs")
loadEnvConfig(process.cwd())
async function main() {
  const source = new URL(process.env.DATABASE_URL)
  if (!["localhost", "127.0.0.1"].includes(source.hostname)) throw Error("Only a local source database is allowed")
  const testName = "stoquify_item_media_test_20260919"
  const pgEnv = { ...process.env, PGHOST: source.hostname, PGPORT: source.port || "5432", PGUSER: decodeURIComponent(source.username), PGPASSWORD: decodeURIComponent(source.password), PGDATABASE: source.pathname.slice(1) }
  const sourcePool = new Pool({connectionString:source.toString()})
  const exists = await sourcePool.query("SELECT 1 FROM pg_database WHERE datname=$1",[testName])
  if (!exists.rowCount) {
    await sourcePool.query('CREATE DATABASE "' + testName + '"')
    const dump = spawnSync("C:/Program Files/PostgreSQL/17/bin/pg_dump.exe",["--schema-only","--no-owner","--no-privileges"],{env:pgEnv,maxBuffer:100*1024*1024})
    if (dump.status !== 0) throw Error("Schema-only dump failed")
    const restore = spawnSync("C:/Program Files/PostgreSQL/17/bin/psql.exe",["-v","ON_ERROR_STOP=1","-q"],{env:{...pgEnv,PGDATABASE:testName},input:dump.stdout,maxBuffer:100*1024*1024})
    if (restore.status !== 0) throw Error("Test schema restore failed: " + restore.stderr.toString().slice(-1000))
  }
  await sourcePool.end()
  const target = new URL(source); target.pathname = "/" + testName
  const pool = new Pool({connectionString:target.toString()})
  const table=await pool.query("SELECT to_regclass('public.picture_assets') AS name")
  if (!table.rows[0].name) await pool.query(readFileSync("prisma/migrations/20260919110000_managed_picture_assets/migration.sql","utf8"))
  // Only this disposable fixture database may contain an earlier draft table.
  await pool.query('ALTER TABLE "picture_assets" ADD COLUMN IF NOT EXISTS "providerUrl" TEXT, ADD COLUMN IF NOT EXISTS "encryptionKey" TEXT NOT NULL DEFAULT \'\', ADD COLUMN IF NOT EXISTS "encryptionIv" TEXT NOT NULL DEFAULT \'\', ADD COLUMN IF NOT EXISTS "encryptionTag" TEXT NOT NULL DEFAULT \'\'')
  await pool.end()
  console.log("Isolated media test schema ready; no business rows copied.")
  if (process.argv.includes("--browser")) {
    const result=spawnSync(process.execPath,["node_modules/@playwright/test/cli.js","test","--config=playwright.inventory-items.config.ts","--workers=1",...(process.argv.includes("--media-only")?["item-media-create.spec.ts"]:[])],{
      stdio:"inherit", env:{...process.env,DATABASE_URL:target.toString(),DIRECT_URL:target.toString(),NEXTAUTH_URL:"http://127.0.0.1:3119",NEXT_PUBLIC_BASE_URL:"http://127.0.0.1:3119",NEXT_DIST_DIR:".next-item-media-test",PLAYWRIGHT_PORT:"3119",PLAYWRIGHT_BASE_URL:"http://127.0.0.1:3119",PLAYWRIGHT_READINESS_PATH:"/api/auth/get-session"},
    })
    process.exitCode=result.status ?? 1
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
