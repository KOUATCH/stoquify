"use client"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

export default function POSError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardErrorState error={error} reset={reset} title="POS could not load" />
}
