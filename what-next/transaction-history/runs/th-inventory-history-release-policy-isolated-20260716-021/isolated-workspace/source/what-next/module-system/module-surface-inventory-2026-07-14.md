# Module Surface Inventory

Report mode: this inventory is read-only and does not enforce module entitlements.

## Summary

- Generated at: 2026-07-14T20:10:33.737Z
- Catalog modules: 20
- Surfaces inventoried: 323
- Source coverage: sidebar=present, moduleCatalog=present, dashboardRoot=present, actionsRoot=present, apiRoutes=present, apiGuardInventory=present

## Classification Counts

- delegated re-export: 1
- delegated_uploadthing_core: 1
- enforcement candidate: 310
- mapped: 273
- missing permission: 16
- not applicable: internal display helper: 1
- not applicable: internal module governance contract: 1
- not applicable: public email verification: 1
- not applicable: public organization onboarding: 1
- not applicable: public password reset request: 1
- not applicable: token-bound invitation acceptance: 1
- not_applicable_public: 4
- not_applicable_public_service: 1
- not_applicable_session_claims: 1
- unknown slug: 1
- unmapped: 36

## Surfaces

| Surface Type | Surface | Module | Permission | Guard | Classification | File |
|---|---|---|---|---|---|---|
| action | _shared/safe-action-responses.ts |  |  | none | unmapped, missing permission, enforcement candidate | actions/_shared/safe-action-responses.ts |
| action | accounting/accounts.actions.ts | accounting | accounting.accounts.read | protect | mapped, enforcement candidate | actions/accounting/accounts.actions.ts |
| action | accounting/close-assurance.actions.ts | accounting | accounting.close.read | protect | mapped, enforcement candidate | actions/accounting/close-assurance.actions.ts |
| action | accounting/data-trust.actions.ts | accounting | accounting.audit.read | protect | mapped, enforcement candidate | actions/accounting/data-trust.actions.ts |
| action | accounting/journals.actions.ts | accounting | accounting.journal.read | protect | mapped, enforcement candidate | actions/accounting/journals.actions.ts |
| action | accounting/reports.actions.ts | accounting | accounting.reports.read | protect | mapped, enforcement candidate | actions/accounting/reports.actions.ts |
| action | accounting/settings.actions.ts | accounting | accounting.setup.manage | protect | mapped, enforcement candidate | actions/accounting/settings.actions.ts |
| action | analytics/analytics/financial-reports.ts | analytics |  | none | mapped, missing permission, enforcement candidate | actions/analytics/analytics/financial-reports.ts |
| action | analytics/financial-analytics.ts | analytics | reports.read | requirePermission | mapped, enforcement candidate | actions/analytics/financial-analytics.ts |
| action | analytics/financial-reports.ts | analytics | reports.read | requirePermission | mapped, enforcement candidate | actions/analytics/financial-reports.ts |
| action | analytics/get-sales-analytics.ts | analytics |  | none | mapped, missing permission, enforcement candidate | actions/analytics/get-sales-analytics.ts |
| action | analytics/getSalesAnalytics.ts | analytics | reports.read | requirePermission | mapped, enforcement candidate | actions/analytics/getSalesAnalytics.ts |
| action | assurance/workflow-assurance-control-tower.actions.ts | compliance | controls.audit.read | protect | mapped, enforcement candidate | actions/assurance/workflow-assurance-control-tower.actions.ts |
| action | assurance/workflow-assurance-incident.actions.ts | compliance | controls.audit.read | protect | mapped, enforcement candidate | actions/assurance/workflow-assurance-incident.actions.ts |
| action | assurance/workflow-assurance.actions.ts | compliance | controls.audit.read | protect | mapped, enforcement candidate | actions/assurance/workflow-assurance.actions.ts |
| action | auth.ts |  |  | none | unmapped, missing permission, enforcement candidate | actions/auth.ts |
| action | brands/getBrandsAction.ts | inventory | inventory.brands.read | inventory.brands.create | inventory.brands.update | inventory.brands.delete | requirePermission | mapped, enforcement candidate | actions/brands/getBrandsAction.ts |
| action | brands/getOrgBrands.ts |  |  | none | unmapped, missing permission, enforcement candidate | actions/brands/getOrgBrands.ts |
| action | categories/createBulkCategories.ts |  |  | none | unmapped, missing permission, enforcement candidate | actions/categories/createBulkCategories.ts |
| action | categories/createCategory.ts |  |  | none | unmapped, missing permission, enforcement candidate | actions/categories/createCategory.ts |
| action | categories/getCategoriesAction.ts | inventory | inventory.categories.read | inventory.categories.create | inventory.categories.update | inventory.categories.delete | requirePermission | mapped, enforcement candidate | actions/categories/getCategoriesAction.ts |
| action | categories/getOrgCategories.ts |  |  | none | unmapped, missing permission, enforcement candidate | actions/categories/getOrgCategories.ts |
| action | compliance/compliance-center.actions.ts | compliance | compliance.documents.read | protect | mapped, enforcement candidate | actions/compliance/compliance-center.actions.ts |
| action | customers/customer-management-actions.ts |  | )) {
      return error.message
    }

    if (error.message.startsWith( | none | unmapped, enforcement candidate | actions/customers/customer-management-actions.ts |
| action | customers/customerAction2.ts |  |  | requirePermission | unmapped, missing permission, enforcement candidate | actions/customers/customerAction2.ts |
| action | customers/customerActions.ts |  |  | none | unmapped, missing permission, enforcement candidate | actions/customers/customerActions.ts |
| action | dashboard/getDashboardData.ts | dashboard | dashboard.read | requirePermission | mapped, enforcement candidate | actions/dashboard/getDashboardData.ts |
| action | evidence/proof-trail.actions.ts |  |  | protect | unmapped, missing permission, enforcement candidate | actions/evidence/proof-trail.actions.ts |
| action | finance/finance-dashboard.actions.ts | finance | getFinanceDashboardViewPermissions(parsed.view) | requireAnyPermission | mapped, enforcement candidate | actions/finance/finance-dashboard.actions.ts |
| action | hris/employee.actions.ts |  | hris.people.read | protect | unmapped, enforcement candidate | actions/hris/employee.actions.ts |
| action | hris/lifecycle.actions.ts |  | hris.people.read | protect | unmapped, enforcement candidate | actions/hris/lifecycle.actions.ts |
| action | inventory/inventoryActions.ts | inventory | inventory.items.read | requirePermission | mapped, enforcement candidate | actions/inventory/inventoryActions.ts |
| action | inventory/inventoryMovementActions.ts | inventory | inventory.levels.read | requirePermission | mapped, enforcement candidate | actions/inventory/inventoryMovementActions.ts |
| action | item-suppliers/addItemSuppliers.ts |  |  | none | unmapped, missing permission, enforcement candidate | actions/item-suppliers/addItemSuppliers.ts |
| action | item-suppliers/getItemWithSuppliers.ts |  |  | none | unmapped, missing permission, enforcement candidate | actions/item-suppliers/getItemWithSuppliers.ts |
| action | item/items.ts |  | inventory.items.read | requirePermission | unmapped, enforcement candidate | actions/item/items.ts |
| action | item/listItemsAction.ts |  | inventory.items.read | requirePermission | unmapped, enforcement candidate | actions/item/listItemsAction.ts |
| action | itemsShow/createActionItem.ts |  | inventory.items.create | requirePermission | unmapped, enforcement candidate | actions/itemsShow/createActionItem.ts |
| action | itemsShow/deleteItem.ts |  | inventory.items.delete | requirePermission | unmapped, enforcement candidate | actions/itemsShow/deleteItem.ts |
| action | itemsShow/getBriefItemById.ts |  | inventory.items.read | requirePermission | unmapped, enforcement candidate | actions/itemsShow/getBriefItemById.ts |
| action | itemsShow/getBriefOrgItems.ts |  | inventory.items.read | requirePermission | unmapped, enforcement candidate | actions/itemsShow/getBriefOrgItems.ts |
| action | itemsShow/getOrgItems.ts |  | inventory.items.read | requirePermission | unmapped, enforcement candidate | actions/itemsShow/getOrgItems.ts |
| action | itemsShow/getOrgItemsWithInventoryLevels.ts |  | inventory.items.read | requirePermission | unmapped, enforcement candidate | actions/itemsShow/getOrgItemsWithInventoryLevels.ts |
| action | itemsShow/getOrgItemsWithInventoryLevelsLocation.ts |  | inventory.items.read | requirePermission | unmapped, enforcement candidate | actions/itemsShow/getOrgItemsWithInventoryLevelsLocation.ts |
| action | itemsShow/updateItemBasicInfoById.ts |  | inventory.items.update | requirePermission | unmapped, enforcement candidate | actions/itemsShow/updateItemBasicInfoById.ts |
| action | itemsShow/updateItemById.ts |  | inventory.items.update | requirePermission | unmapped, enforcement candidate | actions/itemsShow/updateItemById.ts |
| action | itemsShow/updateItemItemDetailsById.ts |  | inventory.items.update | requirePermission | unmapped, enforcement candidate | actions/itemsShow/updateItemItemDetailsById.ts |
| action | itemsShow/updateItemPricingById.ts |  | inventory.items.update | requirePermission | unmapped, enforcement candidate | actions/itemsShow/updateItemPricingById.ts |
| action | itemsShow/updateItemRelationsById.ts |  | inventory.items.update | requirePermission | unmapped, enforcement candidate | actions/itemsShow/updateItemRelationsById.ts |
| action | itemsShow/updateItemStockById.ts |  | inventory.items.update | requirePermission | unmapped, enforcement candidate | actions/itemsShow/updateItemStockById.ts |
| action | locations/createLocation.ts | settings | locations.create | requirePermission | mapped, enforcement candidate | actions/locations/createLocation.ts |
| action | locations/deleteLocation.ts | settings | locations.delete | requirePermission | mapped, enforcement candidate | actions/locations/deleteLocation.ts |
| action | locations/getOrgLocations.ts | settings | locations.read | requirePermission | mapped, enforcement candidate | actions/locations/getOrgLocations.ts |
| action | locations/location-management-actions.ts | settings | locations.read | requirePermission | mapped, enforcement candidate | actions/locations/location-management-actions.ts |
| action | locations/updateLocationById.ts | settings | locations.update | requirePermission | mapped, enforcement candidate | actions/locations/updateLocationById.ts |
| action | manager-action-center/manager-action-center.actions.ts | dashboard | dashboard.read | protect | mapped, enforcement candidate | actions/manager-action-center/manager-action-center.actions.ts |
| action | modules/module-control.actions.ts | settings | MANAGE_SYSTEM_SETTINGS | protect | mapped, enforcement candidate | actions/modules/module-control.actions.ts |
| action | organization/organization-settings-actions.ts | settings | system.organization.read | requirePermission | mapped, enforcement candidate | actions/organization/organization-settings-actions.ts |
| action | owner-war-room/owner-war-room.actions.ts | dashboard | dashboard.read | protect | mapped, enforcement candidate | actions/owner-war-room/owner-war-room.actions.ts |
| action | payments/reconciliation-workbench.actions.ts | payment_reconciliation | payments.reconciliation.read | protect | mapped, enforcement candidate | actions/payments/reconciliation-workbench.actions.ts |
| action | payments/reconciliation.actions.ts | payment_reconciliation | payments.reconciliation.read | protect | mapped, enforcement candidate | actions/payments/reconciliation.actions.ts |
| action | payroll/payroll-command-read-model.actions.ts | payroll | payroll.command.read | protect | mapped, enforcement candidate | actions/payroll/payroll-command-read-model.actions.ts |
| action | payroll/payroll-compensation.actions.ts | payroll | payroll.compensation.read | protect | mapped, enforcement candidate | actions/payroll/payroll-compensation.actions.ts |
| action | payroll/payroll-contract.actions.ts | payroll | payroll.contracts.read | protect | mapped, enforcement candidate | actions/payroll/payroll-contract.actions.ts |
| action | payroll/payroll-control.actions.ts | payroll | payroll.read | protect | mapped, enforcement candidate | actions/payroll/payroll-control.actions.ts |
| action | payroll/payroll-country-pack-review-intake.actions.ts | payroll |  | protect | mapped, missing permission, enforcement candidate | actions/payroll/payroll-country-pack-review-intake.actions.ts |
| action | payroll/payroll-employee.actions.ts | payroll | payroll.employees.read | protect | mapped, enforcement candidate | actions/payroll/payroll-employee.actions.ts |
| action | payroll/payroll-payment-evidence.actions.ts | payroll | payroll.payment_destination.read | protect | mapped, enforcement candidate | actions/payroll/payroll-payment-evidence.actions.ts |
| action | payroll/payroll-payment-reconciliation.actions.ts | payment_reconciliation | payments.reconciliation.read | protect | mapped, enforcement candidate | actions/payroll/payroll-payment-reconciliation.actions.ts |
| action | payroll/payroll-payslip-self-service.actions.ts | payroll | payroll.payslips.self.read | protect | mapped, enforcement candidate | actions/payroll/payroll-payslip-self-service.actions.ts |
| action | payroll/payroll-pilot-certification.actions.ts | payroll | payroll.command.read | protect | mapped, enforcement candidate | actions/payroll/payroll-pilot-certification.actions.ts |
| action | payroll/payroll-register.actions.ts | payroll | payroll.reports.read | protect | mapped, enforcement candidate | actions/payroll/payroll-register.actions.ts |
| action | payroll/payroll-setup.actions.ts | payroll |  | protect | mapped, missing permission, enforcement candidate | actions/payroll/payroll-setup.actions.ts |
| action | pos/cart.actions.ts | pos | pos.use | requirePermission | mapped, enforcement candidate | actions/pos/cart.actions.ts |
| action | pos/catalog.actions.ts | pos | pos.use | requirePermission | mapped, enforcement candidate | actions/pos/catalog.actions.ts |
| action | pos/drawer-dashboard.actions.ts | pos | finance.cash-drawer.read | finance.read | requireAnyPermission | mapped, enforcement candidate | actions/pos/drawer-dashboard.actions.ts |
| action | pos/receipt-token.actions.ts | pos | pos.receipts.revoke | protect | mapped, enforcement candidate | actions/pos/receipt-token.actions.ts |
| action | pos/session.actions.ts | pos | pos.read | requirePermission | mapped, enforcement candidate | actions/pos/session.actions.ts |
| action | pos/sync.actions.ts | pos | pos.transactions.read | protect | mapped, enforcement candidate | actions/pos/sync.actions.ts |
| action | pos/tender.actions.ts | pos | pos.use | protect | mapped, enforcement candidate | actions/pos/tender.actions.ts |
| action | pos/terminal-management.actions.ts | pos | pos.session.start | requirePermission | mapped, enforcement candidate | actions/pos/terminal-management.actions.ts |
| action | purchaseOrderWorkflow/GoodsReceiptAndSummary.ts |  | purchases.orders.read | requirePermission | unmapped, enforcement candidate | actions/purchaseOrderWorkflow/GoodsReceiptAndSummary.ts |
| action | purchaseOrderWorkflow/newPOActions.ts | purchasing | purchases.orders.read | purchases.orders.create | purchases.orders.update | purchases.delete | purchases.orders.approve | purchases.orders.cancel | purchases.orders.receive | delegated-re-export | mapped, delegated re-export, enforcement candidate | actions/purchaseOrderWorkflow/newPOActions.ts |
| action | purchaseOrderWorkflow/purchaseOrderSystemAction.ts | purchasing | purchases.orders.read | purchases.orders.create | purchases.orders.update | purchases.delete | purchases.orders.approve | purchases.orders.cancel | purchases.orders.receive | requirePermission | mapped, enforcement candidate | actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts |
| action | purchasing/ap-control.actions.ts | purchasing | purchasing.ap.invoice.view | protect | mapped, enforcement candidate | actions/purchasing/ap-control.actions.ts |
| action | roles/createRole.ts | settings | roles.create | requirePermission | mapped, enforcement candidate | actions/roles/createRole.ts |
| action | roles/getOrgRoles.ts | settings | roles.read | requirePermission | mapped, enforcement candidate | actions/roles/getOrgRoles.ts |
| action | roles/getRoleById.ts | settings | roles.read | requirePermission | mapped, enforcement candidate | actions/roles/getRoleById.ts |
| action | roles/role-auth.ts | settings | roles.read | roles.create | roles.update | roles.permissions.assign | requirePermission | mapped, enforcement candidate | actions/roles/role-auth.ts |
| action | roles/role-utils.ts |  |  | none | not applicable: internal display helper | actions/roles/role-utils.ts |
| action | roles/updateRole.ts | settings | roles.update | requirePermission | mapped, enforcement candidate | actions/roles/updateRole.ts |
| action | signals/business-signals.actions.ts |  | dashboard.read | protect | unmapped, enforcement candidate | actions/signals/business-signals.actions.ts |
| action | snapshots/snapshot.actions.ts |  | dashboard.read | protect | unmapped, enforcement candidate | actions/snapshots/snapshot.actions.ts |
| action | storage/photo-upload-actions.ts | inventory | inventory.items.create | inventory.items.update | requireAnyPermission | mapped, enforcement candidate | actions/storage/photo-upload-actions.ts |
| action | storage/storage-config-actions.ts | settings | inventory.items.create | inventory.items.update | system.settings.read | system.settings.update | requireAnyPermission | mapped, enforcement candidate | actions/storage/storage-config-actions.ts |
| action | suppliers/getOrgSuppliers.ts | purchasing | purchases.suppliers.read | requirePermission | mapped, enforcement candidate | actions/suppliers/getOrgSuppliers.ts |
| action | suppliers/itemSupplierActions.ts |  | readonly string[] | none | unmapped, enforcement candidate | actions/suppliers/itemSupplierActions.ts |
| action | suppliers/supplier-management-actions.ts |  | )) {
      return error.message
    }

    if (
      error.message.startsWith( | none | unmapped, enforcement candidate | actions/suppliers/supplier-management-actions.ts |
| action | taxRate/createActionTaxRate.ts | settings | taxes.create | requirePermission | mapped, enforcement candidate | actions/taxRate/createActionTaxRate.ts |
| action | taxRate/getOrgTaxRates.ts | settings | taxes.read | requirePermission | mapped, enforcement candidate | actions/taxRate/getOrgTaxRates.ts |
| action | taxRate/tax-rate-management-actions.ts | settings | taxes.read | requirePermission | mapped, enforcement candidate | actions/taxRate/tax-rate-management-actions.ts |
| action | units/deleteUnit.ts | inventory | inventory.units.delete | requirePermission | mapped, enforcement candidate | actions/units/deleteUnit.ts |
| action | units/getOrgUnits.ts | inventory | inventory.units.read | requirePermission | mapped, enforcement candidate | actions/units/getOrgUnits.ts |
| action | units/unit-management-actions.ts |  | inventory.units.read | requirePermission | unmapped, enforcement candidate | actions/units/unit-management-actions.ts |
| action | users/createInvitedUser.ts |  |  | none | not applicable: token-bound invitation acceptance | actions/users/createInvitedUser.ts |
| action | users/createUser.ts |  |  | none | not applicable: public organization onboarding | actions/users/createUser.ts |
| action | users/deleteUser.ts | settings | users.delete | requirePermission | mapped, enforcement candidate | actions/users/deleteUser.ts |
| action | users/getOrgInvites.ts | settings | users.invite | users.read | requireAnyPermission | mapped, enforcement candidate | actions/users/getOrgInvites.ts |
| action | users/getOrgUsers.ts | settings | users.read | requirePermission | mapped, enforcement candidate | actions/users/getOrgUsers.ts |
| action | users/getUserById.ts | settings | users.read | requirePermission | mapped, enforcement candidate | actions/users/getUserById.ts |
| action | users/sendInvite.ts | settings | users.invite | requirePermission | mapped, enforcement candidate | actions/users/sendInvite.ts |
| action | users/sendResetLink.ts |  |  | none | not applicable: public password reset request | actions/users/sendResetLink.ts |
| action | users/updateUserPassword.ts | settings | users.password.reset | requirePermission | mapped, enforcement candidate | actions/users/updateUserPassword.ts |
| action | users/verifyOtp.ts |  |  | none | not applicable: public email verification | actions/users/verifyOtp.ts |
| api_evidence | app/api/uploadthing/route.ts | inventory | inventory.items.create | inventory.items.update | requireApiSessionForCurrentOrg | mapped, enforcement candidate | app/api/uploadthing/core.ts |
| api_evidence | app/api/receipts/[receiptId]/route.ts |  |  | assertPublicReceiptAccessToken | not_applicable_public_service | services/pos/receipt.service.ts |
| api | /.well-known/security.txt |  |  | none | not_applicable_public | app/.well-known/security.txt/route.ts |
| api | /api/auth/[...all] |  |  | none | not_applicable_public | app/api/auth/[...all]/route.ts |
| api | /api/me/permissions |  |  | getOptionalRbacContext | not_applicable_session_claims | app/api/me/permissions/route.ts |
| api | /api/receipts/[receiptId] |  |  | none | not_applicable_public | app/api/receipts/[receiptId]/route.ts |
| api | /api/security-txt |  |  | none | not_applicable_public | app/api/security-txt/route.ts |
| api | /api/uploads/[...path] | dashboard | dashboard.read | requireApiSessionForCurrentOrg | mapped, enforcement candidate | app/api/uploads/[...path]/route.ts |
| api | /api/uploadthing |  |  | none | delegated_uploadthing_core | app/api/uploadthing/route.ts |
| api | /api/v1/organisations/[id]/briefItems | inventory | inventory.items.read | requireApiSessionForOrg | mapped, enforcement candidate | app/api/v1/organisations/[id]/briefItems/route.ts |
| api | /api/v1/organisations/[id]/items | inventory | inventory.items.read | requireApiSessionForOrg | mapped, enforcement candidate | app/api/v1/organisations/[id]/items/route.ts |
| api | /api/v1/organisations | settings | MANAGE_SYSTEM_SETTINGS | requireApiSessionForCurrentOrg | mapped, enforcement candidate | app/api/v1/organisations/route.ts |
| layout | /dashboard/customers | sales | customers.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/customers/layout.tsx |
| layout | /dashboard/inventory/brands | inventory |  | none | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/brands/layout.tsx |
| layout | /dashboard/inventory/categories | inventory |  | none | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/categories/layout.tsx |
| layout | /dashboard/inventory/units | inventory |  | none | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/units/layout.tsx |
| layout | /dashboard | dashboard | rbacContext.permissions | requireRbacContext | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/layout.tsx |
| layout | /dashboard/purchases/suppliers | purchasing | purchases.suppliers.read | purchases.suppliers.create | purchases.suppliers.update | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchases/suppliers/layout.tsx |
| layout | /dashboard/settings/locations/new | settings |  | none | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/locations/new/layout.tsx |
| layout | /dashboard/settings/roles | settings | roles.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/roles/layout.tsx |
| layout | /dashboard/settings/tax-rates | settings |  | none | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/tax-rates/layout.tsx |
| layout | /dashboard/settings/users | settings | users.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/users/layout.tsx |
| module_service | module-catalog.service.ts | pos | dashboard.read | none | mapped, enforcement candidate | services/modules/module-catalog.service.ts |
| module_service | module-control-contracts.ts |  |  | none | not applicable: internal module governance contract | services/modules/module-control-contracts.ts |
| module_service | module-entitlement.service.ts |  |  | module-observe | unmapped, enforcement candidate | services/modules/module-entitlement.service.ts |
| navigation | /dashboard | dashboard | DASHBOARD_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/accounting | accounting | accounting.reports.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/accounting/accountant-portal | accounting | accounting.audit.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/accounting/accounts | accounting | accounting.accounts.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/accounting/close | accounting | accounting.close.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/accounting/control-center | accounting | accounting.setup.manage | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/accounting/journals | accounting | accounting.journal.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/accounting/journals/new | accounting | accounting.journal.create | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/accounting/reports/trial-balance | accounting | accounting.reports.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/accounting/setup | accounting | accounting.setup.manage | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/analytics | analytics | VIEW_ANALYTICS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/analytics/reports | analytics | VIEW_ANALYTICS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/assurance/control-tower | close_assurance | controls.audit.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/change-password | settings | PASSWORD_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/compliance | compliance | compliance.documents.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/customers | sales | READ_CUSTOMERS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/customers/new | sales | CREATE_CUSTOMERS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/daily-digest | dashboard | DASHBOARD_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance | finance | finance.dashboard.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/analytics | finance | finance.analytics.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/cash-command | finance | FINANCIAL_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/cash-drawer | finance | finance.cash-drawer.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/cash-flow | finance | finance.cash-flow.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/costs | finance | finance.costs.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/payables | finance | finance.payables.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/payments | finance | finance.payments.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/profit-loss | finance | finance.profitability.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/profitability | finance | finance.profitability.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/receivables | finance | finance.receivables.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/reconciliation | finance | payments.reconciliation.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/retail | finance | finance.dashboard.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/sales | finance | sales.analytics.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/finance/stock-to-cash | finance | finance.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/inventory | inventory | inventory.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/inventory/brands | inventory | BRANDS_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/inventory/categories | inventory | READ_CATEGORIES | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/inventory/items | inventory | READ_ITEMS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/inventory/items/create | inventory | CREATE_ITEMS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/inventory/movements | inventory | STOCK_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/inventory/transfers | inventory | TRANSFERS_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/inventory/units | inventory | UNITS_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/manager-action-center | dashboard | DASHBOARD_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/owner-war-room | dashboard | DASHBOARD_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/payroll | payroll | payroll.command.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/payroll/attendance | payroll | payroll.payment_destination.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/payroll/compensation | payroll | payroll.compensation.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/payroll/contracts | payroll | payroll.contracts.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/payroll/declarations | payroll | payroll.command.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/payroll/employees | payroll | payroll.employees.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/payroll/payments | payroll | payroll.command.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/payroll/payslips | payroll | payroll.payslips.self.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/payroll/register | payroll | payroll.reports.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/payroll/runs | payroll | payroll.command.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/payroll/setup | payroll | payroll.runs.calculate | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/people | hris | hris.people.read | sidebar-permission-filter | unknown slug, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/pos | sales | OPERATE_POS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/purchase-orders | purchasing | READ_PURCHASE_ORDERS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/purchase-orders/new | purchasing | CREATE_PURCHASE_ORDERS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/purchases | purchasing | READ_PURCHASE_ORDERS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/purchases/payables | purchasing | finance.payables.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/purchases/suppliers | purchasing | READ_SUPPLIERS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/purchases/suppliers/create | purchasing | CREATE_SUPPLIERS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/sales | sales | READ_SALES_ORDERS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/settings/appearance | settings | DASHBOARD_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/settings/company | settings | COMPANY_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/settings/locations | settings | READ_LOCATIONS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/settings/modules | settings | MANAGE_SYSTEM_SETTINGS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/settings/notifications | settings | communication.notifications.read | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/settings/roles | settings | READ_ROLES | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/settings/security | settings | PASSWORD_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/settings/tax-rates | settings | TAX_RATES_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/settings/terminals | settings | POS_STATION_READ | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| navigation | /dashboard/settings/users | settings | READ_USERS | sidebar-permission-filter | mapped, enforcement candidate | config/sidebar.ts |
| page | /dashboard/accounting/accountant-portal | accounting | accounting.audit.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/accounting/accountant-portal/page.tsx |
| page | /dashboard/accounting/accounts | accounting | accounting.accounts.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/accounting/accounts/page.tsx |
| page | /dashboard/accounting/close/[periodId] | close_assurance | accounting.close.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/accounting/close/[periodId]/page.tsx |
| page | /dashboard/accounting/close | close_assurance | accounting.close.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/accounting/close/page.tsx |
| page | /dashboard/accounting/control-center | accounting | accounting.setup.manage | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/accounting/control-center/page.tsx |
| page | /dashboard/accounting/journals/new | accounting | accounting.journal.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/accounting/journals/new/page.tsx |
| page | /dashboard/accounting/journals | accounting | accounting.journal.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx |
| page | /dashboard/accounting | accounting | accounting.reports.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/accounting/page.tsx |
| page | /dashboard/accounting/reports/trial-balance | accounting | accounting.reports.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/page.tsx |
| page | /dashboard/accounting/setup | accounting | accounting.setup.manage | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/accounting/setup/page.tsx |
| page | /dashboard/analytics | analytics | reports.read | dashboard.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/analytics/page.tsx |
| page | /dashboard/analytics/reports | analytics | reports.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/analytics/reports/page.tsx |
| page | /dashboard/assurance/control-tower/incidents/[incidentId] | dashboard | controls.audit.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/assurance/control-tower/incidents/[incidentId]/page.tsx |
| page | /dashboard/assurance/control-tower | dashboard | controls.audit.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/assurance/control-tower/page.tsx |
| page | /dashboard/cashDrawer | cash_drawer | finance.cash-drawer.read | finance.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/cashDrawer/page.tsx |
| page | /dashboard/change-password | settings | PASSWORD_READ | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/change-password/page.tsx |
| page | /dashboard/compliance | compliance | compliance.documents.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/compliance/page.tsx |
| page | /dashboard/customers/[id]/edit | sales | customers.update | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/customers/[id]/edit/page.tsx |
| page | /dashboard/customers/[id]/orders | sales | customers.orders.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/customers/[id]/orders/page.tsx |
| page | /dashboard/customers/[id] | sales | customers.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/customers/[id]/page.tsx |
| page | /dashboard/customers/new | sales | customers.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/customers/new/page.tsx |
| page | /dashboard/customers | sales | customers.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/customers/page.tsx |
| page | /dashboard/daily-digest | dashboard | dashboard.read | finance.read | accounting.close.read | inventory.read | analytics.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx |
| page | /dashboard/finance/analytics | finance | financeViewPermissions(analytics) | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/analytics/page.tsx |
| page | /dashboard/finance/cash-command | finance | finance.read | dashboard.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx |
| page | /dashboard/finance/cash-drawer | cash_drawer | finance.cash-drawer.read | finance.read | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/cash-drawer/page.tsx |
| page | /dashboard/finance/cash-flow | finance | financeViewPermissions(cash-flow) | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/cash-flow/page.tsx |
| page | /dashboard/finance/costs | finance | financeViewPermissions(costs) | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/costs/page.tsx |
| page | /dashboard/finance | finance | financeViewPermissions(overview) | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/page.tsx |
| page | /dashboard/finance/payables | finance | financeViewPermissions(payables) | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/payables/page.tsx |
| page | /dashboard/finance/payments | finance | financeViewPermissions(payments) | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/payments/page.tsx |
| page | /dashboard/finance/profit-loss | finance | financeViewPermissions(profitability) | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/profit-loss/page.tsx |
| page | /dashboard/finance/profitability | finance | financeViewPermissions(profitability) | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/profitability/page.tsx |
| page | /dashboard/finance/receivables | finance | financeViewPermissions(receivables) | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/receivables/page.tsx |
| page | /dashboard/finance/reconciliation | payment_reconciliation | payments.reconciliation.read | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx |
| page | /dashboard/finance/retail | finance | financeViewPermissions(retail) | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/retail/page.tsx |
| page | /dashboard/finance/sales | finance | financeViewPermissions(sales) | FinanceRouteAccess | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/sales/page.tsx |
| page | /dashboard/finance/stock-to-cash | finance | finance.read | dashboard.read | inventory.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/stock-to-cash/page.tsx |
| page | /dashboard/finance/tax-rates/create | finance | taxes.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/finance/tax-rates/create/page.tsx |
| page | /dashboard/inventory/brands/[id]/edit | inventory | inventory.brands.update | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/brands/[id]/edit/page.tsx |
| page | /dashboard/inventory/brands/create | inventory | inventory.brands.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/brands/create/page.tsx |
| page | /dashboard/inventory/brands | inventory | inventory.brands.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/brands/page.tsx |
| page | /dashboard/inventory/categories/[id]/edit | inventory | inventory.categories.update | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/categories/[id]/edit/page.tsx |
| page | /dashboard/inventory/categories/[id] | inventory | inventory.categories.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/categories/[id]/page.tsx |
| page | /dashboard/inventory/categories/create | inventory | inventory.categories.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/categories/create/page.tsx |
| page | /dashboard/inventory/categories | inventory | inventory.categories.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/categories/page.tsx |
| page | /dashboard/inventory/items/[id]/others | inventory | inventory.items.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/items/[id]/others/page.tsx |
| page | /dashboard/inventory/items/[id]/suppliers | inventory | inventory.items.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/items/[id]/suppliers/page.tsx |
| page | /dashboard/inventory/items/create | inventory | inventory.items.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/items/create/page.tsx |
| page | /dashboard/inventory/items/new | inventory | inventory.items.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/items/new/page.tsx |
| page | /dashboard/inventory/items | inventory | inventory.items.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/items/page.tsx |
| page | /dashboard/inventory/movements | inventory | inventory.levels.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx |
| page | /dashboard/inventory | inventory | inventory.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/page.tsx |
| page | /dashboard/inventory/transfers | inventory | TRANSFERS_READ | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/transfers/page.tsx |
| page | /dashboard/inventory/units/[id]/edit | inventory | inventory.units.update | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/units/[id]/edit/page.tsx |
| page | /dashboard/inventory/units/create | inventory | inventory.units.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/units/create/page.tsx |
| page | /dashboard/inventory/units | inventory | inventory.units.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/inventory/units/page.tsx |
| page | /dashboard/items/new | inventory | inventory.items.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/items/new/page.tsx |
| page | /dashboard/items | inventory | inventory.items.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/items/page.tsx |
| page | /dashboard/manager-action-center | dashboard | dashboard.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/manager-action-center/page.tsx |
| page | /dashboard/notifications-demo | settings | communication.notifications.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/notifications-demo/page.tsx |
| page | /dashboard/owner-war-room | dashboard | dashboard.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/owner-war-room/page.tsx |
| page | /dashboard | dashboard |  | requireRbacContext | mapped, missing permission, enforcement candidate | app/[locale]/(dashboard)/dashboard/page.tsx |
| page | /dashboard/payroll/attendance | payroll | payroll.payment_destination.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/payroll/attendance/page.tsx |
| page | /dashboard/payroll/compensation | payroll | payroll.compensation.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/payroll/compensation/page.tsx |
| page | /dashboard/payroll/contracts | payroll | payroll.contracts.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/payroll/contracts/page.tsx |
| page | /dashboard/payroll/declarations | payroll | payroll.command.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/payroll/declarations/page.tsx |
| page | /dashboard/payroll/employees | payroll | payroll.employees.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/payroll/employees/page.tsx |
| page | /dashboard/payroll | payroll | payroll.command.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/payroll/page.tsx |
| page | /dashboard/payroll/payments | payroll | payments.reconciliation.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/payroll/payments/page.tsx |
| page | /dashboard/payroll/payslips | payroll | payroll.payslips.self.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/payroll/payslips/page.tsx |
| page | /dashboard/payroll/register | payroll | payroll.reports.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/payroll/register/page.tsx |
| page | /dashboard/payroll/runs | payroll | payroll.command.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/payroll/runs/page.tsx |
| page | /dashboard/payroll/setup | payroll | payroll.runs.calculate | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/payroll/setup/page.tsx |
| page | /dashboard/people/[employeeId] | dashboard | hris.people.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/people/[employeeId]/page.tsx |
| page | /dashboard/people | dashboard | hris.people.read | requireAnyPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/people/page.tsx |
| page | /dashboard/pos | pos | OPERATE_POS | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/pos/page.tsx |
| page | /dashboard/purchase-orders/[id]/edit | purchasing | purchases.orders.update | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/edit/page.tsx |
| page | /dashboard/purchase-orders/[id] | purchasing | purchases.orders.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/page.tsx |
| page | /dashboard/purchase-orders/new | purchasing | purchases.orders.create | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchase-orders/new/page.tsx |
| page | /dashboard/purchase-orders | purchasing | purchases.orders.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchase-orders/page.tsx |
| page | /dashboard/purchases/[id] | purchasing | purchases.orders.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx |
| page | /dashboard/purchases | purchasing | purchases.orders.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchases/page.tsx |
| page | /dashboard/purchases/payables | purchasing | purchasing.ap.invoice.view | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchases/payables/page.tsx |
| page | /dashboard/purchases/suppliers/[id]/edit | purchasing | purchases.suppliers.update | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchases/suppliers/[id]/edit/page.tsx |
| page | /dashboard/purchases/suppliers/[id] | purchasing | purchases.suppliers.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchases/suppliers/[id]/page.tsx |
| page | /dashboard/purchases/suppliers/create | purchasing | purchases.suppliers.create | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchases/suppliers/create/page.tsx |
| page | /dashboard/purchases/suppliers | purchasing | purchases.suppliers.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/purchases/suppliers/page.tsx |
| page | /dashboard/sales | sales | sales.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/sales/page.tsx |
| page | /dashboard/settings/appearance | settings | DASHBOARD_READ | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/appearance/page.tsx |
| page | /dashboard/settings/company | settings | COMPANY_READ | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/company/page.tsx |
| page | /dashboard/settings/locations/[id]/edit | settings | locations.update | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/locations/[id]/edit/page.tsx |
| page | /dashboard/settings/locations/create | settings | locations.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/locations/create/page.tsx |
| page | /dashboard/settings/locations/new | settings | locations.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/locations/new/page.tsx |
| page | /dashboard/settings/locations | settings | locations.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/locations/page.tsx |
| page | /dashboard/settings/modules | settings | MANAGE_SYSTEM_SETTINGS | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx |
| page | /dashboard/settings/notifications | settings | communication.notifications.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/notifications/page.tsx |
| page | /dashboard/settings/organization | settings | COMPANY_READ | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/organization/page.tsx |
| page | /dashboard/settings/roles/new | settings | roles.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/roles/new/page.tsx |
| page | /dashboard/settings/roles | settings | READ_ROLES | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/roles/page.tsx |
| page | /dashboard/settings/roles/update/[id] | settings | roles.update | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/roles/update/[id]/page.tsx |
| page | /dashboard/settings/security | settings | PASSWORD_READ | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/security/page.tsx |
| page | /dashboard/settings/tax-rates/[id]/edit | settings | taxes.update | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/tax-rates/[id]/edit/page.tsx |
| page | /dashboard/settings/tax-rates/create | settings | taxes.create | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/tax-rates/create/page.tsx |
| page | /dashboard/settings/tax-rates | settings | taxes.read | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/tax-rates/page.tsx |
| page | /dashboard/settings/terminals | settings | POS_STATION_READ | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/terminals/page.tsx |
| page | /dashboard/settings/users | settings | READ_USERS | checkPermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/settings/users/page.tsx |
| page | /dashboard/suppliersSystem/[id]/edit | purchasing | purchases.suppliers.update | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/suppliersSystem/[id]/edit/page.tsx |
| page | /dashboard/suppliersSystem/[id] | purchasing | purchases.suppliers.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/suppliersSystem/[id]/page.tsx |
| page | /dashboard/suppliersSystem/new | purchasing | purchases.suppliers.create | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/suppliersSystem/new/page.tsx |
| page | /dashboard/suppliersSystem | purchasing | purchases.suppliers.read | requirePermission | mapped, enforcement candidate | app/[locale]/(dashboard)/dashboard/suppliersSystem/page.tsx |
