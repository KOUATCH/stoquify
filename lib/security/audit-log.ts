import { db } from "@/prisma/db"
import { logger } from "@/lib/logger"
import type { Prisma } from "@prisma/client"

export enum SecurityEventType {
  LOGIN_FAILED = "LOGIN_FAILED",
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  AUTH_REGISTERED = "AUTH_REGISTERED",
  AUTH_EMAIL_VERIFICATION_SENT = "AUTH_EMAIL_VERIFICATION_SENT",
  AUTH_EMAIL_VERIFIED = "AUTH_EMAIL_VERIFIED",
  AUTH_PASSWORD_CHANGED = "AUTH_PASSWORD_CHANGED",
  AUTH_PASSWORD_RESET_REQUESTED = "AUTH_PASSWORD_RESET_REQUESTED",
  AUTH_PASSWORD_RESET_COMPLETED = "AUTH_PASSWORD_RESET_COMPLETED",
  AUTH_SESSION_REVOKED = "AUTH_SESSION_REVOKED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  PERMISSION_GRANTED = "PERMISSION_GRANTED",
  ROLE_CHANGED = "ROLE_CHANGED",
  USER_DELETED = "USER_DELETED",
  INVITE_CREATED = "INVITE_CREATED",
  INVITE_REDEEMED = "INVITE_REDEEMED",
}

type SecurityEventInput = {
  type: SecurityEventType
  userId?: string | null
  organizationId?: string | null
  ip?: string | null
  userAgent?: string | null
  resource?: string | null
  details?: Record<string, unknown>
}

export async function logSecurityEvent(input: SecurityEventInput) {
  if (!input.organizationId) {
    logger.warn("security event skipped without organization", {
      type: input.type,
      userId: input.userId,
      resource: input.resource,
    })
    return
  }

  try {
    await db.auditLog.create({
      data: {
        entityType: "SecurityEvent",
        entityId: input.resource ?? input.userId ?? "unknown",
        action: input.type,
        changes: (input.details ?? {}) as Prisma.InputJsonValue,
        userId: input.userId ?? undefined,
        organizationId: input.organizationId,
        ipAddress: input.ip ?? undefined,
        userAgent: input.userAgent ?? undefined,
      },
    })
  } catch (error) {
    logger.error("security audit write failed", {
      err: error,
      type: input.type,
      userId: input.userId,
      organizationId: input.organizationId,
      resource: input.resource,
    })
  }
}
