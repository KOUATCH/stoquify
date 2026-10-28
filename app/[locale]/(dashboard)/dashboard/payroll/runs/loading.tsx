import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState"

export default function PayrollRunsLoading() {
  return (
    <DashboardLoadingState
      title="Preparing payroll run proof"
      subtitle="Loading tenant-scoped run lifecycle, register, accounting, payment, and declaration evidence."
    />
  )
}