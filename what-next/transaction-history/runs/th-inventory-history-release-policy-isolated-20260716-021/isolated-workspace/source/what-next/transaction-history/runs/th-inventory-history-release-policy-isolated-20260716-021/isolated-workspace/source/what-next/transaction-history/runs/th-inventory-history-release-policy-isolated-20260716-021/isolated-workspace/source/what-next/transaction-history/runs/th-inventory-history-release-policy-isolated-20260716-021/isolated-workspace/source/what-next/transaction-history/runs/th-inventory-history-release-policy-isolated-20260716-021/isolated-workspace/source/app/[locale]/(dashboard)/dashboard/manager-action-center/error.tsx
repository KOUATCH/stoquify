"use client"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

export default function ManagerActionCenterError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardErrorState error={error} reset={reset} title="Manager Action Center could not load" />
}
