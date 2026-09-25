/** @jest-environment node */
const fs = require("fs")
const os = require("os")
const path = require("path")
const { ensureClient } = require("../ensure-prisma-client")

const schema = 'generator client {\n  provider = "prisma-client-js"\n}\nmodel Item {\n  id String @id\n  name String @default("New York")\n}\n'
const roots = []

function fixture(generatedVersion = "6.19.3") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-startup-"))
  roots.push(root)
  const generated = path.join(root, "node_modules/.prisma/client")
  const write = (relative, contents) => {
    const file = path.join(root, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, contents)
  }
  write("package.json", "{}")
  write("prisma/schema.prisma", schema)
  write("node_modules/prisma/package.json", JSON.stringify({ version: "6.19.3", main: "cli.js" }))
  write("node_modules/prisma/cli.js", "// CLI fixture")
  write("node_modules/@prisma/engines/package.json", "{}")
  write("node_modules/@prisma/engines/query_engine-windows.dll.node", "engine")
  write("node_modules/@prisma/client/package.json", JSON.stringify({ version: "6.19.3", main: "index.js" }))
  write("node_modules/@prisma/client/index.js", 'module.exports = require(".prisma/client/default")')
  write("node_modules/.prisma/client/default.js", 'module.exports = require("./index")')
  write("node_modules/.prisma/client/index.js", `module.exports = { PrismaClient: class {}, Prisma: { prismaVersion: { client: "${generatedVersion}" } } }`)
  write("node_modules/.prisma/client/index.d.ts", "export class PrismaClient {}")
  write("node_modules/.prisma/client/default.d.ts", 'export * from "./index"')
  write("node_modules/.prisma/client/schema.prisma", schema.replace("id String", "id    String").replace(/\n/g, "\r\n"))
  write("node_modules/.prisma/client/query_engine-windows.dll.node", "engine")
  const spawnSync = jest.fn(() => ({ status: 0 }))
  return { root, generated, write, spawnSync, options: { root, platform: "win32", env: {}, spawnSync, log: jest.fn() } }
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    const resolved = fs.realpathSync(root)
    const tempRoot = fs.realpathSync(os.tmpdir())
    if (!resolved.startsWith(tempRoot + path.sep) || !path.basename(resolved).startsWith("prisma-startup-")) {
      throw new Error("Refusing to remove a fixture outside the temporary directory")
    }
    fs.rmSync(resolved, { recursive: true, force: true })
  }
  jest.restoreAllMocks()
})

describe("Prisma development startup", () => {
  it("reuses matching generated files without writing or loading the DLL", () => {
    const task = fixture()
    const engine = path.join(task.generated, "query_engine-windows.dll.node")
    const before = fs.statSync(engine).mtimeMs
    expect(ensureClient(task.options)).toBe(0)
    expect(task.spawnSync).not.toHaveBeenCalled()
    expect(fs.statSync(engine).mtimeMs).toBe(before)
  })

  it.each([
    ["new field", schema.replace("id String @id", "id String @id\n  sku String?")],
    ["changed whitespace inside a default", schema.replace('"New York"', '"New  York"')],
  ])("generates for a %s", (_label, changedSchema) => {
    const task = fixture()
    task.write("prisma/schema.prisma", changedSchema)
    expect(ensureClient(task.options)).toBe(0)
    expect(task.spawnSync).toHaveBeenCalledWith(process.execPath,
      [path.join(task.root, "node_modules/prisma/cli.js"), "generate"],
      expect.objectContaining({ cwd: task.root, stdio: "inherit", windowsHide: true }))
  })

  it("regenerates a client from an older Prisma version", () => {
    const task = fixture("6.19.2")
    ensureClient(task.options)
    expect(task.spawnSync).toHaveBeenCalledTimes(1)
  })

  it.each(["index.d.ts", "default.js", "query_engine-windows.dll.node"])("regenerates when %s is missing", (file) => {
    const task = fixture()
    fs.unlinkSync(path.join(task.generated, file))
    ensureClient(task.options)
    expect(task.spawnSync).toHaveBeenCalledTimes(1)
  })

  it("regenerates when the native engine does not match the installed engine", () => {
    const task = fixture()
    task.write("node_modules/.prisma/client/query_engine-windows.dll.node", "old engine")
    ensureClient(task.options)
    expect(task.spawnSync).toHaveBeenCalledTimes(1)
  })

  it("regenerates when the installed Prisma CLI version changes", () => {
    const task = fixture()
    task.write("node_modules/prisma/package.json", JSON.stringify({ version: "6.19.4", main: "cli.js" }))
    ensureClient(task.options)
    expect(task.spawnSync).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["other platforms", { platform: "linux" }],
    ["explicit engine configuration", { env: { PRISMA_CLIENT_ENGINE_TYPE: "binary" } }],
  ])("delegates %s to Prisma", (_label, overrides) => {
    const task = fixture()
    ensureClient({ ...task.options, ...overrides })
    expect(task.spawnSync).toHaveBeenCalledTimes(1)
  })

  it("propagates generation failures instead of starting with a stale client", () => {
    const task = fixture()
    task.write("prisma/schema.prisma", schema + "\n// changed")
    task.spawnSync.mockReturnValue({ status: 1 })
    jest.spyOn(console, "error").mockImplementation(() => {})
    expect(ensureClient(task.options)).toBe(1)
  })
})
