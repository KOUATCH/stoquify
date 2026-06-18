#!/usr/bin/env node

const fs = require("fs")
const os = require("os")
const path = require("path")

const DEFAULT_SCAN_DIRS = ["actions", "app/api", "services", "lib/error-handling"]

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

const PATTERNS = [
  {
    name: "THROW_NEW_ERROR",
    expression: /\bthrow\s+new\s+Error\s*\(/,
  },
  {
    name: "THROW_ERROR",
    expression: /\bthrow\s+error\b/,
  },
  {
    name: "CONSOLE_ERROR",
    expression: /\bconsole\s*\.\s*error\s*\(/,
  },
  {
    name: "RAW_NEXT_ERROR_JSON",
    expression: /\bNextResponse\s*\.\s*json\s*\(\s*\{\s*error\b/,
  },
]

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
  console.log(`AqStoqFlow raw-error boundary gate

Usage:
  node scripts/raw-error-boundary-gate.js [--mode report|warn|fail] [--baseline file] [--out file] [--json-out file]

Modes:
  report  Classify current raw-error boundaries and exit 0.
  warn    Classify findings, print a warning, and exit 0.
  fail    Exit 1 when active unsafe raw-error findings remain or a baseline ratchet worsens.

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

function contextWindow(lines, index, radius = 4) {
  const start = Math.max(0, index - radius)
  const end = Math.min(lines.length, index + radius + 1)
  return lines.slice(start, end).join("\n")
}

function migrationOrderForFile(file) {
  if (file.startsWith("actions/auth") || file.startsWith("actions/roles/") || file.startsWith("actions/users/")) return 1
  if (
    file.startsWith("actions/units/") ||
    file.startsWith("actions/tax") ||
    file.startsWith("actions/locations/") ||
    file.startsWith("actions/suppliers/") ||
    file.startsWith("actions/customers/")
  ) {
    return 2
  }
  if (file.startsWith("app/api/") && (file.includes("upload") || file.includes("receipt"))) return 3
  if (file.startsWith("app/api/")) return 4
  if (file.startsWith("services/pos/")) return 5
  if (file.startsWith("services/purchase-order/")) return 6
  if (file.startsWith("services/")) return 7
  if (file.startsWith("lib/error-handling/")) return 0
  return 8
}

function classifyFinding(file, pattern, context) {
  if (isTestOrMockPath(file)) {
    return {
      allowed: true,
      severity: "allowed",
      classification: "TEST_ONLY",
      migrationOrder: 0,
      reason: "Tests and mocks may assert or simulate raw error behavior.",
      replacement: "Keep test-only raw errors isolated from runtime boundaries.",
    }
  }

  if (pattern === "THROW_ERROR" && isNextControlFlowRethrow(context)) {
    return {
      allowed: true,
      severity: "allowed",
      classification: "ALLOWED_CONTROL_FLOW",
      migrationOrder: 0,
      reason: "Next.js redirect/not-found control flow must be rethrown instead of normalized.",
      replacement: "Keep framework control-flow rethrows explicit.",
    }
  }

  if (file.startsWith("lib/error-handling/")) {
    return {
      allowed: true,
      severity: "allowed",
      classification: "INTERNAL_LOGGING_ONLY",
      migrationOrder: 0,
      reason: "Canonical error-handling internals may log sanitized operator metadata.",
      replacement: "Keep public callers on canonical safe envelopes.",
    }
  }

  if (file.startsWith("actions/") || file.startsWith("app/api/")) {
    return {
      allowed: false,
      severity: pattern === "CONSOLE_ERROR" ? "medium" : "high",
      classification: "CLIENT_BOUNDARY_UNSAFE",
      migrationOrder: migrationOrderForFile(file),
      reason: "Client-facing server actions and route handlers must return canonical safe envelopes and avoid raw internal error leakage.",
      replacement: file.startsWith("app/api/")
        ? "Use jsonErrorResponse, jsonAuthzError, or jsonMethodNotAllowed from lib/error-handling/route-response."
        : "Use protect, toSafeActionError, or the canonical server-action wrapper instead of raw throws/logging.",
    }
  }

  if (file.startsWith("services/") && pattern === "THROW_NEW_ERROR") {
    return {
      allowed: false,
      severity: "medium",
      classification: "SERVICE_RAW_DOMAIN_ERROR",
      migrationOrder: migrationOrderForFile(file),
      reason: "Service business-rule failures should use typed domain errors with stable codes and user-safe messages.",
      replacement: "Replace raw Error with BusinessRuleError, NotFoundError, ConflictError, AuthRequiredError, or ForbiddenError.",
    }
  }

  return {
    allowed: false,
    severity: "medium",
    classification: "NEEDS_MIGRATION",
    migrationOrder: migrationOrderForFile(file),
    reason: "Raw error handling remains outside the canonical migration pattern.",
    replacement: "Migrate to the canonical error mapper or add a reviewed runtime-boundary classification.",
  }
}

function isNextControlFlowRethrow(context) {
  return (
    context.includes("isNextControlFlowError(error)") ||
    context.includes("isRedirectError(error)") ||
    context.includes("NEXT_REDIRECT") ||
    context.includes("NEXT_NOT_FOUND")
  )
}

function scanFile(root, filePath) {
  const file = toRepoPath(root, filePath)
  const text = fs.readFileSync(filePath, "utf8")
  const lines = text.split(/\r?\n/)
  const findings = []

  lines.forEach((line, index) => {
    if (isCommentLine(line)) return

    for (const pattern of PATTERNS) {
      if (!pattern.expression.test(line)) continue

      const trimmed = line.trim()
      const context = contextWindow(lines, index)
      const classification = classifyFinding(file, pattern.name, context)

      findings.push({
        file,
        line: index + 1,
        pattern: pattern.name,
        snippet: trimmed,
        context,
        ...classification,
      })
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

function findingKey(finding) {
  return [finding.file, finding.line, finding.pattern, finding.classification, finding.snippet].join("|")
}

function activeFindings(result) {
  return result.findings.filter((finding) => !finding.allowed)
}

function compareWithBaseline(current, baseline) {
  if (!baseline || !Array.isArray(baseline.findings)) {
    throw new Error("Baseline must be a raw-error boundary JSON report with a findings array.")
  }

  const baselineActive = activeFindings(baseline)
  const currentActive = activeFindings(current)
  const baselineKeys = new Set(baselineActive.map(findingKey))
  const currentKeys = new Set(currentActive.map(findingKey))
  const newFindings = currentActive.filter((finding) => !baselineKeys.has(findingKey(finding)))
  const resolvedFindings = baselineActive.filter((finding) => !currentKeys.has(findingKey(finding)))
  const baselineCounts = baseline.summary?.byClassification || summarize(baseline.findings).byClassification
  const currentCounts = current.summary.byClassification
  const worsenedClassifications = []

  for (const classification of new Set([...Object.keys(baselineCounts), ...Object.keys(currentCounts)])) {
    const baselineCount = baselineCounts[classification] || 0
    const currentCount = currentCounts[classification] || 0
    if (currentCount > baselineCount) {
      worsenedClassifications.push({
        classification,
        baselineCount,
        currentCount,
        delta: currentCount - baselineCount,
      })
    }
  }

  return {
    baselineActiveViolationCount: baselineActive.length,
    currentActiveViolationCount: currentActive.length,
    activeViolationDelta: currentActive.length - baselineActive.length,
    newFindings,
    resolvedFindings,
    worsenedClassifications,
    failed: newFindings.length > 0 || worsenedClassifications.length > 0,
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

  lines.push("# AqStoqFlow Raw Error Boundary Gate Report")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push("")
  lines.push(`Root: \`${root}\``)
  lines.push(`Mode: \`${mode}\``)
  lines.push(`Scan directories: ${scanDirs.map((dir) => `\`${dir}\``).join(", ")}`)
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Active unsafe raw-error findings: ${summary.activeViolationCount}`)
  lines.push(`- Allowed classified findings: ${summary.allowedFindingCount}`)
  lines.push(`- Total raw-error callsites scanned: ${summary.totalFindings}`)
  lines.push("")
  lines.push("## Active Counts")
  lines.push("")

  if (Object.keys(summary.byClassification).length === 0) {
    lines.push("- No active unsafe raw-error findings.")
  } else {
    for (const [classification, count] of Object.entries(summary.byClassification).sort()) {
      lines.push(`- ${classification}: ${count}`)
    }
  }

  lines.push("")
  lines.push("## Active Findings")
  lines.push("")

  if (active.length === 0) {
    lines.push("No active unsafe raw-error findings remain in the scanned runtime boundaries.")
  } else {
    lines.push("| Order | Severity | Classification | File | Line | Pattern | Evidence | Replacement | Reason |")
    lines.push("| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |")
    for (const finding of active) {
      lines.push(
        `| ${finding.migrationOrder} | ${finding.severity} | ${finding.classification} | \`${finding.file}\` | ${finding.line} | ${finding.pattern} | \`${escapePipes(finding.snippet)}\` | ${escapePipes(finding.replacement)} | ${escapePipes(finding.reason)} |`,
      )
    }
  }

  lines.push("")
  lines.push("## Allowed Classification Counts")
  lines.push("")

  if (Object.keys(summary.allowedByClassification).length === 0) {
    lines.push("- No allowed raw-error findings were classified.")
  } else {
    for (const [classification, count] of Object.entries(summary.allowedByClassification).sort()) {
      lines.push(`- ${classification}: ${count}`)
    }
  }

  if (ratchet) {
    lines.push("")
    lines.push("## Baseline Ratchet")
    lines.push("")
    lines.push(`Baseline active findings: ${ratchet.baselineActiveViolationCount}`)
    lines.push(`Current active findings: ${ratchet.currentActiveViolationCount}`)
    lines.push(`Active finding delta: ${ratchet.activeViolationDelta}`)
    lines.push(`New active findings: ${ratchet.newFindings.length}`)
    lines.push(`Resolved active findings: ${ratchet.resolvedFindings.length}`)
    lines.push(`Worsened classifications: ${ratchet.worsenedClassifications.length}`)
    lines.push(`Ratchet status: ${ratchet.failed ? "failed" : "passed"}`)
  }

  lines.push("")
  lines.push("## Migration Order")
  lines.push("")
  lines.push("1. Migrate role, user, and auth action boundaries.")
  lines.push("2. Migrate unit, tax-rate, location, supplier, and customer management actions.")
  lines.push("3. Migrate upload, receipt, and remaining App Router API routes.")
  lines.push("4. Replace POS raw service errors with typed domain errors.")
  lines.push("5. Replace purchase-order raw service errors with typed domain errors.")
  lines.push("6. Keep this gate in report mode until active client-boundary leakage reaches zero or has reviewed allowlist entries.")
  lines.push("")
  lines.push("## Enforcement Ladder")
  lines.push("")
  lines.push("- `report`: classify current raw-error findings without blocking development.")
  lines.push("- `warn`: exit 0 while surfacing active unsafe raw-error findings in logs.")
  lines.push("- `fail`: exit non-zero when active unsafe findings remain, or when a baseline ratchet gets worse.")
  lines.push("")

  if (includeAllowed) {
    lines.push("## Allowed Findings")
    lines.push("")
    if (allowed.length === 0) {
      lines.push("No allowed findings.")
    } else {
      lines.push("| Classification | File | Line | Pattern | Evidence | Reason |")
      lines.push("| --- | --- | ---: | --- | --- | --- |")
      for (const finding of allowed) {
        lines.push(
          `| ${finding.classification} | \`${finding.file}\` | ${finding.line} | ${finding.pattern} | \`${escapePipes(finding.snippet)}\` | ${escapePipes(finding.reason)} |`,
        )
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
  const report = { ...result, mode: args.mode, ratchet }
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
    console.warn(`Raw-error boundary ratchet warning: ${ratchet.newFindings.length} new active finding(s).`)
  } else if (args.mode === "warn" && result.summary.activeViolationCount > 0) {
    console.warn(`Raw-error boundary warning: ${result.summary.activeViolationCount} active unsafe finding(s).`)
  }

  if (args.mode === "fail" && ratchet?.failed) {
    console.error(`Raw-error boundary ratchet failed: ${ratchet.newFindings.length} new active finding(s).`)
    process.exit(1)
  }

  if (args.mode === "fail" && !ratchet && result.summary.activeViolationCount > 0) {
    console.error(`Raw-error boundary gate failed: ${result.summary.activeViolationCount} active unsafe finding(s).`)
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
