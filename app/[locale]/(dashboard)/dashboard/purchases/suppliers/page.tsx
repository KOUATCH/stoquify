import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import SupplierManagementDashboard from "@/components/suppliers/SupplierManagementDashboard"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export const metadata = {
  title: "Suppliers | Stoquify",
  description: "Manage suppliers, purchasing readiness, terms, balances, item links, and analytics.",
}

export default async function PurchaseSuppliersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  let ctx: Awaited<ReturnType<typeof requirePermission>>

  try {
    ctx = await requirePermission("purchases.suppliers.read", {
      resource: "SupplierManagement",
      auditAllowed: true,
    })
    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "purchasing",
      surfaceType: "page",
      surface: "/dashboard/purchases/suppliers",
      accessIntent: "read",
      mode: "observe",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Supplier management needs an active organization" : "Supplier management is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so purchasing can load tenant-scoped supplier controls."
              : "Viewing suppliers requires purchasing supplier read access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard/purchases", locale)}
        />
      )
    }

    throw error
  }

  const basePath = `/${locale}/dashboard/purchases/suppliers`

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <SupplierManagementDashboard
          organizationId={ctx.orgId}
          locale={locale}
          basePath={basePath}
          canExport={ctx.isSuperUser || ctx.permissions.includes("reports.export")}
          canExportSensitive={ctx.isSuperUser}
        />
      </div>
    </div>
  )
}