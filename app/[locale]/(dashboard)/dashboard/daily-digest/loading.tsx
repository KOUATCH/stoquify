import { getLocale, getTranslations } from "next-intl/server"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"

export default async function DailyDigestLoading() {
  const [rawLocale, t] = await Promise.all([getLocale(), getTranslations("dailyDigestRecovery")])
  const locale = rawLocale === "fr" ? "fr" : "en"
  return <DashboardRouteState kind="loading" locale={locale} title={t("loadingTitle")} message={t("loadingMessage")} primaryHref={`/${locale}/dashboard`} />
}
