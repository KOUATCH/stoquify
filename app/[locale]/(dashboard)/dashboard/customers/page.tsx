import CustomerManagementDashboard from "@/components/customers/CustomerManagementDashboard"
import { routeByKey, withCustomersSurfaceAccess } from "./customers-route-access"

export const metadata = {
  title: "Customers | Stoquify",
  description: "Manage customer records, receivables, sales activity, and customer analytics.",
}

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("customers-dashboard")

  if (!surface) {
    throw new Error("Missing customers route surface definition: customers-dashboard")
  }

  return withCustomersSurfaceAccess({
    params,
    surface,
    onAllowed: (context, locale) => {
      const basePath = `/${locale}/dashboard/customers`

      return (
        <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
            <CustomerManagementDashboard
              organizationId={context.orgId}
              locale={locale}
              basePath={basePath}
            />
          </div>
        </div>
      )
    },
  })
}
