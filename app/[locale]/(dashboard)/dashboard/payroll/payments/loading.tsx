import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState"

export default function PayrollPaymentsLoading() {
  return (
    <DashboardLoadingState
      title="Preparing payroll payment proof"
      subtitle="Loading payment reconciliation, settlement proof, provider evidence, and redacted auditor proof facts."
    />
  )
}