import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { getFinanceDashboardViewPermissions } from "@/services/finance/finance-dashboard-access"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
} from "@/services/modules/module-control-contracts"
import type { FinanceDashboardView } from "@/services/finance/finance-dashboard.schemas"

export type FinanceRouteParams = Promise<{ locale: string }>

export async function FinanceRouteAccess({
  params,
  permissions,
  resource,
  title,
  module,
  children,
}: {
  params: FinanceRouteParams
  permissions: readonly string[]
  resource: string
  title: string
  module?: {
    moduleSlug: CommercialModuleSlug
    surface: string
    accessIntent?: ModuleAccessIntent
  }
  children: ReactNode
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  let context: Awaited<ReturnType<typeof requireAnyPermission>>

  try {
    context = await requireAnyPermission(permissions, { resource })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? `${title} needs an active organization` : `${title} is not available for this role`}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so this finance surface can load tenant-scoped data."
              : "This finance surface is read-only, but it still requires the matching finance permission. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }

    throw error
  }

  if (module) {
    const decision = await observeModuleAccess({
      organizationId: context.orgId,
      userId: context.userId,
      actorPermissions: context.permissions,
      moduleSlug: module.moduleSlug,
      surfaceType: "page",
      surface: module.surface,
      accessIntent: module.accessIntent ?? "read",
      mode: "enforce",
      audit: true,
    })

    if (!decision.allowed) {
      return (
        <DashboardRouteState
          kind="locked_module"
          title={`${title} is not enabled for this tenant`}
          message="This workflow is protected by the payment reconciliation module entitlement. Enable the module before relying on cash, bank, card, or mobile-money reconciliation results here."
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }
  }

  return <>{children}</>
}

export function financeViewPermissions(view: FinanceDashboardView) {
  return getFinanceDashboardViewPermissions(view)
}
