const fs = require("fs")
const os = require("os")
const path = require("path")
const { spawnSync } = require("child_process")

const gatePath = path.resolve(__dirname, "../inventory-boundary-gate.js")

function writeFile(root, relativePath, contents) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, contents, "utf8")
}

describe("inventory boundary gate", () => {
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

  it("allows an explicitly marked local synthetic fixture", () => {
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

      expect(result.status).toBe(0)
      expect(result.stdout).toContain("Active violations: 0")
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
