"use client"

import { useLocale, useTranslations } from "next-intl"

import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState"

export default function MasterDataOnboardingLoading() {
  const locale = useLocale() === "fr" ? "fr" : "en"
  const t = useTranslations("masterDataOnboarding.states.loading")
  return <DashboardLoadingState embedded locale={locale} title={t("title")} subtitle={t("message")} />
}
