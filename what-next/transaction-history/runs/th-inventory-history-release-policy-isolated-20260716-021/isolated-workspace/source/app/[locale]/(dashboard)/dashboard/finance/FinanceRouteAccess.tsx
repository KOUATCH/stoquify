import type { ReactNode } from "react"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { getFinanceDashboardViewPermissions } from "@/services/finance/finance-dashboard-access"
import type { FinanceDashboardView } from "@/services/finance/finance-dashboard.schemas"

export type FinanceRouteParams = Promise<{ locale: string }>

export async function FinanceRouteAccess({
  params,
  permissions,
  resource,
  title,
  children,
}: {
  params: FinanceRouteParams
  permissions: readonly string[]
  resource: string
  title: string
  children: ReactNode
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  try {
    await requireAnyPermission(permissions, { resource })
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

  return <>{children}</>
}

export function financeViewPermissions(view: FinanceDashboardView) {
  return getFinanceDashboardViewPermissions(view)
}
