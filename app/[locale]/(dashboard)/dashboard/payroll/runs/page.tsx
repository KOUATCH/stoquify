import { getPayrollRunWorkbenchAction } from "@/actions/payroll/payroll-control.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import PayrollRunWorkbench from "@/components/payroll/PayrollRunWorkbench"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export const metadata = {
  title: "Payroll Runs | Stoquify",
  description: "Payroll run lifecycle, locked register proof, corrections, accounting, payment, and declaration readiness.",
}

export default async function PayrollRunsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  try {
    const ctx = await requireAnyPermission(["payroll.command.read"], {
      resource: "PayrollRunWorkbench",
    })
    const moduleDecision = await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll/runs",
      accessIntent: "read",
      mode: "enforce",
    })

    if (!moduleDecision.allowed) {
      return (
        <DashboardRouteState
          kind="permission_denied"
          title="Payroll runs are not enabled for this organization"
          message="Enable the Payroll module before opening run lifecycle, register proof, and accounting readiness. The module entitlement denial was audited."
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG"

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={noActiveOrg ? "Payroll runs need an active organization" : "Payroll runs are not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so run lifecycle proof can load tenant-scoped payroll evidence."
              : "Payroll runs require payroll command read access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }

    throw error
  }

  const result = await getPayrollRunWorkbenchAction({ limit: 80 })

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <PayrollRunWorkbench
          data={result.success ? result.data : null}
          error={result.success ? null : result.error}
          locale={locale}
        />
      </div>
    </div>
  )
}