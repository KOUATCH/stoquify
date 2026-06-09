import { getAllPermissions as getCanonicalPermissions } from "@/config/permissions"

export type PermissionRisk = "low" | "med" | "high" | "crit"

const WILDCARD_PERMISSION = "*"

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
  const candidates = permissionCandidates(permission).map((candidate) => candidate.toLowerCase())
  const joined = candidates.join(" ")

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
