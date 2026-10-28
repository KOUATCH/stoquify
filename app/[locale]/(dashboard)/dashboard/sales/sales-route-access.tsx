import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { Locale } from "@/types/bilingual"

import type { SalesRouteSurface } from "./sales-route-data-access"
import { getSalesRouteSurface } from "./sales-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type PermissionMode = "single" | "all" | "any"
type SalesRouteContext = Awaited<ReturnType<typeof requirePermission>>

type SalesRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: SalesRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const NO_ACTIVE_ORG_MESSAGE =
  "Refresh your session from the dashboard so sales can load tenant-scoped order and customer data."
const PERMISSION_DENIED_MESSAGE =
  "Viewing sales requires sales read access. The denial was recorded by the RBAC guard."
const DEFAULT_MODULE_LOCKED_TITLE_SUFFIX = "is not enabled for this organization"
const DEFAULT_MODULE_LOCKED_MESSAGE =
  "Enable the sales module before opening this dashboard to access sales evidence."

async function evaluateSalesRouteAccess(
  surface: SalesRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<SalesRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)

  let context: SalesRouteContext
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
            title={noActiveOrg ? surface.noActiveOrgTitle ?? `${surface.title} ${NO_ACTIVE_ORG_TITLE_SUFFIX}` : surface.permissionDeniedTitle ?? `${surface.title} ${PERMISSION_DENIED_TITLE_SUFFIX}`}
            message={noActiveOrg ? surface.noActiveOrgMessage ?? NO_ACTIVE_ORG_MESSAGE : surface.permissionDeniedMessage ?? PERMISSION_DENIED_MESSAGE}
            primaryHref={localizePath(
              noActiveOrg ? surface.noActiveOrgPrimaryHref ?? "/dashboard" : surface.permissionDeniedPrimaryHref ?? "/dashboard",
              locale,
            )}
          />
        ),
      }
    }

    throw error
  }

  if (surface.module) {
    const moduleMode = surface.module.mode ?? "observe"
    const moduleDecision = await observeModuleAccess({
      organizationId: context.orgId,
      userId: context.userId,
      actorPermissions: context.permissions,
      moduleSlug: surface.module.moduleSlug,
      surfaceType: "page",
      surface: surface.module.surface,
      accessIntent: surface.module.accessIntent ?? "read",
      mode: moduleMode,
    })

    if (moduleMode === "enforce" && !moduleDecision.allowed) {
      return {
        kind: "blocked",
        node: (
          <DashboardRouteState
            kind="locked_module"
            title={surface.module.moduleLockedTitle ?? `${surface.title} ${DEFAULT_MODULE_LOCKED_TITLE_SUFFIX}`}
            message={surface.module.moduleLockedMessage ?? DEFAULT_MODULE_LOCKED_MESSAGE}
            primaryHref={localizePath("/dashboard", locale)}
          />
        ),
      }
    }
  }

  return { kind: "allowed", context, locale }
}

export async function withSalesSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: SalesRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: SalesRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateSalesRouteAccess(surface, params, permissionOptions)
  if (state.kind === "blocked") {
    return state.node
  }
  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getSalesRouteSurface(key)
}
