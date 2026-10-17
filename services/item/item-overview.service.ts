import "server-only"

import { db } from "@/prisma/db"
import type { RbacContext } from "@/lib/security/rbac"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { resolveTenantWideOperatingAuthority } from "@/services/operating-access/operating-access-scope-contracts"

type Reader = Pick<RbacContext, "orgId" | "userId" | "permissions" | "roles" | "isSuperUser">

export type ItemOverview = {
  id: string
  nameEn: string
  nameFr: string | null
  sku: string
  unit: string | null
  status: "active" | "inactive" | "discontinued" | "archived"
  updatedAt: string
  stock: {
    state: "available" | "restricted" | "not_tracked" | "no_locations"
    hasMore: boolean
    after?: string
    nextCursor?: string
    locations: Array<{
      id: string
      name: string
      onHand: string | null
      available: string | null
      reserved: string | null
      updatedAt: string | null
    }>
  }
}

/** Internal read boundary. The page must also enforce inventory entitlement. */
export async function getItemOverview(ctx: Reader, itemId: string, after?: string): Promise<ItemOverview | null> {
  if (!ctx.orgId || !ctx.userId || !hasRbacPermission(ctx.permissions, "inventory.items.read")) {
    throw new ForbiddenError("Item read permission is required.")
  }
  const item = await db.item.findFirst({
    where: { id: itemId, organizationId: ctx.orgId },
    select: {
      id: true, nameEn: true, nameFr: true, sku: true, isActive: true,
      isDiscontinued: true, deletedAt: true, trackInventory: true, updatedAt: true,
      unit: { select: { symbol: true, organizationId: true } },
    },
  })
  if (!item) return null

  const result: ItemOverview = {
    id: item.id, nameEn: item.nameEn, nameFr: item.nameFr, sku: item.sku,
    unit: item.unit?.organizationId === ctx.orgId ? item.unit.symbol : null,
    status: item.deletedAt ? "archived" : item.isDiscontinued ? "discontinued" : item.isActive ? "active" : "inactive",
    updatedAt: item.updatedAt.toISOString(),
    stock: { state: "restricted", hasMore: false, locations: [] },
  }
  if (!item.trackInventory) {
    result.stock.state = "not_tracked"
    return result
  }
  if (!hasRbacPermission(ctx.permissions, "inventory.levels.read")) return result

  // Reuse the established operating authority: administrators see the tenant;
  // other readers see only active locations they manage. No caller-supplied scope.
  const tenantWide = resolveTenantWideOperatingAuthority({
    isSuperUser: ctx.isSuperUser, roleCodes: ctx.roles.map(role => role.code),
  })
  const locationScope = {
    organizationId: ctx.orgId, deletedAt: null, isActive: true,
    ...(!tenantWide ? { managerId: ctx.userId } : {}),
  }
  // Resolve the cursor through the same authority boundary as the page. A removed,
  // foreign or no-longer-authorized cursor safely restarts the current scope.
  const cursor = after && after.length <= 200 ? await db.location.findFirst({
    where: { ...locationScope, id: after }, select: { id: true, name: true },
  }) : null
  const locations = await db.location.findMany({
    where: {
      ...locationScope,
      ...(cursor ? { OR: [{ name: { gt: cursor.name } }, { name: cursor.name, id: { gt: cursor.id } }] } : {}),
    },
    select: {
      id: true, name: true,
      inventoryLevels: {
        where: { itemId, item: { organizationId: ctx.orgId } },
        select: { quantityOnHand: true, quantityAvailable: true, quantityReserved: true, updatedAt: true },
        take: 1,
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 101,
  })
  result.stock = {
    state: locations.length ? "available" : "no_locations",
    hasMore: locations.length > 100,
    ...(cursor ? { after: cursor.id } : {}),
    ...(locations.length > 100 ? { nextCursor: locations[99].id } : {}),
    locations: locations.slice(0, 100).map(location => {
      const level = location.inventoryLevels[0]
      return {
        id: location.id, name: location.name,
        onHand: level?.quantityOnHand.toString() ?? null,
        available: level?.quantityAvailable.toString() ?? null,
        reserved: level?.quantityReserved.toString() ?? null,
        updatedAt: level?.updatedAt.toISOString() ?? null,
      }
    }),
  }
  return result
}
