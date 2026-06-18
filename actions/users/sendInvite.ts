
"use server";
import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { InviteData } from "@/components/Forms/users/userInvitationForm";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { hasAppPermission } from "@/lib/security/server-authz";
import { sendInviteWorkflow } from "@/services/users/user-identity.service";

export const  sendInvite= async(data:InviteData) =>{
  const email = data.email.trim().toLowerCase();
  const { roleId } = data;
  const roleName = data.name ?? data.roleName ?? "assigned";

  try {
    const authUser = await getAuthenticatedUser()
    if (!hasAppPermission(authUser, "users.invite")) {
        return {
          error: "Forbidden",
          status: 403,
          data: null,
        };
      }

    return await sendInviteWorkflow({
      actor: authUser,
      email,
      roleId,
      roleName,
    });
  } catch (error) {
    return safeStatusActionErrorResult(error, {
      action: "users.invite",
      component: "User",
    }, "Something went wrong, Please try again");
  }
}
