"use server"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { requireAllPermissions } from "@/lib/security/rbac"
import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { INVITATION_ROLE_GRANT_PERMISSIONS } from "@/services/security/role-grant-policy.service"
import { cancelUserInvitation } from "@/services/users/user-invitation-management.service"

export async function cancelInvite(request: unknown) {
  try {
    await requireFreshAuth(300)
    const ctx = await requireAllPermissions(INVITATION_ROLE_GRANT_PERMISSIONS, { resource: "UserInvite" })
    await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/users/cancelInvite.ts", accessIntent: "write", mode: "observe" })
    return await cancelUserInvitation({ actorId: ctx.userId, organizationId: ctx.orgId, actorPermissions: ctx.permissions, request })
  } catch (error) { return safeStatusActionErrorResult(error, { action: "users.invite", component: "User" }) }
}
