import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import SupplierManagementDashboard from "@/components/suppliers/SupplierManagementDashboard"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

interface EditPurchaseSupplierPageProps {
  params: Promise<{ locale: string; id: string }>
}

export const metadata = {
  title: "Edit Supplier | Stoquify",
  description: "Edit supplier identity, contact, terms, language, and active state.",
}

export default async function EditPurchaseSupplierPage({ params }: EditPurchaseSupplierPageProps) {
  const { locale: rawLocale, id } = await params
  const locale = pickLocale(rawLocale)
  let ctx: Awaited<ReturnType<typeof requirePermission>>

  try {
    ctx = await requirePermission("purchases.suppliers.update", {
      resource: "SupplierManagement",
      resourceId: id,
      auditAllowed: true,
    })
    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "purchasing",
      surfaceType: "page",
      surface: "/dashboard/purchases/suppliers/[id]/edit",
      accessIntent: "write",
      mode: "observe",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Supplier editing needs an active organization" : "Supplier editing is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so purchasing can load tenant-scoped supplier editing."
              : "Editing suppliers requires purchasing supplier update access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard/purchases/suppliers", locale)}
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
          initialEditId={id}
        />
      </div>
    </div>
  )
}