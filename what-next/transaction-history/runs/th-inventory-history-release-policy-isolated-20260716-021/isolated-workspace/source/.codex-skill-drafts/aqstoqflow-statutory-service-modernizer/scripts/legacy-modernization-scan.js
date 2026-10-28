#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const args = process.argv.slice(2)

function argValue(name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const root = path.resolve(argValue("--root", process.cwd()))
const outPath = argValue("--out", null)
const jsonOutPath = argValue("--json-out", null)
const mode = argValue("--mode", "report")

const includeDirs = ["app", "actions", "components", "hooks", "services", "lib"]
const skipDirs = new Set(["node_modules", ".next", ".git", "coverage", "dist", "build"])
const sourceExt = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(path.join(dir, entry.name), acc)
      continue
    }
    if (sourceExt.has(path.extname(entry.name))) acc.push(path.join(dir, entry.name))
  }
  return acc
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, "/")
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length
}

function addFinding(findings, severity, category, file, line, evidence, recommendation) {
  findings.push({
    severity,
    category,
    file: rel(file),
    line,
    evidence: evidence.trim().slice(0, 240),
    recommendation,
  })
}

function scanFile(file, findings) {
  const text = fs.readFileSync(file, "utf8")
  const relative = rel(file)
  const normalized = relative.replaceAll("\\", "/")
  const isApp = normalized.startsWith("app/")
  const isAction = normalized.startsWith("actions/")
  const isComponent = normalized.startsWith("components/")
  const isHook = normalized.startsWith("hooks/")
  const isService = normalized.startsWith("services/")
  const isRoute = /\/route\.(ts|tsx|js|jsx)$/.test(normalized)

  const directPrismaImport = /from\s+["']@\/prisma\/db["']|from\s+["']@\/lib\/prisma["']|new\s+PrismaClient|@prisma\/client/.exec(text)
  if (directPrismaImport && (isApp || isComponent || isHook)) {
    addFinding(
      findings,
      "high",
      "direct-prisma-outside-service",
      file,
      lineNumber(text, directPrismaImport.index),
      directPrismaImport[0],
      "Move data access into a protected service; keep routes/pages/hooks/components orchestration-only.",
    )
  }

  if (isAction && /from\s+["']@\/prisma\/db["']/.test(text)) {
    const mutationRegex = /\b(db|tx)\.[a-zA-Z0-9_]+\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/g
    let match
    while ((match = mutationRegex.exec(text))) {
      addFinding(
        findings,
        "high",
        "action-owned-mutation",
        file,
        lineNumber(text, match.index),
        match[0],
        "Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate.",
      )
    }
  }

  const hardDeleteRegex = /\b(db|tx)\.[a-zA-Z0-9_]+\.(delete|deleteMany)\s*\(/g
  let deleteMatch
  while ((deleteMatch = hardDeleteRegex.exec(text))) {
    if (isAction || isService || isApp) {
      addFinding(
        findings,
        "high",
        "hard-delete-review",
        file,
        lineNumber(text, deleteMatch.index),
        deleteMatch[0],
        "Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion.",
      )
    }
  }

  const mockRegex = /Mock implementation|mockItems|mockTransactions|mockAdjustments|mockTransfers|demo route|dummy|sample data|faker\b/gi
  let mockMatch
  while ((mockMatch = mockRegex.exec(text))) {
    addFinding(
      findings,
      "medium",
      "mock-demo-production-risk",
      file,
      lineNumber(text, mockMatch.index),
      mockMatch[0],
      "Remove production-visible mock data or quarantine it behind explicit demo-only boundaries.",
    )
  }

  const rawErrorRegex = /throw\s+new\s+Error\s*\(|console\.error\s*\(|throw\s+error\b/g
  let errorMatch
  while ((errorMatch = rawErrorRegex.exec(text))) {
    if (isAction || isRoute || isService) {
      addFinding(
        findings,
        "medium",
        "raw-error-handling",
        file,
        lineNumber(text, errorMatch.index),
        errorMatch[0],
        "Use typed domain errors and safe action/route error mapping.",
      )
    }
  }

  if ((isComponent || isHook) && /from\s+["']@\/services\//.test(text)) {
    addFinding(
      findings,
      "medium",
      "ui-service-import",
      file,
      lineNumber(text, text.search(/from\s+["']@\/services\//)),
      "from '@/services/..'",
      "UI and hooks should call actions/API surfaces, not business-rule services directly.",
    )
  }
}

const files = includeDirs.flatMap((dir) => walk(path.join(root, dir)))
const findings = []
for (const file of files) scanFile(file, findings)

function bySeverity(a, b) {
  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  return (order[a.severity] ?? 99) - (order[b.severity] ?? 99) || a.file.localeCompare(b.file) || a.line - b.line
}

findings.sort(bySeverity)

const byCategory = findings.reduce((acc, finding) => {
  acc[finding.category] = (acc[finding.category] || 0) + 1
  return acc
}, {})

const summary = {
  generatedAt: new Date().toISOString(),
  root,
  mode,
  filesScanned: files.length,
  findings: findings.length,
  byCategory,
}

function markdown() {
  const lines = []
  lines.push("# AqStoqFlow Statutory Service Modernization Scan")
  lines.push("")
  lines.push(`Generated: ${summary.generatedAt}`)
  lines.push("")
  lines.push(`Root: \`${root}\``)
  lines.push("")
  lines.push(`Mode: \`${mode}\``)
  lines.push("")
  lines.push(`Files scanned: ${summary.filesScanned}`)
  lines.push("")
  lines.push(`Findings: ${summary.findings}`)
  lines.push("")
  lines.push("## Category Counts")
  lines.push("")
  for (const [category, count] of Object.entries(byCategory).sort()) {
    lines.push(`- ${category}: ${count}`)
  }
  lines.push("")
  lines.push("## Findings")
  lines.push("")
  if (findings.length === 0) {
    lines.push("No findings.")
  } else {
    lines.push("| Severity | Category | File | Line | Evidence | Recommendation |")
    lines.push("| --- | --- | --- | ---: | --- | --- |")
    for (const finding of findings) {
      lines.push(`| ${finding.severity} | ${finding.category} | \`${finding.file}\` | ${finding.line} | \`${finding.evidence.replaceAll("|", "\\|")}\` | ${finding.recommendation} |`)
    }
  }
  lines.push("")
  lines.push("## Next Step")
  lines.push("")
  lines.push("Treat this as a report-mode inventory. Migrate one category/domain at a time, add regression tests, then ratchet the relevant scanner to fail mode after findings reach zero or have precise allowlist entries.")
  lines.push("")
  return lines.join("\n")
}

const md = markdown()
if (outPath) {
  const resolved = path.resolve(root, outPath)
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  fs.writeFileSync(resolved, md)
} else {
  console.log(md)
}

if (jsonOutPath) {
  const resolved = path.resolve(root, jsonOutPath)
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  fs.writeFileSync(resolved, JSON.stringify({ summary, findings }, null, 2))
}

if (mode === "fail" && findings.length > 0) {
  console.error(`Statutory modernization gate failed with ${findings.length} findings.`)
  process.exit(1)
}
