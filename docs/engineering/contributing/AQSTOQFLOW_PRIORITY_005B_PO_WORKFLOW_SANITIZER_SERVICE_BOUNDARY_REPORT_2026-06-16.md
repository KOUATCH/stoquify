# AqStoqFlow Service Boundary Gate Report

Generated: 2026-06-16T20:30:42.378Z

Root: `E:\ohada saas\newStockFlow\aqstoqflow`
Mode: `report`
Scan directories: `app`, `actions`, `components`, `hooks`

## Summary

- Active service-boundary violations: 220
- Allowed test/mock/service findings: 4
- Total callsites scanned: 224

## Active Counts

- ACTION_OWNED_MUTATION: 38
- DIRECT_PRISMA_CALL_OUTSIDE_SERVICE: 116
- DIRECT_PRISMA_DB_IMPORT: 39
- PRISMA_CLIENT_BOUNDARY_COUPLING: 27

## Active Violations

| Order | Severity | Classification | File | Line | Evidence | Reason |
| ---: | --- | --- | --- | ---: | --- | --- |
| 1 | high | DIRECT_PRISMA_DB_IMPORT | `actions/inventory/inventoryActions.ts` | 5 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 1 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/inventory/inventoryActions.ts` | 325 | `const levels = await db.inventoryLevel.findMany({` | db.inventoryLevel.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 1 | high | DIRECT_PRISMA_DB_IMPORT | `actions/inventory/inventoryMovementActions.ts` | 6 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 1 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/inventory/inventoryMovementActions.ts` | 10 | `import type { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 1 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/inventory/inventoryMovementActions.ts` | 256 | `db.stockTransfer.findMany({` | db.stockTransfer.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 1 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/inventory/inventoryMovementActions.ts` | 263 | `db.stockTransfer.count({ where }),` | db.stockTransfer.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 1 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/inventory/inventoryMovementActions.ts` | 326 | `const transactions = await db.inventoryTransaction.findMany({` | db.inventoryTransaction.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 1 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/inventory/inventoryMovementActions.ts` | 483 | `db.inventoryTransaction.aggregate({` | db.inventoryTransaction.aggregate bypasses the service-owned tenant/RBAC/audit boundary. |
| 1 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/inventory/inventoryMovementActions.ts` | 487 | `db.inventoryTransaction.aggregate({` | db.inventoryTransaction.aggregate bypasses the service-owned tenant/RBAC/audit boundary. |
| 1 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/inventory/inventoryMovementActions.ts` | 491 | `db.inventoryTransaction.aggregate({` | db.inventoryTransaction.aggregate bypasses the service-owned tenant/RBAC/audit boundary. |
| 1 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/inventory/inventoryMovementActions.ts` | 495 | `db.inventoryTransaction.aggregate({` | db.inventoryTransaction.aggregate bypasses the service-owned tenant/RBAC/audit boundary. |
| 1 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/inventory/inventoryMovementActions.ts` | 499 | `db.inventoryTransaction.count({ where }),` | db.inventoryTransaction.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 2 | high | DIRECT_PRISMA_DB_IMPORT | `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/Page.tsx` | 7 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 2 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/Page.tsx` | 22 | `const itemData = await db.item.findFirst({` | db.item.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 2 | high | DIRECT_PRISMA_DB_IMPORT | `app/api/v1/organisations/[id]/briefItems/route.ts` | 1 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 2 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `app/api/v1/organisations/[id]/briefItems/route.ts` | 65 | `db.item.findMany({` | db.item.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 2 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `app/api/v1/organisations/[id]/briefItems/route.ts` | 83 | `db.item.count({ where: { organizationId: orgId } })` | db.item.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 2 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `app/api/v1/organisations/[id]/briefItems/route.ts` | 104 | `const items = await db.item.findMany({` | db.item.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 2 | high | DIRECT_PRISMA_DB_IMPORT | `app/api/v1/organisations/[id]/items/route.ts` | 1 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 2 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `app/api/v1/organisations/[id]/items/route.ts` | 38 | `db.item.findMany({` | db.item.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 2 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `app/api/v1/organisations/[id]/items/route.ts` | 46 | `db.item.count({ where: { organizationId: orgId } })` | db.item.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 2 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `app/api/v1/organisations/[id]/items/route.ts` | 67 | `const items = await db.item.findMany({` | db.item.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 2 | high | DIRECT_PRISMA_DB_IMPORT | `app/api/v1/organisations/route.ts` | 2 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 2 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `app/api/v1/organisations/route.ts` | 14 | `const organization = await db.organization.findFirst({` | db.organization.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 5 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/dashboard/Tables/Invites.tsx` | 6 | `import type { InviteStatus } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 5 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/Forms/RoleForm.tsx` | 9 | `import { Role } from "@prisma/client";` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 5 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/locations/LocationsManagementDashboard.tsx` | 15 | `import type { LocationType } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 5 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/tax-rates/TaxRatesManagementDashboard.tsx` | 13 | `import type { TaxType } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 5 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/units/UnitsManagementDashboard.tsx` | 5 | `import type { UnitType } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/accounting/reports.actions.ts` | 6 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/analytics/financial-analytics.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/analytics/financial-analytics.ts` | 5 | `import { Prisma, type SalesOrderStatus } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-analytics.ts` | 91 | `return db.salesOrder.findMany({` | db.salesOrder.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-analytics.ts` | 125 | `db.inventoryLevel.findMany({` | db.inventoryLevel.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-analytics.ts` | 129 | `db.cashDrawerTransaction.findMany({` | db.cashDrawerTransaction.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-analytics.ts` | 265 | `const dailyReport = await db.dailySalesReport.findFirst({` | db.dailySalesReport.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/analytics/financial-reports.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/analytics/financial-reports.ts` | 5 | `import { Prisma, type SalesOrderStatus } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-reports.ts` | 147 | `return db.salesOrder.findMany({` | db.salesOrder.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-reports.ts` | 301 | `const sessions = await db.pOSSession.findMany({` | db.pOSSession.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-reports.ts` | 393 | `const items = await db.item.findMany({` | db.item.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-reports.ts` | 463 | `const transactions = await db.cashDrawerTransaction.findMany({` | db.cashDrawerTransaction.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/financial-reports.ts` | 519 | `const sessions = await db.pOSSession.findMany({` | db.pOSSession.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/analytics/getSalesAnalytics.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 104 | `const sales = await db.salesOrder.findMany({` | db.salesOrder.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 244 | `const sessions = await db.pOSSession.findMany({` | db.pOSSession.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 280 | `const allTransactions = await db.cashDrawerTransaction.findMany({` | db.cashDrawerTransaction.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 345 | `const items = await db.item.findMany({` | db.item.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 426 | `const users = await db.user.findMany({` | db.user.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 526 | `const activeSessions = await db.pOSSession.count({` | db.pOSSession.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/analytics/getSalesAnalytics.ts` | 534 | `const lowStockItems = await db.item.count({` | db.item.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/auth.ts` | 4 | `import { Locale as PrismaLocale } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/auth.ts` | 38 | `while (await tx.organization.findUnique({ where: { slug: candidate } })) {` | tx.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/auth.ts` | 72 | `const existingUser = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/auth.ts` | 83 | `const existingPhone = await db.user.findUnique({` | db.user.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 117 | `const organization = await tx.organization.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 135 | `const adminRole = await tx.role.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 151 | `const user = await tx.user.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 171 | `await tx.user.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 180 | `await tx.passwordHistory.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/customers/customer-management-actions.ts` | 4 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/customers/customerAction2.ts` | 7 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/customers/customerAction2.ts` | 15 | `import type { Customer as PrismaCustomer, Payment } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 75 | `const customerCount = await db.customer.count({` | db.customer.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 85 | `const customers = await db.customer.findMany({` | db.customer.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 129 | `const customer = await db.customer.findFirst({` | db.customer.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/customers/customerAction2.ts` | 148 | `const customer = await db.customer.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/customers/customerAction2.ts` | 180 | `const updated = await db.customer.updateMany({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 205 | `const customer = await db.customer.findFirst({` | db.customer.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 227 | `const orders = await db.salesOrder.findMany({` | db.salesOrder.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/customers/customerAction2.ts` | 285 | `await db.customer.updateMany({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/dashboard/getDashboardData.ts` | 4 | `import { db } from '@/prisma/db'` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/dashboard/getDashboardData.ts` | 12 | `} from '@prisma/client'` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 260 | `? db.user.findUnique({` | db.user.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 275 | `? db.organization.findUnique({` | db.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 303 | `const activeOrganizations = await db.organization.findMany({` | db.organization.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 357 | `db.organization.findUnique({` | db.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 361 | `db.salesOrder.aggregate({` | db.salesOrder.aggregate bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 366 | `db.salesOrder.aggregate({` | db.salesOrder.aggregate bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 371 | `db.payment.aggregate({` | db.payment.aggregate bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 382 | `db.payment.aggregate({` | db.payment.aggregate bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 393 | `db.customer.count({ where: { organizationId, deletedAt: null } }),` | db.customer.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 394 | `db.customer.count({ where: { organizationId, deletedAt: null, createdAt: { lt: from } } }),` | db.customer.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 395 | `db.customer.count({ where: { organizationId, deletedAt: null, createdAt: { gte: from, lte: to } } }),` | db.customer.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 396 | `db.location.count({ where: { organizationId, isActive: true } }),` | db.location.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 397 | `db.pOSSession.count({` | db.pOSSession.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 404 | `db.salesOrder.count({` | db.salesOrder.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 412 | `db.purchaseOrder.count({` | db.purchaseOrder.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 420 | `db.purchaseOrder.aggregate({` | db.purchaseOrder.aggregate bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 429 | `db.item.count({` | db.item.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 432 | `db.item.findMany({` | db.item.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 458 | `db.salesOrder.findMany({` | db.salesOrder.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 463 | `db.salesOrderLine.groupBy({` | db.salesOrderLine.groupBy bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 479 | `db.location.findMany({` | db.location.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 499 | `db.salesOrder.findMany({` | db.salesOrder.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 512 | `db.purchaseOrder.findMany({` | db.purchaseOrder.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 530 | `db.inventoryTransaction.findMany({` | db.inventoryTransaction.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/dashboard/getDashboardData.ts` | 627 | `? await db.item.findMany({` | db.item.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/item-suppliers/addItemSuppliers.ts` | 2 | `import { db } from '@/prisma/db';` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/item-suppliers/addItemSuppliers.ts` | 14 | `await db.itemSupplier.createMany({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/item-suppliers/getItemWithSuppliers.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/item-suppliers/getItemWithSuppliers.ts` | 5 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/item-suppliers/getItemWithSuppliers.ts` | 32 | `const item = await db.item.findUnique({` | db.item.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/locations/deleteLocation.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/locations/deleteLocation.ts` | 11 | `const location = await db.location.findUnique({` | db.location.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/locations/deleteLocation.ts` | 23 | `const deletedLocation = await db.location.delete({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/locations/location-management-actions.ts` | 5 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/locations/location-management-actions.ts` | 6 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/locations/location-management-actions.ts` | 97 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/locations/location-management-actions.ts` | 125 | `const organization = await db.organization.findFirst({` | db.organization.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/locations/updateLocationById.ts` | 3 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/locations/updateLocationById.ts` | 11 | `const location = await tx.location.findUnique({` | tx.location.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/locations/updateLocationById.ts` | 18 | `const updatedLocation = await tx.location.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/organization/organization-settings-actions.ts` | 4 | `import { db } from '@/prisma/db'` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/organization/organization-settings-actions.ts` | 7 | `import { Locale as PrismaLocale, PaymentStatus } from '@prisma/client'` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 114 | `while (await db.organization.findUnique({ where: { slug }, select: { id: true } })) {` | db.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 131 | `const organization = await db.organization.findUnique({` | db.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 170 | `const organizations = await db.organization.findMany({` | db.organization.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 206 | `? await db.payment.groupBy({` | db.payment.groupBy bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 277 | `const createdOrganization = await tx.organization.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 294 | `await tx.role.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 371 | `const organization = await db.organization.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 394 | `const organization = await db.organization.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 417 | `const organization = await db.organization.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 440 | `const organization = await db.organization.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 463 | `const organization = await db.organization.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/payments/reconciliation.actions.ts` | 3 | `import { SuspenseType } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/pos/terminal-management.actions.ts` | 4 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/createRole.ts` | 6 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/createRole.ts` | 30 | `const existingRole = await db.role.findFirst({` | db.role.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/roles/createRole.ts` | 42 | `const role = await db.role.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/getOrgRoles.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/getOrgRoles.ts` | 14 | `const orgRoles = await db.role.findMany({` | db.role.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/getRoleById.ts` | 3 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/getRoleById.ts` | 11 | `const role = await db.role.findFirst({` | db.role.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/role-auth.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/role-auth.ts` | 52 | `const organization = await db.organization.findFirst({` | db.organization.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/updateRole.ts` | 6 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/updateRole.ts` | 34 | `const existingRole = await db.role.findFirst({` | db.role.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/updateRole.ts` | 49 | `const beforeRole = await db.role.findFirst({` | db.role.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/roles/updateRole.ts` | 58 | `const updated = await db.role.updateMany({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/updateRole.ts` | 74 | `const role = await db.role.findFirst({` | db.role.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/storage/storage-config-actions.ts` | 4 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/storage/storage-config-actions.ts` | 177 | `const organizationExists = await db.organization.findUnique({` | db.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/suppliers/getOrgSuppliers.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/suppliers/getOrgSuppliers.ts` | 6 | `import type { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/getOrgSuppliers.ts` | 63 | `db.supplier.findMany({` | db.supplier.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/getOrgSuppliers.ts` | 90 | `db.supplier.count({ where }),` | db.supplier.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/suppliers/itemSupplierActions.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/suppliers/itemSupplierActions.ts` | 7 | `import type { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 111 | `const itemSuppliers = await db.itemSupplier.findMany({` | db.itemSupplier.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 163 | `const itemSupplier = await db.itemSupplier.findFirst({` | db.itemSupplier.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 218 | `const existingRelation = await db.itemSupplier.findFirst({` | db.itemSupplier.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 231 | `db.item.findFirst({` | db.item.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 235 | `db.supplier.findFirst({` | db.supplier.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/suppliers/itemSupplierActions.ts` | 245 | `const itemSupplier = await db.itemSupplier.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 289 | `const existingRelation = await db.itemSupplier.findFirst({` | db.itemSupplier.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/suppliers/itemSupplierActions.ts` | 301 | `const itemSupplier = await db.itemSupplier.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 344 | `const existingRelation = await db.itemSupplier.findFirst({` | db.itemSupplier.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/suppliers/itemSupplierActions.ts` | 356 | `const itemSupplier = await db.itemSupplier.delete({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 374 | `const itemSuppliers = await db.itemSupplier.findMany({` | db.itemSupplier.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 431 | `const itemSuppliers = await db.itemSupplier.findMany({` | db.itemSupplier.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/suppliers/supplier-management-actions.ts` | 4 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/taxRate/tax-rate-management-actions.ts` | 5 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/taxRate/tax-rate-management-actions.ts` | 6 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/taxRate/tax-rate-management-actions.ts` | 110 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/taxRate/tax-rate-management-actions.ts` | 138 | `const organization = await db.organization.findFirst({` | db.organization.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/units/unit-management-actions.ts` | 5 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/units/unit-management-actions.ts` | 6 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/units/unit-management-actions.ts` | 113 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/units/unit-management-actions.ts` | 141 | `const organization = await db.organization.findFirst({` | db.organization.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/createInvitedUser.ts` | 2 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/users/createInvitedUser.ts` | 8 | `import { InviteStatus } from "@prisma/client";` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createInvitedUser.ts` | 33 | `const invite = await tx.invite.findUnique({` | tx.invite.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 49 | `await tx.invite.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createInvitedUser.ts` | 69 | `const existingUser = await tx.user.findFirst({` | tx.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 97 | `const newUser = await tx.user.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 120 | `await tx.passwordHistory.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 132 | `await tx.invite.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/createUser.ts` | 13 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/users/createUser.ts` | 15 | `import { Locale as PrismaLocale } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 47 | `while (await tx.organization.findUnique({ where: { slug: candidate } })) {` | tx.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 76 | `const existingUserByEmail = await tx.user.findUnique({` | tx.user.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 88 | `const existingUserByPhone = await tx.user.findUnique({` | tx.user.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 103 | `const org = await tx.organization.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 121 | `let defaultRole = await tx.role.findFirst({` | tx.role.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 130 | `defaultRole = await tx.role.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 148 | `const newUser = await tx.user.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 174 | `await tx.passwordHistory.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/deleteUser.ts` | 7 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/deleteUser.ts` | 34 | `const user= await tx.user.findFirst({` | tx.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/deleteUser.ts` | 46 | `await tx.invite.deleteMany({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/deleteUser.ts` | 50 | `const deletedUser=  await tx.user.delete({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/getOrgInvites.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/getOrgInvites.ts` | 45 | `const organizationInvites = await db.invite.findMany({` | db.invite.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/getOrgUsers.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/getOrgUsers.ts` | 40 | `const organizationUsers = await db.user.findMany({` | db.user.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/getUserById.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/getUserById.ts` | 42 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/sendInvite.ts` | 8 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/users/sendInvite.ts` | 9 | `import { InviteStatus } from "@prisma/client";` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendInvite.ts` | 35 | `const role = await tx.role.findFirst({` | tx.role.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendInvite.ts` | 49 | `const existingUserByEmail = await tx.user.findFirst({` | tx.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendInvite.ts` | 62 | `const existingInvite = await tx.invite.findUnique({` | tx.invite.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/sendInvite.ts` | 82 | `await tx.invite.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/sendInvite.ts` | 92 | `await tx.invite.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/sendResetLink.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendResetLink.ts` | 21 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/sendResetLink.ts` | 31 | `await db.user.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/updateUserPassword.ts` | 11 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/updateUserPassword.ts` | 22 | `const existingUser = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/updateUserPassword.ts` | 78 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/updateUserPassword.ts` | 115 | `await tx.user.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/verifyOtp.ts` | 3 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/verifyOtp.ts` | 10 | `const user= await db.user.findUnique({` | db.user.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/verifyOtp.ts` | 24 | `await db.user.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 7 | high | DIRECT_PRISMA_DB_IMPORT | `app/[locale]/(auth)/user-invite/[organisationId]/page.tsx` | 3 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 7 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `app/[locale]/(auth)/user-invite/[organisationId]/page.tsx` | 4 | `import { InviteStatus } from "@prisma/client";` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 7 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `app/[locale]/(auth)/user-invite/[organisationId]/page.tsx` | 15 | `? await db.invite.findUnique({` | db.invite.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 7 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `app/[locale]/(dashboard)/dashboard/settings/roles/columns.tsx` | 11 | `import { Role } from "@prisma/client";` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |

## Migration Order

1. Migrate item, item detail, and inventory actions into service-owned workflows.
2. Move App Router and API direct Prisma access behind protected service/read-model methods.
3. Consolidate purchasing/AP call sites on the statutory purchasing service boundary.
4. Replace hook-level persistence/type coupling with service-backed action/query DTOs.
5. Replace component-level Prisma client coupling with UI DTOs.
6. Migrate remaining action-owned mutations domain by domain.
7. Turn this gate to fail mode after active violations reach zero or a reviewed baseline is introduced.

## Enforcement Ladder

- `report`: inventory current violations without blocking development.
- `warn`: keep exit code 0 while surfacing the boundary breach in CI logs.
- `fail`: exit non-zero when any active violation remains.

