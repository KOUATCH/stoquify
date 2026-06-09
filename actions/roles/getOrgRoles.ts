

"use server";

import { db } from "@/prisma/db";
import { withDisplayRoleName } from "./role-utils";
import { requireRoleAction, resolveRoleOrganization, ROLE_ACTION_PERMISSIONS } from "./role-auth";


const getOrgRoles=async(orgId?: string | null)=> {
  try {
    const ctx = await requireRoleAction(ROLE_ACTION_PERMISSIONS.read)
    const organizationId = await resolveRoleOrganization(ctx, orgId)
    const orgRoles = await db.role.findMany({
      where:{organizationId},
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, data: orgRoles.map(withDisplayRoleName) };
  } catch (error) {
    console.error("Error fetching org roles:", error);
    return {
      success: false,
      error: "Failed to fetch org roles",
    };
  }
}
export default getOrgRoles 
