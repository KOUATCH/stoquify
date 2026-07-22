import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${rel}`);
  return fs.readFileSync(file, "utf8");
}

function check(id, rel, expectations) {
  const text = read(rel);
  const missing = expectations.filter((needle) => !text.includes(needle));
  checks.push({ id, path: rel, status: missing.length ? "FAIL" : "PASS", missing });
}

check("ROUTE_CASH_PAYMENT_VISIBLE_GUARDED", "app/[locale]/(dashboard)/dashboard/finance/cash-payment-history/page.tsx", [
  "CashPaymentHistoryWorkbench",
  "FinanceRouteAccess",
  "CashPaymentHistorySurface",
  "finance.cash-drawer.read",
  "payments.reconciliation.read",
  "finance.payments.read",
  "OPERATE_POS",
]);

check("ROUTE_AP_VISIBLE_GUARDED", "app/[locale]/(dashboard)/dashboard/purchases/payables/history/page.tsx", [
  "APHistoryWorkbench",
  "requirePermission(\"purchasing.ap.invoice.view\"",
  "observeModuleAccess",
  "SupplierAPHistory",
  "moduleSlug: \"purchasing\"",
]);

check("ROUTE_AR_VISIBLE_GUARDED", "app/[locale]/(dashboard)/dashboard/finance/receivables/history/page.tsx", [
  "AROpenItemsHistoryWorkbench",
  "FinanceRouteAccess",
  "financeViewPermissions(\"receivables\")",
  "AROpenItemsHistorySurface",
]);

check("SIDEBAR_DISCOVERABILITY", "config/sidebar.ts", [
  "Cash Payment History",
  "/dashboard/finance/cash-payment-history",
  "Customer AR History",
  "/dashboard/finance/receivables/history",
  "AP History",
  "/dashboard/purchases/payables/history",
]);

check("CASH_PAYMENT_ACTION_CONTROLS", "actions/pos/cash-payment-history.actions.ts", [
  "requireAnyPermission",
  "CashPaymentHistory",
  "CashPaymentHistoryExport",
  "requireFreshAuth(300)",
  "hashNormalizedHistoryFilters",
  "evaluateExportSafety",
  "observeModuleAccess",
]);

check("AP_ACTION_CONTROLS", "actions/purchasing/ap-history.actions.ts", [
  "requireAnyPermission",
  "APHistory",
  "APHistoryExport",
  "requireFreshAuth(300)",
  "hashNormalizedHistoryFilters",
  "evaluateExportSafety",
  "observeModuleAccess",
]);

check("AR_ACTION_CONTROLS", "actions/finance/ar-history.actions.ts", [
  "requireAnyPermission",
  "AROpenItemsHistory",
  "AROpenItemsHistoryExport",
  "requireFreshAuth(300)",
  "hashNormalizedHistoryFilters",
  "evaluateExportSafety",
]);

const failed = checks.filter((item) => item.status !== "PASS");
const result = {
  status: failed.length ? "FAIL" : "PASS",
  checkedAt: new Date().toISOString(),
  checks,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);