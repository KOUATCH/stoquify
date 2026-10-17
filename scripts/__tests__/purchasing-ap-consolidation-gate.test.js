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
      'import { assertPurchaseApprovalOrder } from "./purchase-order-approval"',
      "export async function approvePurchaseOrder",
      "db.$transaction(async (tx)",
      "assertPurchaseApprovalOrder(po, approvedById)",
      "tx.purchaseOrder.update(",
      'action: "APPROVE_PURCHASE_ORDER"',
      "export async function cancelPurchaseOrder",
      "async function applyInventoryReceipt",
      "await postGoodsReceiptStock(",
      "idempotencyKey:",
      "tx,",
      "// ── DTO transformer",
      "Cannot replace purchase order lines after receipt or invoice evidence exists.",
      "export async function receiveItems",
      "client ? work(client) : db.$transaction(work, { timeout: 15000 })",
      "await transaction(async (tx)",
      '"organizationId" = ${input.organizationId}',
      "FOR UPDATE",
      "idempotencyKey: input.idempotencyKey",
      "tx.goodsReceipt.create(",
      "tx.goodsReceiptLine.create(",
      "tx.purchaseOrderLine.updateMany(",
      "await applyInventoryReceipt(tx,",
      "function inspectionResolutionPayloadHash",
      "export async function resolveGoodsReceiptInspection",
      "client ? work(client) : db.$transaction(work, { timeout: 15000 })",
      "await transaction(async (tx)",
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
  write(root, "services/purchase-order/purchase-order-approval.ts", [
    "export function assertPurchaseApprovalOrder",
    'if (!order.createdById || order.createdById === actorId) throw new BusinessRuleError("Independent approver required", "SOD_VIOLATION")',
    "export async function purchaseApprovalAuthority",
  ].join("\n"))
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
      "export async function postSupplierInvoiceAction",
      'return { success: false as const, data: null, error: "Review the current invoice before submitting its approval.", code: "REVIEW_REQUIRED" as const, status: 422 as const }',
      'permission: "purchasing.ap.match.review"',
      "const requestBankChange",
    ].join("\n"),
  )
  write(root, "actions/purchasing/invoice-approval.actions.ts", [
    'requirePermission("purchasing.ap.invoice.post"',
    "const { claims } = await requireSession()",
    'if (claims.userId !== actor.userId || claims.tenantId !== actor.orgId) throw new ForbiddenError("Scope mismatch")',
    "return { organizationId: actor.orgId, actorId: actor.userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }",
    "await confirmInvoiceApproval(command, await scope())",
  ].join("\n"))
  write(root, "services/purchasing/invoice-approval.service.ts", [
    "db.$transaction(work, { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable })",
    "export async function confirmInvoiceApproval",
    "return transaction(async tx => {",
    'await invoicePostingAuthority(tx, scope, "submit", "approval")',
    'if (p.preview.revision !== command.expectedRevision) throw new ConflictError("Changed revision")',
    'if (p.preview.blockers.length) throw new BusinessRuleError("Blocked")',
    "await approveSupplierInvoice({ organizationId: scope.organizationId, supplierInvoiceId: command.invoiceId, approvedById: scope.actorId }, tx)",
    "export async function loadInvoiceApprovalSources",
  ].join("\n"))
  write(root, "services/purchasing/invoice-ledger-recovery-authority.ts", [
    '!hasRbacPermission(permissions, "purchasing.ap.invoice.post")',
    "id: scope.sessionId, token: scope.sessionToken, userId: scope.actorId, expiresAt: { gt: now }",
    'if (!session) throw new ForbiddenError("Expired")',
    'session.assuranceOrganizationId === scope.organizationId && session.assuranceMethod === "password"',
    "session.assuranceLevel >= 1 && session.assuranceVerifiedAt != null && session.assuranceVerifiedAt <= now",
    "now.getTime() - session.assuranceVerifiedAt.getTime() <= 300000",
    'if (operation === "submit" && !fresh) throw new BusinessRuleError("Verify password", "FRESH_AUTH_REQUIRED")',
  ].join("\n"))
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
  it.each([
    ["missing PO helper import", "services/purchase-order/purchase-order.service.ts", 'import { assertPurchaseApprovalOrder } from "./purchase-order-approval"', "", "purchase_order_maker_checker"],
    ["missing maker identity rejection", "services/purchase-order/purchase-order-approval.ts", "!order.createdById || ", "", "purchase_order_maker_checker"],
    ["missing independent approver rejection", "services/purchase-order/purchase-order-approval.ts", "order.createdById === actorId", "false", "purchase_order_maker_checker"],
    ["disconnected maker-checker helper", "services/purchase-order/purchase-order.service.ts", "assertPurchaseApprovalOrder(po, approvedById)", "", "purchase_order_maker_checker"],
    ["maker-checker after mutation", "services/purchase-order/purchase-order.service.ts", "assertPurchaseApprovalOrder(po, approvedById)\ntx.purchaseOrder.update(", "tx.purchaseOrder.update(\nassertPurchaseApprovalOrder(po, approvedById)", "purchase_order_maker_checker"],
    ["receiving ignores caller transaction", "services/purchase-order/purchase-order.service.ts", "client ? work(client) : db.$transaction(work, { timeout: 15000 })", "db.$transaction(work, { timeout: 15000 })", "goods_receipt_atomic_stock_posting"],
    ["receiving bypasses owned transaction", "services/purchase-order/purchase-order.service.ts", "await transaction(async (tx)", "await run(async (tx)", "goods_receipt_atomic_stock_posting"],
    ["inspection ignores caller transaction", "services/purchase-order/purchase-order.service.ts", "export async function resolveGoodsReceiptInspection\nclient ? work(client) : db.$transaction(work, { timeout: 15000 })", "export async function resolveGoodsReceiptInspection\ndb.$transaction(work)", "goods_receipt_atomic_stock_posting"],
    ["legacy invoice path bypasses review", "actions/purchasing/ap-control.actions.ts", "export async function postSupplierInvoiceAction", "export async function postSupplierInvoiceAction\nreturn approveSupplierInvoice(parsed)", "supplier_invoice_maker_checker"],
    ["legacy invoice path claims success", "actions/purchasing/ap-control.actions.ts", "success: false as const", "success: true as const", "supplier_invoice_maker_checker"],
    ["missing current invoice permission", "actions/purchasing/invoice-approval.actions.ts", 'requirePermission("purchasing.ap.invoice.post"', 'requirePermission("purchasing.ap.invoice.read"', "supplier_invoice_maker_checker"],
    ["missing current session scope match", "actions/purchasing/invoice-approval.actions.ts", "claims.tenantId !== actor.orgId", "false", "supplier_invoice_maker_checker"],
    ["client-supplied approval scope", "actions/purchasing/invoice-approval.actions.ts", "confirmInvoiceApproval(command, await scope())", "confirmInvoiceApproval(command, command.scope)", "supplier_invoice_maker_checker"],
    ["unbound session token", "services/purchasing/invoice-ledger-recovery-authority.ts", "token: scope.sessionToken, ", "", "supplier_invoice_maker_checker"],
    ["expired sessions accepted", "services/purchasing/invoice-ledger-recovery-authority.ts", "expiresAt: { gt: now }", "expiresAt: undefined", "supplier_invoice_maker_checker"],
    ["wrong fresh-auth organization", "services/purchasing/invoice-ledger-recovery-authority.ts", "session.assuranceOrganizationId === scope.organizationId", "true", "supplier_invoice_maker_checker"],
    ["stale password assurance accepted", "services/purchasing/invoice-ledger-recovery-authority.ts", "<= 300000", "<= 86400000", "supplier_invoice_maker_checker"],
    ["fresh-auth rejection removed", "services/purchasing/invoice-ledger-recovery-authority.ts", 'if (operation === "submit" && !fresh) throw new BusinessRuleError(', 'if (false) throw new BusinessRuleError(', "supplier_invoice_maker_checker"],
    ["approval authority omitted", "services/purchasing/invoice-approval.service.ts", 'await invoicePostingAuthority(tx, scope, "submit", "approval")', "", "supplier_invoice_maker_checker"],
    ["approval only checks read authority", "services/purchasing/invoice-approval.service.ts", 'scope, "submit", "approval"', 'scope, "review", "approval"', "supplier_invoice_maker_checker"],
    ["reviewed revision mismatch accepted", "services/purchasing/invoice-approval.service.ts", "p.preview.revision !== command.expectedRevision", "false", "supplier_invoice_maker_checker"],
    ["source blockers ignored", "services/purchasing/invoice-approval.service.ts", "if (p.preview.blockers.length)", "if (false)", "supplier_invoice_maker_checker"],
    ["posting leaves approval transaction", "services/purchasing/invoice-approval.service.ts", "approvedById: scope.actorId }, tx)", "approvedById: scope.actorId })", "supplier_invoice_maker_checker"],
    ["posting trusts caller actor", "services/purchasing/invoice-approval.service.ts", "approvedById: scope.actorId", "approvedById: command.approvedById", "supplier_invoice_maker_checker"],
  ])("blocks %s", (_label, relativePath, before, after, blocker) => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const target = path.join(root, relativePath)
    const source = fs.readFileSync(target, "utf8")
    expect(source).toContain(before)
    fs.writeFileSync(target, source.replace(before, after), "utf8")
    const report = buildPurchasingAPReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain(blocker)
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

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
