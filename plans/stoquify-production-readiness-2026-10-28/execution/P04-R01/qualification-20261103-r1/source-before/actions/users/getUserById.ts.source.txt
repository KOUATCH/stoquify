"use server";

import { logSafeActionWarning } from "@/actions/_shared/safe-action-responses";
import { requirePermission, requireRbacContext } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { getOrganizationUserById } from "@/services/users/user-identity.service";

export async function getUserById(id: string) {
  try {
    let ctx = await requireRbacContext();

    if (id !== ctx.userId) {
      ctx = await requirePermission("users.read", { resource: "User", resourceId: id });
    }

    await observeModuleAccess({
      moduleSlug: "settings",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/users/getUserById.ts",
      accessIntent: "read",
      mode: "observe",
    });

    return await getOrganizationUserById({
      userId: id,
      organizationId: ctx.orgId,
    });
  } catch (error) {
    logSafeActionWarning("Error fetching user", error, {
      action: "users.read",
      component: "User",
    });
    return null;
  }
}
