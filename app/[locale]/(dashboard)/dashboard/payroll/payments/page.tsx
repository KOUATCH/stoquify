import { getPayrollEmployeeBalanceWorkbenchAction } from "@/actions/payroll/payroll-control.actions"
import { getPayrollPaymentReconciliationAction } from "@/actions/payroll/payroll-payment-reconciliation.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import PayrollEmployeeBalanceWorkbench from "@/components/payroll/PayrollEmployeeBalanceWorkbench"
import PayrollPaymentReconciliationWorkbench from "@/components/payroll/PayrollPaymentReconciliationWorkbench"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export const metadata = {
  title: "Payroll Payments | Stoquify",
  description: "Payroll payment reconciliation, settlement proof, employee recovery, and close readiness.",
}

export default async function PayrollPaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  try {
    const ctx = await requireAnyPermission(["payments.reconciliation.read"], {
      resource: "PayrollPaymentReconciliationWorkbench",
    })
    const moduleDecision = await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll/payments",
      accessIntent: "read",
      mode: "enforce",
    })

    if (!moduleDecision.allowed) {
      return (
        <DashboardRouteState
          kind="permission_denied"
          title="Payroll payments are not enabled for this organization"
          message="Enable the Payroll module before opening payment reconciliation, settlement proof, and employee balance recovery. The module entitlement denial was audited."
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
          title={noActiveOrg ? "Payroll payments need an active organization" : "Payroll payments are not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so payroll payment reconciliation can load tenant-scoped evidence."
              : "Payroll payments require payment reconciliation read access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }

    throw error
  }

  const [reconciliationResult, balanceResult] = await Promise.all([
    getPayrollPaymentReconciliationAction({ limit: 80 }),
    getPayrollEmployeeBalanceWorkbenchAction({ limit: 80 }),
  ])

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <PayrollPaymentReconciliationWorkbench
          data={reconciliationResult.success ? reconciliationResult.data : null}
          error={reconciliationResult.success ? null : reconciliationResult.error}
          locale={locale}
        />
        <div className="border-t border-white/10 pt-4">
          <PayrollEmployeeBalanceWorkbench
            data={balanceResult.success ? balanceResult.data : null}
            error={balanceResult.success ? null : balanceResult.error}
            locale={locale}
          />
        </div>
      </div>
    </div>
  )
}