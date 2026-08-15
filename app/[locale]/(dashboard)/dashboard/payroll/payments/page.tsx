import { getPayrollEmployeeBalanceWorkbenchAction } from "@/actions/payroll/payroll-control.actions"
import { getPayrollPaymentReconciliationAction } from "@/actions/payroll/payroll-payment-reconciliation.actions"
import PayrollEmployeeBalanceWorkbench from "@/components/payroll/PayrollEmployeeBalanceWorkbench"
import PayrollPaymentReconciliationWorkbench from "@/components/payroll/PayrollPaymentReconciliationWorkbench"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withPayrollSurfaceAccess } from "../payroll-route-access"

export const metadata = {
  title: "Payroll Payments | Stoquify",
  description: "Payroll payment reconciliation, settlement proof, employee recovery, and close readiness.",
}

export default async function PayrollPaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  const surface = routeByKey("payroll-payments")

  if (!surface) {
    throw new Error("Missing payroll route surface definition: payroll-payments")
  }

  return withPayrollSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    onAllowed: async () => {
      const [reconciliationResult, balanceResult] = await Promise.all([
        getPayrollPaymentReconciliationAction({ limit: 80 }),
        getPayrollEmployeeBalanceWorkbenchAction({ limit: 80 }),
      ])

      return (
        <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
            <PayrollPaymentReconciliationWorkbench
              data={reconciliationResult.success ? reconciliationResult.data : null}
              error={reconciliationResult.success ? null : reconciliationResult.error}
              locale={locale}
            />
            <div className="border-t border-white/10 pt-4">
              <PayrollEmployeeBalanceWorkbench
                data={balanceResult.success ? balanceResult.data : null}
                error={balanceResult.success ? null : balanceResult.error}
                locale={locale}
              />
            </div>
          </div>
        </div>
      )
    },
  })
}
