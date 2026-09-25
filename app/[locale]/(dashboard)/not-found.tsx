"use client"

import { useParams } from "next/navigation"

import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"

export default function DashboardNotFound() {
  const params = useParams<{ locale?: string | string[] }>()
  const rawLocale = params?.locale
  const locale = Array.isArray(rawLocale) ? rawLocale[0] : rawLocale
  const resolvedLocale = locale === "fr" ? "fr" : "en"

  return (
    <DashboardRouteState
      kind="not_found"
      primaryHref={`/${resolvedLocale}/dashboard`}
      primaryLabel={resolvedLocale === "fr" ? "Retour au tableau de bord" : "Back to dashboard"}
      secondaryHref={`/${resolvedLocale}/dashboard/owner-war-room`}
      secondaryLabel={resolvedLocale === "fr" ? "Ouvrir le pilotage de la direction" : "Open owner war room"}
    />
  )
}