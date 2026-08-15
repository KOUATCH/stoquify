import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
} from "@/services/modules/module-control-contracts"

export type FinanceRouteSurfaceModule = {
  moduleSlug: CommercialModuleSlug
  surface: string
  accessIntent?: ModuleAccessIntent
  moduleLockedTitle?: string
  moduleLockedMessage?: string
}

export type FinanceRouteSurface = {
  key: string
  route: string
  title: string
  resource: string
  permissions: readonly string[]
  module?: FinanceRouteSurfaceModule
  modules?: FinanceRouteSurfaceModule[]
}

const financeSurfaceCatalog: FinanceRouteSurface[] = [
  {
    key: "finance-dashboard",
    route: "/dashboard/finance",
    title: "Finance dashboard",
    resource: "FinanceDashboard",
    permissions: ["finance.dashboard.read", "finance.read"],
  },
  {
    key: "finance-analytics",
    route: "/dashboard/finance/analytics",
    title: "Finance analytics",
    resource: "FinanceAnalytics",
    permissions: ["finance.analytics.read", "finance.read"],
  },
  {
    key: "finance-receivables",
    route: "/dashboard/finance/receivables",
    title: "Finance receivables",
    resource: "FinanceReceivablesSurface",
    permissions: ["finance.receivables.read", "finance.read"],
  },
  {
    key: "finance-receivables-history",
    route: "/dashboard/finance/receivables/history",
    title: "Customer AR history",
    resource: "AROpenItemsHistorySurface",
    permissions: ["finance.receivables.read", "finance.read"],
  },
  {
    key: "finance-payables",
    route: "/dashboard/finance/payables",
    title: "Finance payables",
    resource: "FinancePayablesSurface",
    permissions: ["finance.payables.read", "finance.read", "purchasing.ap.invoice.view"],
  },
  {
    key: "finance-payments",
    route: "/dashboard/finance/payments",
    title: "Finance payments",
    resource: "FinancePaymentsSurface",
    permissions: ["finance.payments.read", "finance.read", "payments.provider-account.read"],
  },
  {
    key: "finance-cash-flow",
    route: "/dashboard/finance/cash-flow",
    title: "Finance cash flow dashboard",
    resource: "FinanceCashFlowDashboard",
    permissions: ["finance.cash-flow.read", "finance.read", "finance.analytics.read"],
  },
  {
    key: "finance-cash-drawer",
    route: "/dashboard/finance/cash-drawer",
    title: "Finance cash drawer",
    resource: "FinanceCashDrawer",
    permissions: ["finance.cash-drawer.read", "finance.read"],
  },
  {
    key: "finance-cash-payment-history",
    route: "/dashboard/finance/cash-payment-history",
    title: "Cash and payment history",
    resource: "CashPaymentHistorySurface",
    permissions: [
      "finance.cash-drawer.read",
      "finance.read",
      "payments.reconciliation.read",
      "finance.payments.read",
      "pos.read",
      "OPERATE_POS",
    ],
    modules: [
      {
        moduleSlug: "cash_drawer",
        surface: "actions/pos/cash-payment-history.actions.ts:getCashPaymentHistoryAction",
        accessIntent: "read",
        moduleLockedTitle: "Cash drawer is not enabled for this tenant",
        moduleLockedMessage:
          "Enable the cash drawer module so cash and payment history can load drawer-backed payment movements.",
      },
      {
        moduleSlug: "payment_reconciliation",
        surface: "actions/pos/cash-payment-history.actions.ts:getCashPaymentHistoryAction",
        accessIntent: "read",
        moduleLockedTitle: "Payment reconciliation is not enabled for this tenant",
        moduleLockedMessage:
          "Enable payment reconciliation so payment settlement and reconciliation lineage can be displayed for this history surface.",
      },
    ],
  },
  {
    key: "finance-reconciliation",
    route: "/dashboard/finance/reconciliation",
    title: "Payment reconciliation",
    resource: "PaymentReconciliationWorkbench",
    permissions: ["payments.reconciliation.read"],
    module: {
      moduleSlug: "payment_reconciliation",
      surface: "/dashboard/finance/reconciliation",
      accessIntent: "read",
      moduleLockedTitle: "Payment reconciliation is not enabled for this tenant",
      moduleLockedMessage:
        "Enable the payment reconciliation module so cash, bank, card, or mobile-money reconciliation results can be validated by this surface.",
    },
  },
  {
    key: "finance-costs",
    route: "/dashboard/finance/costs",
    title: "Finance cost analysis",
    resource: "FinanceCostsDashboard",
    permissions: ["finance.costs.read", "finance.read", "finance.analytics.read"],
  },
  {
    key: "finance-sales",
    route: "/dashboard/finance/sales",
    title: "Finance sales dashboard",
    resource: "FinanceSales",
    permissions: ["sales.analytics.read", "finance.read"],
  },
  {
    key: "finance-retail",
    route: "/dashboard/finance/retail",
    title: "Retail finance dashboard",
    resource: "FinanceRetailDashboard",
    permissions: ["finance.dashboard.read", "finance.read"],
  },
  {
    key: "finance-profitability",
    route: "/dashboard/finance/profitability",
    title: "Finance profitability dashboard",
    resource: "FinanceProfitabilityDashboard",
    permissions: ["finance.profitability.read", "finance.read", "finance.analytics.read"],
  },
  {
    key: "finance-profit-loss",
    route: "/dashboard/finance/profit-loss",
    title: "Finance profit and loss dashboard",
    resource: "FinanceProfitLossDashboard",
    permissions: ["finance.profitability.read", "finance.read", "finance.analytics.read"],
  },
  {
    key: "finance-cash-command",
    route: "/dashboard/finance/cash-command",
    title: "Cash Command Intelligence",
    resource: "KontavaCashCommand",
    permissions: ["finance.read", "dashboard.read"],
  },
  {
    key: "finance-stock-to-cash",
    route: "/dashboard/finance/stock-to-cash",
    title: "Stock-to-Cash Flow",
    resource: "KontavaStockToCashFlow",
    permissions: ["finance.read", "dashboard.read", "inventory.read"],
  },
  {
    key: "finance-tax-rates-create",
    route: "/dashboard/finance/tax-rates/create",
    title: "Create Tax Rate",
    resource: "FinanceTaxRatesCreate",
    permissions: ["taxes.create"],
  },
]

export const financeRouteCatalog = financeSurfaceCatalog

export const financeRouteMap: Record<string, FinanceRouteSurface> = Object.fromEntries(
  financeSurfaceCatalog.map((entry) => [entry.key, entry]),
)

export const financeRouteByRoute: Record<string, FinanceRouteSurface> = Object.fromEntries(
  financeSurfaceCatalog.map((entry) => [entry.route, entry]),
)

const financeSurfaceByResource: Record<string, FinanceRouteSurface> = Object.fromEntries(
  financeSurfaceCatalog.map((entry) => [entry.resource, entry]),
)

export function getFinanceRouteSurface(key: string) {
  return financeRouteMap[key]
}

export function getFinanceRouteSurfaceByRoute(route: string) {
  return financeRouteByRoute[route]
}

export function getFinanceRouteSurfaceByResource(resource: string) {
  return financeSurfaceByResource[resource]
}
