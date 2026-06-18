"use server";
import { logSafeActionWarning } from "@/actions/_shared/safe-action-responses";
import { getAuthenticatedUser } from "@/config/useAuth";
import { hasAppPermission } from "@/lib/security/server-authz";
import { listOrganizationUsers } from "@/services/users/user-identity.service";


const getOrgUsers=async(organizationId:string)=> {

  try {
    const authUser = await getAuthenticatedUser();
    if (organizationId && organizationId !== authUser.organizationId) {
      return [];
    }

    if (!hasAppPermission(authUser, "users.read")) {
      return [];
    }

    const organizationUsers = await listOrganizationUsers(authUser.organizationId);
    return organizationUsers
  } catch (error) {
    logSafeActionWarning("Error fetching organization users", error, {
      action: "users.read",
      component: "User",
    });
    return [];
  }
}
export default getOrgUsers
