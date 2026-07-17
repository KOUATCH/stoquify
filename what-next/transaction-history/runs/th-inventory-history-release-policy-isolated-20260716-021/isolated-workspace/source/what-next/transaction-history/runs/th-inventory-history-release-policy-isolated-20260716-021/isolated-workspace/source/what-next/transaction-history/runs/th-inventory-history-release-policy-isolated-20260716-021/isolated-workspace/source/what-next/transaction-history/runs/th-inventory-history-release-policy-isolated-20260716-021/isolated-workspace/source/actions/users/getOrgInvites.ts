"use server";

import { logSafeActionWarning } from "@/actions/_shared/safe-action-responses";
import { assertCanUseOrganization, requireAnyPermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { listOrganizationInvites } from "@/services/users/user-identity.service";

export async function getOrgInvites(organizationId?: string | null) {
  try {
    const ctx = await requireAnyPermission(["users.invite", "users.read"], { resource: "UserInvite" });
    const requestedOrganizationId = organizationId?.trim() || ctx.orgId;

    await assertCanUseOrganization(ctx, requestedOrganizationId);
    await observeModuleAccess({
      moduleSlug: "settings",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/users/getOrgInvites.ts",
      accessIntent: "read",
      mode: "observe",
    });

    return await listOrganizationInvites(ctx.orgId);
  } catch (error) {
    logSafeActionWarning("Error fetching organization invites", error, {
      action: "users.invite",
      component: "User",
    });
    return [];
  }
}
