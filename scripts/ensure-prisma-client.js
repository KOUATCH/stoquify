#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { createHash } = require("crypto")
const { createRequire } = require("module")
const { spawnSync } = require("child_process")

// Prisma formats the copied schema. Preserve quoted defaults and comments while
// ignoring whitespace between tokens.
function schemaTokens(schema) {
  return JSON.stringify(schema.match(/\/\/[^\r\n]*|"(?:\\.|[^"\\])*"|[^\s"]+/g))
}

function hashFile(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

function isClientCurrent({ root, projectRequire, platform, env }) {
  // Reuse covers this project's default Windows library generator.
  // Prisma handles other platforms and explicit generation overrides.
  if (platform !== "win32" || Object.keys(env).some((key) => key.startsWith("PRISMA_"))) return false

  try {
    const clientRequire = createRequire(projectRequire.resolve("@prisma/client"))
    const generatedDir = path.dirname(clientRequire.resolve(".prisma/client/default"))
    const requiredFiles = ["index.js", "index.d.ts", "default.js", "default.d.ts", "schema.prisma", "query_engine-windows.dll.node"]
    if (requiredFiles.some((file) => fs.statSync(path.join(generatedDir, file)).size === 0)) return false

    const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
    const generatedSchema = fs.readFileSync(path.join(generatedDir, "schema.prisma"), "utf8")
    if (schemaTokens(schema) !== schemaTokens(generatedSchema)) return false

    const client = projectRequire("@prisma/client")
    const version = projectRequire("@prisma/client/package.json").version
    if (typeof client.PrismaClient !== "function" || client.Prisma.prismaVersion.client !== version) return false
    if (projectRequire("prisma/package.json").version !== version) return false

    // Reading the engine is safe; loading the native module would lock it here.
    const prismaRequire = createRequire(projectRequire.resolve("prisma/package.json"))
    const engineDir = path.dirname(prismaRequire.resolve("@prisma/engines/package.json"))
    return hashFile(path.join(generatedDir, "query_engine-windows.dll.node")) ===
      hashFile(path.join(engineDir, "query_engine-windows.dll.node"))
  } catch {
    return false
  }
}

function ensureClient(options = {}) {
  const root = options.root || path.resolve(__dirname, "..")
  const projectRequire = createRequire(path.join(root, "package.json"))
  const platform = options.platform || process.platform
  const env = options.env || process.env
  const log = options.log || console.log

  if (isClientCurrent({ root, projectRequire, platform, env })) {
    log("Prisma Client is current; reusing it without replacing the Windows engine DLL.")
    return 0
  }

  log("Generating Prisma Client for the current schema and installed version...")
  const result = (options.spawnSync || spawnSync)(process.execPath, [projectRequire.resolve("prisma"), "generate"], {
    cwd: root,
    env,
    stdio: "inherit",
    windowsHide: true,
  })
  if (result.error) throw result.error
  if (result.status !== 0 && platform === "win32") {
    console.error("If Prisma reports an EPERM engine lock, stop this project's dev servers and Prisma Studio, then run npm run prisma:generate.")
  }
  return result.status ?? 1
}

if (require.main === module) {
  try {
    process.exitCode = ensureClient()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

module.exports = { ensureClient, schemaTokens }
