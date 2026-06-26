import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  CircleDollarSign,
  Command,
  FileCheck2,
  Landmark,
  LayoutDashboard,
  Package2,
  Settings,
  ShieldCheck,
  ShoppingCart,
  UserCheck,
  Wallet,
} from "lucide-react"

import { PERMISSIONS } from "@/lib/permissions"

export interface ISidebarDropdownItem {
  title: string
  href: string
  permission: string
  description?: string
  moduleSlug?: string
  quickAccess?: boolean
}

export interface ISidebarLink {
  title: string
  href?: string
  icon: LucideIcon
  dropdown: boolean
  permission: string
  description?: string
  moduleSlug?: string
  section: SidebarSectionKey
  priority?: "primary" | "standard" | "utility"
  dropdownMenu?: ISidebarDropdownItem[]
}

export type SidebarSectionKey = "command" | "operations" | "finance" | "people" | "governance"

export interface SidebarSection {
  key: SidebarSectionKey
  title: string
  description: string
}

export interface SidebarDestination {
  title: string
  href: string
  permission: string
  icon: LucideIcon
  parentTitle: string
  section: SidebarSection
  description?: string
  moduleSlug?: string
  quickAccess?: boolean
}

export const sidebarSections: SidebarSection[] = [
  { key: "command", title: "Command", description: "Daily control and executive views" },
  { key: "operations", title: "Operations", description: "Inventory, sales, purchasing, and POS" },
  { key: "finance", title: "Finance & Trust", description: "Accounting, cash, assurance, and compliance" },
  { key: "people", title: "People", description: "Payroll and workforce controls" },
  { key: "governance", title: "Governance", description: "Settings, security, and platform administration" },
]

const sidebarSectionByKey = new Map(sidebarSections.map((section) => [section.key, section]))

export const sidebarLinks: ISidebarLink[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    dropdown: false,
    permission: PERMISSIONS.DASHBOARD_READ,
    description: "Operating overview",
    moduleSlug: "dashboard",
    section: "command",
    priority: "primary",
  },
  {
    title: "Accounting",
    icon: Landmark,
    dropdown: true,
    permission: "accounting.reports.read",
    description: "Ledger, close, reports, and controls",
    moduleSlug: "accounting",
    section: "finance",
    dropdownMenu: [
      { title: "Overview", href: "/dashboard/accounting", permission: "accounting.reports.read" },
      { title: "Accountant Portal", href: "/dashboard/accounting/accountant-portal", permission: "accounting.audit.read" },
      { title: "Accounts", href: "/dashboard/accounting/accounts", permission: "accounting.accounts.read" },
      { title: "Close Center", href: "/dashboard/accounting/close", permission: "accounting.close.read" },
      { title: "Control Center", href: "/dashboard/accounting/control-center", permission: "accounting.setup.manage" },
      { title: "Journals", href: "/dashboard/accounting/journals", permission: "accounting.journal.read" },
      { title: "New Journal Entry", href: "/dashboard/accounting/journals/new", permission: "accounting.journal.create" },
      { title: "Setup", href: "/dashboard/accounting/setup", permission: "accounting.setup.manage" },
      { title: "Trial Balance", href: "/dashboard/accounting/reports/trial-balance", permission: "accounting.reports.read" },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    dropdown: true,
    permission: PERMISSIONS.VIEW_ANALYTICS,
    description: "Business pulse and reports",
    moduleSlug: "analytics",
    section: "command",
    dropdownMenu: [
      { title: "Overview", href: "/dashboard/analytics", permission: PERMISSIONS.VIEW_ANALYTICS },
      { title: "Reports", href: "/dashboard/analytics/reports", permission: PERMISSIONS.VIEW_ANALYTICS },
    ],
  },
  {
    title: "Assurance Control Tower",
    href: "/dashboard/assurance/control-tower",
    icon: ShieldCheck,
    dropdown: false,
    permission: "controls.audit.read",
    description: "Incidents, evidence, and assurance",
    moduleSlug: "close_assurance",
    section: "finance",
    priority: "primary",
  },
  {
    title: "Command Center",
    icon: Command,
    dropdown: true,
    permission: PERMISSIONS.DASHBOARD_READ,
    description: "Owner and manager daily command views",
    moduleSlug: "dashboard",
    section: "command",
    priority: "primary",
    dropdownMenu: [
      { title: "Daily Digest", href: "/dashboard/daily-digest", permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Manager Action Center", href: "/dashboard/manager-action-center", permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Owner War Room", href: "/dashboard/owner-war-room", permission: PERMISSIONS.DASHBOARD_READ },
    ],
  },
  {
    title: "Compliance",
    href: "/dashboard/compliance",
    icon: FileCheck2,
    dropdown: false,
    permission: "compliance.documents.read",
    description: "Fiscal controls and compliance evidence",
    moduleSlug: "compliance",
    section: "finance",
  },
  {
    title: "Finance",
    icon: Wallet,
    dropdown: true,
    permission: "finance.read",
    description: "Cash, profitability, payments, and reconciliation",
    moduleSlug: "finance",
    section: "finance",
    priority: "primary",
    dropdownMenu: [
      { title: "Overview", href: "/dashboard/finance", permission: "finance.dashboard.read" },
      { title: "Analytics", href: "/dashboard/finance/analytics", permission: "finance.analytics.read" },
      { title: "Cash Command", href: "/dashboard/finance/cash-command", permission: PERMISSIONS.FINANCIAL_READ },
      { title: "Cash Drawer", href: "/dashboard/finance/cash-drawer", permission: "finance.cash-drawer.read" },
      { title: "Cash Flow", href: "/dashboard/finance/cash-flow", permission: "finance.cash-flow.read" },
      { title: "Cost Analysis", href: "/dashboard/finance/costs", permission: "finance.costs.read" },
      { title: "Payables", href: "/dashboard/finance/payables", permission: "finance.payables.read" },
      { title: "Payments", href: "/dashboard/finance/payments", permission: "finance.payments.read" },
      { title: "Profit & Loss", href: "/dashboard/finance/profit-loss", permission: "finance.profitability.read" },
      { title: "Profitability", href: "/dashboard/finance/profitability", permission: "finance.profitability.read" },
      { title: "Receivables", href: "/dashboard/finance/receivables", permission: "finance.receivables.read" },
      { title: "Reconciliation", href: "/dashboard/finance/reconciliation", permission: "payments.reconciliation.read" },
      { title: "Retail Dashboard", href: "/dashboard/finance/retail", permission: "finance.dashboard.read" },
      { title: "Sales Analytics", href: "/dashboard/finance/sales", permission: "sales.analytics.read" },
      { title: "Stock-to-Cash", href: "/dashboard/finance/stock-to-cash", permission: "finance.read" },
    ],
  },
  {
    title: "HR & Payroll",
    icon: UserCheck,
    dropdown: true,
    permission: "payroll.command.read",
    description: "Payroll command center",
    moduleSlug: "payroll",
    section: "people",
    priority: "primary",
    dropdownMenu: [
      { title: "Overview", href: "/dashboard/payroll", permission: "payroll.command.read" },
      { title: "My Payslips", href: "/dashboard/payroll/payslips", permission: "payroll.payslips.self.read" },
      { title: "Register", href: "/dashboard/payroll/register", permission: "payroll.reports.read" },
    ],
  },
  {
    title: "Inventory",
    icon: Package2,
    dropdown: true,
    permission: PERMISSIONS.READ_ITEMS,
    description: "Items, stock movements, transfers, and units",
    moduleSlug: "inventory",
    section: "operations",
    priority: "primary",
    dropdownMenu: [
      { title: "Overview", href: "/dashboard/inventory", permission: "inventory.read" },
      { title: "Brands", href: "/dashboard/inventory/brands", permission: PERMISSIONS.BRANDS_READ },
      { title: "Categories", href: "/dashboard/inventory/categories", permission: PERMISSIONS.READ_CATEGORIES },
      { title: "Items", href: "/dashboard/inventory/items", permission: PERMISSIONS.READ_ITEMS },
      { title: "Movements", href: "/dashboard/inventory/movements", permission: PERMISSIONS.STOCK_READ },
      { title: "New Item", href: "/dashboard/inventory/items/create", permission: PERMISSIONS.CREATE_ITEMS },
      { title: "Transfers", href: "/dashboard/inventory/transfers", permission: PERMISSIONS.TRANSFERS_READ },
      { title: "Units", href: "/dashboard/inventory/units", permission: PERMISSIONS.UNITS_READ },
    ],
  },
  {
    title: "Purchases",
    icon: ShoppingCart,
    dropdown: true,
    permission: PERMISSIONS.READ_PURCHASE_ORDERS,
    description: "Purchase orders, suppliers, and AP workbench",
    moduleSlug: "purchasing",
    section: "operations",
    dropdownMenu: [
      { title: "Overview", href: "/dashboard/purchases", permission: PERMISSIONS.READ_PURCHASE_ORDERS },
      { title: "AP Workbench", href: "/dashboard/purchases/payables", permission: "finance.payables.read" },
      { title: "New Purchase Order", href: "/dashboard/purchase-orders/new", permission: PERMISSIONS.CREATE_PURCHASE_ORDERS },
      { title: "New Supplier", href: "/dashboard/purchases/suppliers/create", permission: PERMISSIONS.CREATE_SUPPLIERS },
      { title: "Purchase Orders", href: "/dashboard/purchase-orders", permission: PERMISSIONS.READ_PURCHASE_ORDERS },
      { title: "Suppliers", href: "/dashboard/purchases/suppliers", permission: PERMISSIONS.READ_SUPPLIERS },
    ],
  },
  {
    title: "Sales",
    icon: CircleDollarSign,
    dropdown: true,
    permission: PERMISSIONS.READ_SALES_ORDERS,
    description: "Customers, sales, and POS entry points",
    moduleSlug: "sales",
    section: "operations",
    dropdownMenu: [
      { title: "Overview", href: "/dashboard/sales", permission: PERMISSIONS.READ_SALES_ORDERS },
      { title: "Customers", href: "/dashboard/customers", permission: PERMISSIONS.READ_CUSTOMERS },
      { title: "New Customer", href: "/dashboard/customers/new", permission: PERMISSIONS.CREATE_CUSTOMERS },
      { title: "POS", href: "/dashboard/pos", permission: PERMISSIONS.OPERATE_POS },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    dropdown: true,
    permission: PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
    description: "Company, roles, locations, modules, and security",
    moduleSlug: "settings",
    section: "governance",
    priority: "utility",
    dropdownMenu: [
      { title: "Appearance", href: "/dashboard/settings/appearance", permission: PERMISSIONS.DASHBOARD_READ },
      { title: "Change Password", href: "/dashboard/change-password", permission: PERMISSIONS.PASSWORD_READ },
      { title: "Company", href: "/dashboard/settings/company", permission: PERMISSIONS.COMPANY_READ },
      { title: "Locations", href: "/dashboard/settings/locations", permission: PERMISSIONS.READ_LOCATIONS },
      { title: "Modules", href: "/dashboard/settings/modules", permission: PERMISSIONS.MANAGE_SYSTEM_SETTINGS },
      { title: "Notifications", href: "/dashboard/settings/notifications", permission: "communication.notifications.read" },
      { title: "Roles & Permissions", href: "/dashboard/settings/roles", permission: PERMISSIONS.READ_ROLES },
      { title: "Security", href: "/dashboard/settings/security", permission: PERMISSIONS.PASSWORD_READ },
      { title: "Tax Rates", href: "/dashboard/settings/tax-rates", permission: PERMISSIONS.TAX_RATES_READ },
      { title: "Terminals", href: "/dashboard/settings/terminals", permission: PERMISSIONS.POS_STATION_READ },
      { title: "Users & Invites", href: "/dashboard/settings/users", permission: PERMISSIONS.READ_USERS },
    ],
  },
]

export function filterSidebarLinksByPermission(
  links: ISidebarLink[],
  hasPermission: (permission: string) => boolean,
): ISidebarLink[] {
  return links
    .map((link) => ({
      ...link,
      dropdownMenu: link.dropdownMenu?.filter((item) => hasPermission(item.permission)),
    }))
    .filter(
      (link) =>
        hasPermission(link.permission) ||
        Boolean(link.dropdown && link.dropdownMenu?.length),
    )
}

export function searchSidebarLinks(links: ISidebarLink[], searchTerm: string): ISidebarLink[] {
  const query = searchTerm.trim().toLowerCase()

  if (!query) {
    return links
  }

  return links
    .map((link) => {
      const parentMatches =
        link.title.toLowerCase().includes(query) ||
        Boolean(link.moduleSlug?.toLowerCase().includes(query))
      const dropdownMenu = link.dropdownMenu?.filter((item) =>
        item.title.toLowerCase().includes(query) ||
        Boolean(item.description?.toLowerCase().includes(query)) ||
        Boolean(item.moduleSlug?.toLowerCase().includes(query)),
      )

      return {
        ...link,
        dropdownMenu: parentMatches ? link.dropdownMenu : dropdownMenu,
        __matches: parentMatches || Boolean(dropdownMenu?.length),
      }
    })
    .filter((link) => link.__matches)
    .map(({ __matches: _matches, ...link }) => link)
}

export function isSidebarHrefActive(normalizedPath: string, href?: string) {
  if (!href) {
    return false
  }

  return href === "/dashboard"
    ? normalizedPath === href
    : normalizedPath === href || normalizedPath.startsWith(`${href}/`)
}
export function flattenSidebarDestinations(links: ISidebarLink[]): SidebarDestination[] {
  return links.flatMap((link) => {
    const section = sidebarSectionByKey.get(link.section) ?? sidebarSections[0]

    if (!link.dropdown && link.href) {
      return [
        {
          title: link.title,
          href: link.href,
          permission: link.permission,
          icon: link.icon,
          parentTitle: link.title,
          section,
          description: link.description,
          moduleSlug: link.moduleSlug,
          quickAccess: link.priority === "primary",
        },
      ]
    }

    return (link.dropdownMenu ?? []).map((item) => ({
      title: item.title,
      href: item.href,
      permission: item.permission,
      icon: link.icon,
      parentTitle: link.title,
      section,
      description: item.description ?? link.description,
      moduleSlug: item.moduleSlug ?? link.moduleSlug,
      quickAccess: item.quickAccess,
    }))
  })
}

export function getSidebarSections(links: ISidebarLink[]) {
  return sidebarSections
    .map((section) => ({
      ...section,
      links: links.filter((link) => link.section === section.key),
    }))
    .filter((section) => section.links.length > 0)
}

export function getDefaultSidebarLinks(links: ISidebarLink[], normalizedPath: string): ISidebarLink[] {
  const selected = new Set<ISidebarLink>()

  for (const link of links) {
    const isActive =
      isSidebarHrefActive(normalizedPath, link.href) ||
      Boolean(link.dropdownMenu?.some((item) => isSidebarHrefActive(normalizedPath, item.href)))

    if (link.priority === "primary" || link.priority === "utility" || isActive) {
      selected.add(link)
    }
  }

  for (const section of sidebarSections) {
    const hasSelectedSectionLink = [...selected].some((link) => link.section === section.key)

    if (!hasSelectedSectionLink) {
      const firstAuthorizedSectionLink = links.find((link) => link.section === section.key)

      if (firstAuthorizedSectionLink) {
        selected.add(firstAuthorizedSectionLink)
      }
    }
  }

  return links.filter((link) => selected.has(link))
}

export function findSidebarActiveContext(links: ISidebarLink[], normalizedPath: string) {
  for (const link of links) {
    const section = sidebarSectionByKey.get(link.section) ?? sidebarSections[0]

    if (isSidebarHrefActive(normalizedPath, link.href)) {
      return { link, child: undefined, section }
    }

    const child = link.dropdownMenu?.find((item) => isSidebarHrefActive(normalizedPath, item.href))

    if (child) {
      return { link, child, section }
    }
  }

  return null
}
