#!/usr/bin/env node

const fs = require("fs")
const os = require("os")
const path = require("path")

const MODES = new Set(["report", "warn", "fail"])

const REQUIRED_INDEXES = [
  {
    id: "incident_status_severity_date",
    label: "organization + status + severity + detected date",
    pattern: /@@index\(\[organizationId,\s*status,\s*severity,\s*lastDetectedAt\]\)/,
  },
  {
    id: "incident_workflow_status",
    label: "organization + workflow + status",
    pattern: /@@index\(\[organizationId,\s*workflow,\s*status\]\)/,
  },
  {
    id: "incident_owner_due",
    label: "organization + owner + status + due date",
    pattern: /@@index\(\[organizationId,\s*ownerId,\s*status,\s*dueAt\]\)/,
  },
  {
    id: "run_status_started",
    label: "organization + run status + started date",
    pattern: /@@index\(\[organizationId,\s*runStatus,\s*startedAt\]\)/,
  },
  {
    id: "run_source_lookup",
    label: "organization + source type + source id",
    pattern: /@@index\(\[organizationId,\s*sourceType,\s*sourceId\]\)/,
  },
  {
    id: "alert_delivery_status",
    label: "organization + alert delivery status",
    pattern: /@@index\(\[organizationId,\s*status,\s*createdAt\]\)/,
  },
]

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
  console.log(`Workflow Assurance release gate

Usage:
  node scripts/workflow-assurance-release-gate.js [--mode report|warn|fail] [--out file] [--json-out file]

Modes:
  report  Generate assurance readiness evidence and exit 0.
  warn    Generate evidence, print blockers, and exit 0.
  fail    Exit 1 when enforce-mode blockers remain.
`)
}

function evaluateWorkflowAssuranceReleaseGate(root = process.cwd()) {
  const resolvedRoot = path.resolve(root)
  const contractsText = readText(resolvedRoot, "services/assurance/assurance-registry-contracts.ts")
  const registryText = readText(resolvedRoot, "services/assurance/assurance-registry.service.ts")
  const registryTestText = readText(resolvedRoot, "services/assurance/__tests__/assurance-registry.service.test.ts")
  const controlTowerText = readText(resolvedRoot, "services/assurance/assurance-control-tower.service.ts")
  const schedulerText = readText(resolvedRoot, "services/assurance/assurance-scheduler.service.ts")
  const schemaText = readText(resolvedRoot, "prisma/schema.prisma")
  const definitions = extractDefinitions(contractsText)
  const checkResults = definitions.map((definition) =>
    evaluateDefinition(definition, {
      registryText,
      registryTestText,
      schedulerText,
    }),
  )
  const indexResults = REQUIRED_INDEXES.map((index) => ({
    id: index.id,
    label: index.label,
    passed: index.pattern.test(schemaText),
  }))
  const engineHealthResults = [
    {
      id: "control_tower_engine_health",
      label: "Control Tower exposes stale run, failed run, pending alert, and failed alert health",
      passed:
        /staleRunningCount/.test(controlTowerText) &&
        /failedRunCount/.test(controlTowerText) &&
        /pendingAlertCount/.test(controlTowerText) &&
        /failedAlertCount/.test(controlTowerText),
    },
    {
      id: "scheduler_policy",
      label: "Scheduler policy classifies execution modes and cursor fields",
      passed: /WORKFLOW_ASSURANCE_SCHEDULER_POLICIES/.test(schedulerText) && /cursorFields/.test(schedulerText),
    },
  ]
  const blockers = [
    ...checkResults.flatMap((result) =>
      result.blockers.map((blocker) => ({
        area: result.checkKey,
        blocker,
      })),
    ),
    ...indexResults.filter((item) => !item.passed).map((item) => ({ area: "indexes", blocker: item.label })),
    ...engineHealthResults.filter((item) => !item.passed).map((item) => ({ area: "engine_health", blocker: item.label })),
  ]

  return {
    generatedAt: new Date().toISOString(),
    root: resolvedRoot,
    summary: {
      checkCount: definitions.length,
      readyCheckCount: checkResults.filter((result) => result.blockers.length === 0).length,
      indexCount: indexResults.length,
      readyIndexCount: indexResults.filter((result) => result.passed).length,
      engineHealthCount: engineHealthResults.length,
      readyEngineHealthCount: engineHealthResults.filter((result) => result.passed).length,
      blockerCount: blockers.length,
      enforceModeStatus: blockers.length > 0 ? "blocked" : "ready",
    },
    checks: checkResults,
    indexes: indexResults,
    engineHealth: engineHealthResults,
    blockers,
  }
}

function evaluateDefinition(definition, context) {
  const blockers = []
  if (!definition.ownerRole) blockers.push("missing owner role")
  if (!definition.defaultSeverity) blockers.push("missing severity")
  if (!definition.executionMode) blockers.push("missing execution mode")
  if (!definition.actionRoute) blockers.push("missing action route")
  if (!definition.requiredPermission) blockers.push("missing required permission")
  if (!definition.sourceTables) blockers.push("missing source tables")
  if (!definition.assuranceDomain) blockers.push("missing assurance domain")
  if (!new RegExp(`${escapeRegExp(definition.checkKey)}"\\s*:\\s*run`).test(context.registryText)) {
    blockers.push("missing registered runner")
  }
  if (!/createAssuranceSourceHash/.test(context.registryText)) blockers.push("missing source hash strategy")
  if (!/evidenceLinks\s*:/.test(context.registryText)) blockers.push("missing proof/evidence link emission")
  if (!context.registryTestText.includes(definition.checkKey)) blockers.push("missing clean or broken fixture test reference")
  if (!context.schedulerText.includes(definition.executionMode)) blockers.push("missing scheduler mode policy")

  return {
    checkKey: definition.checkKey,
    executionMode: definition.executionMode,
    ownerRole: definition.ownerRole,
    actionRoute: definition.actionRoute,
    enforceMode: definition.enforceMode === "true",
    blockers,
  }
}

function extractDefinitions(text) {
  const definitions = []
  const matches = Array.from(text.matchAll(/checkKey:\s*"([^"]+)"/g))
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const start = match.index ?? 0
    const end = matches[index + 1]?.index ?? text.length
    const block = text.slice(start, end)
    definitions.push({
      checkKey: match[1],
      ownerRole: stringField(block, "ownerRole"),
      defaultSeverity: stringField(block, "defaultSeverity"),
      executionMode: stringField(block, "executionMode"),
      actionRoute: stringField(block, "actionRoute"),
      requiredPermission: stringField(block, "requiredPermission"),
      sourceTables: /\bsourceTables\s*:\s*\[[^\]]+\]/.test(block),
      assuranceDomain: /assuranceDomain\s*:\s*"[^"]+"/.test(block),
      enforceMode: String(/\benforceMode\s*:\s*true/.test(block)),
    })
  }
  return definitions
}

function stringField(block, field) {
  const match = new RegExp(`${field}:\\s*"([^"]+)"`).exec(block)
  return match ? match[1] : ""
}

function readText(root, file) {
  const absolute = path.join(root, file)
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : ""
}

function renderMarkdown(report, mode = "report") {
  const lines = []
  lines.push("# Workflow Assurance Scheduler Release Gate Report")
  lines.push("")
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push(`Mode: \`${mode}\``)
  lines.push(`Root: \`${report.root}\``)
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Enforce-mode status: \`${report.summary.enforceModeStatus}\``)
  lines.push(`- Checks ready: ${report.summary.readyCheckCount}/${report.summary.checkCount}`)
  lines.push(`- Indexes ready: ${report.summary.readyIndexCount}/${report.summary.indexCount}`)
  lines.push(`- Engine-health gates ready: ${report.summary.readyEngineHealthCount}/${report.summary.engineHealthCount}`)
  lines.push(`- Blockers: ${report.summary.blockerCount}`)
  lines.push("")
  lines.push("## Check Readiness")
  lines.push("")
  lines.push("| Check | Mode | Owner | Action route | Blockers |")
  lines.push("| --- | --- | --- | --- | --- |")
  for (const check of report.checks) {
    lines.push(
      `| ${escapePipes(check.checkKey)} | ${check.executionMode} | ${escapePipes(check.ownerRole)} | ${escapePipes(check.actionRoute)} | ${escapePipes(check.blockers.join("; ") || "None")} |`,
    )
  }
  lines.push("")
  lines.push("## Indexes")
  lines.push("")
  for (const index of report.indexes) lines.push(`- ${index.passed ? "ready" : "missing"}: ${index.label}`)
  lines.push("")
  lines.push("## Engine Health")
  lines.push("")
  for (const item of report.engineHealth) lines.push(`- ${item.passed ? "ready" : "missing"}: ${item.label}`)
  lines.push("")
  lines.push("## Blockers")
  lines.push("")
  if (report.blockers.length === 0) {
    lines.push("No Workflow Assurance release blockers detected by this static gate.")
  } else {
    for (const blocker of report.blockers) lines.push(`- ${blocker.area}: ${blocker.blocker}`)
  }
  lines.push("")
  lines.push("## Safety Notes")
  lines.push("")
  lines.push("- This gate is static and read-only. It does not run checks, mutate tenants, or enable enforce-mode.")
  lines.push("- A check should stay observe-mode until owner, route, proof/source evidence, source hash, and tests are present.")
  return lines.join(os.EOL)
}

function writeOutputs(report, args) {
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true })
    fs.writeFileSync(args.out, renderMarkdown(report, args.mode), "utf8")
  }
  if (args.jsonOut) {
    fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true })
    fs.writeFileSync(args.jsonOut, `${JSON.stringify(report, null, 2)}${os.EOL}`, "utf8")
  }
}

function main(argv = process.argv) {
  const args = parseArgs(argv)
  const report = evaluateWorkflowAssuranceReleaseGate(args.root)
  writeOutputs(report, args)
  console.log(renderMarkdown(report, args.mode))
  if (args.mode === "warn" && report.summary.blockerCount > 0) {
    console.warn(`Workflow Assurance release gate found ${report.summary.blockerCount} blocker(s).`)
  }
  if (args.mode === "fail" && report.summary.blockerCount > 0) return 1
  return 0
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function escapePipes(value) {
  return String(value).replace(/\|/g, "\\|")
}

if (require.main === module) {
  process.exitCode = main(process.argv)
}

module.exports = {
  REQUIRED_INDEXES,
  evaluateWorkflowAssuranceReleaseGate,
  extractDefinitions,
  main,
  parseArgs,
  renderMarkdown,
}
