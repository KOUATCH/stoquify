"use server";
import { logSafeActionWarning } from "@/actions/_shared/safe-action-responses";
import { getAuthenticatedUser } from "@/config/useAuth";
import { hasAppPermission } from "@/lib/security/server-authz";
import { listOrganizationInvites } from "@/services/users/user-identity.service";



export async function getOrgInvites(organizationId:string) {

  try {
    const authUser = await getAuthenticatedUser();
    if (organizationId && organizationId !== authUser.organizationId) {
      return [];
    }

    if (!hasAppPermission(authUser, "users.invite") && !hasAppPermission(authUser, "users.read")) {
      return [];
    }

    const organizationInvites = await listOrganizationInvites(authUser.organizationId);
   
    return organizationInvites
  } catch (error) {
    logSafeActionWarning("Error fetching organization invites", error, {
      action: "users.invites.read",
      component: "User",
    });
    return [];
  }
}
