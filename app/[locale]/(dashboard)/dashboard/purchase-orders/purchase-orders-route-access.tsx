import type { ReactNode } from "react"

import { DashboardRouteState, type DashboardRouteStateKind } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { RbacContext } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type {
  PurchaseOrdersRouteSurface,
  PurchaseOrdersRouteSurfaceModule,
  PermissionMode,
} from "./purchase-orders-route-data-access"
import { getPurchaseOrdersRouteSurface } from "./purchase-orders-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type PurchaseOrdersRouteContext = RbacContext

type PurchaseOrdersRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
      reason: DashboardRouteStateKind
      locale: Locale
    }
  | {
      kind: "allowed"
      context: PurchaseOrdersRouteContext
      locale: Locale
    }

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const NO_ACTIVE_ORG_MESSAGE =
  "Refresh your session from the dashboard so this route can load tenant-scoped data."
const PERMISSION_DENIED_MESSAGE =
  "This route is protected by the server permission layer and cannot be loaded without the required access."

function getModuleRequirements(surface: PurchaseOrdersRouteSurface): PurchaseOrdersRouteSurfaceModule[] {
  if (surface.modules && surface.modules.length > 0) return surface.modules
  return surface.module ? [surface.module] : []
}

async function evaluatePurchaseOrdersRouteAccess(
  surface: PurchaseOrdersRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<PurchaseOrdersRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)

  let context: PurchaseOrdersRouteContext

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
        reason: noActiveOrg ? "no_active_org" : "permission_denied",
        locale,
        node: (
          <DashboardRouteState
            kind={noActiveOrg ? "no_active_org" : "permission_denied"}
            title={locale === "fr" ? (noActiveOrg ? "Une organisation active est requise" : "Accès aux commandes fournisseurs refusé") : (noActiveOrg ? `${surface.title} ${NO_ACTIVE_ORG_TITLE_SUFFIX}` : `${surface.title} ${PERMISSION_DENIED_TITLE_SUFFIX}`)}
            message={locale === "fr" ? (noActiveOrg ? "Actualisez votre session depuis le tableau de bord pour accéder aux données de votre organisation." : "Votre rôle ne dispose pas des autorisations nécessaires pour accéder à cette page.") : (noActiveOrg ? NO_ACTIVE_ORG_MESSAGE : PERMISSION_DENIED_MESSAGE)}
            primaryHref={localizePath("/dashboard", locale)}
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
        reason: "locked_module",
        locale,
        node: (
          <DashboardRouteState
            kind="locked_module"
            title={moduleRequirement.moduleLockedTitle ?? (locale === "fr" ? "Les achats sont indisponibles" : "Purchasing is not available")}
            message={moduleRequirement.moduleLockedMessage ?? (locale === "fr" ? "L’accès actuel de votre organisation ne permet pas de consulter les commandes fournisseurs. Demandez à votre administrateur de vérifier la configuration." : "Your organization’s current access does not allow purchase-order reads. Ask your administrator to review the configuration.")}
            primaryHref={localizePath("/dashboard", locale)}
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

export async function withPurchaseOrdersSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
  onBlocked,
}: {
  params: Promise<{ locale: string }>
  surface: PurchaseOrdersRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: PurchaseOrdersRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
  onBlocked?: (kind: DashboardRouteStateKind, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluatePurchaseOrdersRouteAccess(surface, params, permissionOptions)

  if (state.kind === "blocked") {
    return onBlocked ? onBlocked(state.reason, state.locale) : state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getPurchaseOrdersRouteSurface(key)
}
