import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type { OwnerWarRoomRouteSurface } from "./owner-war-room-route-data-access"
import { getOwnerWarRoomRouteSurface } from "./owner-war-room-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type PermissionMode = "single" | "all" | "any"
type OwnerWarRoomRouteContext = Awaited<ReturnType<typeof requirePermission>>

type OwnerWarRoomRouteDenial = {
  noActiveOrg: boolean
  title: string
  message: string
  href: string
}

type OwnerWarRoomRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
      denial: OwnerWarRoomRouteDenial
    }
  | {
      kind: "allowed"
      context: OwnerWarRoomRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const NO_ACTIVE_ORG_MESSAGE = "Refresh your session from the dashboard so the command center can load tenant-scoped evidence."
const PERMISSION_DENIED_MESSAGE =
  "This read-only tenant command center requires administrator-wide operating authority. The denial was recorded by the RBAC guard."

async function getOwnerWarRoomRouteDenial(
  surface: OwnerWarRoomRouteSurface,
  locale: Locale,
  error: RbacError,
): Promise<OwnerWarRoomRouteDenial> {
  const noActiveOrg = error.code === "NO_ACTIVE_ORG"
  const t = surface.key === "owner-war-room"
    ? await getTranslations({ locale, namespace: "ownerWorkspaceAccess" })
    : null

  return {
    noActiveOrg,
    title: noActiveOrg
      ? t?.("noActiveOrgTitle") ?? surface.noActiveOrgTitle ?? `${surface.title} ${NO_ACTIVE_ORG_TITLE_SUFFIX}`
      : t?.("deniedTitle") ?? surface.permissionDeniedTitle ?? `${surface.title} ${PERMISSION_DENIED_TITLE_SUFFIX}`,
    message: noActiveOrg
      ? t?.("noActiveOrgMessage") ?? surface.noActiveOrgMessage ?? NO_ACTIVE_ORG_MESSAGE
      : t?.("deniedMessage") ?? surface.permissionDeniedMessage ?? PERMISSION_DENIED_MESSAGE,
    href: localizePath(
      noActiveOrg
        ? surface.noActiveOrgPrimaryHref ?? "/dashboard"
        : surface.permissionDeniedPrimaryHref ?? "/dashboard",
      locale,
    ),
  }
}

function renderOwnerWarRoomRouteDenial(denial: OwnerWarRoomRouteDenial) {
  return (
    <DashboardRouteState
      kind={denial.noActiveOrg ? "no_active_org" : "permission_denied"}
      title={denial.title}
      message={denial.message}
      primaryHref={denial.href}
    />
  )
}

async function evaluateOwnerWarRoomRouteAccess(
  surface: OwnerWarRoomRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<OwnerWarRoomRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)

  let context: OwnerWarRoomRouteContext
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
      const denial = await getOwnerWarRoomRouteDenial(surface, locale, error)
      return {
        kind: "blocked",
        node: renderOwnerWarRoomRouteDenial(denial),
        denial,
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

export async function withOwnerWarRoomSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
  onDenied,
}: {
  params: Promise<{ locale: string }>
  surface: OwnerWarRoomRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: OwnerWarRoomRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
  onDenied?: (denial: OwnerWarRoomRouteDenial) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateOwnerWarRoomRouteAccess(surface, params, permissionOptions)
  if (state.kind === "blocked") {
    return onDenied ? onDenied(state.denial) : state.node
  }

  const decision = await observeModuleAccess({ organizationId: state.context.orgId, userId: state.context.userId, actorPermissions: state.context.permissions, moduleSlug: "dashboard", surfaceType: "page", surface: surface.route, accessIntent: "read", mode: "enforce", audit: true })
  if (!decision.allowed) {
    const t = await getTranslations({ locale: state.locale, namespace: "operatingWorkspaceAccess" })
    return <DashboardRouteState kind="locked_module" locale={state.locale} title={t("title")} message={t("message")} primaryHref={localizePath("/dashboard", state.locale)} />
  }

  try {
    return await onAllowed(state.context, state.locale)
  } catch (error) {
    if (error instanceof RbacError) {
      const denial = await getOwnerWarRoomRouteDenial(surface, state.locale, error)
      return onDenied ? onDenied(denial) : renderOwnerWarRoomRouteDenial(denial)
    }
    throw error
  }
}

export function routeByKey(key: string) {
  return getOwnerWarRoomRouteSurface(key)
}
