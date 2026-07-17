import "server-only"

import { db } from "@/prisma/db"
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"

const deactivatedUserSelect = {
  id: true,
  email: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  phone: true,
  image: true,
  jobTitle: true,
  isActive: true,
  isVerified: true,
  preferredLocale: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  roles: {
    select: {
      id: true,
      code: true,
      nameEn: true,
      nameFr: true,
      description: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const

export async function deactivateUserForOrganization(input: {
  organizationId: string
  targetUserId: string
  actorId: string
}) {
  if (input.targetUserId === input.actorId) {
    throw new BusinessRuleError("You cannot deactivate your own account")
  }

  const deactivatedUser = await db.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: {
        id: input.targetUserId,
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    })

    if (!user) {
      throw new NotFoundError("User not found")
    }

    const cancelledInvites = await tx.invite.updateMany({
      where: {
        email: user.email,
        organizationId: input.organizationId,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
      },
    })

    const deactivatedUser = await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        isActive: false,
        isLocked: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
      select: deactivatedUserSelect,
    })

    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.actorId,
        entityType: "User",
        entityId: user.id,
        action: "DEACTIVATE_USER",
        changes: {
          before: {
            email: user.email,
            isActive: user.isActive,
          },
          after: {
            isActive: false,
            isLocked: true,
            pendingInvitesCancelled: cancelledInvites.count,
          },
        },
      },
    })

    return deactivatedUser
  })

  await logSecurityEvent({
    type: SecurityEventType.USER_DELETED,
    userId: input.actorId,
    organizationId: input.organizationId,
    resource: input.targetUserId,
    details: { deactivatedEmail: deactivatedUser.email },
  })

  return deactivatedUser
}
