"use server";

import { updateOrganizationRole } from "@/services/roles/role.service";
import { RoleFormData } from "@/types/types";
import { revalidatePath } from "next/cache";
import { safeSuccessActionErrorResult } from "../_shared/safe-action-responses";
import { assertCanAssignPermissions, requireRoleAction, ROLE_ACTION_PERMISSIONS } from "./role-auth";

export async function updateRole(id: string, data: Partial<RoleFormData>) {
  try {
    const ctx = await requireRoleAction(ROLE_ACTION_PERMISSIONS.update)

    if (data.permissions) {
      assertCanAssignPermissions(ctx, data.permissions)
    }

    const role = await updateOrganizationRole({ ctx, id, data })

    revalidatePath("/dashboard/settings/roles");
    return { success: true as const, data: role, error: null };
  } catch (error) {
    return safeSuccessActionErrorResult(error, {
      action: "roles.update",
      component: "Role",
    }, "Failed to update role");
  }
}
