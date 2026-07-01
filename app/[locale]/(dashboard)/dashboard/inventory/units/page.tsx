import UnitsManagementDashboard from "@/components/units/UnitsManagementDashboard"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Units | Stoquify",
  description: "Manage organization measurement units, conversions, status, and item usage.",
}

export default async function UnitsPage({
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
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <UnitsManagementDashboard organizationId={user.organizationId} locale={locale} />
      </div>
    </div>
  )
}
