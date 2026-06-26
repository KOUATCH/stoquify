#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"])
const TEST_DB_NAME = "stockflow_immutability_test"

function unquote(value) {
  return value.trim().replace(/^["']|["']$/g, "")
}

function readDotenv(filePath = path.join(process.cwd(), ".env")) {
  if (!fs.existsSync(filePath)) return null
  const values = {}
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    values[match[1]] = unquote(match[2])
  }
  return values
}

function expandEnvReferences(value, values, env = process.env) {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) return values[key]
    if (Object.prototype.hasOwnProperty.call(env, key)) return env[key]
    return ""
  })
}

function readDotenvValue(key, filePath = path.join(process.cwd(), ".env"), env = process.env) {
  const values = readDotenv(filePath)
  if (!values || !Object.prototype.hasOwnProperty.call(values, key)) return null
  return expandEnvReferences(values[key], values, env)
}

function encodeCredential(value) {
  try {
    return encodeURIComponent(decodeURIComponent(value))
  } catch {
    return encodeURIComponent(value)
  }
}

function setDatabaseName(rawUrl, databaseName = TEST_DB_NAME) {
  try {
    const parsed = new URL(rawUrl)
    parsed.pathname = `/${databaseName}`
    return parsed.toString()
  } catch {
    const match = rawUrl.match(/^(postgres(?:ql)?):\/\/(.+)@([^/?#:]+|\[[^\]]+\])(?::(\d+))?\/([^?]+)(\?.*)?$/i)
    if (!match) throw new Error("DATABASE_URL is not a parseable PostgreSQL URL.")

    const [, protocol, credentials, host, port = "", , query = ""] = match
    const separator = credentials.indexOf(":")
    const username = separator >= 0 ? credentials.slice(0, separator) : credentials
    const password = separator >= 0 ? credentials.slice(separator + 1) : ""
    const encodedCredentials =
      separator >= 0
        ? `${encodeCredential(username)}:${encodeCredential(password)}`
        : encodeCredential(username)
    return `${protocol}://${encodedCredentials}@${host}${port ? `:${port}` : ""}/${databaseName}${query}`
  }
}

function assertLocalSource(urlValue) {
  const parsed = new URL(urlValue)
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error("Refusing to derive a payroll immutability test database URL from a non-local DATABASE_URL.")
  }
}

function resolvePayrollImmutabilityDatabaseUrl(env = process.env) {
  const explicit = env.PAYROLL_IMMUTABILITY_DATABASE_URL || env.TEST_DATABASE_URL
  if (explicit) return explicit

  const dotenvExplicit =
    readDotenvValue("PAYROLL_IMMUTABILITY_DATABASE_URL") || readDotenvValue("TEST_DATABASE_URL")
  if (dotenvExplicit) return dotenvExplicit

  const databaseUrl = env.DATABASE_URL || readDotenvValue("DATABASE_URL")
  if (!databaseUrl) {
    throw new Error("Set PAYROLL_IMMUTABILITY_DATABASE_URL or TEST_DATABASE_URL, or provide a local DATABASE_URL in .env.")
  }

  const testUrl = setDatabaseName(databaseUrl)
  assertLocalSource(testUrl)
  return testUrl
}

function run(argv = process.argv) {
  const separator = argv.indexOf("--")
  const commandParts = separator >= 0 ? argv.slice(separator + 1) : []
  if (commandParts.length === 0) {
    throw new Error("Usage: node scripts/with-payroll-immutability-test-db.js -- <command> [args...]")
  }

  const payrollUrl = resolvePayrollImmutabilityDatabaseUrl()
  const [command, ...args] = commandParts
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PAYROLL_IMMUTABILITY_DATABASE_URL: payrollUrl,
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  })

  if (result.error) {
    throw result.error
  }
  return result.status ?? 1
}

if (require.main === module) {
  try {
    process.exitCode = run()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

module.exports = {
  TEST_DB_NAME,
  readDotenvValue,
  resolvePayrollImmutabilityDatabaseUrl,
  setDatabaseName,
}
