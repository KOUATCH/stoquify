import type { ModuleAccessIntent, CommercialModuleSlug } from "@/services/modules/module-control-contracts"

export type PayrollRouteSurfaceModule = {
  moduleSlug: CommercialModuleSlug
  surface: string
  accessIntent?: ModuleAccessIntent
  mode?: "observe" | "enforce"
  moduleLockedTitle?: string
  moduleLockedMessage?: string
}

export type PayrollRouteSurface = {
  key: string
  route: string
  title: string
  resource: string
  permissions: readonly string[]
  permissionMode?: "single" | "all" | "any"
  noActiveOrgTitle?: string
  permissionDeniedTitle?: string
  noActiveOrgMessage?: string
  permissionDeniedMessage?: string
  primaryHref?: string
  module?: PayrollRouteSurfaceModule
}

export const payrollRouteCatalog: PayrollRouteSurface[] = [
  {
    key: "payroll-dashboard",
    route: "/dashboard/payroll",
    title: "Payroll command center",
    resource: "PayrollCommandReadModel",
    permissions: ["payroll.command.read"],
    permissionMode: "any",
    noActiveOrgTitle: "Payroll needs an active organization",
    permissionDeniedTitle: "HR and Payroll is not available for this role",
    noActiveOrgMessage:
      "Refresh your session from the dashboard so payroll can load tenant-scoped HR and payroll evidence.",
    permissionDeniedMessage:
      "HR and Payroll requires payroll command read access. The denial was recorded by the RBAC guard.",
    primaryHref: "/dashboard",
    module: {
      moduleSlug: "payroll",
      surface: "/dashboard/payroll",
      accessIntent: "read",
      mode: "observe",
      moduleLockedTitle: "Payroll is not enabled for this organization",
      moduleLockedMessage: "Enable the Payroll module before opening payroll command center and readiness tooling.",
    },
  },
  {
    key: "payroll-attendance",
    route: "/dashboard/payroll/attendance",
    title: "Payroll attendance readiness",
    resource: "PayrollPaymentEvidenceReadiness",
    permissions: ["payroll.payment_destination.read"],
    permissionMode: "any",
    module: {
      moduleSlug: "payroll",
      surface: "/dashboard/payroll/attendance",
      accessIntent: "read",
      mode: "enforce",
      moduleLockedTitle: "Payroll attendance readiness is not enabled for this organization",
      moduleLockedMessage:
        "Enable the Payroll module before opening payment and attendance readiness. The module entitlement denial was audited.",
    },
  },
  {
    key: "payroll-compensation",
    route: "/dashboard/payroll/compensation",
    title: "Payroll compensation",
    resource: "PayrollCompensation",
    permissions: ["payroll.compensation.read"],
    permissionMode: "any",
    module: {
      moduleSlug: "payroll",
      surface: "/dashboard/payroll/compensation",
      accessIntent: "read",
      mode: "enforce",
      moduleLockedTitle: "Payroll compensation is not enabled for this organization",
      moduleLockedMessage:
        "Enable the Payroll module before opening compensation readiness. The module entitlement denial was audited.",
    },
  },
  {
    key: "payroll-contracts",
    route: "/dashboard/payroll/contracts",
    title: "Payroll contracts",
    resource: "PayrollContract",
    permissions: ["payroll.contracts.read"],
    permissionMode: "any",
    module: {
      moduleSlug: "payroll",
      surface: "/dashboard/payroll/contracts",
      accessIntent: "read",
      mode: "enforce",
      moduleLockedTitle: "Payroll contracts are not enabled for this organization",
      moduleLockedMessage: "Enable the Payroll module before opening contract lifecycle readiness. The module entitlement denial was audited.",
    },
  },
  {
    key: "payroll-declarations",
    route: "/dashboard/payroll/declarations",
    title: "Payroll declarations",
    resource: "PayrollDeclarationWorkbench",
    permissions: ["payroll.command.read"],
    permissionMode: "any",
    module: {
      moduleSlug: "payroll",
      surface: "/dashboard/payroll/declarations",
      accessIntent: "read",
      mode: "enforce",
      moduleLockedTitle: "Payroll declarations are not enabled for this organization",
      moduleLockedMessage:
        "Enable the Payroll module before opening declaration lifecycle and authority evidence. The module entitlement denial was audited.",
    },
  },
  {
    key: "payroll-employees",
    route: "/dashboard/payroll/employees",
    title: "Payroll employees",
    resource: "PayrollEmployee",
    permissions: ["payroll.employees.read"],
    permissionMode: "any",
    module: {
      moduleSlug: "payroll",
      surface: "/dashboard/payroll/employees",
      accessIntent: "read",
      mode: "enforce",
      moduleLockedTitle: "Payroll employees are not enabled for this organization",
      moduleLockedMessage: "Enable the Payroll module before opening employee source-data readiness. The module entitlement denial was audited.",
    },
  },
  {
    key: "payroll-payslips",
    route: "/dashboard/payroll/payslips",
    title: "Payroll payslips",
    resource: "PayrollPayslip",
    permissions: ["payroll.payslips.self.read"],
    permissionMode: "any",
    module: {
      moduleSlug: "payroll",
      surface: "/dashboard/payroll/payslips",
      accessIntent: "read",
      mode: "enforce",
      moduleLockedTitle: "Payslips are not enabled for this organization",
      moduleLockedMessage: "Enable the Payroll module before opening employee payslip evidence. The module entitlement denial was audited.",
    },
  },
  {
    key: "payroll-payments",
    route: "/dashboard/payroll/payments",
    title: "Payroll payments",
    resource: "PayrollPaymentReconciliationWorkbench",
    permissions: ["payments.reconciliation.read"],
    permissionMode: "any",
    module: {
      moduleSlug: "payroll",
      surface: "/dashboard/payroll/payments",
      accessIntent: "read",
      mode: "enforce",
      moduleLockedTitle: "Payroll payments are not enabled for this organization",
      moduleLockedMessage:
        "Enable the Payroll module before opening payment reconciliation, settlement proof, and employee balance recovery. The module entitlement denial was audited.",
    },
  },
  {
    key: "payroll-register",
    route: "/dashboard/payroll/register",
    title: "Payroll register",
    resource: "PayrollRegister",
    permissions: ["payroll.reports.read"],
    permissionMode: "any",
    module: {
      moduleSlug: "payroll",
      surface: "/dashboard/payroll/register",
      accessIntent: "read",
      mode: "enforce",
      moduleLockedTitle: "Payroll register is not enabled for this organization",
      moduleLockedMessage: "Enable the Payroll module before opening register evidence. The module entitlement denial was audited.",
    },
  },
  {
    key: "payroll-runs",
    route: "/dashboard/payroll/runs",
    title: "Payroll runs",
    resource: "PayrollRunWorkbench",
    permissions: ["payroll.command.read"],
    permissionMode: "any",
    module: {
      moduleSlug: "payroll",
      surface: "/dashboard/payroll/runs",
      accessIntent: "read",
      mode: "enforce",
      moduleLockedTitle: "Payroll runs are not enabled for this organization",
      moduleLockedMessage:
        "Enable the Payroll module before opening run lifecycle, register proof, and accounting readiness. The module entitlement denial was audited.",
    },
  },
  {
    key: "payroll-setup",
    route: "/dashboard/payroll/setup",
    title: "Payroll setup",
    resource: "PayrollSetupReadiness",
    permissions: ["payroll.runs.calculate"],
    permissionMode: "any",
    module: {
      moduleSlug: "payroll",
      surface: "/dashboard/payroll/setup",
      accessIntent: "read",
      mode: "enforce",
      moduleLockedTitle: "Payroll setup is not enabled for this organization",
      moduleLockedMessage: "Enable the Payroll module before opening setup readiness and dry-run planning.",
    },
  },
]

export const payrollRouteMap: Record<string, PayrollRouteSurface> = Object.fromEntries(
  payrollRouteCatalog.map((entry) => [entry.key, entry]),
)

export const payrollRouteByRoute: Record<string, PayrollRouteSurface> = Object.fromEntries(
  payrollRouteCatalog.map((entry) => [entry.route, entry]),
)

const payrollSurfaceByResource: Record<string, PayrollRouteSurface> = Object.fromEntries(
  payrollRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getPayrollRouteSurface(key: string) {
  return payrollRouteMap[key]
}

export function getPayrollRouteSurfaceByRoute(route: string) {
  return payrollRouteByRoute[route]
}

export function getPayrollRouteSurfaceByResource(resource: string) {
  return payrollSurfaceByResource[resource]
}
