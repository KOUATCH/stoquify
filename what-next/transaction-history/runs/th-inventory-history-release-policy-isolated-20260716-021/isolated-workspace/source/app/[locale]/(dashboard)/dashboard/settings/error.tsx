"use client"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardErrorState error={error} reset={reset} title="Settings could not load" />
}
