import { getPayrollDeclarationWorkbenchAction } from "@/actions/payroll/payroll-control.actions"
import PayrollDeclarationWorkbench from "@/components/payroll/PayrollDeclarationWorkbench"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withPayrollSurfaceAccess } from "../payroll-route-access"

export const metadata = {
  title: "Payroll Declarations | Stoquify",
  description: "Payroll declaration lifecycle, authority evidence, and register proof.",
}

export default async function PayrollDeclarationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  const surface = routeByKey("payroll-declarations")

  if (!surface) {
    throw new Error("Missing payroll route surface definition: payroll-declarations")
  }

  return withPayrollSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async () => {
      const result = await getPayrollDeclarationWorkbenchAction({ limit: 80 })

      return (
        <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
            <PayrollDeclarationWorkbench
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
