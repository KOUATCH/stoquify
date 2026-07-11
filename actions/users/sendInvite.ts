"use server";

import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { InviteData } from "@/components/Forms/users/userInvitationForm";
import { requireFreshAuth } from "@/lib/security/auth-session";
import { requirePermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { sendInviteWorkflow } from "@/services/users/user-identity.service";

export const sendInvite = async (data: InviteData) => {
  const email = data.email.trim().toLowerCase();
  const { roleId } = data;
  const roleName = data.name ?? data.roleName ?? "assigned";

  try {
    await requireFreshAuth(300);
    const ctx = await requirePermission("users.invite", {
      resource: "UserInvite",
      auditAllowed: true,
    });

    await observeModuleAccess({
      moduleSlug: "settings",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/users/sendInvite.ts",
      accessIntent: "write",
      mode: "observe",
    });

    return await sendInviteWorkflow({
      actor: ctx.user,
      email,
      roleId,
      roleName,
    });
  } catch (error) {
    return safeStatusActionErrorResult(error, {
      action: "users.invite",
      component: "User",
    }, "Something went wrong, Please try again");
  }
};
