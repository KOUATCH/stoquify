const fs = require("fs")
const path = require("path")
const { writeGeneratedReportFile } = require("./generated-report-writer")

const DEFAULT_JSON_OUT = "what-next/purchasing-ap-consolidation-readiness.json"
const DEFAULT_MARKDOWN_OUT = "what-next/purchasing-ap-consolidation-readiness.md"

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

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  if (start < 0) return ""
  const end = source.indexOf(endMarker, start + startMarker.length)
  return end < 0 ? source.slice(start) : source.slice(start, end)
}

function buildPurchasingAPReadiness(root = process.cwd(), options = {}) {
  const purchaseOrder = read(root, "services/purchase-order/purchase-order.service.ts")
  const apControl = read(root, "services/purchasing/ap-control.service.ts")
  const apActions = read(root, "actions/purchasing/ap-control.actions.ts")
  const apActionTests = read(root, "actions/purchasing/__tests__/ap-control.actions.test.ts")
  const apServiceTests = read(root, "services/purchasing/__tests__/ap-control.service.test.ts")
  const hardDeleteGate = read(root, "scripts/hard-delete-gate.js")
  const assurance = read(root, "services/assurance/assurance-registry.service.ts")
  const packageJson = read(root, "package.json")
  const receiptSection = section(
    purchaseOrder,
    "export async function receiveItems",
    "export async function bulkUpdateStatus",
  )
  const apPostingSection = section(
    apControl,
    "async function createAPLedgerPosting",
    "async function queueOutboundSupplierPaymentReconciliation",
  )
  const invoiceApprovalActionSection = section(apActions, "const approveAndPostInvoice", "const requestBankChange")

  const checks = [
    {
      id: "purchase_order_maker_checker",
      ready:
        purchaseOrder.includes("po.createdById === approvedById") &&
        purchaseOrder.includes("must be approved by a different user") &&
        purchaseOrder.includes('action: "APPROVE_PURCHASE_ORDER"'),
    },
    {
      id: "goods_receipt_atomic_stock_posting",
      ready:
        purchaseOrder.includes("postGoodsReceiptStock(") &&
        markersInOrder(receiptSection, [
          "db.$transaction(async (tx)",
          "tx.goodsReceipt.create(",
          "tx.goodsReceiptLine.create(",
          "tx.purchaseOrderLine.update(",
          "await applyInventoryReceipt(tx,",
        ]),
    },
    {
      id: "evidence_preserving_line_cleanup",
      ready:
        purchaseOrder.includes("Cannot replace purchase order lines after receipt or invoice evidence exists.") &&
        hardDeleteGate.includes('delegate === "purchaseOrderLine"') &&
        hardDeleteGate.includes('classification: "DRAFT_CLEANUP"'),
    },
    {
      id: "supplier_invoice_maker_checker",
      ready:
        apActions.includes("prepareSupplierInvoiceAction") &&
        apActions.includes("postSupplierInvoiceAction") &&
        invoiceApprovalActionSection.includes("freshAuth: true") &&
        invoiceApprovalActionSection.includes("approveSupplierInvoice(parsed)") &&
        apControl.includes("export async function approveSupplierInvoice") &&
        apControl.includes("Supplier invoice posting requires an independent approver.") &&
        apControl.includes("tx.supplierInvoice.updateMany(") &&
        apControl.includes("makerCheckerVerified: true") &&
        apActionTests.includes("fails closed before invoice posting when fresh authentication is unavailable") &&
        apServiceTests.includes("rejects a supplier invoice when maker and approver are the same actor"),
    },
    {
      id: "supplier_invoice_receipt_and_variance_controls",
      ready:
        apControl.includes("tx.goodsReceiptLine.findFirst(") &&
        apControl.includes("Supplier invoice quantity exceeds received and uninvoiced goods.") &&
        apControl.includes("Supplier invoice unit cost does not match goods receipt cost"),
    },
    {
      id: "supplier_invoice_three_way_match_evidence",
      ready:
        apControl.includes("tx.threeWayMatch.create(") &&
        apControl.includes("ThreeWayMatchStatus.MATCHED") &&
        apControl.includes("threeWayMatchId: match.id"),
    },
    {
      id: "ap_ledger_source_and_audit_proof",
      ready:
        apPostingSection.includes("createLedgerPostingBatch(") &&
        apPostingSection.includes("tx.journalEntry.create(") &&
        apPostingSection.includes("linkAccountingSource(") &&
        apPostingSection.includes('action: "PURCHASING_AP_LEDGER_POSTED"'),
    },
    {
      id: "ap_posting_close_invalidation",
      ready:
        markersInOrder(apPostingSection, [
          "linkAccountingSource(",
          "tx.ledgerAuditEvent.create(",
          "recordPostedJournalCloseInvalidationInTx(",
        ]) &&
        apPostingSection.includes("journalEntryId: journalEntry.id") &&
        apPostingSection.includes("periodId: input.periodId") &&
        apPostingSection.includes("correlationId: postedBatch.id"),
    },
    {
      id: "supplier_payment_maker_checker",
      ready:
        apControl.includes("approveSupplierPaymentWithControls") &&
        apControl.includes("releaseSupplierPaymentWithControls") &&
        apControl.includes("A separate approver is required before approving supplier payments.") &&
        apControl.includes("A separate releaser is required from the supplier payment approver before release."),
    },
    {
      id: "supplier_destination_and_reconciliation_controls",
      ready:
        apControl.includes("SupplierBankAccountStatus.APPROVED") &&
        apControl.includes("Payment is blocked while a supplier bank change is pending approval.") &&
        apControl.includes("queueOutboundSupplierPaymentReconciliation(tx,"),
    },
    {
      id: "assurance_and_policy_wiring",
      ready:
        assurance.includes('"purchasing_ap.po_approval_receipt_trace.required"') &&
        assurance.includes('"purchasing_ap.goods_receipt_stock_movement.required"') &&
        assurance.includes('"purchasing_ap.supplier_invoice_three_way_match.required"') &&
        assurance.includes('"purchasing_ap.supplier_invoice_posting_proof.required"') &&
        assurance.includes('"purchasing_ap.released_payment_evidence.required"') &&
        assurance.includes('"purchasing_ap.supplier_bank_pending_release.blocked"') &&
        packageJson.includes('"purchasing:ap:gate"') &&
        packageJson.includes("npm run purchasing:ap:gate"),
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
    "# Purchasing AP Consolidation Readiness Gate",
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
    "- It does not post inventory, journals, invoices, or supplier payments.",
    "- It verifies internal control seams, not supplier, bank, tax, or statutory certification.",
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
    const report = buildPurchasingAPReadiness(root, options)
    writeReport(root, options, report)
    console.log(renderMarkdown(report))
    process.exitCode = gateResultForReport(report, options.mode).exitCode
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

module.exports = {
  buildPurchasingAPReadiness,
  gateResultForReport,
  markersInOrder,
  parseArgs,
  renderMarkdown,
  section,
}
