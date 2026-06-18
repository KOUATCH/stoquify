"use server";

import { createOrganizationRole } from "@/services/roles/role.service";
import { RoleFormData } from "@/types/types";
import { revalidatePath } from "next/cache";
import { safeSuccessActionErrorResult } from "../_shared/safe-action-responses";
import { assertCanAssignPermissions, requireRoleAction, ROLE_ACTION_PERMISSIONS } from "./role-auth";

const  createRole=async(data: RoleFormData)=> {
  try {
    const ctx = await requireRoleAction(ROLE_ACTION_PERMISSIONS.create)
    assertCanAssignPermissions(ctx, data.permissions)
    const role = await createOrganizationRole({ ctx, data })

    revalidatePath("/dashboard/settings/roles");
    return { success: true as const, data: role, error: null };
  } catch (error) {
    return safeSuccessActionErrorResult(error, {
      action: "roles.create",
      component: "Role",
    }, "Failed to create role");
  }
}
export default createRole
