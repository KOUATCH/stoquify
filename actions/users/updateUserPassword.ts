"use server";
import {
  logSafeActionWarning,
  safeStatusActionErrorResult,
} from "@/actions/_shared/safe-action-responses";
import { PasswordProps } from "@/components/Forms/ChangePasswordForm";
import { getAuthenticatedUser } from "@/config/useAuth";
import { hasAppPermission } from "@/lib/security/server-authz";
import {
  changeUserPasswordWorkflow,
  completePasswordResetWorkflow,
} from "@/services/users/user-identity.service";
import { revalidatePath } from "next/cache";

export async function updateUserPassword(id: string, data: PasswordProps) {
  const authUser = await getAuthenticatedUser();
  const isSelfChange = id === authUser.id;

  if (!isSelfChange && !hasAppPermission(authUser, "users.password.reset")) {
    return { error: "Forbidden", status: 403 };
  }

  try {
    const result = await changeUserPasswordWorkflow({
      actor: authUser,
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
      action: "users.password.change",
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
    return await completePasswordResetWorkflow(email, token, newPassword);
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
