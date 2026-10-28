import TaxRatesManagementDashboard from "@/components/tax-rates/TaxRatesManagementDashboard"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"
import { routeByKey, withSettingsSurfaceAccess } from "../../settings-route-access"

export const metadata = {
  title: "Create Tax Rate | Stoquify",
  description: "Create an organization tax rate for item, sales, purchasing, and reporting workflows.",
}

async function CreateTaxRatePageImpl({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  await checkPermission("taxes.create")
  const user = await getAuthenticatedUser()

  if (!user.organizationId) {
    redirect(localizePath("/unauthorized", locale))
  }

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <TaxRatesManagementDashboard
          organizationId={user.organizationId}
          locale={locale}
          initialAction="create"
        />
      </div>
    </div>
  )
}



export default async function SettingsRoutePage(props: any = {}) {
  const surface = routeByKey("settings-tax-rates-create")

  if (!surface) {
    throw new Error("Missing settings route surface definition: settings-tax-rates-create")
  }

  return withSettingsSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => CreateTaxRatePageImpl(props),
  })
}
