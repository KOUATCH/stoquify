"use client"

import { useLocale, useTranslations } from "next-intl"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

export default function MasterDataOnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("masterDataOnboarding.states.error")
  const locale = useLocale() === "fr" ? "fr" : "en"

  return (
    <DashboardErrorState
      error={error}
      reset={reset}
      title={t("title")}
      message={t("message")}
      retryLabel={t("retry")}
      dashboardHref={`/${locale}/dashboard`}
      dashboardLabel={t("dashboard")}
    />
  )
}
