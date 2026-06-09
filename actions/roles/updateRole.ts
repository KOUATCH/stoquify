"use server";

import { getAllPermissions } from "@/config/permissions";
import { createRoleName } from "@/lib/createRoleName";
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log";
import { db } from "@/prisma/db";
import { RoleFormData } from "@/types/types";
import { revalidatePath } from "next/cache";
import { assertCanAssignPermissions, requireRoleAction, ROLE_ACTION_PERMISSIONS } from "./role-auth";
import { withDisplayRoleName } from "./role-utils";

export async function updateRole(id: string, data: Partial<RoleFormData>) {
  try {
    const ctx = await requireRoleAction(ROLE_ACTION_PERMISSIONS.update)

    // Validate permissions if they're being updated
    if (data.permissions) {
      assertCanAssignPermissions(ctx, data.permissions)

      const validPermissions = getAllPermissions();
      const invalidPermissions = data.permissions.filter(
        (permission) => !validPermissions.includes(permission)
      );

      if (invalidPermissions.length > 0) {
        throw new Error(
          `Invalid permissions detected: ${invalidPermissions.join(", ")}`
        );
      }
    }

    // Check if new name conflicts with existing role
    if (data.name) {
      const existingRole = await db.role.findFirst({
        where: {
          nameEn: data.name,
          organizationId: ctx.orgId,
          NOT: {
            id: id,
          },
        },
      });

      if (existingRole) {
        throw new Error("A role with this name already exists");
      }
    }

    const beforeRole = await db.role.findFirst({
      where: { id, organizationId: ctx.orgId },
    });

    if (!beforeRole) {
      throw new Error("Role not found");
    }

    // Update role only inside the caller's organization.
    const updated = await db.role.updateMany({
      where: { id, organizationId: ctx.orgId },
      data: {
        ...(data.name && {
          nameEn: data.name,
          code: createRoleName(data.name),
        }),
        ...(data.description && { description: data.description }),
        ...(data.permissions && { permissions: data.permissions }),
      },
    });

    if (updated.count === 0) {
      throw new Error("Role not found");
    }

    const role = await db.role.findFirst({
      where: { id, organizationId: ctx.orgId },
    });

    if (!role) {
      throw new Error("Role was updated but could not be reloaded");
    }

    revalidatePath("/dashboard/settings/roles");
    await logSecurityEvent({
      type: SecurityEventType.ROLE_CHANGED,
      userId: ctx.userId,
      organizationId: ctx.orgId,
      resource: role.id,
      details: {
        action: "role.update",
        before: {
          code: beforeRole.code,
          nameEn: beforeRole.nameEn,
          permissions: beforeRole.permissions,
        },
        after: {
          code: role.code,
          nameEn: role.nameEn,
          permissions: role.permissions,
        },
      },
    })
    return { success: true, data: withDisplayRoleName(role) };
  } catch (error) {
    console.error("Error updating role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update role",
    };
  }
}
