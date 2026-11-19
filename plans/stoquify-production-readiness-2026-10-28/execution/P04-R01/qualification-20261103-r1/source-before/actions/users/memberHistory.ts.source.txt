"use server"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { requireAllPermissions } from "@/lib/security/rbac"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getMemberHistory, exportMemberHistory } from "@/services/users/member-history.service"
import type { MemberHistoryInput, MemberHistoryExportInput } from "@/services/users/member-history-input"

export async function getMemberHistoryAction(id: string, page: MemberHistoryInput = {}) {
  try {
    const ctx = await requireAllPermissions(["users.read", "controls.audit.read"], { resource: "User", resourceId: id })
    await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/users/memberHistory.ts#getMemberHistoryAction", accessIntent: "read", mode: "observe" })
    return { success: true as const, data: await getMemberHistory({ organizationId: ctx.orgId, actorId: ctx.userId, targetUserId: id }, page), error: null }
  } catch (error) { return safeSuccessActionErrorResult(error, { action: "users.history.read", component: "User" }, "Member history could not be loaded.") }
}

export async function exportMemberHistoryAction(id: string, input: MemberHistoryExportInput) {
  try {
    const fresh = await requireFreshAuth(300)
    const ctx = await requireAllPermissions(["users.read", "controls.audit.read", "reports.export"], { resource: "User", resourceId: id })
    if (fresh.claims.userId !== ctx.userId || fresh.claims.tenantId !== ctx.orgId) throw new ForbiddenError()
    await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface: "actions/users/memberHistory.ts#exportMemberHistoryAction", accessIntent: "read", mode: "observe" })
    return { success: true as const, data: await exportMemberHistory({ organizationId: ctx.orgId, actorId: ctx.userId, targetUserId: id }, input, { id: fresh.claims.sessionId, token: fresh.claims.sessionToken }), error: null }
  } catch (error) { return safeSuccessActionErrorResult(error, { action: "users.history.export", component: "User" }, "Member history could not be exported.") }
}
