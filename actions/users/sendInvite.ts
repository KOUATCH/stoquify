
"use server";
import UserInvitation from "@/components/email-templates/user-invite";
import { InviteData } from "@/components/Forms/users/userInvitationForm";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { hasAppPermission } from "@/lib/security/server-authz";
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log";
import { db } from "@/prisma/db";
import { InviteStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { Resend } from "resend";

// import { generateNumericToken } from "@/lib/token";
const resend = new Resend(process.env.RESEND_API_KEY);

export const  sendInvite= async(data:InviteData) =>{
  const email = data.email.trim().toLowerCase();
  const { roleId } = data;
  const roleName = data.name ?? data.roleName ?? "assigned";

  try {
    // Use a transaction for atomic operations
    return await db.$transaction(async (tx) => { 
      const authUser = await getAuthenticatedUser()
      if (!hasAppPermission(authUser, "users.invite")) {
        return {
          error: "Forbidden",
          status: 403,
          data: null,
        };
      }

      const organizationId = authUser.organizationId

      const role = await tx.role.findFirst({
        where: { id: roleId, organizationId },
        select: { id: true, nameEn: true, nameFr: true, code: true },
      });

      if (!role) {
        return {
          error: "Invalid role for this organization",
          status: 403,
          data: null,
        };
      }

      // Check for existing users
      const existingUserByEmail = await tx.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });

      if (existingUserByEmail) {
        return {
          error: `This email ${email} is already in use, another invitation cannot be sent`,
          status: 409,
          data: null,
        };
      }

      // if user already invited
      const existingInvite = await tx.invite.findUnique({
        where: { email_organizationId: { email, organizationId } },
      });
      
      
      if (
        existingInvite &&
        existingInvite.status === InviteStatus.PENDING &&
        existingInvite.expiresAt > new Date()
      ) {
        return {
          error: `This email ${email} is already invited, Another invitation cannot be sent`,
          status: 409,
          data: null,
        };
      }
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      if (existingInvite) {
        await tx.invite.update({
          where: { id: existingInvite.id },
          data: {
            roleId: role.id,
            token,
            expiresAt,
            status: InviteStatus.PENDING,
          },
        })
      } else {
        await tx.invite.create({
          data:{
            email,
            organizationId,
            roleId: role.id,
            token,
            expiresAt,
          }
        })
      }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000"
  const linkUrl=`${baseUrl}/user-invite/invitation?token=${encodeURIComponent(token)}`
// const linkUrl=`${baseUrl}/user-invite/${organizationId}?roleId=${roleId} && email=${email}&& organizationName=${organizationName}`
const companyName= authUser.organizationName ?? "StockFlow"
const {data: emailData, error}= await resend.emails.send({
  // from:"PosInvent <kouatch@posinvent.com>",
  from:"onboarding@resend.dev", 
  to:email,
  subject:`Welcome to ${companyName} - ${(role.nameEn || role.nameFr || roleName)} role`,
  react:UserInvitation({companyName,linkUrl,name: role.nameEn || role.nameFr || roleName})  
})
if(error){
  throw new Error(error.message)
}
      void logSecurityEvent({
        type: SecurityEventType.INVITE_CREATED,
        userId: authUser.id,
        organizationId,
        resource: email,
        details: { roleId: role.id },
      })

      return {
        error: null,
        status: 200,
        data: emailData,
        // data: {id:data?.id, email:email},
      };
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    return {
      error: `Something went wrong, Please try again`,
      status: 500,
      data: null,
    };
  }
}
