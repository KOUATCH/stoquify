import { getPayrollCommandReadModelAction } from "@/actions/payroll/payroll-command-read-model.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import PayrollCommandCenter from "@/components/payroll/PayrollCommandCenter"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export const metadata = {
  title: "Payroll Command Center | Stoquify",
  description: "Role-aware payroll command center for blockers, evidence, readiness, payment, declaration, posting, and close state.",
}

export default async function PayrollWorkbenchPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  try {
    const ctx = await requireAnyPermission(["payroll.command.read"], {
      resource: "PayrollCommandReadModel",
    })
    const moduleDecision = await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll",
      accessIntent: "read",
      mode: "enforce",
    })

    if (!moduleDecision.allowed) {
      return (
        <DashboardRouteState
          kind="permission_denied"
          title="HR and Payroll is not enabled for this organization"
          message="Enable the Payroll module before opening tenant-scoped HR and payroll evidence. The module entitlement denial was audited."
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
          title={noActiveOrg ? "Payroll needs an active organization" : "HR and Payroll is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so payroll can load tenant-scoped HR and payroll evidence."
              : "HR and Payroll requires payroll command read access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }

    throw error
  }

  const result = await getPayrollCommandReadModelAction({ limit: 25 })

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <PayrollCommandCenter
          data={result.success ? result.data : null}
          error={result.success ? null : result.error}
          locale={locale}
        />
      </div>
    </div>
  )
}