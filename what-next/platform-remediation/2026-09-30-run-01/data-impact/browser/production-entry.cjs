// Runtime-only entry equivalent to generated standalone start-server, while using
// the final verified build's compiled configuration and workspace static files.
const path = require("node:path"), fs = require("node:fs")
const dist = process.env.SMOKE_DIST_DIRECTORY
if (!dist || !fs.existsSync(path.join(dist, "BUILD_ID"))) throw new Error("FINAL_BUILD_REQUIRED")
const { config } = JSON.parse(fs.readFileSync(path.join(dist, "required-server-files.json"), "utf8"))
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config)
require("next")
const { startServer } = require("next/dist/server/lib/start-server")
startServer({ dir: process.cwd(), isDev: false, config, hostname: "127.0.0.1", port: Number(process.env.PORT), allowRetry: false })
  .catch(() => { process.exitCode = 1 })
