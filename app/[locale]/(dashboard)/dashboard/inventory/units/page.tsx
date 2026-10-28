import UnitsManagementDashboard from "@/components/units/UnitsManagementDashboard"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"
import { routeByKey, withInventorySurfaceAccess } from "../inventory-route-access"

export const metadata = {
  title: "Units | Stoquify",
  description: "Manage organization measurement units, conversions, status, and item usage.",
}

async function UnitsPageImpl({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  await checkPermission("inventory.units.read")
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



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-units")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-units")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => UnitsPageImpl(props),
  })
}
