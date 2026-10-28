import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type { PayrollRouteSurface } from "./payroll-route-data-access"
import { getPayrollRouteSurface } from "./payroll-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type PermissionMode = "single" | "all" | "any"
type PayrollRouteContext = Awaited<ReturnType<typeof requirePermission>>

type PayrollRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: PayrollRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const DEFAULT_NO_ACTIVE_ORG_MESSAGE =
  "Refresh your session from the dashboard so payroll can load tenant-scoped HR and payroll evidence."
const DEFAULT_PERMISSION_DENIED_MESSAGE = "This payroll surface cannot be loaded without the required permissions."
const DEFAULT_MODULE_LOCKED_TITLE_SUFFIX = "is not enabled for this organization"
const DEFAULT_MODULE_LOCKED_MESSAGE = "Enable the Payroll module before using this payroll surface."

async function evaluatePayrollRouteAccess(
  surface: PayrollRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<PayrollRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)

  let context: PayrollRouteContext
  const options: PermissionInput = {
    resource: permissionOptions.resource ?? surface.resource,
    resourceId: permissionOptions.resourceId,
    auditAllowed: permissionOptions.auditAllowed ?? true,
  }

  try {
    const mode: PermissionMode = surface.permissionMode ?? "single"
    if (mode === "all") {
      context = await requireAllPermissions(surface.permissions, {
        resource: options.resource,
        resourceId: options.resourceId,
      })
    } else if (mode === "any") {
      context = await requireAnyPermission(surface.permissions, {
        resource: options.resource,
        resourceId: options.resourceId,
      })
    } else {
      context = await requirePermission(surface.permissions[0]!, {
        resource: options.resource,
        resourceId: options.resourceId,
        auditAllowed: options.auditAllowed,
      })
    }
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"
      return {
        kind: "blocked",
        node: (
          <DashboardRouteState
            kind={noActiveOrg ? "no_active_org" : "permission_denied"}
            title={
              noActiveOrg
                ? surface.noActiveOrgTitle ?? `${surface.title} ${NO_ACTIVE_ORG_TITLE_SUFFIX}`
                : surface.permissionDeniedTitle ?? `${surface.title} ${PERMISSION_DENIED_TITLE_SUFFIX}`
            }
            message={
              noActiveOrg
                ? surface.noActiveOrgMessage ?? DEFAULT_NO_ACTIVE_ORG_MESSAGE
                : surface.permissionDeniedMessage ?? DEFAULT_PERMISSION_DENIED_MESSAGE
            }
            primaryHref={localizePath(surface.primaryHref ?? "/dashboard", locale)}
          />
        ),
      }
    }
    throw error
  }

  if (surface.module) {
    const moduleMode = surface.module.mode ?? "enforce"
    const moduleDecision = await observeModuleAccess({
      organizationId: context.orgId,
      userId: context.userId,
      actorPermissions: context.permissions,
      moduleSlug: surface.module.moduleSlug,
      surfaceType: "page",
      surface: surface.module.surface,
      accessIntent: surface.module.accessIntent ?? "read",
      mode: moduleMode,
      audit: true,
    })

    if (moduleMode === "enforce" && !moduleDecision.allowed) {
      return {
        kind: "blocked",
        node: (
          <DashboardRouteState
            kind="locked_module"
            title={surface.module.moduleLockedTitle ?? `${surface.title} ${DEFAULT_MODULE_LOCKED_TITLE_SUFFIX}`}
            message={surface.module.moduleLockedMessage ?? DEFAULT_MODULE_LOCKED_MESSAGE}
            primaryHref={localizePath(surface.primaryHref ?? "/dashboard", locale)}
          />
        ),
      }
    }
  }

  return {
    kind: "allowed",
    context,
    locale,
  }
}

export async function withPayrollSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: PayrollRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: PayrollRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluatePayrollRouteAccess(surface, params, permissionOptions)
  if (state.kind === "blocked") {
    return state.node
  }
  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getPayrollRouteSurface(key)
}
