import { getPaymentEvidenceReadinessAction } from "@/actions/payroll/payroll-payment-evidence.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import PayrollPaymentAttendanceReadinessWorkbench from "@/components/payroll/PayrollPaymentAttendanceReadinessWorkbench"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export const metadata = {
  title: "Payroll Attendance Readiness | Stoquify",
  description: "Payment destination evidence, HR proof references, and attendance freeze readiness before payroll payment release.",
}

export default async function PayrollAttendancePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  try {
    const ctx = await requireAnyPermission(["payroll.payment_destination.read"], {
      resource: "PayrollPaymentEvidenceReadiness",
    })
    const moduleDecision = await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll/attendance",
      accessIntent: "read",
      mode: "enforce",
    })

    if (!moduleDecision.allowed) {
      return (
        <DashboardRouteState
          kind="permission_denied"
          title="Payroll attendance readiness is not enabled for this organization"
          message="Enable the Payroll module before opening payment and attendance readiness. The module entitlement denial was audited."
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
          title={noActiveOrg ? "Payroll attendance readiness needs an active organization" : "Payroll attendance readiness is not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so payment and attendance readiness can load tenant-scoped payroll evidence."
              : "Payroll payment and attendance readiness requires payment destination read access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }

    throw error
  }

  const result = await getPaymentEvidenceReadinessAction({ limit: 80 })

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <PayrollPaymentAttendanceReadinessWorkbench
          data={result.success ? result.data : null}
          error={result.success ? null : result.error}
          locale={locale}
        />
      </div>
    </div>
  )
}