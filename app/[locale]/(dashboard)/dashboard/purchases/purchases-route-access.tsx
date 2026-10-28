import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { RbacContext } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type {
  PurchasesRouteSurface,
  PurchasesRouteSurfaceCopy,
  PurchasesRouteSurfaceModule,
  PermissionMode,
} from "./purchases-route-data-access"
import { getPurchasesRouteSurface } from "./purchases-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type PurchasesRouteContext = RbacContext

type PurchasesRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: PurchasesRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const NO_ACTIVE_ORG_MESSAGE =
  "Refresh your session from the dashboard so this route can load tenant-scoped data."
const PERMISSION_DENIED_MESSAGE =
  "This route is protected by the server permission layer and cannot be loaded without the required access."
const DEFAULT_MODULE_LOCKED_TITLE_SUFFIX = "is not enabled for this tenant"
const DEFAULT_MODULE_LOCKED_MESSAGE =
  "This workflow is protected by a module entitlement gate. Enable the required module before using this surface."

function getModuleRequirements(surface: PurchasesRouteSurface): PurchasesRouteSurfaceModule[] {
  if (surface.modules && surface.modules.length > 0) return surface.modules
  return surface.module ? [surface.module] : []
}

function resolveSurfaceCopy(value: PurchasesRouteSurfaceCopy | undefined, locale: Locale, fallback: string) {
  if (typeof value === "string") return value
  return value?.[locale] ?? value?.en ?? fallback
}

async function evaluatePurchasesRouteAccess(
  surface: PurchasesRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<PurchasesRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)

  let context: PurchasesRouteContext

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
            title={
              noActiveOrg
                ? resolveSurfaceCopy(surface.noActiveOrgTitle, locale, `${surface.title} ${NO_ACTIVE_ORG_TITLE_SUFFIX}`)
                : resolveSurfaceCopy(surface.permissionDeniedTitle, locale, `${surface.title} ${PERMISSION_DENIED_TITLE_SUFFIX}`)
            }
            message={
              noActiveOrg
                ? resolveSurfaceCopy(surface.noActiveOrgMessage, locale, NO_ACTIVE_ORG_MESSAGE)
                : resolveSurfaceCopy(surface.permissionDeniedMessage, locale, PERMISSION_DENIED_MESSAGE)
            }
            primaryHref={localizePath(surface.primaryHref ?? "/dashboard", locale)}
          />
        ),
      }
    }

    throw error
  }

  const modules = getModuleRequirements(surface)

  for (const moduleRequirement of modules) {
    const moduleMode = moduleRequirement.mode ?? "observe"
    const decision = await observeModuleAccess({
      organizationId: context.orgId,
      userId: context.userId,
      actorPermissions: context.permissions,
      moduleSlug: moduleRequirement.moduleSlug,
      surfaceType: "page",
      surface: moduleRequirement.surface,
      accessIntent: moduleRequirement.accessIntent ?? "read",
      mode: moduleMode,
      audit: true,
    })

    if (moduleMode === "enforce" && !decision.allowed) {
      return {
        kind: "blocked",
        node: (
          <DashboardRouteState
            kind="locked_module"
            title={moduleRequirement.moduleLockedTitle ?? `${surface.title} ${DEFAULT_MODULE_LOCKED_TITLE_SUFFIX}`}
            message={moduleRequirement.moduleLockedMessage ?? DEFAULT_MODULE_LOCKED_MESSAGE}
            primaryHref={localizePath(surface.primaryHref ?? "/dashboard", locale)}
          />
        ),
      }
    }
  }

  return {
    kind: "allowed",
    context,
    locale,
  }
}

export async function withPurchasesSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: PurchasesRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: PurchasesRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluatePurchasesRouteAccess(surface, params, permissionOptions)

  if (state.kind === "blocked") {
    return state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getPurchasesRouteSurface(key)
}
