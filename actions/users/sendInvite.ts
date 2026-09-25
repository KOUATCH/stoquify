"use server";

import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { invitationIssueInput } from "@/services/users/invitation-input";
import { requireFreshAuth } from "@/lib/security/auth-session";
import { requireAllPermissions } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { INVITATION_ROLE_GRANT_PERMISSIONS } from "@/services/security/role-grant-policy.service";
import { sendInviteWorkflow } from "@/services/users/user-identity.service";

export const sendInvite = async (data: unknown) => {
  try {
    await requireFreshAuth(300);
    const ctx = await requireAllPermissions(INVITATION_ROLE_GRANT_PERMISSIONS, {
      resource: "UserInvite",
    });

    const parsed = invitationIssueInput.safeParse(data);
    if (!parsed.success) {
      return { status: 400, error: "Enter a valid email and select a role", data: null, code: "INVITATION_INPUT_INVALID" };
    }

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
      email: parsed.data.email,
      roleId: parsed.data.roleId,
      ...(parsed.data.requestId ? { requestId: parsed.data.requestId } : {}),
      ...(parsed.data.locale ? { locale: parsed.data.locale } : {}),
      ...(parsed.data.replace ? { replace: parsed.data.replace } : {}),
      actorPermissions: ctx.permissions,
    });
  } catch (error) {
    return safeStatusActionErrorResult(error, {
      action: "users.invite",
      component: "User",
    }, "Something went wrong, Please try again");
  }
};
