"use server"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getRoleEditorForOrganization } from "@/services/roles/role-editor.service"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"

export async function getRoleEditor(id?: string) {
  try {
    const ctx = await requirePermission(id ? "roles.update" : "roles.create", { resource: "Role", resourceId: id })
    await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/roles/getRoleEditor.ts", accessIntent: "read", mode: "observe" })
    return { success: true as const, data: await getRoleEditorForOrganization(ctx, id), error: null }
  } catch (error) { return safeSuccessActionErrorResult(error, { action: "roles.editor", component: "Role" }, "The role editor could not be loaded.") }
}
