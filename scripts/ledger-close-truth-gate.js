const fs = require("fs")
const path = require("path")
const { writeGeneratedReportFile } = require("./generated-report-writer")

const DEFAULT_JSON_OUT = "what-next/ledger-close-truth-readiness.json"
const DEFAULT_MARKDOWN_OUT = "what-next/ledger-close-truth-readiness.md"

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    mode: "report",
    root: process.cwd(),
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--mode") options.mode = argv[++index]
    else if (value === "--root") options.root = argv[++index]
    else if (value === "--out") options.out = argv[++index]
    else if (value === "--json-out") options.jsonOut = argv[++index]
    else throw new Error("Unknown argument: " + value)
  }

  if (!["report", "fail"].includes(options.mode)) throw new Error("Unsupported mode: " + options.mode)
  return options
}

function read(root, relativePath) {
  const target = path.join(root, relativePath)
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""
}

function markersInOrder(source, markers) {
  let cursor = -1
  for (const marker of markers) {
    cursor = source.indexOf(marker, cursor + 1)
    if (cursor < 0) return false
  }
  return true
}

function buildLedgerCloseTruthReadiness(root = process.cwd(), options = {}) {
  const helper = read(root, "services/accounting/journal-close-invalidation.service.ts")
  const manual = read(root, "services/accounting/posting.service.ts")
  const sale = read(root, "services/accounting/postings/post-sale.ts")
  const payment = read(root, "services/accounting/postings/post-payment.ts")
  const reversal = read(root, "services/accounting/postings/pos-reversal-helpers.ts")

  const checks = [
    {
      id: "posted_journal_close_helper",
      ready: helper.includes("recordPostedJournalCloseInvalidationInTx") &&
        helper.includes('sourceCode: "LEDGER_JOURNAL_POSTED"') &&
        helper.includes("newEvidenceHash: input.journalEntryId"),
    },
    {
      id: "reversed_journal_close_helper",
      ready: helper.includes("recordReversedJournalCloseInvalidationsInTx") &&
        helper.includes('sourceCode: "LEDGER_JOURNAL_REVERSED"') &&
        helper.includes("originalPeriodId") && helper.includes("reversalPeriodId"),
    },
    {
      id: "same_period_reversal_deduplication",
      ready: helper.includes("new Set([input.originalPeriodId, input.reversalPeriodId])"),
    },
    {
      id: "manual_posting_invalidation",
      ready: markersInOrder(manual, [
        "await linkAccountingSource(",
        "await postingAudit(tx,",
        "await recordPostedJournalCloseInvalidationInTx(",
      ]),
    },
    {
      id: "manual_reversal_invalidation",
      ready: manual.includes("originalPeriodId: original.periodId") &&
        manual.includes("reversalPeriodId: period.id") &&
        manual.includes("await recordReversedJournalCloseInvalidationsInTx("),
    },
    {
      id: "pos_sale_invalidation",
      ready: markersInOrder(sale, [
        "await createAccountingSourceLink(",
        "await salePostingAudit(tx,",
        "await recordPostedJournalCloseInvalidationInTx(",
      ]),
    },
    {
      id: "pos_payment_invalidation",
      ready: markersInOrder(payment, [
        "await createAccountingSourceLink(",
        "await paymentPostingAudit(tx,",
        "await recordPostedJournalCloseInvalidationInTx(",
      ]),
    },
    {
      id: "pos_refund_void_invalidation",
      ready: markersInOrder(reversal, [
        "await createAccountingSourceLink(",
        "await reversalPostingAudit(tx,",
        "await recordPostedJournalCloseInvalidationInTx(",
      ]),
    },
    {
      id: "posting_period_targeting",
      ready: [sale, payment, reversal].every((source) =>
        source.includes("periodId: period.id") && source.includes("entryDate")),
    },
    {
      id: "posting_correlation_evidence",
      ready: [manual, sale, payment, reversal].every((source) => source.includes("correlationId: postedBatch.id")),
    },
  ]

  const blockers = checks.filter((check) => !check.ready).map((check) => check.id)
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
    },
    checks,
    blockers,
  }
}

function gateResultForReport(report, mode = "report") {
  return {
    status: report.summary.status,
    exitCode: mode === "fail" && report.blockers.length ? 1 : 0,
  }
}

function renderMarkdown(report) {
  const lines = [
    "# Ledger Close Truth Readiness Gate",
    "",
    "Generated: " + report.summary.generatedAt,
    "Mode: " + report.summary.mode,
    "Status: " + report.summary.status,
    "",
    "## Summary",
    "",
    "- Checks ready: " + report.summary.readyCount + "/" + report.summary.checkCount,
    "- Blockers: " + report.summary.blockerCount,
    "",
    "## Checks",
    "",
    ...report.checks.map((check) => "- " + (check.ready ? "ready" : "blocked") + ": " + check.id),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length ? report.blockers.map((blocker) => "- " + blocker) : ["- None"]),
    "",
    "## Safety",
    "",
    "- This gate is static and read-only.",
    "- It verifies posting-to-close evidence seams; focused tests verify runtime behavior.",
    "- It does not certify SYSCOHADA account mappings or statutory financial statements.",
  ]
  return lines.join(String.fromCharCode(10)) + String.fromCharCode(10)
}

function writeReport(root, options, report) {
  const jsonTarget = path.resolve(root, options.jsonOut)
  const markdownTarget = path.resolve(root, options.out)
  writeGeneratedReportFile(jsonTarget, JSON.stringify(report, null, 2) + String.fromCharCode(10), "utf8")
  writeGeneratedReportFile(markdownTarget, renderMarkdown(report), "utf8")
}

if (require.main === module) {
  try {
    const options = parseArgs()
    const root = path.resolve(options.root)
    const report = buildLedgerCloseTruthReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildLedgerCloseTruthReadiness,
  gateResultForReport,
  markersInOrder,
  parseArgs,
  renderMarkdown,
}
