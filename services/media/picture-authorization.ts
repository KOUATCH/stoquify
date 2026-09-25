import { assertCanUseOrganization, auditRbacDecision, requireAnyPermission, type RbacContext } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { ForbiddenError } from "@/services/_shared/action-errors"

export async function requireInventoryPhotoWrite(organizationId: string, surface: string, surfaceType: "action" | "api" = "action"): Promise<RbacContext> {
  const ctx = await requireAnyPermission(["inventory.items.create", "inventory.items.update"], { resource: "InventoryItemPhoto" })
  await assertCanUseOrganization(ctx, organizationId)
  const access = await observeModuleAccess({
    moduleSlug: "inventory", organizationId: ctx.orgId, userId: ctx.userId,
    actorPermissions: ctx.permissions, surfaceType, surface, accessIntent: "write", mode: "enforce",
  })
  if (!access.allowed) throw new ForbiddenError()
  await auditRbacDecision({
    ctx, permission: "inventory.items.create|inventory.items.update", result: "allowed",
    risk: "high", resource: "InventoryItemPhoto", reason: "Inventory item media write authorized",
  })
  return ctx
}
