#!/usr/bin/env node

const fs = require("fs")
const os = require("os")
const path = require("path")

const DEFAULT_SCAN_DIRS = ["app", "actions", "components", "hooks"]

const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "graphify-out",
])

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])

const MUTATION_OPERATIONS = [
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]

const ECONOMIC_DELEGATES = new Set([
  "accountingPeriod",
  "auditLog",
  "businessEvent",
  "cashDrawerSession",
  "closeRun",
  "fiscalDocument",
  "inventoryLevel",
  "inventoryTransaction",
  "item",
  "journal",
  "journalEntry",
  "journalEntryLine",
  "ledgerPostingBatch",
  "payment",
  "paymentTransaction",
  "payrollRun",
  "purchaseOrder",
  "purchaseOrderLine",
  "salesOrder",
  "salesOrderLine",
  "stockAdjustment",
  "stockCount",
  "stockTransfer",
  "supplierInvoice",
  "supplierPayment",
])

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    mode: "report",
    out: null,
    jsonOut: null,
    baseline: null,
    includeAllowed: false,
    scanDirs: [...DEFAULT_SCAN_DIRS],
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--json-out") args.jsonOut = path.resolve(argv[++index])
    else if (arg === "--baseline") args.baseline = path.resolve(argv[++index])
    else if (arg === "--include-allowed") args.includeAllowed = true
    else if (arg === "--scan-dir") args.scanDirs.push(argv[++index])
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

  args.scanDirs = Array.from(new Set(args.scanDirs))
  return args
}

function printHelp() {
  console.log(`AqStoqFlow service boundary gate

Usage:
  node scripts/service-boundary-gate.js [--mode report|warn|fail] [--baseline file] [--out file] [--json-out file]

Modes:
  report  Generate findings and exit 0.
  warn    Generate findings, print a warning, and exit 0.
  fail    Exit 1 when active service-boundary violations remain.

Baseline:
  --baseline file  Compare against a previous JSON report and fail only when active findings get worse.
`)
}

function toRepoPath(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/")
}

function walk(directory, files) {
  if (!fs.existsSync(directory)) return files

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue
      walk(path.join(directory, entry.name), files)
      continue
    }

    if (!entry.isFile()) continue
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue
    files.push(path.join(directory, entry.name))
  }

  return files
}

function isTestOrMockPath(file) {
  return (
    file.includes("/__tests__/") ||
    file.includes("/__mocks__/") ||
    /\.test\.[jt]sx?$/.test(file) ||
    /\.spec\.[jt]sx?$/.test(file)
  )
}

function isCommentLine(line) {
  return /^\s*(\/\/|\*|\/\*)/.test(line)
}

function classifyFinding(file, category, details) {
  if (isTestOrMockPath(file)) {
    return {
      allowed: true,
      severity: "allowed",
      classification: "TEST_OR_MOCK_ONLY",
      migrationOrder: 0,
      reason: "Tests and mocks may import or stub persistence boundaries.",
    }
  }

  if (file.startsWith("services/")) {
    return {
      allowed: true,
      severity: "allowed",
      classification: "SERVICE_LAYER_OWNER",
      migrationOrder: 0,
      reason: "Services are the approved persistence boundary.",
    }
  }

  if (category === "DIRECT_DB_IMPORT") {
    return {
      allowed: false,
      severity: "high",
      classification: "DIRECT_PRISMA_DB_IMPORT",
      migrationOrder: migrationOrderForFile(file),
      reason: "DB clients must be owned by service modules, not App Router, actions, hooks, or components.",
    }
  }

  if (category === "PRISMA_CLIENT_IMPORT") {
    return {
      allowed: false,
      severity: "medium",
      classification: "PRISMA_CLIENT_BOUNDARY_COUPLING",
      migrationOrder: migrationOrderForFile(file),
      reason: "UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types.",
    }
  }

  if (category === "DIRECT_DB_CALL") {
    return {
      allowed: false,
      severity: "high",
      classification: "DIRECT_PRISMA_CALL_OUTSIDE_SERVICE",
      migrationOrder: migrationOrderForFile(file),
      reason: `${details.client}.${details.delegate}.${details.operation} bypasses the service-owned tenant/RBAC/audit boundary.`,
    }
  }

  if (category === "ACTION_OWNED_MUTATION") {
    const isEconomic = ECONOMIC_DELEGATES.has(details.delegate)
    return {
      allowed: false,
      severity: isEconomic ? "critical" : "high",
      classification: isEconomic ? "ACTION_OWNED_ECONOMIC_MUTATION" : "ACTION_OWNED_MUTATION",
      migrationOrder: migrationOrderForFile(file),
      reason: "Server actions must validate and orchestrate only; protected mutations belong in services.",
    }
  }

  return {
    allowed: false,
    severity: "medium",
    classification: category,
    migrationOrder: migrationOrderForFile(file),
    reason: "Service boundary finding requires review.",
  }
}

function migrationOrderForFile(file) {
  if (file.startsWith("actions/item/") || file.startsWith("actions/itemsShow/") || file.startsWith("actions/inventory/")) return 1
  if (file.startsWith("app/api/") || file.includes("/dashboard/inventory/")) return 2
  if (file.includes("/purchases") || file.startsWith("actions/purchasing/")) return 3
  if (file.startsWith("hooks/")) return 4
  if (file.startsWith("components/")) return 5
  if (file.startsWith("actions/")) return 6
  if (file.startsWith("app/")) return 7
  return 9
}

function scanFile(root, filePath) {
  const file = toRepoPath(root, filePath)
  const text = fs.readFileSync(filePath, "utf8")
  const lines = text.split(/\r?\n/)
  const findings = []

  lines.forEach((line, index) => {
    if (isCommentLine(line)) return

    const lineNumber = index + 1
    const trimmed = line.trim()

    if (/@\/prisma\/db/.test(line)) {
      findings.push(makeFinding(root, file, lineNumber, "DIRECT_DB_IMPORT", trimmed, {}))
    }

    if (/@prisma\/client/.test(line)) {
      findings.push(makeFinding(root, file, lineNumber, "PRISMA_CLIENT_IMPORT", trimmed, {}))
    }

    const dbCallPattern = /\b(db|prisma|tx)\s*\.\s*([A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)\s*\(/g
    let match
    while ((match = dbCallPattern.exec(line)) !== null) {
      const [, client, delegate, operation] = match
      const isMutation = MUTATION_OPERATIONS.includes(operation)
      const category = file.startsWith("actions/") && isMutation ? "ACTION_OWNED_MUTATION" : "DIRECT_DB_CALL"
      findings.push(makeFinding(root, file, lineNumber, category, trimmed, { client, delegate, operation }))
    }
  })

  return findings
}

function makeFinding(root, file, line, category, snippet, details) {
  const classification = classifyFinding(file, category, details)
  return {
    file,
    line,
    category,
    snippet,
    ...details,
    ...classification,
    root: undefined,
  }
}

function scanRoot(root, scanDirs = DEFAULT_SCAN_DIRS) {
  const absoluteRoot = path.resolve(root)
  const files = scanDirs.flatMap((scanDir) => walk(path.join(absoluteRoot, scanDir), []))
  const findings = files.flatMap((file) => scanFile(absoluteRoot, file))
  return {
    root: absoluteRoot,
    scanDirs,
    findings,
    summary: summarize(findings),
  }
}

function summarize(findings) {
  const active = findings.filter((finding) => !finding.allowed)
  const allowed = findings.filter((finding) => finding.allowed)
  const byClassification = {}
  const bySeverity = {}

  for (const finding of active) {
    byClassification[finding.classification] = (byClassification[finding.classification] || 0) + 1
    bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1
  }

  return {
    activeViolationCount: active.length,
    allowedFindingCount: allowed.length,
    totalFindings: findings.length,
    byClassification,
    bySeverity,
  }
}

function activeFindingKey(finding) {
  return [
    finding.classification,
    finding.file,
    finding.snippet,
  ].join("::")
}

function compareWithBaseline(currentResult, baselineResult) {
  if (!baselineResult || !Array.isArray(baselineResult.findings)) {
    throw new Error("Baseline must be a service-boundary JSON report with a findings array.")
  }

  const currentActive = currentResult.findings.filter((finding) => !finding.allowed)
  const baselineActive = baselineResult.findings.filter((finding) => !finding.allowed)
  const baselineSummary = baselineResult.summary || summarize(baselineResult.findings)
  const currentSummary = currentResult.summary

  const baselineKeys = new Set(baselineActive.map(activeFindingKey))
  const currentKeys = new Set(currentActive.map(activeFindingKey))
  const newFindings = currentActive.filter((finding) => !baselineKeys.has(activeFindingKey(finding)))
  const resolvedFindings = baselineActive.filter((finding) => !currentKeys.has(activeFindingKey(finding)))
  const worsenedClassifications = []
  const classifications = new Set([
    ...Object.keys(currentSummary.byClassification),
    ...Object.keys(baselineSummary.byClassification || {}),
  ])

  for (const classification of classifications) {
    const currentCount = currentSummary.byClassification[classification] || 0
    const baselineCount = (baselineSummary.byClassification || {})[classification] || 0
    if (currentCount > baselineCount) {
      worsenedClassifications.push({
        classification,
        baselineCount,
        currentCount,
        delta: currentCount - baselineCount,
      })
    }
  }

  const activeViolationDelta = currentSummary.activeViolationCount - baselineSummary.activeViolationCount
  const failed =
    activeViolationDelta > 0 ||
    newFindings.length > 0 ||
    worsenedClassifications.length > 0

  return {
    failed,
    activeViolationDelta,
    baselineActiveViolationCount: baselineSummary.activeViolationCount,
    currentActiveViolationCount: currentSummary.activeViolationCount,
    newFindings,
    resolvedFindings,
    worsenedClassifications,
  }
}

function readBaseline(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function renderMarkdown({ root, mode, scanDirs, findings, summary, ratchet }, includeAllowed = false) {
  const active = findings
    .filter((finding) => !finding.allowed)
    .sort((a, b) => a.migrationOrder - b.migrationOrder || a.file.localeCompare(b.file) || a.line - b.line)
  const allowed = findings
    .filter((finding) => finding.allowed)
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  const lines = []

  lines.push("# AqStoqFlow Service Boundary Gate Report")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push(`Root: \`${root}\``)
  lines.push(`Mode: \`${mode}\``)
  lines.push(`Scan directories: ${scanDirs.map((dir) => `\`${dir}\``).join(", ")}`)
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Active service-boundary violations: ${summary.activeViolationCount}`)
  lines.push(`- Allowed test/mock/service findings: ${summary.allowedFindingCount}`)
  lines.push(`- Total callsites scanned: ${summary.totalFindings}`)
  lines.push("")
  lines.push("## Active Counts")
  lines.push("")

  if (Object.keys(summary.byClassification).length === 0) {
    lines.push("- No active service-boundary violations.")
  } else {
    for (const [classification, count] of Object.entries(summary.byClassification).sort()) {
      lines.push(`- ${classification}: ${count}`)
    }
  }

  lines.push("")
  lines.push("## Active Violations")
  lines.push("")

  if (active.length === 0) {
    lines.push("No active direct Prisma or action-owned mutation violations remain in the scanned runtime boundaries.")
  } else {
    lines.push("| Order | Severity | Classification | File | Line | Evidence | Reason |")
    lines.push("| ---: | --- | --- | --- | ---: | --- | --- |")
    for (const finding of active) {
      lines.push(
        `| ${finding.migrationOrder} | ${finding.severity} | ${finding.classification} | \`${finding.file}\` | ${finding.line} | \`${escapePipes(finding.snippet)}\` | ${escapePipes(finding.reason)} |`,
      )
    }
  }

  lines.push("")
  if (ratchet) {
    lines.push("## Baseline Ratchet")
    lines.push("")
    lines.push(`Baseline active violations: ${ratchet.baselineActiveViolationCount}`)
    lines.push(`Current active violations: ${ratchet.currentActiveViolationCount}`)
    lines.push(`Active violation delta: ${ratchet.activeViolationDelta}`)
    lines.push(`New active findings: ${ratchet.newFindings.length}`)
    lines.push(`Resolved active findings: ${ratchet.resolvedFindings.length}`)
    lines.push(`Worsened classifications: ${ratchet.worsenedClassifications.length}`)
    lines.push(`Ratchet status: ${ratchet.failed ? "failed" : "passed"}`)
    lines.push("")

    if (ratchet.worsenedClassifications.length > 0) {
      lines.push("### Worsened Classifications")
      lines.push("")
      lines.push("| Classification | Baseline | Current | Delta |")
      lines.push("| --- | ---: | ---: | ---: |")
      for (const item of ratchet.worsenedClassifications) {
        lines.push(`| ${item.classification} | ${item.baselineCount} | ${item.currentCount} | ${item.delta} |`)
      }
      lines.push("")
    }

    if (ratchet.newFindings.length > 0) {
      lines.push("### New Active Findings")
      lines.push("")
      lines.push("| Severity | Classification | File | Line | Evidence |")
      lines.push("| --- | --- | --- | ---: | --- |")
      for (const finding of ratchet.newFindings) {
        lines.push(`| ${finding.severity} | ${finding.classification} | \`${finding.file}\` | ${finding.line} | \`${escapePipes(finding.snippet)}\` |`)
      }
      lines.push("")
    }
  }

  lines.push("## Migration Order")
  lines.push("")
  lines.push("1. Migrate item, item detail, and inventory actions into service-owned workflows.")
  lines.push("2. Move App Router and API direct Prisma access behind protected service/read-model methods.")
  lines.push("3. Consolidate purchasing/AP call sites on the statutory purchasing service boundary.")
  lines.push("4. Replace hook-level persistence/type coupling with service-backed action/query DTOs.")
  lines.push("5. Replace component-level Prisma client coupling with UI DTOs.")
  lines.push("6. Migrate remaining action-owned mutations domain by domain.")
  lines.push("7. Turn this gate to fail mode after active violations reach zero or a reviewed baseline is introduced.")
  lines.push("")
  lines.push("## Enforcement Ladder")
  lines.push("")
  lines.push("- `report`: inventory current violations without blocking development.")
  lines.push("- `warn`: keep exit code 0 while surfacing the boundary breach in CI logs.")
  lines.push("- `fail`: exit non-zero when any active violation remains.")
  lines.push("")

  if (includeAllowed) {
    lines.push("## Allowed Findings")
    lines.push("")
    if (allowed.length === 0) {
      lines.push("No allowed findings.")
    } else {
      lines.push("| Classification | File | Line | Evidence |")
      lines.push("| --- | --- | ---: | --- |")
      for (const finding of allowed) {
        lines.push(`| ${finding.classification} | \`${finding.file}\` | ${finding.line} | \`${escapePipes(finding.snippet)}\` |`)
      }
    }
    lines.push("")
  }

  return lines.join(os.EOL)
}

function escapePipes(value) {
  return String(value).replace(/\|/g, "\\|")
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function main() {
  const args = parseArgs(process.argv)
  const result = scanRoot(args.root, args.scanDirs)
  const ratchet = args.baseline ? compareWithBaseline(result, readBaseline(args.baseline)) : null
  const report = {
    ...result,
    mode: args.mode,
    ratchet,
  }
  const markdown = renderMarkdown(report, args.includeAllowed)

  if (args.out) {
    ensureDirectory(args.out)
    fs.writeFileSync(args.out, `${markdown}${os.EOL}`, "utf8")
  }

  if (args.jsonOut) {
    ensureDirectory(args.jsonOut)
    fs.writeFileSync(args.jsonOut, `${JSON.stringify({ ...result, ratchet }, null, 2)}${os.EOL}`, "utf8")
  }

  console.log(markdown)

  if (args.mode === "warn" && ratchet?.failed) {
    console.warn(`Service boundary ratchet warning: ${ratchet.newFindings.length} new active finding(s).`)
  } else if (args.mode === "warn" && result.summary.activeViolationCount > 0) {
    console.warn(`Service boundary warning: ${result.summary.activeViolationCount} active violation(s).`)
  }

  if (args.mode === "fail" && ratchet?.failed) {
    console.error(`Service boundary ratchet failed: ${ratchet.newFindings.length} new active finding(s).`)
    process.exit(1)
  }

  if (args.mode === "fail" && !ratchet && result.summary.activeViolationCount > 0) {
    console.error(`Service boundary failed: ${result.summary.activeViolationCount} active violation(s).`)
    process.exit(1)
  }
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
}

module.exports = {
  classifyFinding,
  compareWithBaseline,
  renderMarkdown,
  scanFile,
  scanRoot,
  summarize,
}
