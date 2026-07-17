import { getEmployeeContractWorkflowAction } from "@/actions/payroll/payroll-contract.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import PayrollContractLifecycleWorkbench from "@/components/payroll/PayrollContractLifecycleWorkbench"
import { localizePath, pickLocale } from "@/i18n/routing"
import { RbacError, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

export const metadata = {
  title: "Payroll Contracts | Stoquify",
  description: "Employee contract lifecycle readiness for payroll eligibility, evidence, and salary redaction controls.",
}

export default async function PayrollContractsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  try {
    const ctx = await requireAnyPermission(["payroll.contracts.read"], {
      resource: "PayrollContract",
    })
    const moduleDecision = await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll/contracts",
      accessIntent: "read",
      mode: "enforce",
    })

    if (!moduleDecision.allowed) {
      return (
        <DashboardRouteState
          kind="permission_denied"
          title="Payroll contracts are not enabled for this organization"
          message="Enable the Payroll module before opening contract lifecycle readiness. The module entitlement denial was audited."
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
          title={noActiveOrg ? "Payroll contracts need an active organization" : "Payroll contracts are not available for this role"}
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so contract readiness can load tenant-scoped payroll evidence."
              : "Payroll contract readiness requires contract read access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", locale)}
        />
      )
    }

    throw error
  }

  const result = await getEmployeeContractWorkflowAction({})

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <PayrollContractLifecycleWorkbench
          data={result.success ? result.data : null}
          error={result.success ? null : result.error}
          locale={locale}
        />
      </div>
    </div>
  )
}
