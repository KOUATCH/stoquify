import { getMyPayrollPayslipsAction } from "@/actions/payroll/payroll-payslip-self-service.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import PayrollPayslipSelfService from "@/components/payroll/PayrollPayslipSelfService"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export const metadata = {
  title: "My Payslips | Stoquify",
  description: "Employee payslip self-service with immutable payroll evidence.",
}

export default async function PayrollPayslipsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  try {
    const ctx = await requireAnyPermission(["payroll.payslips.self.read"], {
      resource: "PayrollPayslip",
    })
    const moduleDecision = await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll/payslips",
      accessIntent: "read",
      mode: "enforce",
    })

    if (!moduleDecision.allowed) {
      return (
        <DashboardRouteState
          kind="permission_denied"
          title="Payslips are not enabled for this organization"
          message="Enable the Payroll module before opening employee payslip evidence. The module entitlement denial was audited."
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
          title={noActiveOrg ? "Payslips need an active organization" : "Payslips are not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so payslips can load tenant-scoped payroll evidence."
              : "Employee payslips require own-payslip read access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }

    throw error
  }

  const result = await getMyPayrollPayslipsAction({ limit: 18 })

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <PayrollPayslipSelfService
          data={result.success ? result.data : null}
          error={result.success ? null : result.error}
          locale={locale}
        />
      </div>
    </div>
  )
}
