"use client"

import { useParams } from "next/navigation"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

function dashboardHrefFromParams(params: ReturnType<typeof useParams>) {
  const rawLocale = params?.locale
  const locale = Array.isArray(rawLocale) ? rawLocale[0] : rawLocale

  return `/${locale === "fr" ? "fr" : "en"}/dashboard`
}

export default function DashboardShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()

  return (
    <DashboardErrorState
      error={error}
      reset={reset}
      dashboardHref={dashboardHrefFromParams(params)}
    />
  )
}