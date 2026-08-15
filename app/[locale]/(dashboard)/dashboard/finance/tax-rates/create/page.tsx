import TaxRatesManagementDashboard from "@/components/tax-rates/TaxRatesManagementDashboard"
import { withFinanceSurfaceAccess, routeByKey } from "../../finance-route-access"

export const metadata = {
  title: "Create Tax Rate | Stoquify",
  description: "Create an organization tax rate for item, sales, purchasing, and reporting workflows.",
}

export default async function CreateFinanceTaxRatePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("finance-tax-rates-create")

  if (!surface) {
    throw new Error("Missing finance route surface definition: finance-tax-rates-create")
  }

  return withFinanceSurfaceAccess({
    params,
    surface,
    onAllowed: (context, locale) => {
      return (
        <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
            <TaxRatesManagementDashboard organizationId={context.orgId} locale={locale} initialAction="create" />
          </div>
        </div>
      )
    },
  })
}

