import LocationsManagementDashboard from "@/components/locations/LocationsManagementDashboard"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

interface EditLocationPageProps {
  params: Promise<{ locale: string; id: string }>
}

export const metadata = {
  title: "Edit Location | StockFlow",
  description: "Edit an organization location with operating policies and management settings.",
}

export default async function EditLocationPage({ params }: EditLocationPageProps) {
  const { locale: rawLocale, id } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()

  if (!user.organizationId) {
    redirect(localizePath("/unauthorized", locale))
  }

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <LocationsManagementDashboard
          organizationId={user.organizationId}
          locale={locale}
          initialEditId={id}
        />
      </div>
    </div>
  )
}
