# AqStoqFlow Statutory Service Modernization Scan

Generated: 2026-06-16T12:05:42.114Z

Root: `E:\ohada saas\newStockFlow\aqstoqflow`

Mode: `report`

Files scanned: 652

Findings: 481

## Category Counts

- action-owned-mutation: 48
- direct-prisma-outside-service: 17
- hard-delete-review: 18
- mock-demo-production-risk: 14
- raw-error-handling: 375
- ui-service-import: 9

## Findings

| Severity | Category | File | Line | Evidence | Recommendation |
| --- | --- | --- | ---: | --- | --- |
| high | action-owned-mutation | `actions/customers/customerAction2.ts` | 148 | `db.customer.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/customers/customerAction2.ts` | 180 | `db.customer.updateMany(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/customers/customerAction2.ts` | 285 | `db.customer.updateMany(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/inventory/inventoryMovementActions.ts` | 189 | `db.stockTransfer.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/item-suppliers/addItemSuppliers.ts` | 14 | `db.itemSupplier.createMany(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/item/items.ts` | 134 | `db.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/item/items.ts` | 186 | `db.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/item/items.ts` | 220 | `db.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/item/items.ts` | 248 | `db.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/item/items.ts` | 298 | `tx.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/item/items.ts` | 356 | `db.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/item/items.ts` | 392 | `db.item.delete(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | hard-delete-review | `actions/item/items.ts` | 392 | `db.item.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | action-owned-mutation | `actions/itemsShow/deleteItem.ts` | 44 | `db.item.delete(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | hard-delete-review | `actions/itemsShow/deleteItem.ts` | 44 | `db.item.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | action-owned-mutation | `actions/itemsShow/updateItemBasicInfoById.ts` | 22 | `tx.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/itemsShow/updateItemById.ts` | 43 | `tx.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/itemsShow/updateItemItemDetailsById.ts` | 21 | `tx.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/itemsShow/updateItemPricingById.ts` | 21 | `tx.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/itemsShow/updateItemRelationsById.ts` | 20 | `tx.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/itemsShow/updateItemStockById.ts` | 64 | `tx.item.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/locations/deleteLocation.ts` | 23 | `db.location.delete(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | hard-delete-review | `actions/locations/deleteLocation.ts` | 23 | `db.location.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | action-owned-mutation | `actions/locations/updateLocationById.ts` | 18 | `tx.location.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/organization/organization-settings-actions.ts` | 277 | `tx.organization.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/organization/organization-settings-actions.ts` | 294 | `tx.role.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/organization/organization-settings-actions.ts` | 371 | `db.organization.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/organization/organization-settings-actions.ts` | 394 | `db.organization.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/organization/organization-settings-actions.ts` | 417 | `db.organization.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/organization/organization-settings-actions.ts` | 440 | `db.organization.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/organization/organization-settings-actions.ts` | 463 | `db.organization.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/roles/createRole.ts` | 42 | `db.role.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/roles/updateRole.ts` | 58 | `db.role.updateMany(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/suppliers/itemSupplierActions.ts` | 245 | `db.itemSupplier.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/suppliers/itemSupplierActions.ts` | 301 | `db.itemSupplier.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/suppliers/itemSupplierActions.ts` | 356 | `db.itemSupplier.delete(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | hard-delete-review | `actions/suppliers/itemSupplierActions.ts` | 356 | `db.itemSupplier.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | action-owned-mutation | `actions/users/createInvitedUser.ts` | 49 | `tx.invite.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/createInvitedUser.ts` | 97 | `tx.user.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/createInvitedUser.ts` | 120 | `tx.passwordHistory.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/createInvitedUser.ts` | 132 | `tx.invite.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/createUser.ts` | 103 | `tx.organization.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/createUser.ts` | 130 | `tx.role.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/createUser.ts` | 148 | `tx.user.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/createUser.ts` | 174 | `tx.passwordHistory.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/deleteUser.ts` | 46 | `tx.invite.deleteMany(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | hard-delete-review | `actions/users/deleteUser.ts` | 46 | `tx.invite.deleteMany(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | action-owned-mutation | `actions/users/deleteUser.ts` | 50 | `tx.user.delete(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | hard-delete-review | `actions/users/deleteUser.ts` | 50 | `tx.user.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | action-owned-mutation | `actions/users/sendInvite.ts` | 82 | `tx.invite.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/sendInvite.ts` | 92 | `tx.invite.create(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/sendResetLink.ts` | 31 | `db.user.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/updateUserPassword.ts` | 115 | `tx.user.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | action-owned-mutation | `actions/users/verifyOtp.ts` | 24 | `db.user.update(` | Move mutation into services/<domain>; action should validate, authorize, call service, and revalidate. |
| high | direct-prisma-outside-service | `app/[locale]/(auth)/user-invite/[organisationId]/page.tsx` | 3 | `from "@/prisma/db"` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/Page.tsx` | 7 | `from "@/prisma/db"` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `app/[locale]/(dashboard)/dashboard/purchases/[id]/page.tsx` | 16 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `app/[locale]/(dashboard)/dashboard/purchases/page.tsx` | 18 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `app/[locale]/(dashboard)/dashboard/settings/roles/columns.tsx` | 11 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `app/api/v1/organisations/[id]/briefItems/route.ts` | 1 | `from "@/prisma/db"` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `app/api/v1/organisations/[id]/items/route.ts` | 1 | `from "@/prisma/db"` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `app/api/v1/organisations/route.ts` | 2 | `from "@/prisma/db"` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `components/dashboard/Sidebar.tsx` | 31 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `components/dashboard/Tables/Invites.tsx` | 6 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `components/Forms/RoleForm.tsx` | 9 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `components/locations/LocationsManagementDashboard.tsx` | 15 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `components/NotificationMenu.tsx` | 16 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `components/purchase-orders/ModernStatusBadge.tsx` | 3 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `components/tax-rates/TaxRatesManagementDashboard.tsx` | 13 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `components/units/UnitsManagementDashboard.tsx` | 5 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | direct-prisma-outside-service | `hooks/useRecentPurchaseOrderQueries.ts` | 24 | `@prisma/client` | Move data access into a protected service; keep routes/pages/hooks/components orchestration-only. |
| high | hard-delete-review | `services/accounting/posting-rules.service.ts` | 332 | `tx.postingRuleLine.deleteMany(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | hard-delete-review | `services/auth/password-policy.ts` | 163 | `tx.passwordHistory.deleteMany(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | hard-delete-review | `services/pos/pos.service.ts` | 1092 | `tx.salesOrderLine.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | hard-delete-review | `services/pos/pos.service.ts` | 1107 | `tx.salesOrderLine.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | hard-delete-review | `services/pos/pos.service.ts` | 1152 | `tx.salesOrderLine.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | hard-delete-review | `services/purchase-order/purchase-order.service.ts` | 454 | `tx.purchaseOrderLine.deleteMany(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | hard-delete-review | `services/purchase-order/purchase-order.service.ts` | 492 | `tx.purchaseOrderLine.deleteMany(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | hard-delete-review | `services/purchase-order/purchase-order.service.ts` | 493 | `tx.purchaseOrder.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | hard-delete-review | `services/tax-rate/tax-rate.service.ts` | 176 | `db.taxRate.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | hard-delete-review | `services/tax-rate/tax-rate.service.ts` | 317 | `db.taxRate.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | hard-delete-review | `services/unit/unit.service.ts` | 192 | `db.unit.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| high | hard-delete-review | `services/unit/unit.service.ts` | 331 | `db.unit.delete(` | Classify as draft-only cleanup, configuration cleanup, soft delete, cancellation, reversal, or forbidden evidence deletion. |
| medium | raw-error-handling | `actions/analytics/getSalesAnalytics.ts` | 229 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/analytics/getSalesAnalytics.ts` | 230 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/analytics/getSalesAnalytics.ts` | 330 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/analytics/getSalesAnalytics.ts` | 331 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/analytics/getSalesAnalytics.ts` | 411 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/analytics/getSalesAnalytics.ts` | 412 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/analytics/getSalesAnalytics.ts` | 501 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/analytics/getSalesAnalytics.ts` | 502 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/analytics/getSalesAnalytics.ts` | 572 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/analytics/getSalesAnalytics.ts` | 573 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/auth.ts` | 222 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/auth.ts` | 235 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/auth.ts` | 337 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/brands/getBrandsAction.ts` | 35 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/brands/getBrandsAction.ts` | 39 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/categories/getCategoriesAction.ts` | 37 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/categories/getCategoriesAction.ts` | 41 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/categories/getCategoriesAction.ts` | 45 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customer-management-actions.ts` | 126 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customer-management-actions.ts` | 132 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customer-management-actions.ts` | 136 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customer-management-actions.ts` | 162 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customer-management-actions.ts` | 185 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customer-management-actions.ts` | 210 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customer-management-actions.ts` | 242 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customer-management-actions.ts` | 267 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerAction2.ts` | 68 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerAction2.ts` | 126 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerAction2.ts` | 142 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerAction2.ts` | 171 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerAction2.ts` | 175 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerAction2.ts` | 202 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerAction2.ts` | 214 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerAction2.ts` | 222 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerAction2.ts` | 280 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerActions.ts` | 19 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerActions.ts` | 23 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerActions.ts` | 44 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerActions.ts` | 72 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerActions.ts` | 77 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/customers/customerActions.ts` | 87 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/dashboard/getDashboardData.ts` | 253 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/dashboard/getDashboardData.ts` | 315 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/dashboard/getDashboardData.ts` | 318 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/dashboard/getDashboardData.ts` | 550 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | mock-demo-production-risk | `actions/inventory/inventoryActions.ts` | 120 | `Mock implementation` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | mock-demo-production-risk | `actions/inventory/inventoryActions.ts` | 121 | `mockItems` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | mock-demo-production-risk | `actions/inventory/inventoryActions.ts` | 207 | `mockItems` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | mock-demo-production-risk | `actions/inventory/inventoryActions.ts` | 567 | `mockTransactions` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | mock-demo-production-risk | `actions/inventory/inventoryActions.ts` | 637 | `mockTransactions` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | raw-error-handling | `actions/inventory/inventoryActions.ts` | 760 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryActions.ts` | 761 | `throw error` | Use typed domain errors and safe action/route error mapping. |
| medium | mock-demo-production-risk | `actions/inventory/inventoryActions.ts` | 771 | `mockAdjustments` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | mock-demo-production-risk | `actions/inventory/inventoryActions.ts` | 802 | `mockAdjustments` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | mock-demo-production-risk | `actions/inventory/inventoryActions.ts` | 858 | `mockTransfers` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | mock-demo-production-risk | `actions/inventory/inventoryActions.ts` | 894 | `mockTransfers` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 145 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 146 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 147 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 148 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 149 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 150 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 157 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 158 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 167 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 183 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 243 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 244 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 245 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 296 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 371 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 453 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 454 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 455 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 456 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 459 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/inventory/inventoryMovementActions.ts` | 528 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item-suppliers/addItemSuppliers.ts` | 22 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item-suppliers/getItemWithSuppliers.ts` | 120 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/items.ts` | 54 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/items.ts` | 79 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/items.ts` | 124 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/items.ts` | 155 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/items.ts` | 204 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/items.ts` | 232 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/items.ts` | 262 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/items.ts` | 296 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/items.ts` | 329 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/items.ts` | 365 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/items.ts` | 403 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/item/listItemsAction.ts` | 126 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/createActionItem.ts` | 26 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/deleteItem.ts` | 30 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/deleteItem.ts` | 42 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/deleteItem.ts` | 54 | `throw error` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/getOrgItems.ts` | 37 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/getOrgItemsWithInventoryLevels.ts` | 13 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/getOrgItemsWithInventoryLevels.ts` | 107 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/getOrgItemsWithInventoryLevelsLocation.ts` | 11 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/updateItemBasicInfoById.ts` | 17 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/updateItemById.ts` | 25 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/updateItemById.ts` | 62 | `throw error` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/updateItemItemDetailsById.ts` | 17 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/updateItemPricingById.ts` | 17 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/updateItemRelationsById.ts` | 17 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/itemsShow/updateItemStockById.ts` | 61 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/createLocation.ts` | 45 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/deleteLocation.ts` | 36 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/getOrgLocations.ts` | 18 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/location-management-actions.ts` | 88 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/location-management-actions.ts` | 94 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/location-management-actions.ts` | 113 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/location-management-actions.ts` | 122 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/location-management-actions.ts` | 135 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/location-management-actions.ts` | 160 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/location-management-actions.ts` | 185 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/location-management-actions.ts` | 217 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/location-management-actions.ts` | 242 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/updateLocationById.ts` | 16 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/locations/updateLocationById.ts` | 42 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/organization/organization-settings-actions.ts` | 103 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/organization/organization-settings-actions.ts` | 158 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/organization/organization-settings-actions.ts` | 252 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/organization/organization-settings-actions.ts` | 342 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/organization/organization-settings-actions.ts` | 382 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/organization/organization-settings-actions.ts` | 405 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/organization/organization-settings-actions.ts` | 428 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/organization/organization-settings-actions.ts` | 451 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/organization/organization-settings-actions.ts` | 474 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/pos/terminal-management.actions.ts` | 82 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/pos/terminal-management.actions.ts` | 86 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/pos/terminal-management.actions.ts` | 112 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/pos/terminal-management.actions.ts` | 131 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/pos/terminal-management.actions.ts` | 160 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/pos/terminal-management.actions.ts` | 179 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/purchaseOrderWorkflow/GoodsReceiptAndSummary.ts` | 54 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/purchaseOrderWorkflow/GoodsReceiptAndSummary.ts` | 63 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts` | 64 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/createRole.ts` | 24 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/createRole.ts` | 38 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/createRole.ts` | 68 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/getOrgRoles.ts` | 22 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/getRoleById.ts` | 16 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/getRoleById.ts` | 21 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/role-auth.ts` | 30 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/role-auth.ts` | 37 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/role-auth.ts` | 49 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/role-auth.ts` | 62 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/updateRole.ts` | 26 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/updateRole.ts` | 45 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/updateRole.ts` | 54 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/updateRole.ts` | 71 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/updateRole.ts` | 79 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/roles/updateRole.ts` | 104 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/storage/photo-upload-actions.ts` | 40 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/storage/photo-upload-actions.ts` | 58 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/storage/photo-upload-actions.ts` | 98 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/storage/photo-upload-actions.ts` | 153 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/storage/photo-upload-actions.ts` | 191 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/itemSupplierActions.ts` | 146 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/itemSupplierActions.ts` | 200 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/itemSupplierActions.ts` | 274 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/itemSupplierActions.ts` | 331 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/itemSupplierActions.ts` | 365 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/itemSupplierActions.ts` | 414 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/itemSupplierActions.ts` | 459 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/supplier-management-actions.ts` | 128 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/supplier-management-actions.ts` | 134 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/supplier-management-actions.ts` | 138 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/supplier-management-actions.ts` | 162 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/supplier-management-actions.ts` | 185 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/supplier-management-actions.ts` | 210 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/supplier-management-actions.ts` | 242 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/suppliers/supplier-management-actions.ts` | 267 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/taxRate/tax-rate-management-actions.ts` | 101 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/taxRate/tax-rate-management-actions.ts` | 107 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/taxRate/tax-rate-management-actions.ts` | 126 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/taxRate/tax-rate-management-actions.ts` | 135 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/taxRate/tax-rate-management-actions.ts` | 148 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/taxRate/tax-rate-management-actions.ts` | 174 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/taxRate/tax-rate-management-actions.ts` | 199 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/taxRate/tax-rate-management-actions.ts` | 231 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/taxRate/tax-rate-management-actions.ts` | 256 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/units/deleteUnit.ts` | 30 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/units/getOrgUnits.ts` | 18 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/units/unit-management-actions.ts` | 104 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/units/unit-management-actions.ts` | 110 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/units/unit-management-actions.ts` | 129 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/units/unit-management-actions.ts` | 138 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/units/unit-management-actions.ts` | 151 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/units/unit-management-actions.ts` | 177 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/units/unit-management-actions.ts` | 202 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/units/unit-management-actions.ts` | 234 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/units/unit-management-actions.ts` | 259 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/users/createInvitedUser.ts` | 161 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/users/createUser.ts` | 198 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/users/createUser.ts` | 202 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/users/createUser.ts` | 231 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/users/deleteUser.ts` | 43 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/users/deleteUser.ts` | 72 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/users/getOrgInvites.ts` | 71 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/users/getOrgUsers.ts` | 55 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/users/sendInvite.ts` | 115 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/users/sendInvite.ts` | 133 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `actions/users/sendResetLink.ts` | 50 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | mock-demo-production-risk | `app/[locale]/(dashboard)/dashboard/items/new/page.tsx` | 4 | `demo route` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | raw-error-handling | `app/api/uploads/[...path]/route.ts` | 83 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `app/api/v1/organisations/[id]/briefItems/route.ts` | 19 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `app/api/v1/organisations/[id]/briefItems/route.ts` | 139 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `app/api/v1/organisations/[id]/items/route.ts` | 92 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `app/api/v1/organisations/[id]/items/route.ts` | 93 | `throw error` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `app/api/v1/organisations/route.ts` | 33 | `console.error(` | Use typed domain errors and safe action/route error mapping. |
| medium | ui-service-import | `components/accounting/CloseAssuranceCenter.tsx` | 26 | `from '@/services/..'` | UI and hooks should call actions/API surfaces, not business-rule services directly. |
| medium | ui-service-import | `components/brands/ModernBrandForm.tsx` | 26 | `from '@/services/..'` | UI and hooks should call actions/API surfaces, not business-rule services directly. |
| medium | ui-service-import | `components/categories/ModernCategoryForm.tsx` | 11 | `from '@/services/..'` | UI and hooks should call actions/API surfaces, not business-rule services directly. |
| medium | mock-demo-production-risk | `components/dashboard/Tables/ModalTableheader.tsx` | 290 | `Sample Data` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | mock-demo-production-risk | `components/dashboard/Tables/TableHeader.tsx` | 293 | `Sample Data` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | ui-service-import | `components/finance/FinanceCommandCenterDashboard.tsx` | 41 | `from '@/services/..'` | UI and hooks should call actions/API surfaces, not business-rule services directly. |
| medium | ui-service-import | `components/finance/PaymentReconciliationWorkbench.tsx` | 52 | `from '@/services/..'` | UI and hooks should call actions/API surfaces, not business-rule services directly. |
| medium | ui-service-import | `components/pos/CashDrawerManagementDashboard.tsx` | 42 | `from '@/services/..'` | UI and hooks should call actions/API surfaces, not business-rule services directly. |
| medium | ui-service-import | `hooks/finance/useFinanceDashboard.ts` | 4 | `from '@/services/..'` | UI and hooks should call actions/API surfaces, not business-rule services directly. |
| medium | ui-service-import | `hooks/payments/usePaymentReconciliationWorkbench.ts` | 6 | `from '@/services/..'` | UI and hooks should call actions/API surfaces, not business-rule services directly. |
| medium | ui-service-import | `hooks/posHooks/useDrawerDashboard.ts` | 4 | `from '@/services/..'` | UI and hooks should call actions/API surfaces, not business-rule services directly. |
| medium | mock-demo-production-risk | `lib/error-handling/monitoring.ts` | 877 | `Mock implementation` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | mock-demo-production-risk | `lib/error-handling/monitoring.ts` | 882 | `Mock implementation` | Remove production-visible mock data or quarantine it behind explicit demo-only boundaries. |
| medium | raw-error-handling | `services/_shared/require-org.ts` | 20 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/_shared/resolve-action-organization.ts` | 13 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/_shared/resolve-action-organization.ts` | 26 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/accounts.service.ts` | 63 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/accounts.service.ts` | 241 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/accounts.service.ts` | 242 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/invariants.ts` | 52 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/invariants.ts` | 63 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/invariants.ts` | 67 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/invariants.ts` | 82 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/invariants.ts` | 86 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/invariants.ts` | 102 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/invariants.ts` | 126 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/invariants.ts` | 130 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/invariants.ts` | 134 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/invariants.ts` | 142 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/journals.service.ts` | 158 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/journals.service.ts` | 160 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/journals.service.ts` | 172 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/journals.service.ts` | 179 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/journals.service.ts` | 194 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/journals.service.ts` | 203 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/journals.service.ts` | 204 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/journals.service.ts` | 205 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/journals.service.ts` | 206 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/journals.service.ts` | 211 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/journals.service.ts` | 216 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/periods.service.ts` | 103 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/posting.service.ts` | 124 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/posting.service.ts` | 130 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/posting.service.ts` | 131 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/posting.service.ts` | 242 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/posting.service.ts` | 244 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/posting.service.ts` | 362 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/posting.service.ts` | 364 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/accounting/posting.service.ts` | 367 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/brand/brand.service.ts` | 86 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/brand/brand.service.ts` | 105 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/brand/brand.service.ts` | 134 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/brand/brand.service.ts` | 151 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/brand/brand.service.ts` | 178 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/category/category.service.ts` | 48 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/category/category.service.ts` | 57 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/category/category.service.ts` | 110 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/category/category.service.ts` | 130 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/category/category.service.ts` | 159 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/category/category.service.ts` | 180 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/category/category.service.ts` | 211 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/customer/customer.service.ts` | 180 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/customer/customer.service.ts` | 200 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/customer/customer.service.ts` | 229 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/customer/customer.service.ts` | 236 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/customer/customer.service.ts` | 263 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/customer/customer.service.ts` | 523 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/customer/customer.service.ts` | 538 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/customer/customer.service.ts` | 562 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/customer/customer.service.ts` | 584 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/finance/finance-dashboard.service.ts` | 227 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/finance/finance-dashboard.service.ts` | 392 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/item/item.service.ts` | 262 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/item/item.service.ts` | 336 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/item/item.service.ts` | 337 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/item/item.service.ts` | 338 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/item/item.service.ts` | 408 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/item/item.service.ts` | 441 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/location/location.service.ts` | 304 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/location/location.service.ts` | 351 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/location/location.service.ts` | 368 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/location/location.service.ts` | 413 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/location/location.service.ts` | 439 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/location/location.service.ts` | 448 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/payments/adapters/mobile-money-hmac.adapter.ts` | 53 | `throw error` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/payments/payment-reconciliation-workbench.service.ts` | 408 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/payments/payment-reconciliation-workbench.service.ts` | 445 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/payroll/__tests__/payroll-completion.service.test.ts` | 360 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/payroll/__tests__/payroll-control.service.test.ts` | 180 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/drawer-dashboard.service.ts` | 248 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/drawer-dashboard.service.ts` | 256 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 363 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 382 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 396 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 451 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 710 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 721 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 814 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 999 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1019 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1089 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1150 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1242 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1243 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1256 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1274 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1277 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1304 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1309 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1333 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1401 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/pos.service.ts` | 1544 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/receipt.service.ts` | 418 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/receipt.service.ts` | 566 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/receipt.service.ts` | 582 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/terminal-management.service.ts` | 87 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/terminal-management.service.ts` | 98 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/terminal-management.service.ts` | 111 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/terminal-management.service.ts` | 138 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/terminal-management.service.ts` | 329 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/terminal-management.service.ts` | 356 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/terminal-management.service.ts` | 360 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/terminal-management.service.ts` | 364 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/terminal-management.service.ts` | 396 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/terminal-management.service.ts` | 420 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/pos/terminal-management.service.ts` | 424 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 99 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 100 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 101 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 108 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 189 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 322 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 339 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 340 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 341 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 397 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 399 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 408 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 412 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 428 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 487 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 489 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 507 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 509 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 522 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 523 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 535 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 537 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 565 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 567 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 574 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 592 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 597 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 600 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 604 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 608 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 612 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 620 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 630 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 751 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/purchase-order/purchase-order.service.ts` | 945 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/supplier/supplier.service.ts` | 193 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/supplier/supplier.service.ts` | 212 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/supplier/supplier.service.ts` | 246 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/supplier/supplier.service.ts` | 253 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/supplier/supplier.service.ts` | 289 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/supplier/supplier.service.ts` | 299 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/supplier/supplier.service.ts` | 306 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/supplier/supplier.service.ts` | 580 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/supplier/supplier.service.ts` | 595 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/supplier/supplier.service.ts` | 620 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/supplier/supplier.service.ts` | 645 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/tax-rate/tax-rate.service.ts` | 93 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/tax-rate/tax-rate.service.ts` | 142 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/tax-rate/tax-rate.service.ts` | 170 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/tax-rate/tax-rate.service.ts` | 173 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/tax-rate/tax-rate.service.ts` | 268 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/tax-rate/tax-rate.service.ts` | 283 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/tax-rate/tax-rate.service.ts` | 302 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/unit/unit.service.ts` | 108 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/unit/unit.service.ts` | 144 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/unit/unit.service.ts` | 186 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/unit/unit.service.ts` | 189 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/unit/unit.service.ts` | 282 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/unit/unit.service.ts` | 297 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |
| medium | raw-error-handling | `services/unit/unit.service.ts` | 316 | `throw new Error(` | Use typed domain errors and safe action/route error mapping. |

## Next Step

Treat this as a report-mode inventory. Migrate one category/domain at a time, add regression tests, then ratchet the relevant scanner to fail mode after findings reach zero or have precise allowlist entries.
