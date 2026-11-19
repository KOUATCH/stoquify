"use client"
import { useParams } from "next/navigation"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { localizePath, pickLocale } from "@/i18n/routing"
export default function PeopleError({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  const locale = pickLocale(String(useParams().locale ?? "en"))
  return <DashboardRouteState kind="error" locale={locale} primaryHref={localizePath("/dashboard",locale)}
    title={locale === "fr" ? "Impossible de charger le personnel" : "Could not load people"}
    message={locale === "fr" ? "Les résultats sont indisponibles. Réessayez en conservant vos filtres." : "Results are unavailable. Retry with your filters preserved."}
    actions={<button className="min-h-10 rounded-md border border-white/20 px-3 py-2" onClick={reset}>{locale === "fr" ? "Réessayer" : "Retry"}</button>} />
}
