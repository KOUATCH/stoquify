// AF07: fresh synthetic database only; never reset/reuse an existing target.
const fs = require("node:fs"), path = require("node:path"), { Client } = require("pg")
const { spawnSync } = require("node:child_process")
async function main() {
  if (process.env.NODE_ENV === "production") throw Error("Production forbidden")
  const cluster = process.env.AF07_CLUSTER_DIR, output = process.env.AF07_EVIDENCE_DIR, url = process.env.AF07_POSTGRES_URL
  if (!cluster || !path.isAbsolute(cluster) || !output || !path.isAbsolute(output) || !url)
    throw Error("Explicit AF07 target, absolute cluster and fresh evidence directory required")
  const target = new URL(url)
  if (target.protocol !== "postgresql:" || target.hostname !== "127.0.0.1" || !target.port || target.search || target.hash
    || !/^\/stoquify_local_af07_[a-z0-9_]+$/.test(target.pathname)) throw Error("Wrong AF07 target")
  const name = target.pathname.slice(1), root = path.resolve(__dirname, "../..")
  // Review candidates contain no environment files. Do not load shared app configuration.
  if (fs.readdirSync(root).some(file => file.startsWith(".env"))) throw Error("Use an environment-free source candidate")
  const log = fs.openSync(path.join(output, "migrate.log"), "wx")
  target.pathname = "/postgres"
  const admin = new Client({ connectionString: target.href, connectionTimeoutMillis: 5000 })
  try {
  await admin.connect()
  try {
    const actual = (await admin.query("SHOW data_directory")).rows[0].data_directory
    if (fs.realpathSync(actual).toLowerCase() !== fs.realpathSync(cluster).toLowerCase()) throw Error("Wrong cluster")
    if ((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [name])).rowCount) throw Error("Refusing existing database")
    await admin.query(`CREATE DATABASE "${name}"`)
  } finally { await admin.end() }
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE)$/i.test(key)))
  const result = spawnSync(process.execPath, [path.join(root, "node_modules/prisma/build/index.js"), "migrate", "deploy"], {
    cwd: root, env: { ...env, NODE_ENV: "test", CHECKPOINT_DISABLE: "1", DATABASE_URL: url, DIRECT_URL: url, SHADOW_DATABASE_URL: url,
      NODE_OPTIONS: "--require " + JSON.stringify(path.join(root, "scripts/local-gates-network.cjs")) },
    windowsHide: true, stdio: ["ignore", log, log], timeout: 240000,
  })
  if (result.status !== 0) throw Error("Migration failed; see retained log")
  console.log("Created and migrated the guarded synthetic AF07 database.")
  } finally { fs.closeSync(log) }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1 })
module.exports = { main }
