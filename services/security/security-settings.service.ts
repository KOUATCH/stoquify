import "server-only"

import { db } from "@/prisma/db"

export async function getSecuritySettingsAccountState(input: {
  userId: string
  organizationId: string
}) {
  const [user, credentialAccount] = await Promise.all([
    db.user.findFirst({
      where: {
        id: input.userId,
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        isVerified: true,
        isLocked: true,
        lockedUntil: true,
        failedLoginAttempts: true,
        lastFailedLogin: true,
        lastLogin: true,
        mfaEnabledAt: true,
        mfaBackupCodes: true,
        passwordHistory: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        sessions: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            token: true,
            expiresAt: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    db.account.findFirst({
      where: {
        userId: input.userId,
        providerId: "credential",
      },
      select: { id: true, createdAt: true },
    }),
  ])

  return { user, credentialAccount }
}
