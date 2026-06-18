// config/permissions.ts - Centralized permissions configuration

// Dashboard permissions
export const dashboardPermissions = [
  "dashboard.read",
  "dashboard.analytics.read",
  "dashboard.overview.read",
] as const;

// User management permissions
export const userPermissions = [
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
  "users.invite",
  "users.roles.assign",
  "users.roles.remove",
  "users.password.reset",
  "users.activate",
  "users.deactivate",
] as const;

// Profile permissions
export const profilePermissions = [
  "profile.read",
  "profile.update",
  "profile.password.update",
  "profile.avatar.update",
] as const;

// Role and permissions management
export const rolePermissions = [
  "roles.read",
  "roles.create",
  "roles.update",
  "roles.delete",
  "roles.permissions.assign",
  "roles.permissions.remove",
] as const;

// Inventory management permissions
export const inventoryPermissions = [
  "inventory.read",
  "inventory.create",
  "inventory.update",
  "inventory.delete",
  "inventory.items.read",
  "inventory.items.create",
  "inventory.items.update",
  "inventory.items.delete",
  "inventory.levels.read",
  "inventory.levels.adjust",
  "inventory.categories.read",
  "inventory.categories.create",
  "inventory.categories.update",
  "inventory.categories.delete",
  "inventory.brands.read",
  "inventory.brands.create",
  "inventory.brands.update",
  "inventory.brands.delete",
  "inventory.units.read",
  "inventory.units.create",
  "inventory.units.update",
  "inventory.units.delete",
  "inventory.stock.adjust",
  "inventory.stock.transfer",
] as const;

// Location management permissions
export const locationPermissions = [
  "locations.read",
  "locations.create",
  "locations.update",
  "locations.delete",
  "locations.manage",
  "locations.settings.update",
] as const;

// Sales permissions
export const salesPermissions = [
  "sales.read",
  "sales.create",
  "sales.update",
  "sales.delete",
  "sales.orders.read",
  "sales.orders.create",
  "sales.orders.update",
  "sales.orders.cancel",
  "sales.orders.refund",
  "sales.analytics.read",
  "sales.reports.read",
  "sales.reports.export",
] as const;

// Purchase permissions
export const purchasePermissions = [
  "purchases.read",
  "purchases.create",
  "purchases.update",
  "purchases.delete",
  "purchases.orders.read",
  "purchases.orders.create",
  "purchases.orders.update",
  "purchases.orders.approve",
  "purchases.orders.cancel",
  "purchases.orders.receive",
  "purchases.suppliers.read",
  "purchases.suppliers.create",
  "purchases.suppliers.update",
  "purchases.suppliers.delete",
  "purchasing.ap.invoice.view",
  "purchasing.ap.invoice.post",
  "purchasing.ap.match.review",
  "purchasing.supplier.bank.request",
  "purchasing.supplier.bank.approve",
  "purchasing.ap.payment.request",
  "purchasing.ap.payment.approve",
  "purchasing.ap.payment.release",
] as const;

// Financial permissions
export const financialPermissions = [
  "finance.read",
  "finance.payables.read",
  "finance.payables.create",
  "finance.payables.update",
  "finance.payables.pay",
  "finance.receivables.read",
  "finance.receivables.create",
  "finance.receivables.update",
  "finance.receivables.collect",
  "finance.reports.read",
  "finance.reports.export",
  "finance.analytics.read",
  "finance.taxes.read",
  "finance.taxes.manage",
  "payments.provider-account.read",
  "payments.provider-account.manage",
  "payments.reconciliation.read",
  "payments.reconciliation.run",
  "payments.reconciliation.import",
  "payments.reconciliation.match",
  "payments.reconciliation.override",
  "payments.reconciliation.exception.assign",
  "payments.reconciliation.exception.resolve",
  "payments.reconciliation.suspense.propose",
  "payments.reconciliation.suspense.post",
  "payments.reconciliation.sign",
  "payments.reconciliation.certificate.export",
  "payments.export",
] as const;

// Accounting backbone permissions
export const accountingPermissions = [
  "accounting.setup.manage",
  "accounting.accounts.read",
  "accounting.accounts.manage",
  "accounting.journal.read",
  "accounting.journal.create",
  "accounting.journal.post",
  "accounting.journal.reverse",
  "accounting.period.read",
  "accounting.period.close",
  "accounting.period.reopen",
  "accounting.reports.read",
  "accounting.exports.create",
  "accounting.posting-rules.manage",
  "accounting.audit.read",
  "accounting.close.read",
  "accounting.close.run",
  "accounting.close.finding.assign",
  "accounting.close.finding.comment",
  "accounting.close.waiver.request",
  "accounting.close.waiver.approve",
  "accounting.close.certify",
  "accounting.close.export",
  "accounting.close.accountant.review",
  "accounting.close.accountant.comment",
  "accounting.close.accountant.invite",
] as const;

// Compliance Center permissions
export const compliancePermissions = [
  "compliance.documents.read",
  "compliance.documents.issue",
  "compliance.documents.certify",
  "compliance.documents.reverse",
  "compliance.submissions.retry",
  "compliance.adapter.manage",
  "compliance.evidence.attach",
  "compliance.metadata.read",
] as const;

// Payroll and presence permissions
export const payrollPermissions = [
  "payroll.read",
  "payroll.employees.read",
  "payroll.employees.manage",
  "payroll.contracts.read",
  "payroll.contracts.manage",
  "payroll.attendance.freeze",
  "payroll.runs.calculate",
  "payroll.runs.review",
  "payroll.runs.approve",
  "payroll.runs.post",
  "payroll.payslips.read",
  "payroll.payslips.emit",
  "payroll.payments.release",
  "payroll.declarations.prepare",
  "payroll.reports.read",
  "payroll.exports.create",
] as const;

// Tax management permissions
export const taxPermissions = [
  "taxes.read",
  "taxes.create",
  "taxes.update",
  "taxes.delete",
  "taxes.rates.read",
  "taxes.rates.create",
  "taxes.rates.update",
  "taxes.rates.delete",
  "taxes.calculations.read",
  "taxes.reports.read",
] as const;

// Customer management permissions
export const customerPermissions = [
  "customers.read",
  "customers.create",
  "customers.update",
  "customers.delete",
  "customers.orders.read",
  "customers.analytics.read",
  "customers.communication.send",
] as const;

// POS system permissions
export const posPermissions = [
  "pos.read",
  "pos.use",
  "pos.session.start",
  "pos.session.end",
  "pos.transactions.read",
  "pos.transactions.void",
  "pos.transactions.refund",
  "pos.cash.drawer.open",
  "pos.discounts.apply",
  "pos.receipts.print",
  "pos.receipts.reprint",
] as const;

// Analytics and reporting permissions
export const analyticsPermissions = [
  "analytics.read",
  "analytics.sales.read",
  "analytics.inventory.read",
  "analytics.financial.read",
  "analytics.customer.read",
  "analytics.performance.read",
  "reports.read",
  "reports.create",
  "reports.export",
  "reports.schedule",
] as const;

// System administration permissions
export const systemPermissions = [
  "system.read",
  "system.settings.read",
  "system.settings.update",
  "system.backup.create",
  "system.backup.restore",
  "system.logs.read",
  "system.integrations.read",
  "system.integrations.manage",
  "system.organization.read",
  "system.organization.update",
] as const;

// Communication permissions
export const communicationPermissions = [
  "communication.emails.send",
  "communication.notifications.read",
  "communication.notifications.send",
  "communication.templates.read",
  "communication.templates.create",
  "communication.templates.update",
] as const;

// Data import/export permissions
export const dataPermissions = [
  "data.export",
  "data.import",
  "data.backup",
  "data.restore",
  "data.migrate",
  "controls.manage",
  "controls.audit.read",
  "fraud.cases.manage",
] as const;

// Admin permissions (all permissions combined)
export const adminPermissions = [
  ...dashboardPermissions,
  ...userPermissions,
  ...profilePermissions,
  ...rolePermissions,
  ...inventoryPermissions,
  ...locationPermissions,
  ...salesPermissions,
  ...purchasePermissions,
  ...financialPermissions,
  ...accountingPermissions,
  ...compliancePermissions,
  ...payrollPermissions,
  ...taxPermissions,
  ...customerPermissions,
  ...posPermissions,
  ...analyticsPermissions,
  ...systemPermissions,
  ...communicationPermissions,
  ...dataPermissions,
] as const;

// Manager permissions (subset of admin)
export const managerPermissions = [
  ...dashboardPermissions,
  ...profilePermissions,
  "users.read",
  "users.invite",
  "users.roles.assign",
  ...inventoryPermissions,
  ...locationPermissions,
  ...salesPermissions,
  ...purchasePermissions,
  "finance.read",
  "finance.payables.read",
  "finance.receivables.read",
  "finance.reports.read",
  "finance.analytics.read",
  "accounting.accounts.read",
  "accounting.journal.read",
  "accounting.period.read",
  "accounting.reports.read",
  "accounting.close.read",
  "accounting.close.run",
  "accounting.close.finding.assign",
  "accounting.close.finding.comment",
  "accounting.close.accountant.review",
  "accounting.close.accountant.comment",
  "compliance.documents.read",
  "compliance.metadata.read",
  "payroll.read",
  "payroll.employees.read",
  "payroll.contracts.read",
  "payroll.runs.review",
  "payroll.reports.read",
  "payroll.exports.create",
  ...taxPermissions,
  ...customerPermissions,
  ...posPermissions,
  ...analyticsPermissions,
  "reports.read",
  "reports.create",
  "reports.export",
  ...communicationPermissions,
  "data.export",
] as const;

// Staff permissions (limited subset)
export const staffPermissions = [
  "dashboard.read",
  "profile.read",
  "profile.update",
  "profile.password.update",
  "inventory.read",
  "inventory.items.read",
  "inventory.levels.read",
  "sales.read",
  "sales.create",
  "sales.orders.read",
  "sales.orders.create",
  "purchases.read",
  "purchases.orders.read",
  "customers.read",
  "customers.create",
  "customers.update",
  ...posPermissions,
  "analytics.read",
  "analytics.sales.read",
  "reports.read",
] as const;

// Cashier permissions (POS focused)
export const cashierPermissions = [
  "dashboard.read",
  "profile.read",
  "profile.update",
  "profile.password.update",
  "inventory.read",
  "inventory.items.read",
  "sales.read",
  "sales.create",
  "sales.orders.read",
  "sales.orders.create",
  "customers.read",
  "customers.create",
  "customers.update",
  ...posPermissions,
  "analytics.read",
  "analytics.sales.read",
] as const;

// Viewer permissions (read-only)
export const viewerPermissions = [
  "dashboard.read",
  "profile.read",
  "profile.update",
  "profile.password.update",
  "inventory.read",
  "inventory.items.read",
  "inventory.levels.read",
  "sales.read",
  "sales.orders.read",
  "purchases.read",
  "purchases.orders.read",
  "customers.read",
  "analytics.read",
  "reports.read",
] as const;

// Role permission mappings
export const rolePermissionMap = {
  admin: adminPermissions,
  manager: managerPermissions,
  staff: staffPermissions,
  cashier: cashierPermissions,
  viewer: viewerPermissions,
} as const;

// Permission categories for UI organization
export const permissionCategories = {
  "Dashboard & Overview": dashboardPermissions,
  "User Management": userPermissions,
  "Profile Management": profilePermissions,
  "Role Management": rolePermissions,
  "Inventory Management": inventoryPermissions,
  "Location Management": locationPermissions,
  "Sales Management": salesPermissions,
  "Purchase Management": purchasePermissions,
  "Financial Management": financialPermissions,
  "Accounting Backbone": accountingPermissions,
  "Compliance Center": compliancePermissions,
  "Payroll & Presence": payrollPermissions,
  "Tax Management": taxPermissions,
  "Customer Management": customerPermissions,
  "POS System": posPermissions,
  "Analytics & Reporting": analyticsPermissions,
  "System Administration": systemPermissions,
  "Communication": communicationPermissions,
  "Data Management": dataPermissions,
} as const;

// Helper types
export type Permission = typeof adminPermissions[number];
export type RoleName = keyof typeof rolePermissionMap;
export type PermissionCategory = keyof typeof permissionCategories;

// Helper functions
export function getPermissionsForRole(role: RoleName): readonly string[] {
  return rolePermissionMap[role] || [];
}

export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission);
}

export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

export function getPermissionsByCategory(category: PermissionCategory) {
  return permissionCategories[category];
}

export function getAllPermissions(): readonly string[] {
  return adminPermissions;
}

export function isValidPermission(permission: string): permission is Permission {
  return adminPermissions.includes(permission as Permission);
}

export default {
  adminPermissions,
  accountingPermissions,
  compliancePermissions,
  payrollPermissions,
  managerPermissions,
  staffPermissions,
  cashierPermissions,
  viewerPermissions,
  rolePermissionMap,
  permissionCategories,
  getPermissionsForRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsByCategory,
  getAllPermissions,
  isValidPermission,
};
