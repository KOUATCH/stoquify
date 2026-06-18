"use server";
import { logSafeActionWarning } from "@/actions/_shared/safe-action-responses";
import { requestPasswordResetLinkWorkflow } from "@/services/users/user-identity.service";

export async function sendResetLink(email: string) {
  const genericResponse = {
    status: 200,
    error: null,
    data: null,
  };

  try {
    return await requestPasswordResetLinkWorkflow(email);
  } catch (error) {
    logSafeActionWarning("Password reset request failed", error, {
      action: "users.password.reset",
      component: "User",
    });
    return genericResponse;
  }
}
