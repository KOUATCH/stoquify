"use client"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

export default function DailyDigestError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardErrorState error={error} reset={reset} title="Daily Digest could not load" />
}
