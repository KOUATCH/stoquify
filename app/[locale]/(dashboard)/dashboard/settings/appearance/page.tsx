import { pickLocale } from "@/i18n/routing"
import AppearanceSettingsClient from "./AppearanceSettingsClient"

export const metadata = {
  title: "Appearance Settings | StockFlow",
  description: "Review and update the active dashboard theme mode.",
}

export default async function AppearanceSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)

  return (
    <div className="dashboard-landing-theme min-h-screen overflow-x-hidden">
      <div className="dashboard-landing-content mx-auto flex w-full max-w-[88rem] min-w-0 flex-col gap-6 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        <AppearanceSettingsClient locale={locale} />
      </div>
    </div>
  )
}
