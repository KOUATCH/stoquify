import type { FinanceDashboardView } from "./finance-dashboard.schemas"

export const financeDashboardViewPermissions = {
  overview: ["finance.dashboard.read", "finance.read"],
  payments: ["finance.payments.read", "finance.read", "payments.provider-account.read"],
  receivables: ["finance.receivables.read", "finance.read"],
  payables: ["finance.payables.read", "finance.read", "purchasing.ap.invoice.view"],
  "cash-flow": ["finance.cash-flow.read", "finance.read", "finance.analytics.read"],
  sales: ["sales.analytics.read", "finance.read"],
  costs: ["finance.costs.read", "finance.read", "finance.analytics.read"],
  profitability: ["finance.profitability.read", "finance.read", "finance.analytics.read"],
  analytics: ["finance.analytics.read", "finance.read"],
  retail: ["finance.dashboard.read", "finance.read"],
} as const satisfies Record<FinanceDashboardView, readonly string[]>

export function getFinanceDashboardViewPermissions(view: FinanceDashboardView) {
  return financeDashboardViewPermissions[view]
}
