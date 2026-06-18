

"use server";

import { listOrganizationRoles } from "@/services/roles/role.service";
import { safeSuccessActionErrorResult } from "../_shared/safe-action-responses";
import { requireRoleAction, ROLE_ACTION_PERMISSIONS } from "./role-auth";


const getOrgRoles=async(orgId?: string | null)=> {
  try {
    const ctx = await requireRoleAction(ROLE_ACTION_PERMISSIONS.read)
    const orgRoles = await listOrganizationRoles({ ctx, organizationId: orgId })
    return { success: true as const, data: orgRoles, error: null };
  } catch (error) {
    return safeSuccessActionErrorResult(error, {
      action: "roles.read",
      component: "Role",
    }, "Failed to fetch org roles");
  }
}
export default getOrgRoles 
