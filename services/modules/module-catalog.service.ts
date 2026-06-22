import "server-only"

import type {
  CommercialModuleSlug,
  ModuleCatalogEntry,
  ModuleDependency,
} from "./module-control-contracts"
import { isCommercialModuleSlug } from "./module-control-contracts"

const dependencies: ModuleDependency[] = [
  {
    moduleSlug: "pos",
    dependsOnSlug: "sales",
    dependencyType: "required",
    reason: "POS writes sales orders, payments, stock movements, and receipt evidence.",
  },
  {
    moduleSlug: "payment_reconciliation",
    dependsOnSlug: "finance",
    dependencyType: "required",
    reason: "Payment reconciliation needs finance cash ledgers and payment-provider accounts.",
  },
  {
    moduleSlug: "payment_reconciliation",
    dependsOnSlug: "accounting",
    dependencyType: "required",
    reason: "Reconciled payment truth must link back to posted ledger evidence.",
  },
  {
    moduleSlug: "close_assurance",
    dependsOnSlug: "accounting",
    dependencyType: "required",
    reason: "Close assurance depends on accounting periods, journals, and ledger checks.",
  },
  {
    moduleSlug: "close_assurance",
    dependsOnSlug: "payment_reconciliation",
    dependencyType: "recommended",
    reason: "Close readiness is stronger when payment reconciliation evidence is available.",
  },
  {
    moduleSlug: "payroll",
    dependsOnSlug: "accounting",
    dependencyType: "recommended",
    reason: "Payroll becomes enterprise-grade when runs are posted to ledger evidence.",
  },
  {
    moduleSlug: "purchasing",
    dependsOnSlug: "inventory",
    dependencyType: "recommended",
    reason: "Purchasing decisions are stronger when purchase orders update stock exposure.",
  },
  {
    moduleSlug: "analytics",
    dependsOnSlug: "reports",
    dependencyType: "recommended",
    reason: "Analytics surfaces depend on report/export semantics and shared read models.",
  },
]

const catalog: ModuleCatalogEntry[] = [
  {
    slug: "dashboard",
    name: "Operating Dashboard",
    description: "Core tenant shell, command navigation, and operating overview.",
    owner: "Platform",
    status: "available",
    riskLevel: "medium",
    core: true,
    routePrefixes: ["/dashboard"],
    permissions: ["dashboard.read"],
    dependencies: [],
  },
  {
    slug: "inventory",
    name: "Inventory",
    description: "Items, categories, stock, transfers, movements, counts, and stock valuation evidence.",
    owner: "Inventory",
    status: "available",
    riskLevel: "high",
    core: false,
    routePrefixes: ["/dashboard/inventory", "/dashboard/items"],
    permissions: ["inventory.read", "inventory.items.read"],
    dependencies: [],
  },
  {
    slug: "production",
    name: "Production",
    description: "Recipes, batches, raw materials, production costing, planning, and profitability.",
    owner: "Operations",
    status: "beta",
    riskLevel: "medium",
    core: false,
    routePrefixes: ["/dashboard/production"],
    permissions: ["PRODUCTION_READ"],
    dependencies: [],
  },
  {
    slug: "sales",
    name: "Sales",
    description: "Sales orders, customers, delivery workflows, client orders, and sales reporting.",
    owner: "Revenue",
    status: "available",
    riskLevel: "high",
    core: false,
    routePrefixes: ["/dashboard/sales", "/dashboard/orders", "/dashboard/customers", "/dashboard/session-pos-sync"],
    permissions: ["sales.read", "customers.read"],
    dependencies: [],
  },
  {
    slug: "pos",
    name: "POS",
    description: "Point-of-sale selling, offline devices, sessions, tenders, refunds, and drawer workflows.",
    owner: "Revenue",
    status: "available",
    riskLevel: "critical",
    core: false,
    routePrefixes: ["/dashboard/pos"],
    permissions: ["pos.operate", "OPERATE_POS"],
    dependencies: dependenciesFor("pos"),
  },
  {
    slug: "cash_drawer",
    name: "Cash Drawer",
    description: "Cash drawer accountability, cash movement, shift evidence, and variance visibility.",
    owner: "Finance",
    status: "available",
    riskLevel: "critical",
    core: false,
    routePrefixes: ["/dashboard/finance/cash-drawer", "/dashboard/cashDrawer"],
    permissions: ["CASH_DRAWER_READ"],
    dependencies: dependenciesFor("pos"),
  },
  {
    slug: "accounting",
    name: "OHADA Accounting",
    description: "Chart of accounts, journals, ledgers, posting batches, source links, and OHADA-ready records.",
    owner: "Accounting",
    status: "available",
    riskLevel: "critical",
    core: false,
    routePrefixes: ["/dashboard/accounting"],
    permissions: ["accounting.reports.read", "accounting.journal.read"],
    dependencies: [],
  },
  {
    slug: "close_assurance",
    name: "Close Assurance",
    description: "Period close readiness, evidence graphs, findings, reviews, certified close packs, and export gates.",
    owner: "Accounting",
    status: "available",
    riskLevel: "critical",
    core: false,
    routePrefixes: ["/dashboard/accounting/close"],
    permissions: ["accounting.close.read"],
    dependencies: dependenciesFor("close_assurance"),
  },
  {
    slug: "compliance",
    name: "Compliance",
    description: "Fiscal documents, country packs, submissions, adapter metadata, and compliance evidence.",
    owner: "Compliance",
    status: "available",
    riskLevel: "critical",
    core: false,
    routePrefixes: ["/dashboard/compliance"],
    permissions: ["compliance.documents.read"],
    dependencies: dependenciesFor("accounting"),
  },
  {
    slug: "purchasing",
    name: "Purchasing and AP",
    description: "Purchase orders, suppliers, AP controls, supplier invoices, and payable release evidence.",
    owner: "Procurement",
    status: "available",
    riskLevel: "high",
    core: false,
    routePrefixes: ["/dashboard/purchase-orders", "/dashboard/purchases"],
    permissions: ["purchases.read", "purchasing.ap.invoice.view"],
    dependencies: dependenciesFor("purchasing"),
  },
  {
    slug: "presence",
    name: "Presence",
    description: "Attendance, clock events, team presence, alerts, and operational staff time visibility.",
    owner: "People",
    status: "available",
    riskLevel: "medium",
    core: false,
    routePrefixes: ["/dashboard/presence"],
    permissions: ["PRESENCE_READ"],
    dependencies: [],
  },
  {
    slug: "payroll",
    name: "Payroll",
    description: "Employees, contracts, payroll runs, payslips, declarations, payment batches, and payroll posting.",
    owner: "People",
    status: "available",
    riskLevel: "critical",
    core: false,
    routePrefixes: ["/dashboard/payroll"],
    permissions: ["PAYROLL_READ", "payroll.runs.calculate"],
    dependencies: dependenciesFor("payroll"),
  },
  {
    slug: "finance",
    name: "Finance",
    description: "Finance dashboard, receivables, payables, cash flow, payment views, and financial control surfaces.",
    owner: "Finance",
    status: "available",
    riskLevel: "critical",
    core: false,
    routePrefixes: ["/dashboard/finance"],
    permissions: ["finance.read", "FINANCIAL_READ"],
    dependencies: [],
  },
  {
    slug: "payment_reconciliation",
    name: "Payment Reconciliation",
    description: "Provider accounts, statement ingestion, matching, suspense, exceptions, signoff, and certificates.",
    owner: "Finance",
    status: "available",
    riskLevel: "critical",
    core: false,
    routePrefixes: ["/dashboard/finance/reconciliation"],
    permissions: ["payments.reconciliation.read"],
    dependencies: dependenciesFor("payment_reconciliation"),
  },
  {
    slug: "analytics",
    name: "Analytics",
    description: "Business analytics, sales intelligence, dashboards, and command-center reporting.",
    owner: "Data",
    status: "available",
    riskLevel: "medium",
    core: false,
    routePrefixes: ["/dashboard/analytics"],
    permissions: ["VIEW_ANALYTICS", "finance.analytics.read"],
    dependencies: dependenciesFor("analytics"),
  },
  {
    slug: "reports",
    name: "Reports",
    description: "Operational, financial, cashier, item, trust, and export-ready reporting surfaces.",
    owner: "Data",
    status: "available",
    riskLevel: "high",
    core: false,
    routePrefixes: ["/dashboard/reports"],
    permissions: ["reports.read", "VIEW_FINANCIAL_REPORTS"],
    dependencies: [],
  },
  {
    slug: "commercial_agents",
    name: "Commercial Agents",
    description: "Agent networks, business development workflows, and revenue channel operations.",
    owner: "Sales",
    status: "available",
    riskLevel: "medium",
    core: false,
    routePrefixes: ["/dashboard/commercial-agents"],
    permissions: ["COMMERCIAL_AGENTS_READ"],
    dependencies: [],
  },
  {
    slug: "content",
    name: "Content",
    description: "Blog, public content, education, and marketing content administration.",
    owner: "Growth",
    status: "internal",
    riskLevel: "low",
    core: false,
    routePrefixes: ["/dashboard/blogs"],
    permissions: ["BLOGS_READ"],
    dependencies: [],
  },
  {
    slug: "settings",
    name: "Settings",
    description: "Tenant settings, locations, terminals, users, roles, security, and module control surfaces.",
    owner: "Platform",
    status: "available",
    riskLevel: "critical",
    core: true,
    routePrefixes: ["/dashboard/settings", "/dashboard/change-password"],
    permissions: ["MANAGE_SYSTEM_SETTINGS"],
    dependencies: [],
  },
  {
    slug: "administration",
    name: "Administration",
    description: "Administrative user and system control surfaces.",
    owner: "Platform",
    status: "internal",
    riskLevel: "critical",
    core: true,
    routePrefixes: ["/dashboard/admin"],
    permissions: ["users.read"],
    dependencies: [],
  },
]

const aliases: Record<string, CommercialModuleSlug> = {
  accounting: "accounting",
  admin: "administration",
  administration: "administration",
  analytics: "analytics",
  attendance: "presence",
  cash: "cash_drawer",
  cash_drawer: "cash_drawer",
  close: "close_assurance",
  close_assurance: "close_assurance",
  compliance: "compliance",
  content: "content",
  dashboard: "dashboard",
  finance: "finance",
  finances: "finance",
  inventory: "inventory",
  ohada_accounting: "accounting",
  paiement: "payment_reconciliation",
  payment_reconciliation: "payment_reconciliation",
  payment_recon: "payment_reconciliation",
  payments: "finance",
  pos: "pos",
  presence: "presence",
  production: "production",
  purchase: "purchasing",
  purchases: "purchasing",
  purchasing: "purchasing",
  payroll: "payroll",
  paie: "payroll",
  point_of_sale: "pos",
  reconciliation: "payment_reconciliation",
  reports: "reports",
  sales: "sales",
  settings: "settings",
  stock: "inventory",
}

export function getModuleCatalog() {
  return catalog
}

export function getModuleCatalogEntry(slug: CommercialModuleSlug) {
  return catalog.find((entry) => entry.slug === slug) ?? null
}

export function normalizeModuleSlug(value: string): CommercialModuleSlug | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

  if (!normalized) return null
  if (isCommercialModuleSlug(normalized)) return normalized
  return aliases[normalized] ?? null
}

export function normalizeRequestedModuleSlugs(values: readonly string[] | null | undefined) {
  const normalized = new Set<CommercialModuleSlug>()
  const unknown: string[] = []

  for (const value of values ?? []) {
    const slug = normalizeModuleSlug(value)
    if (slug) {
      normalized.add(slug)
    } else if (value.trim()) {
      unknown.push(value.trim())
    }
  }

  return {
    slugs: Array.from(normalized),
    unknown,
  }
}

export function moduleForPath(pathname: string) {
  const normalizedPath = pathname.replace(/^\/(en|fr)(?=\/)/, "")
  const matches = catalog
    .flatMap((entry) => entry.routePrefixes.map((prefix) => ({ entry, prefix })))
    .filter(({ prefix }) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)

  return matches[0]?.entry ?? null
}

function dependenciesFor(slug: CommercialModuleSlug) {
  return dependencies.filter((dependency) => dependency.moduleSlug === slug)
}

