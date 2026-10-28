# AqStoqFlow Service Boundary Gate Report

Generated: 2026-06-18T09:39:54.366Z

Root: `E:\ohada saas\newStockFlow\aqstoqflow`
Mode: `report`
Scan directories: `app`, `actions`, `components`, `hooks`

## Summary

- Active service-boundary violations: 127
- Allowed test/mock/service findings: 4
- Total callsites scanned: 131

## Active Counts

- ACTION_OWNED_MUTATION: 32
- DIRECT_PRISMA_CALL_OUTSIDE_SERVICE: 50
- DIRECT_PRISMA_DB_IMPORT: 23
- PRISMA_CLIENT_BOUNDARY_COUPLING: 22

## Active Violations

| Order | Severity | Classification | File | Line | Evidence | Reason |
| ---: | --- | --- | --- | ---: | --- | --- |
| 5 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/dashboard/Tables/Invites.tsx` | 6 | `import type { InviteStatus } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 5 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/Forms/RoleForm.tsx` | 9 | `import { Role } from "@prisma/client";` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 5 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/locations/LocationsManagementDashboard.tsx` | 15 | `import type { LocationType } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 5 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/tax-rates/TaxRatesManagementDashboard.tsx` | 13 | `import type { TaxType } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 5 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `components/units/UnitsManagementDashboard.tsx` | 5 | `import type { UnitType } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/auth.ts` | 4 | `import { Locale as PrismaLocale } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/auth.ts` | 42 | `while (await tx.organization.findUnique({ where: { slug: candidate } })) {` | tx.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/auth.ts` | 76 | `const existingUser = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/auth.ts` | 87 | `const existingPhone = await db.user.findUnique({` | db.user.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 121 | `const organization = await tx.organization.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 139 | `const adminRole = await tx.role.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 155 | `const user = await tx.user.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 175 | `await tx.user.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/auth.ts` | 184 | `await tx.passwordHistory.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/customers/customer-management-actions.ts` | 4 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/customers/customerAction2.ts` | 7 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/customers/customerAction2.ts` | 16 | `import type { Customer as PrismaCustomer, Payment } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 76 | `const customerCount = await db.customer.count({` | db.customer.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 86 | `const customers = await db.customer.findMany({` | db.customer.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 130 | `const customer = await db.customer.findFirst({` | db.customer.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/customers/customerAction2.ts` | 149 | `const customer = await db.customer.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/customers/customerAction2.ts` | 181 | `const updated = await db.customer.updateMany({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 206 | `const customer = await db.customer.findFirst({` | db.customer.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/customers/customerAction2.ts` | 228 | `const orders = await db.salesOrder.findMany({` | db.salesOrder.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/customers/customerAction2.ts` | 286 | `await db.customer.updateMany({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/item-suppliers/addItemSuppliers.ts` | 3 | `import { db } from '@/prisma/db';` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/item-suppliers/addItemSuppliers.ts` | 15 | `await db.itemSupplier.createMany({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/item-suppliers/getItemWithSuppliers.ts` | 4 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/item-suppliers/getItemWithSuppliers.ts` | 32 | `const item = await db.item.findUnique({` | db.item.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/locations/location-management-actions.ts` | 5 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/locations/location-management-actions.ts` | 6 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/locations/location-management-actions.ts` | 99 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/locations/location-management-actions.ts` | 127 | `const organization = await db.organization.findFirst({` | db.organization.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/locations/updateLocationById.ts` | 4 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/locations/updateLocationById.ts` | 13 | `const location = await tx.location.findUnique({` | tx.location.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/locations/updateLocationById.ts` | 20 | `const updatedLocation = await tx.location.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/organization/organization-settings-actions.ts` | 5 | `import { db } from '@/prisma/db'` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/organization/organization-settings-actions.ts` | 9 | `import { Locale as PrismaLocale, PaymentStatus } from '@prisma/client'` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 116 | `while (await db.organization.findUnique({ where: { slug }, select: { id: true } })) {` | db.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 133 | `const organization = await db.organization.findUnique({` | db.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 179 | `const organizations = await db.organization.findMany({` | db.organization.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/organization/organization-settings-actions.ts` | 215 | `? await db.payment.groupBy({` | db.payment.groupBy bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 293 | `const createdOrganization = await tx.organization.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 310 | `await tx.role.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 394 | `const organization = await db.organization.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 424 | `const organization = await db.organization.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 454 | `const organization = await db.organization.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 484 | `const organization = await db.organization.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/organization/organization-settings-actions.ts` | 514 | `const organization = await db.organization.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/payments/reconciliation.actions.ts` | 3 | `import { SuspenseType } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/pos/terminal-management.actions.ts` | 4 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/getOrgRoles.ts` | 5 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/getOrgRoles.ts` | 15 | `const orgRoles = await db.role.findMany({` | db.role.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/roles/getRoleById.ts` | 3 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/roles/getRoleById.ts` | 13 | `const role = await db.role.findFirst({` | db.role.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/storage/storage-config-actions.ts` | 4 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/storage/storage-config-actions.ts` | 177 | `const organizationExists = await db.organization.findUnique({` | db.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/suppliers/getOrgSuppliers.ts` | 3 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/suppliers/getOrgSuppliers.ts` | 6 | `import type { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/getOrgSuppliers.ts` | 63 | `db.supplier.findMany({` | db.supplier.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/getOrgSuppliers.ts` | 90 | `db.supplier.count({ where }),` | db.supplier.count bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/suppliers/itemSupplierActions.ts` | 4 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/suppliers/itemSupplierActions.ts` | 9 | `import type { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 113 | `const itemSuppliers = await db.itemSupplier.findMany({` | db.itemSupplier.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 169 | `const itemSupplier = await db.itemSupplier.findFirst({` | db.itemSupplier.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 228 | `const existingRelation = await db.itemSupplier.findFirst({` | db.itemSupplier.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 241 | `db.item.findFirst({` | db.item.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 245 | `db.supplier.findFirst({` | db.supplier.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/suppliers/itemSupplierActions.ts` | 255 | `const itemSupplier = await db.itemSupplier.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 306 | `const existingRelation = await db.itemSupplier.findFirst({` | db.itemSupplier.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/suppliers/itemSupplierActions.ts` | 318 | `const itemSupplier = await db.itemSupplier.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 394 | `const itemSuppliers = await db.itemSupplier.findMany({` | db.itemSupplier.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/suppliers/itemSupplierActions.ts` | 455 | `const itemSuppliers = await db.itemSupplier.findMany({` | db.itemSupplier.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/suppliers/supplier-management-actions.ts` | 4 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/taxRate/tax-rate-management-actions.ts` | 5 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/taxRate/tax-rate-management-actions.ts` | 6 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/taxRate/tax-rate-management-actions.ts` | 112 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/taxRate/tax-rate-management-actions.ts` | 140 | `const organization = await db.organization.findFirst({` | db.organization.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/units/unit-management-actions.ts` | 5 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/units/unit-management-actions.ts` | 6 | `import { Prisma } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/units/unit-management-actions.ts` | 115 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/units/unit-management-actions.ts` | 143 | `const organization = await db.organization.findFirst({` | db.organization.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/createInvitedUser.ts` | 3 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/users/createInvitedUser.ts` | 9 | `import { InviteStatus } from "@prisma/client";` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createInvitedUser.ts` | 34 | `const invite = await tx.invite.findUnique({` | tx.invite.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 50 | `await tx.invite.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createInvitedUser.ts` | 70 | `const existingUser = await tx.user.findFirst({` | tx.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 98 | `const newUser = await tx.user.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 121 | `await tx.passwordHistory.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createInvitedUser.ts` | 133 | `await tx.invite.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/createUser.ts` | 17 | `import { db } from "@/prisma/db"` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/users/createUser.ts` | 19 | `import { Locale as PrismaLocale } from "@prisma/client"` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 51 | `while (await tx.organization.findUnique({ where: { slug: candidate } })) {` | tx.organization.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 80 | `const existingUserByEmail = await tx.user.findUnique({` | tx.user.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 92 | `const existingUserByPhone = await tx.user.findUnique({` | tx.user.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 107 | `const org = await tx.organization.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/createUser.ts` | 125 | `let defaultRole = await tx.role.findFirst({` | tx.role.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 134 | `defaultRole = await tx.role.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 152 | `const newUser = await tx.user.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/createUser.ts` | 178 | `await tx.passwordHistory.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/getOrgInvites.ts` | 6 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/getOrgInvites.ts` | 46 | `const organizationInvites = await db.invite.findMany({` | db.invite.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/getOrgUsers.ts` | 6 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/getOrgUsers.ts` | 41 | `const organizationUsers = await db.user.findMany({` | db.user.findMany bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/getUserById.ts` | 6 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/getUserById.ts` | 43 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/sendInvite.ts` | 9 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | medium | PRISMA_CLIENT_BOUNDARY_COUPLING | `actions/users/sendInvite.ts` | 11 | `import { InviteStatus } from "@prisma/client";` | UI/action boundaries should consume service DTOs instead of coupling directly to Prisma client types. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendInvite.ts` | 37 | `const role = await tx.role.findFirst({` | tx.role.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendInvite.ts` | 51 | `const existingUserByEmail = await tx.user.findFirst({` | tx.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendInvite.ts` | 64 | `const existingInvite = await tx.invite.findUnique({` | tx.invite.findUnique bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/sendInvite.ts` | 84 | `await tx.invite.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/sendInvite.ts` | 94 | `await tx.invite.create({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/sendResetLink.ts` | 6 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/sendResetLink.ts` | 22 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/sendResetLink.ts` | 32 | `await db.user.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
| 6 | high | DIRECT_PRISMA_DB_IMPORT | `actions/users/updateUserPassword.ts` | 15 | `import { db } from "@/prisma/db";` | DB clients must be owned by service modules, not App Router, actions, hooks, or components. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/updateUserPassword.ts` | 26 | `const existingUser = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | DIRECT_PRISMA_CALL_OUTSIDE_SERVICE | `actions/users/updateUserPassword.ts` | 85 | `const user = await db.user.findFirst({` | db.user.findFirst bypasses the service-owned tenant/RBAC/audit boundary. |
| 6 | high | ACTION_OWNED_MUTATION | `actions/users/updateUserPassword.ts` | 122 | `await tx.user.update({` | Server actions must validate and orchestrate only; protected mutations belong in services. |
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

