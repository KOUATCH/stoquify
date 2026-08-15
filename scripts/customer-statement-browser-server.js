const { spawnSync } = require("node:child_process")

const { loadEnvConfig } = require("@next/env")

const DATABASE_NAME = "stoquify_statement_browser_e2e"
const TOKEN_SECRET =
  "customer-statement-browser-e2e-local-secret-2026-08-13"

loadEnvConfig(process.cwd())

const configured = process.env.DATABASE_URL?.trim()
if (!configured) throw new Error("DATABASE_URL is required")
const databaseUrl = new URL(configured)
if (
  !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
    databaseUrl.hostname.toLowerCase(),
  )
) {
  throw new Error("Customer statement browser server refuses non-local databases")
}
databaseUrl.pathname = "/" + DATABASE_NAME

const port = process.env.CUSTOMER_STATEMENT_BROWSER_PORT ?? "3012"
const command = process.platform === "win32" ? "npx.cmd" : "npx"
const result = spawnSync(command, ["next", "dev", "-p", port], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl.toString(),
    AQSTOQFLOW_STATEMENT_TOKEN_SECRET: TOKEN_SECRET,
    NEXT_PUBLIC_BASE_URL: "http://127.0.0.1:" + port,
    NEXT_DIST_DIR:
      process.env.NEXT_DIST_DIR ?? ".next-customer-statement-browser",
  },
  shell: process.platform === "win32",
  stdio: "inherit",
})

if (result.error) throw result.error
process.exitCode = result.status ?? 1
