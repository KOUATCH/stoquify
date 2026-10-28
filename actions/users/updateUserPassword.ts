"use server";

import {
  logSafeActionWarning,
  safeStatusActionErrorResult,
} from "@/actions/_shared/safe-action-responses";
import { PasswordProps } from "@/components/Forms/ChangePasswordForm";
import { requireFreshAuth } from "@/lib/security/auth-session";
import { getPublicIdentityRequestContext } from "@/lib/security/public-request-context";
import { requirePermission, requireRbacContext } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import {
  changeUserPasswordWorkflow,
  completePasswordResetWorkflow,
} from "@/services/users/user-identity.service";
import { revalidatePath } from "next/cache";

export async function updateUserPassword(id: string, data: PasswordProps) {
  let isSelfChange = false;

  try {
    let ctx = await requireRbacContext();
    isSelfChange = id === ctx.userId;

    if (!isSelfChange) {
      await requireFreshAuth(300);
      ctx = await requirePermission("users.password.reset", {
        resource: "User",
        resourceId: id,
        auditAllowed: true,
      });
    }

    await observeModuleAccess({
      moduleSlug: "settings",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/users/updateUserPassword.ts",
      accessIntent: "write",
      mode: "observe",
    });

    const result = await changeUserPasswordWorkflow({
      actor: ctx.user,
      targetUserId: id,
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
      isSelfChange,
    });

    if (result.status !== 200) return result;

    revalidatePath("/dashboard/clients");
    return result;
  } catch (error) {
    return safeStatusActionErrorResult(error, {
      action: isSelfChange ? "users.password.change" : "users.password.reset",
      component: "User",
    }, "Unable to update password. Please try again.");
  }
}

export async function resetUserPassword(
  email: string,
  token: string,
  newPassword: string
) {
  try {
    return await completePasswordResetWorkflow(
      email,
      token,
      newPassword,
      await getPublicIdentityRequestContext(),
    );
  } catch (error) {
    logSafeActionWarning("Password reset completion failed", error, {
      action: "users.password.reset.complete",
      component: "User",
    });
    return safeStatusActionErrorResult(error, {
      action: "users.password.reset.complete",
      component: "User",
    }, "Unable to reset password. Please try again.");
  }
}
