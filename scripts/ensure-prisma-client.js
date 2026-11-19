#!/usr/bin/env node

const fs = require("fs")
const os = require("os")
const path = require("path")
const { createHash } = require("crypto")
const { createRequire } = require("module")
const { spawnSync } = require("child_process")

const windowsEngineName = "query_engine-windows.dll.node"

// Prisma formats the copied schema, including reordering adjacent block-level
// attributes. Their declaration order is irrelevant; field order inside an
// index/unique constraint is not. Preserve quoted values and comments.
function schemaTokens(schema) {
  // Prisma also adds spaces around relation arguments and punctuation. Keep
  // strings, comments and compound attribute names intact while tokenizing it.
  const tokenize = (value) => value.match(/\/\/[^\r\n]*|"(?:\\.|[^"\\])*"|@@?[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*|[A-Za-z_]\w*|[+-]?\d+(?:\.\d+)?|[^\s"]/g) || []
  // Prisma also moves block attributes below fields declared after them.
  // Preserve field order and only relocate complete, single-line attributes.
  const fieldsFirst = schema.replace(/(^[ \t]*(?:model|view|type)\s+\w+[ \t]*\{[ \t]*\r?\n)([\s\S]*?)(^[ \t]*\})/gm, (block, header, body, closing) => {
    const lines = body.split(/\r?\n/)
    const attributes = lines.filter((line) => /^[ \t]*@@/.test(line))
    if (!attributes.length || !attributes.every((line) => /^[ \t]*@@\w+\([^\r\n]*\)[ \t]*(?:\/\/[^\r\n]*)?$/.test(line))) return block
    const fields = lines.filter((line) => !/^[ \t]*@@/.test(line))
    return header + fields.join("\n") + "\n" + attributes.join("\n") + "\n" + closing
  })
  const normalized = fieldsFirst.replace(/^[ \t]*@@[^\r\n]*(?:\r?\n[ \t]*@@[^\r\n]*)*/gm, (block) => {
    const lines = block.split(/\r?\n/)
    // Leave multiline/unrecognized declarations untouched rather than guessing
    // where an attribute ends and accidentally masking a real schema change.
    if (!lines.every((line) => /^[ \t]*@@\w+\([^\r\n]*\)[ \t]*(?:\/\/[^\r\n]*)?$/.test(line))) return block
    return lines.map((line) => tokenize(line).join(" ")).sort().join("\n")
  })
  return JSON.stringify(tokenize(normalized))
}

function hashFile(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

function windowsEnginePaths(projectRequire) {
  const clientDir = path.dirname(projectRequire.resolve("@prisma/client/package.json"))
  const generatedDir = path.resolve(clientDir, "../../.prisma/client")
  const prismaRequire = createRequire(projectRequire.resolve("prisma/package.json"))
  const engineDir = path.dirname(prismaRequire.resolve("@prisma/engines/package.json"))
  return { generatedDir, installedEngine: path.join(engineDir, windowsEngineName) }
}

function isClientCurrent({ root, projectRequire, platform, env }) {
  // Reuse covers this project's default Windows library generator.
  // Prisma handles other platforms and explicit generation overrides.
  if (platform !== "win32" || Object.keys(env).some((key) => key.startsWith("PRISMA_"))) return false

  try {
    const { generatedDir, installedEngine } = windowsEnginePaths(projectRequire)
    const requiredFiles = ["index.js", "index.d.ts", "default.js", "default.d.ts", "schema.prisma", windowsEngineName]
    if (requiredFiles.some((file) => fs.statSync(path.join(generatedDir, file)).size === 0)) return false

    const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
    const generatedSchema = fs.readFileSync(path.join(generatedDir, "schema.prisma"), "utf8")
    if (schemaTokens(schema) !== schemaTokens(generatedSchema)) return false

    const client = projectRequire("@prisma/client")
    const version = projectRequire("@prisma/client/package.json").version
    if (typeof client.PrismaClient !== "function" || client.Prisma.prismaVersion.client !== version) return false
    if (projectRequire("prisma/package.json").version !== version) return false

    // Reading the engine is safe; loading the native module would lock it here.
    return hashFile(path.join(generatedDir, windowsEngineName)) === hashFile(installedEngine)
  } catch {
    return false
  }
}

function matchingEngineForGeneration({ root, projectRequire, platform, env, args, cliVersion }) {
  if (platform !== "win32" || args.length || !cliVersion.startsWith("6.")) return null
  // Leave explicit engine settings and custom dotenv files to Prisma. The child
  // override would otherwise take precedence over settings loaded by prisma.config.ts.
  const hasOverrides = (settings) => Object.keys(settings).some((key) => /^(PRISMA_|DOTENV_CONFIG_|NETLIFY$)/i.test(key))
  if (hasOverrides(env)) return null

  try {
    const envFile = path.join(root, ".env")
    if (fs.existsSync(envFile) && hasOverrides(projectRequire("dotenv").parse(fs.readFileSync(envFile)))) return null
    if (projectRequire("@prisma/client/package.json").version !== cliVersion) return null

    const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
    const generators = [...schema.matchAll(/^[ \t]*generator\s+\w+\s*\{[^}]*\}/gm)]
    if (generators.length !== 1 || !/^\s*generator\s+client\s*\{\s*provider\s*=\s*"prisma-client-js"\s*\}$/.test(generators[0][0])) return null

    const engine = windowsEnginePaths(projectRequire)
    if (hashFile(path.join(engine.generatedDir, windowsEngineName)) === hashFile(engine.installedEngine)) return engine
  } catch {
    // Missing files and layouts outside the default setup use normal generation.
  }
  return null
}

function generateClient(options = {}) {
  const root = options.root || path.resolve(__dirname, "..")
  const projectRequire = createRequire(path.join(root, "package.json"))
  const platform = options.platform || process.platform
  const env = options.env || process.env
  const args = options.args || []
  const log = options.log || console.log
  const prismaPackagePath = projectRequire.resolve("prisma/package.json")
  const { bin, version: cliVersion } = projectRequire(prismaPackagePath)
  const prismaCli = path.resolve(path.dirname(prismaPackagePath), bin.prisma)
  const run = (childEnv) => (options.spawnSync || spawnSync)(process.execPath, [prismaCli, "generate", ...args], {
    cwd: root,
    env: childEnv,
    stdio: "inherit",
    windowsHide: true,
  })

  const engine = matchingEngineForGeneration({ root, projectRequire, platform, env, args, cliVersion })
  let result
  if (engine) {
    const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "stoquify-prisma-engine-"))
    const alias = `${path.basename(stagingDir)}.dll.node`
    const source = path.join(stagingDir, alias)
    try {
      // Prisma 6 copies the override by basename. Use a unique name so the
      // generator can finish without replacing the identical DLL Windows has loaded.
      fs.copyFileSync(engine.installedEngine, source)
      log("Generating Prisma Client while preserving the matching Windows engine DLL.")
      result = run({ ...env, PRISMA_QUERY_ENGINE_LIBRARY: source })
    } finally {
      fs.rmSync(source, { force: true })
      fs.rmdirSync(stagingDir)
      for (const file of fs.existsSync(engine.generatedDir) ? fs.readdirSync(engine.generatedDir) : []) {
        if (file === alias || (file.startsWith(alias) && /^\.tmp\d+$/.test(file.slice(alias.length)))) {
          fs.rmSync(path.join(engine.generatedDir, file), { force: true })
        }
      }
    }
  } else {
    result = run(env)
  }

  if (result.error) throw result.error
  if (result.status !== 0 && platform === "win32") {
    console.error("If Prisma reports an EPERM engine lock, stop this project's dev servers and Prisma Studio, then retry generation.")
  }
  return result.status ?? 1
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
  return generateClient(options)
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2)
    process.exitCode = args[0] === "--generate" ? generateClient({ args: args.slice(1) }) : ensureClient()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

module.exports = { ensureClient, generateClient, schemaTokens }
