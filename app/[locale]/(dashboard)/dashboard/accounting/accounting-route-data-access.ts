import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
} from "@/services/modules/module-control-contracts"

export type AccountingRouteSurfaceModule = {
  moduleSlug: CommercialModuleSlug
  surface: string
  accessIntent?: ModuleAccessIntent
  mode?: "observe" | "enforce"
  moduleLockedTitle?: string
  moduleLockedMessage?: string
}

export type PermissionMode = "single" | "all" | "any"

export type AccountingRouteSurface = {
  key: string
  route: string
  resource: string
  title: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  module?: AccountingRouteSurfaceModule
  modules?: AccountingRouteSurfaceModule[]
}

export const accountingRouteCatalog: AccountingRouteSurface[] = [
  {
    key: "accounting-dashboard",
    route: "/dashboard/accounting",
    resource: "AccountingDashboard",
    title: "Accounting dashboard",
    permissions: ["accounting.reports.read"],
  },
  {
    key: "accounting-accountant-access",
    route: "/dashboard/accounting/accountant-access",
    resource: "AccountingAccountantAccess",
    title: "Accountant access",
    permissions: ["accounting.close.accountant.invite"],
  },
  {
    key: "accounting-accountant-portal",
    route: "/dashboard/accounting/accountant-portal",
    resource: "AccountingAccountantPortal",
    title: "Accountant portal",
    permissions: ["accounting.audit.read"],
  },
  {
    key: "accounting-accountant-portfolio",
    route: "/dashboard/accounting/accountant-portfolio",
    resource: "AccountingAccountantPortal",
    title: "Accountant portfolio",
    permissions: ["accounting.audit.read"],
  },
  {
    key: "accounting-accounts",
    route: "/dashboard/accounting/accounts",
    resource: "AccountingChartOfAccounts",
    title: "Chart of accounts",
    permissions: ["accounting.accounts.read"],
  },
  {
    key: "accounting-close",
    route: "/dashboard/accounting/close",
    resource: "AccountingCloseCenter",
    title: "Close center",
    permissions: ["accounting.close.read"],
  },
  {
    key: "accounting-close-period",
    route: "/dashboard/accounting/close/[periodId]",
    resource: "AccountingCloseCenter",
    title: "Close assurance details",
    permissions: ["accounting.close.read"],
  },
  {
    key: "accounting-control-center",
    route: "/dashboard/accounting/control-center",
    resource: "AccountingControlCenter",
    title: "Accounting control center",
    permissions: ["accounting.setup.manage"],
  },
  {
    key: "accounting-journals",
    route: "/dashboard/accounting/journals",
    resource: "AccountingJournals",
    title: "Journal management",
    permissions: ["accounting.journal.read"],
  },
  {
    key: "accounting-journals-new",
    route: "/dashboard/accounting/journals/new",
    resource: "AccountingJournals",
    title: "Create journal entry",
    permissions: ["accounting.journal.create", "accounting.journal.read"],
    permissionMode: "all",
  },
  {
    key: "accounting-reports-financial-statements",
    route: "/dashboard/accounting/reports/financial-statements",
    resource: "AccountingFinancialStatements",
    title: "Financial statements",
    permissions: ["accounting.reports.read"],
  },
  {
    key: "accounting-reports-trial-balance",
    route: "/dashboard/accounting/reports/trial-balance",
    resource: "AccountingTrialBalance",
    title: "Trial balance",
    permissions: ["accounting.reports.read"],
  },
  {
    key: "accounting-setup",
    route: "/dashboard/accounting/setup",
    resource: "AccountingSetup",
    title: "Accounting setup",
    permissions: ["accounting.setup.manage"],
  },
]

export const accountingRouteMap: Record<string, AccountingRouteSurface> = Object.fromEntries(
  accountingRouteCatalog.map((entry) => [entry.key, entry]),
)

export const accountingRouteByRoute: Record<string, AccountingRouteSurface> = Object.fromEntries(
  accountingRouteCatalog.map((entry) => [entry.route, entry]),
)

const accountingSurfaceByResource: Record<string, AccountingRouteSurface> = Object.fromEntries(
  accountingRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getAccountingRouteSurface(key: string) {
  return accountingRouteMap[key]
}

export function getAccountingRouteSurfaceByRoute(route: string) {
  return accountingRouteByRoute[route]
}

export function getAccountingRouteSurfaceByResource(resource: string) {
  return accountingSurfaceByResource[resource]
}
