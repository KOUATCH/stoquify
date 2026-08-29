#!/usr/bin/env node

const path = require("path")
const { spawnSync } = require("child_process")
const {
  createNewDatabase,
  deployMigrations,
  loadDatabaseUrl,
  resolveTarget,
} = require("./prisma-local-fresh-bootstrap")

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "create",
    databaseName: null,
    out: "what-next/migrations/current-fresh-replay-certification.md",
    jsonOut: "what-next/migrations/current-fresh-replay-certification.json",
  }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--root") options.root = path.resolve(argv[++index])
    else if (value === "--mode") options.mode = argv[++index]
    else if (value === "--database") options.databaseName = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error(`Unknown argument: ${value}`)
  }
  if (!options.databaseName) throw new Error("--database is required")
  if (!["create", "certify-existing"].includes(options.mode)) {
    throw new Error("--mode must be create or certify-existing")
  }
  if (!/^stoquify_replay_[a-z0-9_]+$/.test(options.databaseName)) {
    throw new Error("Replay database name must match stoquify_replay_[a-z0-9_]+")
  }
  return options
}

async function runFreshReplay(options, dependencies = {}) {
  const loadUrl = dependencies.loadDatabaseUrl || loadDatabaseUrl
  const resolve = dependencies.resolveTarget || resolveTarget
  const create = dependencies.createNewDatabase || createNewDatabase
  const deploy = dependencies.deployMigrations || deployMigrations
  const runner = dependencies.runner || spawnSync
  const sourceUrl = loadUrl()
  const target = resolve({
    databaseName: options.databaseName,
    sourceUrl,
  })

  if (options.mode === "create") {
    await create(target, options.databaseName)
    deploy(target)
    deploy(target)
  }

  const certificationScript = path.join(
    options.root,
    "scripts",
    "prisma-fresh-replay-certification.js",
  )
  const result = runner(
    process.execPath,
    [
      certificationScript,
      "--mode",
      "fail",
      "--out",
      options.out,
      "--json-out",
      options.jsonOut,
    ],
    {
      cwd: options.root,
      env: {
        ...process.env,
        AQSTOQFLOW_FRESH_REPLAY_DATABASE_URL: target.toString(),
      },
      stdio: "inherit",
      shell: false,
    },
  )
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `Fresh replay certification exited with code ${result.status ?? 1}`,
    )
  }

  return {
    status: "ready",
    mode: options.mode,
    databaseName: options.databaseName,
    deployCount: options.mode === "create" ? 2 : 0,
    certificationStatus: "passed",
    databaseUrlRetained: false,
  }
}

async function main() {
  const options = parseArgs()
  const report = await runFreshReplay(options)
  process.stdout.write(JSON.stringify(report) + "\n")
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}

module.exports = {
  parseArgs,
  runFreshReplay,
}
