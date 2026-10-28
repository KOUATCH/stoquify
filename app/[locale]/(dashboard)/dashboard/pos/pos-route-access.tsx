import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import {
  RbacError,
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
} from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type { PosRouteSurface, PermissionMode } from "./pos-route-data-access"
import { getPosRouteSurface } from "./pos-route-data-access"

type PosRouteContext = Awaited<ReturnType<typeof requirePermission>>

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type PosRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: PosRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"

function getPermissionMode(surface: PosRouteSurface): PermissionMode {
  return surface.permissionMode ?? "single"
}

async function evaluatePosRouteAccess(
  surface: PosRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<PosRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)
  let context: PosRouteContext
  const options: PermissionInput = {
    resource: permissionOptions.resource ?? surface.resource,
    resourceId: permissionOptions.resourceId,
    auditAllowed: permissionOptions.auditAllowed ?? true,
  }

  try {
    const mode = getPermissionMode(surface)
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
            message={noActiveOrg ? surface.noActiveOrgMessage : surface.permissionDeniedMessage}
            primaryHref={localizePath(
              noActiveOrg
                ? surface.noActiveOrgPrimaryHref ?? "/dashboard"
                : surface.permissionDeniedPrimaryHref ?? "/dashboard",
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

export async function withPosSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: PosRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: PosRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluatePosRouteAccess(surface, params, permissionOptions)

  if (state.kind === "blocked") {
    return state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getPosRouteSurface(key)
}
