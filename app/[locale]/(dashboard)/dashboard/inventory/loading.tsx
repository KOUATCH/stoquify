"use client"

import { useLocale } from "next-intl"
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState"

export default function InventoryLoading() {
  const locale = useLocale() === "fr" ? "fr" : "en"
  return <DashboardLoadingState embedded locale={locale} title={locale === "fr" ? "Préparation de l’espace de stock" : "Preparing inventory workspace"} />
}
