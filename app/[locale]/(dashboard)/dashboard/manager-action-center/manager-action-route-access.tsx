import type { ReactNode } from "react"

import { localizePath } from "@/i18n/routing"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type { ManagerActionRouteSurface } from "./manager-action-route-data-access"
import { getManagerActionRouteSurface } from "./manager-action-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type PermissionMode = "single" | "all" | "any"
type ManagerActionRouteContext = Awaited<ReturnType<typeof requirePermission>>

type ManagerActionRouteAccessState =
  | {
      kind: "allowed"
      context: ManagerActionRouteContext
      locale: Locale
      surface: ManagerActionRouteSurface
    }
  | {
      kind: "denied"
      noActiveOrg: boolean
      title: string
      message: string
      error: string
      href: string
      locale: Locale
      surface: ManagerActionRouteSurface
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const NO_ACTIVE_ORG_MESSAGE =
  "Refresh your session from the dashboard so this operating workspace can load tenant-scoped evidence."
const PERMISSION_DENIED_MESSAGE =
  "This operating workspace requires authorized role access."

function toLocale(rawLocale: string) {
  return rawLocale === "fr" ? "fr" : "en"
}

async function evaluateManagerActionRouteAccess(
  surface: ManagerActionRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<ManagerActionRouteAccessState> {
  const { locale: rawLocale } = await localePromise
  const locale = toLocale(rawLocale)
  const options: PermissionInput = {
    resource: permissionOptions.resource ?? surface.resource,
    resourceId: permissionOptions.resourceId,
    auditAllowed: permissionOptions.auditAllowed ?? true,
  }

  let context: ManagerActionRouteContext
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
      const href = localizePath(
        noActiveOrg ? surface.noActiveOrgPrimaryHref ?? "/dashboard" : surface.permissionDeniedPrimaryHref ?? "/dashboard",
        locale,
      )

      return {
        kind: "denied",
        noActiveOrg,
        title,
        message,
        error: error.message,
        href,
        locale,
        surface,
      }
    }

    throw error
  }

  return { kind: "allowed", context, locale, surface }
}

export async function withManagerActionSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
  onDenied,
}: {
  params: Promise<{ locale: string }>
  surface: ManagerActionRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: ManagerActionRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
  onDenied: (state: {
    noActiveOrg: boolean
    title: string
    message: string
    error: string
    href: string
    locale: Locale
    surface: ManagerActionRouteSurface
  }) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateManagerActionRouteAccess(surface, params, permissionOptions)

  if (state.kind === "denied") {
    return onDenied({
      noActiveOrg: state.noActiveOrg,
      title: state.title,
      message: state.message,
      error: state.error,
      href: state.href,
      locale: state.locale,
      surface: state.surface,
    })
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getManagerActionRouteSurface(key)
}
