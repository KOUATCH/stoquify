import SupplierManagementDashboard from "@/components/suppliers/SupplierManagementDashboard"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

interface PurchaseSupplierAnalyticsPageProps {
  params: Promise<{ locale: string; id: string }>
}

export const metadata = {
  title: "Supplier Analytics | Stoquify",
  description: "Review supplier purchase activity, payable ledger, item links, and exposure.",
}

export default async function PurchaseSupplierAnalyticsPage({ params }: PurchaseSupplierAnalyticsPageProps) {
  const { locale: rawLocale, id } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()

  if (!user.organizationId) {
    redirect(localizePath("/unauthorized", locale))
  }

  const basePath = `/${locale}/dashboard/purchases/suppliers`

  return (
    <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <SupplierManagementDashboard
          organizationId={user.organizationId}
          locale={locale}
          basePath={basePath}
          initialAnalyticsId={id}
        />
      </div>
    </div>
  )
}
