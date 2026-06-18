import UnitsManagementDashboard from "@/components/units/UnitsManagementDashboard"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Create Unit | StockFlow",
  description: "Create a measurement unit for item, purchasing, sales, and POS workflows.",
}

export default async function CreateUnitPage({
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

  return (
    <div className="dashboard-landing-theme bee-eater-dashboard-theme dark min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <UnitsManagementDashboard
          organizationId={user.organizationId}
          locale={locale}
          initialAction="create"
        />
      </div>
    </div>
  )
}
