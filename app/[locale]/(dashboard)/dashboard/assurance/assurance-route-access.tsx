import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type { AssuranceRouteSurface, PermissionMode } from "./assurance-route-data-access"
import { getAssuranceRouteSurface } from "./assurance-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type AssuranceRouteContext = Awaited<ReturnType<typeof requirePermission>>

type AssuranceRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: AssuranceRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const NO_ACTIVE_ORG_MESSAGE =
  "Refresh your session from the dashboard so this assurance surface can load tenant-scoped evidence."
const PERMISSION_DENIED_MESSAGE =
  "This assurance surface requires the matching permission and cannot be loaded without an authorized role."

async function evaluateAssuranceRouteAccess(
  surface: AssuranceRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<AssuranceRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)

  let context: AssuranceRouteContext
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

export async function withAssuranceSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: AssuranceRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: AssuranceRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateAssuranceRouteAccess(surface, params, permissionOptions)

  if (state.kind === "blocked") {
    return state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getAssuranceRouteSurface(key)
}
