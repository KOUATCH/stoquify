import { getAllPermissions as getCanonicalPermissions } from "../../config/permissions"

export type PermissionRisk = "low" | "med" | "high" | "crit"

const WILDCARD_PERMISSION = "*"

const EXPLICIT_PERMISSION_RISKS = {
  "accounting.setup.manage": "crit",
  "accounting.accounts.manage": "crit",
  "accounting.journal.post": "crit",
  "accounting.journal.reverse": "crit",
  "accounting.period.close": "crit",
  "accounting.period.reopen": "crit",
  "accounting.exports.create": "crit",
  "accounting.posting-rules.manage": "crit",
  "accounting.audit.read": "high",
  "accounting.close.read": "high",
  "accounting.close.run": "high",
  "accounting.close.finding.assign": "high",
  "accounting.close.finding.comment": "high",
  "accounting.close.waiver.request": "high",
  "accounting.close.waiver.approve": "crit",
  "accounting.close.certify": "crit",
  "accounting.close.export": "crit",
  "accounting.close.accountant.review": "high",
  "accounting.close.accountant.comment": "high",
  "accounting.close.accountant.invite": "crit",
  "compliance.documents.read": "high",
  "compliance.documents.issue": "crit",
  "compliance.documents.certify": "crit",
  "compliance.documents.reverse": "crit",
  "compliance.submissions.retry": "high",
  "compliance.adapter.manage": "crit",
  "compliance.evidence.attach": "high",
  "compliance.metadata.read": "high",
  "finance.reports.export": "crit",
  "payments.provider-account.read": "high",
  "payments.provider-account.manage": "crit",
  "payments.reconciliation.read": "high",
  "payments.reconciliation.run": "high",
  "payments.reconciliation.import": "high",
  "payments.reconciliation.match": "high",
  "payments.reconciliation.override": "crit",
  "payments.reconciliation.exception.assign": "high",
  "payments.reconciliation.exception.resolve": "high",
  "payments.reconciliation.suspense.propose": "high",
  "payments.reconciliation.suspense.post": "crit",
  "payments.reconciliation.sign": "crit",
  "payments.reconciliation.certificate.export": "crit",
  "payments.export": "crit",
  "purchasing.ap.invoice.post": "high",
  "purchasing.ap.match.review": "high",
  "purchasing.supplier.bank.approve": "crit",
  "purchasing.ap.payment.approve": "crit",
  "purchasing.ap.payment.release": "crit",
  "payroll.employees.manage": "crit",
  "payroll.contracts.manage": "crit",
  "payroll.attendance.freeze": "high",
  "payroll.runs.calculate": "high",
  "payroll.runs.approve": "crit",
  "payroll.runs.post": "crit",
  "payroll.payslips.emit": "crit",
  "payroll.payments.release": "crit",
  "payroll.declarations.prepare": "high",
  "payroll.exports.create": "crit",
  "controls.manage": "crit",
  "controls.audit.read": "high",
  "fraud.cases.manage": "crit",
  "pos.transactions.refund": "crit",
  "pos.transactions.void": "crit",
  "reports.export": "crit",
  "data.export": "crit",
} as const satisfies Partial<Record<string, PermissionRisk>>

export const PERMISSION_ALIASES = {
  "dashboard.read": ["DASHBOARD_READ"],

  "users.read": ["READ_USERS"],
  "users.create": ["CREATE_USERS"],
  "users.update": ["UPDATE_USERS"],
  "users.delete": ["DELETE_USERS"],
  "users.deactivate": ["DEACTIVATE_USERS"],
  "users.invite": ["CREATE_USERS"],
  "users.roles.assign": ["ASSIGN_ROLES"],
  "users.password.reset": ["UPDATE_USERS"],

  "roles.read": ["READ_ROLES"],
  "roles.create": ["CREATE_ROLES"],
  "roles.update": ["UPDATE_ROLES"],
  "roles.delete": ["DELETE_ROLES"],
  "roles.permissions.assign": ["ASSIGN_ROLES", "MANAGE_FINANCIAL_PERMISSIONS"],
  "roles.permissions.remove": ["ASSIGN_ROLES", "MANAGE_FINANCIAL_PERMISSIONS"],

  "locations.read": ["READ_LOCATIONS"],
  "locations.create": ["CREATE_LOCATIONS"],
  "locations.update": ["UPDATE_LOCATIONS"],
  "locations.delete": ["DELETE_LOCATIONS"],
  "locations.manage": ["MANAGE_LOCATION_SETTINGS"],

  "inventory.read": ["READ_ITEMS", "STOCK_READ"],
  "inventory.create": ["CREATE_ITEMS"],
  "inventory.update": ["UPDATE_ITEMS"],
  "inventory.delete": ["DELETE_ITEMS"],
  "inventory.items.read": ["READ_ITEMS"],
  "inventory.items.create": ["CREATE_ITEMS"],
  "inventory.items.update": ["UPDATE_ITEMS"],
  "inventory.items.delete": ["DELETE_ITEMS"],
  "inventory.levels.read": ["STOCK_READ", "MANAGE_INVENTORY_LEVELS"],
  "inventory.levels.adjust": ["MANAGE_INVENTORY_LEVELS"],
  "inventory.categories.read": ["READ_CATEGORIES"],
  "inventory.categories.create": ["CREATE_CATEGORIES"],
  "inventory.categories.update": ["UPDATE_CATEGORIES"],
  "inventory.categories.delete": ["DELETE_CATEGORIES"],
  "inventory.brands.read": ["BRANDS_READ"],
  "inventory.brands.create": ["CREATE_BRANDS"],
  "inventory.brands.update": ["UPDATE_BRANDS"],
  "inventory.brands.delete": ["DELETE_BRANDS"],
  "inventory.units.read": ["UNITS_READ"],
  "inventory.units.create": ["CREATE_UNITS"],
  "inventory.units.update": ["UPDATE_UNITS"],
  "inventory.units.delete": ["DELETE_UNITS"],
  "inventory.stock.adjust": ["CREATE_STOCK_ADJUSTMENTS", "ADJUSTMENTS_CREATE"],
  "inventory.stock.transfer": ["CREATE_STOCK_TRANSFERS", "TRANSFERS_CREATE"],

  "sales.read": ["READ_SALES_ORDERS"],
  "sales.create": ["CREATE_SALES_ORDERS"],
  "sales.update": ["UPDATE_SALES_ORDERS"],
  "sales.delete": ["DELETE_SALES_ORDERS"],
  "sales.orders.read": ["READ_SALES_ORDERS"],
  "sales.orders.create": ["CREATE_SALES_ORDERS"],
  "sales.orders.update": ["UPDATE_SALES_ORDERS"],
  "sales.orders.cancel": ["DELETE_SALES_ORDERS"],
  "sales.orders.refund": ["PROCESS_REFUNDS"],
  "sales.analytics.read": ["SALES_ANALYTICS_READ"],
  "sales.reports.read": ["VIEW_SALES_REPORTS"],
  "sales.reports.export": ["EXPORT_DATA"],

  "purchases.read": ["READ_PURCHASE_ORDERS"],
  "purchases.create": ["CREATE_PURCHASE_ORDERS"],
  "purchases.update": ["UPDATE_PURCHASE_ORDERS"],
  "purchases.delete": ["DELETE_PURCHASE_ORDERS"],
  "purchases.orders.read": ["READ_PURCHASE_ORDERS"],
  "purchases.orders.create": ["CREATE_PURCHASE_ORDERS"],
  "purchases.orders.update": ["UPDATE_PURCHASE_ORDERS"],
  "purchases.orders.approve": ["APPROVE_PURCHASE_ORDERS"],
  "purchases.orders.cancel": ["DELETE_PURCHASE_ORDERS"],
  "purchases.orders.receive": ["RECEIVE_GOODS"],
  "purchases.suppliers.read": ["READ_SUPPLIERS"],
  "purchases.suppliers.create": ["CREATE_SUPPLIERS"],
  "purchases.suppliers.update": ["UPDATE_SUPPLIERS"],
  "purchases.suppliers.delete": ["DELETE_SUPPLIERS"],
  "purchasing.ap.invoice.view": ["SUPPLIER_PAYABLES_READ", "READ_PURCHASE_ORDERS", "finance.payables.read"],
  "purchasing.ap.invoice.post": ["SUPPLIER_PAYABLES_MANAGE", "SUPPLIER_PAYMENTS_MANAGE", "finance.payables.create"],
  "purchasing.ap.match.review": ["APPROVE_PURCHASE_ORDERS", "MANAGE_FINANCIAL_CONTROLS"],
  "purchasing.supplier.bank.request": ["UPDATE_SUPPLIERS", "SUPPLIER_PAYMENTS_MANAGE"],
  "purchasing.supplier.bank.approve": ["SUPPLIER_PAYMENTS_MANAGE", "MANAGE_FINANCIAL_CONTROLS"],
  "purchasing.ap.payment.request": ["SUPPLIER_PAYMENTS_MANAGE", "finance.payables.pay"],
  "purchasing.ap.payment.approve": ["SUPPLIER_PAYMENTS_MANAGE", "MANAGE_FINANCIAL_CONTROLS"],
  "purchasing.ap.payment.release": ["SUPPLIER_PAYMENTS_MANAGE", "MANAGE_FINANCIAL_CONTROLS"],

  "customers.read": ["READ_CUSTOMERS"],
  "customers.create": ["CREATE_CUSTOMERS"],
  "customers.update": ["UPDATE_CUSTOMERS"],
  "customers.delete": ["DELETE_CUSTOMERS"],

  "finance.read": ["FINANCE_READ", "FINANCIAL_READ"],
  "finance.reports.read": ["FINANCIAL_REPORTS_READ", "VIEW_FINANCIAL_REPORTS"],
  "finance.reports.export": ["FINANCIAL_REPORTS_EXPORT"],
  "finance.analytics.read": ["FINANCIAL_KPI_READ", "ANALYTICS_READ"],
  "finance.taxes.read": ["TAX_RATES_READ"],
  "finance.taxes.manage": ["CREATE_TAX_RATES", "UPDATE_TAX_RATES", "DELETE_TAX_RATES"],
  "payments.provider-account.read": ["FINANCE_READ", "VIEW_FINANCIAL_DASHBOARD"],
  "payments.provider-account.manage": ["PAYMENT_PROVIDER_ACCOUNT_MANAGE"],
  "payments.reconciliation.read": ["FINANCE_READ", "VIEW_FINANCIAL_DASHBOARD", "VIEW_FINANCIAL_AUDIT_TRAIL"],
  "payments.reconciliation.run": ["MANAGE_FINANCIAL_CONTROLS", "MANAGE_CASH_TRANSACTIONS"],
  "payments.reconciliation.import": ["PAYMENT_RECONCILIATION_IMPORT"],
  "payments.reconciliation.match": ["PAYMENT_RECONCILIATION_MATCH"],
  "payments.reconciliation.override": ["PAYMENT_RECONCILIATION_OVERRIDE"],
  "payments.reconciliation.exception.assign": ["PAYMENT_RECONCILIATION_EXCEPTION_ASSIGN"],
  "payments.reconciliation.exception.resolve": ["PAYMENT_RECONCILIATION_EXCEPTION_RESOLVE"],
  "payments.reconciliation.suspense.propose": ["PAYMENT_RECONCILIATION_SUSPENSE_PROPOSE"],
  "payments.reconciliation.suspense.post": ["PAYMENT_RECONCILIATION_SUSPENSE_POST"],
  "payments.reconciliation.sign": ["PAYMENT_RECONCILIATION_SIGN"],
  "payments.reconciliation.certificate.export": ["PAYMENT_RECONCILIATION_CERTIFICATE_EXPORT"],
  "payments.export": ["FINANCIAL_REPORTS_EXPORT", "EXPORT_DATA"],

  "accounting.setup.manage": ["CONFIGURE_FINANCIAL_SYSTEM", "MANAGE_FINANCIAL_CONTROLS"],
  "accounting.accounts.read": ["VIEW_CHART_OF_ACCOUNTS"],
  "accounting.accounts.manage": ["CONFIGURE_FINANCIAL_SYSTEM", "MANAGE_FINANCIAL_CONTROLS"],
  "accounting.journal.read": ["VIEW_JOURNAL_ENTRIES", "VIEW_GENERAL_LEDGER"],
  "accounting.journal.create": ["CREATE_JOURNAL_ENTRIES"],
  "accounting.journal.post": ["POST_JOURNAL_ENTRIES"],
  "accounting.journal.reverse": ["REVERSE_JOURNAL_ENTRIES", "APPROVE_JOURNAL_ENTRIES"],
  "accounting.period.read": ["VIEW_FINANCIAL_DASHBOARD", "VIEW_FINANCIAL_REPORTS"],
  "accounting.period.close": ["CLOSE_FINANCIAL_PERIODS"],
  "accounting.period.reopen": ["MANAGE_FINANCIAL_PERIODS"],
  "accounting.reports.read": ["VIEW_FINANCIAL_REPORTS", "VIEW_GENERAL_LEDGER"],
  "accounting.exports.create": ["FINANCIAL_REPORTS_EXPORT", "EXPORT_DATA"],
  "accounting.posting-rules.manage": ["CONFIGURE_FINANCIAL_SYSTEM", "MANAGE_FINANCIAL_CONTROLS"],
  "accounting.audit.read": ["VIEW_FINANCIAL_AUDIT_TRAIL", "VIEW_AUDIT_LOGS"],
  "accounting.close.read": ["VIEW_FINANCIAL_REPORTS", "VIEW_FINANCIAL_AUDIT_TRAIL"],
  "accounting.close.run": ["MANAGE_FINANCIAL_CONTROLS", "CLOSE_FINANCIAL_PERIODS"],
  "accounting.close.finding.assign": ["MANAGE_FINANCIAL_CONTROLS", "VIEW_FINANCIAL_AUDIT_TRAIL"],
  "accounting.close.finding.comment": ["VIEW_FINANCIAL_AUDIT_TRAIL"],
  "accounting.close.waiver.request": ["MANAGE_FINANCIAL_CONTROLS"],
  "accounting.close.waiver.approve": ["MANAGE_FINANCIAL_CONTROLS", "CLOSE_FINANCIAL_PERIODS"],
  "accounting.close.certify": ["CLOSE_FINANCIAL_PERIODS", "FINANCIAL_REPORTS_EXPORT"],
  "accounting.close.export": ["FINANCIAL_REPORTS_EXPORT", "EXPORT_DATA"],
  "accounting.close.accountant.review": ["VIEW_FINANCIAL_AUDIT_TRAIL", "VIEW_FINANCIAL_REPORTS"],
  "accounting.close.accountant.comment": ["VIEW_FINANCIAL_AUDIT_TRAIL"],
  "accounting.close.accountant.invite": ["MANAGE_FINANCIAL_PERMISSIONS", "MANAGE_FINANCIAL_CONTROLS"],

  "compliance.documents.read": ["FINANCE_READ", "VIEW_FINANCIAL_AUDIT_TRAIL"],
  "compliance.documents.issue": ["MANAGE_FINANCIAL_CONTROLS"],
  "compliance.documents.certify": ["MANAGE_FINANCIAL_CONTROLS"],
  "compliance.documents.reverse": ["MANAGE_FINANCIAL_CONTROLS"],
  "compliance.submissions.retry": ["MANAGE_FINANCIAL_CONTROLS"],
  "compliance.adapter.manage": ["CONFIGURE_FINANCIAL_SYSTEM", "MANAGE_FINANCIAL_CONTROLS"],
  "compliance.evidence.attach": ["MANAGE_FINANCIAL_CONTROLS", "VIEW_FINANCIAL_AUDIT_TRAIL"],
  "compliance.metadata.read": ["FINANCE_READ", "VIEW_FINANCIAL_AUDIT_TRAIL"],

  "payroll.read": ["PAYROLL_READ"],
  "payroll.employees.read": ["PAYROLL_READ", "EMPLOYEE_SALARY_READ"],
  "payroll.employees.manage": ["PAYROLL_CREATE", "PAYROLL_UPDATE", "EMPLOYEE_SALARY_UPDATE"],
  "payroll.contracts.read": ["PAYROLL_READ", "EMPLOYEE_SALARY_READ"],
  "payroll.contracts.manage": ["PAYROLL_CREATE", "PAYROLL_UPDATE", "EMPLOYEE_SALARY_UPDATE"],
  "payroll.attendance.freeze": ["PAYROLL_PROCESS", "MANAGE_ATTENDANCE_REPORTS"],
  "payroll.runs.calculate": ["PAYROLL_PROCESS"],
  "payroll.runs.review": ["PAYROLL_READ", "PAYROLL_REPORTS_READ"],
  "payroll.runs.approve": ["PAYROLL_APPROVE", "MANAGE_FINANCIAL_CONTROLS"],
  "payroll.runs.post": ["PAYROLL_APPROVE", "POST_JOURNAL_ENTRIES", "MANAGE_FINANCIAL_CONTROLS"],
  "payroll.payslips.read": ["PAYROLL_READ", "EMPLOYEE_SALARY_READ"],
  "payroll.payslips.emit": ["PAYROLL_APPROVE", "PAYROLL_PROCESS"],
  "payroll.payments.release": ["PAYROLL_APPROVE", "SUPPLIER_PAYMENTS_MANAGE", "MANAGE_FINANCIAL_CONTROLS"],
  "payroll.declarations.prepare": ["PAYROLL_REPORTS_READ", "MANAGE_FINANCIAL_CONTROLS"],
  "payroll.reports.read": ["PAYROLL_REPORTS_READ", "PAYROLL_ANALYTICS_READ"],
  "payroll.exports.create": ["PAYROLL_EXPORT", "EXPORT_DATA", "FINANCIAL_REPORTS_EXPORT"],

  "taxes.read": ["TAX_RATES_READ"],
  "taxes.create": ["CREATE_TAX_RATES"],
  "taxes.update": ["UPDATE_TAX_RATES"],
  "taxes.delete": ["DELETE_TAX_RATES"],
  "taxes.rates.read": ["TAX_RATES_READ"],
  "taxes.rates.create": ["CREATE_TAX_RATES"],
  "taxes.rates.update": ["UPDATE_TAX_RATES"],
  "taxes.rates.delete": ["DELETE_TAX_RATES"],

  "pos.read": ["NEW_POS_SESSION_READ", "POS_STATION_READ"],
  "pos.use": ["OPERATE_POS"],
  "pos.session.start": ["MANAGE_POS_SESSIONS"],
  "pos.session.end": ["MANAGE_POS_SESSIONS"],
  "pos.transactions.read": ["READ_SALES_ORDERS"],
  "pos.transactions.void": ["PROCESS_REFUNDS"],
  "pos.transactions.refund": ["PROCESS_REFUNDS"],
  "pos.cash.drawer.open": ["MANAGE_CASH_DRAWER", "CASH_DRAWER_READ"],
  "pos.discounts.apply": ["PROCESS_SALES"],
  "pos.receipts.print": ["OPERATE_POS"],
  "pos.receipts.reprint": ["OPERATE_POS"],

  "analytics.read": ["ANALYTICS_READ", "VIEW_ANALYTICS"],
  "reports.read": ["VIEW_ANALYTICS", "FINANCIAL_REPORTS_READ"],
  "reports.export": ["EXPORT_DATA", "FINANCIAL_REPORTS_EXPORT"],

  "system.read": ["ADMIN_READ"],
  "system.settings.read": ["VIEW_ORGANIZATION_SETTINGS"],
  "system.settings.update": ["MANAGE_SYSTEM_SETTINGS"],
  "system.organization.read": ["VIEW_ORGANIZATION_SETTINGS"],
  "system.organization.update": ["MANAGE_ORGANIZATION"],
  "data.export": ["EXPORT_DATA"],
  "controls.manage": ["MANAGE_FINANCIAL_CONTROLS"],
  "controls.audit.read": ["VIEW_FINANCIAL_AUDIT_TRAIL", "VIEW_AUDIT_LOGS"],
  "fraud.cases.manage": ["MANAGE_FINANCIAL_CONTROLS", "VIEW_FINANCIAL_AUDIT_TRAIL"],
} as const satisfies Record<string, readonly string[]>

const reverseAliases = Object.entries(PERMISSION_ALIASES).reduce<Record<string, string[]>>(
  (acc, [canonical, aliases]) => {
    for (const alias of aliases) {
      acc[alias] = [...(acc[alias] ?? []), canonical]
    }
    return acc
  },
  {},
)

function uppercaseCandidate(permission: string) {
  if (!permission.includes(".")) return null
  const parts = permission.split(".").filter(Boolean)
  if (parts.length < 2) return null

  const verb = parts[parts.length - 1]
  const resource = parts[parts.length - 2]
  return `${verb}_${resource}`.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
}

export function permissionCandidates(permission: string): string[] {
  const candidates = new Set<string>([permission])

  const directAliases = PERMISSION_ALIASES[permission as keyof typeof PERMISSION_ALIASES] ?? []
  for (const alias of directAliases) candidates.add(alias)

  const canonicalAliases = reverseAliases[permission] ?? []
  for (const alias of canonicalAliases) {
    candidates.add(alias)
    const aliasAliases = PERMISSION_ALIASES[alias as keyof typeof PERMISSION_ALIASES] ?? []
    for (const nested of aliasAliases) candidates.add(nested)
  }

  const generated = uppercaseCandidate(permission)
  if (generated) candidates.add(generated)

  return [...candidates]
}

export function expandPermissions(permissions: readonly string[] | null | undefined): string[] {
  if (!permissions?.length) return []
  if (permissions.includes(WILDCARD_PERMISSION)) return [WILDCARD_PERMISSION]

  return Array.from(new Set(permissions.flatMap(permissionCandidates)))
}

export function hasRbacPermission(
  permissions: readonly string[] | null | undefined,
  requiredPermission: string,
) {
  if (!permissions?.length) return false
  if (permissions.includes(WILDCARD_PERMISSION)) return true
  if (requiredPermission === WILDCARD_PERMISSION) return permissions.includes(WILDCARD_PERMISSION)

  const available = new Set(expandPermissions(permissions))
  return permissionCandidates(requiredPermission).some((candidate) => available.has(candidate))
}

export function hasAnyRbacPermission(
  permissions: readonly string[] | null | undefined,
  requiredPermissions: readonly string[],
) {
  return requiredPermissions.some((permission) => hasRbacPermission(permissions, permission))
}

export function hasAllRbacPermissions(
  permissions: readonly string[] | null | undefined,
  requiredPermissions: readonly string[],
) {
  return requiredPermissions.every((permission) => hasRbacPermission(permissions, permission))
}

export function isKnownPermission(permission: string) {
  if (permission === WILDCARD_PERMISSION) return true
  const canonicalPermissions = getCanonicalPermissions()
  return permissionCandidates(permission).some(
    (candidate) =>
      canonicalPermissions.includes(candidate as never) ||
      candidate in reverseAliases ||
      candidate in PERMISSION_ALIASES,
  )
}

export function permissionRisk(permission: string): PermissionRisk {
  const candidates = permissionCandidates(permission)
  const explicitRisk = candidates
    .map((candidate) => EXPLICIT_PERMISSION_RISKS[candidate as keyof typeof EXPLICIT_PERMISSION_RISKS])
    .find(Boolean)

  if (explicitRisk) return explicitRisk

  const loweredCandidates = candidates.map((candidate) => candidate.toLowerCase())
  const joined = loweredCandidates.join(" ")

  if (
    joined.includes("role") ||
    joined.includes("permission") ||
    joined.includes("delete") ||
    joined.includes("approve") ||
    joined.includes("refund") ||
    joined.includes("void") ||
    joined.includes("close") ||
    joined.includes("reopen") ||
    joined.includes("payroll") ||
    joined.includes("financial") ||
    joined.includes("audit") ||
    joined.includes("export")
  ) {
    return "crit"
  }

  if (
    joined.includes("create") ||
    joined.includes("update") ||
    joined.includes("manage") ||
    joined.includes("process") ||
    joined.includes("adjust") ||
    joined.includes("transfer")
  ) {
    return "high"
  }

  return joined.includes("read") || joined.includes("view") ? "low" : "med"
}
