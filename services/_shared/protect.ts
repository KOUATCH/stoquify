import { logger } from "@/lib/logger"
import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import {
  isRbacError,
  requirePermission,
  type RbacContext,
} from "@/lib/security/rbac"
import { toSafeActionError, type SafeActionStatus } from "./action-errors"

export type ProtectedActionResponse<T> =
  | { success: true; data: T; error: null; status: 200 }
  | { success: false; data: null; error: string; status: SafeActionStatus }

export function protect<I, O>(
  options: {
    permission: string
    auditResource?: string
    auditAllowed?: boolean
    freshAuth?: boolean | { maxAgeSeconds?: number }
  },
  handler: (input: I, ctx: RbacContext) => Promise<O>,
) {
  return async (input: I): Promise<ProtectedActionResponse<O>> => {
    try {
      if (options.freshAuth) {
        const maxAgeSeconds =
          typeof options.freshAuth === "object" ? options.freshAuth.maxAgeSeconds : undefined
        await requireFreshAuth(maxAgeSeconds)
      }

      const ctx = await requirePermission(options.permission, {
        resource: options.auditResource,
        ...(options.auditAllowed !== undefined ? { auditAllowed: options.auditAllowed } : {}),
      })
      const data = await handler(input, ctx)
      return { success: true, data, error: null, status: 200 }
    } catch (error) {
      if (isRbacError(error)) {
        return {
          success: false,
          data: null,
          error: error.code === "UNAUTHENTICATED" ? "Unauthenticated" : "Forbidden",
          status: error.status,
        }
      }

      if (error instanceof FreshAuthRequiredError) {
        return {
          success: false,
          data: null,
          error: "Fresh authentication required",
          status: 403,
        }
      }

      const safeError = toSafeActionError(error)

      logger.error("protected action failed", {
        err: error,
        code: safeError.code,
        status: safeError.status,
        permission: options.permission,
        auditResource: options.auditResource,
      })

      return {
        success: false,
        data: null,
        error: safeError.error,
        status: safeError.status,
      }
    }
  }
}
