
import LocationsManagementDashboard from "@/components/locations/LocationsManagementDashboard"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"
import { routeByKey, withSettingsSurfaceAccess } from "../settings-route-access"

export const metadata = {
  title: "Locations | Stoquify",
  description: "Manage organization locations, stock policies, POS activity, and movement counters.",
}

async function LocationsPageImpl({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  await checkPermission("locations.read")
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
        />
      </div>
    </div>
  )
}



export default async function SettingsRoutePage(props: any = {}) {
  const surface = routeByKey("settings-locations")

  if (!surface) {
    throw new Error("Missing settings route surface definition: settings-locations")
  }

  return withSettingsSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => LocationsPageImpl(props),
  })
}
