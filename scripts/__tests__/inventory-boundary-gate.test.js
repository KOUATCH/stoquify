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
})