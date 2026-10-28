const fs = require("fs")
const path = require("path")

const { buildModuleSurfaceInventory } = require("./module-surface-inventory")
const {
  classifyInventory,
  renderMarkdown: renderClassificationMarkdown,
} = require("../docs/skills-life-cycle/skills/stoquify-settings-surface-inventory-classifier/scripts/classify-settings-surfaces")

const ZERO_FINDINGS_BASELINE = 0

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    root: process.cwd(),
    out: "what-next/settings-surface-classification.md",
    jsonOut: "what-next/settings-surface-classification.json",
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--mode") options.mode = argv[++index]
    else if (value === "--root") options.root = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error(`Unknown argument: ${value}`)
  }

  if (!["report", "fail"].includes(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`)
  }

  return options
}

function gateStatusForFindingCount(activeFindingCount) {
  return activeFindingCount > ZERO_FINDINGS_BASELINE ? "blocked" : "ready"
}

function gateResultForReport(report, mode = "report") {
  const activeFindingCount = report.summary.activeFindingCount
  const status = gateStatusForFindingCount(activeFindingCount)
  return {
    mode,
    status,
    activeFindingCount,
    baselineActiveFindingCount: ZERO_FINDINGS_BASELINE,
    exitCode: mode === "fail" && status === "blocked" ? 1 : 0,
    message: activeFindingCount > ZERO_FINDINGS_BASELINE
      ? `Settings surface classification found ${activeFindingCount} active finding(s); baseline is zero.`
      : "Settings surface classification preserved the zero-findings baseline.",
  }
}

function buildSettingsSurfaceClassification(root = process.cwd(), options = {}) {
  const mode = options.mode || "report"
  const inventory = options.inventory || buildModuleSurfaceInventory(root, { mode: "report" })
  const report = classifyInventory(root, inventory)
  const gateResult = gateResultForReport(report, mode)

  report.summary.gate = {
    mode,
    status: gateResult.status,
    baselineActiveFindingCount: ZERO_FINDINGS_BASELINE,
    moduleEntitlementEnforcement: "report-only",
  }

  return report
}

function modeDescription(mode) {
  if (mode === "fail") {
    return "Fail mode: this gate exits non-zero when any settings surface requires review. Module entitlement enforcement remains report-only."
  }
  return "Report mode: this gate records settings classification findings without blocking. Module entitlement enforcement remains report-only."
}

function renderMarkdown(report) {
  const gate = report.summary.gate || {
    mode: "report",
    status: gateStatusForFindingCount(report.summary.activeFindingCount),
    baselineActiveFindingCount: ZERO_FINDINGS_BASELINE,
    moduleEntitlementEnforcement: "report-only",
  }
  const gateSection = [
    "## CI Ratchet",
    "",
    modeDescription(gate.mode),
    "",
    `- Gate status: ${gate.status}`,
    `- Gate mode: ${gate.mode}`,
    `- Active-finding baseline: ${gate.baselineActiveFindingCount}`,
    `- Current active findings: ${report.summary.activeFindingCount}`,
    `- Module entitlement enforcement: ${gate.moduleEntitlementEnforcement}`,
  ].join("\n")

  return renderClassificationMarkdown(report).replace("## Summary", `${gateSection}\n\n## Summary`)
}

function writeReport(root, options, report) {
  const jsonTarget = path.resolve(root, options.jsonOut)
  const markdownTarget = path.resolve(root, options.out)
  fs.mkdirSync(path.dirname(jsonTarget), { recursive: true })
  fs.mkdirSync(path.dirname(markdownTarget), { recursive: true })
  fs.writeFileSync(jsonTarget, `${JSON.stringify(report, null, 2)}\n`, "utf8")
  fs.writeFileSync(markdownTarget, renderMarkdown(report), "utf8")
  return { jsonTarget, markdownTarget }
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const root = path.resolve(options.root)
    const report = buildSettingsSurfaceClassification(root, { mode: options.mode })
    const gateResult = gateResultForReport(report, options.mode)
    const outputs = writeReport(root, options, report)
    console.log(`Settings surface classification wrote ${report.summary.recordCount} records to ${options.jsonOut}`)
    console.log(gateResult.message)
    console.log(`JSON: ${outputs.jsonTarget}`)
    console.log(`Markdown: ${outputs.markdownTarget}`)
    if (gateResult.exitCode !== 0) {
      for (const record of report.records.filter((item) => item.status === "review-required")) {
        console.error(`${record.file}: ${record.findings.join(", ")}`)
      }
      process.exitCode = gateResult.exitCode
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildSettingsSurfaceClassification,
  gateResultForReport,
  modeDescription,
  parseArgs,
  renderMarkdown,
  writeReport,
}
