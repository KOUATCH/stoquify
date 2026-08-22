import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAllPermissions, requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { RbacContext } from "@/lib/security/rbac"
import type { Locale } from "@/types/bilingual"

import type {
  PermissionMode,
  SettingsRouteSurface,
  SettingsRouteSurfaceModule,
} from "./settings-route-data-access"
import { getSettingsRouteSurface } from "./settings-route-data-access"

type PermissionInput = {
  resource?: string
  resourceId?: string
  auditAllowed?: boolean
}

type SettingsRouteContext = RbacContext

type SettingsRouteAccessResult =
  | {
      kind: "blocked"
      node: ReactNode
    }
  | {
      kind: "allowed"
      context: SettingsRouteContext
      locale: Locale
    }

const ACCESS_COPY = {
  en: {
    noActiveOrgEyebrow: "Organization required",
    noActiveOrgTitleSuffix: "needs an active organization",
    noActiveOrgMessage: "Refresh your session from the dashboard so this route can load tenant-scoped settings data.",
    permissionEyebrow: "Permission required",
    permissionTitleSuffix: "is not available for this role",
    permissionMessage: "This route is protected by the server permission layer and cannot be loaded without the required access.",
    moduleEyebrow: "Module locked",
    moduleTitleSuffix: "is not enabled for this tenant",
    moduleMessage: "This workflow is protected by a module entitlement gate. Enable the required module before using this surface.",
    dashboardLabel: "Back to dashboard",
  },
  fr: {
    noActiveOrgEyebrow: "Organisation requise",
    noActiveOrgTitleSuffix: "nécessite une organisation active",
    noActiveOrgMessage: "Actualisez votre session depuis le tableau de bord pour charger les données de paramètres propres à l’organisation.",
    permissionEyebrow: "Autorisation requise",
    permissionTitleSuffix: "n’est pas disponible pour ce rôle",
    permissionMessage: "Cette page est protégée par les autorisations du serveur et ne peut pas être chargée sans l’accès requis.",
    moduleEyebrow: "Module verrouillé",
    moduleTitleSuffix: "n’est pas activée pour cette organisation",
    moduleMessage: "Ce workflow est protégé par les droits du module. Activez le module requis avant d’utiliser cette page.",
    dashboardLabel: "Retour au tableau de bord",
  },
} as const

function getModuleRequirements(surface: SettingsRouteSurface): SettingsRouteSurfaceModule[] {
  if (surface.modules && surface.modules.length > 0) return surface.modules
  return surface.module ? [surface.module] : []
}

async function evaluateSettingsRouteAccess(
  surface: SettingsRouteSurface,
  localePromise: Promise<{ locale: string }>,
  permissionOptions: PermissionInput = {},
): Promise<SettingsRouteAccessResult> {
  const { locale: rawLocale } = await localePromise
  const locale = pickLocale(rawLocale)
  const copy = ACCESS_COPY[locale]
  const surfaceTitle = locale === "fr" ? (surface.titleFr ?? surface.title) : surface.title

  let context: SettingsRouteContext

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
            eyebrow={noActiveOrg ? copy.noActiveOrgEyebrow : copy.permissionEyebrow}
            title={noActiveOrg ? `${surfaceTitle} ${copy.noActiveOrgTitleSuffix}` : `${surfaceTitle} ${copy.permissionTitleSuffix}`}
            message={noActiveOrg ? copy.noActiveOrgMessage : copy.permissionMessage}
            primaryHref={localizePath("/dashboard", locale)}
            primaryLabel={copy.dashboardLabel}
          />
        ),
      }
    }

    throw error
  }

  const modules = getModuleRequirements(surface)

  for (const moduleRequirement of modules) {
    const decision = await observeModuleAccess({
      organizationId: context.orgId,
      userId: context.userId,
      actorPermissions: context.permissions,
      moduleSlug: moduleRequirement.moduleSlug,
      surfaceType: "page",
      surface: moduleRequirement.surface,
      accessIntent: moduleRequirement.accessIntent ?? "read",
      mode: moduleRequirement.mode ?? "observe",
      audit: true,
    })

    if (!decision.allowed) {
      return {
        kind: "blocked",
        node: (
          <DashboardRouteState
            kind="locked_module"
            eyebrow={copy.moduleEyebrow}
            title={moduleRequirement.moduleLockedTitle ?? `${surfaceTitle} ${copy.moduleTitleSuffix}`}
            message={moduleRequirement.moduleLockedMessage ?? copy.moduleMessage}
            primaryHref={localizePath("/dashboard", locale)}
            primaryLabel={copy.dashboardLabel}
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

export async function withSettingsSurfaceAccess({
  params,
  surface,
  permissionOptions,
  onAllowed,
}: {
  params: Promise<{ locale: string }>
  surface: SettingsRouteSurface
  permissionOptions?: PermissionInput
  onAllowed: (context: SettingsRouteContext, locale: Locale) => Promise<ReactNode> | ReactNode
}) {
  const state = await evaluateSettingsRouteAccess(surface, params, permissionOptions)

  if (state.kind === "blocked") {
    return state.node
  }

  return onAllowed(state.context, state.locale)
}

export function routeByKey(key: string) {
  return getSettingsRouteSurface(key)
}
