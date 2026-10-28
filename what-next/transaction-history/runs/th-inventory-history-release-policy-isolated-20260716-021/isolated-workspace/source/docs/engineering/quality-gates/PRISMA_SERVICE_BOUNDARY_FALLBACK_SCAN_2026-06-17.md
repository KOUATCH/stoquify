# Prisma Service Boundary Scan

Generated: 2026-06-17T04:01:36.035Z
Root: `E:\ohada saas\newStockFlow\aqstoqflow`
Scan directories: `app`, `actions`, `components`, `hooks`

## Summary

- Active violations: 189
- Allowed findings: 4
- Total findings: 193

## Active Counts

- ACTION_OWNED_MUTATION: 34
- DIRECT_PRISMA_CALL_OUTSIDE_SERVICE: 97
- DIRECT_PRISMA_DB_IMPORT: 32
- PRISMA_CLIENT_BOUNDARY_COUPLING: 26

## Findings

| Severity | Classification | File | Line | Evidence | Reason |
| --- | --- | --- | ---: | --- | --- |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/accounting/reports.actions.ts` | 6 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/analytics/financial-analytics.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/analytics/financial-analytics.ts` | 5 | `import { Prisma, type SalesOrderStatus } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-analytics.ts` | 91 | `return db.salesOrder.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-analytics.ts` | 125 | `db.inventoryLevel.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-analytics.ts` | 129 | `db.cashDrawerTransaction.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-analytics.ts` | 265 | `const dailyReport = await db.dailySalesReport.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/analytics/financial-reports.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/analytics/financial-reports.ts` | 5 | `import { Prisma, type SalesOrderStatus } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-reports.ts` | 147 | `return db.salesOrder.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-reports.ts` | 301 | `const sessions = await db.pOSSession.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-reports.ts` | 393 | `const items = await db.item.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-reports.ts` | 463 | `const transactions = await db.cashDrawerTransaction.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-reports.ts` | 519 | `const sessions = await db.pOSSession.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/analytics/getSalesAnalytics.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 104 | `const sales = await db.salesOrder.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 244 | `const sessions = await db.pOSSession.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 280 | `const allTransactions = await db.cashDrawerTransaction.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 345 | `const items = await db.item.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 426 | `const users = await db.user.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 526 | `const activeSessions = await db.pOSSession.count({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 534 | `const lowStockItems = await db.item.count({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/auth.ts` | 4 | `import { Locale as PrismaLocale } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/auth.ts` | 38 | `while (await tx.organization.findUnique({ where: { slug: candidate } })) {` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/auth.ts` | 72 | `const existingUser = await db.user.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/auth.ts` | 83 | `const existingPhone = await db.user.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 117 | `const organization = await tx.organization.create({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 135 | `const adminRole = await tx.role.create({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 151 | `const user = await tx.user.create({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 171 | `await tx.user.update({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 180 | `await tx.passwordHistory.create({` | Mutations belong in services, not server actions. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/customers/customer-management-actions.ts` | 4 | `import { Prisma } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/customers/customerAction2.ts` | 7 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/customers/customerAction2.ts` | 15 | `import type { Customer as PrismaCustomer, Payment } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 75 | `const customerCount = await db.customer.count({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 85 | `const customers = await db.customer.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 129 | `const customer = await db.customer.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/customers/customerAction2.ts` | 148 | `const customer = await db.customer.create({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/customers/customerAction2.ts` | 180 | `const updated = await db.customer.updateMany({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 205 | `const customer = await db.customer.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 227 | `const orders = await db.salesOrder.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/customers/customerAction2.ts` | 285 | `await db.customer.updateMany({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/dashboard/getDashboardData.ts` | 4 | `import { db } from '@/prisma/db'` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/dashboard/getDashboardData.ts` | 12 | `} from '@prisma/client'` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 260 | `? db.user.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 275 | `? db.organization.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 303 | `const activeOrganizations = await db.organization.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 357 | `db.organization.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 361 | `db.salesOrder.aggregate({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 366 | `db.salesOrder.aggregate({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 371 | `db.payment.aggregate({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 382 | `db.payment.aggregate({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 393 | `db.customer.count({ where: { organizationId, deletedAt: null } }),` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 394 | `db.customer.count({ where: { organizationId, deletedAt: null, createdAt: { lt: from } } }),` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 395 | `db.customer.count({ where: { organizationId, deletedAt: null, createdAt: { gte: from, lte: to } } }),` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 396 | `db.location.count({ where: { organizationId, isActive: true } }),` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 397 | `db.pOSSession.count({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 404 | `db.salesOrder.count({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 412 | `db.purchaseOrder.count({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 420 | `db.purchaseOrder.aggregate({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 429 | `db.item.count({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 432 | `db.item.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 458 | `db.salesOrder.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 463 | `db.salesOrderLine.groupBy({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 479 | `db.location.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 499 | `db.salesOrder.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 512 | `db.purchaseOrder.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 530 | `db.inventoryTransaction.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 627 | `? await db.item.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/item-suppliers/addItemSuppliers.ts` | 2 | `import { db } from '@/prisma/db';` | DB clients must be owned by service modules. |
| high | ACTION_OWNED_MUTATION | `actions/item-suppliers/addItemSuppliers.ts` | 14 | `await db.itemSupplier.createMany({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/item-suppliers/getItemWithSuppliers.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/item-suppliers/getItemWithSuppliers.ts` | 5 | `import { Prisma } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/item-suppliers/getItemWithSuppliers.ts` | 32 | `const item = await db.item.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/locations/location-management-actions.ts` | 5 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/locations/location-management-actions.ts` | 6 | `import { Prisma } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/locations/location-management-actions.ts` | 97 | `const user = await db.user.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/locations/location-management-actions.ts` | 125 | `const organization = await db.organization.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/locations/updateLocationById.ts` | 3 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/locations/updateLocationById.ts` | 11 | `const location = await tx.location.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/locations/updateLocationById.ts` | 18 | `const updatedLocation = await tx.location.update({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/organization/organization-settings-actions.ts` | 4 | `import { db } from '@/prisma/db'` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/organization/organization-settings-actions.ts` | 7 | `import { Locale as PrismaLocale, PaymentStatus } from '@prisma/client'` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 114 | `while (await db.organization.findUnique({ where: { slug }, select: { id: true } })) {` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 131 | `const organization = await db.organization.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 170 | `const organizations = await db.organization.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 206 | `? await db.payment.groupBy({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 277 | `const createdOrganization = await tx.organization.create({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 294 | `await tx.role.create({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 371 | `const organization = await db.organization.update({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 394 | `const organization = await db.organization.update({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 417 | `const organization = await db.organization.update({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 440 | `const organization = await db.organization.update({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 463 | `const organization = await db.organization.update({` | Mutations belong in services, not server actions. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/payments/reconciliation.actions.ts` | 3 | `import { SuspenseType } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/pos/terminal-management.actions.ts` | 4 | `import { Prisma } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/createRole.ts` | 6 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/createRole.ts` | 30 | `const existingRole = await db.role.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/roles/createRole.ts` | 42 | `const role = await db.role.create({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/getOrgRoles.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/getOrgRoles.ts` | 14 | `const orgRoles = await db.role.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/getRoleById.ts` | 3 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/getRoleById.ts` | 11 | `const role = await db.role.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/role-auth.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/role-auth.ts` | 52 | `const organization = await db.organization.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/updateRole.ts` | 6 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/updateRole.ts` | 34 | `const existingRole = await db.role.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/updateRole.ts` | 49 | `const beforeRole = await db.role.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/roles/updateRole.ts` | 58 | `const updated = await db.role.updateMany({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/updateRole.ts` | 74 | `const role = await db.role.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/storage/storage-config-actions.ts` | 4 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/storage/storage-config-actions.ts` | 177 | `const organizationExists = await db.organization.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/suppliers/getOrgSuppliers.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/suppliers/getOrgSuppliers.ts` | 6 | `import type { Prisma } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/getOrgSuppliers.ts` | 63 | `db.supplier.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/getOrgSuppliers.ts` | 90 | `db.supplier.count({ where }),` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/suppliers/itemSupplierActions.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/suppliers/itemSupplierActions.ts` | 8 | `import type { Prisma } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 112 | `const itemSuppliers = await db.itemSupplier.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 164 | `const itemSupplier = await db.itemSupplier.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 219 | `const existingRelation = await db.itemSupplier.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 232 | `db.item.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 236 | `db.supplier.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/suppliers/itemSupplierActions.ts` | 246 | `const itemSupplier = await db.itemSupplier.create({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 290 | `const existingRelation = await db.itemSupplier.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/suppliers/itemSupplierActions.ts` | 302 | `const itemSupplier = await db.itemSupplier.update({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 364 | `const itemSuppliers = await db.itemSupplier.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 421 | `const itemSuppliers = await db.itemSupplier.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/suppliers/supplier-management-actions.ts` | 4 | `import { Prisma } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/taxRate/tax-rate-management-actions.ts` | 5 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/taxRate/tax-rate-management-actions.ts` | 6 | `import { Prisma } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/taxRate/tax-rate-management-actions.ts` | 110 | `const user = await db.user.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/taxRate/tax-rate-management-actions.ts` | 138 | `const organization = await db.organization.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/units/unit-management-actions.ts` | 5 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/units/unit-management-actions.ts` | 6 | `import { Prisma } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/units/unit-management-actions.ts` | 113 | `const user = await db.user.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/units/unit-management-actions.ts` | 141 | `const organization = await db.organization.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/users/createInvitedUser.ts` | 2 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/users/createInvitedUser.ts` | 8 | `import { InviteStatus } from "@prisma/client";` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createInvitedUser.ts` | 33 | `const invite = await tx.invite.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 49 | `await tx.invite.update({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createInvitedUser.ts` | 69 | `const existingUser = await tx.user.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 97 | `const newUser = await tx.user.create({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 120 | `await tx.passwordHistory.create({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 132 | `await tx.invite.update({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/users/createUser.ts` | 13 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/users/createUser.ts` | 15 | `import { Locale as PrismaLocale } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 47 | `while (await tx.organization.findUnique({ where: { slug: candidate } })) {` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 76 | `const existingUserByEmail = await tx.user.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 88 | `const existingUserByPhone = await tx.user.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 103 | `const org = await tx.organization.create({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 121 | `let defaultRole = await tx.role.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 130 | `defaultRole = await tx.role.create({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 148 | `const newUser = await tx.user.create({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 174 | `await tx.passwordHistory.create({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/users/getOrgInvites.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/getOrgInvites.ts` | 45 | `const organizationInvites = await db.invite.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/users/getOrgUsers.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/getOrgUsers.ts` | 40 | `const organizationUsers = await db.user.findMany({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/users/getUserById.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/getUserById.ts` | 42 | `const user = await db.user.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/users/sendInvite.ts` | 8 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/users/sendInvite.ts` | 9 | `import { InviteStatus } from "@prisma/client";` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendInvite.ts` | 35 | `const role = await tx.role.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendInvite.ts` | 49 | `const existingUserByEmail = await tx.user.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendInvite.ts` | 62 | `const existingInvite = await tx.invite.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/users/sendInvite.ts` | 82 | `await tx.invite.update({` | Mutations belong in services, not server actions. |
| high | ACTION_OWNED_MUTATION | `actions/users/sendInvite.ts` | 92 | `await tx.invite.create({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/users/sendResetLink.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendResetLink.ts` | 21 | `const user = await db.user.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/users/sendResetLink.ts` | 31 | `await db.user.update({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/users/updateUserPassword.ts` | 11 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/updateUserPassword.ts` | 22 | `const existingUser = await db.user.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/updateUserPassword.ts` | 78 | `const user = await db.user.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/users/updateUserPassword.ts` | 115 | `await tx.user.update({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_DB_IMPORT | `actions/users/verifyOtp.ts` | 3 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/verifyOtp.ts` | 10 | `const user= await db.user.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| high | ACTION_OWNED_MUTATION | `actions/users/verifyOtp.ts` | 24 | `await db.user.update({` | Mutations belong in services, not server actions. |
| high | DIRECT_PRISMA_DB_IMPORT | `app/[locale]/(auth)/user-invite/[organisationId]/page.tsx` | 3 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `app/[locale]/(auth)/user-invite/[organisationId]/page.tsx` | 4 | `import { InviteStatus } from "@prisma/client";` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `app/[locale]/(auth)/user-invite/[organisationId]/page.tsx` | 15 | `? await db.invite.findUnique({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `app/[locale]/(dashboard)/dashboard/settings/roles/columns.tsx` | 11 | `import { Role } from "@prisma/client";` | Edge layers should consume service DTOs instead of Prisma client types. |
| high | DIRECT_PRISMA_DB_IMPORT | `app/api/v1/organisations/route.ts` | 2 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules. |
| high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `app/api/v1/organisations/route.ts` | 14 | `const organization = await db.organization.findFirst({` | Direct Prisma calls outside services bypass tenant/RBAC/audit boundaries. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/dashboard/Tables/Invites.tsx` | 6 | `import type { InviteStatus } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/Forms/RoleForm.tsx` | 9 | `import { Role } from "@prisma/client";` | Edge layers should consume service DTOs instead of Prisma client types. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/locations/LocationsManagementDashboard.tsx` | 15 | `import type { LocationType } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/tax-rates/TaxRatesManagementDashboard.tsx` | 13 | `import type { TaxType } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |
| medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/units/UnitsManagementDashboard.tsx` | 5 | `import type { UnitType } from "@prisma/client"` | Edge layers should consume service DTOs instead of Prisma client types. |

