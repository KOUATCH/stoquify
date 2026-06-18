

"use server";
import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { getAuthenticatedUser } from "@/config/useAuth";
import { hasAppPermission } from "@/lib/security/server-authz";
import { deactivateUserForOrganization } from "@/services/users/user-lifecycle.service";


export async function deleteUser(id: string) {

  try {
    const authUser = await getAuthenticatedUser();

    if (!hasAppPermission(authUser, "users.delete")) {
      return {
        error: "Forbidden",
        status: 403,
        data: null,
      };
    }

    if (id === authUser.id) {
      return {
        error: "You cannot delete your own account",
        status: 400,
        data: null,
      };
    }

    const deactivatedUser = await deactivateUserForOrganization({
      organizationId: authUser.organizationId,
      targetUserId: id,
      actorId: authUser.id,
    });

    return {
      ok: true,
      data: deactivatedUser
    };
} catch (error) {
    return safeStatusActionErrorResult(error, {
      action: "users.delete",
      component: "User",
    }, "Something went wrong, Please try again");
}}
