"use server";
import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses";
import { acceptInvitationWorkflow } from "@/services/users/user-identity.service";
// import { Resend } from "resend";

// // import { generateNumericToken } from "@/lib/token";
// const resend = new Resend(process.env.RESEND_API_KEY);
// // const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;



type InvitedUserProps = {
  token: string;
  email?: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  image?: string | null;
};

export async function createInvitedUser(data: InvitedUserProps) {
  try {
    return await acceptInvitationWorkflow(data);
  } catch (error) {
    return safeStatusActionErrorResult(error, {
      action: "users.invite.accept",
      component: "User",
    }, "Something went wrong, Please try again");
  }
}


