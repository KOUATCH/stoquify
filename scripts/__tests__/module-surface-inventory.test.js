const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  buildModuleSurfaceInventory,
  parseArgs,
  renderMarkdown,
} = require("../module-surface-inventory")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "module-surface-inventory-"))
}

function writeFile(root, relativePath, content) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content, "utf8")
}

describe("module surface inventory", () => {
  it("builds report-only records across sidebar, modules, dashboard pages, and actions", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "services/modules/module-catalog.service.ts",
      `
      export const MODULE_CATALOG = [
        { slug: "dashboard", routePrefixes: ["/dashboard"], dependencies: [] },
        { slug: "inventory", routePrefixes: ["/dashboard/inventory"], dependencies: [] },
        { slug: "pos", routePrefixes: ["/dashboard/pos"], dependencies: [{ dependsOnSlug: "inventory" }] },
        { slug: "finance", routePrefixes: ["/dashboard/finance"], dependencies: [] },
        { slug: "payroll", routePrefixes: ["/dashboard/payroll"], dependencies: [] },
        { slug: "purchasing", routePrefixes: ["/dashboard/purchase-orders", "/dashboard/purchases", "/dashboard/suppliersSystem"], dependencies: [] },
        { slug: "settings", routePrefixes: ["/dashboard/settings", "/dashboard/notifications-demo"], dependencies: [] },
      ]
      `,
    )
    writeFile(
      root,
      "config/sidebar.ts",
      `
      export const sidebarLinks = [
        { title: "Inventory", href: "/dashboard/inventory", permission: "inventory.items.read", moduleSlug: "inventory" },
      ]
      `,
    )
    writeFile(
      root,
      "app/[locale]/(dashboard)/dashboard/inventory/page.tsx",
      `import { requireRbacContext } from "@/lib/security/rbac"; export default async function Page() { await requireRbacContext(); return null }`,
    )
    writeFile(
      root,
      "app/[locale]/(dashboard)/dashboard/finance/page.tsx",
      `import { FinanceRouteAccess, financeViewPermissions } from "./FinanceRouteAccess"; export default async function Page({ params }) { return FinanceRouteAccess({ params, permissions: financeViewPermissions("overview"), resource: "FinanceDashboard", title: "Finance dashboard", children: null }) }`,
    )
    writeFile(
      root,
      "app/[locale]/(dashboard)/dashboard/suppliersSystem/page.tsx",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export default async function Page() { const ctx = await requirePermission("purchases.suppliers.read"); await observeModuleAccess({ moduleSlug: "purchasing", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions }); return null }`,
    )
    writeFile(
      root,
      "app/[locale]/(dashboard)/dashboard/notifications-demo/page.tsx",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export default async function Page() { const ctx = await requirePermission("communication.notifications.read"); await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions }); return null }`,
    )
    writeFile(
      root,
      "actions/inventory/items.actions.ts",
      `const list = protect({ permission: "inventory.items.read", module: { moduleSlug: "inventory" } }, async () => null)`,
    )
    writeFile(
      root,
      "actions/dashboard/getDashboardData.ts",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export async function getAllDashboardData() { const ctx = await requirePermission("dashboard.read", { resource: "Dashboard" }); await observeModuleAccess({ moduleSlug: "dashboard", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/dashboard/getDashboardData.ts", accessIntent: "read", mode: "observe" }); return [] }`,
    )
    writeFile(
      root,
      "actions/manager-action-center/manager-action-center.actions.ts",
      `const action = protect<unknown, ManagerActionCenterData>({ permission: "dashboard.read", auditResource: "KontavaManagerActionCenter", auditAllowed: true, module: { moduleSlug: "dashboard", surface: "actions/manager-action-center/manager-action-center.actions.ts", accessIntent: "read", mode: "observe" } }, async () => null)`,
    )
    writeFile(
      root,
      "actions/owner-war-room/owner-war-room.actions.ts",
      `const action = protect<unknown, OwnerWarRoomData>({ permission: "dashboard.read", auditResource: "KontavaOwnerWarRoom", auditAllowed: true, module: { moduleSlug: "dashboard", surface: "actions/owner-war-room/owner-war-room.actions.ts", accessIntent: "read", mode: "observe" } }, async () => null)`,
    )
    writeFile(
      root,
      "actions/locations/getOrgLocations.ts",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export async function getOrgLocations() { const ctx = await requirePermission("locations.read", { resource: "Location" }); await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/locations/getOrgLocations.ts", accessIntent: "read", mode: "observe" }); return [] }`,
    )
    writeFile(
      root,
      "actions/locations/createLocation.ts",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export default async function createLocation() { const ctx = await requirePermission("locations.create", { resource: "Location", auditAllowed: true }); await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/locations/createLocation.ts", accessIntent: "write", mode: "observe" }); return [] }`,
    )
    writeFile(
      root,
      "actions/locations/updateLocationById.ts",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export default async function updateLocationById() { const ctx = await requirePermission("locations.update", { resource: "Location", resourceId: "loc-1", auditAllowed: true }); await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/locations/updateLocationById.ts", accessIntent: "write", mode: "observe" }); return [] }`,
    )
    writeFile(
      root,
      "actions/locations/deleteLocation.ts",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export default async function deleteLocation() { const ctx = await requirePermission("locations.delete", { resource: "Location", resourceId: "loc-1", auditAllowed: true }); await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/locations/deleteLocation.ts", accessIntent: "write", mode: "observe" }); return [] }`,
    )
    writeFile(
      root,
      "actions/locations/location-management-actions.ts",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export async function getLocationManagementData() { const ctx = await requirePermission("locations.read", { resource: "Location" }); await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/locations/location-management-actions.ts", accessIntent: "read", mode: "observe" }); return [] } export async function createManagedLocation() { const ctx = await requirePermission("locations.create", { resource: "Location", auditAllowed: true }); await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/locations/location-management-actions.ts", accessIntent: "write", mode: "observe" }); return [] }`,
    )
    writeFile(
      root,
      "actions/units/getOrgUnits.ts",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export default async function getOrgUnits() { const ctx = await requirePermission("inventory.units.read", { resource: "Unit" }); await observeModuleAccess({ moduleSlug: "inventory", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/units/getOrgUnits.ts", accessIntent: "read", mode: "observe" }); return [] }`,
    )
    writeFile(
      root,
      "actions/taxRate/getOrgTaxRates.ts",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export default async function getOrgTaxRates() { const ctx = await requirePermission("taxes.read", { resource: "TaxRate" }); await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/taxRate/getOrgTaxRates.ts", accessIntent: "read", mode: "observe" }); return [] }`,
    )
    writeFile(
      root,
      "actions/taxRate/createActionTaxRate.ts",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export default async function createActionTaxRate() { const ctx = await requirePermission("taxes.create", { resource: "TaxRate", auditAllowed: true }); await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/taxRate/createActionTaxRate.ts", accessIntent: "write", mode: "observe" }); return [] }`,
    )
    writeFile(
      root,
      "actions/taxRate/tax-rate-management-actions.ts",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export async function getTaxRateManagementData() { const ctx = await requirePermission("taxes.read", { resource: "TaxRate" }); await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/taxRate/tax-rate-management-actions.ts", accessIntent: "read", mode: "observe" }); return [] }`,
    )
    writeFile(
      root,
      "actions/suppliers/getOrgSuppliers.ts",
      `import { requirePermission } from "@/lib/security/rbac"; import { observeModuleAccess } from "@/services/modules/module-entitlement.service"; export default async function getOrgSuppliers() { const ctx = await requirePermission("purchases.suppliers.read", { resource: "Supplier" }); await observeModuleAccess({ moduleSlug: "purchasing", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/suppliers/getOrgSuppliers.ts", accessIntent: "read", mode: "observe" }); return [] }`,
    )
    writeFile(
      root,
      "actions/finance/dashboard.actions.ts",
      `const ctx = await requireAnyPermission(getFinanceDashboardViewPermissions(parsed.view), { resource: "FinanceDashboard" })`,
    )
    writeFile(
      root,
      "actions/payroll/command.actions.ts",
      `const action = protect<unknown, PayrollCommandReadModel>({ permission: "payroll.command.read", module: { moduleSlug: "payroll", mode: "observe" } }, async () => null)`,
    )
    writeFile(
      root,
      "actions/purchasing/ap-control.actions.ts",
      `const action = protect({ permission: "purchasing.ap.invoice.view" }, async () => null)`,
    )
    writeFile(
      root,
      "actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts",
      `async function scopedOrg(requestedOrganizationId, permission = "purchases.orders.read", options) {
        return requirePermission(permission, { resource: "PurchaseOrder", resourceId: options?.resourceId })
      }
      function permissionForBulkStatus(status) {
        if (status === "APPROVED") return "purchases.orders.approve"
        if (status === "CANCELLED") return "purchases.orders.cancel"
        return "purchases.orders.update"
      }
      export async function getOrgPurchaseOrders(organizationId) {
        return scopedOrg(organizationId, "purchases.orders.read")
      }
      export async function createPurchaseOrder(payload) {
        return scopedOrg(payload.organizationId, "purchases.orders.create", { auditAllowed: true })
      }
      export async function bulkUpdatePurchaseOrderStatus(params) {
        return scopedOrg(params.organizationId, permissionForBulkStatus(params.toStatus), { auditAllowed: true })
      }`,
    )
    writeFile(
      root,
      "actions/purchaseOrderWorkflow/newPOActions.ts",
      `export * from "./purchaseOrderSystemAction"`,
    )

    const report = buildModuleSurfaceInventory(root, { mode: "report" })
    const navigation = report.records.find((record) => record.surfaceType === "navigation")
    const action = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/inventory/items.actions.ts")
    const dashboardAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/dashboard/getDashboardData.ts")
    const managerActionCenterAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/manager-action-center/manager-action-center.actions.ts")
    const ownerWarRoomAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/owner-war-room/owner-war-room.actions.ts")
    const locationsAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/locations/getOrgLocations.ts")
    const createLocationAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/locations/createLocation.ts")
    const updateLocationAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/locations/updateLocationById.ts")
    const deleteLocationAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/locations/deleteLocation.ts")
    const locationManagementAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/locations/location-management-actions.ts")
    const unitPickerAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/units/getOrgUnits.ts")
    const taxRatePickerAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/taxRate/getOrgTaxRates.ts")
    const taxRateCreateAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/taxRate/createActionTaxRate.ts")
    const taxRateManagementAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/taxRate/tax-rate-management-actions.ts")
    const supplierPickerAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/suppliers/getOrgSuppliers.ts")
    const financePage = report.records.find((record) => record.surfaceType === "page" && record.surface === "/dashboard/finance")
    const legacySupplierSystemPage = report.records.find((record) => record.surfaceType === "page" && record.surface === "/dashboard/suppliersSystem")
    const notificationsDemoPage = report.records.find((record) => record.surfaceType === "page" && record.surface === "/dashboard/notifications-demo")
    const financeAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/finance/dashboard.actions.ts")
    const payrollAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/payroll/command.actions.ts")
    const purchasingAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/purchasing/ap-control.actions.ts")
    const purchaseOrderWorkflowAction = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts")
    const delegatedPurchaseOrderShim = report.records.find((record) => record.surfaceType === "action" && record.file === "actions/purchaseOrderWorkflow/newPOActions.ts")
    const markdown = renderMarkdown(report)

    expect(report.summary.recordCount).toBeGreaterThanOrEqual(8)
    expect(navigation).toMatchObject({ moduleSlug: "inventory", permission: "inventory.items.read", guard: "sidebar-permission-filter" })
    expect(action).toMatchObject({ moduleSlug: "inventory", permission: "inventory.items.read", guard: "protect" })
    expect(dashboardAction).toMatchObject({ moduleSlug: "dashboard", permission: "dashboard.read", guard: "requirePermission" })
    expect(dashboardAction.classification).not.toContain("missing permission")
    expect(dashboardAction.classification).not.toContain("unmapped")
    expect(managerActionCenterAction).toMatchObject({ moduleSlug: "dashboard", permission: "dashboard.read", guard: "protect" })
    expect(managerActionCenterAction.classification).not.toContain("missing permission")
    expect(managerActionCenterAction.classification).not.toContain("unmapped")
    expect(ownerWarRoomAction).toMatchObject({ moduleSlug: "dashboard", permission: "dashboard.read", guard: "protect" })
    expect(ownerWarRoomAction.classification).not.toContain("missing permission")
    expect(ownerWarRoomAction.classification).not.toContain("unmapped")
    expect(locationsAction).toMatchObject({ moduleSlug: "settings", permission: "locations.read", guard: "requirePermission" })
    expect(locationsAction.classification).not.toContain("missing permission")
    expect(locationsAction.classification).not.toContain("unmapped")
    expect(createLocationAction).toMatchObject({ moduleSlug: "settings", permission: "locations.create", guard: "requirePermission" })
    expect(createLocationAction.classification).not.toContain("missing permission")
    expect(createLocationAction.classification).not.toContain("unmapped")
    expect(updateLocationAction).toMatchObject({ moduleSlug: "settings", permission: "locations.update", guard: "requirePermission" })
    expect(updateLocationAction.classification).not.toContain("missing permission")
    expect(updateLocationAction.classification).not.toContain("unmapped")
    expect(deleteLocationAction).toMatchObject({ moduleSlug: "settings", permission: "locations.delete", guard: "requirePermission" })
    expect(deleteLocationAction.classification).not.toContain("missing permission")
    expect(deleteLocationAction.classification).not.toContain("unmapped")
    expect(locationManagementAction).toMatchObject({ moduleSlug: "settings", permission: "locations.read", guard: "requirePermission" })
    expect(locationManagementAction.classification).not.toContain("missing permission")
    expect(locationManagementAction.classification).not.toContain("unmapped")
    expect(unitPickerAction).toMatchObject({ moduleSlug: "inventory", permission: "inventory.units.read", guard: "requirePermission" })
    expect(unitPickerAction.classification).not.toContain("missing permission")
    expect(unitPickerAction.classification).not.toContain("unmapped")
    expect(taxRatePickerAction).toMatchObject({ moduleSlug: "settings", permission: "taxes.read", guard: "requirePermission" })
    expect(taxRatePickerAction.classification).not.toContain("missing permission")
    expect(taxRatePickerAction.classification).not.toContain("unmapped")
    expect(taxRateCreateAction).toMatchObject({ moduleSlug: "settings", permission: "taxes.create", guard: "requirePermission" })
    expect(taxRateCreateAction.classification).not.toContain("missing permission")
    expect(taxRateCreateAction.classification).not.toContain("unmapped")
    expect(taxRateManagementAction).toMatchObject({ moduleSlug: "settings", permission: "taxes.read", guard: "requirePermission" })
    expect(taxRateManagementAction.classification).not.toContain("missing permission")
    expect(taxRateManagementAction.classification).not.toContain("unmapped")
    expect(supplierPickerAction).toMatchObject({ moduleSlug: "purchasing", permission: "purchases.suppliers.read", guard: "requirePermission" })
    expect(supplierPickerAction.classification).not.toContain("missing permission")
    expect(supplierPickerAction.classification).not.toContain("unmapped")
    expect(financePage).toMatchObject({ moduleSlug: "finance", permission: "financeViewPermissions(overview)", guard: "FinanceRouteAccess" })
    expect(financePage.classification).not.toContain("missing permission")
    expect(financePage.classification).not.toContain("dashboard-only risk")
    expect(legacySupplierSystemPage).toMatchObject({ moduleSlug: "purchasing", permission: "purchases.suppliers.read", guard: "requirePermission" })
    expect(legacySupplierSystemPage.classification).not.toContain("missing permission")
    expect(legacySupplierSystemPage.classification).not.toContain("dashboard-only risk")
    expect(notificationsDemoPage).toMatchObject({ moduleSlug: "settings", permission: "communication.notifications.read", guard: "requirePermission" })
    expect(notificationsDemoPage.classification).not.toContain("missing permission")
    expect(notificationsDemoPage.classification).not.toContain("dashboard-only risk")
    expect(financeAction).toMatchObject({ moduleSlug: "finance", permission: "getFinanceDashboardViewPermissions(parsed.view)", guard: "requireAnyPermission" })
    expect(financeAction.classification).not.toContain("missing permission")
    expect(payrollAction).toMatchObject({ moduleSlug: "payroll", permission: "payroll.command.read", guard: "protect" })
    expect(payrollAction.classification).not.toContain("missing permission")
    expect(purchasingAction).toMatchObject({ moduleSlug: "purchasing", permission: "purchasing.ap.invoice.view", guard: "protect" })
    expect(purchasingAction.classification).not.toContain("unknown slug")
    expect(purchaseOrderWorkflowAction).toMatchObject({ moduleSlug: "purchasing", guard: "requirePermission" })
    expect(purchaseOrderWorkflowAction.permission).toContain("purchases.orders.read")
    expect(purchaseOrderWorkflowAction.permission).toContain("purchases.orders.create")
    expect(purchaseOrderWorkflowAction.permission).toContain("purchases.orders.approve")
    expect(purchaseOrderWorkflowAction.permission).toContain("purchases.orders.cancel")
    expect(purchaseOrderWorkflowAction.permission).toContain("purchases.orders.update")
    expect(purchaseOrderWorkflowAction.classification).not.toContain("missing permission")
    expect(purchaseOrderWorkflowAction.classification).not.toContain("unknown slug")
    expect(delegatedPurchaseOrderShim).toMatchObject({
      moduleSlug: "purchasing",
      guard: "delegated-re-export",
      delegatedTo: ["actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts"],
    })
    expect(delegatedPurchaseOrderShim.permission).toContain("purchases.orders.read")
    expect(delegatedPurchaseOrderShim.permission).toContain("purchases.orders.create")
    expect(delegatedPurchaseOrderShim.classification).toContain("delegated re-export")
    expect(delegatedPurchaseOrderShim.classification).not.toContain("missing permission")
    expect(markdown).toContain("Report mode")
  })

  it("parses report outputs without enabling enforcement", () => {
    expect(parseArgs(["node", "script", "--mode", "report", "--out", "x.md", "--json-out", "x.json"])).toEqual({
      mode: "report",
      out: "x.md",
      jsonOut: "x.json",
    })
  })
  it("keeps sidebar child permissions in their owning dropdown section", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "services/modules/module-catalog.service.ts",
      `
      export const MODULE_CATALOG = [
        { slug: "purchasing", routePrefixes: ["/dashboard/purchases"], dependencies: [] },
        { slug: "sales", routePrefixes: ["/dashboard/sales"], dependencies: [] },
      ]
      `,
    )
    writeFile(
      root,
      "lib/permissions.ts",
      `
      export const PERMISSIONS = {
        READ_PURCHASE_ORDERS: "READ_PURCHASE_ORDERS",
        CREATE_SUPPLIERS: "CREATE_SUPPLIERS",
        READ_SUPPLIERS: "READ_SUPPLIERS",
        READ_SALES_ORDERS: "READ_SALES_ORDERS",
      }
      `,
    )
    writeFile(
      root,
      "config/sidebar.ts",
      `
      import { PERMISSIONS } from "@/lib/permissions"

      export const sidebarLinks = [
        {
          title: "Purchases",
          dropdown: true,
          permission: PERMISSIONS.READ_PURCHASE_ORDERS,
          moduleSlug: "purchasing",
          dropdownMenu: [
            { title: "AP Workbench", href: "/dashboard/purchases/payables", permission: "finance.payables.read" },
            { title: "New Supplier", href: "/dashboard/purchases/suppliers/create", permission: PERMISSIONS.CREATE_SUPPLIERS },
            { title: "Suppliers", href: "/dashboard/purchases/suppliers", permission: PERMISSIONS.READ_SUPPLIERS },
          ],
        },
        {
          title: "Sales",
          href: "/dashboard/sales",
          dropdown: false,
          permission: PERMISSIONS.READ_SALES_ORDERS,
          moduleSlug: "sales",
        },
      ]
      `,
    )

    const report = buildModuleSurfaceInventory(root, { mode: "report" })
    const createSupplier = report.records.find((record) => record.surface === "/dashboard/purchases/suppliers/create")
    const suppliers = report.records.find((record) => record.surface === "/dashboard/purchases/suppliers")

    expect(createSupplier).toMatchObject({
      surfaceType: "navigation",
      moduleSlug: "purchasing",
      permission: "CREATE_SUPPLIERS",
    })
    expect(suppliers).toMatchObject({
      surfaceType: "navigation",
      moduleSlug: "purchasing",
      permission: "READ_SUPPLIERS",
    })
  })
  it("classifies public identity and display-helper actions as not applicable to module enforcement", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "services/modules/module-catalog.service.ts",
      `export const MODULE_CATALOG = [{ slug: "settings", routePrefixes: ["/dashboard/settings"], dependencies: [] }]`,
    )
    writeFile(root, "config/sidebar.ts", `export const sidebarLinks = []`)
    writeFile(root, "actions/roles/role-utils.ts", `export const displayRoleName = (role) => role.nameEn || role.nameFr || ""`)
    writeFile(
      root,
      "actions/users/createInvitedUser.ts",
      `"use server"; import { acceptInvitationWorkflow } from "@/services/users/user-identity.service"; export async function createInvitedUser(data) { return acceptInvitationWorkflow(data) }`,
    )
    writeFile(
      root,
      "actions/users/createUser.ts",
      `"use server"; import { createOrganizationOwner } from "@/services/users/user-identity.service"; export default async function createUser(data, orgData) { return createOrganizationOwner(data, orgData) }`,
    )
    writeFile(
      root,
      "actions/users/sendResetLink.ts",
      `"use server"; import { requestPasswordResetLinkWorkflow } from "@/services/users/user-identity.service"; export async function sendResetLink(email) { return requestPasswordResetLinkWorkflow(email) }`,
    )
    writeFile(
      root,
      "actions/users/verifyOtp.ts",
      `"use server"; import { verifyEmailOtpWorkflow } from "@/services/users/user-identity.service"; export default async function verifyOTP(userId, otp) { return verifyEmailOtpWorkflow(userId, otp) }`,
    )

    const report = buildModuleSurfaceInventory(root, { mode: "report" })
    const byFile = (file) => report.records.find((record) => record.surfaceType === "action" && record.file === file)

    expect(byFile("actions/roles/role-utils.ts")).toMatchObject({
      moduleApplicability: "not applicable: internal display helper",
      classification: "not applicable: internal display helper",
    })
    expect(byFile("actions/users/createInvitedUser.ts")).toMatchObject({
      moduleApplicability: "not applicable: token-bound invitation acceptance",
      classification: "not applicable: token-bound invitation acceptance",
    })
    expect(byFile("actions/users/createUser.ts")).toMatchObject({
      moduleApplicability: "not applicable: public organization onboarding",
      classification: "not applicable: public organization onboarding",
    })
    expect(byFile("actions/users/sendResetLink.ts")).toMatchObject({
      moduleApplicability: "not applicable: public password reset request",
      classification: "not applicable: public password reset request",
    })
    expect(byFile("actions/users/verifyOtp.ts")).toMatchObject({
      moduleApplicability: "not applicable: public email verification",
      classification: "not applicable: public email verification",
    })

    for (const file of [
      "actions/roles/role-utils.ts",
      "actions/users/createInvitedUser.ts",
      "actions/users/createUser.ts",
      "actions/users/sendResetLink.ts",
      "actions/users/verifyOtp.ts",
    ]) {
      const record = byFile(file)
      expect(record.classification).not.toContain("missing permission")
      expect(record.classification).not.toContain("enforcement candidate")
      expect(record.classification).not.toContain("unmapped")
    }
  })

  it("maps the protected module-control action and excludes its internal contract from enforcement", () => {
    const root = makeTempRepo()
    writeFile(
      root,
      "services/modules/module-catalog.service.ts",
      "export const MODULE_CATALOG = [{ slug: \"settings\", routePrefixes: [\"/dashboard/settings\"], dependencies: [] }]",
    )
    writeFile(root, "config/sidebar.ts", "export const sidebarLinks = []")
    writeFile(
      root,
      "actions/modules/module-control.actions.ts",
      "const getControlCenter = protect({ permission: \"MANAGE_SYSTEM_SETTINGS\" }, async () => null)",
    )
    writeFile(
      root,
      "services/modules/module-control-contracts.ts",
      "export const MODULE_CONTROL_MODE = \"observe\"; export type ModuleSurfaceType = \"page\" | \"action\"",
    )

    const report = buildModuleSurfaceInventory(root, { mode: "report" })
    const action = report.records.find((record) => record.file === "actions/modules/module-control.actions.ts")
    const contract = report.records.find((record) => record.file === "services/modules/module-control-contracts.ts")

    expect(action).toMatchObject({
      surfaceType: "action",
      moduleApplicability: "required",
      moduleSlug: "settings",
      permission: "MANAGE_SYSTEM_SETTINGS",
      guard: "protect",
      classification: "mapped, enforcement candidate",
    })
    expect(contract).toMatchObject({
      surfaceType: "module_service",
      moduleApplicability: "not applicable: internal module governance contract",
      classification: "not applicable: internal module governance contract",
    })
    expect(contract.classification).not.toContain("unmapped")
    expect(contract.classification).not.toContain("enforcement candidate")
  })
})
