#!/usr/bin/env node

const { spawnSync } = require("node:child_process")

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  })
  if (result.error) throw result.error
  return result.status ?? 1
}

function main() {
  const migrationStatus = run("npx", ["prisma", "migrate", "deploy"])
  if (migrationStatus !== 0) return migrationStatus

  return run("npx", [
    "playwright",
    "test",
    "--config=playwright.inventory-items.config.ts",
    "--project=inventory-items-authenticated-release",
  ])
}

try {
  process.exitCode = main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
