const fs = require("fs")
const path = require("path")

const packageJson = require("../../package.json")
const { buildModuleSurfaceInventory } = require("../module-surface-inventory")

function pageRecord(report, surface) {
  return report.records.find((record) => record.surfaceType === "page" && record.surface === surface)
}

describe("module surface first enforcement pass", () => {
  const report = buildModuleSurfaceInventory(process.cwd(), { mode: "report" })

  it.each([
    ["/dashboard/inventory", "inventory.read"],
    ["/dashboard/items", "inventory.items.read"],
    ["/dashboard/items/new", "inventory.items.create"],
    ["/dashboard/inventory/items", "inventory.items.read"],
    ["/dashboard/inventory/items/create", "inventory.items.create"],
    ["/dashboard/inventory/items/new", "inventory.items.create"],
    ["/dashboard/inventory/items/[id]/others", "inventory.items.read"],
    ["/dashboard/inventory/items/[id]/suppliers", "inventory.items.read"],
    ["/dashboard/inventory/movements", "inventory.levels.read"],
    ["/dashboard/inventory/transfers", "TRANSFERS_READ"],
    ["/dashboard/inventory/brands", "inventory.brands.read"],
    ["/dashboard/inventory/brands/create", "inventory.brands.create"],
    ["/dashboard/inventory/brands/[id]/edit", "inventory.brands.update"],
    ["/dashboard/inventory/categories", "inventory.categories.read"],
    ["/dashboard/inventory/categories/create", "inventory.categories.create"],
    ["/dashboard/inventory/categories/[id]", "inventory.categories.read"],
    ["/dashboard/inventory/categories/[id]/edit", "inventory.categories.update"],
    ["/dashboard/inventory/units", "inventory.units.read"],
    ["/dashboard/inventory/units/create", "inventory.units.create"],
    ["/dashboard/inventory/units/[id]/edit", "inventory.units.update"],
  ])("guards inventory page surface %s", (surface, permission) => {
    const record = pageRecord(report, surface)

    expect(record).toMatchObject({ guard: "checkPermission", permission })
    expect(record.classification).not.toContain("missing permission")
    expect(record.classification).not.toContain("dashboard-only risk")
  })

  it.each([
    ["/dashboard/change-password", "PASSWORD_READ"],
    ["/dashboard/settings/appearance", "DASHBOARD_READ"],
    ["/dashboard/settings/company", "COMPANY_READ"],
    ["/dashboard/settings/organization", "COMPANY_READ"],
    ["/dashboard/settings/locations", "locations.read"],
    ["/dashboard/settings/locations/create", "locations.create"],
    ["/dashboard/settings/locations/new", "locations.create"],
    ["/dashboard/settings/locations/[id]/edit", "locations.update"],
    ["/dashboard/settings/notifications", "communication.notifications.read"],
    ["/dashboard/settings/roles", "READ_ROLES"],
    ["/dashboard/settings/roles/new", "roles.create"],
    ["/dashboard/settings/roles/update/[id]", "roles.update"],
    ["/dashboard/settings/security", "PASSWORD_READ"],
    ["/dashboard/settings/tax-rates", "taxes.read"],
    ["/dashboard/settings/tax-rates/create", "taxes.create"],
    ["/dashboard/settings/tax-rates/[id]/edit", "taxes.update"],
    ["/dashboard/settings/terminals", "POS_STATION_READ"],
    ["/dashboard/settings/users", "READ_USERS"],
  ])("guards settings page surface %s", (surface, permission) => {
    const record = pageRecord(report, surface)

    expect(record).toMatchObject({ guard: "checkPermission", permission })
    expect(record.classification).not.toContain("missing permission")
    expect(record.classification).not.toContain("dashboard-only risk")
  })
  it("guards accounting control center page surface with sidebar setup permission", () => {
    const record = pageRecord(report, "/dashboard/accounting/control-center")

    expect(record).toMatchObject({ guard: "checkPermission", permission: "accounting.setup.manage" })
    expect(record.classification).not.toContain("missing permission")
    expect(record.classification).not.toContain("dashboard-only risk")
  })

  it("guards the legacy inventory action file without enabling module enforcement", () => {
    const record = report.records.find(
      (item) => item.surfaceType === "action" && item.file === "actions/inventory/inventoryActions.ts",
    )
    const source = fs.readFileSync(path.join(process.cwd(), "actions/inventory/inventoryActions.ts"), "utf8")

    expect(record).toMatchObject({ guard: "requirePermission", permission: "inventory.items.read", observeOrEnforce: "report-only" })
    expect(record.classification).not.toContain("missing permission")
    expect(source).toContain('permission: "inventory.items.read"')
    expect(source).toContain('permission: "inventory.items.create"')
    expect(source).toContain('permission: "inventory.levels.read"')
    expect(source).toContain('permission: "inventory.levels.adjust"')
    expect(source).toContain('permission: "inventory.stock.adjust"')
    expect(source).toContain('permission: "TRANSFERS_READ"')
    expect(source).toContain('permission: "inventory.stock.transfer"')
    expect(source).not.toContain("observeModuleAccess")
    expect(source).not.toContain("module: {")
  })


  it.each([
    ["/dashboard/finance", "FinanceRouteAccess", "financeViewPermissions(overview)"],
    ["/dashboard/finance/receivables", "FinanceRouteAccess", "financeViewPermissions(receivables)"],
    ["/dashboard/finance/cash-command", "requireAnyPermission", "finance.read | dashboard.read"],
    ["/dashboard/payroll", "requireAnyPermission", "payroll.command.read"],
  ])("guards focused finance and payroll dashboard surface %s", (surface, guard, permission) => {
    const record = pageRecord(report, surface)

    expect(record).toMatchObject({ guard, permission })
    expect(record.classification).not.toContain("missing permission")
    expect(record.classification).not.toContain("dashboard-only risk")
  })

  it("recognizes focused finance and payroll dashboard actions without enabling module entitlement enforcement", () => {
    const financeAction = report.records.find(
      (item) => item.surfaceType === "action" && item.file === "actions/finance/finance-dashboard.actions.ts",
    )
    const payrollAction = report.records.find(
      (item) => item.surfaceType === "action" && item.file === "actions/payroll/payroll-command-read-model.actions.ts",
    )
    const payrollActionSource = fs.readFileSync(path.join(process.cwd(), "actions/payroll/payroll-command-read-model.actions.ts"), "utf8")
    const payrollPageSource = fs.readFileSync(path.join(process.cwd(), "app/[locale]/(dashboard)/dashboard/payroll/page.tsx"), "utf8")

    expect(financeAction).toMatchObject({
      moduleSlug: "finance",
      guard: "requireAnyPermission",
      permission: "getFinanceDashboardViewPermissions(parsed.view)",
      observeOrEnforce: "report-only",
    })
    expect(financeAction.classification).not.toContain("missing permission")
    expect(payrollAction).toMatchObject({ moduleSlug: "payroll", guard: "protect", permission: "payroll.command.read", observeOrEnforce: "report-only" })
    expect(payrollAction.classification).not.toContain("missing permission")
    expect(payrollActionSource).toContain('mode: "observe"')
    expect(payrollPageSource).toContain('mode: "observe"')
    expect(payrollPageSource).not.toContain("if (!moduleDecision.allowed)")
  })

  it("keeps module surface inventory report-only", () => {
    expect(packageJson.scripts["module:surface:inventory"]).toContain("--mode report")
    expect(packageJson.scripts["policy:gates"]).not.toContain("module:surface:inventory")
  })
})
