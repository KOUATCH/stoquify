"use client"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardErrorState error={error} reset={reset} title="Analytics could not load" />
}
