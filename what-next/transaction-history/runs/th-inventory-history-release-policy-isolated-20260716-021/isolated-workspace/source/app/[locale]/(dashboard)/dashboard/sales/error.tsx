"use client"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

export default function SalesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardErrorState error={error} reset={reset} title="Sales could not load" />
}
