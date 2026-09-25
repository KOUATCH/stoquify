"use client"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import { startTransition } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"

export default function InventoryError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const locale = useLocale() === "fr" ? "fr" : "en"
  const retry = () => startTransition(() => {
    router.refresh()
    reset()
  })
  return <div role="alert"><DashboardErrorState
    locale={locale}
    reset={retry}
    title={locale === "fr" ? "Impossible de charger l’inventaire" : "Inventory could not load"}
    message={locale === "fr" ? "Les données de l’inventaire n’ont pas pu être récupérées. Réessayez pour obtenir un résultat à jour." : "Inventory data could not be retrieved. Retry to load a current result."}
    retryLabel={locale === "fr" ? "Réessayer" : "Try again"}
    dashboardHref={`/${locale}/dashboard`}
  /></div>
}
