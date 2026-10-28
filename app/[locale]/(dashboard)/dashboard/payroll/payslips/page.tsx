import { getMyPayrollPayslipsAction } from "@/actions/payroll/payroll-payslip-self-service.actions"
import PayrollPayslipSelfService from "@/components/payroll/PayrollPayslipSelfService"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withPayrollSurfaceAccess } from "../payroll-route-access"

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

  const surface = routeByKey("payroll-payslips")

  if (!surface) {
    throw new Error("Missing payroll route surface definition: payroll-payslips")
  }

  return withPayrollSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async () => {
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
    },
  })
}
