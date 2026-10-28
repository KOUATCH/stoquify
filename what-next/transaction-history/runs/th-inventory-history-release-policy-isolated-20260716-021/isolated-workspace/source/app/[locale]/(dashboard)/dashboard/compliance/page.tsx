import {
  getComplianceCenterKernelSnapshotAction,
  type ComplianceCenterKernelSnapshot,
} from "@/actions/compliance/compliance-center.actions"
import { ComplianceCenterDashboard } from "@/components/compliance/ComplianceCenterDashboard"
import { checkPermission } from "@/config/useAuth"

export default async function ComplianceCenterPage() {
  await checkPermission("compliance.documents.read")

  const response = await getComplianceCenterKernelSnapshotAction({ limit: 50 })
  const initialData = response.success ? (response.data as ComplianceCenterKernelSnapshot) : null

  return (
    <ComplianceCenterDashboard
      initialData={initialData}
      initialError={response.success ? null : response.error}
      initialStatus={response.status}
    />
  )
}
