"use client"

import { useTranslations } from "next-intl"

import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState"

export default function MasterDataOnboardingLoading() {
  const t = useTranslations("masterDataOnboarding.states.loading")
  return <DashboardLoadingState title={t("title")} subtitle={t("message")} />
}
