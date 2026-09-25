"use server"
import { z } from "zod"
import { safeSuccessActionErrorResult } from "@/actions/_shared/safe-action-responses"
import { assertCanUseOrganization, requireAllPermissions } from "@/lib/security/rbac"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { exportOrganizationDirectory, getOrganizationDirectoryExportPreview } from "@/services/organization/organization-directory-export.service"
import type { DirectoryExportInput, DirectoryPreviewInput } from "@/services/organization/organization-directory-input"

async function scopeFor(organizationId: string, surface: string) {
  const id = z.string().trim().min(1).max(200).parse(organizationId)
  const ctx = await requireAllPermissions(["system.organization.read", "reports.export"], { resource: "OrganizationDirectory", resourceId: id })
  await assertCanUseOrganization(ctx, id)
  await observeModuleAccess({ moduleSlug: "settings", organizationId: ctx.orgId, userId: ctx.userId, actorPermissions: ctx.permissions, surfaceType: "action", surface, accessIntent: "read", mode: "observe" })
  return { organizationId: ctx.orgId, actorId: ctx.userId }
}
export async function getOrganizationDirectoryExportPreviewAction(organizationId: string, input: DirectoryPreviewInput) {
  try { const scope = await scopeFor(organizationId, "actions/organization/organization-directory-export.actions.ts#getOrganizationDirectoryExportPreviewAction"); return { success: true as const, data: await getOrganizationDirectoryExportPreview(scope, input), error: null } }
  catch (error) { return safeSuccessActionErrorResult(error, { action: "organization.directory.export.preview" }, "The export preview is unavailable.") }
}
export async function exportOrganizationDirectoryAction(organizationId: string, input: DirectoryExportInput) {
  try {
    const scope = await scopeFor(organizationId, "actions/organization/organization-directory-export.actions.ts#exportOrganizationDirectoryAction"), fresh = await requireFreshAuth(300)
    if (fresh.claims.userId !== scope.actorId || fresh.claims.tenantId !== scope.organizationId) throw new ForbiddenError()
    return { success: true as const, data: await exportOrganizationDirectory(scope, input, { id: fresh.claims.sessionId, token: fresh.claims.sessionToken }), error: null }
  } catch (error) { return safeSuccessActionErrorResult(error, { action: "organization.directory.export" }, "The directory file could not be prepared.") }
}
