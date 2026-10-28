import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type { PeopleRouteSurface } from "./people-route-data-access"
import { getPeopleRouteSurface } from "./people-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type PermissionMode = "single" | "all" | "any"
type PeopleRouteContext = Awaited<ReturnType<typeof requirePermission>>

type PeopleRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: PeopleRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"

async function evaluatePeopleRouteAccess(
  surface: PeopleRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<PeopleRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)

  let context: PeopleRouteContext
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
            message={noActiveOrg ? surface.noActiveOrgMessage ?? "" : surface.permissionDeniedMessage ?? ""}
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

  return {
    kind: "allowed",
    context,
    locale,
  }
}

export async function withPeopleSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: PeopleRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: PeopleRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluatePeopleRouteAccess(surface, params, permissionOptions)
  if (state.kind === "blocked") {
    return state.node
  }
  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getPeopleRouteSurface(key)
}
