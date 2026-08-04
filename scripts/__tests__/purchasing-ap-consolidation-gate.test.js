const fs = require("fs")
const os = require("os")
const path = require("path")

const { buildPurchasingAPReadiness, gateResultForReport } = require("../purchasing-ap-consolidation-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "purchasing-ap-gate-"))
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function writeReadyFixture(root) {
  write(
    root,
    "services/purchase-order/purchase-order.service.ts",
    [
      "po.createdById === approvedById",
      "must be approved by a different user",
      'action: "APPROVE_PURCHASE_ORDER"',
      "postGoodsReceiptStock(",
      "Cannot replace purchase order lines after receipt or invoice evidence exists.",
      "export async function receiveItems",
      "db.$transaction(async (tx)",
      "tx.goodsReceipt.create(",
      "tx.goodsReceiptLine.create(",
      "tx.purchaseOrderLine.update(",
      "await applyInventoryReceipt(tx,",
      "export async function bulkUpdateStatus",
    ].join("\n"),
  )
  write(
    root,
    "services/purchasing/ap-control.service.ts",
    [
      "export async function approveSupplierInvoice",
      "Supplier invoice posting requires an independent approver.",
      "tx.supplierInvoice.updateMany(",
      "makerCheckerVerified: true",
      "tx.goodsReceiptLine.findFirst(",
      "Supplier invoice quantity exceeds received and uninvoiced goods.",
      "Supplier invoice unit cost does not match goods receipt cost",
      "tx.threeWayMatch.create(",
      "ThreeWayMatchStatus.MATCHED",
      "threeWayMatchId: match.id",
      "approveSupplierPaymentWithControls",
      "releaseSupplierPaymentWithControls",
      "A separate approver is required before approving supplier payments.",
      "A separate releaser is required from the supplier payment approver before release.",
      "SupplierBankAccountStatus.APPROVED",
      "Payment is blocked while a supplier bank change is pending approval.",
      "queueOutboundSupplierPaymentReconciliation(tx,",
      "async function createAPLedgerPosting",
      "createLedgerPostingBatch(",
      "tx.journalEntry.create(",
      "linkAccountingSource(",
      'action: "PURCHASING_AP_LEDGER_POSTED"',
      "tx.ledgerAuditEvent.create(",
      "recordPostedJournalCloseInvalidationInTx(",
      "journalEntryId: journalEntry.id",
      "periodId: input.periodId",
      "correlationId: postedBatch.id",
      "async function queueOutboundSupplierPaymentReconciliation",
    ].join("\n"),
  )
  write(
    root,
    "actions/purchasing/ap-control.actions.ts",
    [
      "export async function prepareSupplierInvoiceAction",
      "const approveAndPostInvoice",
      "freshAuth: true",
      "approveSupplierInvoice(parsed)",
      "export async function postSupplierInvoiceAction",
      "const requestBankChange",
    ].join("\n"),
  )
  write(
    root,
    "actions/purchasing/__tests__/ap-control.actions.test.ts",
    ["fails closed before invoice posting when fresh authentication is unavailable"].join("\n"),
  )
  write(
    root,
    "services/purchasing/__tests__/ap-control.service.test.ts",
    ["rejects a supplier invoice when maker and approver are the same actor"].join("\n"),
  )
  write(
    root,
    "scripts/hard-delete-gate.js",
    ['delegate === "purchaseOrderLine"', 'classification: "DRAFT_CLEANUP"'].join("\n"),
  )
  write(
    root,
    "services/assurance/assurance-registry.service.ts",
    [
      '"purchasing_ap.po_approval_receipt_trace.required"',
      '"purchasing_ap.goods_receipt_stock_movement.required"',
      '"purchasing_ap.supplier_invoice_three_way_match.required"',
      '"purchasing_ap.supplier_invoice_posting_proof.required"',
      '"purchasing_ap.released_payment_evidence.required"',
      '"purchasing_ap.supplier_bank_pending_release.blocked"',
    ].join("\n"),
  )
  write(
    root,
    "package.json",
    '{"scripts":{"purchasing:ap:gate":"node gate","policy:gates":"npm run purchasing:ap:gate"}}',
  )
}

describe("purchasing AP consolidation gate", () => {
  it("passes a complete purchasing/AP evidence spine", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)

    const report = buildPurchasingAPReadiness(root, { mode: "fail" })

    expect(report.summary).toMatchObject({
      status: "ready",
      readyCount: 11,
      blockerCount: 0,
    })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks when posted AP journals lose close invalidation", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, "services/purchasing/ap-control.service.ts")
    fs.writeFileSync(
      target,
      fs.readFileSync(target, "utf8").replace("recordPostedJournalCloseInvalidationInTx(", "closeInvalidationMissing("),
      "utf8",
    )

    const report = buildPurchasingAPReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("ap_posting_close_invalidation")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks when supplier invoices lose received-quantity evidence", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, "services/purchasing/ap-control.service.ts")
    fs.writeFileSync(
      target,
      fs
        .readFileSync(target, "utf8")
        .replace("Supplier invoice quantity exceeds received and uninvoiced goods.", "quantity check missing"),
      "utf8",
    )

    const report = buildPurchasingAPReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("supplier_invoice_receipt_and_variance_controls")
  })

  it("blocks when supplier invoice approval loses fresh-auth maker-checker enforcement", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, "actions/purchasing/ap-control.actions.ts")
    fs.writeFileSync(target, fs.readFileSync(target, "utf8").replace("freshAuth: true", "freshAuth: false"), "utf8")

    const report = buildPurchasingAPReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("supplier_invoice_maker_checker")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })
})
