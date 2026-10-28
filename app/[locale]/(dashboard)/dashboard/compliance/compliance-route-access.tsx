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

import type { ComplianceRouteSurface, PermissionMode } from "./compliance-route-data-access"
import { getComplianceRouteSurface } from "./compliance-route-data-access"

type ComplianceRouteContext = Awaited<ReturnType<typeof requirePermission>>

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type ComplianceRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: ComplianceRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"

function getPermissionMode(surface: ComplianceRouteSurface): PermissionMode {
  return surface.permissionMode ?? "single"
}

async function evaluateComplianceRouteAccess(
  surface: ComplianceRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<ComplianceRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)
  let context: ComplianceRouteContext
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

export async function withComplianceSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: ComplianceRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: ComplianceRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateComplianceRouteAccess(surface, params, permissionOptions)

  if (state.kind === "blocked") {
    return state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getComplianceRouteSurface(key)
}
