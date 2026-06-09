import CustomerManagementDashboard from "@/components/customers/CustomerManagementDashboard"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Customers | StockFlow",
  description: "Manage customer records, receivables, sales activity, and customer analytics.",
}

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()

  if (!user.organizationId) {
    redirect(localizePath("/unauthorized", locale))
  }

  const basePath = `/${locale}/dashboard/customers`

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <CustomerManagementDashboard
          organizationId={user.organizationId}
          locale={locale}
          basePath={basePath}
        />
      </div>
    </div>
  )
}
