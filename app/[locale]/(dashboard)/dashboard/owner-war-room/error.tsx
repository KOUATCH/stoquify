"use client"

import { startTransition } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

export default function CommandCenterError({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  const router = useRouter()
  const locale = useLocale() === "fr" ? "fr" : "en"
  const retry = () => startTransition(() => {router.refresh(); reset()})
  return <div role="alert"><DashboardErrorState locale={locale} reset={retry}
    title={locale === "fr" ? "Le tableau du dirigeant n’a pas pu être chargé" : "Owner War Room could not load"}
    message={locale === "fr" ? "Les anciennes preuves ne sont pas affichées. Réessayez pour vérifier les accès et recharger les sources." : "Previous evidence is not displayed. Retry to check access and reload sources."}
    retryLabel={locale === "fr" ? "Réessayer" : "Retry"} dashboardHref={`/${locale}/dashboard`} /></div>
}
