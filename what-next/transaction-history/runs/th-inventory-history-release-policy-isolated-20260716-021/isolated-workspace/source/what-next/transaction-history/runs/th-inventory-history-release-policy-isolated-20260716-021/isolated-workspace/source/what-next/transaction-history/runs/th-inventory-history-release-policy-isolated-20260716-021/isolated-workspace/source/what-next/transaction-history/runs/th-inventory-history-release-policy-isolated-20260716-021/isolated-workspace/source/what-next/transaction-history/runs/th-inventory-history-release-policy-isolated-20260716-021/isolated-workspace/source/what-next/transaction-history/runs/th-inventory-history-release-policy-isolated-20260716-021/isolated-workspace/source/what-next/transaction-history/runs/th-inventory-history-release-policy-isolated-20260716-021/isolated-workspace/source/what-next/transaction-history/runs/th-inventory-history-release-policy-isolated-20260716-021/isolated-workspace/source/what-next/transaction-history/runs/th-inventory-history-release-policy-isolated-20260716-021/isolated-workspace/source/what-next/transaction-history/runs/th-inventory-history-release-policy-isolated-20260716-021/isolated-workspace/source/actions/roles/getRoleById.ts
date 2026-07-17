"use server";

import { requirePermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { getOrganizationRoleById } from "@/services/roles/role.service";
import { safeSuccessActionErrorResult } from "../_shared/safe-action-responses";

export async function getRoleById(id: string) {
  try {
    const ctx = await requirePermission("roles.read", { resource: "Role", resourceId: id });

    await observeModuleAccess({
      moduleSlug: "settings",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/roles/getRoleById.ts",
      accessIntent: "read",
      mode: "observe",
    });

    const role = await getOrganizationRoleById({ ctx, id });
    return { success: true as const, data: role, error: null };
  } catch (error) {
    return safeSuccessActionErrorResult(error, {
      action: "roles.read",
      component: "Role",
    }, "Failed to fetch role");
  }
}
