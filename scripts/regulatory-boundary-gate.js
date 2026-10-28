#!/usr/bin/env node

const fs = require("node:fs")
const path = require("node:path")

const SOURCE_ROOTS = ["actions", "app", "components", "hooks", "lib", "services"]
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"])
const DIRECT_COUNTRY_PACK_IMPORT =
  /(?:from\s+|require\(\s*|import\(\s*)["'][^"']*(?:regulatory\/)?country-packs\/(?:resolve|registry)["']/

function normalize(relativePath) {
  return relativePath.replaceAll("\\", "/")
}

function isAllowed(relativePath) {
  const normalized = normalize(relativePath)
  return (
    normalized.includes("/__tests__/") ||
    normalized.endsWith(".test.ts") ||
    normalized.endsWith(".test.tsx") ||
    normalized.startsWith("services/regulatory/adapters/") ||
    normalized.startsWith("services/regulatory/country-packs/")
  )
}

function collectFiles(root, relativeDirectory, files) {
  const absoluteDirectory = path.join(root, relativeDirectory)
  if (!fs.existsSync(absoluteDirectory)) return

  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) {
      collectFiles(root, relativePath, files)
      continue
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(relativePath)
  }
}

function buildRegulatoryBoundaryReport(root = process.cwd()) {
  const files = []
  for (const sourceRoot of SOURCE_ROOTS) collectFiles(root, sourceRoot, files)

  const violations = files
    .filter((relativePath) => !isAllowed(relativePath))
    .filter((relativePath) =>
      DIRECT_COUNTRY_PACK_IMPORT.test(
        fs.readFileSync(path.join(root, relativePath), "utf8"),
      ),
    )
    .map(normalize)
    .sort()

  return {
    status: violations.length === 0 ? "READY" : "BLOCKED",
    checkedFiles: files.length,
    violations,
    allowedBoundary: "services/regulatory/regulatory-capability.service.ts",
  }
}

function renderReport(report) {
  const lines = [
    "# Regulatory Import Boundary",
    "",
    `Status: **${report.status}**`,
    `Checked files: ${report.checkedFiles}`,
    `Approved boundary: \`${report.allowedBoundary}\``,
    "",
    "Direct country-pack imports outside the adapter are prohibited.",
  ]

  if (report.violations.length) {
    lines.push("", "## Violations", "")
    for (const violation of report.violations) lines.push(`- \`${violation}\``)
  }

  return `${lines.join("\n")}\n`
}

function parseMode(argv) {
  const index = argv.indexOf("--mode")
  return index >= 0 ? argv[index + 1] : "report"
}

if (require.main === module) {
  const report = buildRegulatoryBoundaryReport()
  process.stdout.write(renderReport(report))
  if (parseMode(process.argv.slice(2)) === "fail" && report.status !== "READY") {
    process.exitCode = 1
  }
}

module.exports = {
  buildRegulatoryBoundaryReport,
  renderReport,
}

