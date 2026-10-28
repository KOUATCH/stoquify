import { getAPWorkbenchAction } from "@/actions/purchasing/ap-control.actions"
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import APControlWorkbench from "@/components/purchasing/APControlWorkbench"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export const metadata = {
  title: "AP Workbench | Stoquify",
  description: "Supplier AP ledger, payment, reconciliation, and country-pack control workbench.",
}

export default async function PurchasePayablesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  let ctx: Awaited<ReturnType<typeof requirePermission>>

  try {
    ctx = await requirePermission("purchasing.ap.invoice.view", {
      resource: "APWorkbench",
      auditAllowed: true,
    })
    await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "purchasing",
      surfaceType: "page",
      surface: "/dashboard/purchases/payables",
      accessIntent: "read",
      mode: "observe",
    })
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "AP workbench needs an active organization" : "AP workbench is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so purchasing can load tenant-scoped AP controls."
              : "Viewing the AP workbench requires purchasing AP read access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard/purchases", locale)}
        />
      )
    }

    throw error
  }

  const result = await getAPWorkbenchAction({ limit: 25 })

  if (!result.success) {
    return <DashboardErrorState error="AP workbench data unavailable" />
  }

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <APControlWorkbench
          data={result.data}
          error={null}
          locale={locale}
        />
      </div>
    </div>
  )
}