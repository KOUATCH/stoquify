"use server";
import { db } from "@/prisma/db";
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log";
import {
  hashPolicyCompliantPassword,
  upsertCredentialAccount,
} from "@/lib/security/auth-credentials";
import { InviteStatus } from "@prisma/client";
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
  const { token, password, firstName, lastName, phone, image } = data;

  try {
    // Use a transaction for atomic operations
    const result = await db.$transaction(async (tx) => {
      const invite = await tx.invite.findUnique({
        where: { token },
        include: {
          role: { select: { id: true, organizationId: true } },
        },
      });

      if (!invite || invite.status !== InviteStatus.PENDING) {
        return {
          error: "Invalid or already used invitation link",
          status: 400,
          data: null,
        };
      }

      if (invite.expiresAt <= new Date()) {
        await tx.invite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.EXPIRED },
        });

        return {
          error: "Invitation link has expired",
          status: 410,
          data: null,
        };
      }

      if (invite.role.organizationId !== invite.organizationId) {
        return {
          error: "Invitation role is invalid",
          status: 403,
          data: null,
        };
      }

      const existingUser = await tx.user.findFirst({
        where: { email: { equals: invite.email, mode: "insensitive" } },
        select: { id: true },
      });

      if (existingUser) {
        return {
          error: "This email is already registered",
          status: 409,
          data: null,
        };
      }

      const passwordPolicy = await hashPolicyCompliantPassword({
        password,
        email: invite.email,
      });

      if (!passwordPolicy.ok) {
        return {
          error: passwordPolicy.message,
          status: 400,
          data: null,
        };
      }
      const hashedPassword = passwordPolicy.hash;

      // Invited User registers with role
      const newUser = await tx.user.create({
        data: {
          email: invite.email,
          password: hashedPassword,
          firstName,
          lastName,
          organizationId: invite.organizationId,
          phone: phone || null,
          isVerified:true,  
          emailVerified: true,
          image: image || null,
          roles: {
            connect: {
              id: invite.roleId,
            },
          },
        },
        select: {
          id: true,
          email: true,
        },
      });

      await tx.passwordHistory.create({
        data: {
          userId: newUser.id,
          passwordHash: hashedPassword,
        },
      })

      await upsertCredentialAccount(tx, {
        userId: newUser.id,
        passwordHash: hashedPassword,
      })
      
     await tx.invite.update({
        where:{ id: invite.id },
        data: {status: InviteStatus.ACCEPTED}
      })
      
      return {
        error: null,
        status: 200,
        data: {
          ...newUser,
          organizationId: invite.organizationId,
          inviteId: invite.id,
          roleId: invite.roleId,
        },
      };
    });

    if (result.status === 200 && result.data) {
      void logSecurityEvent({
        type: SecurityEventType.INVITE_REDEEMED,
        userId: result.data.id,
        organizationId: result.data.organizationId,
        resource: result.data.email,
        details: { inviteId: result.data.inviteId, roleId: result.data.roleId },
      })
    }

    return result;
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      error: `Something went wrong, Please try again`,
      status: 500,
      data: null,
    };
  }
}


