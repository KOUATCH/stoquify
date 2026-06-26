"use client"

import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState"

export default function CustomersError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardErrorState error={error} reset={reset} title="Customers could not load" />
}
