import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CircleDollarSign,
  Clock,
  Factory,
  Handshake,
  LayoutDashboard,
  Package2,
  Settings,
  Shield,
  ShoppingCart,
  UserCheck,
  Wallet,
} from "lucide-react";

import { PERMISSIONS } from "@/lib/permissions";

export interface ISidebarDropdownItem {
  title: string;
  href: string;
  permission: string;
}

export interface ISidebarLink {
  title: string;
  href?: string;
  icon: LucideIcon;
  dropdown: boolean;
  permission: string;
  dropdownMenu?: ISidebarDropdownItem[];
}

export const sidebarLinks: ISidebarLink[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    dropdown: false,
    permission: PERMISSIONS.DASHBOARD_READ,
  },
  {
    title: "Inventory",
    icon: Package2,
    dropdown: true,
    permission: PERMISSIONS.READ_ITEMS,
    dropdownMenu: [
      { title: "Overview", href: "/dashboard/inventory", permission: PERMISSIONS.READ_ITEMS },
      { title: "Items", href: "/dashboard/inventory/items", permission: PERMISSIONS.READ_ITEMS },
      { title: "Categories", href: "/dashboard/inventory/categories", permission: PERMISSIONS.READ_CATEGORIES },
      { title: "Brands", href: "/dashboard/inventory/brands", permission: PERMISSIONS.BRANDS_READ },
      { title: "Units", href: "/dashboard/inventory/units", permission: PERMISSIONS.UNITS_READ },
      { title: "Stock", href: "/dashboard/inventory/stock", permission: PERMISSIONS.STOCK_READ },
      { title: "Low Stock", href: "/dashboard/inventory/stock/low-stock", permission: PERMISSIONS.STOCK_READ },
      { title: "Transfers", href: "/dashboard/inventory/transfers", permission: PERMISSIONS.TRANSFERS_READ },
      { title: "Movements", href: "/dashboard/inventory/movements", permission: PERMISSIONS.STOCK_READ },
    ],
  },
  {
    title: "Production",
    icon: Factory,
    dropdown: true,
    permission: PERMISSIONS.PRODUCTION_READ,
    dropdownMenu: [
      { title: "Dashboard", href: "/dashboard/production", permission: PERMISSIONS.PRODUCTION_DASHBOARD_READ },
      { title: "Recipes", href: "/dashboard/production/recipes", permission: PERMISSIONS.RECIPE_READ },
      { title: "Batches", href: "/dashboard/production/batches", permission: PERMISSIONS.PRODUCTION_READ },
      { title: "Tracking", href: "/dashboard/production/tracking", permission: PERMISSIONS.PRODUCTION_TRACKING_READ },
      { title: "Raw Materials", href: "/dashboard/production/raw-materials", permission: PERMISSIONS.RAW_MATERIALS_READ },
      { title: "Costing", href: "/dashboard/production/costing", permission: PERMISSIONS.PRODUCTION_COSTING_READ },
      { title: "Profitability", href: "/dashboard/production/profitability", permission: PERMISSIONS.PRODUCTION_PROFITABILITY_READ },
      { title: "Planning", href: "/dashboard/production/planning", permission: PERMISSIONS.PRODUCTION_PLANNING_READ },
    ],
  },
  {
    title: "Sales",
    icon: CircleDollarSign,
    dropdown: true,
    permission: PERMISSIONS.READ_SALES_ORDERS,
    dropdownMenu: [
      { title: "Sales", href: "/dashboard/sales", permission: PERMISSIONS.READ_SALES_ORDERS },
      { title: "POS", href: "/dashboard/pos", permission: PERMISSIONS.OPERATE_POS },
      { title: "Sales Orders", href: "/dashboard/session-pos-sync", permission: PERMISSIONS.READ_SALES_ORDERS },
      { title: "Client Orders", href: "/dashboard/orders", permission: PERMISSIONS.READ_SALES_ORDERS },
      { title: "Create Order", href: "/dashboard/orders/create", permission: PERMISSIONS.CREATE_SALES_ORDERS },
      { title: "Payments", href: "/dashboard/orders/payments", permission: PERMISSIONS.READ_SALES_ORDERS },
      { title: "Deliveries", href: "/dashboard/orders/deliveries", permission: PERMISSIONS.READ_SALES_ORDERS },
      { title: "Customers", href: "/dashboard/customers", permission: PERMISSIONS.READ_CUSTOMERS },
      { title: "Daily Analytics", href: "/dashboard/sales/financial-analytics", permission: PERMISSIONS.READ_SALES_ORDERS },
    ],
  },
  {
    title: "Cash Drawers",
    href: "/dashboard/finance/cash-drawer",
    icon: Wallet,
    dropdown: false,
    permission: PERMISSIONS.CASH_DRAWER_READ,
  },
  {
    title: "Purchases",
    icon: ShoppingCart,
    dropdown: true,
    permission: PERMISSIONS.READ_PURCHASE_ORDERS,
    dropdownMenu: [
      { title: "Purchase Orders", href: "/dashboard/purchase-orders", permission: PERMISSIONS.READ_PURCHASE_ORDERS },
      { title: "New Purchase Order", href: "/dashboard/purchase-orders/new", permission: PERMISSIONS.CREATE_PURCHASE_ORDERS },
      { title: "Purchases", href: "/dashboard/purchases", permission: PERMISSIONS.READ_PURCHASE_ORDERS },
      { title: "Suppliers", href: "/dashboard/purchases/suppliers", permission: PERMISSIONS.READ_SUPPLIERS },
      { title: "Create Supplier", href: "/dashboard/purchases/suppliers/create", permission: PERMISSIONS.CREATE_SUPPLIERS },
    ],
  },
  {
    title: "Presence",
    icon: Clock,
    dropdown: true,
    permission: PERMISSIONS.PRESENCE_READ,
    dropdownMenu: [
      { title: "Overview", href: "/dashboard/presence", permission: PERMISSIONS.PRESENCE_READ },
      { title: "Clock In/Out", href: "/dashboard/presence/clock", permission: PERMISSIONS.PRESENCE_CLOCK },
      { title: "Reports", href: "/dashboard/presence/reports", permission: PERMISSIONS.PRESENCE_REPORTS_READ },
      { title: "Alerts", href: "/dashboard/presence/alerts", permission: PERMISSIONS.PRESENCE_ALERTS_READ },
      { title: "Team", href: "/dashboard/presence/team", permission: PERMISSIONS.PRESENCE_TEAM_READ },
    ],
  },
  {
    title: "Payroll",
    icon: UserCheck,
    dropdown: true,
    permission: PERMISSIONS.PAYROLL_READ,
    dropdownMenu: [
      { title: "Dashboard", href: "/dashboard/payroll", permission: PERMISSIONS.PAYROLL_READ },
      { title: "Monthly Salaries", href: "/dashboard/payroll/salary-list", permission: PERMISSIONS.PAYROLL_REPORTS_READ },
      { title: "Employees", href: "/dashboard/payroll/employees", permission: PERMISSIONS.EMPLOYEE_SALARY_READ },
      { title: "Adjustments", href: "/dashboard/payroll/adjustments", permission: PERMISSIONS.PAYROLL_READ },
      { title: "Salary Details", href: "/dashboard/payroll/salary-details", permission: PERMISSIONS.PAYROLL_READ },
    ],
  },
  {
    title: "Finance",
    icon: Wallet,
    dropdown: true,
    permission: PERMISSIONS.FINANCIAL_READ,
    dropdownMenu: [
      { title: "Overview", href: "/dashboard/finance", permission: PERMISSIONS.FINANCIAL_READ },
      { title: "Retail Dashboard", href: "/dashboard/finance/retail", permission: PERMISSIONS.VIEW_FINANCIAL_DASHBOARD },
      { title: "Sales Analytics", href: "/dashboard/finance/sales", permission: PERMISSIONS.SALES_ANALYTICS_READ },
      { title: "Payments", href: "/dashboard/finance/payments", permission: PERMISSIONS.FINANCIAL_READ },
      { title: "Receivables", href: "/dashboard/finance/receivables", permission: PERMISSIONS.CUSTOMER_RECEIVABLES_READ },
      { title: "Payables", href: "/dashboard/finance/payables", permission: PERMISSIONS.SUPPLIER_PAYABLES_READ },
      { title: "Cost Analysis", href: "/dashboard/finance/costs", permission: PERMISSIONS.COST_ANALYTICS_READ },
      { title: "Profitability", href: "/dashboard/finance/profitability", permission: PERMISSIONS.PROFITABILITY_ANALYTICS_READ },
      { title: "Cash Drawer", href: "/dashboard/finance/cash-drawer", permission: PERMISSIONS.CASH_DRAWER_READ },
      { title: "Cash Flow", href: "/dashboard/finance/cash-flow", permission: PERMISSIONS.CASH_FLOW_READ },
      { title: "Analytics", href: "/dashboard/finance/analytics", permission: PERMISSIONS.FINANCE_READ },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    dropdown: true,
    permission: PERMISSIONS.VIEW_ANALYTICS,
    dropdownMenu: [
      { title: "Dashboard", href: "/dashboard/analytics", permission: PERMISSIONS.VIEW_ANALYTICS },
      { title: "Reports", href: "/dashboard/analytics/reports", permission: PERMISSIONS.VIEW_ANALYTICS },
    ],
  },
  {
    title: "Commercial Agents",
    href: "/dashboard/commercial-agents",
    icon: Handshake,
    dropdown: false,
    permission: PERMISSIONS.COMMERCIAL_AGENTS_READ,
  },
  {
    title: "Content",
    href: "/dashboard/blogs",
    icon: BookOpen,
    dropdown: false,
    permission: PERMISSIONS.BLOGS_READ,
  },
  {
    title: "Settings",
    icon: Settings,
    dropdown: true,
    permission: PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
    dropdownMenu: [
      { title: "Locations", href: "/dashboard/settings/locations", permission: PERMISSIONS.READ_LOCATIONS },
      { title: "Terminals", href: "/dashboard/settings/terminals", permission: PERMISSIONS.POS_STATION_READ },
      { title: "Tax Rates", href: "/dashboard/settings/tax-rates", permission: PERMISSIONS.TAX_RATES_READ },
      { title: "Roles & Permissions", href: "/dashboard/settings/roles", permission: PERMISSIONS.READ_ROLES },
      { title: "Users & Invites", href: "/dashboard/settings/users", permission: PERMISSIONS.READ_USERS },
      { title: "Company", href: "/dashboard/settings/company", permission: PERMISSIONS.COMPANY_READ },
      { title: "Change Password", href: "/dashboard/change-password", permission: PERMISSIONS.PASSWORD_READ },
      { title: "Photo Storage", href: "/dashboard/settings/photo-storage", permission: PERMISSIONS.MANAGE_SYSTEM_SETTINGS },
    ],
  },
  {
    title: "Administration",
    href: "/dashboard/admin",
    icon: Shield,
    dropdown: false,
    permission: PERMISSIONS.READ_USERS,
  },
];
