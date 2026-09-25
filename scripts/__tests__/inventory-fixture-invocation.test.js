/** @jest-environment node */
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const ts = require("typescript")
const guard = require("../disposable-fixture-guard")
const root = path.resolve(__dirname, "../..")
const fixtureRoot = "what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/"
const applicationUrl = "postgresql://fixture:secret@127.0.0.1:5432/stoquify_replay_next_20260830"
const ownedName = "stoquify_local_registration_20260906_01"
const ownedUrl = applicationUrl.replace("stoquify_replay_next_20260830", ownedName)

function source(file) { return fs.readFileSync(path.join(root, file), "utf8") }

function workflowHarness(target = applicationUrl, identity = "stoquify_replay_next_20260830", ownershipError = false) {
  const write = jest.fn()
  const prismaConstructor = jest.fn()
  const helper = { root, database: ownedName, targetUrl: () => new URL(target), metadata: () => ({ authSecret: "synthetic-unit-test-secret" }), assertOwned: jest.fn(), withClient: jest.fn(async () => { if (ownershipError) throw new Error("Unexpected organization in registration database") }) }
  const baseDb = { $queryRaw: jest.fn(async () => [{ name: identity }]), $extends: config => ({ inventoryLevel: { create: args => config.query.$allModels.$allOperations({ args, query: write }) } }) }
  const fakeProcess = { env: {}, chdir: jest.fn() }
  const context = { process: fakeProcess, console, URL, Buffer, global: {} }
  let shared
  function localRequire(name) {
    if (name === "./registration-local.cjs") return helper
    if (name === "./statement-recipient-fixtures.cjs") return shared ||= run(source(fixtureRoot + "statement-recipient-fixtures.cjs"))
    if (name.endsWith("disposable-fixture-guard.js")) return { ...guard, assertDisposableDatabaseTarget: (value, names) => guard.assertDisposableDatabaseTarget(value, names, fakeProcess.env) }
    if (name === "node:module") return { _load() {} }
    if (name === "@prisma/client") return { PrismaClient: function (...args) { prismaConstructor(...args); return baseDb } }
    if (name === "ts-node") return { register() {} }
    if (name === "tsconfig-paths/register" || name.replace(/\\/g, "/").includes("services/")) return {}
    return require(name)
  }
  function run(code) {
    const localModule = { exports: {} }
    vm.runInNewContext("(function(require,module,exports){\n" + code + "\n})", context)(localRequire, localModule, localModule.exports)
    return localModule.exports
  }
  return { run, write, helper, prismaConstructor, baseDb }
}

describe("reviewed inventory fixture invocation boundaries (no database connections)", () => {
  it.each([
    "verify-cart-access-browser-v130.cjs", "verify-cart-access-v130.cjs", "verify-digest-inventory.cjs",
    "verify-digest-stock-access.cjs", "verify-pos-cart-concurrency-v130.cjs", "verify-pos-cart-v122.cjs",
    "verify-pulse-actions-v145.cjs", "verify-pulse-observations-v146.cjs", "verify-report-browser-v141.cjs",
    "verify-report-cost-v141.cjs", "verify-tender-access-v131.cjs",
  ])("%s rejects an application-database target before constructing Prisma", file => {
    const harness = workflowHarness()
    expect(() => harness.run(source(fixtureRoot + file))).toThrow(/exact reviewed disposable/)
    expect(harness.prismaConstructor).not.toHaveBeenCalled()
    expect(harness.write).not.toHaveBeenCalled()
  })

  it("an imported workflow fixture cannot bypass actual connected identity validation", async () => {
    const harness = workflowHarness(ownedUrl)
    const shared = harness.run(source(fixtureRoot + "statement-recipient-fixtures.cjs"))
    await expect(shared.db.inventoryLevel.create({ data: {} })).rejects.toThrow(/identity/)
    expect(harness.write).not.toHaveBeenCalled()
    expect(harness.helper.withClient).not.toHaveBeenCalled()
  })

  it("an owned database with unexpected organization provenance blocks the first model write", async () => {
    const harness = workflowHarness(ownedUrl, ownedName, true)
    const shared = harness.run(source(fixtureRoot + "statement-recipient-fixtures.cjs"))
    await expect(shared.db.inventoryLevel.create({ data: {} })).rejects.toThrow(/Unexpected organization/)
    expect(harness.write).not.toHaveBeenCalled()
  })

  it("admits the model operation only after connected identity and ownership pass", async () => {
    const harness = workflowHarness(ownedUrl, ownedName)
    const shared = harness.run(source(fixtureRoot + "statement-recipient-fixtures.cjs"))
    const input = { data: { synthetic: true } }
    await shared.db.inventoryLevel.create(input)
    expect(harness.baseDb.$queryRaw).toHaveBeenCalledTimes(1)
    expect(harness.helper.withClient).toHaveBeenCalledTimes(1)
    expect(harness.write).toHaveBeenCalledWith(input)
  })

  it.each(["scripts/boost-pos-demo-stock.ts", "scripts/supplier-po-ack-e2e-fixture.js"])("%s does not use application DATABASE_URL as a fixture fallback", async file => {
    const prismaConstructor = jest.fn()
    const localModule = { exports: {} }
    const fakeProcess = { env: { DATABASE_URL: applicationUrl, DIRECT_URL: applicationUrl }, argv: ["node", file], cwd: () => root }
    const localRequire = name => {
      if (name === "@prisma/client") return { PrismaClient: prismaConstructor }
      if (name === "./disposable-fixture-guard") return { ...guard, assertDisposableDatabaseTarget: (value, names) => guard.assertDisposableDatabaseTarget(value, names, fakeProcess.env) }
      if (name === "argon2") return {}
      if (name === "node:fs") return { ...fs, existsSync: () => false }
      return require(name)
    }
    const code = ts.transpileModule(source(file).replace(/^#![^\n]*\n/, "") + (file.endsWith(".js") ? "\nmodule.exports={main};" : ""), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    const execute = () => vm.runInNewContext("(function(require,module,exports){\n" + code + "\n})", { process: fakeProcess, console, URL })(localRequire, localModule, localModule.exports)
    if (file.endsWith(".ts")) expect(execute).toThrow(/explicit disposable PostgreSQL/)
    else { execute(); await expect(localModule.exports.main()).rejects.toThrow(/explicit disposable PostgreSQL/) }
    expect(prismaConstructor).not.toHaveBeenCalled()
  })

  it("modern module fixture checks the connected transaction identity before any stock or organization mutation", async () => {
    const database = "stoquify_local_modern_modules_20260905_01"
    const url = applicationUrl.replace("stoquify_replay_next_20260830", database)
    const localModule = { exports: {} }
    const fakeProcess = { env: { DATABASE_URL: url, DIRECT_URL: url } }
    const localRequire = name => name === "./disposable-fixture-guard" ? { assertDisposableDatabaseTarget: (value, names) => guard.assertDisposableDatabaseTarget(value, names, fakeProcess.env) } : name.startsWith("node:") ? require(name) : {}
    const code = ts.transpileModule(source("scripts/modern-modules-lifecycle-fixture.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    vm.runInNewContext("(function(require,module,exports){\n" + code + "\n})", { process: fakeProcess, URL })(localRequire, localModule, localModule.exports)
    const write = jest.fn()
    const tx = { $queryRaw: jest.fn(async () => [{ name: "stoquify_replay_next_20260830" }]), organization: { findUniqueOrThrow: write }, inventoryLevel: { upsert: write } }
    await expect(localModule.exports.prepareModernModulesLifecycleFixture({ $transaction: callback => callback(tx) }, "org_modules_retailer_fr_mobile", "inventory-denial")).rejects.toThrow()
    expect(write).not.toHaveBeenCalled()
  })
})
