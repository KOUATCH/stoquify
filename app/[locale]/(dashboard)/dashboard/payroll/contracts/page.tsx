import { getEmployeeContractWorkflowAction } from "@/actions/payroll/payroll-contract.actions"
import PayrollContractLifecycleWorkbench from "@/components/payroll/PayrollContractLifecycleWorkbench"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withPayrollSurfaceAccess } from "../payroll-route-access"

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

  const surface = routeByKey("payroll-contracts")

  if (!surface) {
    throw new Error("Missing payroll route surface definition: payroll-contracts")
  }

  return withPayrollSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async () => {
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
    },
  })
}
