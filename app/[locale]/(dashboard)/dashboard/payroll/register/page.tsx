import { getPayrollRegisterAction } from "@/actions/payroll/payroll-register.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import PayrollRegisterTieOut from "@/components/payroll/PayrollRegisterTieOut"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export const metadata = {
  title: "Payroll Register | StockFlow",
  description: "Payroll register tie-out for payslips, ledger, payments, declarations, and close evidence.",
}

export default async function PayrollRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ runId?: string }>
}) {
  const { locale: rawLocale } = await params
  const { runId } = await searchParams
  const locale = pickLocale(rawLocale)

  try {
    const ctx = await requireAnyPermission(["payroll.reports.read"], {
      resource: "PayrollRegister",
    })
    const moduleDecision = await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll/register",
      accessIntent: "read",
      mode: "enforce",
    })

    if (!moduleDecision.allowed) {
      return (
        <DashboardRouteState
          kind="permission_denied"
          title="Payroll register is not enabled for this organization"
          message="Enable the Payroll module before opening register evidence. The module entitlement denial was audited."
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
          title={noActiveOrg ? "Payroll register needs an active organization" : "Payroll register is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so the payroll register can load tenant-scoped evidence."
              : "Payroll register tie-out requires payroll report access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }

    throw error
  }

  const result = await getPayrollRegisterAction({ payrollRunId: runId, limit: 100 })

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <PayrollRegisterTieOut
          data={result.success ? result.data : null}
          error={result.success ? null : result.error}
          locale={locale}
        />
      </div>
    </div>
  )
}
