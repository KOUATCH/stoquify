const fs = require("fs")
const os = require("os")
const path = require("path")
const { spawnSync } = require("child_process")

const script = path.resolve(__dirname, "..", "inventory-valuation-truth-gate.js")

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, "utf8")
}

function fixture(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-valuation-gate-"))
  write(
    root,
    "services/inventory/inventory-stock-event.service.ts",
    "recordBusinessEventInTx( inventoryTransaction.create( inventoryLevel.updateMany(",
  )
  write(
    root,
    "services/inventory/inventory-projection-rebuild.service.ts",
    'effectiveAt: { lte: asOf } recordedAt: { lte: recordedThrough } "UNEXPLAINED_LEVEL"',
  )
  write(
    root,
    "services/inventory/inventory-reconciliation.service.ts",
    'reconcileInventoryClass3( "CLASS3_RECONCILIATION_DRIFT" "MISSING_STOCK_EVENT" "ORPHAN_CLASS3_POSTING" TransactionType.PRODUCTION_IN TransactionType.PRODUCTION_OUT',
  )
  write(root, "services/accounting/close-assurance.service.ts", "reconcileInventoryClass3(")
  write(root, "services/accounting/close-assurance-pack.service.ts", "reconcileInventoryClass3(")
  write(root, "services/modules/module-control-contracts.ts", '["inventory", "sales"]')
  write(root, "services/modules/module-catalog.service.ts", 'slug: "inventory"')
  write(
    root,
    "prisma/schema.prisma",
    "enum TransactionType { PRODUCTION_IN PRODUCTION_OUT } enum TransactionReferenceType { PRODUCTION_BATCH }",
  )
  write(root, "lib/permissions.ts", "INVENTORY_READ")
  write(root, "package.json", JSON.stringify({
    scripts: {
      "inventory:valuation:truth:gate": "node scripts/inventory-valuation-truth-gate.js --mode fail",
      "policy:gates": "npm run inventory:boundary:fail && npm run inventory:valuation:truth:gate",
    },
  }))
  if (options.retired === false) {
    write(root, "services/modules/module-catalog.service.ts", 'slug: "production"')
    write(root, "types/production.ts", "export interface Recipe {}")
  }
  return root
}

function run(root, mode = "fail") {
  return spawnSync(process.execPath, [script, "--root", root, "--mode", mode], {
    encoding: "utf8",
  })
}

describe("inventory valuation truth gate", () => {
  it("passes when every valuation invariant is represented", () => {
    const result = run(fixture())
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Checks ready: 6/6")
  })

  it("blocks when policy gate wiring is missing", () => {
    const root = fixture()
    write(root, "package.json", JSON.stringify({ scripts: {} }))

    const result = run(root)

    expect(result.status).toBe(1)
    expect(result.stdout).toContain("blocked: policy_gate_wiring")
  })
  it("blocks when the retired BOM capability is reintroduced", () => {
    const result = run(fixture({ retired: false }))
    expect(result.status).toBe(1)
    expect(result.stdout).toContain("blocked: production_bom_capability_retired_with_history_preserved")
  })

  it("reports without failing when requested", () => {
    const result = run(fixture({ retired: false }), "report")
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Status: blocked")
  })
})

