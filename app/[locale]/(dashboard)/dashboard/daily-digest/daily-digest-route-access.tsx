import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type { DailyDigestRouteSurface } from "./daily-digest-route-data-access"
import { getDailyDigestRouteSurface } from "./daily-digest-route-data-access"

type PermissionMode = "single" | "all" | "any"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type DailyDigestRouteContext = Awaited<ReturnType<typeof requirePermission>>

type DailyDigestRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: DailyDigestRouteContext
      locale: Locale
    }

async function evaluateDailyDigestRouteAccess(
  surface: DailyDigestRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<DailyDigestRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)

  let context: DailyDigestRouteContext
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
      const t = await getTranslations({ locale, namespace: "dailyDigestAccess" })
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"
      const forbidden = error.code === "FORBIDDEN"
      const signIn = error.code === "UNAUTHENTICATED" || error.code === "EMAIL_NOT_VERIFIED"
      const title = noActiveOrg
        ? surface.noActiveOrgTitle ?? t(`${error.code}.title`)
        : forbidden ? surface.permissionDeniedTitle ?? t(`${error.code}.title`) : t(`${error.code}.title`)
      const message = noActiveOrg
        ? surface.noActiveOrgMessage ?? t(`${error.code}.message`)
        : forbidden ? surface.permissionDeniedMessage ?? t(`${error.code}.message`) : t(`${error.code}.message`)
      const href = signIn
        ? `${localizePath("/login", locale)}?callbackUrl=${encodeURIComponent(localizePath(surface.route, locale))}`
        : noActiveOrg
        ? localizePath(surface.noActiveOrgPrimaryHref ?? "/dashboard", locale)
        : localizePath(surface.permissionDeniedPrimaryHref ?? "/dashboard", locale)

      return {
        kind: "blocked",
        node: (
          <DashboardRouteState
            kind={noActiveOrg ? "no_active_org" : error.code === "UNAUTHENTICATED" ? "stale_session" : "permission_denied"}
            locale={locale}
            title={title}
            message={message}
            primaryHref={href}
            primaryLabel={signIn ? t("signIn") : undefined}
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

export async function withDailyDigestSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: DailyDigestRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: DailyDigestRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateDailyDigestRouteAccess(surface, params, permissionOptions)

  if (state.kind === "blocked") {
    return state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getDailyDigestRouteSurface(key)
}
