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
      "async function applyInventoryReceipt",
      "await postGoodsReceiptStock(",
      "idempotencyKey:",
      "tx,",
      "// ── DTO transformer",
      "Cannot replace purchase order lines after receipt or invoice evidence exists.",
      "export async function receiveItems",
      "db.$transaction(async (tx)",
      '"organizationId" = ${input.organizationId}',
      "FOR UPDATE",
      "idempotencyKey: input.idempotencyKey",
      "tx.goodsReceipt.create(",
      "tx.goodsReceiptLine.create(",
      "tx.purchaseOrderLine.updateMany(",
      "await applyInventoryReceipt(tx,",
      "function inspectionResolutionPayloadHash",
      "export async function resolveGoodsReceiptInspection",
      "db.$transaction(async (tx)",
      'FROM "goods_receipts"',
      '"organizationId" = ${input.organizationId}',
      "FOR UPDATE",
      'FROM "purchase_orders"',
      '"organizationId" = ${input.organizationId}',
      "FOR UPDATE",
      "tx.goodsReceiptInspectionResolution.create(",
      "tx.purchaseOrderLine.updateMany(",
      "await applyInventoryReceipt(tx,",
      "tx.goodsReceipt.update(",
      "export async function bulkUpdateStatus",
    ].join("\n"),
  )
  write(
    root,
    "services/inventory/inventory-stock-event.service.ts",
    [
      "if (hasTransaction(client)) return client.$transaction(run)",
      "return run(client)",
      "export function postGoodsReceiptStock",
      "return postInventoryStockEvent(",
      "client,",
      "export function postPurchaseReturnStock",
    ].join("\n"),
  )
  write(
    root,
    "services/purchase-order/__tests__/purchase-receiving.postgres.test.ts",
    [
      'it("commits receipt evidence, ordered quantity, and stock posting as one unit"',
      'it("rolls back receipt evidence and ordered quantity when stock posting fails"',
      'it("holds failed inspection stock and releases it exactly once through authorized resolution"',
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
      "const requiresMatchException = varianceAmount.gt(0)",
      "EXACT_THREE_WAY_MATCH_EXCEPTION_POLICY_VERSION",
      "Supplier invoice posting is blocked until its exact-match variance has an approved active exception.",
      "status: SupplierInvoiceMatchExceptionStatus.APPROVED",
      "expiresAt: { gt: approvalAt }",
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
      'permission: "purchasing.ap.match.review"',
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
    [
      "rejects a supplier invoice when maker and approver are the same actor",
      "blocks disputed invoice posting without an approved active exception",
    ].join("\n"),
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

  it("blocks when invoice variance posting loses its approved-active exception gate", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, "services/purchasing/ap-control.service.ts")
    fs.writeFileSync(
      target,
      fs
        .readFileSync(target, "utf8")
        .replace(
          "Supplier invoice posting is blocked until its exact-match variance has an approved active exception.",
          "exception gate missing",
        ),
      "utf8",
    )

    const report = buildPurchasingAPReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("supplier_invoice_receipt_and_variance_controls")
  })

  it("blocks when receipt finalization loses its PostgreSQL row lock", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, "services/purchase-order/purchase-order.service.ts")
    fs.writeFileSync(target, fs.readFileSync(target, "utf8").replace("FOR UPDATE", "lock missing"), "utf8")

    const report = buildPurchasingAPReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("goods_receipt_atomic_stock_posting")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks when receipt evidence is no longer persisted before ordered quantity and stock posting", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, "services/purchase-order/purchase-order.service.ts")
    fs.writeFileSync(
      target,
      fs.readFileSync(target, "utf8").replace("tx.goodsReceiptLine.create(", "receipt line persistence missing"),
      "utf8",
    )

    const report = buildPurchasingAPReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("goods_receipt_atomic_stock_posting")
  })

  it("blocks when the inventory kernel stops consuming the caller transaction", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, "services/inventory/inventory-stock-event.service.ts")
    fs.writeFileSync(
      target,
      fs.readFileSync(target, "utf8").replace("return run(client)", "return db.$transaction(run)"),
      "utf8",
    )

    const report = buildPurchasingAPReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("goods_receipt_atomic_stock_posting")
  })

  it("blocks when receipt rollback certification evidence is removed", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, "services/purchase-order/__tests__/purchase-receiving.postgres.test.ts")
    fs.writeFileSync(
      target,
      fs
        .readFileSync(target, "utf8")
        .replace(
          'it("rolls back receipt evidence and ordered quantity when stock posting fails"',
          'it("rollback evidence removed"',
        ),
      "utf8",
    )

    const report = buildPurchasingAPReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("goods_receipt_atomic_stock_posting")
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
