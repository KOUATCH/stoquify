"use server"
import { requireAllPermissions } from "@/lib/security/rbac"
import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { INVITATION_HISTORY_PERMISSIONS, readUserInvitationHistory } from "@/services/users/user-invitation-history.service"

export async function getInvitationHistory(request: unknown) {
  try {
    const ctx = await requireAllPermissions(INVITATION_HISTORY_PERMISSIONS, { resource: "UserInvite" })
    await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/users/getInvitationHistory.ts", accessIntent: "read", mode: "observe" })
    return await readUserInvitationHistory({ actorId: ctx.userId, organizationId: ctx.orgId, actorPermissions: ctx.permissions, request })
  } catch (error) { return safeStatusActionErrorResult(error, { action: "users.invite", component: "User" }) }
}
