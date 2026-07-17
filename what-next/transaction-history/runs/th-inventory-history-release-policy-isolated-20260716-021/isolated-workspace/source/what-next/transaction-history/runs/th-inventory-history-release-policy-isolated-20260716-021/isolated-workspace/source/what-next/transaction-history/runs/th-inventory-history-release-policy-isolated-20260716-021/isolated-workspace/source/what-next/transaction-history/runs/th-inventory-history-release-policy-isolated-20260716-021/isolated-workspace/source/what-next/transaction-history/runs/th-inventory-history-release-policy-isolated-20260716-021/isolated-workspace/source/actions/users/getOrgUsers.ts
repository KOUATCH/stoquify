"use server";

import { logSafeActionWarning } from "@/actions/_shared/safe-action-responses";
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { listOrganizationUsers } from "@/services/users/user-identity.service";

const getOrgUsers = async (organizationId?: string | null) => {
  try {
    const ctx = await requirePermission("users.read", { resource: "User" });
    const requestedOrganizationId = organizationId?.trim() || ctx.orgId;

    await assertCanUseOrganization(ctx, requestedOrganizationId);
    await observeModuleAccess({
      moduleSlug: "settings",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/users/getOrgUsers.ts",
      accessIntent: "read",
      mode: "observe",
    });

    return await listOrganizationUsers(ctx.orgId);
  } catch (error) {
    logSafeActionWarning("Error fetching organization users", error, {
      action: "users.read",
      component: "User",
    });
    return [];
  }
};

export default getOrgUsers;
