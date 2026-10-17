const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { test } = require("node:test")
const { pathToFileURL } = require("node:url")
const { prepareDevelopmentSession } = require("../dev-app-safe")

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "stoquify-dev-test-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  return root
}

test("restarts never reuse damaged output or modify production/another session", (t) => {
  const root = fixture(t)
  for (const folder of [".next", ".next-dev"]) {
    fs.mkdirSync(path.join(root, folder))
    fs.writeFileSync(path.join(root, folder, "keep.txt"), "existing output")
  }
  const first = prepareDevelopmentSession({ root, env: {} })
  fs.writeFileSync(path.join(root, first.distDir, "pages-manifest.json"), '{"/_document":"missing.js"}')
  const second = prepareDevelopmentSession({ root, env: {} })
  assert.notEqual(first.distDir, second.distDir)
  assert.deepEqual(fs.readdirSync(path.join(root, second.distDir)), [])
  assert.ok(fs.existsSync(path.join(root, first.distDir, "pages-manifest.json")))
  for (const folder of [".next", ".next-dev"]) {
    assert.equal(fs.readFileSync(path.join(root, folder, "keep.txt"), "utf8"), "existing output")
  }
})

test("ports and bundlers get separate outputs even with an identical override", (t) => {
  const root = fixture(t)
  const env = { NEXT_DIST_DIR: ".next-verification", PORT: "3100", NODE_ENV: "production" }
  const first = prepareDevelopmentSession({ root, env })
  const second = prepareDevelopmentSession({ root, env, argv: ["--turbopack", "--port", "3101"] })
  assert.notEqual(first.distDir, second.distDir)
  assert.match(first.distDir, /^\.next-verification-session-/)
  assert.equal(second.env.NEXT_DIST_DIR, second.distDir)
  assert.equal(second.env.NODE_ENV, "development")
  assert.equal(second.env.STOQUIFY_DEV_TSCONFIG, `${second.distDir}.tsconfig.json`)
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, second.env.STOQUIFY_DEV_TSCONFIG), "utf8")), { extends: "./tsconfig.json" })
  assert.equal(env.NODE_ENV, "production")
  assert.equal(env.NEXT_DIST_DIR, ".next-verification")
  assert.deepEqual(second.args, ["dev", "--port", "3100", "--turbopack", "--port", "3101"])
})

test("default port and forwarded Next arguments are preserved", (t) => {
  const session = prepareDevelopmentSession({ root: fixture(t), env: {}, argv: ["-p", "3105", "--hostname", "localhost"] })
  assert.deepEqual(session.args, ["dev", "--port", "3000", "-p", "3105", "--hostname", "localhost"])
})

test("rejects production output and paths outside the development namespace before writing", (t) => {
  const root = fixture(t)
  for (const prefix of [".next", ".", "..", "../outside", ".next-dev/child", ".next-dev\\child", "C:\\outside", "/tmp/out", "src"]) {
    assert.throws(() => prepareDevelopmentSession({ root, env: { NEXT_DIST_DIR: prefix } }), /local .next-<name> prefix/)
  }
  assert.deepEqual(fs.readdirSync(root), [])
})

test("real Next config keeps development cache in memory and preserves production caching", async () => {
  const { default: config } = await import(pathToFileURL(path.resolve(__dirname, "../../next.config.mjs")))
  class IgnorePlugin {}
  for (const isServer of [false, true]) {
    const diskCache = { type: "filesystem", cacheDirectory: "unchanged-production-cache" }
    const makeConfig = () => ({ context: path.resolve(__dirname, "../.."), cache: diskCache, resolve: { alias: {} }, externals: [], module: { rules: [] }, plugins: [] })
    const context = { dir: path.resolve(__dirname, "../.."), isServer, webpack: { IgnorePlugin } }
    const development = config.webpack(makeConfig(), { ...context, dev: true })
    assert.deepEqual(development.cache, { type: "memory" })
    const production = config.webpack(makeConfig(), { ...context, dev: false })
    assert.equal(production.cache, diskCache)
  }
})

test("both npm development entry points use isolation and retain Prisma preparation", () => {
  const { scripts } = require("../../package.json")
  assert.equal(scripts.dev, "node scripts/dev-app-safe.js")
  assert.equal(scripts["dev:turbopack"], "node scripts/dev-app-safe.js --turbopack")
  assert.equal(scripts.predev, "npm run prisma:ensure")
  assert.equal(scripts["predev:turbopack"], "npm run prisma:ensure")
})
