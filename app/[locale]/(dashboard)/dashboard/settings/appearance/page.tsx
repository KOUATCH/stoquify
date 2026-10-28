import { checkPermission } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import AppearanceSettingsClient from "./AppearanceSettingsClient"
import { routeByKey, withSettingsSurfaceAccess } from "../settings-route-access"

export const metadata = {
  title: "Appearance Settings | Stoquify",
  description: "Review and update the active dashboard theme mode.",
}

async function AppearanceSettingsPageImpl({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  await checkPermission("DASHBOARD_READ")

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] min-w-0 flex-col gap-6 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        <AppearanceSettingsClient locale={locale} />
      </div>
    </div>
  )
}



export default async function SettingsRoutePage(props: any = {}) {
  const surface = routeByKey("settings-appearance")

  if (!surface) {
    throw new Error("Missing settings route surface definition: settings-appearance")
  }

  return withSettingsSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => AppearanceSettingsPageImpl(props),
  })
}
