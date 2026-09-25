"use server";

import { requireFreshAuth } from "@/lib/security/auth-session";
import { requirePermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { createOrganizationRole } from "@/services/roles/role.service";
import { RoleFormData } from "@/types/types";
import { revalidatePath } from "next/cache";
import { safeSuccessActionErrorResult } from "../_shared/safe-action-responses";
import { roleWriteContext } from "./role-auth";
import type { RoleCommand } from "@/services/roles/role-command";

const createRole = async (data: RoleFormData, command?: RoleCommand) => {
  try {
    const verified = await requireFreshAuth(300);
    const ctx = await requirePermission("roles.create", {
      resource: "Role",
      auditAllowed: true,
    });

    await observeModuleAccess({
      moduleSlug: "settings",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/roles/createRole.ts",
      accessIntent: "write",
      mode: "observe",
    });

    const role = await createOrganizationRole({ ctx: roleWriteContext(ctx, verified.claims), data, command });

    revalidatePath("/[locale]/dashboard/settings/roles", "page");
    return { success: true as const, data: role, error: null };
  } catch (error) {
    return safeSuccessActionErrorResult(error, {
      action: "roles.create",
      component: "Role",
    }, "Failed to create role");
  }
};

export default createRole;
