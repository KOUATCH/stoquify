jest.mock("lucide-react", () => {
  const React = require("react")
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      React.createElement("svg", { "data-testid": `icon-${name}`, ...props })
    Icon.displayName = name
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})

import fs from "fs"
import path from "path"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"

import {
  filterSidebarLinksByPermission,
  getDefaultSidebarLinks,
  getSidebarSections,
  isSidebarHrefActive,
  searchSidebarLinks,
  sidebarLinks,
} from "../sidebar"

function allSidebarHrefs() {
  return sidebarLinks.flatMap((link) => [
    link.href,
    ...(link.dropdownMenu?.map((item) => item.href) ?? []),
  ]).filter((href): href is string => Boolean(href))
}

function collectDashboardRoutes() {
  const root = process.cwd()
  const dashboardRoot = path.join(root, "app", "[locale]", "(dashboard)", "dashboard")
  const routes = new Set<string>()

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const current = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        walk(current)
        continue
      }

      if (entry.isFile() && entry.name === "page.tsx") {
        let relative = path.relative(dashboardRoot, current).replace(/\\/g, "/")
        relative = relative === "page.tsx" ? "" : relative.replace(/\/page\.tsx$/, "")
        routes.add(relative === "" ? "/dashboard" : `/dashboard/${relative}`)
      }
    }
  }

  walk(dashboardRoot)

  return routes
}

function expectOverviewThenAlphabetical(items: { title: string }[]) {
  const titles = items.map((item) => item.title)
  const overview = titles[0] === "Overview" ? [titles[0]] : []
  const rest = titles.slice(overview.length)

  expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)))
}

describe("sidebar information architecture", () => {
  it("pins Dashboard first and alphabetizes the remaining top-level groups", () => {
    const titles = sidebarLinks.map((link) => link.title)

    expect(titles[0]).toBe("Dashboard")
    expect(titles.slice(1)).toEqual([...titles.slice(1)].sort((a, b) => a.localeCompare(b)))
  })

  it("keeps submenu labels alphabetical after an optional Overview entry", () => {
    for (const link of sidebarLinks) {
      if (link.dropdownMenu?.length) {
        expectOverviewThenAlphabetical(link.dropdownMenu)
      }
    }
  })

  it("introduces real primary dashboard routes that were previously absent", () => {
    expect(allSidebarHrefs()).toEqual(expect.arrayContaining([
      "/dashboard/accounting",
      "/dashboard/analytics",
      "/dashboard/assurance/control-tower",
      "/dashboard/compliance",
      "/dashboard/customers",
      "/dashboard/finance/profit-loss",
      "/dashboard/purchase-orders",
      "/dashboard/purchase-orders/new",
      "/dashboard/purchases",
      "/dashboard/people",
      "/dashboard/purchases/payables",
      "/dashboard/purchases/suppliers",
      "/dashboard/sales",
      "/dashboard/settings/appearance",
      "/dashboard/settings/notifications",
      "/dashboard/settings/security",
    ]))
  })

  it("does not expose stale legacy links without a dashboard page", () => {
    expect(allSidebarHrefs()).not.toEqual(expect.arrayContaining([
      "/dashboard/admin",
      "/dashboard/blogs",
      "/dashboard/commercial-agents",
      "/dashboard/inventory/stock",
      "/dashboard/orders",
      "/dashboard/production",
      "/dashboard/session-pos-sync",
    ]))
  })

  it("only links sidebar entries to existing dashboard pages", () => {
    const routes = collectDashboardRoutes()

    for (const href of allSidebarHrefs()) {
      if (href.startsWith("/dashboard")) {
        expect(routes.has(href)).toBe(true)
      }
    }
  })
})

describe("sidebar finance reconciliation permissions", () => {
  it("exposes the finance reconciliation route to read-only reconciliation users", () => {
    const finance = sidebarLinks.find((link) => link.title === "Finance")
    const reconciliation = finance?.dropdownMenu?.find((item) => item.href === "/dashboard/finance/reconciliation")

    expect(reconciliation).toEqual(
      expect.objectContaining({
        title: "Reconciliation",
        permission: "payments.reconciliation.read",
        moduleSlug: "payment_reconciliation",
      }),
    )
  })
})

describe("sidebar HR and payroll visibility", () => {
  it("exposes the implemented payroll command, declaration, payment, employee, and self-service routes", () => {
    const hrPayroll = sidebarLinks.find((link) => link.title === "HR & Payroll")

    expect(hrPayroll).toEqual(
      expect.objectContaining({
        dropdown: true,
        permission: "payroll.command.read",
      }),
    )
    expect(hrPayroll?.dropdownMenu).toEqual([
      expect.objectContaining({ title: "Overview", href: "/dashboard/payroll", permission: "payroll.command.read" }),
      expect.objectContaining({ title: "Attendance", href: "/dashboard/payroll/attendance", permission: "payroll.payment_destination.read" }),
      expect.objectContaining({ title: "Compensation", href: "/dashboard/payroll/compensation", permission: "payroll.compensation.read" }),
      expect.objectContaining({ title: "Contracts", href: "/dashboard/payroll/contracts", permission: "payroll.contracts.read" }),
      expect.objectContaining({ title: "Declarations", href: "/dashboard/payroll/declarations", permission: "payroll.command.read" }),
      expect.objectContaining({ title: "Employees", href: "/dashboard/payroll/employees", permission: "payroll.employees.read" }),
      expect.objectContaining({ title: "My HR", href: "/dashboard/people/me", permission: "hris.self_service.read" }),
      expect.objectContaining({ title: "My Payslips", href: "/dashboard/payroll/payslips", permission: "payroll.payslips.self.read" }),
      expect.objectContaining({ title: "Payments", href: "/dashboard/payroll/payments", permission: "payroll.command.read" }),
      expect.objectContaining({ title: "Register", href: "/dashboard/payroll/register", permission: "payroll.reports.read" }),
      expect.objectContaining({ title: "Runs", href: "/dashboard/payroll/runs", permission: "payroll.command.read" }),
      expect.objectContaining({ title: "Setup", href: "/dashboard/payroll/setup", permission: "payroll.runs.calculate" }),
      expect.objectContaining({ title: "Workforce", href: "/dashboard/people/team", permission: "hris.people.read" }),
    ])
  })

  it("does not expose missing presence or payroll subroutes", () => {
    expect(allSidebarHrefs()).not.toEqual(expect.arrayContaining([
      "/dashboard/presence",
      "/dashboard/payroll/salary-list",
    ]))
  })

  it("exposes the HRIS People workspace through its own permission", () => {
    const people = sidebarLinks.find((link) => link.title === "People")

    expect(people).toEqual(
      expect.objectContaining({
        href: "/dashboard/people",
        dropdown: false,
        permission: "hris.people.read",
      }),
    )
  })

  it("keeps payroll pages visible for legacy payroll grants", () => {
    const legacyPayrollGrants = ["PAYROLL_READ", "PAYROLL_REPORTS_READ", "EMPLOYEE_SALARY_READ", "PAYROLL_PROCESS"]
    const filtered = filterSidebarLinksByPermission(sidebarLinks, (permission) =>
      hasRbacPermission(legacyPayrollGrants, permission),
    )
    const hrPayroll = filtered.find((link) => link.title === "HR & Payroll")

    expect(filtered.find((link) => link.title === "People")).toBeUndefined()
    expect(hrPayroll?.dropdownMenu?.map((item) => item.href)).toEqual([
      "/dashboard/payroll",
      "/dashboard/payroll/attendance",
      "/dashboard/payroll/compensation",
      "/dashboard/payroll/contracts",
      "/dashboard/payroll/declarations",
      "/dashboard/payroll/employees",
      "/dashboard/payroll/payslips",
      "/dashboard/payroll/payments",
      "/dashboard/payroll/register",
      "/dashboard/payroll/runs",
      "/dashboard/payroll/setup",
    ])
  })

  it("keeps the scoped workforce and People routes visible without payroll access", () => {
    const filtered = filterSidebarLinksByPermission(sidebarLinks, (permission) =>
      hasRbacPermission(["hris.people.read"], permission),
    )

    expect(filtered.map((link) => link.title)).toEqual(["HR & Payroll", "People"])
    expect(filtered.find((link) => link.title === "HR & Payroll")?.dropdownMenu).toEqual([
      expect.objectContaining({ title: "Workforce", href: "/dashboard/people/team" }),
    ])
  })
})

describe("sidebar inventory loss visibility", () => {
  it("exposes the real loss-control route through inventory read authority", () => {
    const inventory = sidebarLinks.find(
      (link) => link.title === "Inventory",
    )
    const lossControl = inventory?.dropdownMenu?.find(
      (item) =>
        item.href === "/dashboard/inventory/loss-control",
    )

    expect(lossControl).toEqual(
      expect.objectContaining({
        title: "Loss Control",
        permission: "inventory.levels.read",
      }),
    )
  })
})

describe("sidebar filtering and route matching", () => {
  it("keeps a parent section visible when a user only has a matching child permission", () => {
    const filtered = filterSidebarLinksByPermission(
      sidebarLinks,
      (permission) => permission === "finance.payables.read",
    )

    expect(filtered.find((link) => link.title === "Finance")?.dropdownMenu).toEqual([
      expect.objectContaining({ title: "Payables", href: "/dashboard/finance/payables" }),
    ])
    expect(filtered.find((link) => link.title === "Purchases")?.dropdownMenu).toEqual([
      expect.objectContaining({ title: "AP History", href: "/dashboard/purchases/payables/history" }),
      expect.objectContaining({ title: "AP Workbench", href: "/dashboard/purchases/payables" }),
    ])
  })

  it("surfaces transaction-history destinations in the sidebar", () => {
    expect(allSidebarHrefs()).toEqual(expect.arrayContaining([
      "/dashboard/finance/cash-payment-history",
      "/dashboard/finance/receivables/history",
      "/dashboard/purchases/payables/history",
    ]))
  })

  it.each([
    "purchasing.ap.invoice.view",
    "finance.payables.read",
    "purchases.suppliers.read",
  ])("shows AP history to an authorized %s user", (permission) => {
    const filtered = filterSidebarLinksByPermission(
      sidebarLinks,
      (candidate) => candidate === permission,
    )

    expect(filtered.find((link) => link.title === "Purchases")?.dropdownMenu).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "AP History",
          href: "/dashboard/purchases/payables/history",
        }),
      ]),
    )
  })

  it("keeps the AP history navigation rule aligned with the route boundary", () => {
    const purchases = sidebarLinks.find((link) => link.title === "Purchases")
    const history = purchases?.dropdownMenu?.find(
      (item) => item.href === "/dashboard/purchases/payables/history",
    )

    expect(history).toEqual(expect.objectContaining({
      permissions: [
        "purchasing.ap.invoice.view",
        "finance.payables.read",
        "purchases.suppliers.read",
      ],
      permissionMode: "any",
    }))
  })

  it("keeps the default sidebar broad enough for functional testability", () => {
    const focused = getDefaultSidebarLinks(sidebarLinks, "/dashboard")

    expect(focused.map((link) => link.title)).toEqual([
      "Dashboard",
      "Accounting",
      "Analytics",
      "Assurance Control Tower",
      "Command Center",
      "Compliance",
      "Finance",
      "HR & Payroll",
      "Inventory",
      "People",
      "Purchases",
      "Sales",
      "Settings",
    ])
    expect(getSidebarSections(focused).map((section) => section.key)).toEqual([
      "command",
      "operations",
      "finance",
      "people",
      "governance",
    ])
    expect(focused.length).toBe(sidebarLinks.length)
  })

  it("keeps the active parent visible for child routes", () => {
    const focused = getDefaultSidebarLinks(sidebarLinks, "/dashboard/purchases/payables")

    expect(focused.map((link) => link.title)).toContain("Purchases")
  })

  it("searches parent groups and child destinations without dropping RBAC-filtered children", () => {
    const results = searchSidebarLinks(sidebarLinks, "profit")
    const finance = results.find((link) => link.title === "Finance")

    expect(finance?.dropdownMenu?.map((item) => item.title)).toEqual([
      "Profit & Loss",
      "Profitability",
    ])
  })

  it("matches active routes exactly for dashboard and by segment for child pages", () => {
    expect(isSidebarHrefActive("/dashboard", "/dashboard")).toBe(true)
    expect(isSidebarHrefActive("/dashboard/finance/profit-loss", "/dashboard/finance")).toBe(true)
    expect(isSidebarHrefActive("/dashboard/financeering", "/dashboard/finance")).toBe(false)
  })
})
