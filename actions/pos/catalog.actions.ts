"use server"

import { err, ok } from "@/services/_shared/action-response"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { listPOSCustomers } from "@/services/pos/pos-customer.service"
import { listPOSCatalogItems, listPOSLocations, listPOSTerminals } from "@/services/pos/pos.service"
import { posCatalogSchema, posCustomerListSchema, posTerminalListSchema } from "@/services/pos/pos.schemas"

function optionalStringField(input: unknown, field: string) {
  if (!input || typeof input !== "object") return undefined
  const value = (input as Record<string, unknown>)[field]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

async function observePOSCatalogModuleAccess(input: {
  organizationId: string
  userId: string
  actorPermissions: readonly string[]
  surface: string
}) {
  await observeModuleAccess({
    organizationId: input.organizationId,
    userId: input.userId,
    actorPermissions: input.actorPermissions,
    moduleSlug: "pos",
    surfaceType: "action",
    surface: input.surface,
    accessIntent: "read",
    mode: "observe",
    audit: true,
  })
}

export async function getPOSLocationsAction() {
  try {
    const ctx = await requirePermission("pos.use", {
      resource: "POSCatalog",
    })
    await observePOSCatalogModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surface: "actions/pos/catalog.actions.ts:getPOSLocationsAction",
    })
    const locations = await listPOSLocations({ organizationId: ctx.orgId })
    return ok(locations)
  } catch (error) {
    return err(error)
  }
}

export async function getPOSTerminalsAction(input: unknown) {
  try {
    const ctx = await requirePermission("pos.use", {
      resource: "POSTerminal",
      resourceId: optionalStringField(input, "locationId"),
    })
    await observePOSCatalogModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surface: "actions/pos/catalog.actions.ts:getPOSTerminalsAction",
    })
    const parsed = posTerminalListSchema.parse(input)
    const terminals = await listPOSTerminals({ ...parsed, organizationId: ctx.orgId })
    return ok(terminals)
  } catch (error) {
    return err(error)
  }
}

export async function getPOSCatalogAction(input: unknown) {
  try {
    const ctx = await requirePermission("pos.use", {
      resource: "POSCatalog",
      resourceId: optionalStringField(input, "locationId"),
    })
    await observePOSCatalogModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surface: "actions/pos/catalog.actions.ts:getPOSCatalogAction",
    })
    const parsed = posCatalogSchema.parse(input)
    const catalog = await listPOSCatalogItems({ ...parsed, organizationId: ctx.orgId })
    return ok(catalog)
  } catch (error) {
    return err(error)
  }
}

export async function getPOSCustomersAction(input: unknown) {
  try {
    const ctx = await requirePermission("pos.use", {
      resource: "POSCustomer",
      resourceId: optionalStringField(input, "locationId"),
    })
    await observePOSCatalogModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surface: "actions/pos/catalog.actions.ts:getPOSCustomersAction",
    })
    const parsed = posCustomerListSchema.parse(input)
    const customers = await listPOSCustomers({ ...parsed, organizationId: ctx.orgId })
    return ok(customers)
  } catch (error) {
    return err(error)
  }
}
