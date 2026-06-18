"use server";
import { logSafeActionWarning } from "@/actions/_shared/safe-action-responses";
import { getAuthenticatedUser } from "@/config/useAuth";
import { hasAppPermission } from "@/lib/security/server-authz";
import { getOrganizationUserById } from "@/services/users/user-identity.service";



export async function getUserById(id: string) {
  try {
    const authUser = await getAuthenticatedUser();
    const canReadUsers = hasAppPermission(authUser, "users.read");

    if (id !== authUser.id && !canReadUsers) {
      return null;
    }

    const user = await getOrganizationUserById({
      userId: id,
      organizationId: authUser.organizationId,
    });
    return user;
  } catch (error) {
    logSafeActionWarning("Error fetching user", error, {
      action: "users.read",
      component: "User",
    });
    return null;
  }
}
 
