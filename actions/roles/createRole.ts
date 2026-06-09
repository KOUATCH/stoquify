"use server";

import { getAllPermissions } from "@/config/permissions";
import { createRoleName } from "@/lib/createRoleName";
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log";
import { db } from "@/prisma/db";
import { RoleFormData } from "@/types/types";
import { revalidatePath } from "next/cache";
import { assertCanAssignPermissions, requireRoleAction, ROLE_ACTION_PERMISSIONS } from "./role-auth";
import { withDisplayRoleName } from "./role-utils";

const  createRole=async(data: RoleFormData)=> {
  try {
    const ctx = await requireRoleAction(ROLE_ACTION_PERMISSIONS.create)
    assertCanAssignPermissions(ctx, data.permissions)

    // Validate permissions
    const validPermissions = getAllPermissions();
    const invalidPermissions = data.permissions.filter(
      (permission) => !validPermissions.includes(permission)
    );

    if (invalidPermissions.length > 0) {
      throw new Error(
        `Invalid permissions detected: ${invalidPermissions.join(", ")}`
      );
    }

    // Check if role with same name exists in the organization
    const existingRole = await db.role.findFirst({
      where: {
        nameEn: data.name,
        organizationId:ctx.orgId
      },
    });

    if (existingRole) {
      throw new Error("A role with this name already exists");
    }

    // Create role with permissions
    const role = await db.role.create({
      data: {
        code: createRoleName(data.name),
        nameEn: data.name,
        description: data.description,
        permissions: data.permissions,
        organizationId:ctx.orgId

      },
    });

    await logSecurityEvent({
      type: SecurityEventType.ROLE_CHANGED,
      userId: ctx.userId,
      organizationId: ctx.orgId,
      resource: role.id,
      details: {
        action: "role.create",
        roleCode: role.code,
        permissions: role.permissions,
      },
    })

    revalidatePath("/dashboard/settings/roles");
    return { success: true, data: withDisplayRoleName(role) };
  } catch (error) {
    console.error("Error creating role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create role",
    };
  }
}
export default createRole
