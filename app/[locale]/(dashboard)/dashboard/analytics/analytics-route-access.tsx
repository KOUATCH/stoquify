import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type { AnalyticsRouteSurface, PermissionMode } from "./analytics-route-data-access"
import { getAnalyticsRouteSurface } from "./analytics-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type AnalyticsRouteContext = Awaited<ReturnType<typeof requirePermission>>

type AnalyticsRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: AnalyticsRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const NO_ACTIVE_ORG_MESSAGE =
  "Refresh your session from the dashboard so this analytics surface can load tenant-scoped data."
const PERMISSION_DENIED_MESSAGE =
  "This analytics surface requires the matching permission and cannot be loaded without an authorized role."

async function evaluateAnalyticsRouteAccess(
  surface: AnalyticsRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<AnalyticsRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)

  let context: AnalyticsRouteContext
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
      const title = noActiveOrg
        ? surface.noActiveOrgTitle ?? `${surface.title} ${NO_ACTIVE_ORG_TITLE_SUFFIX}`
        : surface.permissionDeniedTitle ?? `${surface.title} ${PERMISSION_DENIED_TITLE_SUFFIX}`
      const message = noActiveOrg
        ? surface.noActiveOrgMessage ?? NO_ACTIVE_ORG_MESSAGE
        : surface.permissionDeniedMessage ?? PERMISSION_DENIED_MESSAGE
      const href = noActiveOrg
        ? localizePath(surface.noActiveOrgPrimaryHref ?? "/dashboard", locale)
        : localizePath(surface.permissionDeniedPrimaryHref ?? "/dashboard", locale)

      return {
        kind: "blocked",
        node: (
          <DashboardRouteState
            kind={noActiveOrg ? "no_active_org" : "permission_denied"}
            title={title}
            message={message}
            primaryHref={href}
          />
        ),
      }
    }

    throw error
  }

  return {
    kind: "allowed",
    context,
    locale,
  }
}

export async function withAnalyticsSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: AnalyticsRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: AnalyticsRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateAnalyticsRouteAccess(surface, params, permissionOptions)

  if (state.kind === "blocked") {
    return state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getAnalyticsRouteSurface(key)
}
