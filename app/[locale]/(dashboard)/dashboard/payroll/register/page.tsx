import { getPayrollRegisterAction } from "@/actions/payroll/payroll-register.actions"
import PayrollRegisterTieOut from "@/components/payroll/PayrollRegisterTieOut"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withPayrollSurfaceAccess } from "../payroll-route-access"

export const metadata = {
  title: "Payroll Register | Stoquify",
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
  const locale = pickLocale(rawLocale)

  const surface = routeByKey("payroll-register")

  if (!surface) {
    throw new Error("Missing payroll route surface definition: payroll-register")
  }

  return withPayrollSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async () => {
      const { runId } = await searchParams
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
    },
  })
}
