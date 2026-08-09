import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getLocale } from "next-intl/server"
import type { ReactNode } from "react"

export default async function CustomersLayout({ children }: { children: ReactNode }) {
  await checkPermission("customers.read")
  const [user, locale] = await Promise.all([
    getAuthenticatedUser(),
    getLocale().then(pickLocale),
  ])
  const moduleDecision = await observeModuleAccess({
    organizationId: user.organizationId,
    userId: user.id,
    actorPermissions: user.permissions,
    moduleSlug: "sales",
    surfaceType: "page",
    surface: "/dashboard/customers",
    accessIntent: "read",
    mode: "enforce",
    audit: true,
  })

  if (!moduleDecision.allowed) {
    return (
      <DashboardRouteState
        kind="locked_module"
        title="Customer workflows are not enabled for this organization"
        message="Enable the Sales module before using customer records, orders, analytics, or exports. The entitlement denial was audited."
        primaryHref={localizePath("/dashboard", locale)}
      />
    )
  }

  return <>{children}</>
}
