import {
  generatePayrollSeedBackfillDryRunPlanAction,
  getPayrollSetupEvidenceReadModelAction,
  getPayrollSetupReadinessAction,
} from "@/actions/payroll/payroll-setup.actions";
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState";
import PayrollSetupControlPlane from "@/components/payroll/PayrollSetupControlPlane";
import { localizePath, pickLocale } from "@/i18n/routing";
import { RbacError, requireAnyPermission } from "@/lib/security/rbac";
import { observeModuleAccess } from "@/services/modules/module-entitlement.service";

export const metadata = {
  title: "Payroll Setup | Stoquify",
  description:
    "Payroll setup readiness, accounting dependency checks, country-pack capability, and seed/backfill dry-run plan.",
};

type SetupSearchParams = Record<string, string | string[] | undefined>;

export default async function PayrollSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<SetupSearchParams>;
}) {
  const { locale: rawLocale } = await params;
  const locale = pickLocale(rawLocale);

  try {
    const ctx = await requireAnyPermission(["payroll.runs.calculate"], {
      resource: "PayrollSetupReadiness",
    });
    const moduleDecision = await observeModuleAccess({
      organizationId: ctx.orgId,
      userId: ctx.userId,
      actorPermissions: ctx.permissions,
      moduleSlug: "payroll",
      surfaceType: "page",
      surface: "/dashboard/payroll/setup",
      accessIntent: "read",
      mode: "enforce",
    });

    if (!moduleDecision.allowed) {
      return (
        <DashboardRouteState
          kind="permission_denied"
          title="Payroll setup is not enabled for this organization"
          message="Enable the Payroll module before opening setup readiness and dry-run planning. The module entitlement denial was audited."
          primaryHref={localizePath("/dashboard", locale)}
        />
      );
    }
  } catch (error) {
    if (error instanceof RbacError) {
      const noActiveOrg = error.code === "NO_ACTIVE_ORG";

      return (
        <DashboardRouteState
          kind={noActiveOrg ? "no_active_org" : "permission_denied"}
          title={
            noActiveOrg
              ? "Payroll setup needs an active organization"
              : "Payroll setup is not available for this role"
          }
          message={
            noActiveOrg
              ? "Refresh your session from the dashboard so setup readiness can load tenant-scoped payroll evidence."
              : "Payroll setup requires payroll process access. The denial was recorded by the RBAC guard."
          }
          primaryHref={localizePath("/dashboard", locale)}
        />
      );
    }

    throw error;
  }

  const setupInput = (await searchParams) ?? {};
  const [readinessResult, planResult, evidenceResult] = await Promise.all([
    getPayrollSetupReadinessAction(setupInput),
    generatePayrollSeedBackfillDryRunPlanAction({
      ...setupInput,
      dryRun: true,
    }),
    getPayrollSetupEvidenceReadModelAction(setupInput),
  ]);

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <PayrollSetupControlPlane
          readiness={readinessResult.success ? readinessResult.data : null}
          readinessError={
            readinessResult.success ? null : readinessResult.error
          }
          plan={planResult.success ? planResult.data : null}
          planError={planResult.success ? null : planResult.error}
          evidence={evidenceResult.success ? evidenceResult.data : null}
          evidenceError={evidenceResult.success ? null : evidenceResult.error}
        />
      </div>
    </div>
  );
}
