const fs = require("fs")
const os = require("os")
const path = require("path")
const { spawnSync } = require("child_process")
const { createHash } = require("node:crypto")

const gatePath = process.env.INVENTORY_GATE_TEST_PATH || path.resolve(__dirname, "../inventory-boundary-gate.js")

function writeFile(root, relativePath, contents) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, contents, "utf8")
}

describe("inventory boundary gate", () => {
  it("invalidates a reviewed fixture when its source or a transitive guard changes", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-boundary-gate-"))
    try {
      const fixture = "async function fixture(db) { await db.inventoryLevel.create({}) }\n"
      const guard = "module.exports = () => { throw new Error('guard') }\n"
      const hash = text => createHash("sha256").update(text).digest("hex")
      writeFile(root, "scripts/boost-pos-demo-stock.ts", fixture)
      writeFile(root, "scripts/disposable-fixture-guard.js", guard)
      writeFile(root, "scripts/inventory-boundary-fixtures.json", JSON.stringify({ version: 1, fixtures: [{
        file: "scripts/boost-pos-demo-stock.ts", sha256: hash(fixture), reason: "Synthetic test of hash binding only.",
        guards: [{ file: "scripts/disposable-fixture-guard.js", sha256: hash(guard) }],
      }] }))
      const run = () => spawnSync(process.execPath, [gatePath, "--root", root, "--mode", "fail"], { encoding: "utf8" })
      expect(run().status).toBe(0)
      const manifestPath = path.join(root, "scripts/inventory-boundary-fixtures.json")
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
      const altered = JSON.parse(JSON.stringify(manifest))
      altered.fixtures[0].guards = []
      fs.writeFileSync(manifestPath, JSON.stringify(altered))
      expect(run().status).toBe(1)
      altered.fixtures[0].guards = [{ file: "scripts/unrelated.js", sha256: hash(guard) }]
      writeFile(root, "scripts/unrelated.js", guard)
      fs.writeFileSync(manifestPath, JSON.stringify(altered))
      expect(run().status).toBe(1)
      fs.writeFileSync(manifestPath, JSON.stringify(manifest))
      writeFile(root, "scripts/disposable-fixture-guard.js", "module.exports = () => true\n")
      expect(run().status).toBe(1)
      writeFile(root, "scripts/disposable-fixture-guard.js", guard)
      writeFile(root, "scripts/boost-pos-demo-stock.ts", fixture + "// changed fixture\n")
      expect(run().status).toBe(1)
      writeFile(root, "scripts/boost-pos-demo-stock.ts", fixture)
      writeFile(root, "scripts/unreviewed-copy.js", fixture)
      expect(run().status).toBe(1)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
  it("ignores generated Next output while preserving runtime stock mutation findings", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-boundary-gate-"))
    try {
      writeFile(
        root,
        ".next-slice410/server/app/[locale]/dashboard/payroll/page.js",
        "async function generated(db) { await db.inventoryLevel.create({ data: {} }) }\n",
      )
      writeFile(
        root,
        "runtime-stock.js",
        "async function runtime(db) { await db.inventoryLevel.create({ data: {} }) }\n",
      )

      const result = spawnSync(process.execPath, [gatePath, "--root", root, "--mode", "report"], {
        encoding: "utf8",
      })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain("runtime-stock.js")
      expect(result.stdout).not.toContain(".next-slice410")
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("ignores Codex certification workspaces while preserving the candidate source tree", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-boundary-gate-"))
    try {
      writeFile(
        root,
        ".codex-tmp/release-candidate/source/runtime-stock.js",
        "async function copied(db) { await db.inventoryLevel.create({ data: {} }) }\n",
      )
      writeFile(
        root,
        "services/runtime-stock.js",
        "async function runtime(db) { await db.inventoryLevel.create({ data: {} }) }\n",
      )

      const result = spawnSync(process.execPath, [gatePath, "--root", root, "--mode", "report"], {
        encoding: "utf8",
      })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain("services/runtime-stock.js")
      expect(result.stdout).not.toContain(".codex-tmp")
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("rejects a demo marker without reviewed disposable database guards", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-boundary-gate-"))
    try {
      writeFile(
        root,
        "scripts/local-e2e-fixture.js",
        "// @inventory-boundary-demo-script\nasync function seed(db) { await db.inventoryLevel.create({ data: {} }) }\n",
      )

      const result = spawnSync(process.execPath, [gatePath, "--root", root, "--mode", "fail"], {
        encoding: "utf8",
      })

      expect(result.status).toBe(1)
      expect(result.stdout).toContain("Active violations: 1")
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("detects multiline and literal bracket stock writes, while ignoring comments and strings", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-boundary-gate-"))
    try {
      writeFile(root, "services/rogue.js", `
        db.inventoryLevel
          .update({})
        db["inventoryTransaction"]["create"]({})
        db.inventoryLevel?.deleteMany({})
        // db.inventoryLevel.create({})
        const example = "db.inventoryLevel.create({})"
      `)
      const result = spawnSync(process.execPath, [gatePath, "--root", root, "--mode", "fail"], { encoding: "utf8" })
      expect(result.status).toBe(1)
      expect(result.stdout).toContain("Active violations: 3")
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it("fails every configured direct mutation outside the inventory kernel while preserving the kernel allowlist", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-boundary-gate-"))
    try {
      const directMutations = [
        "db.inventoryLevel.create({})",
        "db.inventoryLevel.createMany({})",
        "db.inventoryLevel.update({})",
        "db.inventoryLevel.updateMany({})",
        "db.inventoryLevel.upsert({})",
        "db.inventoryLevel.delete({})",
        "db.inventoryLevel.deleteMany({})",
        "db.inventoryTransaction.create({})",
        "db.inventoryTransaction.createMany({})",
        "db.inventoryTransaction.update({})",
        "db.inventoryTransaction.updateMany({})",
        "db.inventoryTransaction.upsert({})",
        "db.inventoryTransaction.delete({})",
        "db.inventoryTransaction.deleteMany({})",
      ].join("\n")
      writeFile(root, "services/inventory/kernel-writer.js", directMutations)
      writeFile(root, "services/rogue-stock-writer.js", directMutations)
      const jsonOut = path.join(root, "boundary-report.json")

      const result = spawnSync(
        process.execPath,
        [gatePath, "--root", root, "--mode", "fail", "--json-out", jsonOut],
        { encoding: "utf8" },
      )
      const report = JSON.parse(fs.readFileSync(jsonOut, "utf8"))

      expect(result.status).toBe(1)
      expect(result.stdout).toContain("Active violations: 14")
      expect(result.stderr).toContain("Inventory boundary failed: 14")
      expect(report.summary).toEqual({
        totalFindings: 28,
        activeViolationCount: 14,
        allowedFindingCount: 14,
        byClassification: { UNKNOWN_STOCK_MUTATION: 14 },
      })
      expect(
        report.findings.filter((finding) => finding.file === "services/inventory/kernel-writer.js"),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            allowed: true,
            classification: "ALLOWED_INVENTORY_KERNEL",
          }),
        ]),
      )
      expect(
        report.findings.filter((finding) => finding.file === "services/rogue-stock-writer.js"),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            allowed: false,
            classification: "UNKNOWN_STOCK_MUTATION",
          }),
        ]),
      )
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
