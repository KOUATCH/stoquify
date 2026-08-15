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

const NO_ACTIVE_ORG_TITLE_SUFFIX = "needs an active organization"
const PERMISSION_DENIED_TITLE_SUFFIX = "is not available for this role"
const NO_ACTIVE_ORG_MESSAGE =
  "Refresh your session from the dashboard so this route can load tenant-scoped settings data."
const PERMISSION_DENIED_MESSAGE =
  "This route is protected by the server permission layer and cannot be loaded without the required access."
const DEFAULT_MODULE_LOCKED_TITLE_SUFFIX = "is not enabled for this tenant"
const DEFAULT_MODULE_LOCKED_MESSAGE =
  "This workflow is protected by a module entitlement gate. Enable the required module before using this surface."

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
            title={noActiveOrg ? `${surface.title} ${NO_ACTIVE_ORG_TITLE_SUFFIX}` : `${surface.title} ${PERMISSION_DENIED_TITLE_SUFFIX}`}
            message={noActiveOrg ? NO_ACTIVE_ORG_MESSAGE : PERMISSION_DENIED_MESSAGE}
            primaryHref={localizePath("/dashboard", locale)}
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
            title={moduleRequirement.moduleLockedTitle ?? `${surface.title} ${DEFAULT_MODULE_LOCKED_TITLE_SUFFIX}`}
            message={moduleRequirement.moduleLockedMessage ?? DEFAULT_MODULE_LOCKED_MESSAGE}
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
