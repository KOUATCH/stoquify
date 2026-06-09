"use server";
import { PasswordProps } from "@/components/Forms/ChangePasswordForm";
import { getAuthenticatedUser } from "@/config/useAuth";
import { hasAppPermission } from "@/lib/security/server-authz";
import {
  hashPolicyCompliantPassword,
  syncUserCredentialPassword,
  verifyUserCredentialPassword,
} from "@/lib/security/auth-credentials";
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log";
import { db } from "@/prisma/db";
import { revalidatePath } from "next/cache";

export async function updateUserPassword(id: string, data: PasswordProps) {
  const authUser = await getAuthenticatedUser();
  const isSelfChange = id === authUser.id;

  if (!isSelfChange && !hasAppPermission(authUser, "users.password.reset")) {
    return { error: "Forbidden", status: 403 };
  }

  const existingUser = await db.user.findFirst({
    where: {
      id,
      organizationId: authUser.organizationId,
    },
  });

  if (!existingUser) {
    return { error: "User not found", status: 404 };
  }

  if (isSelfChange && !(await verifyUserCredentialPassword(existingUser.id, data.oldPassword))) {
    return { error: "Old Password Incorrect", status: 403 };
  }

  const passwordPolicy = await hashPolicyCompliantPassword({
    password: data.newPassword,
    userId: existingUser.id,
    email: existingUser.email,
  });

  if (!passwordPolicy.ok) {
    return { error: passwordPolicy.message, status: 400 };
  }

  const hashedPassword = passwordPolicy.hash;
  try {
    await db.$transaction(async (tx) => {
      await syncUserCredentialPassword(tx, {
        userId: id,
        passwordHash: hashedPassword,
        revokeSessions: true,
      });
    });
    await logSecurityEvent({
      type: SecurityEventType.AUTH_PASSWORD_CHANGED,
      userId: authUser.id,
      organizationId: authUser.organizationId,
      resource: id,
      details: {
        targetUserId: id,
        selfService: isSelfChange,
        sessionsRevoked: true,
      },
    });
    revalidatePath("/dashboard/clients");
    return { error: null, status: 200 };
  } catch (error) {
    console.log(error);
  }
}
export async function resetUserPassword(
  email: string,
  token: string,
  newPassword: string
) {
  const user = await db.user.findFirst({
    where: {
      email: { equals: email.trim().toLowerCase(), mode: "insensitive" },
      verificationToken: token,
      verificationTokenExpires: { gt: new Date() },
    },
  });
  if (!user) {
    return {
      status: 404,
      error: "Please use a valid reset link",
      data: null,
    };
  }
  const passwordPolicy = await hashPolicyCompliantPassword({
    password: newPassword,
    userId: user.id,
    email: user.email,
  });

  if (!passwordPolicy.ok) {
    return {
      status: 400,
      error: passwordPolicy.message,
      data: null,
    };
  }

  const hashedPassword = passwordPolicy.hash;
  try {
    await db.$transaction(async (tx) => {
      await syncUserCredentialPassword(tx, {
        userId: user.id,
        passwordHash: hashedPassword,
        revokeSessions: true,
      });

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          verificationToken: null,
          verificationTokenExpires: null,
        },
      });
    });
    await logSecurityEvent({
      type: SecurityEventType.AUTH_PASSWORD_RESET_COMPLETED,
      userId: user.id,
      organizationId: user.organizationId,
      resource: user.id,
      details: { sessionsRevoked: true },
    });
    return {
      status: 200,
      error: null,
      data: null,
    };
  } catch (error) {
    console.log(error);
  }
}

