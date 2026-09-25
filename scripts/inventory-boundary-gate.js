#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const { createHash } = require("node:crypto")
const ts = require("typescript")

const FORBIDDEN_MUTATIONS = [
  {
    delegate: "inventoryLevel",
    operations: ["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"],
    risk: "Stock projection changed outside the inventory kernel",
  },
  {
    delegate: "inventoryTransaction",
    operations: ["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"],
    risk: "Immutable stock movement history changed outside the inventory kernel",
  },
]

const IGNORE_DIRS = new Set([
  ".codex-tmp",
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "graphify-out",
  "transaction-history",
])

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])

// Exact reviewed executables only. A manifest cannot approve another path or
// omit a transitive database guard. Changes require source review, never an
// automatic hash-refresh command in the gate.
const WORKFLOW_FIXTURE_ROOT = "what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/"
const WORKFLOW_GUARDS = [
  "scripts/disposable-fixture-guard.js",
  `${WORKFLOW_FIXTURE_ROOT}statement-recipient-fixtures.cjs`,
  `${WORKFLOW_FIXTURE_ROOT}registration-local.cjs`,
  "scripts/run-modern-modules-postgres-smoke.js",
  "scripts/modern-modules-local-verification.js",
  "scripts/prisma-local-fresh-bootstrap.js",
]
const FIXTURE_GUARDS = new Map([
  ...["boost-pos-demo-stock.ts", "supplier-po-ack-e2e-fixture.js", "modern-modules-lifecycle-fixture.ts"].map(file => [`scripts/${file}`, ["scripts/disposable-fixture-guard.js"]]),
  ...[
    "verify-cart-access-browser-v130.cjs", "verify-cart-access-v130.cjs", "verify-digest-inventory.cjs",
    "verify-digest-stock-access.cjs", "verify-pos-cart-concurrency-v130.cjs", "verify-pos-cart-v122.cjs",
    "verify-tender-access-v131.cjs",
  ].map(file => [`${WORKFLOW_FIXTURE_ROOT}${file}`, WORKFLOW_GUARDS]),
  ...[
    "verify-pulse-actions-v145.cjs", "verify-pulse-observations-v146.cjs",
    "verify-report-browser-v141.cjs", "verify-report-cost-v141.cjs",
  ].map(file => [`${WORKFLOW_FIXTURE_ROOT}${file}`, [...WORKFLOW_GUARDS, `${WORKFLOW_FIXTURE_ROOT}verify-tender-access-v131.cjs`]]),
])

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    mode: "report",
    out: null,
    jsonOut: null,
    includeAllowed: false,
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--json-out") args.jsonOut = path.resolve(argv[++index])
    else if (arg === "--include-allowed") args.includeAllowed = true
    else if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!["report", "warn", "fail"].includes(args.mode)) {
    throw new Error("--mode must be one of: report, warn, fail")
  }

  return args
}

function printHelp() {
  console.log(`Inventory boundary gate

Usage:
  node scripts/inventory-boundary-gate.js [--mode report|warn|fail] [--out file] [--json-out file]

Modes:
  report  Generate findings and exit 0.
  warn    Generate findings, print a warning, and exit 0.
  fail    Exit 1 when active direct stock mutation violations remain.
`)
}

function toRepoPath(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/")
}

function shouldIgnoreDirectory(name) {
  return IGNORE_DIRS.has(name) || name.startsWith(".next-")
}

function walk(root, directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (shouldIgnoreDirectory(entry.name)) continue
      walk(root, path.join(directory, entry.name), files)
      continue
    }

    if (!entry.isFile()) continue
    const extension = path.extname(entry.name)
    if (!SOURCE_EXTENSIONS.has(extension)) continue
    files.push(path.join(directory, entry.name))
  }

  return files
}

function classifyFinding(relativePath, delegate, operation, reviewedFixtures) {
  const file = relativePath.replace(/\\/g, "/")

  if (file.startsWith("services/inventory/")) {
    return {
      allowed: true,
      classification: "ALLOWED_INVENTORY_KERNEL",
      migrationOrder: 0,
      reason: "The inventory kernel is the allowed stock mutation boundary.",
    }
  }

  if (file.includes("/__tests__/") || file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
    return {
      allowed: true,
      classification: "TEST_OR_MOCK_ONLY",
      migrationOrder: 0,
      reason: "Tests may mock or assert stock mutation calls.",
    }
  }

  if (file.startsWith("prisma/") && /seed|fixture|migration/i.test(file)) {
    return {
      allowed: true,
      classification: "SEED_OR_MIGRATION_ONLY",
      migrationOrder: 0,
      reason: "Seed and migration code is outside runtime final-stock workflows.",
    }
  }

  if (reviewedFixtures.has(file)) {
    return {
      allowed: true,
      classification: "REVIEWED_DISPOSABLE_FIXTURE",
      migrationOrder: 0,
      reason: reviewedFixtures.get(file),
    }
  }

  if (file === "actions/itemsShow/createActionItem.ts" || file === "services/item/item.service.ts") {
    return {
      allowed: false,
      classification: "LEGACY_ITEM_INITIAL_STOCK",
      migrationOrder: 1,
      reason: "Item creation or initial stock must call an opening-stock kernel event.",
    }
  }

  if (file === "actions/itemsShow/updateItemStockById.ts") {
    return {
      allowed: false,
      classification: "LEGACY_MANUAL_STOCK_UPDATE",
      migrationOrder: 1,
      reason: "Manual stock changes must become approved adjustment or correction events.",
    }
  }

  if (file.startsWith("services/purchase-order/")) {
    return {
      allowed: false,
      classification: "LEGACY_PURCHASING_RECEIPT",
      migrationOrder: 2,
      reason: "Goods receipt inventory effects must enter through a goods-receipt stock event.",
    }
  }

  if (file.startsWith("services/pos/")) {
    return {
      allowed: false,
      classification: "LEGACY_POS_STOCK_EFFECT",
      migrationOrder: 3,
      reason: "POS sale, refund, and void stock effects must call POS inventory kernel events.",
    }
  }

  if (file.startsWith("actions/inventory/")) {
    return {
      allowed: false,
      classification: "LEGACY_INVENTORY_ACTION_HELPER",
      migrationOrder: 4,
      reason: "Inventory actions must be thin wrappers around services/inventory.",
    }
  }

  if (file.startsWith("lib/inventory/")) {
    return {
      allowed: false,
      classification: "LEGACY_INVENTORY_HELPER",
      migrationOrder: 4,
      reason: "Shared inventory helpers must delegate final mutations to services/inventory.",
    }
  }

  if (file.startsWith("scripts/")) {
    return {
      allowed: false,
      classification: "SCRIPT_STOCK_MUTATION",
      migrationOrder: 5,
      reason: "Scripts must use the kernel or have a reviewed, hash-bound disposable fixture classification.",
    }
  }

  return {
    allowed: false,
    classification: "UNKNOWN_STOCK_MUTATION",
    migrationOrder: 6,
    reason: `Direct ${delegate}.${operation} is outside the inventory kernel allowlist.`,
  }
}

function loadReviewedFixtures(root) {
  const manifestPath = path.join(root, "scripts/inventory-boundary-fixtures.json")
  const reviewed = new Map()
  if (!fs.existsSync(manifestPath)) return reviewed
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  if (manifest.version !== 1 || !Array.isArray(manifest.fixtures)) throw new Error("Invalid inventory fixture review manifest.")
  const hashes = new Map()
  function matches(file, expected) {
    if (typeof file !== "string" || file.includes("\\") || file.split("/").includes("..") || path.isAbsolute(file) || !/^[a-f0-9]{64}$/.test(expected)) return false
    if (!hashes.has(file)) {
      const absolute = path.join(root, file)
      // Normalize only line endings so Git checkout settings cannot invalidate a review.
      hashes.set(file, fs.existsSync(absolute) ? createHash("sha256").update(fs.readFileSync(absolute, "utf8").replace(/\r\n/g, "\n")).digest("hex") : null)
    }
    return hashes.get(file) === expected
  }
  for (const fixture of manifest.fixtures) {
    if (!fixture.reason || !Array.isArray(fixture.guards) || fixture.guards.length === 0) continue
    const required = FIXTURE_GUARDS.get(fixture.file)
    if (!required || fixture.guards.length !== required.length || !required.every(file => fixture.guards.some(guard => guard.file === file))) continue
    if (matches(fixture.file, fixture.sha256) && fixture.guards.every(guard => matches(guard.file, guard.sha256))) reviewed.set(fixture.file, fixture.reason)
  }
  return reviewed
}

function propertyName(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression)) return node.argumentExpression.text
  return null
}

function scanFile(root, filePath, reviewedFixtures) {
  const relativePath = toRepoPath(root, filePath)
  const text = fs.readFileSync(filePath, "utf8")
  const lines = text.split(/\r?\n/)
  const findings = []

  if (!/inventoryLevel|inventoryTransaction/.test(text)) return findings
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true)
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const operation = propertyName(node.expression)
      const delegate = node.expression.expression && propertyName(node.expression.expression)
      const rule = FORBIDDEN_MUTATIONS.find(rule => rule.delegate === delegate && rule.operations.includes(operation))
      if (rule) {
        const index = source.getLineAndCharacterOfPosition(node.getStart(source)).line
        const classification = classifyFinding(relativePath, rule.delegate, operation, reviewedFixtures)
        findings.push({
          file: relativePath,
          line: index + 1,
          delegate: rule.delegate,
          operation,
          risk: rule.risk,
          snippet: lines[index].trim(),
          ...classification,
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)

  return findings
}

function summarize(findings) {
  const active = findings.filter((finding) => !finding.allowed)
  const allowed = findings.filter((finding) => finding.allowed)
  const byClassification = {}

  for (const finding of active) {
    byClassification[finding.classification] = (byClassification[finding.classification] || 0) + 1
  }

  return {
    totalFindings: findings.length,
    activeViolationCount: active.length,
    allowedFindingCount: allowed.length,
    byClassification,
  }
}

function renderMarkdown(root, mode, findings, includeAllowed) {
  const now = new Date().toISOString()
  const summary = summarize(findings)
  const active = findings
    .filter((finding) => !finding.allowed)
    .sort((a, b) => a.migrationOrder - b.migrationOrder || a.file.localeCompare(b.file) || a.line - b.line)
  const allowed = findings
    .filter((finding) => finding.allowed)
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  const lines = []

  lines.push("# AqStoqFlow Inventory Boundary Gate Report")
  lines.push("")
  lines.push(`Generated: ${now}`)
  lines.push("")
  lines.push(`Root: \`${root}\``)
  lines.push("")
  lines.push(`Mode: \`${mode}\``)
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Active violations: ${summary.activeViolationCount}`)
  lines.push(`- Allowed kernel/test findings: ${summary.allowedFindingCount}`)
  lines.push(`- Total stock mutation callsites scanned: ${summary.totalFindings}`)
  lines.push("")

  lines.push("## Classification Counts")
  lines.push("")
  if (Object.keys(summary.byClassification).length === 0) {
    lines.push("- No active violations.")
  } else {
    for (const [classification, count] of Object.entries(summary.byClassification).sort()) {
      lines.push(`- ${classification}: ${count}`)
    }
  }
  lines.push("")

  lines.push("## Active Violations")
  lines.push("")
  if (active.length === 0) {
    lines.push("No direct stock mutation remains outside the inventory kernel allowlist.")
  } else {
    lines.push("| Order | Classification | File | Line | Call | Reason |")
    lines.push("| --- | --- | --- | ---: | --- | --- |")
    for (const finding of active) {
      const call = `${finding.delegate}.${finding.operation}`
      lines.push(`| ${finding.migrationOrder} | ${finding.classification} | \`${finding.file}\` | ${finding.line} | \`${call}\` | ${escapePipes(finding.reason)} |`)
    }
  }
  lines.push("")

  lines.push("## Migration Order")
  lines.push("")
  lines.push("1. Migrate item initial stock and manual stock updates to opening-stock or adjustment events.")
  lines.push("2. Migrate purchasing goods receipt inventory effects to a goods-receipt stock event.")
  lines.push("3. Migrate POS sale, refund, and void inventory effects to POS inventory events.")
  lines.push("4. Wrap or retire legacy inventory action helpers and shared inventory helpers.")
  lines.push("5. Convert runtime-like scripts to kernel calls or review and hash-bind their disposable database guards.")
  lines.push("6. Turn this gate from report mode to fail mode once active violations reach zero.")
  lines.push("")

  lines.push("## Enforcement Ladder")
  lines.push("")
  lines.push("- `report`: document all direct stock mutation bypasses without blocking development.")
  lines.push("- `warn`: keep exit code 0 but make the boundary breach visible in CI logs.")
  lines.push("- `fail`: exit non-zero when any active violation remains.")
  lines.push("")

  if (includeAllowed) {
    lines.push("## Allowed Findings")
    lines.push("")
    if (allowed.length === 0) {
      lines.push("No allowed findings.")
    } else {
      lines.push("| Classification | File | Line | Call |")
      lines.push("| --- | --- | ---: | --- |")
      for (const finding of allowed) {
        lines.push(`| ${finding.classification} | \`${finding.file}\` | ${finding.line} | \`${finding.delegate}.${finding.operation}\` |`)
      }
    }
    lines.push("")
  }

  return lines.join("\n")
}

function escapePipes(value) {
  return String(value).replace(/\|/g, "\\|")
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function main() {
  const args = parseArgs(process.argv)
  const root = path.resolve(args.root)
  const files = walk(root, root, [])
  const reviewedFixtures = loadReviewedFixtures(root)
  const findings = files.flatMap((file) => scanFile(root, file, reviewedFixtures))
  const summary = summarize(findings)
  const markdown = renderMarkdown(root, args.mode, findings, args.includeAllowed)

  if (args.out) {
    ensureDirectory(args.out)
    fs.writeFileSync(args.out, `${markdown}\n`, "utf8")
  }

  if (args.jsonOut) {
    ensureDirectory(args.jsonOut)
    fs.writeFileSync(args.jsonOut, `${JSON.stringify({ summary, findings }, null, 2)}\n`, "utf8")
  }

  console.log(markdown)

  if (args.mode === "warn" && summary.activeViolationCount > 0) {
    console.warn(`Inventory boundary warning: ${summary.activeViolationCount} active direct stock mutation violation(s).`)
  }

  if (args.mode === "fail" && summary.activeViolationCount > 0) {
    console.error(`Inventory boundary failed: ${summary.activeViolationCount} active direct stock mutation violation(s).`)
    process.exit(1)
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
}
