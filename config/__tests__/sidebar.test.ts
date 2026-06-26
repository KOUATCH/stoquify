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
      "/dashboard/assurance/control-tower",
      "/dashboard/finance/profit-loss",
      "/dashboard/purchases/payables",
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
      }),
    )
  })
})

describe("sidebar HR and payroll visibility", () => {
  it("exposes the payroll command center and real employee self-service route", () => {
    const hrPayroll = sidebarLinks.find((link) => link.title === "HR & Payroll")

    expect(hrPayroll).toEqual(
      expect.objectContaining({
        dropdown: true,
        permission: "payroll.command.read",
      }),
    )
    expect(hrPayroll?.dropdownMenu).toEqual([
      expect.objectContaining({ title: "Overview", href: "/dashboard/payroll", permission: "payroll.command.read" }),
      expect.objectContaining({ title: "My Payslips", href: "/dashboard/payroll/payslips", permission: "payroll.payslips.self.read" }),
      expect.objectContaining({ title: "Register", href: "/dashboard/payroll/register", permission: "payroll.reports.read" }),
    ])
  })

  it("does not expose missing presence or payroll subroutes", () => {
    expect(allSidebarHrefs()).not.toEqual(expect.arrayContaining([
      "/dashboard/presence",
      "/dashboard/payroll/employees",
      "/dashboard/payroll/salary-list",
    ]))
  })

  it("keeps payroll pages visible for legacy payroll grants", () => {
    const legacyPayrollGrants = ["PAYROLL_READ", "PAYROLL_REPORTS_READ", "EMPLOYEE_SALARY_READ"]
    const filtered = filterSidebarLinksByPermission(sidebarLinks, (permission) =>
      hasRbacPermission(legacyPayrollGrants, permission),
    )
    const hrPayroll = filtered.find((link) => link.title === "HR & Payroll")

    expect(hrPayroll?.dropdownMenu?.map((item) => item.href)).toEqual([
      "/dashboard/payroll",
      "/dashboard/payroll/payslips",
      "/dashboard/payroll/register",
    ])
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
      expect.objectContaining({ title: "AP Workbench", href: "/dashboard/purchases/payables" }),
    ])
  })

  it("keeps the default sidebar focused while preserving the five command lanes", () => {
    const focused = getDefaultSidebarLinks(sidebarLinks, "/dashboard")

    expect(focused.map((link) => link.title)).toEqual([
      "Dashboard",
      "Assurance Control Tower",
      "Command Center",
      "Finance",
      "HR & Payroll",
      "Inventory",
      "Settings",
    ])
    expect(getSidebarSections(focused).map((section) => section.key)).toEqual([
      "command",
      "operations",
      "finance",
      "people",
      "governance",
    ])
    expect(focused.length).toBeLessThan(sidebarLinks.length)
  })

  it("keeps an active hidden parent visible in the focused sidebar", () => {
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
