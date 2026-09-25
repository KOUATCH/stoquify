import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import {
  RbacError,
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
} from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type { ChangePasswordRouteSurface, PermissionMode } from "./change-password-route-data-access"
import { getChangePasswordRouteSurface } from "./change-password-route-data-access"

type ChangePasswordRouteContext = Awaited<ReturnType<typeof requirePermission>>

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type ChangePasswordRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: ChangePasswordRouteContext
      locale: Locale
    }

function getPermissionMode(surface: ChangePasswordRouteSurface): PermissionMode {
  return surface.permissionMode ?? "single"
}

async function evaluateChangePasswordRouteAccess(
  surface: ChangePasswordRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<ChangePasswordRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)
  let context: ChangePasswordRouteContext
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
      const t = await getTranslations({ locale, namespace: "passwordChange" })

      return {
        kind: "blocked",
        node: (
          <DashboardRouteState
            kind={noActiveOrg ? "no_active_org" : "permission_denied"}
            eyebrow={t(noActiveOrg ? "orgEyebrow" : "permissionEyebrow")}
            title={t(noActiveOrg ? "orgTitle" : "deniedTitle")}
            message={t(noActiveOrg ? "orgBody" : "deniedBody")}
            primaryLabel={t("cancel")}
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

export async function withChangePasswordSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: ChangePasswordRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: ChangePasswordRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateChangePasswordRouteAccess(surface, params, permissionOptions)

  if (state.kind === "blocked") {
    return state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getChangePasswordRouteSurface(key)
}
