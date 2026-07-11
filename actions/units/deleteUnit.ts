"use server"

import { revalidatePath } from "next/cache"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { removeUnitForManagement } from "@/services/unit/unit.service"

export const deleteUnit = async (id: string) => {
  try {
    const ctx = await requirePermission("inventory.units.delete", {
      resource: "Unit",
      resourceId: id,
      auditAllowed: true,
    })
    await observeModuleAccess({
      moduleSlug: "inventory",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/units/deleteUnit.ts",
      accessIntent: "write",
      mode: "observe",
    })

    const result = await removeUnitForManagement(ctx.orgId, id)

    revalidatePath("/dashboard/inventory/units")
    revalidatePath("/[locale]/dashboard/inventory/units", "page")

    return {
      success: true,
      error: null,
      data: result,
    }
  } catch (error) {
    return safeSuccessActionErrorResult(error, { action: "deleteUnit" }, "Something went wrong, please try again")
  }
}

export default deleteUnit
