import { getPayrollRunWorkbenchAction } from "@/actions/payroll/payroll-control.actions"
import PayrollRunWorkbench from "@/components/payroll/PayrollRunWorkbench"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withPayrollSurfaceAccess } from "../payroll-route-access"

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

  const surface = routeByKey("payroll-runs")

  if (!surface) {
    throw new Error("Missing payroll route surface definition: payroll-runs")
  }

  return withPayrollSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async () => {
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
    },
  })
}
