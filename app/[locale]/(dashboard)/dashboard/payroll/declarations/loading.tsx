import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState"

export default function PayrollDeclarationsLoading() {
  return (
    <DashboardLoadingState
      title="Preparing payroll declaration proof"
      subtitle="Loading declaration lifecycle, authority evidence, register proof, and redacted auditor proof facts."
    />
  )
}