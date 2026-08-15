import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission, requireAllPermissions, requirePermission } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type { CashDrawerRouteSurface } from "./cash-drawer-route-data-access"
import { getCashDrawerRouteSurface } from "./cash-drawer-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type PermissionMode = "single" | "all" | "any"
type CashDrawerRouteContext = Awaited<ReturnType<typeof requirePermission>>

type CashDrawerRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: CashDrawerRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const NO_ACTIVE_ORG_MESSAGE =
  "Refresh your session from the dashboard so this surface can load tenant-scoped data."
const PERMISSION_DENIED_MESSAGE =
  "This route is protected by the server permission layer and cannot be loaded without the required access."

async function evaluateCashDrawerRouteAccess(
  surface: CashDrawerRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<CashDrawerRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)

  let context: CashDrawerRouteContext

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
            title={noActiveOrg ? `${surface.title} ${NO_ACTIVE_ORG_TITLE_SUFFIX}` : `${surface.title} ${PERMISSION_DENIED_TITLE_SUFFIX}`}
            message={noActiveOrg ? NO_ACTIVE_ORG_MESSAGE : PERMISSION_DENIED_MESSAGE}
            primaryHref={localizePath("/dashboard", locale)}
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

export async function withCashDrawerSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: CashDrawerRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: CashDrawerRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateCashDrawerRouteAccess(surface, params, permissionOptions)
  if (state.kind === "blocked") {
    return state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getCashDrawerRouteSurface(key)
}
