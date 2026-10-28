"use client"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

export default function InventoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardErrorState error={error} reset={reset} title="Inventory could not load" />
}
