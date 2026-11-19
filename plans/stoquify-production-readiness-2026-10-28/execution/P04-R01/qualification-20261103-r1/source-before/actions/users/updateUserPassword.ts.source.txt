"use server";

import {
  logSafeActionWarning,
  safeStatusActionErrorResult,
} from "@/actions/_shared/safe-action-responses";
import { requireFreshAuth, requireSession } from "@/lib/security/auth-session";
import { getPublicIdentityRequestContext } from "@/lib/security/public-request-context";
import { requirePermission } from "@/lib/security/rbac";
import { passwordChangeRequest, type PasswordChangeFields } from "@/services/users/password-change-input";
import { stepUpSessionWithPassword } from "@/services/security/step-up-auth.service";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import {
  changeUserPasswordWorkflow,
  completePasswordResetWorkflow,
} from "@/services/users/user-identity.service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { localizePath, pickLocale } from "@/i18n/routing";

export async function updateUserPassword(id: string, data: PasswordChangeFields) {
  let isSelfChange = false;
  let signInHref: string | null = null;

  try {
    const parsed = passwordChangeRequest.safeParse({ targetUserId: id, oldPassword: data?.oldPassword, newPassword: data?.newPassword });
    if (!parsed.success) return { status: 400, code: "VALIDATION_ERROR", error: "Check the password-change details.", data: null };
    const locale = pickLocale(await getLocale());
    const initial = await requireSession();
    isSelfChange = parsed.data.targetUserId === initial.claims.userId;
    const permissionContext = await requirePermission(isSelfChange ? "profile.password.update" : "users.password.reset", { resource: "User", resourceId: parsed.data.targetUserId, auditAllowed: true });
    if (permissionContext.userId !== initial.claims.userId || permissionContext.orgId !== initial.claims.tenantId) return { status: 401, code: "AUTH_REQUIRED", error: "Sign in again.", data: null };
    if (isSelfChange) {
      const assurance = await stepUpSessionWithPassword({ sessionId: initial.claims.sessionId, sessionToken: initial.claims.sessionToken, userId: initial.claims.userId, organizationId: initial.claims.tenantId, password: parsed.data.oldPassword });
      if (assurance.status !== "verified") return { status: assurance.status === "locked" ? 429 : assurance.status === "session_invalid" ? 401 : 403, code: assurance.status === "locked" ? "RATE_LIMITED" : assurance.status === "session_invalid" ? "AUTH_REQUIRED" : "INVALID_CREDENTIALS", error: "The current password could not be confirmed.", data: null };
    }
    const verified = await requireFreshAuth(300);
    const ctx = verified.ctx;
    if (ctx.userId !== initial.claims.userId || ctx.orgId !== initial.claims.tenantId) return { status: 401, code: "AUTH_REQUIRED", error: "Sign in again.", data: null };

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
      actorPermissions: ctx.permissions,
      ...parsed.data,
      session: { id: verified.claims.sessionId, token: verified.claims.sessionToken },
    });

    if (result.status !== 200) return result;

    if (result.data?.selfService) {
      signInHref = localizePath("/login-v2?notice=password-change", locale);
    } else {
      revalidatePath("/[locale]/dashboard/settings/users", "page");
      return result;
    }
  } catch (error) {
    return safeStatusActionErrorResult(error, {
      action: isSelfChange ? "users.password.change" : "users.password.reset",
      component: "User",
    }, "Unable to update password. Please try again.");
  }
  // Redirect outside the error normalizer: a successful session-revoking change
  // must leave the authenticated shell before its next session check redirects.
  if (signInHref) redirect(signInHref);
  return { status: 500, code: "INTERNAL_ERROR", error: "Unable to confirm the password change.", data: null };
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
