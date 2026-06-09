"use server";

import { db } from "@/prisma/db";
import { withDisplayRoleName } from "./role-utils";
import { requireRoleAction, ROLE_ACTION_PERMISSIONS } from "./role-auth";


export async function getRoleById(id: string) {
  try {
    const { orgId } = await requireRoleAction(ROLE_ACTION_PERMISSIONS.read)
    const role = await db.role.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!role) {
      throw new Error("Role not found");
    }

    return { success: true, data: withDisplayRoleName(role) };
  } catch (error) {
    console.error("Error fetching role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch role",
    };
  }
}
