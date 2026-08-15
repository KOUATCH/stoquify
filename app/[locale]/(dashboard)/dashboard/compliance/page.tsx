import { routeByKey, withComplianceSurfaceAccess } from "./compliance-route-access"

import {
  getComplianceCenterKernelSnapshotAction,
  type ComplianceCenterKernelSnapshot,
} from "@/actions/compliance/compliance-center.actions"
import { ComplianceCenterDashboard } from "@/components/compliance/ComplianceCenterDashboard"

export default async function ComplianceCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("compliance-dashboard")

  if (!surface) {
    throw new Error("Missing compliance route surface definition: compliance-dashboard")
  }

  return withComplianceSurfaceAccess({
    params,
    surface,
    onAllowed: async () => {
      const response = await getComplianceCenterKernelSnapshotAction({ limit: 50 })
      const initialData = response.success ? (response.data as ComplianceCenterKernelSnapshot) : null

      return (
        <ComplianceCenterDashboard
          initialData={initialData}
          initialError={response.success ? null : response.error}
          initialStatus={response.status}
        />
      )
    },
  })
}
