#!/usr/bin/env node

const { spawnSync } = require("child_process")
const path = require("path")

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

function resolveSafeTarget(env = process.env) {
  const urlValue =
    env.PAYROLL_IMMUTABILITY_DATABASE_URL || env.TEST_DATABASE_URL || ""
  if (!urlValue) {
    throw new Error(
      "Set PAYROLL_IMMUTABILITY_DATABASE_URL or TEST_DATABASE_URL.",
    )
  }

  const parsed = new URL(urlValue)
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""))
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error("Refusing to reset a non-local database.")
  }
  if (!/(test|immutability)/i.test(dbName)) {
    throw new Error(
      `Refusing to reset database without a test/immutability name: ${dbName}`,
    )
  }

  return {
    dbName,
    host: parsed.hostname,
    urlValue,
  }
}

function main() {
  const target = resolveSafeTarget()
  console.log(`Reset target: ${target.host}/${target.dbName}`)

  const prismaEntry = path.join(
    process.cwd(),
    "node_modules",
    "prisma",
    "build",
    "index.js",
  )
  const triggerMigration = path.join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260625110000_payroll_kernel_immutability",
    "migration.sql",
  )
  const supplementalTriggers = path.join(
    process.cwd(),
    "scripts",
    "sql",
    "payroll-immutability-runtime-test-triggers.sql",
  )

  const runPrisma = (args) => {
    const result = spawnSync(process.execPath, [prismaEntry, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: target.urlValue,
      },
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    })
    if (result.error) throw result.error
    if (result.status !== 0) {
      throw new Error(`Prisma command failed: ${args.join(" ")}`)
    }
  }

  runPrisma(["db", "push", "--force-reset", "--skip-generate"])
  runPrisma([
    "db",
    "execute",
    "--schema",
    "prisma/schema.prisma",
    "--file",
    triggerMigration,
  ])
  runPrisma([
    "db",
    "execute",
    "--schema",
    "prisma/schema.prisma",
    "--file",
    supplementalTriggers,
  ])
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  resolveSafeTarget,
}
