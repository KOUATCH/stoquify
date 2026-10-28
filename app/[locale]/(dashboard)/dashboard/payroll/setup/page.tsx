import {
  generatePayrollSeedBackfillDryRunPlanAction,
  getPayrollSetupEvidenceReadModelAction,
  getPayrollSetupReadinessAction,
} from "@/actions/payroll/payroll-setup.actions"
import PayrollSetupControlPlane from "@/components/payroll/PayrollSetupControlPlane"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withPayrollSurfaceAccess } from "../payroll-route-access"

type SetupSearchParams = Record<string, string | string[] | undefined>

export const metadata = {
  title: "Payroll Setup | Stoquify",
  description:
    "Payroll setup readiness, accounting dependency checks, country-pack capability, and seed/backfill dry-run plan.",
}

export default async function PayrollSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<SetupSearchParams>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  const surface = routeByKey("payroll-setup")

  if (!surface) {
    throw new Error("Missing payroll route surface definition: payroll-setup")
  }

  return withPayrollSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async () => {
      const setupInput = (await searchParams) ?? {}
      const [readinessResult, planResult, evidenceResult] = await Promise.all([
        getPayrollSetupReadinessAction(setupInput),
        generatePayrollSeedBackfillDryRunPlanAction({
          ...setupInput,
          dryRun: true,
        }),
        getPayrollSetupEvidenceReadModelAction(setupInput),
      ])

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
      )
    },
  })
}
