#!/usr/bin/env node

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "commonjs",
  moduleResolution: "node",
})

require("ts-node/register/transpile-only")

const path = require("path")
const Module = require("module")
const rootDir = path.resolve(__dirname, "..")
const originalResolveFilename = Module._resolveFilename
const originalLoad = Module._load

Module._resolveFilename = function payrollDryRunResolve(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(rootDir, request.slice(2)), parent, isMain, options)
  }
  return originalResolveFilename.call(this, request, parent, isMain, options)
}

Module._load = function payrollDryRunLoad(request, parent, isMain) {
  if (request === "server-only") return {}
  return originalLoad.call(this, request, parent, isMain)
}

const { db } = require("../prisma/db")
const { runPayrollSeedBackfillDryRunCli } = require("./payroll-seed-backfill-dry-run.ts")

runPayrollSeedBackfillDryRunCli(process.argv.slice(2))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
