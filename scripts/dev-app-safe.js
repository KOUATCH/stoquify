#!/usr/bin/env node

const fs = require("node:fs")
const path = require("node:path")

function prepareDevelopmentSession({ root = path.resolve(__dirname, ".."), env = process.env, argv = [] } = {}) {
  const projectRoot = fs.realpathSync(root)
  // Treat an explicit output name as a prefix, never as a shared writable cache.
  const prefix = env.NEXT_DIST_DIR?.trim() || ".next-dev"
  if (!/^\.next-[a-zA-Z0-9_-]+$/.test(prefix)) {
    throw new Error("NEXT_DIST_DIR for development must be a local .next-<name> prefix (for example .next-dev).")
  }

  // mkdtemp allocates atomically. Concurrent launches, ports and bundlers cannot
  // overwrite each other's manifests/chunks, or reuse an interrupted compilation.
  const output = fs.mkdtempSync(path.join(projectRoot, `${prefix}-session-`))
  const tsconfigPath = `${path.basename(output)}.tsconfig.json`
  // Next adds its generated type path to the selected tsconfig. Keep that
  // per-session mutation out of the shared source config and outside distDir,
  // which Next cleans when its compiler starts.
  fs.writeFileSync(path.join(projectRoot, tsconfigPath), JSON.stringify({ extends: "./tsconfig.json" }, null, 2) + "\n")
  return {
    root: projectRoot,
    distDir: path.basename(output),
    env: { ...env, NODE_ENV: "development", NEXT_DIST_DIR: path.basename(output), STOQUIFY_DEV_TSCONFIG: tsconfigPath },
    args: ["dev", "--port", env.PORT || "3000", ...argv],
  }
}

function main() {
  const nextCli = require.resolve("next/dist/bin/next")
  const session = prepareDevelopmentSession({ argv: process.argv.slice(2) })
  process.chdir(session.root)
  Object.assign(process.env, session.env)
  console.log(`Development output: ${session.distDir} (fresh, isolated session)`)
  process.argv = [process.execPath, nextCli, ...session.args]
  // Run the normal Next CLI in this process. Its own worker restart, Ctrl+C and
  // shutdown handlers remain responsible for the server process tree.
  require(nextCli)
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

module.exports = { prepareDevelopmentSession }
