"use server";

import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { requireFreshAuth } from "@/lib/security/auth-session";
import { requireAnyPermission } from "@/lib/security/rbac";
import { ForbiddenError } from "@/services/_shared/action-errors";
import type { UserDeactivationCommand } from "@/services/users/user-deactivation-input";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";
import { deactivateUserForOrganization } from "@/services/users/user-lifecycle.service";

// Keep the established action name for callers; the operation retains the account.
export async function deleteUser(id: string, command?: UserDeactivationCommand) {
  try {
    const verified = await requireFreshAuth(300);
    const ctx = await requireAnyPermission(["users.deactivate", "users.delete"], {
      resource: "User",
      resourceId: id,
    });

    if (verified.claims.userId !== ctx.userId || verified.claims.tenantId !== ctx.orgId) throw new ForbiddenError("Your organization session changed. Reload before continuing.");

    await observeModuleAccess({
      moduleSlug: "settings",
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      surfaceType: "action",
      surface: "actions/users/deleteUser.ts",
      accessIntent: "write",
      mode: "observe",
    });

    const deactivatedUser = await deactivateUserForOrganization({
      organizationId: ctx.orgId,
      targetUserId: id,
      actorId: ctx.userId,
      command,
      session: { id: verified.claims.sessionId, token: verified.claims.sessionToken },
    });

    // Directory reads are uncached. The caller refreshes after the user closes
    // the receipt; immediate route revalidation would unmount that receipt.

    return {
      ok: true,
      data: deactivatedUser,
    };
  } catch (error) {
    return safeStatusActionErrorResult(error, {
      action: "users.deactivate",
      component: "User",
    }, "Something went wrong, Please try again");
  }
}
