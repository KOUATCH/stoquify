"use client"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"
import { startTransition } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"

export default function AnalyticsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const locale = useLocale() === "fr" ? "fr" : "en"
  const t = useTranslations("analyticsRecovery")
  const retry = () => startTransition(() => {
    // Reset alone re-renders the cached failed Server Component payload.
    router.refresh()
    reset()
  })
  return <div role="alert"><DashboardErrorState locale={locale} reset={retry} title={t("errorTitle")} message={t("errorMessage")} retryLabel={t("retry")} dashboardHref={`/${locale}/dashboard`} /></div>
}
