#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { writeGeneratedReportFile } = require("./generated-report-writer")

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    mode: "report",
    out: null,
    jsonOut: null,
  }
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--json-out") args.jsonOut = path.resolve(argv[++index])
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (!["report", "fail"].includes(args.mode)) {
    throw new Error("--mode must be report or fail")
  }
  return args
}

function read(root, relativePath) {
  const filePath = path.join(root, relativePath)
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : ""
}

function evaluate(root) {
  const stockEvents = read(root, "services/inventory/inventory-stock-event.service.ts")
  const projection = read(root, "services/inventory/inventory-projection-rebuild.service.ts")
  const reconciliation = read(root, "services/inventory/inventory-reconciliation.service.ts")
  const closeAssurance = read(root, "services/accounting/close-assurance.service.ts")
  const closePack = read(root, "services/accounting/close-assurance-pack.service.ts")
  const moduleContracts = read(root, "services/modules/module-control-contracts.ts")
  const moduleCatalog = read(root, "services/modules/module-catalog.service.ts")
  const schema = read(root, "prisma/schema.prisma")
  const productionTypes = read(root, "types/production.ts")
  const productionSeed = read(root, "prisma/production-seed.ts")
  const permissions = read(root, "lib/permissions.ts")
  const packageJson = read(root, "package.json")

  return [
    {
      id: "service_owned_immutable_stock_events",
      ready:
        stockEvents.includes("recordBusinessEventInTx(") &&
        stockEvents.includes(["inventoryTransaction", "create("].join(".")) &&
        stockEvents.includes(["inventoryLevel", "updateMany("].join(".")),
    },
    {
      id: "bitemporal_projection_rebuild",
      ready:
        projection.includes("effectiveAt: { lte: asOf }") &&
        projection.includes("recordedAt: { lte: recordedThrough }") &&
        projection.includes('"UNEXPLAINED_LEVEL"'),
    },
    {
      id: "class3_reconciliation_truth",
      ready:
        reconciliation.includes("reconcileInventoryClass3(") &&
        reconciliation.includes('"CLASS3_RECONCILIATION_DRIFT"') &&
        reconciliation.includes('"MISSING_STOCK_EVENT"') &&
        reconciliation.includes('"ORPHAN_CLASS3_POSTING"'),
    },
    {
      id: "class3_close_assurance_integration",
      ready:
        closeAssurance.includes("reconcileInventoryClass3(") &&
        closePack.includes("reconcileInventoryClass3("),
    },
    {
      id: "production_bom_capability_retired_with_history_preserved",
      ready:
        !moduleContracts.includes('"production"') &&
        !moduleCatalog.includes('slug: "production"') &&
        !schema.includes("model Recipe {") &&
        !schema.includes("model RecipeIngredient {") &&
        !schema.includes("model ProductionBatch {") &&
        productionTypes === "" &&
        productionSeed === "" &&
        !permissions.includes("PRODUCTION_READ") &&
        schema.includes("PRODUCTION_IN") &&
        schema.includes("PRODUCTION_OUT") &&
        schema.includes("PRODUCTION_BATCH") &&
        reconciliation.includes("TransactionType.PRODUCTION_IN") &&
        reconciliation.includes("TransactionType.PRODUCTION_OUT"),
    },
    {
      id: "policy_gate_wiring",
      ready:
        packageJson.includes('"inventory:valuation:truth:gate"') &&
        packageJson.includes("npm run inventory:valuation:truth:gate"),
    },
  ]
}

function render(result, mode) {
  const ready = result.filter((check) => check.ready).length
  const blockers = result.filter((check) => !check.ready)
  return [
    "# Inventory Valuation Truth Gate",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${mode}`,
    `Status: ${blockers.length === 0 ? "ready" : "blocked"}`,
    "",
    "## Summary",
    "",
    `- Checks ready: ${ready}/${result.length}`,
    `- Blockers: ${blockers.length}`,
    "",
    "## Checks",
    "",
    ...result.map((check) => `- ${check.ready ? "ready" : "blocked"}: ${check.id}`),
    "",
    "## Blockers",
    "",
    ...(blockers.length ? blockers.map((check) => `- ${check.id}`) : ["- None"]),
    "",
    "## Safety",
    "",
    "- This gate is static and read-only.",
    "- Runtime tests remain required for quantity, valuation, rollback, concurrency, and ledger behavior.",
  ].join("\n")
}

function write(filePath, content) {
  if (!filePath) return
  writeGeneratedReportFile(filePath, content + String.fromCharCode(10), "utf8")
}

function main() {
  const args = parseArgs(process.argv)
  const result = evaluate(args.root)
  const markdown = render(result, args.mode)
  const summary = {
    ready: result.filter((check) => check.ready).length,
    total: result.length,
    blockers: result.filter((check) => !check.ready).map((check) => check.id),
  }
  write(args.out, markdown)
  write(args.jsonOut, JSON.stringify({ summary, checks: result }, null, 2))
  console.log(markdown)
  if (args.mode === "fail" && summary.blockers.length) process.exit(1)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
}



