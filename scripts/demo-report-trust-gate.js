#!/usr/bin/env node

const fs = require("fs")
const os = require("os")
const path = require("path")

const DEFAULT_SCAN_DIRS = ["actions", "app", "components", "lib", "services"]

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
    name: "MOCK_INVENTORY_EXPORT",
    expression: /\b(mockItems|mockTransactions|mockAdjustments|mockTransfers)\b/,
    reason: "Production inventory paths must use service-backed reads instead of exported mock data.",
  },
  {
    name: "MOCK_IMPLEMENTATION_MARKER",
    expression: /Mock implementation/i,
    reason: "Production monitoring and reports must expose real data or an explicit unavailable state.",
  },
  {
    name: "MOCK_MONITORING_METRIC",
    expression: /Mock value|Math\.random\s*\(\)\s*\*\s*30\s*\+\s*10/,
    reason: "Production monitoring metrics must not be randomly generated.",
  },
  {
    name: "DEMO_ROUTE_MARKER",
    expression: /demo route/i,
    reason: "Production App Router paths must not be labeled or maintained as demo routes.",
  },
  {
    name: "STALE_REPORT_TODO",
    expression: /TODO:\s*Update the import path/i,
    reason: "Production report components must not carry stale TODO import trust markers.",
  },
  {
    name: "SAMPLE_DATA_LABEL",
    expression: /Sample Data/,
    reason: "Production import templates must not be presented as sample business data.",
  },
]

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    mode: "report",
    out: null,
    jsonOut: null,
    scanDirs: [...DEFAULT_SCAN_DIRS],
  }

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--root") args.root = path.resolve(argv[++index])
    else if (arg === "--mode") args.mode = argv[++index]
    else if (arg === "--out") args.out = path.resolve(argv[++index])
    else if (arg === "--json-out") args.jsonOut = path.resolve(argv[++index])
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
  console.log(`AqStoqFlow demo/report trust gate

Usage:
  node scripts/demo-report-trust-gate.js [--mode report|warn|fail] [--out file] [--json-out file]

Modes:
  report  Classify current production-visible demo/report trust findings and exit 0.
  warn    Print a warning when active findings remain and exit 0.
  fail    Exit 1 when active production-visible demo/report trust findings remain.
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

function classifyFinding(file, pattern) {
  if (isTestOrMockPath(file)) {
    return {
      allowed: true,
      classification: "TEST_ONLY",
      severity: "low",
      reason: "Tests and mocks may use mock/demo terminology.",
    }
  }

  return {
    allowed: false,
    classification: "PRODUCTION_TRUST_RISK",
    severity: pattern.name === "MOCK_MONITORING_METRIC" ? "high" : "medium",
    reason: pattern.reason,
  }
}

function scanFile(root, filePath) {
  const relative = toRepoPath(root, filePath)
  const contents = fs.readFileSync(filePath, "utf8")
  const lines = contents.split(/\r?\n/)
  const findings = []

  lines.forEach((line, index) => {
    for (const pattern of PATTERNS) {
      if (!pattern.expression.test(line)) continue
      const classification = classifyFinding(relative, pattern)
      findings.push({
        file: relative,
        line: index + 1,
        pattern: pattern.name,
        evidence: line.trim(),
        ...classification,
      })
    }
  })

  return findings
}

function summarize(findings) {
  const active = findings.filter((finding) => !finding.allowed)
  const allowed = findings.filter((finding) => finding.allowed)
  const activeByPattern = active.reduce((acc, finding) => {
    acc[finding.pattern] = (acc[finding.pattern] ?? 0) + 1
    return acc
  }, {})

  return {
    activeViolationCount: active.length,
    allowedFindingCount: allowed.length,
    totalFindings: findings.length,
    activeByPattern,
  }
}

function scanRoot(root = process.cwd(), scanDirs = DEFAULT_SCAN_DIRS) {
  const resolvedRoot = path.resolve(root)
  const files = scanDirs.flatMap((dir) => walk(path.join(resolvedRoot, dir), []))
  const findings = files.flatMap((file) => scanFile(resolvedRoot, file))
  return {
    generatedAt: new Date().toISOString(),
    root: resolvedRoot,
    scanDirs,
    findings,
    summary: summarize(findings),
  }
}

function renderMarkdown(report) {
  const lines = []
  lines.push("# AqStoqFlow Demo/Report Trust Gate Report")
  lines.push("")
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push("")
  lines.push(`Root: \`${report.root}\``)
  lines.push(`Mode: \`${report.mode ?? "report"}\``)
  lines.push(`Scan directories: ${report.scanDirs.map((dir) => `\`${dir}\``).join(", ")}`)
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Active production trust findings: ${report.summary.activeViolationCount}`)
  lines.push(`- Allowed test/mock findings: ${report.summary.allowedFindingCount}`)
  lines.push(`- Total findings scanned: ${report.summary.totalFindings}`)
  lines.push("")
  lines.push("## Active Counts")
  lines.push("")

  const activeEntries = Object.entries(report.summary.activeByPattern)
  if (activeEntries.length) {
    for (const [pattern, count] of activeEntries) {
      lines.push(`- ${pattern}: ${count}`)
    }
  } else {
    lines.push("- No active production-visible demo/report trust findings.")
  }

  lines.push("")
  lines.push("## Active Findings")
  lines.push("")
  const active = report.findings.filter((finding) => !finding.allowed)

  if (!active.length) {
    lines.push("No active production-visible demo/report trust findings remain.")
  } else {
    lines.push("| Severity | Classification | File | Line | Pattern | Evidence | Reason |")
    lines.push("| --- | --- | --- | ---: | --- | --- | --- |")
    for (const finding of active) {
      lines.push(
        `| ${finding.severity} | ${finding.classification} | \`${finding.file}\` | ${finding.line} | ${finding.pattern} | \`${escapePipes(finding.evidence)}\` | ${escapePipes(finding.reason)} |`,
      )
    }
  }

  lines.push("")
  lines.push("## Enforcement Ladder")
  lines.push("")
  lines.push("- `report`: classify current findings without blocking development.")
  lines.push("- `warn`: exit 0 while surfacing active findings in logs.")
  lines.push("- `fail`: exit non-zero when active production-visible demo/report trust findings remain.")

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
  const markdown = renderMarkdown(report)

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
    console.warn(`Demo/report trust warning: ${result.summary.activeViolationCount} active finding(s).`)
  }

  if (args.mode === "fail" && result.summary.activeViolationCount > 0) {
    console.error(`Demo/report trust gate failed: ${result.summary.activeViolationCount} active finding(s).`)
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
