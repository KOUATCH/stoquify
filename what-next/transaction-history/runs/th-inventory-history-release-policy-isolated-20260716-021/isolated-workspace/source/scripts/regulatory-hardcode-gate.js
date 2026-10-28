#!/usr/bin/env node

require("ts-node/register")
require("tsconfig-paths/register")

const fs = require("fs")
const os = require("os")
const path = require("path")

const { scanRegulatoryHardcodes } = require("../services/regulatory/hardcode-detector.ts")

const MODES = new Set(["report", "warn", "fail"])

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
    else if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!MODES.has(args.mode)) throw new Error("--mode must be one of: report, warn, fail")
  return args
}

function printHelp() {
  console.log(`Regulatory hardcode gate

Usage:
  node scripts/regulatory-hardcode-gate.js [--mode report|warn|fail] [--out file] [--json-out file]

Modes:
  report  Generate findings and exit 0.
  warn    Generate findings, print a warning, and exit 0.
  fail    Exit 1 when active production regulatory hardcodes remain.
`)
}

function summarize(findings) {
  return findings.reduce(
    (summary, finding) => {
      summary.bySeverity[finding.severity] = (summary.bySeverity[finding.severity] || 0) + 1
      summary.byRule[finding.ruleId] = (summary.byRule[finding.ruleId] || 0) + 1
      return summary
    },
    {
      activeFindingCount: findings.length,
      bySeverity: {},
      byRule: {},
    },
  )
}

function render(result) {
  const lines = []
  lines.push("# Regulatory Hardcode Gate")
  lines.push("")
  lines.push(`Generated: ${result.generatedAt}`)
  lines.push(`Mode: \`${result.mode}\``)
  lines.push(`Status: \`${result.status}\``)
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Active findings: ${result.summary.activeFindingCount}`)
  lines.push("")
  lines.push("## Findings")
  lines.push("")

  if (result.findings.length === 0) {
    lines.push("No production regulatory hardcodes detected.")
  } else {
    lines.push("| Severity | Rule | File | Line | Suggested pack path |")
    lines.push("|---|---|---|---:|---|")
    for (const finding of result.findings) {
      lines.push(
        `| ${finding.severity} | ${finding.ruleId} | \`${finding.filePath}\` | ${finding.line} | \`${finding.suggestedPackPath}\` |`,
      )
    }
  }

  lines.push("")
  lines.push("## Gate Notes")
  lines.push("")
  lines.push("- Runtime services must resolve statutory values from versioned country packs or reviewed configuration.")
  lines.push("- Country-pack files, migrations, tests, fixtures, and seed data are not production statutory logic.")
  lines.push("- Payroll statutory expansion remains blocked unless country-pack provenance and expert-review states are explicit.")
  return lines.join(os.EOL)
}

function writeOutputs(result, args) {
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true })
    fs.writeFileSync(args.out, `${render(result)}${os.EOL}`, "utf8")
  }
  if (args.jsonOut) {
    fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true })
    fs.writeFileSync(args.jsonOut, `${JSON.stringify(result, null, 2)}${os.EOL}`, "utf8")
  }
}

async function main(argv = process.argv) {
  const args = parseArgs(argv)
  const findings = await scanRegulatoryHardcodes(args.root)
  const result = {
    generatedAt: new Date().toISOString(),
    mode: args.mode,
    status: findings.length === 0 ? "pass" : "fail",
    summary: summarize(findings),
    findings,
  }

  writeOutputs(result, args)
  console.log(render(result))
  return args.mode === "fail" && findings.length > 0 ? 1 : 0
}

if (require.main === module) {
  main()
    .then((code) => {
      process.exitCode = code
    })
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}

module.exports = { parseArgs, render, summarize }