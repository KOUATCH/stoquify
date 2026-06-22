"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  analyticsContentClass,
  analyticsFilterClass,
  analyticsMutedTextClass,
  analyticsPageClass,
} from "@/components/analytics/dashboard/analytics-dashboard-theme"
import { AlertTriangle } from "lucide-react"

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className={analyticsPageClass}>
      <div className={analyticsContentClass}>
        <div className="dashboard-glass-panel mx-auto flex max-w-md flex-col items-center justify-center gap-3 rounded-lg px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-danger-soft)]">
            <AlertTriangle className="h-7 w-7 text-[var(--dash-danger)]" />
          </div>
          <p className="text-lg font-semibold text-[var(--dash-text)]">Failed to load analytics</p>
          <p className={`text-sm ${analyticsMutedTextClass}`}>
            {error.message ?? "An unexpected error occurred."}
          </p>
          <Button variant="outline" className={analyticsFilterClass} onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  )
}
