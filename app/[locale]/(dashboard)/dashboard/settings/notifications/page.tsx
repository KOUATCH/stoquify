import { pickLocale } from "@/i18n/routing"
import NotificationsSettingsClient from "./NotificationsSettingsClient"

export const metadata = {
  title: "Notification Settings | Stoquify",
  description: "Review in-app notification provider state and sound preference.",
}

export default async function NotificationSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] min-w-0 flex-col gap-6 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        <NotificationsSettingsClient locale={locale} />
      </div>
    </div>
  )
}
