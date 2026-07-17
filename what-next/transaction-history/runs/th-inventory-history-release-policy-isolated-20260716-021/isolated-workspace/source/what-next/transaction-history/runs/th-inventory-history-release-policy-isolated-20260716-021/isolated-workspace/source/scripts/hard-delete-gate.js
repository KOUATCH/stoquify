#!/usr/bin/env node

const fs = require("fs")
const os = require("os")
const path = require("path")

const DEFAULT_SCAN_DIRS = ["actions", "services", "app", "hooks", "components"]

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

const EVIDENCE_DELEGATES = new Set([
  "accountingPeriod",
  "auditLog",
  "businessEvent",
  "cashDrawerTransaction",
  "closeEvidenceItem",
  "closeExport",
  "closeFinding",
  "closeRun",
  "complianceEvidence",
  "fiscalDocument",
  "goodsReceipt",
  "goodsReceiptLine",
  "inventoryTransaction",
  "journalEntry",
  "journalEntryLine",
  "ledgerAuditEvent",
  "ledgerPostingBatch",
  "payment",
  "paymentRefund",
  "purchaseOrder",
  "purchaseOrderLine",
  "salesOrder",
  "salesOrderLine",
  "stockAdjustment",
  "stockAdjustmentLine",
  "stockCount",
  "stockTransfer",
  "stockTransferLine",
  "supplierInvoice",
  "supplierInvoiceLine",
  "supplierPayment",
])

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    mode: "report",
    out: null,
    jsonOut: null,
    includeAllowed: false,
    scanDirs: [...DEFAULT_SCAN_DIRS],
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--json-out") args.jsonOut = path.resolve(argv[++index])
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
  console.log(`AqStoqFlow hard-delete gate

Usage:
  node scripts/hard-delete-gate.js [--mode report|warn|fail] [--out file] [--json-out file]

Modes:
  report  Classify hard deletes and exit 0.
  warn    Classify hard deletes, print a warning, and exit 0.
  fail    Exit 1 when active unsafe hard-delete findings remain.
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

function isTestMockOrSeedPath(file) {
  return (
    file.includes("/__tests__/") ||
    file.includes("/__mocks__/") ||
    file.includes("/prisma/seed") ||
    file.includes("/prisma/production-seed") ||
    /\.test\.[jt]sx?$/.test(file) ||
    /\.spec\.[jt]sx?$/.test(file)
  )
}

function isCommentLine(line) {
  return /^\s*(\/\/|\*|\/\*)/.test(line)
}

function contextWindow(lines, index, radius = 12) {
  const start = Math.max(0, index - radius)
  const end = Math.min(lines.length, index + radius + 1)
  return lines.slice(start, end).join("\n")
}

function classifyFinding(file, details) {
  const { delegate, operation, snippet, window, fileText } = details

  if (isTestMockOrSeedPath(file)) {
    return {
      allowed: true,
      severity: "allowed",
      classification: "TEST_OR_SEED_ONLY",
      migrationOrder: 0,
      replacement: "No runtime remediation required.",
      reason: "Tests, mocks, and seed reset scripts may physically delete disposable setup data.",
    }
  }

  if (!file.startsWith("services/")) {
    return {
      allowed: false,
      severity: file.startsWith("actions/") ? "high" : "medium",
      classification: "ACTION_OWNED_DELETE",
      migrationOrder: migrationOrderForFile(file),
      replacement: "Move the delete decision behind the owning service and expose only validation/orchestration from this boundary.",
      reason: `${delegate}.${operation} is outside the service-owned delete policy boundary.`,
    }
  }

  if (file === "services/auth/password-policy.ts" && delegate === "passwordHistory" && operation === "deleteMany") {
    return {
      allowed: true,
      severity: "allowed",
      classification: "CONFIG_RETENTION_CLEANUP",
      migrationOrder: 0,
      replacement: "Retain bounded password history depth.",
      reason: "Password history pruning is non-economic retention cleanup scoped to a single user after recording the new hash.",
    }
  }

  if (file === "services/accounting/posting-rules.service.ts" && delegate === "postingRuleLine" && operation === "deleteMany") {
    return {
      allowed: true,
      severity: "allowed",
      classification: "CONFIG_REPLACEMENT_CLEANUP",
      migrationOrder: 0,
      replacement: "Keep inside posting-rule service with posting-rule audit evidence.",
      reason: "Posting rule line replacement is configuration cleanup inside the accounting service and the workflow records posting rule audit evidence.",
    }
  }

  if (file === "services/purchase-order/purchase-order.service.ts" && delegate === "purchaseOrderLine") {
    const hasDraftGuard =
      fileText.includes("LINE_RECONCILIATION_STATUSES") &&
      fileText.includes("Cannot replace purchase order lines after receipt or invoice evidence exists.")
    if (hasDraftGuard) {
      return {
        allowed: true,
        severity: "allowed",
        classification: "DRAFT_CLEANUP",
        migrationOrder: 0,
        replacement: "Keep guarded draft-only reconciliation with audit evidence.",
        reason: "Purchase-order line cleanup is limited to draft/submitted orders and rejects receipt or invoice evidence before physical removal.",
      }
    }
  }

  if (
    file === "services/pos/pos.service.ts" &&
    delegate === "salesOrderLine" &&
    /status:\s*["']DRAFT["']/.test(fileText) &&
    fileText.includes("updatePOSCartLine") &&
    fileText.includes("removePOSCartLine")
  ) {
    return {
      allowed: true,
      severity: "allowed",
      classification: "DRAFT_CLEANUP",
      migrationOrder: 0,
      replacement: "Keep draft-cart cleanup before sale commit.",
      reason: "POS line cleanup is constrained to the current user's draft cart before fiscal, payment, inventory, or ledger evidence exists.",
    }
  }

  if (file === "services/supplier/supplier.service.ts" && delegate === "itemSupplier" && operation === "delete") {
    return {
      allowed: true,
      severity: "allowed",
      classification: "CONFIG_RELATIONSHIP_CLEANUP",
      migrationOrder: 0,
      replacement: "Keep service-owned catalog relationship cleanup scoped through active item and supplier ownership.",
      reason: "Item-supplier removal deletes a catalog relationship row through the supplier service after tenant scoping, not a posted purchase, receipt, invoice, payment, ledger, or compliance evidence record.",
    }
  }

  if (EVIDENCE_DELEGATES.has(delegate)) {
    return {
      allowed: false,
      severity: "critical",
      classification: "FORBIDDEN_EVIDENCE_DELETE",
      migrationOrder: migrationOrderForFile(file),
      replacement: "Replace with cancellation, reversal, soft delete, or a typed forbidden-operation error.",
      reason: `${delegate}.${operation} can erase economic, audit, ledger, inventory, purchasing, POS, close, or compliance evidence.`,
    }
  }

  return {
    allowed: false,
    severity: "medium",
    classification: "UNKNOWN_REVIEW",
    migrationOrder: migrationOrderForFile(file),
    replacement: "Classify as draft cleanup, retention cleanup, soft delete, cancellation, reversal, or forbidden evidence delete.",
    reason: `${delegate}.${operation} requires explicit hard-delete policy classification.`,
  }
}

function migrationOrderForFile(file) {
  if (file.includes("purchase-order") || file.includes("purchasing") || file.includes("/purchases")) return 1
  if (file.includes("pos")) return 2
  if (file.includes("accounting") || file.includes("close") || file.includes("compliance")) return 3
  if (file.includes("inventory") || file.includes("item")) return 4
  if (file.startsWith("actions/")) return 5
  if (file.startsWith("app/")) return 6
  if (file.startsWith("hooks/")) return 7
  if (file.startsWith("components/")) return 8
  return 9
}

function makeFinding(root, file, line, snippet, details) {
  const classification = classifyFinding(file, details)
  return {
    file,
    line,
    snippet,
    ...details,
    window: undefined,
    fileText: undefined,
    ...classification,
    root: undefined,
  }
}

function scanFile(root, filePath) {
  const file = toRepoPath(root, filePath)
  const text = fs.readFileSync(filePath, "utf8")
  const lines = text.split(/\r?\n/)
  const findings = []

  lines.forEach((line, index) => {
    if (isCommentLine(line)) return

    const deletePattern = /\b(db|prisma|tx)\s*\.\s*([A-Za-z_]\w*)\s*\.\s*(delete|deleteMany)\s*\(/g
    let match
    while ((match = deletePattern.exec(line)) !== null) {
      const [, client, delegate, operation] = match
      const snippet = line.trim()
      const window = contextWindow(lines, index)
      findings.push(
        makeFinding(root, file, index + 1, snippet, {
          client,
          delegate,
          operation,
          window,
          fileText: text,
        }),
      )
    }
  })

  return findings
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
  const allowedByClassification = {}

  for (const finding of active) {
    byClassification[finding.classification] = (byClassification[finding.classification] || 0) + 1
    bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1
  }

  for (const finding of allowed) {
    allowedByClassification[finding.classification] = (allowedByClassification[finding.classification] || 0) + 1
  }

  return {
    activeViolationCount: active.length,
    allowedFindingCount: allowed.length,
    totalFindings: findings.length,
    byClassification,
    bySeverity,
    allowedByClassification,
  }
}

function renderMarkdown({ root, mode, scanDirs, findings, summary }, includeAllowed = false) {
  const active = findings
    .filter((finding) => !finding.allowed)
    .sort((a, b) => a.migrationOrder - b.migrationOrder || a.file.localeCompare(b.file) || a.line - b.line)
  const allowed = findings
    .filter((finding) => finding.allowed)
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  const lines = []

  lines.push("# AqStoqFlow Hard Delete Gate Report")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push(`Root: \`${root}\``)
  lines.push(`Mode: \`${mode}\``)
  lines.push(`Scan directories: ${scanDirs.map((dir) => `\`${dir}\``).join(", ")}`)
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Active unsafe hard-delete findings: ${summary.activeViolationCount}`)
  lines.push(`- Allowed classified hard deletes: ${summary.allowedFindingCount}`)
  lines.push(`- Total delete callsites scanned: ${summary.totalFindings}`)
  lines.push("")
  lines.push("## Active Counts")
  lines.push("")

  if (Object.keys(summary.byClassification).length === 0) {
    lines.push("- No active unsafe hard-delete findings.")
  } else {
    for (const [classification, count] of Object.entries(summary.byClassification).sort()) {
      lines.push(`- ${classification}: ${count}`)
    }
  }

  lines.push("")
  lines.push("## Active Findings")
  lines.push("")

  if (active.length === 0) {
    lines.push("No active unsafe hard-delete findings remain in the scanned runtime boundaries.")
  } else {
    lines.push("| Order | Severity | Classification | File | Line | Evidence | Replacement | Reason |")
    lines.push("| ---: | --- | --- | --- | ---: | --- | --- | --- |")
    for (const finding of active) {
      lines.push(
        `| ${finding.migrationOrder} | ${finding.severity} | ${finding.classification} | \`${finding.file}\` | ${finding.line} | \`${escapePipes(finding.snippet)}\` | ${escapePipes(finding.replacement)} | ${escapePipes(finding.reason)} |`,
      )
    }
  }

  lines.push("")
  lines.push("## Allowed Classification Counts")
  lines.push("")

  if (Object.keys(summary.allowedByClassification).length === 0) {
    lines.push("- No allowed hard deletes were classified.")
  } else {
    for (const [classification, count] of Object.entries(summary.allowedByClassification).sort()) {
      lines.push(`- ${classification}: ${count}`)
    }
  }

  if (includeAllowed) {
    lines.push("")
    lines.push("## Allowed Findings")
    lines.push("")
    if (allowed.length === 0) {
      lines.push("No allowed findings.")
    } else {
      lines.push("| Classification | File | Line | Evidence | Reason |")
      lines.push("| --- | --- | ---: | --- | --- |")
      for (const finding of allowed) {
        lines.push(
          `| ${finding.classification} | \`${finding.file}\` | ${finding.line} | \`${escapePipes(finding.snippet)}\` | ${escapePipes(finding.reason)} |`,
        )
      }
    }
  }

  lines.push("")
  lines.push("## Enforcement Ladder")
  lines.push("")
  lines.push("- `report`: classify current hard deletes without blocking development.")
  lines.push("- `warn`: exit 0 while surfacing active unsafe hard deletes in logs.")
  lines.push("- `fail`: exit non-zero when active unsafe hard deletes remain.")
  lines.push("")

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
  const report = { ...result, mode: args.mode }
  const markdown = renderMarkdown(report, args.includeAllowed)

  if (args.out) {
    ensureDirectory(args.out)
    fs.writeFileSync(args.out, `${markdown}${os.EOL}`, "utf8")
  }

  if (args.jsonOut) {
    ensureDirectory(args.jsonOut)
    fs.writeFileSync(args.jsonOut, `${JSON.stringify(result, null, 2)}${os.EOL}`, "utf8")
  }

  console.log(markdown)

  if (args.mode === "warn" && result.summary.activeViolationCount > 0) {
    console.warn(`Hard-delete warning: ${result.summary.activeViolationCount} active unsafe finding(s).`)
  }

  if (args.mode === "fail" && result.summary.activeViolationCount > 0) {
    console.error(`Hard-delete gate failed: ${result.summary.activeViolationCount} active unsafe finding(s).`)
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
  renderMarkdown,
  scanFile,
  scanRoot,
  summarize,
}
