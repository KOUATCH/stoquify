import { getPayrollCommandReadModelAction } from "@/actions/payroll/payroll-command-read-model.actions"
import PayrollCommandCenter from "@/components/payroll/PayrollCommandCenter"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withPayrollSurfaceAccess } from "./payroll-route-access"

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

  const surface = routeByKey("payroll-dashboard")

  if (!surface) {
    throw new Error("Missing payroll route surface definition: payroll-dashboard")
  }

  return withPayrollSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async (ctx) => {
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
    },
  })
}
