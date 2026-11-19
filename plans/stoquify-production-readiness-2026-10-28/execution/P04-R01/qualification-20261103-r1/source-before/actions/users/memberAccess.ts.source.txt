"use server"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getMemberAccess } from "@/services/users/member-access-read.service"
import { changeMemberAccess } from "@/services/users/member-access.service"
import type { MemberAccessCommand } from "@/services/users/member-access-input"

export async function getMemberAccessAction(id: string) {
  try {
    const ctx = await requirePermission("users.read", { resource: "User", resourceId: id })
    await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/users/memberAccess.ts#getMemberAccessAction", accessIntent: "read", mode: "observe" })
    return { success: true as const, data: await getMemberAccess({ organizationId: ctx.orgId, actorId: ctx.userId, targetUserId: id }), error: null }
  } catch (error) { return safeSuccessActionErrorResult(error, { action: "users.access.read", component: "User" }, "Member access could not be loaded.") }
}

export async function changeMemberAccessAction(id: string, command: MemberAccessCommand) {
  try {
    const verified = await requireFreshAuth(300)
    const ctx = await requirePermission("users.read", { resource: "User", resourceId: id })
    if (verified.claims.userId !== ctx.userId || verified.claims.tenantId !== ctx.orgId) throw new ForbiddenError("Your organization session changed.")
    await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/users/memberAccess.ts#changeMemberAccessAction", accessIntent: "write", mode: "observe" })
    const data = await changeMemberAccess({ organizationId: ctx.orgId, actorId: ctx.userId, targetUserId: id, command, session: { id: verified.claims.sessionId, token: verified.claims.sessionToken } })
    return { success: true as const, data, error: null }
  } catch (error) { return safeSuccessActionErrorResult(error, { action: "users.access.change", component: "User" }, "Member access could not be changed.") }
}
