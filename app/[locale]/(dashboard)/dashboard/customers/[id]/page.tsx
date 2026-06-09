import CustomerManagementDashboard from "@/components/customers/CustomerManagementDashboard"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

interface CustomerAnalyticsPageProps {
  params: Promise<{ locale: string; id: string }>
}

export const metadata = {
  title: "Customer Analytics | StockFlow",
  description: "Review customer sales activity, receivable ledger, payments, and exposure.",
}

export default async function CustomerAnalyticsPage({ params }: CustomerAnalyticsPageProps) {
  const { locale: rawLocale, id } = await params
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
          initialAnalyticsId={id}
        />
      </div>
    </div>
  )
}
