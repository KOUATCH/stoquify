"use client"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

export default function OwnerWarRoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardErrorState error={error} reset={reset} title="Owner War Room could not load" />
}
