"use server";

import { getOrganizationRoleById } from "@/services/roles/role.service";
import { safeSuccessActionErrorResult } from "../_shared/safe-action-responses";
import { requireRoleAction, ROLE_ACTION_PERMISSIONS } from "./role-auth";


export async function getRoleById(id: string) {
  try {
    const ctx = await requireRoleAction(ROLE_ACTION_PERMISSIONS.read)
    const role = await getOrganizationRoleById({ ctx, id });
    return { success: true as const, data: role, error: null };
  } catch (error) {
    return safeSuccessActionErrorResult(error, {
      action: "roles.read",
      component: "Role",
    }, "Failed to fetch role");
  }
}
