"use server";

import { requireFreshAuth } from "@/lib/security/auth-session";
import { requirePermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { updateOrganizationRole } from "@/services/roles/role.service";
import { RoleFormData } from "@/types/types";
import { revalidatePath } from "next/cache";
import { safeSuccessActionErrorResult } from "../_shared/safe-action-responses";
import { assertCanAssignPermissions } from "./role-auth";

export async function updateRole(id: string, data: Partial<RoleFormData>) {
  try {
    await requireFreshAuth(300);
    const ctx = await requirePermission("roles.update", {
      resource: "Role",
      resourceId: id,
      auditAllowed: true,
    });

    await observeModuleAccess({
      moduleSlug: "settings",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/roles/updateRole.ts",
      accessIntent: "write",
      mode: "observe",
    });

    if (data.permissions) {
      assertCanAssignPermissions(ctx, data.permissions);
    }

    const role = await updateOrganizationRole({ ctx, id, data });

    revalidatePath("/dashboard/settings/roles");
    return { success: true as const, data: role, error: null };
  } catch (error) {
    return safeSuccessActionErrorResult(error, {
      action: "roles.update",
      component: "Role",
    }, "Failed to update role");
  }
}
