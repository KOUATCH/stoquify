import { logger } from "@/lib/logger"
import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import {
  assertCanUseOrganization,
  isRbacError,
  requirePermission,
  RbacError,
  type RbacContext,
} from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
  ModuleSurfaceType,
} from "@/services/modules/module-control-contracts"
import { toSafeActionError, type ApplicationErrorCode, type SafeActionStatus } from "./action-errors"
import { createCorrelationId } from "@/lib/error-handling/canonical"
import { type ErrorCategory, type ErrorSeverity } from "@/lib/error-handling/types"

export type ProtectedActionResponse<T> =
  | { success: true; data: T; error: null; status: 200 }
  | {
      success: false
      data: null
      error: string
      status: SafeActionStatus
      code: ApplicationErrorCode
      correlationId: string
      category: ErrorCategory
      severity: ErrorSeverity
      retryable: boolean
    }

export type TenantGuardMode = boolean | "handler-derived"
export type ModuleGateMode = "observe" | "enforce"

export type ProtectedActionModuleGate = {
  moduleSlug: CommercialModuleSlug
  surface?: string
  surfaceType?: ModuleSurfaceType
  accessIntent?: ModuleAccessIntent
  mode?: ModuleGateMode
  audit?: boolean
}

export function protect<I, O>(
  options: {
    permission: string
    auditResource?: string
    auditAllowed?: boolean
    freshAuth?: boolean | { maxAgeSeconds?: number }
    tenantGuard?: TenantGuardMode
    module?: ProtectedActionModuleGate
  },
  handler: (input: I, ctx: RbacContext) => Promise<O>,
) {
  return async (input: I): Promise<ProtectedActionResponse<O>> => {
    const correlationId = createCorrelationId("act")

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
      if (options.module) {
        const decision = await observeModuleAccess({
          organizationId: ctx.orgId,
          userId: ctx.userId,
          actorPermissions: ctx.permissions,
          moduleSlug: options.module.moduleSlug,
          surfaceType: options.module.surfaceType ?? "action",
          surface: options.module.surface ?? options.permission,
          accessIntent: options.module.accessIntent ?? "read",
          mode: options.module.mode ?? "enforce",
          audit: options.module.audit,
        })

        if (!decision.allowed) {
          throw new RbacError("Forbidden: module is not available for this tenant", "FORBIDDEN", 403)
        }
      }
      if (options.tenantGuard !== false && options.tenantGuard !== "handler-derived") {
        await assertTrustedTenantInput(input, ctx)
      }
      const data = await handler(input, ctx)
      return { success: true, data, error: null, status: 200 }
    } catch (error) {
      const safeError = toSafeActionError(error, {
        correlationId,
        action: options.permission,
        component: options.auditResource,
        metadata: {
          permission: options.permission,
          auditResource: options.auditResource,
        },
      })

      if (isRbacError(error)) {
        return {
          success: false,
          data: null,
          error: safeError.error,
          status: safeError.status,
          code: safeError.code,
          correlationId: safeError.correlationId,
          category: safeError.category,
          severity: safeError.severity,
          retryable: safeError.retryable,
        }
      }

      if (error instanceof FreshAuthRequiredError) {
        const stepUpError = toSafeActionError(error, {
          correlationId,
          code: "FRESH_AUTH_REQUIRED",
          status: 403,
          userMessage: "Fresh authentication required",
          action: options.permission,
          component: options.auditResource,
        })

        return {
          success: false,
          data: null,
          error: stepUpError.error,
          status: stepUpError.status,
          code: stepUpError.code,
          correlationId: stepUpError.correlationId,
          category: stepUpError.category,
          severity: stepUpError.severity,
          retryable: stepUpError.retryable,
        }
      }

      logger.error("protected action failed", {
        err: error,
        code: safeError.code,
        status: safeError.status,
        correlationId: safeError.correlationId,
        category: safeError.category,
        severity: safeError.severity,
        permission: options.permission,
        auditResource: options.auditResource,
      })

      return {
        success: false,
        data: null,
        error: safeError.error,
        status: safeError.status,
        code: safeError.code,
        correlationId: safeError.correlationId,
        category: safeError.category,
        severity: safeError.severity,
        retryable: safeError.retryable,
      }
    }
  }
}

async function assertTrustedTenantInput(input: unknown, ctx: RbacContext) {
  for (const organizationId of extractTenantIds(input)) {
    await assertCanUseOrganization(ctx, organizationId)
  }
}

function extractTenantIds(input: unknown) {
  if (!input || typeof input !== "object") return []

  const candidates = new Set<string>()
  const record = input as Record<string, unknown>
  addTenantCandidate(candidates, record.organizationId)
  addTenantCandidate(candidates, record.orgId)

  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>
    addTenantCandidate(candidates, data.organizationId)
    addTenantCandidate(candidates, data.orgId)
  }

  return Array.from(candidates)
}

function addTenantCandidate(candidates: Set<string>, value: unknown) {
  if (typeof value !== "string") return
  const trimmed = value.trim()
  if (trimmed) candidates.add(trimmed)
}
