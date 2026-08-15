import UnitsManagementDashboard from "@/components/units/UnitsManagementDashboard"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"
import { routeByKey, withInventorySurfaceAccess } from "../../../inventory-route-access"

interface EditUnitPageProps {
  params: Promise<{ locale: string; id: string }>
}

export const metadata = {
  title: "Edit Unit | Stoquify",
  description: "Edit a measurement unit and its conversion settings.",
}

async function EditUnitPageImpl({ params }: EditUnitPageProps) {
  const { locale: rawLocale, id } = await params
  const locale = pickLocale(rawLocale)
  await checkPermission("inventory.units.update")
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
          initialEditId={id}
        />
      </div>
    </div>
  )
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-units-edit")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-units-edit")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => EditUnitPageImpl(props),
  })
}
