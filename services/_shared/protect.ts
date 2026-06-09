import { logger } from "@/lib/logger"
import {
  isRbacError,
  requirePermission,
  type RbacContext,
} from "@/lib/security/rbac"

export type ProtectedActionResponse<T> =
  | { success: true; data: T; error: null; status: 200 }
  | { success: false; data: null; error: string; status: 401 | 403 | 500 }

export function protect<I, O>(
  options: { permission: string; auditResource?: string },
  handler: (input: I, ctx: RbacContext) => Promise<O>,
) {
  return async (input: I): Promise<ProtectedActionResponse<O>> => {
    try {
      const ctx = await requirePermission(options.permission, {
        resource: options.auditResource,
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

      logger.error("protected action failed", {
        err: error,
        permission: options.permission,
        auditResource: options.auditResource,
      })

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Internal error",
        status: 500,
      }
    }
  }
}
