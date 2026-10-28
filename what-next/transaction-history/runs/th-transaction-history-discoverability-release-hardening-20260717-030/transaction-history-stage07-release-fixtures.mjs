import fs from "node:fs"
import path from "node:path"

const runDir = path.join(
  "what-next",
  "transaction-history",
  "runs",
  "th-transaction-history-discoverability-release-hardening-20260717-030",
)
const outputPath = path.join(runDir, "transaction-history-stage07-release-fixtures-output.json")

function read(file) {
  return fs.readFileSync(file, "utf8")
}

function json(file) {
  return JSON.parse(read(file))
}

function includesAll(source, required) {
  return required.filter((needle) => !source.includes(needle))
}

function checkSource(id, file, required) {
  const source = read(file)
  const missing = includesAll(source, required)
  return {
    id,
    file,
    status: missing.length ? "FAIL" : "PASS",
    missing,
  }
}

const browserEvidence = json(path.join(runDir, "transaction-history-authenticated-browser-a11y-output.json"))

const checks = []

checks.push({
  id: "ROLE_MATRIX_AUTHENTICATED_BROWSER_PROOF",
  file: path.join(runDir, "transaction-history-authenticated-browser-a11y-output.json"),
  status:
    browserEvidence.status === "PASS" &&
    browserEvidence.auth?.role === "TRANSACTION_HISTORY_E2E" &&
    browserEvidence.results?.length === 6 &&
    browserEvidence.results.every(
      (item) =>
        item.finalUrl?.includes(item.path) &&
        item.seriousViolationCount === 0 &&
        item.hasDocumentOverflow === false,
    )
      ? "PASS"
      : "FAIL",
  evidence: {
    role: browserEvidence.auth?.role,
    resultCount: browserEvidence.results?.length ?? 0,
    routes: browserEvidence.routes?.map((route) => route.id) ?? [],
  },
})

checks.push(
  checkSource("ROLE_MATRIX_SEEDED_PERMISSIONS", "scripts/seed-transaction-history-e2e-user.js", [
    "dashboard.read",
    "finance.payments.read",
    "finance.payables.read",
    "finance.receivables.read",
    "finance.cash-drawer.read",
    "payments.reconciliation.read",
    "pos.read",
    "OPERATE_POS",
    "purchasing.ap.invoice.view",
    "reports.export",
  ]),
)

checks.push(
  checkSource("ROLE_MATRIX_ROUTE_AND_ACTION_PERMISSIONS", "what-next/transaction-history/runs/th-transaction-history-discoverability-release-hardening-20260717-030/transaction-history-static-release-smoke-output.json", [
    "ROUTE_CASH_PAYMENT_VISIBLE_GUARDED",
    "ROUTE_AP_VISIBLE_GUARDED",
    "ROUTE_AR_VISIBLE_GUARDED",
    "CASH_PAYMENT_ACTION_CONTROLS",
    "AP_ACTION_CONTROLS",
    "AR_ACTION_CONTROLS",
  ]),
)

checks.push(
  checkSource("EXPORT_PARITY_CASH_PAYMENT", "actions/pos/cash-payment-history.actions.ts", [
    "prepareCashPaymentHistoryExportAction",
    "requireAnyPermission([\"payments.export\", \"reports.export\"]",
    "requireFreshAuth(300)",
    "buildExportWatermark",
    "evaluateExportSafety",
    "action: \"payment.export\"",
    "scope: \"cash-payment-history\"",
    "sensitivity: \"financial\"",
  ]),
)

checks.push(
  checkSource("EXPORT_PARITY_SUPPLIER_AP", "actions/purchasing/ap-history.actions.ts", [
    "prepareAPHistoryExportAction",
    "requireAnyPermission",
    "finance.reports.export",
    "reports.export",
    "requireFreshAuth(300)",
    "buildExportWatermark",
    "evaluateExportSafety",
    "action: \"report.export\"",
    "scope: \"supplier-ap-history\"",
    "sensitivity: \"financial\"",
  ]),
)

checks.push(
  checkSource("EXPORT_PARITY_CUSTOMER_AR", "actions/finance/ar-history.actions.ts", [
    "prepareAROpenItemsHistoryExportAction",
    "requireAnyPermission",
    "finance.reports.export",
    "reports.export",
    "requireFreshAuth(300)",
    "buildExportWatermark",
    "evaluateExportSafety",
    "action: \"report.export\"",
    "scope: \"customer-ar-open-items-history\"",
    "sensitivity: \"financial\"",
  ]),
)

checks.push(
  checkSource("CURSOR_BACKDATED_CASH_PAYMENT", "services/pos/cash-payment-history.service.ts", [
    "configuredHistoryCursorCodec()",
    "recordedThrough",
    "const createdAt: Prisma.DateTimeFilter = { lte: recordedThrough }",
    "const paymentCreatedAt: Prisma.DateTimeFilter = { lte: recordedThrough }",
    "cursorCodec.encode",
    "recordedThrough: recordedThrough.toISOString()",
    "cursorPayload.recordedThrough",
  ]),
)

checks.push(
  checkSource("CURSOR_BACKDATED_SUPPLIER_AP", "services/purchasing/ap-history.service.ts", [
    "configuredHistoryCursorCodec()",
    "recordedThrough",
    "const invoiceDate: Prisma.DateTimeFilter = { lte: recordedThrough }",
    "const paymentDate: Prisma.DateTimeFilter = { lte: recordedThrough }",
    "cursorCodec.encode",
    "recordedThrough: recordedThrough.toISOString()",
    "cursorPayload.recordedThrough",
  ]),
)

checks.push(
  checkSource("CURSOR_TEST_COVERAGE", "services/purchasing/__tests__/ap-history.service.test.ts", [
    "rejects a cursor from another tenant",
    "recordedThrough",
    "cursorCodec",
  ]),
)

checks.push(
  checkSource("ACCOUNTING_TIE_OUT_CASH_PAYMENT", "services/pos/cash-payment-history.service.ts", [
    "ledgerPostingBatchId",
    "reconciliationTransaction",
    "expectedPhysicalCash",
    "cashVariance",
    "paymentCapturedTotal",
    "electronicTenderTotal",
  ]),
)

checks.push(
  checkSource("ACCOUNTING_TIE_OUT_SUPPLIER_AP", "services/purchasing/ap-history.service.ts", [
    "ledgerPostingBatchId",
    "ledgerBlockerCount",
    "signedPayableMovement",
    "invoiceTotal",
    "paidTotal",
    "openPayable",
  ]),
)

checks.push(
  checkSource("ACCOUNTING_TIE_OUT_CUSTOMER_AR", "services/accounting/ar-open-item.service.ts", [
    "ledgerEntryId",
    "evidenceGrade",
    "totalOpen",
    "overdueAmount",
    "settledItemCount",
    "allocations",
  ]),
)

checks.push(
  checkSource("ACCOUNTING_TIE_OUT_TEST_COVERAGE", "services/accounting/__tests__/ar-open-item.service.test.ts", [
    "ledgerEntryId",
    "evidenceGrade",
    "summary",
  ]),
)

const failed = checks.filter((check) => check.status !== "PASS")
const report = {
  status: failed.length ? "FAIL" : "PASS",
  checkedAt: new Date().toISOString(),
  gates: {
    roleMatrix: checks.filter((check) => check.id.startsWith("ROLE_MATRIX")),
    exportParity: checks.filter((check) => check.id.startsWith("EXPORT_PARITY")),
    cursorBackdatedInsert: checks.filter((check) => check.id.startsWith("CURSOR")),
    accountingTieOut: checks.filter((check) => check.id.startsWith("ACCOUNTING")),
  },
  checks,
  failed,
}

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n")
console.log(JSON.stringify(report, null, 2))
if (failed.length) process.exitCode = 1
