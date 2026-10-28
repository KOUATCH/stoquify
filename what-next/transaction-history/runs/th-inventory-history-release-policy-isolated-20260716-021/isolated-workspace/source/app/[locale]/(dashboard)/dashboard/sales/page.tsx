import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { Locale } from "@/types/bilingual"
import { getLocale } from "next-intl/server"

import SalesClientPage from "./SalesClientPage"

export default async function SalesPage() {
  const locale: Locale = pickLocale(await getLocale())

  try {
    const ctx = await requirePermission("sales.read", {
      resource: "SalesDashboard",
      auditAllowed: true,
    })

    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "sales",
      surfaceType: "page",
      surface: "/dashboard/sales",
      accessIntent: "read",
      mode: "observe",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Sales dashboard needs an active organization" : "Sales dashboard is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so sales can load tenant-scoped order and customer data."
              : "Viewing sales requires sales read access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }

    throw error
  }

  return <SalesClientPage />
}
