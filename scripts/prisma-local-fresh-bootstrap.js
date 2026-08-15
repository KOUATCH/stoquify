#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const dotenv = require("dotenv")
const { Client } = require("pg")

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])
const SAFE_DATABASE_NAME = /^stoquify_local_[a-z0-9_]+$/

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || argv[0] !== "--database" || !argv[1]) {
    throw new Error(
      "Usage: node scripts/prisma-local-fresh-bootstrap.js --database stoquify_local_<name>",
    )
  }
  return { databaseName: argv[1] }
}

function loadDatabaseUrl(env = process.env, envPath = path.join(process.cwd(), ".env")) {
  const dotenvValues = fs.existsSync(envPath)
    ? dotenv.parse(fs.readFileSync(envPath))
    : {}
  const values = { ...dotenvValues, ...env }
  const configured = values.DATABASE_URL?.trim()
  if (!configured) throw new Error("DATABASE_URL is required")
  return configured.replace(/\$\{([^}]+)\}/g, (_match, key) => values[key] || "")
}

function resolveTarget({ databaseName, sourceUrl, nodeEnv = process.env.NODE_ENV }) {
  if (nodeEnv === "production") {
    throw new Error("Refusing local bootstrap while NODE_ENV=production")
  }
  if (!SAFE_DATABASE_NAME.test(databaseName)) {
    throw new Error("Database name must match stoquify_local_[a-z0-9_]+")
  }

  const target = new URL(sourceUrl)
  if (!["postgres:", "postgresql:"].includes(target.protocol)) {
    throw new Error("Local bootstrap requires PostgreSQL")
  }
  if (!LOCAL_HOSTS.has(target.hostname.toLowerCase())) {
    throw new Error("Refusing to bootstrap a non-local database")
  }

  target.pathname = `/${databaseName}`
  return target
}

async function createNewDatabase(target, databaseName) {
  const admin = new URL(target)
  admin.pathname = "/postgres"
  const client = new Client({ connectionString: admin.toString() })
  await client.connect()
  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    )
    if (existing.rowCount) {
      throw new Error(`Refusing to overwrite existing database ${databaseName}`)
    }
    await client.query(`CREATE DATABASE "${databaseName}"`)
  } finally {
    await client.end()
  }
}

function deployMigrations(target) {
  const prismaCli = path.join(
    process.cwd(),
    "node_modules",
    "prisma",
    "build",
    "index.js",
  )
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: target.toString() },
    stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`prisma migrate deploy exited with code ${result.status ?? 1}`)
  }
}

async function main() {
  const { databaseName } = parseArgs()
  const target = resolveTarget({ databaseName, sourceUrl: loadDatabaseUrl() })
  await createNewDatabase(target, databaseName)
  console.log(`Created fresh local database ${databaseName}`)
  deployMigrations(target)
  console.log(`Local migration bootstrap complete for ${databaseName}`)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}

module.exports = {
  loadDatabaseUrl,
  parseArgs,
  resolveTarget,
}
