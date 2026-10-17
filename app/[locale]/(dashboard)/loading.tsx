"use client"

import { useLocale } from "next-intl"
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState"

export default function DashboardLoader() {
  const locale = useLocale() === "fr" ? "fr" : "en"
  return <DashboardLoadingState locale={locale} title={locale === "fr" ? "Préparation du tableau de bord" : "Preparing dashboard command center"} />
}
