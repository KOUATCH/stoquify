"use server"

import { logSafeActionWarning } from "@/actions/_shared/safe-action-responses"
import { getPublicIdentityRequestContext } from "@/lib/security/public-request-context"
import { requestEmailVerificationCodeWorkflow } from "@/services/users/user-identity.service"

export async function resendVerificationCode(userId: string, email: string) {
  try {
    return await requestEmailVerificationCodeWorkflow(userId, email, await getPublicIdentityRequestContext())
  } catch (error) {
    logSafeActionWarning("Email verification request failed", error, {
      action: "users.email.resend",
      component: "User",
    })
    // Match unknown, disabled, verified and throttled recipients; no delivery assertion.
    return { status: 200, error: null, data: null }
  }
}
