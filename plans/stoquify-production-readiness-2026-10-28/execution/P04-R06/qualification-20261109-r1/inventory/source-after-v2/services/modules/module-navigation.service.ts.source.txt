import "server-only"
import { db } from "@/prisma/db"
import type { ModuleNavigationSnapshot } from "@/lib/modules/navigation"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getModuleCatalog } from "./module-catalog.service"
import { evaluateModuleEntitlement, getManagedModuleState } from "./module-entitlement.service"

export async function getModuleNavigationSnapshot(organizationId: string): Promise<ModuleNavigationSnapshot> {
  const organization = await db.organization.findFirst({ where: { id: organizationId, isActive: true, deletedAt: null }, select: { requestedModules: true } })
  if (!organization) throw new NotFoundError("Active organization not found")
  const managed = await getManagedModuleState(organizationId)
  const catalog = getModuleCatalog()
  const now = new Date()
  const visibleModules = catalog.filter((module) => {
    if (managed.configuration && !managed.configuration.activeModules.includes(module.slug)) return false
    return evaluateModuleEntitlement({ organizationId, moduleSlug: module.slug, requestedModules: organization.requestedModules,
      explicitEntitlements: managed.explicitEntitlements, surfaceType: "navigation", surface: "dashboard-shell", accessIntent: "read", mode: "enforce", now }).allowed
  }).map((module) => module.slug)
  return { visibleModules, routes: catalog.flatMap((module) => module.routePrefixes.map((prefix) => ({ prefix, moduleSlug: module.slug }))) }
}
