"use server";

import { requirePermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { listOrganizationRoles } from "@/services/roles/role.service";
import { safeSuccessActionErrorResult } from "../_shared/safe-action-responses";

const getOrgRoles = async (orgId?: string | null) => {
  try {
    const ctx = await requirePermission("roles.read", { resource: "Role" });

    await observeModuleAccess({
      moduleSlug: "settings",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/roles/getOrgRoles.ts",
      accessIntent: "read",
      mode: "observe",
    });

    const orgRoles = await listOrganizationRoles({ ctx, organizationId: orgId });
    return { success: true as const, data: orgRoles, error: null };
  } catch (error) {
    return safeSuccessActionErrorResult(error, {
      action: "roles.read",
      component: "Role",
    }, "Failed to fetch org roles");
  }
};

export default getOrgRoles;
