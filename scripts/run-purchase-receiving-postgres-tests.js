#!/usr/bin/env node

const path = require("node:path")
const fs = require("node:fs")
const { spawnSync } = require("node:child_process")
const { Client } = require("pg")
const { readDotenvValue } = require("./with-payroll-immutability-test-db")

const CERTIFICATION_SCHEMA = "codex_purchase_receiving_cert_20260818"
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

function certificationUrls(env = process.env) {
  const rawUrl = env.DATABASE_URL || readDotenvValue("DATABASE_URL")
  if (!rawUrl) throw new Error("A local DATABASE_URL is required for PostgreSQL certification.")

  const adminUrl = new URL(rawUrl)
  if (!LOCAL_HOSTS.has(adminUrl.hostname.toLowerCase())) {
    throw new Error("Refusing purchase receiving certification against a non-local PostgreSQL host.")
  }
  adminUrl.searchParams.delete("schema")

  const testUrl = new URL(adminUrl.toString())
  testUrl.searchParams.set("schema", CERTIFICATION_SCHEMA)
  return { adminUrl: adminUrl.toString(), testUrl: testUrl.toString() }
}

async function resetCertificationSchema(connectionString) {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${CERTIFICATION_SCHEMA}" CASCADE`)
    await client.query(`CREATE SCHEMA "${CERTIFICATION_SCHEMA}"`)
  } finally {
    await client.end()
  }
}

async function dropCertificationSchema(connectionString) {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${CERTIFICATION_SCHEMA}" CASCADE`)
  } finally {
    await client.end()
  }
}

async function applyReceivingMigration(connectionString) {
  const client = new Client({ connectionString })
  const migrationSql = fs.readFileSync(path.join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260818100000_purchase_receiving_integrity",
    "migration.sql",
  ), "utf8")

  await client.connect()
  try {
    await client.query(`SET search_path TO "${CERTIFICATION_SCHEMA}"`)
    await client.query(`DROP INDEX "goods_receipts_organizationId_purchaseOrderId_status_idx"`)
    await client.query(`ALTER TABLE "goods_receipts"
      DROP COLUMN "idempotencyKey",
      DROP COLUMN "payloadHash",
      DROP COLUMN "finalizedAt"`)
    await client.query(`DROP TABLE "document_sequences"`)
    await client.query(migrationSql)
  } finally {
    await client.end()
  }
}

function runNode(entry, args, env) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${path.basename(entry)} exited with status ${result.status ?? 1}.`)
  }
}

async function main() {
  const { adminUrl, testUrl } = certificationUrls()
  const childEnv = {
    ...process.env,
    DATABASE_URL: testUrl,
    RUN_PURCHASE_RECEIVING_POSTGRES_CERTIFICATION: "1",
  }

  await resetCertificationSchema(adminUrl)
  try {
    runNode(path.join(process.cwd(), "node_modules", "prisma", "build", "index.js"), [
      "db",
      "push",
      "--skip-generate",
      "--accept-data-loss",
    ], childEnv)
    await applyReceivingMigration(adminUrl)
    runNode(path.join(process.cwd(), "node_modules", "jest", "bin", "jest.js"), [
      "--runTestsByPath",
      "services/purchase-order/__tests__/purchase-receiving.postgres.test.ts",
      "--runInBand",
    ], childEnv)
  } finally {
    await dropCertificationSchema(adminUrl)
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}

module.exports = {
  CERTIFICATION_SCHEMA,
  certificationUrls,
}
