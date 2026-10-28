import { getPayrollEmployeeSourceDataAction } from "@/actions/payroll/payroll-employee.actions"
import PayrollEmployeeSourceWorkbench from "@/components/payroll/PayrollEmployeeSourceWorkbench"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withPayrollSurfaceAccess } from "../payroll-route-access"

export const metadata = {
  title: "Payroll Employees | Stoquify",
  description: "Employee source-data readiness for user mapping, contract evidence, attendance freeze, and payment destination proof.",
}

export default async function PayrollEmployeesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  const surface = routeByKey("payroll-employees")

  if (!surface) {
    throw new Error("Missing payroll route surface definition: payroll-employees")
  }

  return withPayrollSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async () => {
      const result = await getPayrollEmployeeSourceDataAction({ limit: 80 })

      return (
        <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
            <PayrollEmployeeSourceWorkbench
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
