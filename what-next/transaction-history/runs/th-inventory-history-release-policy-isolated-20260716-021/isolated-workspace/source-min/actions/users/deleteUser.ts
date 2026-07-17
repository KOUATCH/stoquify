"use server";

import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { requireFreshAuth } from "@/lib/security/auth-session";
import { requirePermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { deactivateUserForOrganization } from "@/services/users/user-lifecycle.service";

export async function deleteUser(id: string) {
  try {
    await requireFreshAuth(300);
    const ctx = await requirePermission("users.delete", {
      resource: "User",
      resourceId: id,
      auditAllowed: true,
    });

    if (id === ctx.userId) {
      return {
        error: "You cannot delete your own account",
        status: 400,
        data: null,
      };
    }

    await observeModuleAccess({
      moduleSlug: "settings",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/users/deleteUser.ts",
      accessIntent: "write",
      mode: "observe",
    });

    const deactivatedUser = await deactivateUserForOrganization({
      organizationId: ctx.orgId,
      targetUserId: id,
      actorId: ctx.userId,
    });

    return {
      ok: true,
      data: deactivatedUser,
    };
  } catch (error) {
    return safeStatusActionErrorResult(error, {
      action: "users.delete",
      component: "User",
    }, "Something went wrong, Please try again");
  }
}
