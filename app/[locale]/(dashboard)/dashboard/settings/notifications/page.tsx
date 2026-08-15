import { checkPermission } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import NotificationsSettingsClient from "./NotificationsSettingsClient"
import { routeByKey, withSettingsSurfaceAccess } from "../settings-route-access"

export const metadata = {
  title: "Notification Settings | Stoquify",
  description: "Review in-app notification provider state and sound preference.",
}

async function NotificationSettingsPageImpl({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  await checkPermission("communication.notifications.read")

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] min-w-0 flex-col gap-6 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        <NotificationsSettingsClient locale={locale} />
      </div>
    </div>
  )
}



export default async function SettingsRoutePage(props: any = {}) {
  const surface = routeByKey("settings-notifications")

  if (!surface) {
    throw new Error("Missing settings route surface definition: settings-notifications")
  }

  return withSettingsSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => NotificationSettingsPageImpl(props),
  })
}
