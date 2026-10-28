import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { Locale } from "@/types/bilingual"

import type { NotificationsDemoRouteSurface } from "./notifications-demo-route-data-access"
import { getNotificationsDemoRouteSurface } from "./notifications-demo-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type PermissionMode = "single" | "all" | "any"
type NotificationsDemoRouteContext = Awaited<ReturnType<typeof requirePermission>>

type NotificationsDemoRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: NotificationsDemoRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const NO_ACTIVE_ORG_MESSAGE = "Refresh your session from the dashboard so this route can load tenant-scoped settings."
const PERMISSION_DENIED_MESSAGE = "This route requires the matching permission and cannot be loaded without access."
const DEFAULT_MODULE_LOCKED_TITLE_SUFFIX = "is not enabled for this tenant"
const DEFAULT_MODULE_LOCKED_MESSAGE = "Enable the required module before opening this surface."

async function evaluateNotificationsDemoRouteAccess(
  surface: NotificationsDemoRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<NotificationsDemoRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)

  let context: NotificationsDemoRouteContext

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
    const moduleDecision = await observeModuleAccess({
      organizationId: context.orgId,
      userId: context.userId,
      actorPermissions: context.permissions,
      moduleSlug: surface.module.moduleSlug,
      surfaceType: "page",
      surface: surface.module.surface,
      accessIntent: surface.module.accessIntent ?? "read",
      mode: surface.module.mode ?? "observe",
    })

    if (!moduleDecision.allowed && surface.module.mode === "enforce") {
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

  return {
    kind: "allowed",
    context,
    locale,
  }
}

export async function withNotificationsDemoSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: NotificationsDemoRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: NotificationsDemoRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateNotificationsDemoRouteAccess(surface, params, permissionOptions)

  if (state.kind === "blocked") {
    return state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getNotificationsDemoRouteSurface(key)
}
